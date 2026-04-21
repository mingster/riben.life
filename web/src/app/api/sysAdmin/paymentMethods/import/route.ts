import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import logger from "@/lib/logger";
import { sqlClient } from "@/lib/prismadb";
import { getUtcNowEpoch } from "@/utils/datetime-utils";
import { CheckAdminApiAccess } from "../../api_helper";
import {
	readBool,
	readFiniteNumber,
	readIntTrunc,
	stripUtf8Bom,
} from "../../import-json-utils";

function toBigIntEpoch(value: unknown, fallback: bigint): bigint {
	if (typeof value === "bigint") {
		return value;
	}
	if (typeof value === "number" && Number.isFinite(value)) {
		return BigInt(Math.trunc(value));
	}
	if (typeof value === "string" && value.trim() !== "") {
		try {
			return BigInt(value);
		} catch {
			return fallback;
		}
	}
	return fallback;
}

function parseImportFile(body: {
	fileData?: string;
	fileName?: string;
}): { text: string; fileName: string } | NextResponse {
	const { fileData, fileName } = body;
	if (!fileData || !fileName) {
		return NextResponse.json(
			{
				success: false,
				error:
					"Expected fileData and fileName (base64 data URL or raw base64).",
			},
			{ status: 400 },
		);
	}
	const base64Data = fileData.includes(",") ? fileData.split(",")[1] : fileData;
	let buffer: Buffer;
	try {
		buffer = Buffer.from(base64Data, "base64");
	} catch {
		return NextResponse.json(
			{ success: false, error: "Invalid base64 file data." },
			{ status: 400 },
		);
	}
	return { text: buffer.toString("utf8"), fileName };
}

export async function POST(req: Request) {
	const accessCheck = await CheckAdminApiAccess();
	if (accessCheck) {
		return accessCheck;
	}

	const log = logger.child({ module: "payment-methods-import" });

	try {
		const body = (await req.json()) as {
			fileData?: string;
			fileName?: string;
		};

		const parsed = parseImportFile(body);
		if (parsed instanceof NextResponse) {
			return parsed;
		}

		let rows: unknown;
		try {
			rows = JSON.parse(stripUtf8Bom(parsed.text));
		} catch {
			return NextResponse.json(
				{ success: false, error: "File is not valid JSON." },
				{ status: 400 },
			);
		}

		if (!Array.isArray(rows)) {
			return NextResponse.json(
				{ success: false, error: "JSON must be an array of payment methods." },
				{ status: 400 },
			);
		}

		const now = getUtcNowEpoch();
		let imported = 0;

		for (const row of rows) {
			if (!row || typeof row !== "object") {
				continue;
			}
			const r = row as Record<string, unknown>;
			const name = typeof r.name === "string" ? r.name.trim() : "";
			if (!name) {
				log.warn("Skipping payment method row without name", {
					metadata: { name },
					tags: ["import", "skip"],
				});
				continue;
			}

			const idFromFile =
				typeof r.id === "string" && r.id.trim() !== "" ? r.id.trim() : null;

			const payUrlRaw = r.payUrl ?? r.pay_url;
			const payUrl = typeof payUrlRaw === "string" ? payUrlRaw : "";
			const priceDescrRaw = r.priceDescr ?? r.price_descr;
			const priceDescr = typeof priceDescrRaw === "string" ? priceDescrRaw : "";
			const fee = readFiniteNumber(r, ["fee"], 0);
			const feeAdditional = readFiniteNumber(
				r,
				["feeAdditional", "fee_additional"],
				0,
			);
			const clearDays = readIntTrunc(r, ["clearDays", "clear_days"], 3);
			const isDeleted = readBool(r.isDeleted, false);
			const isDefault = readBool(r.isDefault, false);
			const canDelete = readBool(r.canDelete, false);
			const visibleToCustomer = readBool(r.visibleToCustomer, false);
			const platformEnabled = readBool(
				r.platformEnabled ?? r.platform_enabled,
				true,
			);

			const createdAt = toBigIntEpoch(r.createdAt, now);
			const updatedAt = toBigIntEpoch(r.updatedAt, now);

			const dataScalar = {
				name,
				payUrl,
				priceDescr,
				fee: new Prisma.Decimal(fee),
				feeAdditional: new Prisma.Decimal(feeAdditional),
				clearDays,
				isDeleted,
				isDefault,
				canDelete,
				visibleToCustomer,
				platformEnabled,
			};

			if (idFromFile) {
				await sqlClient.paymentMethod.upsert({
					where: { id: idFromFile },
					create: {
						id: idFromFile,
						...dataScalar,
						createdAt,
						updatedAt,
					},
					update: {
						...dataScalar,
						updatedAt: getUtcNowEpoch(),
					},
				});
			} else {
				// Install-style JSON (`public/install/payment_methods.json`): no id, unique name
				await sqlClient.paymentMethod.upsert({
					where: { name },
					create: {
						id: randomUUID(),
						...dataScalar,
						createdAt,
						updatedAt,
					},
					update: {
						...dataScalar,
						updatedAt: getUtcNowEpoch(),
					},
				});
			}
			imported++;
		}

		return NextResponse.json({ success: true, imported });
	} catch (err: unknown) {
		log.error("payment methods import failed", {
			metadata: {
				error: err instanceof Error ? err.message : String(err),
				stack: err instanceof Error ? err.stack : undefined,
			},
			tags: ["api", "sysAdmin", "import", "error"],
		});
		return NextResponse.json(
			{
				success: false,
				error: err instanceof Error ? err.message : "Unknown error",
			},
			{ status: 500 },
		);
	}
}
