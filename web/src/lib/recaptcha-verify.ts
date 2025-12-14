import { RecaptchaEnterpriseServiceClient } from "@google-cloud/recaptcha-enterprise";
import logger from "@/lib/logger";

interface RecaptchaVerificationResult {
	success: boolean;
	score?: number;
	reasons?: string[];
	error?: string;
}

interface RecaptchaVerificationOptions {
	token: string;
	action?: string;
	projectId?: string;
	siteKey?: string;
	minScore?: number;
	// Optional context information (recommended by Google)
	userIpAddress?: string;
	userAgent?: string;
	ja3?: string; // JA3 fingerprint
}

/**
 * Verify reCAPTCHA v3 token using Google Cloud reCAPTCHA Enterprise
 * Based on: https://cloud.google.com/recaptcha/docs/create-assessment-website
 */
export async function verifyRecaptchaV3({
	token,
	action = "contact_form",
	projectId = process.env.GOOGLE_CLOUD_PROJECT_ID || "riben-web",
	siteKey = process.env.NEXT_PUBLIC_RECAPTCHA,
	minScore = 0.5,
	userIpAddress,
	userAgent,
	ja3,
}: RecaptchaVerificationOptions): Promise<RecaptchaVerificationResult> {
	logger.info("verifyRecaptchaV3 called - Enterprise reCAPTCHA verification", {
		metadata: {
			action,
			projectId,
			siteKey: siteKey ? siteKey.substring(0, 10) + "..." : "not set",
			minScore,
			hasUserIp: !!userIpAddress,
			hasUserAgent: !!userAgent,
		},
		tags: ["recaptcha", "enterprise", "verifyRecaptchaV3"],
	});

	if (!token) {
		logger.error("verifyRecaptchaV3: Token is required", {
			tags: ["recaptcha", "enterprise", "error"],
		});
		return { success: false, error: "Token is required" };
	}

	if (!siteKey) {
		logger.error("verifyRecaptchaV3: Site key is not configured", {
			tags: ["recaptcha", "enterprise", "error"],
		});
		return { success: false, error: "Site key is not configured" };
	}

	try {
		// Check if we have Google Cloud credentials configured
		if (
			!process.env.GOOGLE_APPLICATION_CREDENTIALS &&
			!process.env.GOOGLE_CLOUD_SERVICE_ACCOUNT_KEY
		) {
			logger.error(
				"verifyRecaptchaV3: Google Cloud credentials not configured",
				{
					metadata: {
						hasApplicationCredentials:
							!!process.env.GOOGLE_APPLICATION_CREDENTIALS,
						hasServiceAccountKey:
							!!process.env.GOOGLE_CLOUD_SERVICE_ACCOUNT_KEY,
					},
					tags: ["recaptcha", "enterprise", "error", "credentials"],
				},
			);
			throw new Error(
				"Google Cloud credentials not configured. Falling back to basic verification.",
			);
		}

		// Create the reCAPTCHA client
		// Note: To avoid memory issues in production, cache this client generation
		// or call client.close() before exiting (as per Google's recommendations)
		const client = new RecaptchaEnterpriseServiceClient();
		const projectPath = client.projectPath(projectId);

		// Build the assessment request following Google's structure
		// Include optional context for better risk analysis
		const event: any = {
			token: token,
			siteKey: siteKey,
			expectedAction: action,
		};

		// Add optional context information if provided (improves accuracy)
		if (userIpAddress) event.userIpAddress = userIpAddress;
		if (userAgent) event.userAgent = userAgent;
		if (ja3) event.ja3 = ja3;

		const request = {
			assessment: {
				event: event,
			},
			parent: projectPath,
		};

		// Create assessment to analyze the risk of this UI action
		logger.info("verifyRecaptchaV3: Creating Enterprise assessment", {
			metadata: {
				projectId,
				action,
			},
			tags: ["recaptcha", "enterprise", "assessment"],
		});
		const [response] = await client.createAssessment(request);

		// Check if the token is valid
		if (!response.tokenProperties?.valid) {
			logger.error("verifyRecaptchaV3: Token is invalid", {
				metadata: {
					invalidReason: response.tokenProperties?.invalidReason,
				},
				tags: ["recaptcha", "enterprise", "error"],
			});
			return {
				success: false,
				error: `Token is invalid: ${response.tokenProperties?.invalidReason || "Unknown reason"}`,
			};
		}

		// Check if the expected action was executed
		if (response.tokenProperties.action !== action) {
			logger.error("verifyRecaptchaV3: Action mismatch", {
				metadata: {
					expected: action,
					got: response.tokenProperties.action,
				},
				tags: ["recaptcha", "enterprise", "error"],
			});
			return {
				success: false,
				error: `Action mismatch. Expected: ${action}, Got: ${response.tokenProperties.action}`,
			};
		}

		// Get the risk score
		const score = response.riskAnalysis?.score || 0;
		const reasons = response.riskAnalysis?.reasons || [];

		logger.info("verifyRecaptchaV3: Assessment completed", {
			metadata: {
				score,
				reasons: reasons.map((r) => r.toString()),
				action: response.tokenProperties.action,
				minScore,
			},
			tags: ["recaptcha", "enterprise", "assessment"],
		});

		// Check if score meets minimum threshold
		if (score < minScore) {
			logger.warn("verifyRecaptchaV3: Score below threshold", {
				metadata: {
					score,
					minScore,
					reasons: reasons.map((r) => r.toString()),
				},
				tags: ["recaptcha", "enterprise", "warning"],
			});
			return {
				success: false,
				score,
				reasons: reasons.map((reason) => reason.toString()),
				error: `Score too low: ${score} (minimum: ${minScore})`,
			};
		}

		logger.info("verifyRecaptchaV3: Verification successful", {
			metadata: {
				score,
				reasons: reasons.map((r) => r.toString()),
				action,
			},
			tags: ["recaptcha", "enterprise", "success"],
		});

		return {
			success: true,
			score,
			reasons: reasons.map((reason) => reason.toString()),
		};
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error);
		const isVerificationRequired =
			errorMessage.includes("驗證") ||
			errorMessage.includes("verification") ||
			errorMessage.includes("必須先完成") ||
			errorMessage.includes("must complete");

		logger.error("verifyRecaptchaV3: Enterprise reCAPTCHA verification error", {
			metadata: {
				error: errorMessage,
				isVerificationRequired,
				stack: error instanceof Error ? error.stack : undefined,
				projectId,
				siteKey: siteKey ? siteKey.substring(0, 10) + "..." : "not set",
			},
			tags: ["recaptcha", "enterprise", "error"],
		});

		// Provide helpful error message if verification is required
		if (isVerificationRequired) {
			return {
				success: false,
				error:
					"reCAPTCHA site key needs verification in Google Console. Please complete the verification step in Google reCAPTCHA Admin Console before using this key.",
			};
		}

		return {
			success: false,
			error: errorMessage,
		};
	}
}

/**
 * Fallback verification using Google's basic reCAPTCHA API
 * Used when Enterprise is not available or as backup
 */
export async function verifyRecaptchaBasic(
	token: string,
	secretKey?: string,
): Promise<RecaptchaVerificationResult> {
	if (!token) {
		return { success: false, error: "Token is required" };
	}

	const secret = secretKey || process.env.RECAPTCHA_SECRET_KEY;
	if (!secret) {
		return { success: false, error: "Secret key is not configured" };
	}

	try {
		const formData = new URLSearchParams({
			secret,
			response: token,
		});

		const response = await fetch(
			"https://www.google.com/recaptcha/api/siteverify",
			{
				method: "POST",
				headers: {
					"Content-Type": "application/x-www-form-urlencoded",
				},
				body: formData,
			},
		);

		const data = await response.json();

		if (data.success) {
			return {
				success: true,
				score: data.score || 1.0,
			};
		} else {
			const errorCodes = data["error-codes"] || [];
			const isVerificationRequired = errorCodes.some(
				(code: string) =>
					code.toLowerCase().includes("verification") ||
					code.toLowerCase().includes("驗證"),
			);

			const errorMessage = isVerificationRequired
				? "reCAPTCHA site key needs verification in Google Console. Please complete the verification step in Google reCAPTCHA Admin Console before using this key."
				: `Verification failed: ${errorCodes.join(", ") || "Unknown error"}`;

			logger.error("verifyRecaptchaBasic: Verification failed", {
				metadata: {
					errorCodes,
					isVerificationRequired,
				},
				tags: ["recaptcha", "basic", "error"],
			});

			return {
				success: false,
				error: errorMessage,
			};
		}
	} catch (error) {
		logger.error("Basic reCAPTCHA verification error:", {
			metadata: {
				error: error instanceof Error ? error.message : String(error),
			},
			tags: ["error"],
		});
		return {
			success: false,
			error: error instanceof Error ? error.message : "Network error",
		};
	}
}

/**
 * Main verification function that tries Enterprise first, then falls back to basic
 */
export async function verifyRecaptcha(
	token: string,
	options?: Partial<RecaptchaVerificationOptions>,
): Promise<RecaptchaVerificationResult> {
	// Try Enterprise verification first if all required configs are present
	const hasEnterpriseConfig = !!(
		process.env.GOOGLE_CLOUD_PROJECT_ID &&
		(process.env.GOOGLE_APPLICATION_CREDENTIALS ||
			process.env.GOOGLE_CLOUD_SERVICE_ACCOUNT_KEY)
	);

	if (hasEnterpriseConfig) {
		try {
			logger.info(
				"Attempting Enterprise reCAPTCHA verification via verifyRecaptchaV3",
				{
					metadata: {
						action: options?.action || "contact_form",
						projectId:
							options?.projectId || process.env.GOOGLE_CLOUD_PROJECT_ID,
					},
					tags: ["recaptcha", "enterprise", "verification"],
				},
			);
			const result = await verifyRecaptchaV3({ token, ...options });
			if (result.success) {
				logger.info(
					"✓ Enterprise reCAPTCHA verification successful via verifyRecaptchaV3",
					{
						metadata: {
							score: result.score,
							reasons: result.reasons,
							action: options?.action || "contact_form",
						},
						tags: ["recaptcha", "enterprise", "success"],
					},
				);
				return result;
			}
			// If Enterprise fails, log and continue to basic verification
			logger.warn(
				"Enterprise reCAPTCHA verification failed, falling back to basic",
				{
					metadata: {
						error: result.error,
						score: result.score,
						reasons: result.reasons,
					},
					tags: ["recaptcha", "enterprise", "fallback"],
				},
			);
		} catch (error) {
			logger.warn(
				"Enterprise reCAPTCHA verification error, falling back to basic",
				{
					metadata: {
						error: error instanceof Error ? error.message : String(error),
						stack: error instanceof Error ? error.stack : undefined,
					},
					tags: ["recaptcha", "enterprise", "error", "fallback"],
				},
			);
		}
	} else {
		logger.info(
			"Using basic reCAPTCHA verification (Enterprise not configured - verifyRecaptchaV3 not available)",
			{
				metadata: {
					hasProjectId: !!process.env.GOOGLE_CLOUD_PROJECT_ID,
					hasCredentials: !!(
						process.env.GOOGLE_APPLICATION_CREDENTIALS ||
						process.env.GOOGLE_CLOUD_SERVICE_ACCOUNT_KEY
					),
				},
				tags: ["recaptcha", "basic", "verification"],
			},
		);
	}

	// Fallback to basic verification
	const result = await verifyRecaptchaBasic(
		token,
		process.env.RECAPTCHA_SECRET_KEY,
	);
	if (result.success) {
		logger.info("✓ Basic reCAPTCHA verification successful");
	}
	return result;
}
