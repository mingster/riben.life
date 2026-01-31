import { NextResponse } from "next/server";
import { sqlClient } from "@/lib/prismadb";
import logger from "@/lib/logger";
import { CheckStoreAdminApiAccess } from "../../../api_helper";
import { Prisma } from "@prisma/client";
import { getUtcNowEpoch, getUtcNow } from "@/utils/datetime-utils";
import { normalizePhoneNumber, validatePhoneNumber } from "@/utils/phone-utils";
import crypto from "crypto";

export async function POST(
	req: Request,
	props: { params: Promise<{ storeId: string }> },
) {
	const params = await props.params;
	const log = logger.child({ module: "service-staff-import" });

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

		// Check Content-Type header
		const contentType = req.headers.get("content-type") || "";
		log.info("Import request received", {
			metadata: {
				storeId: params.storeId,
				contentType,
			},
			tags: ["service-staff", "import"],
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
					tags: ["service-staff", "import", "error"],
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
		const serviceStaffArray = JSON.parse(fileContent);

		if (!Array.isArray(serviceStaffArray)) {
			return NextResponse.json(
				{ success: false, error: "Invalid file format" },
				{ status: 400 },
			);
		}

		// Get store to find organization for member creation
		const store = await sqlClient.store.findUnique({
			where: { id: params.storeId },
			select: { id: true, organizationId: true },
		});

		if (!store || !store.organizationId) {
			return NextResponse.json(
				{ success: false, error: "Store not found or has no organization" },
				{ status: 404 },
			);
		}

		for (const serviceStaff of serviceStaffArray) {
			// Validate required fields - need either userId or User info
			if (!serviceStaff.userId && !serviceStaff.User) {
				log.warn("Service staff entry missing userId and User info", {
					metadata: {
						storeId: params.storeId,
						serviceStaffId: serviceStaff.id,
					},
					tags: ["service-staff", "import", "warning"],
				});
				continue;
			}

			let userId: string | undefined;

			// Strategy 1: If userId is provided, try to find user by userId
			if (serviceStaff.userId) {
				const user = await sqlClient.user.findUnique({
					where: { id: serviceStaff.userId },
					select: { id: true },
				});
				if (user) {
					userId = user.id;
				}
			}

			// Strategy 2: If user not found and User info is provided, try to find/create by email, phone, or name
			if (!userId && serviceStaff.User) {
				const userInfo = serviceStaff.User;

				// Normalize and validate phone number if provided
				let normalizedPhoneNumber: string | null = null;
				if (userInfo.phoneNumber) {
					try {
						normalizedPhoneNumber = normalizePhoneNumber(userInfo.phoneNumber);
						if (!validatePhoneNumber(normalizedPhoneNumber)) {
							log.warn("Invalid phone number format in service staff import", {
								metadata: {
									storeId: params.storeId,
									phoneNumber: userInfo.phoneNumber,
									normalized: normalizedPhoneNumber,
								},
								tags: ["service-staff", "import", "warning"],
							});
							normalizedPhoneNumber = null;
						}
					} catch (error) {
						log.warn(
							"Failed to normalize phone number in service staff import",
							{
								metadata: {
									storeId: params.storeId,
									phoneNumber: userInfo.phoneNumber,
									error: error instanceof Error ? error.message : String(error),
								},
								tags: ["service-staff", "import", "warning"],
							},
						);
						normalizedPhoneNumber = null;
					}
				}

				// Try to find by email if provided (include members to check relationship)
				let user: Awaited<
					ReturnType<
						typeof sqlClient.user.findUnique<{
							where: { email: string };
							include: { members: true };
						}>
					>
				> = null;

				if (userInfo.email) {
					user = await sqlClient.user.findUnique({
						where: { email: userInfo.email },
						include: {
							members: {
								where: {
									organizationId: store.organizationId,
								},
							},
						},
					});
					if (user) {
						userId = user.id;
					}
				}

				// If still not found and normalized phone number is provided, try to find by phone
				if (!user && normalizedPhoneNumber) {
					user = await sqlClient.user.findFirst({
						where: { phoneNumber: normalizedPhoneNumber },
						include: {
							members: {
								where: {
									organizationId: store.organizationId,
								},
							},
						},
					});
					if (user) {
						userId = user.id;
					}
				}

				// If still not found and name is provided, try to find by name
				if (!user && userInfo.name) {
					user = await sqlClient.user.findFirst({
						where: { name: userInfo.name },
						include: {
							members: {
								where: {
									organizationId: store.organizationId,
								},
							},
						},
					});
					if (user) {
						userId = user.id;
					}
				}

				// If user still not found, create new user
				if (!user) {
					try {
						// Generate email if not provided
						let email = userInfo.email;
						if (!email && userInfo.name) {
							const sanitizedName = userInfo.name
								.replace(/[^a-zA-Z0-9]/g, "")
								.toLowerCase()
								.substring(0, 20);
							const timestamp = Date.now();
							const random = crypto.randomBytes(4).toString("hex");
							email = `${sanitizedName}-${timestamp}-${random}@import.riben.life`;
						}

						// Check if generated email already exists
						if (email) {
							const existingEmailUser = await sqlClient.user.findUnique({
								where: { email },
								include: {
									members: {
										where: {
											organizationId: store.organizationId,
										},
									},
								},
							});
							if (existingEmailUser) {
								// Use existing user
								user = existingEmailUser;
								userId = user.id;
							} else {
								// Create new user with normalized phone number
								const newUser = await sqlClient.user.create({
									data: {
										email: email || null,
										name: userInfo.name || null,
										phoneNumber: normalizedPhoneNumber || null,
										locale: userInfo.locale || "tw",
										timezone: userInfo.timezone || "Asia/Taipei",
										role: userInfo.role || "user",
									},
									include: {
										members: {
											where: {
												organizationId: store.organizationId,
											},
										},
									},
								});
								user = newUser;
								userId = newUser.id;

								log.info("User created for service staff import", {
									metadata: {
										storeId: params.storeId,
										userId: newUser.id,
										email: newUser.email,
										name: newUser.name,
									},
									tags: ["service-staff", "import"],
								});

								// Create member relationship if organization exists
								if (store.organizationId) {
									const existingMember = await sqlClient.member.findFirst({
										where: {
											userId: newUser.id,
											organizationId: store.organizationId,
										},
									});

									if (!existingMember) {
										await sqlClient.member.create({
											data: {
												id: crypto.randomUUID(),
												userId: newUser.id,
												organizationId: store.organizationId,
												role: "staff",
												createdAt: getUtcNow(),
											},
										});
									}
								}
							}
						} else {
							log.warn("Cannot create user: no email or name provided", {
								metadata: {
									storeId: params.storeId,
									userInfo,
								},
								tags: ["service-staff", "import", "warning"],
							});
							continue;
						}
					} catch (userCreateError: unknown) {
						log.error("Failed to create user for service staff", {
							metadata: {
								storeId: params.storeId,
								error:
									userCreateError instanceof Error
										? userCreateError.message
										: String(userCreateError),
								userInfo: serviceStaff.User,
							},
							tags: ["service-staff", "import", "error"],
						});
						continue;
					}
				}

				// Ensure member relationship exists for existing users
				if (user && store.organizationId) {
					const existingMember = user.members?.find(
						(m: { organizationId: string }) =>
							m.organizationId === store.organizationId,
					);

					if (existingMember) {
						// Update member role to ensure it's "staff"
						await sqlClient.member.update({
							where: { id: existingMember.id },
							data: { role: "staff" },
						});

						log.info("Member role updated for service staff", {
							metadata: {
								storeId: params.storeId,
								userId: user.id,
								memberId: existingMember.id,
								role: "staff",
							},
							tags: ["service-staff", "import"],
						});
					} else {
						// Create member relationship
						await sqlClient.member.create({
							data: {
								id: crypto.randomUUID(),
								userId: user.id,
								organizationId: store.organizationId,
								role: "staff",
								createdAt: getUtcNow(),
							},
						});

						log.info("Member relationship created for service staff", {
							metadata: {
								storeId: params.storeId,
								userId: user.id,
								organizationId: store.organizationId,
								role: "staff",
							},
							tags: ["service-staff", "import"],
						});
					}
				}
			}

			// If we still don't have a userId, skip this entry
			if (!userId) {
				log.warn("User not found or created for service staff", {
					metadata: {
						storeId: params.storeId,
						serviceStaffId: serviceStaff.id,
						providedUserId: serviceStaff.userId,
						hasUserInfo: !!serviceStaff.User,
					},
					tags: ["service-staff", "import", "warning"],
				});
				continue;
			}

			// Upsert service staff - use findUnique with id, then by storeId + userId (unique constraint)
			const existing = await sqlClient.serviceStaff.findUnique({
				where: {
					id: serviceStaff.id,
				},
			});

			if (existing) {
				// Update existing service staff
				await sqlClient.serviceStaff.update({
					where: { id: serviceStaff.id },
					data: {
						userId: userId,
						capacity: serviceStaff.capacity ?? 4,
						defaultCost: serviceStaff.defaultCost
							? new Prisma.Decimal(serviceStaff.defaultCost)
							: new Prisma.Decimal(0),
						defaultCredit: serviceStaff.defaultCredit
							? new Prisma.Decimal(serviceStaff.defaultCredit)
							: new Prisma.Decimal(0),
						defaultDuration: serviceStaff.defaultDuration ?? 60,
						description: serviceStaff.description ?? null,
						isDeleted: serviceStaff.isDeleted ?? false,
					},
				});
			} else {
				// Try to find by storeId and userId (unique constraint)
				const existingByUser = await sqlClient.serviceStaff.findFirst({
					where: {
						storeId: params.storeId,
						userId: userId,
					},
				});

				if (existingByUser) {
					// Update existing service staff with same user
					await sqlClient.serviceStaff.update({
						where: { id: existingByUser.id },
						data: {
							capacity: serviceStaff.capacity ?? 4,
							defaultCost: serviceStaff.defaultCost
								? new Prisma.Decimal(serviceStaff.defaultCost)
								: new Prisma.Decimal(0),
							defaultCredit: serviceStaff.defaultCredit
								? new Prisma.Decimal(serviceStaff.defaultCredit)
								: new Prisma.Decimal(0),
							defaultDuration: serviceStaff.defaultDuration ?? 60,
							description: serviceStaff.description ?? null,
							isDeleted: serviceStaff.isDeleted ?? false,
						},
					});
				} else {
					// Create new service staff
					await sqlClient.serviceStaff.create({
						data: {
							id: serviceStaff.id || undefined,
							storeId: params.storeId,
							userId: userId,
							capacity: serviceStaff.capacity ?? 4,
							defaultCost: serviceStaff.defaultCost
								? new Prisma.Decimal(serviceStaff.defaultCost)
								: new Prisma.Decimal(0),
							defaultCredit: serviceStaff.defaultCredit
								? new Prisma.Decimal(serviceStaff.defaultCredit)
								: new Prisma.Decimal(0),
							defaultDuration: serviceStaff.defaultDuration ?? 60,
							description: serviceStaff.description ?? null,
							isDeleted: serviceStaff.isDeleted ?? false,
						},
					});
				}
			}
		}

		return NextResponse.json({ success: true });
	} catch (error: unknown) {
		log.error(error instanceof Error ? error : new Error(String(error)), {
			message: "Failed to import service staff",
			metadata: { storeId: params.storeId },
			tags: ["service-staff", "import", "error"],
			service: "service-staff-import",
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
