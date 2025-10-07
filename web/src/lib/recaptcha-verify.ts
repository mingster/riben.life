import { RecaptchaEnterpriseServiceClient } from "@google-cloud/recaptcha-enterprise";

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
	projectId = process.env.GOOGLE_CLOUD_PROJECT_ID || "riben-life",
	siteKey = process.env.NEXT_PUBLIC_RECAPTCHA,
	minScore = 0.5,
	userIpAddress,
	userAgent,
	ja3,
}: RecaptchaVerificationOptions): Promise<RecaptchaVerificationResult> {
	if (!token) {
		return { success: false, error: "Token is required" };
	}

	if (!siteKey) {
		return { success: false, error: "Site key is not configured" };
	}

	try {
		// Check if we have Google Cloud credentials configured
		if (
			!process.env.GOOGLE_APPLICATION_CREDENTIALS &&
			!process.env.GOOGLE_CLOUD_SERVICE_ACCOUNT_KEY
		) {
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
		const [response] = await client.createAssessment(request);

		// Check if the token is valid
		if (!response.tokenProperties?.valid) {
			return {
				success: false,
				error: `Token is invalid: ${response.tokenProperties?.invalidReason || "Unknown reason"}`,
			};
		}

		// Check if the expected action was executed
		if (response.tokenProperties.action !== action) {
			return {
				success: false,
				error: `Action mismatch. Expected: ${action}, Got: ${response.tokenProperties.action}`,
			};
		}

		// Get the risk score
		const score = response.riskAnalysis?.score || 0;
		const reasons = response.riskAnalysis?.reasons || [];

		// Check if score meets minimum threshold
		if (score < minScore) {
			return {
				success: false,
				score,
				reasons: reasons.map((reason) => reason.toString()),
				error: `Score too low: ${score} (minimum: ${minScore})`,
			};
		}

		return {
			success: true,
			score,
			reasons: reasons.map((reason) => reason.toString()),
		};
	} catch (error) {
		console.error("reCAPTCHA verification error:", error);
		return {
			success: false,
			error: error instanceof Error ? error.message : "Unknown error",
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
			return {
				success: false,
				error: `Verification failed: ${data["error-codes"]?.join(", ") || "Unknown error"}`,
			};
		}
	} catch (error) {
		console.error("Basic reCAPTCHA verification error:", error);
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
			const result = await verifyRecaptchaV3({ token, ...options });
			if (result.success) {
				console.log("✓ Enterprise reCAPTCHA verification successful");
				return result;
			}
			// If Enterprise fails, log and continue to basic verification
			console.warn(
				"Enterprise reCAPTCHA verification failed, falling back to basic:",
				result.error,
			);
		} catch (error) {
			console.warn(
				"Enterprise reCAPTCHA verification error, falling back to basic:",
				error instanceof Error ? error.message : error,
			);
		}
	} else {
		console.log(
			"Using basic reCAPTCHA verification (Enterprise not configured)",
		);
	}

	// Fallback to basic verification
	const result = await verifyRecaptchaBasic(
		token,
		process.env.RECAPTCHA_SECRET_KEY,
	);
	if (result.success) {
		console.log("✓ Basic reCAPTCHA verification successful");
	}
	return result;
}
