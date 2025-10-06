"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { BetterFetchOption } from "better-auth/react";
import { IconLoader2 } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod/v4";
import { useTranslation } from "@/app/i18n/client";
//import { useCaptcha } from "@/hooks/use-captcha";
import { useIsHydrated } from "@/hooks/use-hydrated";
import { authClient } from "@/lib/auth-client";
import { useI18n } from "@/providers/i18n-provider";
import { toastError, toastSuccess } from "../Toaster";
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
import { RecaptchaV3 } from "./recaptcha-v3";
import { clientLogger } from "@/lib/client-logger";
import logger from "@/lib/logger";
import { analytics } from "@/lib/analytics";

export default function FormMagicLink({
	callbackUrl = "/",
}: {
	callbackUrl?: string;
}) {
	const { lng } = useI18n();
	const { t } = useTranslation(lng);
	const isHydrated = useIsHydrated();
	//const { getCaptchaHeaders } = useCaptcha();

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

	useEffect(() => {
		setIsSubmitting?.(form.formState.isSubmitting);
	}, [form.formState.isSubmitting]);

	async function sendMagicLink({ email }: z.infer<typeof formSchema>) {
		try {
			const fetchOptions: BetterFetchOption = {
				throw: true,
			};

			const { data, error } = await authClient.signIn.magicLink({
				email,
				callbackURL: callbackUrl,
				newUserCallbackURL: callbackUrl,
				fetchOptions,
			});

			analytics.trackLogin("email");

			toastSuccess({
				description: t("magic_link_email"),
			});

			form.reset();
		} catch (error: any) {
			clientLogger.error(error as Error, {
				message: "Magic link sign-in failed",
				metadata: { email },
				tags: ["auth", "magic-link", "error"],
				service: "FormMagicLink",
				environment: process.env.NODE_ENV,
				version: process.env.npm_package_version,
			});
			toastError({ description: error.message });
		}
	}

	return (
		<RecaptchaV3 actionName="magic-link">
			<Form {...form}>
				<form
					onSubmit={form.handleSubmit(sendMagicLink)}
					noValidate={isHydrated}
					className="grid w-full gap-6"
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

					<Button type="submit" disabled={isSubmitting} className="w-full">
						{isSubmitting ? (
							<IconLoader2 className="animate-spin" />
						) : (
							t("sign_in_with_magic_link")
						)}
					</Button>
					<span className="text-xs text-gray-500">
						{t("signin_cannot_receive_email")}
					</span>
				</form>
			</Form>
		</RecaptchaV3>
	);
}
