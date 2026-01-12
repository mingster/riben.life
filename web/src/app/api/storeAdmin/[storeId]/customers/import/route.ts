import { NextResponse } from "next/server";
import { sqlClient } from "@/lib/prismadb";
import logger from "@/lib/logger";
import { CheckStoreAdminApiAccess } from "../../../api_helper";
import { getUtcNowEpoch, getUtcNow } from "@/utils/datetime-utils";
import { Prisma } from "@prisma/client";
import { CustomerCreditLedgerType, MemberRole } from "@/types/enum";
import { normalizePhoneNumber, validatePhoneNumber } from "@/utils/phone-utils";
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
		if (!accessCheck.success) {
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

		log.info("CSV parsed", {
			metadata: {
				storeId: params.storeId,
				totalRows: customers.length,
				headers: customers.length > 0 ? Object.keys(customers[0]) : [],
			},
			tags: ["customer", "import"],
		});

		if (customers.length === 0) {
			return NextResponse.json(
				{ success: false, error: "No data found in CSV file" },
				{ status: 400 },
			);
		}

		let successCount = 0;
		let errorCount = 0;
		const errors: string[] = [];

		// Get current user (store operator) for creatorId in ledger entries
		// Use userId from accessCheck to avoid duplicate auth import
		const creatorId = accessCheck.userId;

		log.info("Starting import process", {
			metadata: {
				storeId: params.storeId,
				organizationId: store.organizationId,
				totalCustomers: customers.length,
				creatorId,
			},
			tags: ["customer", "import"],
		});

		// Process each customer
		for (let i = 0; i < customers.length; i++) {
			const customer = customers[i];
			const rowNum = i + 2; // +2 because row 1 is header, and arrays are 0-indexed

			log.info(`Processing row ${rowNum}`, {
				metadata: {
					storeId: params.storeId,
					rowNum,
					customerData: customer,
				},
				tags: ["customer", "import", "debug"],
			});

			try {
				// Validate: name is required
				const name = customer.name?.trim() || "";
				if (!name) {
					const errorMsg = `Row ${rowNum}: Name is required`;
					errors.push(errorMsg);
					errorCount++;
					log.warn(`Row ${rowNum}: Validation failed`, {
						metadata: {
							storeId: params.storeId,
							rowNum,
							error: errorMsg,
						},
						tags: ["customer", "import", "error"],
					});
					continue;
				}

				// Email and phoneNumber are optional
				const email = customer.email?.trim() || "";
				let phoneNumber = customer.phoneNumber?.trim() || "";
				let normalizedPhoneNumber: string | null = null;

				// Normalize and validate phone number if provided
				if (phoneNumber) {
					try {
						normalizedPhoneNumber = normalizePhoneNumber(phoneNumber);
						if (!validatePhoneNumber(normalizedPhoneNumber)) {
							const errorMsg = `Row ${rowNum}: Invalid phone number format: ${phoneNumber}`;
							errors.push(errorMsg);
							errorCount++;
							log.warn(`Row ${rowNum}: Invalid phone number`, {
								metadata: {
									storeId: params.storeId,
									rowNum,
									phoneNumber,
									error: errorMsg,
								},
								tags: ["customer", "import", "error"],
							});
							// Continue processing but don't use phone number
							phoneNumber = "";
							normalizedPhoneNumber = null;
						} else {
							phoneNumber = normalizedPhoneNumber;
						}
					} catch (error) {
						const errorMsg = `Row ${rowNum}: Failed to normalize phone number: ${phoneNumber}`;
						errors.push(errorMsg);
						errorCount++;
						log.warn(`Row ${rowNum}: Phone normalization failed`, {
							metadata: {
								storeId: params.storeId,
								rowNum,
								phoneNumber,
								error: error instanceof Error ? error.message : String(error),
							},
							tags: ["customer", "import", "error"],
						});
						// Continue processing but don't use phone number
						phoneNumber = "";
						normalizedPhoneNumber = null;
					}
				}

				log.info(`Row ${rowNum}: Parsed values`, {
					metadata: {
						storeId: params.storeId,
						rowNum,
						name,
						email,
						phoneNumber,
						normalizedPhoneNumber,
						creditPoint: customer.creditPoint,
						creditFiat: customer.creditFiat,
					},
					tags: ["customer", "import", "debug"],
				});

				// Generate email if not provided
				let finalEmail = email;
				if (!finalEmail) {
					if (normalizedPhoneNumber) {
						// Mock email from normalized phone number (using E.164 format without +)
						// Remove + and non-digit characters for email generation
						finalEmail = `${normalizedPhoneNumber.replace(/[^0-9]/g, "")}@phone.riben.life`;
					} else {
						// Generate unique email from name + timestamp + random
						const sanitizedName = name
							.replace(/[^a-zA-Z0-9]/g, "")
							.toLowerCase()
							.substring(0, 20);
						const timestamp = Date.now();
						const random = crypto.randomBytes(4).toString("hex");
						finalEmail = `${sanitizedName}-${timestamp}-${random}@import.riben.life`;
					}
				}

				// Normalize email to lowercase
				finalEmail = finalEmail.toLowerCase();

				// Get values with defaults
				// Always set memberRole to "customer" for customers managed in this section
				const memberRole = MemberRole.customer;
				let creditPoint = customer.creditPoint
					? parseFloat(customer.creditPoint)
					: 0;
				let creditFiat = customer.creditFiat
					? parseFloat(customer.creditFiat)
					: 0;

				// Set invalid credit values to 0 (no point or fiat is ok)
				if (isNaN(creditPoint) || creditPoint < 0) {
					creditPoint = 0;
				}

				if (isNaN(creditFiat) || creditFiat < 0) {
					creditFiat = 0;
				}

				// Find existing user by email first (if email was provided or generated)
				let user: Awaited<
					ReturnType<
						typeof sqlClient.user.findUnique<{
							where: { email: string };
							include: { members: true };
						}>
					>
				> = null;

				if (finalEmail) {
					user = await sqlClient.user.findUnique({
						where: {
							email: finalEmail,
						},
						include: {
							members: {
								where: {
									organizationId: store.organizationId,
								},
							},
						},
					});
				}

				log.info(`Row ${rowNum}: User lookup by email`, {
					metadata: {
						storeId: params.storeId,
						rowNum,
						finalEmail,
						userFound: !!user,
						userId: user?.id,
						existingMembers: user?.members?.length || 0,
					},
					tags: ["customer", "import", "debug"],
				});

				// If phoneNumber is provided, check if it belongs to a different user (use normalized)
				if (normalizedPhoneNumber) {
					const userByPhone: typeof user = await sqlClient.user.findFirst({
						where: {
							phoneNumber: normalizedPhoneNumber,
						},
						include: {
							members: {
								where: {
									organizationId: store.organizationId,
								},
							},
						},
					});

					log.info(`Row ${rowNum}: User lookup by phone`, {
						metadata: {
							storeId: params.storeId,
							rowNum,
							phoneNumber: normalizedPhoneNumber,
							userByPhoneFound: !!userByPhone,
							userByPhoneId: userByPhone?.id,
							userByPhoneEmail: userByPhone?.email,
						},
						tags: ["customer", "import", "debug"],
					});

					if (userByPhone) {
						// If we found a user by email and a different user by phone, that's a conflict
						if (user && user.id !== userByPhone.id) {
							const errorMsg = `Row ${rowNum}: Phone number ${normalizedPhoneNumber} already belongs to a different user (${userByPhone.email})`;
							errors.push(errorMsg);
							errorCount++;
							log.warn(`Row ${rowNum}: Phone conflict`, {
								metadata: {
									storeId: params.storeId,
									rowNum,
									error: errorMsg,
								},
								tags: ["customer", "import", "error"],
							});
							continue;
						}

						// If we didn't find by email but found by phone, use that user
						if (!user) {
							user = userByPhone;
							log.info(`Row ${rowNum}: Using user found by phone`, {
								metadata: {
									storeId: params.storeId,
									rowNum,
									userId: user.id,
								},
								tags: ["customer", "import", "debug"],
							});
						}
					}
				}

				// Check if name already exists - if we don't have a user yet, try to use the one with this name
				if (!user) {
					const userByName = await sqlClient.user.findFirst({
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

					log.info(`Row ${rowNum}: User lookup by name`, {
						metadata: {
							storeId: params.storeId,
							rowNum,
							name,
							userByNameFound: !!userByName,
							userByNameId: userByName?.id,
							userByNameEmail: userByName?.email,
						},
						tags: ["customer", "import", "debug"],
					});

					if (userByName) {
						// Use the existing user with this name
						user = userByName;
						log.info(`Row ${rowNum}: Using existing user found by name`, {
							metadata: {
								storeId: params.storeId,
								rowNum,
								userId: user.id,
								email: user.email,
							},
							tags: ["customer", "import", "debug"],
						});
					}
				}

				// Create user if doesn't exist
				if (!user) {
					log.info(`Row ${rowNum}: User not found, creating new user`, {
						metadata: {
							storeId: params.storeId,
							rowNum,
							finalEmail,
							phoneNumber,
							name,
						},
						tags: ["customer", "import", "debug"],
					});

					// Verify phone number doesn't already exist before creating (if normalized phoneNumber provided)
					if (normalizedPhoneNumber) {
						const existingPhoneUser = await sqlClient.user.findFirst({
							where: {
								phoneNumber: normalizedPhoneNumber,
							},
						});

						if (existingPhoneUser) {
							const errorMsg = `Row ${rowNum}: Phone number ${normalizedPhoneNumber} already exists for user ${existingPhoneUser.email}`;
							errors.push(errorMsg);
							errorCount++;
							log.warn(`Row ${rowNum}: Phone already exists`, {
								metadata: {
									storeId: params.storeId,
									rowNum,
									error: errorMsg,
								},
								tags: ["customer", "import", "error"],
							});
							continue;
						}
					}

					// Verify email doesn't already exist (in case generated email conflicts)
					if (finalEmail) {
						const existingEmailUser = await sqlClient.user.findUnique({
							where: {
								email: finalEmail,
							},
						});

						if (existingEmailUser) {
							// If email exists, try generating a new one
							const sanitizedName = name
								.replace(/[^a-zA-Z0-9]/g, "")
								.toLowerCase()
								.substring(0, 20);
							const timestamp = Date.now();
							const random = crypto.randomBytes(4).toString("hex");
							finalEmail = `${sanitizedName}-${timestamp}-${random}@import.riben.life`;

							log.info(`Row ${rowNum}: Email conflict, generated new email`, {
								metadata: {
									storeId: params.storeId,
									rowNum,
									newEmail: finalEmail,
								},
								tags: ["customer", "import", "debug"],
							});
						}
					}

					// Create user directly in Prisma
					// Note: User will need to reset password via "Forgot Password" to set a password
					user = await sqlClient.user.create({
						data: {
							email: finalEmail || null,
							name: name,
							phoneNumber: normalizedPhoneNumber || null,
							role: "user",
							locale: "tw",
						},
						include: {
							members: {
								where: {
									organizationId: store.organizationId,
								},
							},
						},
					});

					log.info(`Row ${rowNum}: User created successfully`, {
						metadata: {
							storeId: params.storeId,
							rowNum,
							userId: user.id,
							email: user.email,
							phoneNumber: user.phoneNumber,
							name: user.name,
						},
						tags: ["customer", "import", "debug"],
					});
				} else {
					log.info(`Row ${rowNum}: User found, updating`, {
						metadata: {
							storeId: params.storeId,
							rowNum,
							userId: user.id,
							email: user.email,
						},
						tags: ["customer", "import", "debug"],
					});

					// Update existing user
					const updateData: {
						name?: string;
						phoneNumber?: string | null;
					} = {};

					if (name) {
						updateData.name = name;
					}

					if (normalizedPhoneNumber) {
						updateData.phoneNumber = normalizedPhoneNumber;
					}

					if (Object.keys(updateData).length > 0) {
						await sqlClient.user.update({
							where: { id: user.id },
							data: updateData,
						});

						log.info(`Row ${rowNum}: User updated`, {
							metadata: {
								storeId: params.storeId,
								rowNum,
								userId: user.id,
								updateData,
							},
							tags: ["customer", "import", "debug"],
						});
					}

					// Re-fetch user with members to ensure we have the latest member relationship
					user = await sqlClient.user.findUnique({
						where: { id: user.id },
						include: {
							members: {
								where: {
									organizationId: store.organizationId,
								},
							},
						},
					});

					if (!user) {
						const errorMsg = `Row ${rowNum}: User not found after update`;
						errors.push(errorMsg);
						errorCount++;
						log.error(`Row ${rowNum}: User not found after update`, {
							metadata: {
								storeId: params.storeId,
								rowNum,
								error: errorMsg,
							},
							tags: ["customer", "import", "error"],
						});
						continue;
					}
				}

				// Update or create member relationship
				const existingMember = user.members?.find(
					(m: { organizationId: string }) =>
						m.organizationId === store.organizationId,
				);

				log.info(`Row ${rowNum}: Member relationship check`, {
					metadata: {
						storeId: params.storeId,
						rowNum,
						userId: user.id,
						organizationId: store.organizationId,
						existingMember: !!existingMember,
						existingMemberId: existingMember?.id,
						existingMemberRole: existingMember?.role,
						newMemberRole: memberRole,
					},
					tags: ["customer", "import", "debug"],
				});

				if (existingMember) {
					// Update member role
					await sqlClient.member.update({
						where: { id: existingMember.id },
						data: { role: memberRole },
					});

					log.info(`Row ${rowNum}: Member role updated`, {
						metadata: {
							storeId: params.storeId,
							rowNum,
							memberId: existingMember.id,
							oldRole: existingMember.role,
							newRole: memberRole,
						},
						tags: ["customer", "import", "debug"],
					});
				} else {
					// Create member relationship
					const newMember = await sqlClient.member.create({
						data: {
							id: crypto.randomUUID(),
							userId: user.id,
							organizationId: store.organizationId,
							role: memberRole,
							createdAt: getUtcNow(),
						},
					});

					log.info(`Row ${rowNum}: Member relationship created`, {
						metadata: {
							storeId: params.storeId,
							rowNum,
							memberId: newMember.id,
							userId: user.id,
							organizationId: store.organizationId,
							role: memberRole,
						},
						tags: ["customer", "import", "debug"],
					});
				}

				// Handle credit point and fiat in a transaction
				if (creditPoint > 0 || creditFiat > 0) {
					log.info(`Row ${rowNum}: Processing credits`, {
						metadata: {
							storeId: params.storeId,
							rowNum,
							userId: user.id,
							creditPoint,
							creditFiat,
						},
						tags: ["customer", "import", "debug"],
					});

					await sqlClient.$transaction(async (tx) => {
						// Handle credit point
						if (creditPoint > 0) {
							// Get or create CustomerCredit
							const customerCredit = await tx.customerCredit.upsert({
								where: {
									storeId_userId: {
										storeId: params.storeId,
										userId: user.id,
									},
								},
								create: {
									storeId: params.storeId,
									userId: user.id,
									point: new Prisma.Decimal(creditPoint),
									fiat: new Prisma.Decimal(0),
									updatedAt: getUtcNowEpoch(),
								},
								update: {
									point: {
										increment: creditPoint,
									},
									updatedAt: getUtcNowEpoch(),
								},
							});

							// Create CustomerCreditLedger entry
							const currentBalance = Number(customerCredit.point);
							await tx.customerCreditLedger.create({
								data: {
									storeId: params.storeId,
									userId: user.id,
									amount: new Prisma.Decimal(creditPoint),
									balance: new Prisma.Decimal(currentBalance),
									type: CustomerCreditLedgerType.Topup,
									note: `storeAdmin Import: ${creditPoint} points`,
									creatorId: creatorId,
									createdAt: getUtcNowEpoch(),
								},
							});
						}

						// Handle credit fiat
						if (creditFiat > 0) {
							// Get or create CustomerCredit
							const customerCredit = await tx.customerCredit.upsert({
								where: {
									storeId_userId: {
										storeId: params.storeId,
										userId: user.id,
									},
								},
								create: {
									storeId: params.storeId,
									userId: user.id,
									point: new Prisma.Decimal(0),
									fiat: new Prisma.Decimal(creditFiat),
									updatedAt: getUtcNowEpoch(),
								},
								update: {
									fiat: {
										increment: creditFiat,
									},
									updatedAt: getUtcNowEpoch(),
								},
							});

							// Create CustomerFiatLedger entry
							const currentBalance = Number(customerCredit.fiat);
							await tx.customerFiatLedger.create({
								data: {
									storeId: params.storeId,
									userId: user.id,
									amount: new Prisma.Decimal(creditFiat),
									balance: new Prisma.Decimal(currentBalance),
									type: "TOPUP",
									note: `storeAdmin import: ${creditFiat} fiat`,
									creatorId: creatorId,
									createdAt: getUtcNowEpoch(),
								},
							});
						}
					});

					log.info(`Row ${rowNum}: Credits processed`, {
						metadata: {
							storeId: params.storeId,
							rowNum,
							userId: user.id,
							creditPoint,
							creditFiat,
						},
						tags: ["customer", "import", "debug"],
					});
				}

				log.info(`Row ${rowNum}: Processing completed successfully`, {
					metadata: {
						storeId: params.storeId,
						rowNum,
						userId: user.id,
						email: user.email,
						phoneNumber: user.phoneNumber,
						memberRole,
						creditPoint,
						creditFiat,
					},
					tags: ["customer", "import", "debug"],
				});

				successCount++;
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

		log.info("Import process completed", {
			metadata: {
				storeId: params.storeId,
				totalRows: customers.length,
				successCount,
				errorCount,
				errors: errors.length > 0 ? errors : undefined,
			},
			tags: ["customer", "import"],
		});

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
