import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { CheckStoreAdminApiAccess } from "@/app/api/storeAdmin/api_helper";
import logger from "@/lib/logger";
import { sqlClient } from "@/lib/prismadb";

export async function POST(
	req: Request,
	props: { params: Promise<{ storeId: string }> },
) {
	const params = await props.params;
	const log = logger.child({ module: "facility-import" });

	const access = await CheckStoreAdminApiAccess(params.storeId);
	if (access instanceof NextResponse) {
		return access;
	}

	try {
		const contentType = req.headers.get("content-type") || "";
		log.info("Import request received", {
			metadata: { storeId: params.storeId, contentType },
			tags: ["facility", "import"],
		});

		let file: File | null = null;

		if (contentType.includes("multipart/form-data")) {
			const formData = await req.formData();
			file = formData.get("file") as File | null;
		} else if (contentType.includes("application/json")) {
			const body = (await req.json()) as {
				fileData?: string;
				fileName?: string;
			};
			if (body.fileData && body.fileName) {
				const base64Data = body.fileData.includes(",")
					? body.fileData.split(",")[1]
					: body.fileData;
				const buffer = Buffer.from(base64Data ?? "", "base64");
				file = new File([buffer], body.fileName, {
					type: "application/json",
				});
			} else {
				return NextResponse.json(
					{
						success: false,
						error:
							"File data not found in request. Expected 'fileData' and 'fileName' fields.",
					},
					{ status: 400 },
				);
			}
		} else {
			return NextResponse.json(
				{
					success: false,
					error: `Unsupported Content-Type: ${contentType || "none"}. Expected multipart/form-data or application/json.`,
				},
				{ status: 400 },
			);
		}

		if (!file) {
			return NextResponse.json(
				{ success: false, error: "File is required" },
				{ status: 400 },
			);
		}

		const fileContent = await file.text();
		const facilities = JSON.parse(fileContent) as Array<{
			id?: string;
			storeId?: string;
			facilityName?: string;
			capacity?: number;
			defaultCost?: number;
			defaultCredit?: number;
			defaultDuration?: number;
			useOwnBusinessHours?: boolean;
			businessHours?: string | null;
		}>;

		if (!Array.isArray(facilities)) {
			return NextResponse.json(
				{ success: false, error: "Invalid file format" },
				{ status: 400 },
			);
		}

		for (const facility of facilities) {
			if (!facility.facilityName) {
				continue;
			}

			const useOwn =
				typeof facility.useOwnBusinessHours === "boolean"
					? facility.useOwnBusinessHours
					: Boolean(facility.businessHours?.trim());
			const businessHoursJson =
				useOwn && facility.businessHours?.trim()
					? facility.businessHours.trim()
					: null;

			if (facility.id) {
				const existing = await sqlClient.storeFacility.findUnique({
					where: { id: facility.id },
				});

				if (existing) {
					if (existing.storeId !== params.storeId) {
						log.warn("Skipping facility import: id belongs to another store", {
							metadata: { facilityId: facility.id, storeId: params.storeId },
							tags: ["facility", "import"],
						});
						continue;
					}
					await sqlClient.storeFacility.update({
						where: { id: facility.id },
						data: {
							facilityName: facility.facilityName,
							capacity: facility.capacity ?? 4,
							defaultCost: facility.defaultCost
								? new Prisma.Decimal(facility.defaultCost)
								: new Prisma.Decimal(0),
							defaultCredit: facility.defaultCredit
								? new Prisma.Decimal(facility.defaultCredit)
								: new Prisma.Decimal(0),
							defaultDuration: facility.defaultDuration ?? 60,
							useOwnBusinessHours: useOwn,
							businessHours: businessHoursJson,
						},
					});
					continue;
				}
			}

			const existingByName = await sqlClient.storeFacility.findFirst({
				where: {
					storeId: params.storeId,
					facilityName: facility.facilityName,
				},
			});

			if (existingByName) {
				await sqlClient.storeFacility.update({
					where: { id: existingByName.id },
					data: {
						capacity: facility.capacity ?? 4,
						defaultCost: facility.defaultCost
							? new Prisma.Decimal(facility.defaultCost)
							: new Prisma.Decimal(0),
						defaultCredit: facility.defaultCredit
							? new Prisma.Decimal(facility.defaultCredit)
							: new Prisma.Decimal(0),
						defaultDuration: facility.defaultDuration ?? 60,
						useOwnBusinessHours: useOwn,
						businessHours: businessHoursJson,
					},
				});
			} else {
				await sqlClient.storeFacility.create({
					data: {
						id: facility.id || undefined,
						storeId: params.storeId,
						facilityName: facility.facilityName,
						capacity: facility.capacity ?? 4,
						defaultCost: facility.defaultCost
							? new Prisma.Decimal(facility.defaultCost)
							: new Prisma.Decimal(0),
						defaultCredit: facility.defaultCredit
							? new Prisma.Decimal(facility.defaultCredit)
							: new Prisma.Decimal(0),
						defaultDuration: facility.defaultDuration ?? 60,
						useOwnBusinessHours: useOwn,
						businessHours: businessHoursJson,
					},
				});
			}
		}

		return NextResponse.json({ success: true });
	} catch (err: unknown) {
		log.error(err instanceof Error ? err : new Error(String(err)), {
			message: "Failed to import facilities",
			metadata: { storeId: params.storeId },
			tags: ["facility", "import", "error"],
			service: "facility-import",
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
