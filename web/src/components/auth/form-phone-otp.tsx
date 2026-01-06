"use client";

import { useTranslation } from "@/app/i18n/client";
import { useIsHydrated } from "@/hooks/use-hydrated";
import { analytics } from "@/lib/analytics";
import { authClient } from "@/lib/auth-client";
import { clientLogger } from "@/lib/client-logger";
import { useI18n } from "@/providers/i18n-provider";
import { formatPhoneNumber, maskPhoneNumber } from "@/utils/phone-utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod/v4";
import { toastError, toastSuccess } from "../toaster";
import { Button } from "../ui/button";
import {
	Form,
	FormControl,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "../ui/form";
import { Input } from "../ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "../ui/input-otp";
import { PhoneCountryCodeSelector } from "./phone-country-code-selector";

/**
 * Normalizes phone number format for Taiwan numbers
 * Converts +8860XXXXXXXX to +886XXXXXXXX (removes leading 0 after country code)
 */
function normalizePhoneNumber(phoneNumber: string): string {
	if (phoneNumber.startsWith("+8860")) {
		return "+886" + phoneNumber.slice(5);
	}
	return phoneNumber;
}

function FormPhoneOtpInner({
	callbackUrl = "/",
	onSuccess,
	editMode = false,
}: {
	callbackUrl?: string;
	onSuccess?: () => void;
	editMode?: boolean;
}) {
	const { lng } = useI18n();
	const { t } = useTranslation(lng);
	const isHydrated = useIsHydrated();
	const router = useRouter();

	const [step, setStep] = useState<"phone" | "otp">("phone");
	const [phoneNumber, setPhoneNumber] = useState<string>("");
	const [countryCode, setCountryCode] = useState<string>("+886"); // Default to Taiwan
	const [localPhoneNumber, setLocalPhoneNumber] = useState<string>(""); // Phone number without country code
	const [resendCountdown, setResendCountdown] = useState(0);
	const [isSendingOTP, setIsSendingOTP] = useState(false);
	const [isVerifyingOTP, setIsVerifyingOTP] = useState(false);
	const [isAnimating, setIsAnimating] = useState(false);
	const phoneInputRef = useRef<HTMLInputElement>(null);
	const otpInputRef = useRef<HTMLDivElement>(null);
	const isInitialMountRef = useRef<boolean>(true);

	// Phone number form schema (local number without country code)
	// Taiwan (+886): 09XXXXXXXX (10 digits) or 9XXXXXXXX (9 digits, will be normalized to 09XXXXXXXX)
	// US/Canada (+1): 10 digits (standard North American format)
	const phoneFormSchema = useMemo(
		() =>
			z
				.object({
					phoneNumber: z.string().min(1, {
						message: t("phone") + " " + (t("required") || "is required"),
					}),
				})
				.refine(
					(data) => {
						if (countryCode === "+886") {
							// Taiwan format: 09XXXXXXXX or 9XXXXXXXX
							return /^(09\d{8}|9\d{8})$/.test(data.phoneNumber);
						} else if (countryCode === "+1") {
							// US/Canada format: 10 digits
							return /^\d{10}$/.test(data.phoneNumber);
						}
						return false;
					},
					{
						message:
							countryCode === "+886"
								? t("phone_must_be_9_or_10_digits_starting_with_9") ||
									"must be 9 or 10 digits starting with 9"
								: t("phone_must_be_10_digits") || "must be 10 digits",
						path: ["phoneNumber"],
					},
				)
				.transform((data) => {
					// Normalize Taiwan numbers: 9XXXXXXXX to 09XXXXXXXX
					if (
						countryCode === "+886" &&
						data.phoneNumber.startsWith("9") &&
						data.phoneNumber.length === 9
					) {
						return { phoneNumber: `0${data.phoneNumber}` };
					}
					return data;
				}),
		[countryCode, t],
	);

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

	// Load phone number and country code from localStorage on mount
	useEffect(() => {
		if (typeof window !== "undefined" && isHydrated) {
			const savedCountryCode = localStorage.getItem("phone_country_code");
			const savedPhoneNumber = localStorage.getItem("phone_local_number");

			if (
				savedCountryCode &&
				(savedCountryCode === "+1" || savedCountryCode === "+886")
			) {
				setCountryCode(savedCountryCode);
			}
			if (savedPhoneNumber) {
				setLocalPhoneNumber(savedPhoneNumber);
				phoneForm.setValue("phoneNumber", savedPhoneNumber);
			}
		}
	}, [isHydrated, phoneForm]);

	// Save country code to localStorage when it changes
	useEffect(() => {
		if (typeof window !== "undefined" && isHydrated) {
			localStorage.setItem("phone_country_code", countryCode);
		}
	}, [countryCode, isHydrated]);

	// Save local phone number to localStorage when it changes
	useEffect(() => {
		if (typeof window !== "undefined" && isHydrated && localPhoneNumber) {
			localStorage.setItem("phone_local_number", localPhoneNumber);
		}
	}, [localPhoneNumber, isHydrated]);

	// Reset form when country code changes (but not on initial mount)
	useEffect(() => {
		if (!isInitialMountRef.current) {
			phoneForm.reset({ phoneNumber: "" });
			setLocalPhoneNumber("");
			// Clear phone number from localStorage when country changes
			if (typeof window !== "undefined") {
				localStorage.removeItem("phone_local_number");
			}
		}
	}, [countryCode, phoneForm]);

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
			// Focus first OTP input after a short delay to ensure it's rendered
			setTimeout(() => {
				// Try to focus the first OTP slot
				const firstInput = otpInputRef.current?.querySelector(
					'[data-slot="input-otp-slot"]',
				) as HTMLElement;
				if (firstInput) {
					// Click and focus the first slot to activate OTP input
					firstInput.click();
					firstInput.focus();
				} else {
					// Fallback: try to find any OTP slot in the document
					const fallbackInput = document.querySelector(
						'[data-slot="input-otp-slot"]',
					) as HTMLElement;
					if (fallbackInput) {
						fallbackInput.click();
						fallbackInput.focus();
					}
				}
			}, 150);
		}
	}, [step]);

	async function handleSendOTP(data: z.infer<typeof phoneFormSchema>) {
		setIsSendingOTP(true);
		// For Taiwan (+886), strip leading "0" if present (e.g., 0912345678 -> 912345678)
		let phoneNumberToUse = data.phoneNumber;
		if (countryCode === "+886" && phoneNumberToUse.startsWith("0")) {
			phoneNumberToUse = phoneNumberToUse.slice(1);
		}
		let fullPhoneNumber = `${countryCode}${phoneNumberToUse}`;

		// Normalize phone number format (ensures +8860XXXXXXXX becomes +886XXXXXXXX)
		fullPhoneNumber = normalizePhoneNumber(fullPhoneNumber);

		// Log the phone number format being sent to Better Auth (unmasked in development for debugging)
		clientLogger.info("Sending OTP - phone number format", {
			metadata: {
				phoneNumber:
					process.env.NODE_ENV === "development"
						? fullPhoneNumber
						: maskPhoneNumber(fullPhoneNumber),
				countryCode,
				localNumber: data.phoneNumber,
			},
			tags: ["phone-auth", "otp-send"],
		});

		const { data: sendOtpData, error: sendOtpError } =
			await authClient.phoneNumber.sendOtp({
				phoneNumber: fullPhoneNumber, // required - normalized format
			});

		if (sendOtpData?.message) {
			// Store normalized phone number and move to OTP step
			setPhoneNumber(fullPhoneNumber); // Already normalized
			setStep("otp");
			setResendCountdown(45); // 45 second countdown

			// Log successful OTP send with phone number format
			clientLogger.info("OTP sent successfully - stored phone number format", {
				metadata: {
					phoneNumber:
						process.env.NODE_ENV === "development"
							? fullPhoneNumber
							: maskPhoneNumber(fullPhoneNumber),
					message: sendOtpData.message,
				},
				tags: ["phone-auth", "otp-send"],
			});

			toastSuccess({
				description:
					t("otp_sent_successfully") ||
					"OTP code sent successfully. Please check your phone.",
			});
		} else {
			toastError({
				description:
					sendOtpError?.message ||
					"Failed to send OTP. Please try again later.",
			});
		}

		setIsSendingOTP(false);
		return;
	}

	async function handleResendOTP() {
		if (resendCountdown > 0 || !phoneNumber) return;

		setIsSendingOTP(true);
		try {
			// Normalize phone number to ensure consistency
			const normalizedPhone = normalizePhoneNumber(phoneNumber);
			const { data: sendOtpData, error: sendOtpError } =
				await authClient.phoneNumber.sendOtp({
					phoneNumber: normalizedPhone,
				});

			if (sendOtpData?.message) {
				setResendCountdown(45); // Reset countdown
				otpForm.reset(); // Clear OTP input
				toastSuccess({
					description:
						t("otp_resent_successfully") ||
						"OTP code resent successfully. Please check your phone.",
				});
			} else {
				toastError({
					description:
						sendOtpError?.message ||
						"Failed to resend OTP. Please try again later.",
				});
			}
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
			// Use the exact phone number that was used when sending OTP
			// phoneNumber state is already normalized from handleSendOTP
			// Use it directly to ensure exact match with what Better Auth stored
			// Only normalize if somehow the state has an unnormalized value (safety check)
			const phoneToVerify = phoneNumber.startsWith("+8860")
				? normalizePhoneNumber(phoneNumber)
				: phoneNumber;

			// Log the phone number format being used for verification (unmasked in development for debugging)
			clientLogger.info("OTP verification attempt", {
				metadata: {
					phoneNumber:
						process.env.NODE_ENV === "development"
							? phoneToVerify
							: maskPhoneNumber(phoneToVerify),
					originalPhoneNumber:
						process.env.NODE_ENV === "development"
							? phoneNumber
							: maskPhoneNumber(phoneNumber),
					codeLength: data.code.length,
					code: process.env.NODE_ENV === "development" ? data.code : "******",
					editMode,
					phoneNumbersMatch: phoneToVerify === phoneNumber,
					wasNormalized: phoneToVerify !== phoneNumber,
				},
				tags: ["phone-auth", "otp-verification"],
			});

			// Use Better Auth client to verify OTP
			const isVerified = await authClient.phoneNumber.verify({
				phoneNumber: phoneToVerify,
				code: data.code,
				// Update phone number only if in edit mode.
				// otherwise this will create a new user if phone number is not found
				updatePhoneNumber: editMode,
				// Disable session creation only if in edit mode (user is already logged in)
				// For sign-in/sign-up (editMode = false), we want to create a session
				disableSession: editMode,
			});

			clientLogger.info("OTP verification result", {
				metadata: {
					phoneNumber:
						process.env.NODE_ENV === "development"
							? phoneToVerify
							: maskPhoneNumber(phoneToVerify),
					isVerified: isVerified.data?.status,
					hasError: !!isVerified.error,
					errorMessage: isVerified.error?.message,
					errorCode: isVerified.error?.code,
					fullError: JSON.stringify(isVerified.error),
				},
				tags: ["phone-auth", "otp-verification"],
			});

			if (isVerified.error) {
				clientLogger.error(
					new Error(isVerified.error.message || "OTP verification failed"),
					{
						metadata: {
							phoneNumber:
								process.env.NODE_ENV === "development"
									? phoneToVerify
									: maskPhoneNumber(phoneToVerify),
							originalPhoneNumber:
								process.env.NODE_ENV === "development"
									? phoneNumber
									: maskPhoneNumber(phoneNumber),
							error: isVerified.error,
							errorCode: isVerified.error?.code,
							codeLength: data.code.length,
							fullError: JSON.stringify(isVerified.error),
						},
						tags: ["phone-auth", "otp-verification", "error"],
					},
				);
				toastError({
					description:
						isVerified.error.message ||
						t("otp_verification_failed") ||
						"OTP verification failed. Please try again.",
				});
				return;
			}

			// If no error, verification was successful
			// Better Auth client returns { data, error } structure
			// If error is null/undefined, verification succeeded

			// Check to see if session exists on client side
			// Wait a bit for session to be created (Better Auth might need a moment)
			let session = null;
			let sessionError = null;

			// Try to get session with retries
			for (let attempt = 0; attempt < 3; attempt++) {
				const sessionResult = await authClient.getSession();
				session = sessionResult.data;
				sessionError = sessionResult.error;

				if (session?.user) {
					break;
				}

				// Wait before retry (except on last attempt)
				if (attempt < 2) {
					await new Promise((resolve) => setTimeout(resolve, 500));
				}
			}

			clientLogger.info("Session check after OTP verification", {
				metadata: {
					phoneNumber:
						process.env.NODE_ENV === "development"
							? phoneToVerify
							: maskPhoneNumber(phoneToVerify),
					hasSession: !!session?.user,
					hasSessionError: !!sessionError,
					sessionError: sessionError?.message,
					userId: session?.user?.id,
					editMode,
					disableSession: !editMode,
				},
				tags: ["phone-auth", "otp-verification", "session"],
			});

			if (!session?.user) {
				clientLogger.error(
					new Error("Failed to create session after OTP verification"),
					{
						metadata: {
							phoneNumber:
								process.env.NODE_ENV === "development"
									? phoneToVerify
									: maskPhoneNumber(phoneToVerify),
							sessionError: sessionError?.message,
							editMode,
							disableSession: !editMode,
						},
						tags: ["phone-auth", "otp-verification", "error"],
					},
				);
				toastError({
					description:
						t("session_creation_failed") ||
						"Failed to create session. Please try again.",
				});
				return;
			}

			// Log phone authentication events
			if (editMode) {
				// Log phone number update
				clientLogger.info("Phone number update - succeeded", {
					metadata: {
						phoneNumber: maskPhoneNumber(phoneNumber),
						userId: session.user.id,
						status: "success",
					},
					tags: ["phone-auth", "phone-update"],
					userId: session.user.id,
				});
			} else {
				// Determine if this is a new user sign-up or existing user sign-in
				// We can't easily determine this from client-side, so we'll log as sign-in
				// Better Auth handles user creation internally, and we log it server-side
				clientLogger.info("Sign in with phone number - succeeded", {
					metadata: {
						phoneNumber: maskPhoneNumber(phoneNumber),
						userId: session.user.id,
						status: "success",
					},
					tags: ["phone-auth", "sign-in"],
					userId: session.user.id,
				});

				// Track analytics for sign-in
				analytics.trackCustomEvent("login", { method: "phone" });
			}

			// Reset form and state after successful verification
			otpForm.reset();
			setIsVerifyingOTP(false);

			// If onSuccess callback is provided, call it instead of redirecting
			if (onSuccess) {
				onSuccess();
				return;
			}

			// Show success message
			toastSuccess({
				description: t("signed_in_successfully") || "Signed in successfully!",
			});

			// Redirect to callback URL
			router.push(callbackUrl);
			router.refresh();
		} catch (error: any) {
			const phoneToVerify = phoneNumber.startsWith("+8860")
				? normalizePhoneNumber(phoneNumber)
				: phoneNumber;
			const errorMessage =
				error?.message || error?.toString() || "Unknown error";
			const errorResponse = error?.response || error?.data || error;

			clientLogger.error(error as Error, {
				message: "Verify OTP failed",
				metadata: {
					phoneNumber:
						process.env.NODE_ENV === "development"
							? phoneToVerify
							: maskPhoneNumber(phoneToVerify),
					originalPhoneNumber:
						process.env.NODE_ENV === "development"
							? phoneNumber
							: maskPhoneNumber(phoneNumber),
					editMode,
					errorMessage,
					errorResponse:
						typeof errorResponse === "object"
							? JSON.stringify(errorResponse)
							: String(errorResponse),
					errorStatus: error?.status || error?.statusCode,
					errorCode: error?.code,
				},
				tags: ["auth", "phone-otp", "error"],
				service: "FormPhoneOtp",
				environment: process.env.NODE_ENV,
				version: process.env.npm_package_version,
			});

			toastError({
				description:
					errorMessage ||
					t("otp_verification_failed") ||
					"Failed to verify OTP. Please try again.",
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
					onSubmit={(e) => {
						e.stopPropagation();
						phoneForm.handleSubmit(handleSendOTP)(e);
					}}
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
											onValueChange={(newCode) => {
												setCountryCode(newCode);
												// Clear phone number when country changes
												setLocalPhoneNumber("");
												field.onChange("");
											}}
											disabled={isSendingOTP}
											allowedCodes={["+1", "+886"]}
										/>
										<Input
											ref={phoneInputRef}
											type="tel"
											placeholder={
												countryCode === "+886"
													? t("phone_placeholder") ||
														"0917-321-893 or 912345678"
													: t("phone_placeholder_us") || "4155551212"
											}
											disabled={isSendingOTP}
											value={localPhoneNumber}
											maxLength={countryCode === "+886" ? 10 : 10}
											onChange={(e) => {
												// Strip all non-numeric characters (allow only digits)
												const cleaned = e.target.value.replace(/\D/g, "");
												// Allow 10 digits for both +1 and +886 (Taiwan can be 9 or 10)
												const maxLen = countryCode === "+886" ? 10 : 10;
												const limited = cleaned.slice(0, maxLen);
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
							t("otp_send_otp") || "Send OTP"
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
					onSubmit={(e) => {
						e.stopPropagation();
						otpForm.handleSubmit(handleVerifyOTP)(e);
					}}
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
									<div ref={otpInputRef} className="flex justify-center">
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
							t("otp_verify_and_sign_in") || "Verify & Sign In"
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
								t("otp_resend_otp_in", { count: resendCountdown }) ||
								`{{count}} 秒後才能重新發送`
							).replace(/\{\{count\}\}/g, String(resendCountdown))
						: t("otp_resend_otp") || "Resend OTP"}
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

// for user to sign in with phone number using OTP method
// or for user to update phone number on it's own profile
//
export default function FormPhoneOtp({
	callbackUrl = "/",
	onSuccess,
	editMode = false,
}: {
	callbackUrl?: string;
	onSuccess?: () => void;
	editMode?: boolean;
}) {
	return (
		<FormPhoneOtpInner
			callbackUrl={callbackUrl}
			onSuccess={onSuccess}
			editMode={editMode}
		/>
	);
}
