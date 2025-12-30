"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import * as z from "zod/v4";
import { useTranslation } from "@/app/i18n/client";
import { useIsHydrated } from "@/hooks/use-hydrated";
import { analytics } from "@/lib/analytics";
import { clientLogger } from "@/lib/client-logger";
import { useI18n } from "@/providers/i18n-provider";
import { toastError, toastSuccess } from "../toaster";
import { Button } from "../ui/button";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
	FormDescription,
} from "../ui/form";
import { Input } from "../ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "../ui/input-otp";
import { sendOTPAction } from "@/actions/auth/phone/send-otp";
import { signInPhoneAction } from "@/actions/auth/phone/sign-in-phone";
import { formatPhoneNumber, maskPhoneNumber } from "@/utils/phone-utils";
import { PhoneCountryCodeSelector } from "./phone-country-code-selector";

function FormPhoneOtpInner({ callbackUrl = "/" }: { callbackUrl?: string }) {
	const { lng } = useI18n();
	const { t } = useTranslation(lng);
	const isHydrated = useIsHydrated();
	const router = useRouter();

	const [step, setStep] = useState<"phone" | "otp">("phone");
	const [phoneNumber, setPhoneNumber] = useState<string>("");
	const countryCode = "+886"; // Fixed to Taiwan
	const [localPhoneNumber, setLocalPhoneNumber] = useState<string>(""); // Phone number without country code
	const [resendCountdown, setResendCountdown] = useState(0);
	const [isSendingOTP, setIsSendingOTP] = useState(false);
	const [isVerifyingOTP, setIsVerifyingOTP] = useState(false);
	const [isAnimating, setIsAnimating] = useState(false);
	const phoneInputRef = useRef<HTMLInputElement>(null);

	// Phone number form schema (local number without country code)
	// Taiwan mobile numbers: 09XXXXXXXX (10 digits) or 9XXXXXXXX (9 digits, will be normalized to 09XXXXXXXX)
	const phoneFormSchema = z.object({
		phoneNumber: z
			.string()
			.min(1, {
				message: t("phone") + " " + (t("required") || "is required"),
			})
			.regex(/^(09\d{8}|9\d{8})$/, {
				message:
					t("phone") +
					" " +
					(t("phone_must_be_9_or_10_digits_starting_with_9") ||
						"must be 9 or 10 digits starting with 9"),
			})
			.transform((val) => {
				// Normalize 9XXXXXXXX to 09XXXXXXXX
				if (val.startsWith("9") && val.length === 9) {
					return `0${val}`;
				}
				return val;
			}),
	});

	// OTP form schema
	const otpFormSchema = z.object({
		code: z
			.string()
			.length(6, {
				message: t("otp_code_must_be_6_digits") || "OTP code must be 6 digits",
			})
			.regex(/^\d{6}$/, {
				message: t("otp_code_must_be_6_digits") || "OTP code must be 6 digits",
			}),
	});

	const phoneForm = useForm({
		resolver: zodResolver(phoneFormSchema),
		defaultValues: {
			phoneNumber: "",
		},
	});

	const otpForm = useForm({
		resolver: zodResolver(otpFormSchema),
		defaultValues: {
			code: "",
		},
	});

	// Countdown timer for resend OTP
	useEffect(() => {
		if (resendCountdown > 0) {
			const timer = setTimeout(() => {
				setResendCountdown((prev) => prev - 1);
			}, 1000);
			return () => clearTimeout(timer);
		}
	}, [resendCountdown]);

	// Animate countdown display when it changes
	useEffect(() => {
		if (resendCountdown > 0) {
			setIsAnimating(true);
			const timer = setTimeout(() => {
				setIsAnimating(false);
			}, 300); // Animation duration
			return () => clearTimeout(timer);
		}
	}, [resendCountdown]);

	// Auto-focus phone input when page first loads
	useEffect(() => {
		if (step === "phone" && phoneInputRef.current) {
			// Focus phone input after a short delay to ensure it's rendered
			setTimeout(() => {
				phoneInputRef.current?.focus();
			}, 100);
		}
	}, []); // Empty dependency array - only run on mount

	// Auto-focus OTP input when step changes to OTP
	useEffect(() => {
		if (step === "otp") {
			// Focus first OTP input after a short delay
			setTimeout(() => {
				const firstInput = document.querySelector(
					'[data-slot="input-otp-slot"]',
				) as HTMLElement;
				firstInput?.focus();
			}, 100);
		}
	}, [step]);

	async function handleSendOTP(data: z.infer<typeof phoneFormSchema>) {
		setIsSendingOTP(true);
		try {
			//Combine country code with local phone number
			const fullPhoneNumber = `${countryCode}${data.phoneNumber}`;

			const result = await sendOTPAction({ phoneNumber: fullPhoneNumber });

			// Debug: Log the result to see what we're getting
			if (process.env.NODE_ENV === "development") {
				console.log("sendOTPAction result:", result);
				console.log("result type:", typeof result);
				console.log(
					"result keys:",
					result ? Object.keys(result) : "null/undefined",
				);
				console.log("result.serverError:", result?.serverError);
				console.log("result.data:", result?.data);
				console.log("result (stringified):", JSON.stringify(result, null, 2));
			}

			// Handle null/undefined result
			if (!result) {
				clientLogger.error(new Error("Send OTP returned null/undefined"), {
					message: "Send OTP failed - null result",
					metadata: { phoneNumber: maskPhoneNumber(fullPhoneNumber) },
					tags: ["auth", "phone-otp", "error"],
					service: "FormPhoneOtp",
				});
				toastError({
					description: "Failed to send OTP. Please try again later.",
				});
				return;
			}

			// Check for validation errors
			if (result.validationErrors) {
				toastError({
					description: "Invalid input. Please check your phone number.",
				});
				return;
			}

			// Check for server errors - check both top level and inside data
			const serverError =
				result.serverError ||
				result.data?.serverError ||
				(result as any)?.error ||
				(result as any)?.message;
			if (serverError) {
				clientLogger.error(new Error(String(serverError)), {
					message: "Send OTP server error",
					metadata: {
						phoneNumber: maskPhoneNumber(fullPhoneNumber),
						serverError: String(serverError),
						fullResult: JSON.stringify(result),
					},
					tags: ["auth", "phone-otp", "error"],
					service: "FormPhoneOtp",
				});
				toastError({
					description: String(serverError),
				});
				return;
			}

			// Check if result has valid data (success case)
			// Data should exist and not contain serverError
			if (!result.data) {
				// If we get here, something went wrong but no error was returned
				clientLogger.error(
					new Error("Send OTP returned no data and no error"),
					{
						message: "Send OTP failed - no data returned",
						metadata: {
							phoneNumber: maskPhoneNumber(fullPhoneNumber),
							result: JSON.stringify(result),
						},
						tags: ["auth", "phone-otp", "error"],
						service: "FormPhoneOtp",
					},
				);
				toastError({
					description: "Failed to send OTP. Please try again later.",
				});
				return;
			}

			// Check if data contains serverError (error wrapped in data)
			if (result.data.serverError) {
				clientLogger.error(new Error(result.data.serverError), {
					message: "Send OTP server error (in data)",
					metadata: {
						phoneNumber: maskPhoneNumber(fullPhoneNumber),
						serverError: result.data.serverError,
					},
					tags: ["auth", "phone-otp", "error"],
					service: "FormPhoneOtp",
				});
				toastError({
					description: result.data.serverError,
				});
				return;
			}

			// Store full phone number and move to OTP step
			setPhoneNumber(fullPhoneNumber);
			setStep("otp");
			setResendCountdown(15); // 15 second countdown
			toastSuccess({
				description:
					t("otp_sent_successfully") ||
					"OTP code sent successfully. Please check your phone.",
			});
		} catch (error: any) {
			clientLogger.error(error as Error, {
				message: "Send OTP failed",
				metadata: {
					phoneNumber: maskPhoneNumber(`${countryCode}${data.phoneNumber}`),
				},
				tags: ["auth", "phone-otp", "error"],
				service: "FormPhoneOtp",
				environment: process.env.NODE_ENV,
				version: process.env.npm_package_version,
			});
			toastError({
				description:
					error.message || "Failed to send OTP. Please try again later.",
			});
		} finally {
			setIsSendingOTP(false);
		}
	}

	async function handleResendOTP() {
		if (resendCountdown > 0 || !phoneNumber) return;

		setIsSendingOTP(true);
		try {
			const result = await sendOTPAction({ phoneNumber });

			// Check for validation errors
			if (result?.validationErrors) {
				toastError({
					description: "Invalid input. Please check your phone number.",
				});
				return;
			}

			// Check for server errors - check both top level and inside data
			const serverError =
				result?.serverError ||
				result?.data?.serverError ||
				(result as any)?.error;
			if (serverError) {
				toastError({
					description: String(serverError),
				});
				return;
			}

			// Check if result has valid data (success case)
			if (!result?.data) {
				toastError({
					description: "Failed to resend OTP. Please try again later.",
				});
				return;
			}

			// Check if data contains serverError (error wrapped in data)
			if (result.data.serverError) {
				toastError({
					description: result.data.serverError,
				});
				return;
			}

			setResendCountdown(15); // Reset countdown
			otpForm.reset(); // Clear OTP input
			toastSuccess({
				description:
					t("otp_resent_successfully") ||
					"OTP code resent successfully. Please check your phone.",
			});
		} catch (error: any) {
			clientLogger.error(error as Error, {
				message: "Resend OTP failed",
				metadata: { phoneNumber: maskPhoneNumber(phoneNumber) },
				tags: ["auth", "phone-otp", "error"],
				service: "FormPhoneOtp",
				environment: process.env.NODE_ENV,
				version: process.env.npm_package_version,
			});
			toastError({
				description:
					error.message || "Failed to resend OTP. Please try again later.",
			});
		} finally {
			setIsSendingOTP(false);
		}
	}

	async function handleVerifyOTP(data: z.infer<typeof otpFormSchema>) {
		setIsVerifyingOTP(true);
		try {
			const result = await signInPhoneAction({
				phoneNumber,
				code: data.code,
			});

			if (result?.serverError) {
				toastError({
					description: result.serverError,
				});
				return;
			}

			// Track analytics (use email as method since phone is not in the type)
			analytics.trackCustomEvent("login", { method: "phone" });

			// Show success message
			if (result.data && "isNewUser" in result.data && result.data.isNewUser) {
				toastSuccess({
					description:
						t("account_created_and_signed_in") ||
						"Account created and signed in successfully!",
				});
			} else {
				toastSuccess({
					description: t("signed_in_successfully") || "Signed in successfully!",
				});
			}

			// Redirect to callback URL
			router.push(callbackUrl);
			router.refresh();
		} catch (error: any) {
			clientLogger.error(error as Error, {
				message: "Verify OTP failed",
				metadata: { phoneNumber: maskPhoneNumber(phoneNumber) },
				tags: ["auth", "phone-otp", "error"],
				service: "FormPhoneOtp",
				environment: process.env.NODE_ENV,
				version: process.env.npm_package_version,
			});
			toastError({
				description: error.message || "Failed to verify OTP. Please try again.",
			});
		} finally {
			setIsVerifyingOTP(false);
		}
	}

	// Phone number input step
	if (step === "phone") {
		return (
			<Form {...phoneForm}>
				<form
					onSubmit={phoneForm.handleSubmit(handleSendOTP)}
					noValidate={isHydrated}
					className="grid w-full gap-4"
				>
					<FormField
						control={phoneForm.control}
						name="phoneNumber"
						render={({ field }) => (
							<FormItem>
								<FormLabel>
									{t("phone")} <span className="text-destructive">*</span>
								</FormLabel>
								<FormControl>
									<div className="flex gap-2">
										<PhoneCountryCodeSelector
											value={countryCode}
											onValueChange={() => {
												// Disabled - no-op handler
											}}
											disabled={true}
										/>
										<Input
											ref={phoneInputRef}
											type="tel"
											placeholder={
												t("phone_placeholder") || "0912345678 or 912345678"
											}
											disabled={isSendingOTP}
											value={localPhoneNumber}
											maxLength={10}
											onChange={(e) => {
												const cleaned = e.target.value.replace(
													/[\s\-\(\)]/g,
													"",
												);
												// Allow 9 or 10 digits for Taiwan mobile numbers (9XXXXXXXX or 09XXXXXXXX)
												const limited = cleaned.slice(0, 10);
												setLocalPhoneNumber(limited);
												field.onChange(limited);
											}}
											className="flex-1"
										/>
									</div>
								</FormControl>
								<FormDescription className="text-xs font-mono text-gray-500">
									{t("phone_format_instruction") ||
										"Enter your mobile number starting with 9 or 09 (Taiwan +886)"}
								</FormDescription>
								<FormMessage />
							</FormItem>
						)}
					/>

					<Button type="submit" disabled={isSendingOTP} className="w-full">
						{isSendingOTP ? (
							<Loader2 className="animate-spin" />
						) : (
							t("send_otp") || "Send OTP"
						)}
					</Button>
				</form>
			</Form>
		);
	}

	// OTP verification step
	return (
		<div className="grid w-full gap-4">
			<div className="text-center space-y-2">
				<p className="text-sm text-muted-foreground">
					{t("otp_instruction") || "Enter the 6-digit code sent to"}{" "}
					<span className="font-medium">
						{formatPhoneNumber(phoneNumber) || maskPhoneNumber(phoneNumber)}
					</span>
				</p>
			</div>

			<Form {...otpForm}>
				<form
					onSubmit={otpForm.handleSubmit(handleVerifyOTP)}
					noValidate={isHydrated}
					className="grid w-full gap-4"
				>
					<FormField
						control={otpForm.control}
						name="code"
						render={({ field }) => (
							<FormItem>
								<FormLabel className="sr-only">
									{t("otp_code") || "OTP Code"}
								</FormLabel>
								<FormControl>
									<div className="flex justify-center">
										<InputOTP
											maxLength={6}
											value={field.value}
											onChange={field.onChange}
											disabled={isVerifyingOTP}
										>
											<InputOTPGroup>
												<InputOTPSlot index={0} />
												<InputOTPSlot index={1} />
												<InputOTPSlot index={2} />
												<InputOTPSlot index={3} />
												<InputOTPSlot index={4} />
												<InputOTPSlot index={5} />
											</InputOTPGroup>
										</InputOTP>
									</div>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>

					<Button type="submit" disabled={isVerifyingOTP} className="w-full">
						{isVerifyingOTP ? (
							<Loader2 className="animate-spin" />
						) : (
							t("verify_and_sign_in") || "Verify & Sign In"
						)}
					</Button>
				</form>
			</Form>

			<div className="flex flex-row items-center justify-end gap-1">
				<Button
					variant="ghost"
					type="button"
					onClick={handleResendOTP}
					disabled={resendCountdown > 0 || isSendingOTP}
					className="text-xs"
				>
					{resendCountdown > 0
						? (
								t("resend_otp_in", { count: resendCountdown }) ||
								`{{count}} 秒後才能重新發送`
							).replace(/\{\{count\}\}/g, String(resendCountdown))
						: t("resend_otp") || "Resend OTP"}
				</Button>

				<Button
					variant="ghost"
					type="button"
					onClick={() => {
						setStep("phone");
						setPhoneNumber("");
						setLocalPhoneNumber("");
						phoneForm.reset();
						otpForm.reset();
						setResendCountdown(0);
					}}
					disabled={resendCountdown > 0 || isSendingOTP}
					className="text-xs"
				>
					{t("change_phone_number") || "Change Phone Number"}
				</Button>
			</div>
		</div>
	);
}

export default function FormPhoneOtp({
	callbackUrl = "/",
}: {
	callbackUrl?: string;
}) {
	return <FormPhoneOtpInner callbackUrl={callbackUrl} />;
}
