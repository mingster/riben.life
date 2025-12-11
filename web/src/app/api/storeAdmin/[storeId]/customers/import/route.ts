import { NextResponse } from "next/server";
import { sqlClient } from "@/lib/prismadb";
import logger from "@/lib/logger";
import { CheckStoreAdminApiAccess } from "../../../api_helper";
import { getUtcNow } from "@/utils/datetime-utils";
import crypto from "crypto";

// Parse CSV string to array of objects
function parseCsv(csvContent: string): Array<Record<string, string>> {
	const lines = csvContent.split("\n").filter((line) => line.trim().length > 0);
	if (lines.length === 0) {
		return [];
	}

	// Parse header
	const header = lines[0]
		.split(",")
		.map((col) => col.trim().replace(/^"|"$/g, ""));

	// Parse data rows
	const data: Array<Record<string, string>> = [];
	for (let i = 1; i < lines.length; i++) {
		const line = lines[i];
		const values: string[] = [];
		let currentValue = "";
		let inQuotes = false;

		for (let j = 0; j < line.length; j++) {
			const char = line[j];
			if (char === '"') {
				if (inQuotes && line[j + 1] === '"') {
					// Escaped quote
					currentValue += '"';
					j++; // Skip next quote
				} else {
					// Toggle quote state
					inQuotes = !inQuotes;
				}
			} else if (char === "," && !inQuotes) {
				// End of field
				values.push(currentValue.trim());
				currentValue = "";
			} else {
				currentValue += char;
			}
		}
		// Add last value
		values.push(currentValue.trim());

		// Create object from header and values
		const row: Record<string, string> = {};
		header.forEach((col, index) => {
			row[col] = values[index] || "";
		});
		data.push(row);
	}

	return data;
}

export async function POST(
	req: Request,
	props: { params: Promise<{ storeId: string }> },
) {
	const params = await props.params;
	const log = logger.child({ module: "customer-import" });

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

		// Get store to find organization
		const store = await sqlClient.store.findUnique({
			where: {
				id: params.storeId,
			},
			select: {
				organizationId: true,
			},
		});

		if (!store || !store.organizationId) {
			return NextResponse.json(
				{ success: false, error: "Store not found or has no organization" },
				{ status: 404 },
			);
		}

		// Check Content-Type header
		const contentType = req.headers.get("content-type") || "";
		log.info("Import request received", {
			metadata: {
				storeId: params.storeId,
				contentType,
			},
			tags: ["customer", "import"],
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
					tags: ["customer", "import", "error"],
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
				// Remove data URL prefix if present (data:text/csv;base64,...)
				const base64Data = body.fileData.includes(",")
					? body.fileData.split(",")[1]
					: body.fileData;

				// Convert base64 to Buffer (Node.js)
				const buffer = Buffer.from(base64Data, "base64");
				// Convert Buffer to File-like object
				file = new File([buffer], body.fileName, { type: "text/csv" });
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
		const customers = parseCsv(fileContent);

		if (customers.length === 0) {
			return NextResponse.json(
				{ success: false, error: "No data found in CSV file" },
				{ status: 400 },
			);
		}

		let successCount = 0;
		let errorCount = 0;
		const errors: string[] = [];

		// Process each customer
		for (let i = 0; i < customers.length; i++) {
			const customer = customers[i];
			const rowNum = i + 2; // +2 because row 1 is header, and arrays are 0-indexed

			try {
				// Validate required fields
				if (!customer.name || !customer.name.trim()) {
					errors.push(`Row ${rowNum}: Name is required`);
					errorCount++;
					continue;
				}

				const name = customer.name.trim();

				// Find existing user by email if provided, otherwise by name
				let existingUser = null;
				if (customer.email && customer.email.trim()) {
					const email = customer.email.trim().toLowerCase();
					existingUser = await sqlClient.user.findUnique({
						where: {
							email: email,
						},
						include: {
							members: {
								where: {
									organizationId: store.organizationId,
								},
							},
						},
					});
				} else {
					// Find by name - note: names are not unique, so we take the first match
					// and check if they're already a member of this organization
					const usersByName = await sqlClient.user.findMany({
						where: {
							name: name,
						},
						include: {
							members: {
								where: {
									organizationId: store.organizationId,
								},
							},
						},
					});

					// Find user who is already a member of this organization
					existingUser =
						usersByName.find((u) => u.members.length > 0) ||
						usersByName[0] ||
						null;
				}

				if (existingUser) {
					// Update existing user
					const updateData: {
						name?: string;
						phone?: string | null;
						banned?: boolean;
					} = {};

					if (customer.name !== undefined && customer.name !== "") {
						updateData.name = customer.name.trim();
					}

					if (customer.phone !== undefined) {
						updateData.phone = customer.phone.trim() || null;
					}

					if (customer.banned !== undefined) {
						updateData.banned = customer.banned.toLowerCase() === "true";
					}

					await sqlClient.user.update({
						where: { id: existingUser.id },
						data: updateData,
					});

					// Update or create member relationship
					const existingMember = existingUser.members.find(
						(m) => m.organizationId === store.organizationId,
					);

					if (existingMember) {
						// Update member role if provided
						if (customer.memberRole && customer.memberRole.trim()) {
							await sqlClient.member.update({
								where: { id: existingMember.id },
								data: { role: customer.memberRole.trim() },
							});
						}
					} else {
						// Create member relationship
						await sqlClient.member.create({
							data: {
								id: crypto.randomUUID(),
								userId: existingUser.id,
								organizationId: store.organizationId,
								role: customer.memberRole?.trim() || "user",
								createdAt: getUtcNow(),
							},
						});
					}

					successCount++;
				} else {
					// Cannot find user
					if (customer.email && customer.email.trim()) {
						errors.push(
							`Row ${rowNum}: User with email ${customer.email.trim()} does not exist. Cannot create new users via CSV import.`,
						);
					} else {
						errors.push(
							`Row ${rowNum}: User with name "${name}" does not exist. Cannot create new users via CSV import.`,
						);
					}
					errorCount++;
				}
			} catch (err: unknown) {
				const errorMsg = err instanceof Error ? err.message : String(err);
				errors.push(`Row ${rowNum}: ${errorMsg}`);
				errorCount++;
				log.error("Failed to process customer row", {
					metadata: {
						storeId: params.storeId,
						rowNum,
						customer,
						error: errorMsg,
					},
					tags: ["customer", "import", "error"],
				});
			}
		}

		if (errorCount > 0 && successCount === 0) {
			return NextResponse.json(
				{
					success: false,
					error: `All rows failed to import. Errors: ${errors.join("; ")}`,
					errors,
				},
				{ status: 400 },
			);
		}

		return NextResponse.json({
			success: true,
			imported: successCount,
			errors: errorCount > 0 ? errors : undefined,
		});
	} catch (error: unknown) {
		log.error(error instanceof Error ? error : new Error(String(error)), {
			message: "Failed to import customers",
			metadata: { storeId: params.storeId },
			tags: ["customer", "import", "error"],
			service: "customer-import",
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
