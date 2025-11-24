import { NextResponse } from "next/server";
import { sqlClient } from "@/lib/prismadb";
import logger from "@/lib/logger";
import { CheckStoreAdminApiAccess } from "../../../api_helper";
import { Prisma } from "@prisma/client";

export async function POST(
	req: Request,
	props: { params: Promise<{ storeId: string }> },
) {
	const params = await props.params;
	const log = logger.child({ module: "facility-import" });

	try {
		// Check access first
		const accessCheck = await CheckStoreAdminApiAccess(params.storeId);
		if (accessCheck instanceof NextResponse) {
			return accessCheck;
		}
		if (accessCheck !== true) {
			return NextResponse.json(
				{ success: false, error: "Unauthorized" },
				{ status: 403 },
			);
		}

		// Check Content-Type header
		const contentType = req.headers.get("content-type") || "";
		log.info("Import request received", {
			metadata: {
				storeId: params.storeId,
				contentType,
			},
			tags: ["facility", "import"],
		});

		let file: File | null = null;

		// Try to parse as FormData first (multipart/form-data)
		if (contentType.includes("multipart/form-data")) {
			try {
				const formData = await req.formData();
				file = formData.get("file") as File | null;
			} catch (formDataError: unknown) {
				log.error("Failed to parse FormData", {
					metadata: {
						storeId: params.storeId,
						contentType,
						error:
							formDataError instanceof Error
								? formDataError.message
								: String(formDataError),
					},
					tags: ["facility", "import", "error"],
				});
				return NextResponse.json(
					{
						success: false,
						error: `Failed to parse FormData: ${formDataError instanceof Error ? formDataError.message : "Unknown error"}`,
					},
					{ status: 400 },
				);
			}
		} else if (contentType.includes("application/json")) {
			// Fallback: Accept JSON with base64 encoded file
			const body = await req.json();
			if (body.fileData && body.fileName) {
				// Remove data URL prefix if present (data:application/json;base64,...)
				const base64Data = body.fileData.includes(",")
					? body.fileData.split(",")[1]
					: body.fileData;

				// Convert base64 to Buffer (Node.js)
				const buffer = Buffer.from(base64Data, "base64");
				// Convert Buffer to File-like object
				file = new File([buffer], body.fileName, { type: "application/json" });
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

		// Read file content
		const fileContent = await file.text();
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
		}

		return NextResponse.json({ success: true });
	} catch (error: unknown) {
		log.error(error instanceof Error ? error : new Error(String(error)), {
			message: "Failed to import facilities",
			metadata: { storeId: params.storeId },
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
