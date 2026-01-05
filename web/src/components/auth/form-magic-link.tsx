"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { BetterFetchOption } from "better-auth/react";
import { Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod/v4";
import { useTranslation } from "@/app/i18n/client";
import { useIsHydrated } from "@/hooks/use-hydrated";
import { useRecaptcha } from "@/hooks/use-recaptcha";
import { analytics } from "@/lib/analytics";
import { authClient } from "@/lib/auth-client";
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
} from "../ui/form";
import { Input } from "../ui/input";

function FormMagicLinkInner({ callbackUrl = "/" }: { callbackUrl?: string }) {
	const { lng } = useI18n();
	const { t } = useTranslation(lng);
	const isHydrated = useIsHydrated();
	const { executeRecaptcha } = useRecaptcha(true);

	const formSchema = z.object({
		email: z
			.string()
			.min(1, {
				message: `${t("email")} ${t("email_required")}`,
			})
			.email({
				message: `${t("email")} ${t("email_is_invalid")}`,
			}),
	});

	const form = useForm({
		resolver: zodResolver(formSchema),
		defaultValues: {
			email: "",
		},
	});

	const [isSubmitting, setIsSubmitting] = useState(false);
	const [resendCountdown, setResendCountdown] = useState(0);
	const [isAnimating, setIsAnimating] = useState(false);
	const lastEmailSentRef = useRef<string>("");

	// Countdown timer for resend magic link
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

	// Load countdown from localStorage on mount
	useEffect(() => {
		if (typeof window !== "undefined" && isHydrated) {
			const savedEmail = localStorage.getItem("magic_link_last_email");
			const savedTimestamp = localStorage.getItem("magic_link_last_sent");
			const savedCountdown = localStorage.getItem("magic_link_countdown");

			if (savedEmail && savedTimestamp && savedCountdown) {
				const timestamp = parseInt(savedCountdown, 10);
				const now = Math.floor(Date.now() / 1000);
				const remaining = Math.max(0, timestamp - now);

				if (remaining > 0) {
					setResendCountdown(remaining);
					lastEmailSentRef.current = savedEmail;
					form.setValue("email", savedEmail);
				} else {
					// Clean up expired entries
					localStorage.removeItem("magic_link_last_email");
					localStorage.removeItem("magic_link_last_sent");
					localStorage.removeItem("magic_link_countdown");
				}
			}
		}
	}, [isHydrated, form]);

	useEffect(() => {
		setIsSubmitting?.(form.formState.isSubmitting);
	}, [form.formState.isSubmitting]);

	async function sendMagicLink({ email }: z.infer<typeof formSchema>) {
		try {
			// Check if we're still in countdown period
			if (
				resendCountdown > 0 &&
				lastEmailSentRef.current === email.toLowerCase()
			) {
				toastError({
					description: t("magic_link_resend_wait", {
						count: resendCountdown,
						defaultValue: `Please wait ${resendCountdown} seconds before requesting another magic link.`,
					}).replace(/\{\{count\}\}/g, String(resendCountdown)),
				});
				return;
			}

			// Check client-side rate limiting using localStorage
			if (typeof window !== "undefined") {
				const emailKey = `magic_link_rate_limit:${email.toLowerCase()}`;
				const rateLimitData = localStorage.getItem(emailKey);
				const now = Date.now();

				if (rateLimitData) {
					const { count, firstRequest } = JSON.parse(rateLimitData);
					const timeSinceFirstRequest = now - firstRequest;

					// Rate limits: 3 requests per 15 minutes, 5 per hour, 10 per day
					const windows = [
						{ duration: 15 * 60 * 1000, max: 3 }, // 15 minutes
						{ duration: 60 * 60 * 1000, max: 5 }, // 1 hour
						{ duration: 24 * 60 * 60 * 1000, max: 10 }, // 24 hours
					];

					for (const window of windows) {
						if (
							timeSinceFirstRequest < window.duration &&
							count >= window.max
						) {
							const retryAfter = Math.ceil(
								(window.duration - timeSinceFirstRequest) / 1000,
							);
							toastError({
								description: t("magic_link_rate_limit_exceeded", {
									retryAfter,
									defaultValue: `Too many requests. Please try again in ${retryAfter} seconds.`,
								}).replace(/\{\{retryAfter\}\}/g, String(retryAfter)),
							});
							return;
						}
					}

					// Update rate limit count
					localStorage.setItem(
						emailKey,
						JSON.stringify({
							count: count + 1,
							firstRequest,
							lastRequest: now,
						}),
					);
				} else {
					// First request for this email
					localStorage.setItem(
						emailKey,
						JSON.stringify({
							count: 1,
							firstRequest: now,
							lastRequest: now,
						}),
					);
				}

				// Clean up old rate limit entries (older than 24 hours)
				const allKeys = Object.keys(localStorage);
				for (const key of allKeys) {
					if (key.startsWith("magic_link_rate_limit:")) {
						const data = localStorage.getItem(key);
						if (data) {
							const { lastRequest } = JSON.parse(data);
							if (now - lastRequest > 24 * 60 * 60 * 1000) {
								localStorage.removeItem(key);
							}
						}
					}
				}
			}

			// Execute reCAPTCHA before submission
			if (!executeRecaptcha) {
				toastError({
					description: "reCAPTCHA not ready. Please try again.",
				});
				return;
			}

			// Get reCAPTCHA token
			const recaptchaToken = await executeRecaptcha("magic_link_signin");

			if (!recaptchaToken) {
				toastError({
					description: "reCAPTCHA verification failed. Please try again.",
				});
				return;
			}

			const fetchOptions: BetterFetchOption = {
				throw: true,
				headers: {
					"X-Recaptcha-Token": recaptchaToken,
				},
			};

			const { error } = await authClient.signIn.magicLink({
				email,
				callbackURL: callbackUrl,
				newUserCallbackURL: callbackUrl,
				fetchOptions,
			});

			if (error) {
				toastError({
					description:
						error.message || "Failed to send magic link. Please try again.",
				});
				return;
			}

			analytics.trackLogin("email");

			// Set countdown and save to localStorage
			setResendCountdown(45);
			lastEmailSentRef.current = email.toLowerCase();

			if (typeof window !== "undefined") {
				const now = Math.floor(Date.now() / 1000);
				localStorage.setItem("magic_link_last_email", email.toLowerCase());
				localStorage.setItem("magic_link_last_sent", now.toString());
				localStorage.setItem("magic_link_countdown", (now + 45).toString());
			}

			toastSuccess({
				description: t("magic_link_email"),
			});
		} catch (error: unknown) {
			clientLogger.error(error as Error, {
				message: "Magic link sign-in failed",
				metadata: { email },
				tags: ["auth", "magic-link", "error"],
				service: "FormMagicLink",
				environment: process.env.NODE_ENV,
				version: process.env.npm_package_version,
			});
			const errorMessage =
				error instanceof Error
					? error.message
					: "Failed to send magic link. Please try again.";
			toastError({ description: errorMessage });
		}
	}

	return (
		<Form {...form}>
			<form
				onSubmit={form.handleSubmit(sendMagicLink)}
				noValidate={isHydrated}
				className="grid w-full gap-1"
			>
				<FormField
					control={form.control}
					name="email"
					render={({ field }) => (
						<FormItem>
							<FormLabel>{t("email")}</FormLabel>
							<FormControl>
								<Input
									type="email"
									placeholder={t("email_placeholder")}
									disabled={isSubmitting}
									{...field}
								/>
							</FormControl>

							<FormMessage />
						</FormItem>
					)}
				/>

				<Button
					type="submit"
					disabled={isSubmitting || resendCountdown > 0}
					className="w-full"
				>
					{isSubmitting ? (
						<Loader2 className="animate-spin" />
					) : resendCountdown > 0 ? (
						t("magic_link_resend_wait", {
							count: resendCountdown,
							defaultValue: `Please wait ${resendCountdown} seconds`,
						}).replace(/\{\{count\}\}/g, String(resendCountdown))
					) : (
						t("sign_in_with_magic_link")
					)}
				</Button>

				{resendCountdown > 0 && (
					<div className="space-y-1">
						<span
							className={`text-xs text-muted-foreground transition-opacity duration-300 ${
								isAnimating ? "opacity-100" : "opacity-70"
							}`}
						>
							{t("magic_link_resend_instruction", {
								count: resendCountdown,
								defaultValue: `You can request another magic link in ${resendCountdown} seconds.`,
							}).replace(/\{\{count\}\}/g, String(resendCountdown))}
						</span>
					</div>
				)}

				<div className="space-y-1">
					<span className="text-xs text-muted-foreground">
						{t("signin_cannot_receive_email")}
					</span>
				</div>
			</form>
		</Form>
	);
}

// Wrapper component with RecaptchaV3 provider
export default function FormMagicLink({
	callbackUrl = "/",
}: {
	callbackUrl?: string;
}) {
	return <FormMagicLinkInner callbackUrl={callbackUrl} />;
}
