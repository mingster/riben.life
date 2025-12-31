"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useEffect, useState, useRef, useMemo } from "react";
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
import { formatPhoneNumber, maskPhoneNumber } from "@/utils/phone-utils";
import { PhoneCountryCodeSelector } from "./phone-country-code-selector";
import { authClient } from "@/lib/auth-client";

function FormPhoneOtpInner({ callbackUrl = "/" }: { callbackUrl?: string }) {
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
		const fullPhoneNumber = `${countryCode}${phoneNumberToUse}`;

		const { data: sendOtpData, error: sendOtpError } =
			await authClient.phoneNumber.sendOtp({
				phoneNumber: fullPhoneNumber, // required
			});

		if (sendOtpData?.message) {
			// Store full phone number and move to OTP step
			setPhoneNumber(fullPhoneNumber);
			setStep("otp");
			setResendCountdown(45); // 45 second countdown

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
			const { data: sendOtpData, error: sendOtpError } =
				await authClient.phoneNumber.sendOtp({
					phoneNumber,
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
			// Use Better Auth client to verify OTP
			const result = await authClient.phoneNumber.verify({
				phoneNumber,
				code: data.code,
			});

			if (result.error) {
				toastError({
					description:
						result.error.message ||
						"OTP verification failed. Please try again.",
				});
				return;
			}

			// Track analytics
			analytics.trackCustomEvent("login", { method: "phone" });

			// check to see if session exists on client side
			const { data: session, error } = await authClient.getSession();

			if (!session?.user) {
				return {
					serverError: "Failed to create session. Please try again.",
				};
			}
			if (session?.user) {
				// Show success message
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
													? t("phone_placeholder") || "0912345678 or 912345678"
													: t("phone_placeholder_us") || "4155551212"
											}
											disabled={isSendingOTP}
											value={localPhoneNumber}
											maxLength={countryCode === "+886" ? 10 : 10}
											onChange={(e) => {
												const cleaned = e.target.value.replace(
													/[\s\-\(\)]/g,
													"",
												);
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
