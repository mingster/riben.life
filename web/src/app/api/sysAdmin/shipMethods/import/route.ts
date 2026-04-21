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

async function resolveCurrencyId(
	raw: unknown,
	log: Pick<typeof logger, "warn">,
): Promise<string> {
	const fallback = "twd";
	const s =
		typeof raw === "string" && raw.trim() !== "" ? raw.trim() : fallback;
	for (const candidate of [s, s.toLowerCase(), s.toUpperCase()]) {
		const currency = await sqlClient.currency.findUnique({
			where: { id: candidate },
		});
		if (currency) {
			return currency.id;
		}
	}
	log.warn("Currency id not found; using twd", {
		metadata: { raw: s },
		tags: ["import", "currency"],
	});
	const twd = await sqlClient.currency.findUnique({ where: { id: fallback } });
	if (twd) {
		return twd.id;
	}
	const any = await sqlClient.currency.findFirst();
	return any?.id ?? fallback;
}

/** Accepts `shipRequired` or install-file typo `shipRequried`. */
function readShipRequired(r: Record<string, unknown>): boolean {
	if (r.shipRequired === false || r.shipRequried === false) {
		return false;
	}
	if (r.shipRequired === true || r.shipRequried === true) {
		return true;
	}
	if (typeof r.shipRequired === "string") {
		const v = r.shipRequired.trim().toLowerCase();
		if (v === "false" || v === "0" || v === "no") {
			return false;
		}
		if (v === "true" || v === "1" || v === "yes") {
			return true;
		}
	}
	return true;
}

function readCurrencyIdRaw(r: Record<string, unknown>): unknown {
	return r.currencyId ?? r.currency_id;
}

export async function POST(req: Request) {
	const accessCheck = await CheckAdminApiAccess();
	if (accessCheck) {
		return accessCheck;
	}

	const log = logger.child({ module: "shipping-methods-import" });

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
				{ success: false, error: "JSON must be an array of shipping methods." },
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
				log.warn("Skipping shipping method row without name", {
					metadata: { name },
					tags: ["import", "skip"],
				});
				continue;
			}

			const idFromFile =
				typeof r.id === "string" && r.id.trim() !== "" ? r.id.trim() : null;

			const currencyId = await resolveCurrencyId(readCurrencyIdRaw(r), log);

			const identifier = typeof r.identifier === "string" ? r.identifier : "";
			const description =
				typeof r.description === "string" ? r.description : null;
			const basic_price = readFiniteNumber(r, ["basic_price", "basicPrice"], 0);
			const isDeleted = readBool(r.isDeleted, false);
			const isDefault = readBool(r.isDefault, false);
			const shipRequired = readShipRequired(r);
			const canDelete = readBool(r.canDelete, false);

			const createdAt = toBigIntEpoch(r.createdAt, now);
			const updatedAt = toBigIntEpoch(r.updatedAt, now);

			await sqlClient.$transaction(async (tx) => {
				const method = idFromFile
					? await tx.shippingMethod.upsert({
							where: { id: idFromFile },
							create: {
								id: idFromFile,
								name,
								identifier,
								description,
								basic_price: new Prisma.Decimal(basic_price),
								currencyId,
								isDeleted,
								isDefault,
								shipRequired,
								canDelete,
								createdAt,
								updatedAt,
							},
							update: {
								name,
								identifier,
								description,
								basic_price: new Prisma.Decimal(basic_price),
								currencyId,
								isDeleted,
								isDefault,
								shipRequired,
								canDelete,
								updatedAt: getUtcNowEpoch(),
							},
						})
					: await tx.shippingMethod.upsert({
							where: { name },
							create: {
								id: randomUUID(),
								name,
								identifier,
								description,
								basic_price: new Prisma.Decimal(basic_price),
								currencyId,
								isDeleted,
								isDefault,
								shipRequired,
								canDelete,
								createdAt,
								updatedAt,
							},
							update: {
								identifier,
								description,
								basic_price: new Prisma.Decimal(basic_price),
								currencyId,
								isDeleted,
								isDefault,
								shipRequired,
								canDelete,
								updatedAt: getUtcNowEpoch(),
							},
						});

				const methodId = method.id;

				if (Array.isArray(r.prices)) {
					await tx.shippingMethodPrice.deleteMany({
						where: { methodId },
					});

					for (const p of r.prices) {
						if (!p || typeof p !== "object") {
							continue;
						}
						const priceRow = p as Record<string, unknown>;
						const priceId =
							typeof priceRow.id === "string" ? priceRow.id : randomUUID();
						const dimension_length = Number(priceRow.dimension_length);
						const dimension_width = Number(priceRow.dimension_width);
						const dimension_height = Number(priceRow.dimension_height);
						const dimension_weight = Number(priceRow.dimension_weight);
						const priceVal = Number(priceRow.price);
						if (
							!Number.isFinite(dimension_length) ||
							!Number.isFinite(dimension_width) ||
							!Number.isFinite(dimension_height) ||
							!Number.isFinite(dimension_weight) ||
							!Number.isFinite(priceVal)
						) {
							continue;
						}
						await tx.shippingMethodPrice.create({
							data: {
								id: priceId,
								methodId,
								dimension_length: Math.trunc(dimension_length),
								dimension_width: Math.trunc(dimension_width),
								dimension_height: Math.trunc(dimension_height),
								dimension_weight: Math.trunc(dimension_weight),
								price: new Prisma.Decimal(priceVal),
							},
						});
					}
				}
			});

			imported++;
		}

		return NextResponse.json({ success: true, imported });
	} catch (err: unknown) {
		log.error("shipping methods import failed", {
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
