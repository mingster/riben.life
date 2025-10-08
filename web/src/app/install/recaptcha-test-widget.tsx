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
import {
	IconCheck,
	IconX,
	IconLoader,
	IconChevronDown,
	IconChevronUp,
} from "@tabler/icons-react";
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
	enterpriseRawResponse: any | null;
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

const RecaptchaTestForm = () => {
	const [loading, setLoading] = useState(false);
	const [result, setResult] = useState<VerificationResult | null>(null);
	const [error, setError] = useState<string>("");
	const [testMode, setTestMode] = useState<"standard" | "enterprise" | "both">(
		"standard",
	);
	const [expanded, setExpanded] = useState(false);
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
			const token = await executeRecaptcha("test");

			if (!token) {
				setError("Failed to generate reCAPTCHA token");
				return;
			}

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
		<Card className="w-full">
			<CardHeader
				className="cursor-pointer"
				onClick={() => setExpanded(!expanded)}
			>
				<div className="flex items-center justify-between">
					<div>
						<CardTitle className="text-lg">
							reCAPTCHA Verification Test
						</CardTitle>
						<CardDescription className="text-xs">
							Test reCAPTCHA v3 integration
						</CardDescription>
					</div>
					{expanded ? (
						<IconChevronUp className="h-5 w-5" />
					) : (
						<IconChevronDown className="h-5 w-5" />
					)}
				</div>
			</CardHeader>

			{expanded && (
				<CardContent className="space-y-4">
					{/* Status */}
					<div className="flex items-center gap-2 text-sm">
						{isRecaptchaReady ? (
							<>
								<IconCheck className="h-4 w-4 text-green-500" />
								<span className="text-green-600">reCAPTCHA Ready</span>
							</>
						) : (
							<>
								<IconLoader className="h-4 w-4 text-gray-400 animate-spin" />
								<span className="text-gray-600">Loading...</span>
							</>
						)}
					</div>

					{/* Test Mode */}
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
						>
							Enterprise
						</Button>
						<Button
							variant={testMode === "both" ? "default" : "outline"}
							onClick={() => setTestMode("both")}
							size="sm"
						>
							Both
						</Button>
					</div>

					{/* Test Button */}
					<Button
						onClick={handleTest}
						disabled={!isRecaptchaReady || loading}
						size="sm"
						className="w-full sm:w-auto"
					>
						{loading ? (
							<>
								<IconLoader className="mr-2 h-4 w-4 animate-spin" />
								Verifying...
							</>
						) : (
							"Test Verification"
						)}
					</Button>

					{/* Error */}
					{error && (
						<div className="p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-xs">
							<div className="flex items-start gap-2">
								<IconX className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
								<span className="text-red-800 dark:text-red-200">{error}</span>
							</div>
						</div>
					)}

					{/* Results */}
					{result && (
						<div className="space-y-3 text-xs">
							{/* Overall Status */}
							<div
								className={`p-2 rounded border flex items-center gap-2 ${
									result.success
										? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
										: "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
								}`}
							>
								{result.success ? (
									<IconCheck className="h-4 w-4 text-green-500 flex-shrink-0" />
								) : (
									<IconX className="h-4 w-4 text-red-500 flex-shrink-0" />
								)}
								<span className="font-semibold">
									{result.success ? "✓ Verified" : "✗ Failed"}
								</span>
							</div>

							{/* Standard Results */}
							{result.standardVerification && (
								<div className="p-2 bg-gray-50 dark:bg-gray-800 rounded">
									<p className="font-semibold mb-1">Standard Verification:</p>
									<p>
										Score:{" "}
										{result.standardVerification.score?.toFixed(2) || "N/A"}
									</p>
									<p>Method: {result.configuration.verificationMethod}</p>
								</div>
							)}

							{/* Enterprise Results */}
							{result.enterpriseAssessment && (
								<div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded">
									<p className="font-semibold mb-1">Enterprise Assessment:</p>
									<p>
										Score:{" "}
										{result.enterpriseAssessment.score?.toFixed(2) || "N/A"}
									</p>
									<p>
										Valid:{" "}
										{result.enterpriseAssessment.tokenProperties?.valid
											? "Yes"
											: "No"}
									</p>
								</div>
							)}

							{/* Configuration */}
							<div className="p-2 bg-gray-50 dark:bg-gray-800 rounded">
								<p className="font-semibold mb-1">Configuration:</p>
								<div className="space-y-1">
									<div className="flex justify-between">
										<span>Site Key:</span>
										<span>{result.configuration.hasSiteKey ? "✓" : "✗"}</span>
									</div>
									<div className="flex justify-between">
										<span>Secret Key:</span>
										<span>{result.configuration.hasSecretKey ? "✓" : "✗"}</span>
									</div>
									<div className="flex justify-between">
										<span>Enterprise:</span>
										<span>
											{result.configuration.hasEnterpriseConfig ? "✓" : "✗"}
										</span>
									</div>
								</div>
							</div>
						</div>
					)}
				</CardContent>
			)}
		</Card>
	);
};

export const RecaptchaTestWidget = () => {
	const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA as string;

	if (!siteKey) {
		return (
			<Card className="w-full">
				<CardHeader>
					<CardTitle className="text-lg text-red-500">
						reCAPTCHA Not Configured
					</CardTitle>
					<CardDescription className="text-xs">
						NEXT_PUBLIC_RECAPTCHA environment variable is not set
					</CardDescription>
				</CardHeader>
			</Card>
		);
	}

	return (
		<GoogleReCaptchaProvider
			reCaptchaKey={siteKey}
			useEnterprise={false}
			useRecaptchaNet={false}
		>
			<RecaptchaTestForm />
		</GoogleReCaptchaProvider>
	);
};
