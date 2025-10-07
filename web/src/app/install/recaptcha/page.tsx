"use client";

import { useState, useCallback } from "react";
import {
	GoogleReCaptchaProvider,
	useGoogleReCaptcha,
} from "@wojtekmaj/react-recaptcha-v3";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { IconCheck, IconX, IconLoader } from "@tabler/icons-react";
import axios from "axios";

interface VerificationResult {
	success: boolean;
	testMode: string;
	standardVerification: {
		score?: number;
		reasons?: string[];
		error?: string;
	} | null;
	enterpriseAssessment: {
		success: boolean;
		score?: number;
		reasons?: string[];
		error?: string;
		tokenProperties?: any;
	} | null;
	enterpriseRawResponse: {
		name: string;
		tokenProperties: any;
		riskAnalysis: any;
		event: any;
	} | null;
	configuration: {
		hasSiteKey: boolean;
		hasSecretKey: boolean;
		hasEnterpriseConfig: boolean;
		verificationMethod: string;
		projectId: string;
	};
	context: {
		action: string;
		minScore: number;
		userIpAddress: string;
		userAgent: string;
	};
	timestamp: string;
}

const TestForm = () => {
	const [loading, setLoading] = useState(false);
	const [result, setResult] = useState<VerificationResult | null>(null);
	const [error, setError] = useState<string>("");
	const [testMode, setTestMode] = useState<"standard" | "enterprise" | "both">(
		"standard",
	);
	const { executeRecaptcha } = useGoogleReCaptcha();
	const isRecaptchaReady = !!executeRecaptcha;

	const handleTest = useCallback(async () => {
		if (!executeRecaptcha) {
			setError("reCAPTCHA not loaded yet. Please wait...");
			return;
		}

		setLoading(true);
		setError("");
		setResult(null);

		try {
			// Generate token
			const token = await executeRecaptcha("test");

			if (!token) {
				setError("Failed to generate reCAPTCHA token");
				return;
			}

			// Verify token
			const response = await axios.post("/api/common/recaptcha-verify", {
				token,
				action: "test",
				minScore: 0.5,
				testMode,
			});

			setResult(response.data);
		} catch (err) {
			if (axios.isAxiosError(err)) {
				setError(err.response?.data?.error || err.message);
			} else {
				setError(err instanceof Error ? err.message : "Unknown error");
			}
		} finally {
			setLoading(false);
		}
	}, [executeRecaptcha, testMode]);

	return (
		<div className="container max-w-4xl py-10">
			<Card>
				<CardHeader>
					<CardTitle>reCAPTCHA Verification Test</CardTitle>
					<CardDescription>
						Test your reCAPTCHA setup and verify that tokens are being validated
						correctly
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-6">
					{/* Status Indicators */}
					<div className="space-y-2">
						<h3 className="font-semibold">Status:</h3>
						<div className="flex items-center gap-2">
							{isRecaptchaReady ? (
								<>
									<IconCheck className="h-5 w-5 text-green-500" />
									<span className="text-green-600">reCAPTCHA v3 is ready</span>
								</>
							) : (
								<>
									<IconLoader className="h-5 w-5 text-gray-400 animate-spin" />
									<span className="text-gray-600">Loading reCAPTCHA...</span>
								</>
							)}
						</div>
					</div>

					{/* Test Mode Selection */}
					<div className="space-y-2">
						<h3 className="font-semibold text-sm">Test Mode:</h3>
						<div className="flex gap-2 flex-wrap">
							<Button
								variant={testMode === "standard" ? "default" : "outline"}
								onClick={() => setTestMode("standard")}
								size="sm"
							>
								Standard
							</Button>
							<Button
								variant={testMode === "enterprise" ? "default" : "outline"}
								onClick={() => setTestMode("enterprise")}
								size="sm"
								disabled={
									!result?.configuration.hasEnterpriseConfig &&
									testMode !== "enterprise"
								}
							>
								Enterprise (Direct createAssessment)
							</Button>
							<Button
								variant={testMode === "both" ? "default" : "outline"}
								onClick={() => setTestMode("both")}
								size="sm"
								disabled={
									!result?.configuration.hasEnterpriseConfig &&
									testMode !== "both"
								}
							>
								Both
							</Button>
						</div>
						<p className="text-xs text-gray-500">
							{testMode === "standard" &&
								"Uses our wrapper with fallback logic"}
							{testMode === "enterprise" &&
								"Direct Google Cloud createAssessment call"}
							{testMode === "both" && "Runs both methods and compares results"}
						</p>
					</div>

					{/* Test Button */}
					<div>
						<Button
							onClick={handleTest}
							disabled={!isRecaptchaReady || loading}
							className="w-full sm:w-auto"
						>
							{loading ? (
								<>
									<IconLoader className="mr-2 h-4 w-4 animate-spin" />
									Verifying...
								</>
							) : (
								"Test reCAPTCHA Verification"
							)}
						</Button>
					</div>

					{/* Error Display */}
					{error && (
						<div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
							<div className="flex items-start gap-2">
								<IconX className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
								<div>
									<p className="font-semibold text-red-800 dark:text-red-200">
										Error
									</p>
									<p className="text-sm text-red-700 dark:text-red-300">
										{error}
									</p>
								</div>
							</div>
						</div>
					)}

					{/* Results Display */}
					{result && (
						<div className="space-y-4">
							{/* Overall Status */}
							<div
								className={`p-4 rounded-lg border ${
									result.success
										? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
										: "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
								}`}
							>
								<div className="flex items-start gap-2">
									{result.success ? (
										<IconCheck className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
									) : (
										<IconX className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
									)}
									<div>
										<p className="font-semibold">
											{result.success
												? "Verification Successful"
												: "Verification Failed"}
										</p>
										<p className="text-sm mt-1">
											{result.standardVerification?.error ||
												result.enterpriseAssessment?.error ||
												"Token validated successfully"}
										</p>
									</div>
								</div>
							</div>

							{/* Standard Verification Results */}
							{result.standardVerification && (
								<div className="space-y-3">
									<h3 className="font-semibold">Standard Verification:</h3>
									<div className="grid gap-3 sm:grid-cols-2">
										<div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
											<p className="text-sm text-gray-600 dark:text-gray-400">
												Score
											</p>
											<p className="text-lg font-semibold">
												{result.standardVerification.score !== undefined
													? result.standardVerification.score.toFixed(2)
													: "N/A"}
											</p>
											<p className="text-xs text-gray-500 mt-1">
												{result.standardVerification.score !== undefined &&
													(result.standardVerification.score >= 0.7
														? "Likely human"
														: result.standardVerification.score >= 0.5
															? "Neutral"
															: "Likely bot")}
											</p>
										</div>

										<div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
											<p className="text-sm text-gray-600 dark:text-gray-400">
												Method
											</p>
											<p className="text-lg font-semibold">
												{result.configuration.verificationMethod}
											</p>
										</div>
									</div>

									{result.standardVerification.reasons &&
										result.standardVerification.reasons.length > 0 && (
											<div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
												<p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
													Reasons
												</p>
												<ul className="list-disc list-inside text-sm space-y-1">
													{result.standardVerification.reasons.map(
														(reason, index) => (
															<li key={index}>{reason}</li>
														),
													)}
												</ul>
											</div>
										)}
								</div>
							)}

							{/* Enterprise Assessment Results */}
							{result.enterpriseAssessment && (
								<div className="space-y-3">
									<h3 className="font-semibold">
										Enterprise Assessment (Direct createAssessment):
									</h3>
									<div className="grid gap-3 sm:grid-cols-2">
										<div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
											<p className="text-sm text-gray-600 dark:text-gray-400">
												Score
											</p>
											<p className="text-lg font-semibold">
												{result.enterpriseAssessment.score !== undefined
													? result.enterpriseAssessment.score.toFixed(2)
													: "N/A"}
											</p>
											<p className="text-xs text-gray-500 mt-1">
												{result.enterpriseAssessment.score !== undefined &&
													(result.enterpriseAssessment.score >= 0.7
														? "Likely human"
														: result.enterpriseAssessment.score >= 0.5
															? "Neutral"
															: "Likely bot")}
											</p>
										</div>

										<div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
											<p className="text-sm text-gray-600 dark:text-gray-400">
												Token Valid
											</p>
											<p className="text-lg font-semibold">
												{result.enterpriseAssessment.tokenProperties?.valid
													? "Yes"
													: "No"}
											</p>
											<p className="text-xs text-gray-500 mt-1">
												Action:{" "}
												{result.enterpriseAssessment.tokenProperties?.action ||
													"N/A"}
											</p>
										</div>
									</div>

									{result.enterpriseAssessment.reasons &&
										result.enterpriseAssessment.reasons.length > 0 && (
											<div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
												<p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
													Risk Analysis Reasons
												</p>
												<ul className="list-disc list-inside text-sm space-y-1">
													{result.enterpriseAssessment.reasons.map(
														(reason, index) => (
															<li key={index}>{reason}</li>
														),
													)}
												</ul>
											</div>
										)}

									{/* Raw Response */}
									{result.enterpriseRawResponse && (
										<details className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
											<summary className="text-sm text-gray-600 dark:text-gray-400 cursor-pointer mb-2">
												Raw Google Cloud Response
											</summary>
											<pre className="text-xs font-mono overflow-x-auto p-2 bg-white dark:bg-gray-900 rounded mt-2">
												{JSON.stringify(result.enterpriseRawResponse, null, 2)}
											</pre>
										</details>
									)}
								</div>
							)}

							{/* Configuration */}
							<div className="space-y-3">
								<h3 className="font-semibold">Configuration:</h3>
								<div className="grid gap-2">
									<div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded">
										<span className="text-sm">Site Key</span>
										<span className="flex items-center gap-2">
											{result.configuration.hasSiteKey ? (
												<>
													<IconCheck className="h-4 w-4 text-green-500" />{" "}
													Configured
												</>
											) : (
												<>
													<IconX className="h-4 w-4 text-red-500" /> Missing
												</>
											)}
										</span>
									</div>
									<div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded">
										<span className="text-sm">Secret Key</span>
										<span className="flex items-center gap-2">
											{result.configuration.hasSecretKey ? (
												<>
													<IconCheck className="h-4 w-4 text-green-500" />{" "}
													Configured
												</>
											) : (
												<>
													<IconX className="h-4 w-4 text-red-500" /> Missing
												</>
											)}
										</span>
									</div>
									<div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded">
										<span className="text-sm">Enterprise Config</span>
										<span className="flex items-center gap-2">
											{result.configuration.hasEnterpriseConfig ? (
												<>
													<IconCheck className="h-4 w-4 text-green-500" />{" "}
													Enabled
												</>
											) : (
												<>
													<IconX className="h-4 w-4 text-gray-400" /> Not
													configured
												</>
											)}
										</span>
									</div>
								</div>
							</div>

							{/* Context */}
							<div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
								<p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
									Request Context
								</p>
								<div className="text-xs space-y-1 font-mono">
									<p>Action: {result.context.action}</p>
									<p>Min Score: {result.context.minScore}</p>
									<p>IP: {result.context.userIpAddress}</p>
									<p>Time: {new Date(result.timestamp).toLocaleString()}</p>
								</div>
							</div>
						</div>
					)}

					{/* Help Text */}
					<div className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
						<p>
							<strong>What this test does:</strong>
						</p>
						<ul className="list-disc list-inside space-y-1 ml-4">
							<li>Generates a reCAPTCHA v3 token in the browser</li>
							<li>Sends the token to your backend for verification</li>
							<li>Shows the verification result and score</li>
							<li>Displays your current configuration status</li>
						</ul>
						<p className="mt-4">
							<strong>Expected behavior:</strong>
						</p>
						<ul className="list-disc list-inside space-y-1 ml-4">
							<li>New keys may show low confidence scores initially</li>
							<li>
								Scores improve after 48 hours as reCAPTCHA learns your site
							</li>
							<li>Test keys always return score = 0.9</li>
						</ul>
					</div>
				</CardContent>
			</Card>
		</div>
	);
};

export default function RecaptchaTestPage() {
	const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA as string;

	if (!siteKey) {
		return (
			<div className="container max-w-4xl py-10">
				<Card>
					<CardHeader>
						<CardTitle>Configuration Error</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
							<p className="text-red-800 dark:text-red-200">
								NEXT_PUBLIC_RECAPTCHA environment variable is not set.
							</p>
							<p className="text-sm text-red-700 dark:text-red-300 mt-2">
								Please configure your reCAPTCHA site key before using this test
								page.
							</p>
						</div>
					</CardContent>
				</Card>
			</div>
		);
	}

	return (
		<GoogleReCaptchaProvider
			reCaptchaKey={siteKey}
			useEnterprise={false}
			useRecaptchaNet={false}
		>
			<TestForm />
		</GoogleReCaptchaProvider>
	);
}
