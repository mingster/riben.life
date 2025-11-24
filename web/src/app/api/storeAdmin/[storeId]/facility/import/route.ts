import { NextResponse } from "next/server";
import { sqlClient } from "@/lib/prismadb";
import { promises as fs } from "fs";
import path from "path";
import logger from "@/lib/logger";
import { CheckStoreAdminApiAccess } from "../../../api_helper";
import { Prisma } from "@prisma/client";

export async function POST(
	req: Request,
	props: { params: Promise<{ storeId: string }> },
) {
	const params = await props.params;
	const log = logger.child({ module: "facility-import" });
	let fileName: string;

	try {
		CheckStoreAdminApiAccess(params.storeId);

		({ fileName } = await req.json());
		if (!fileName) {
			return NextResponse.json(
				{ success: false, error: "fileName is required" },
				{ status: 400 },
			);
		}

		const filePath = path.join(process.cwd(), "public", "backup", fileName);
		const fileContent = await fs.readFile(filePath, "utf8");
		const facilities = JSON.parse(fileContent);

		if (!Array.isArray(facilities)) {
			return NextResponse.json(
				{ success: false, error: "Invalid file format" },
				{ status: 400 },
			);
		}

		for (const facility of facilities) {
			// Validate required fields
			if (!facility.facilityName) {
				continue;
			}

			// Upsert facility - use findUnique with storeId and facilityName, then update or create
			try {
				const existing = await sqlClient.storeFacility.findUnique({
					where: {
						id: facility.id,
					},
				});

				if (existing) {
					// Update existing facility
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
							businessHours: facility.businessHours ?? null,
						},
					});
				} else {
					// Try to find by storeId and facilityName (unique constraint)
					const existingByName = await sqlClient.storeFacility.findFirst({
						where: {
							storeId: params.storeId,
							facilityName: facility.facilityName,
						},
					});

					if (existingByName) {
						// Update existing facility with same name
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
								businessHours: facility.businessHours ?? null,
							},
						});
					} else {
						// Create new facility
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
								businessHours: facility.businessHours ?? null,
							},
						});
					}
				}
			} catch (error: unknown) {
				if (
					error instanceof Prisma.PrismaClientKnownRequestError &&
					error.code === "P2002"
				) {
					// Unique constraint violation - skip this facility
					log.warn("Facility name already exists, skipping", {
						metadata: {
							storeId: params.storeId,
							facilityName: facility.facilityName,
						},
					});
					continue;
				}
				throw error;
			}
		}

		return NextResponse.json({ success: true });
	} catch (error: unknown) {
		log.error(error instanceof Error ? error : new Error(String(error)), {
			message: "Failed to import facilities",
			metadata: { storeId: params.storeId, fileName },
			tags: ["facility", "import", "error"],
			service: "facility-import",
			environment: process.env.NODE_ENV,
			version: process.env.npm_package_version,
		});
		return NextResponse.json(
			{
				success: false,
				error: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 },
		);
	}
}
