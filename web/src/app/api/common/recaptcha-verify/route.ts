import { verifyRecaptcha } from "@/lib/recaptcha-verify";
import { RecaptchaEnterpriseServiceClient } from "@google-cloud/recaptcha-enterprise";
import logger from "@/lib/logger";
import { NextResponse } from "next/server";
import { getUtcNowEpoch, epochToDate } from "@/utils/datetime-utils";

/**
 * Endpoint for verifying reCAPTCHA tokens
 * This endpoint helps verify your reCAPTCHA setup is working correctly
 *
 * Usage:
 * POST /api/common/recaptcha-verify
 * Body: { token: "your-recaptcha-token", action: "test", testMode: "standard|enterprise|both" }
 */
export async function POST(request: Request) {
	const log = logger.child({ module: "recaptcha-verify-test" });

	try {
		const body = await request.json();
		const {
			token,
			action = "test",
			minScore = 0.5,
			testMode = "standard",
		} = body;

		if (!token) {
			return NextResponse.json(
				{
					success: false,
					error: "Token is required",
					help: "Include 'token' in request body",
				},
				{ status: 400 },
			);
		}

		log.info("Testing reCAPTCHA verification", {
			metadata: {
				hasToken: !!token,
				tokenLength: token?.length || 0,
				action,
				minScore,
				testMode,
			},
		});

		// Get user context
		const userIpAddress =
			request.headers.get("x-forwarded-for") ||
			request.headers.get("x-real-ip") ||
			"unknown";
		const userAgent = request.headers.get("user-agent") || "unknown";

		// Check configuration
		const hasEnterpriseConfig = !!(
			process.env.GOOGLE_CLOUD_PROJECT_ID &&
			(process.env.GOOGLE_APPLICATION_CREDENTIALS ||
				process.env.GOOGLE_CLOUD_SERVICE_ACCOUNT_KEY)
		);

		const hasSiteKey = !!process.env.NEXT_PUBLIC_RECAPTCHA;
		const hasSecretKey = !!process.env.RECAPTCHA_SECRET_KEY;

		let standardResult = null;
		let enterpriseResult = null;
		let enterpriseRawResponse = null;

		// Run standard verification
		if (testMode === "standard" || testMode === "both") {
			standardResult = await verifyRecaptcha(token, {
				action,
				minScore,
				userIpAddress,
				userAgent,
			});

			log.info("Standard verification completed", {
				metadata: {
					success: standardResult.success,
					score: standardResult.score,
				},
			});
		}

		// Run direct Enterprise assessment (like your bin/google-recaptcha-verify.js)
		if (
			(testMode === "enterprise" || testMode === "both") &&
			hasEnterpriseConfig
		) {
			try {
				const projectID = process.env.GOOGLE_CLOUD_PROJECT_ID || "riben-web";
				const recaptchaKey = process.env.NEXT_PUBLIC_RECAPTCHA as string;

				// Create the reCAPTCHA client
				const client = new RecaptchaEnterpriseServiceClient();
				const projectPath = client.projectPath(projectID);

				// Build the assessment request
				const request = {
					assessment: {
						event: {
							token: token,
							siteKey: recaptchaKey,
							expectedAction: action,
							userIpAddress: userIpAddress,
							userAgent: userAgent,
						},
					},
					parent: projectPath,
				};

				log.info("Creating Enterprise assessment", {
					metadata: { projectID, action },
				});

				const [response] = await client.createAssessment(request);

				// Check if the token is valid
				if (!response.tokenProperties?.valid) {
					enterpriseResult = {
						success: false,
						error: `Token invalid: ${response.tokenProperties?.invalidReason}`,
						tokenProperties: {
							valid: response.tokenProperties?.valid,
							invalidReason: response.tokenProperties?.invalidReason,
							hostname: response.tokenProperties?.hostname,
							action: response.tokenProperties?.action,
							createTime: response.tokenProperties?.createTime,
						},
					};
				} else if (response.tokenProperties.action === action) {
					// Get the risk score and reasons
					const score = response.riskAnalysis?.score || 0;
					const reasons = response.riskAnalysis?.reasons || [];

					enterpriseResult = {
						success: score >= minScore,
						score: score,
						reasons: reasons.map((reason) => reason.toString()),
						tokenProperties: {
							valid: response.tokenProperties.valid,
							hostname: response.tokenProperties.hostname,
							action: response.tokenProperties.action,
							createTime: response.tokenProperties.createTime,
						},
					};

					log.info(`Enterprise assessment score: ${score}`, {
						metadata: { reasons },
					});
				} else {
					enterpriseResult = {
						success: false,
						error: `Action mismatch. Expected: ${action}, Got: ${response.tokenProperties.action}`,
						tokenProperties: {
							valid: response.tokenProperties?.valid,
							action: response.tokenProperties?.action,
							expectedAction: action,
						},
					};
				}

				// Store raw response for debugging
				enterpriseRawResponse = {
					name: response.name,
					tokenProperties: {
						valid: response.tokenProperties?.valid,
						invalidReason: response.tokenProperties?.invalidReason,
						hostname: response.tokenProperties?.hostname,
						action: response.tokenProperties?.action,
						createTime: response.tokenProperties?.createTime
							? new Date(
									(response.tokenProperties.createTime as any).seconds * 1000,
								).toISOString()
							: undefined,
					},
					riskAnalysis: {
						score: response.riskAnalysis?.score,
						reasons: response.riskAnalysis?.reasons?.map((r) => r.toString()),
					},
					event: response.event,
				};
			} catch (error) {
				log.error("Enterprise assessment failed", {
					metadata: {
						error: error instanceof Error ? error.message : "Unknown error",
					},
				});
				enterpriseResult = {
					success: false,
					error: error instanceof Error ? error.message : "Unknown error",
				};
			}
		}

		// Return detailed results
		return NextResponse.json({
			success: standardResult?.success || enterpriseResult?.success || false,
			testMode,
			standardVerification: standardResult
				? {
						score: standardResult.score,
						reasons: standardResult.reasons,
						error: standardResult.error,
					}
				: null,
			enterpriseAssessment: enterpriseResult,
			enterpriseRawResponse: enterpriseRawResponse,
			configuration: {
				hasSiteKey,
				hasSecretKey,
				hasEnterpriseConfig,
				verificationMethod: hasEnterpriseConfig
					? "Enterprise (with fallback)"
					: "Basic",
				projectId: process.env.GOOGLE_CLOUD_PROJECT_ID || "not set",
			},
			context: {
				action,
				minScore,
				userIpAddress,
				userAgent,
			},
			timestamp:
				epochToDate(getUtcNowEpoch())?.toISOString() ||
				new Date().toISOString(),
		});
	} catch (error) {
		log.error("reCAPTCHA verification test failed", {
			metadata: {
				error: error instanceof Error ? error.message : "Unknown error",
			},
		});

		return NextResponse.json(
			{
				success: false,
				error: error instanceof Error ? error.message : "Unknown error",
				stack:
					process.env.NODE_ENV === "development"
						? error instanceof Error
							? error.stack
							: undefined
						: undefined,
			},
			{ status: 500 },
		);
	}
}

/**
 * GET endpoint to check configuration
 */
export async function GET() {
	const hasEnterpriseConfig = !!(
		process.env.GOOGLE_CLOUD_PROJECT_ID &&
		(process.env.GOOGLE_APPLICATION_CREDENTIALS ||
			process.env.GOOGLE_CLOUD_SERVICE_ACCOUNT_KEY)
	);

	const hasSiteKey = !!process.env.NEXT_PUBLIC_RECAPTCHA;
	const hasSecretKey = !!process.env.RECAPTCHA_SECRET_KEY;

	return NextResponse.json({
		status: "ready",
		configuration: {
			hasSiteKey,
			hasSecretKey,
			hasEnterpriseConfig,
			verificationMethod: hasEnterpriseConfig
				? "Enterprise (with fallback)"
				: "Basic",
			projectId: process.env.GOOGLE_CLOUD_PROJECT_ID || "not set",
		},
		help: {
			usage: "POST /api/common/recaptcha-verify with { token: 'your-token' }",
			frontend:
				"Execute grecaptcha.enterprise.execute() or executeRecaptcha() to get token",
			documentation: "/doc/RECAPTCHA_SETUP.md",
		},
	});
}
