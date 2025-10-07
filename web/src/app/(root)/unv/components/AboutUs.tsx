"use client";

import { useTranslation } from "@/app/i18n/client";
import { Button } from "@/components/ui/button";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { clientLogger } from "@/lib/client-logger";
import { cn } from "@/lib/utils";
import { useI18n } from "@/providers/i18n-provider";
import { zodResolver } from "@hookform/resolvers/zod";
import {
	IconBrandDiscordFilled,
	IconBrandFacebookFilled,
	IconBrandInstagramFilled,
} from "@tabler/icons-react";
import {
	GoogleReCaptchaProvider,
	useGoogleReCaptcha,
} from "@wojtekmaj/react-recaptcha-v3";
import axios, { type AxiosError } from "axios";
import { motion } from "framer-motion";
import { useCallback, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { FaLine } from "react-icons/fa";
import { toast } from "sonner";
import * as z from "zod/v4";

// Constants
const SOCIAL_LINKS = {
	discord: "https://discord.gg/zquZfjWq",
	line: "line",
	facebook: "fb",
	instagram: "ig",
} as const;

// Types
interface AboutUsProps {
	className?: string;
}

interface ContactFormData {
	name: string;
	email: string;
	message: string;
}

interface SocialLinkProps {
	url: string;
	children: React.ReactNode;
	className?: string;
}

// Form validation schema
const contactFormSchema = z.object({
	name: z.string().min(1, { message: "姓名為必填項目" }),
	email: z
		.string()
		.min(1, { message: "電子郵件為必填項目" })
		.email({ message: "請輸入有效的電子郵件地址" }),
	message: z.string().min(1, { message: "訊息為必填項目" }),
});

type ContactFormValues = z.infer<typeof contactFormSchema>;

// Memoized social link component
const SocialLink = ({ url, children, className = "" }: SocialLinkProps) => (
	<a
		href={url}
		target="_blank"
		rel="noreferrer"
		className={`hover:text-slate transition-colors duration-200 ${className}`}
		aria-label={`Open ${children} in new tab`}
	>
		{children}
	</a>
);

// Social media link components
const DiscordLink = ({ url }: { url: string }) => (
	<SocialLink url={url}>
		<div className="flex items-center justify-center gap-1">
			<IconBrandDiscordFilled className="size-5 text-[#7289da]" />
			<span>Discord</span>
		</div>
	</SocialLink>
);

const FacebookLink = ({ url }: { url: string }) => (
	<SocialLink
		url={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`}
	>
		<div className="flex items-center justify-center gap-1">
			<IconBrandFacebookFilled className="size-5 text-[#4267B2]" />
			<span>Facebook</span>
		</div>
	</SocialLink>
);

const InstagramLink = ({ url }: { url: string }) => (
	<SocialLink url={url}>
		<div className="flex items-center justify-center gap-1">
			<IconBrandInstagramFilled className="size-5" />
			<span>Instagram</span>
		</div>
	</SocialLink>
);

const LineLink = ({ url }: { url: string }) => (
	<SocialLink url={`https://line.me/R/ti/p/${encodeURIComponent(url)}`}>
		<div className="flex items-center justify-center gap-1">
			<FaLine className="size-5 text-[#06C755]" />
			<span>LINE</span>
		</div>
	</SocialLink>
);

export function AboutUs({ className, ...props }: AboutUsProps) {
	const { lng } = useI18n();
	const { t } = useTranslation(lng);

	return (
		<section
			id="aboutUs"
			className={cn("w-full content-around relative", className)}
			aria-label="About Us and Contact Information"
			{...props}
		>
			<div className="px-2 mx-auto max-w-8xl sm:px-6 md:px-8">
				<h1 className="text-2xl sm:text-xl lg:text-2xl font-extrabold pb-2">
					{t("pstv_contact_form_title")}
				</h1>

				<ContactForm />
			</div>
		</section>
	);
}

// Inner form component that uses ReCAPTCHA v3
const ContactFormInner = () => {
	const [loading, setLoading] = useState(false);
	const [captchaError, setCaptchaError] = useState<string>("");
	const { executeRecaptcha } = useGoogleReCaptcha();
	const { lng } = useI18n();
	const { t } = useTranslation(lng);

	// Check if ReCAPTCHA is ready
	const isRecaptchaReady = !!executeRecaptcha;

	// Memoized form default values
	const defaultValues = useMemo(
		() => ({
			name: "",
			email: "",
			message: "",
		}),
		[],
	);

	const form = useForm<ContactFormValues>({
		resolver: zodResolver(contactFormSchema),
		defaultValues,
		mode: "onChange",
	});

	// Memoized form submission handler
	const onSubmit = useCallback(
		async (data: ContactFormValues) => {
			let captchaToken = "";

			// Try to get ReCAPTCHA token if available
			if (executeRecaptcha) {
				try {
					const token = await executeRecaptcha("contact_form");
					if (!token) {
						setCaptchaError("reCAPTCHA verification failed. Please try again.");
						toast.error(t("pstv_contact_form_captcha_error"));
						return;
					}
					captchaToken = token;
				} catch (error) {
					console.warn("ReCAPTCHA execution failed:", error);
					// Continue without captcha token - let server handle it
				}
			}

			try {
				const formData = {
					...data,
					captcha: captchaToken,
				};

				setLoading(true);

				const result = await axios.post(
					`${process.env.NEXT_PUBLIC_API_URL}/common/contact-us-mail`,
					formData,
				);

				if (result.status === 200 && result.data.success) {
					toast.success(t("pstv_contact_form_success"));
					form.reset();
					setCaptchaError("");
				} else {
					toast.error(t("pstv_contact_form_error"));
					clientLogger.error(
						`Contact form submission failed: ${result.status}`,
						{
							metadata: { status: result.status, data: result.data },
							tags: ["onSubmit"],
							service: "ContactForm",
							environment: process.env.NODE_ENV,
							version: process.env.npm_package_version,
						},
					);
				}
			} catch (error: unknown) {
				const err = error as AxiosError;
				clientLogger.error(`Contact form error: ${err.message}`, {
					metadata: {
						name: form.getValues("name"),
						email: form.getValues("email"),
					},
					tags: ["onSubmit"],
					service: "ContactForm",
					environment: process.env.NODE_ENV,
					version: process.env.npm_package_version,
				});
				toast.error(t("pstv_contact_form_error"));
			} finally {
				setLoading(false);
			}
		},
		[executeRecaptcha, form, t],
	);

	// Memoized form field renderer
	const renderFormField = useCallback(
		(
			name: keyof ContactFormValues,
			placeholder: string,
			Component: typeof Input | typeof Textarea,
			props: any = {},
		) => (
			<FormField
				control={form.control}
				name={name}
				render={({ field }) => (
					<FormItem className="p-3">
						<FormControl>
							<Component
								disabled={loading}
								className="placeholder:text-gray-700 rounded-lg 
								outline-none font-mono 
								transition-opacity"
								placeholder={placeholder}
								{...field}
								{...props}
							/>
						</FormControl>
						<FormMessage />
					</FormItem>
				)}
			/>
		),
		[form, loading],
	);

	// Memoized social links
	const socialLinks = useMemo(
		() => [
			{ key: "discord", url: SOCIAL_LINKS.discord, Component: DiscordLink },
			{ key: "line", url: SOCIAL_LINKS.line, Component: LineLink },
			{ key: "facebook", url: SOCIAL_LINKS.facebook, Component: FacebookLink },
			{
				key: "instagram",
				url: SOCIAL_LINKS.instagram,
				Component: InstagramLink,
			},
		],
		[],
	);

	const isFormValid = form.formState.isValid && !loading;

	// Debug logging (uncomment to debug form validation)
	// console.log("Form validation:", {
	// 	isValid: form.formState.isValid,
	// 	executeRecaptcha: !!executeRecaptcha,
	// 	isRecaptchaReady,
	// 	loading,
	// 	isFormValid
	// });
	return (
		<motion.section
			initial="hidden"
			whileInView="show"
			viewport={{ once: true, amount: 0.25 }}
			className="px-1 w-full mx-auto relative z-0"
			aria-label="Contact form and social media links"
		>
			<div className="flex xl:flex-row flex-col-reverse gap-1 overflow-hidden h-screen">
				<motion.div className="flex-1 rounded-2xl">
					{/* Social Media Section 
					{SOCIAL_LINKS.discord && (
						<div className="flex gap-1 py-10 hover:text-slate transition-colors duration-200">
							{t("pstv_contact_form_social")}
						</div>
					)}

					<nav
						className="font-semibold mb-4 flex gap-5 justify-between"
						aria-label="Social media links"
					>
						{
						
						socialLinks.map(
							({ key, url, Component }) =>
								url && (
									<div
										key={key}
										className="hover:text-slate transition-colors duration-200"
									>
										<Component url={url} />
									</div>
								),
						)
						}
					</nav>
*/}

					<div className="flex gap-1 py-1 hover:text-slate transition-colors duration-200">
						{t("pstv_contact_form_description")}
					</div>
					{/* Contact Form */}
					<Form {...form}>
						<form
							onSubmit={form.handleSubmit(onSubmit)}
							className="w-full space-y-1"
							aria-label="Contact form"
						>
							{renderFormField("name", t("pstv_contact_form_name"), Input)}
							{renderFormField("email", t("pstv_contact_form_email"), Input, {
								type: "email",
							})}
							{renderFormField(
								"message",
								t("pstv_contact_form_message"),
								Textarea,
								{
									rows: 7,
									className: "min-h-50",
								},
							)}

							<div className="flex flex-col pl-3">
								<div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mb-2">
									{isRecaptchaReady ? (
										<>
											<span className="text-green-500">✓</span>
											Security verification ready
										</>
									) : (
										<>
											<span className="animate-spin">⟳</span>
											Loading security verification...
										</>
									)}
								</div>
								{captchaError && (
									<span className="text-sm text-red-500 mt-2" role="alert">
										{captchaError}
									</span>
								)}
							</div>

							<Button
								disabled={!isFormValid || !isRecaptchaReady}
								className="w-full 
								disabled:bg-gray-100 disabled:text-gray-100 
								dark:disabled:bg-gray-900 dark:disabled:text-gray-500
								transition-opacity"
								type="submit"
								aria-label="Send message"
							>
								{loading
									? t("pstv_contact_form_sending")
									: !isRecaptchaReady
										? "Loading security verification..."
										: t("pstv_contact_form_send")}
							</Button>
						</form>
					</Form>
				</motion.div>
			</div>
		</motion.section>
	);
};

// Main ContactForm component with ReCAPTCHA v3 provider
export const ContactForm = () => {
	const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA as string;

	if (!siteKey) {
		console.error("NEXT_PUBLIC_RECAPTCHA environment variable is not set");
		return (
			<div className="text-red-500 p-4">
				reCAPTCHA configuration error. Please contact support.
			</div>
		);
	}

	return (
		<GoogleReCaptchaProvider
			reCaptchaKey={siteKey}
			useEnterprise={false}
			useRecaptchaNet={false}
		>
			<ContactFormInner />
		</GoogleReCaptchaProvider>
	);
};
