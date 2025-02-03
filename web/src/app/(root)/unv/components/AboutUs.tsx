import { useTranslation } from "@/app/i18n/client";
import { Button } from "@/components/ui/button";
import { slideIn } from "@/lib/motion";
import { useI18n } from "@/providers/i18n-provider";
import { motion } from "framer-motion";
import { FaDiscord, FaFacebook, FaInstagram, FaLine } from "react-icons/fa";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { type RefObject, useRef, useState } from "react";
import { BigText, Caption, IconContainer, Paragraph } from "./common";

import { useToast } from "@/components/ui/use-toast";
import ReCAPTCHA from "react-google-recaptcha";

import axios, { type AxiosError } from "axios";
import Image from "next/image";
import { useForm } from "react-hook-form";
import * as z from "zod";

import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormMessage,
} from "@/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTheme } from "next-themes";

export function AboutUs({ className, ...props }: { className?: string }) {
	const { lng } = useI18n();
	const { t } = useTranslation(lng, "landing");

	return (
		<section id="aboutUs" className="relative min-h-screen w-full">
			{/*background */}
			<div className="absolute top-0 inset-x-0 bg-top bg-no-repeat beams-7 dark:hidden" />
			<Image
				fill={true}
				decoding="async"
				src={require("@/img/beams/overlay.webp").default.src}
				alt=""
				className="absolute z-10 bottom-0 -left-80 w-[45.0625rem] pointer-events-none dark:hidden"
			/>

			<motion.section
				initial="hidden"
				whileInView="show"
				viewport={{ once: true, amount: 0.25 }}
				className="px-1 lg:px-10 w-full py-10"
			>
				<div className="px-4 mx-auto max-w-7xl sm:px-6 md:px-8 overflow-hidden">
					<motion.div
						variants={slideIn("left", "tween", 0.2, 1)}
						className="flex-[0.75] bg-black-100 p-2 rounded-2xl"
					>
						<div className="flex gap-2">
							<IconContainer
								className="dark:bg-sky-500 dark:highlight-white/20"
								light={require("@/img/icons/home/editor-tools.png").default.src}
								dark={
									require("@/img/icons/home/dark/editor-tools.png").default.src
								}
							/>
							<Caption className="text-sky-500">
								{t("landing_contactus")}
							</Caption>
						</div>

						<BigText>World-class system integration.</BigText>
						<Paragraph>
							We are a team of engineers, designers, and developers who love to
							improve things in life.
						</Paragraph>

						<ContactForm />
					</motion.div>
				</div>
			</motion.section>
		</section>
	);
}

/*
import { GoogleReCaptchaProvider } from "react-google-recaptcha-v3";
export default function GoogleCaptchaWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const recaptchaKey: string | undefined = process?.env?.NEXT_PUBLIC_RECAPTCHA;
  return (
    <GoogleReCaptchaProvider
      reCaptchaKey={recaptchaKey ?? "NOT DEFINED"}
      scriptProps={{
        async: false,
        defer: false,
        appendTo: "head",
        nonce: undefined,
      }}
    >
      {children}
    </GoogleReCaptchaProvider>
  );
}
*/

export const ContactForm = () => {
	const [loading, setLoading] = useState(false);
	const { toast } = useToast();

	const { lng } = useI18n();
	const { t } = useTranslation(lng, "landing");

	const [captcha, setCaptcha] = useState<string>("");

	//const recaptcha: RefObject<ReCAPTCHA> = useRef(null);

	const { theme } = useTheme();

	const formSchema = z.object({
		name: z.string().min(1, { message: "name is required" }),
		email: z
			.string()
			.min(1, { message: "email is required" })
			.email({ message: "email is invalid" }),
		message: z.string().min(1, { message: "message is required" }),
	});
	type formValues = z.infer<typeof formSchema>;

	const defaultValues = {
		name: "",
		email: "",
		message: "",
	};

	//console.log(`product basic: ${JSON.stringify(defaultValues)}`);
	const form = useForm<formValues>({
		resolver: zodResolver(formSchema),
		defaultValues,
		mode: "onChange",
	});

	const onSubmit = async (data: formValues) => {
		if (!captcha) {
			alert("Please complete the captcha");

			return;
		}

		const newdata = {
			...data,
			captcha,
		};

		try {
			setLoading(true);
			const result = await axios.post(
				`${process.env.NEXT_PUBLIC_API_URL}/common/contactus-mail`,
				newdata,
			);

			if (result.status === 200) {
				toast({
					title: t("landing_submitMessage"),
					description: "",
					variant: "success",
				});
			} else {
				toast({
					title: "Ahh, something went wrong. Please try again.",
					description: `${result.status} ${result.statusText}`,
					variant: "destructive",
				});

				console.log(JSON.stringify(result));
			}
		} catch (error: unknown) {
			const err = error as AxiosError;
			console.log(err);
			toast({
				title: "Ahh, something went wrong. Please try again.",
				description: "",
				variant: "destructive",
			});
		} finally {
			setLoading(false);
		}
	};
	function captchaChange(value: string | null) {
		if (value) {
			setCaptcha(value);
		}
	}
	const lineId = "line";
	const facebookUrl = "fb";
	const igUrl = "ig";
	const discordUrl = "https://discord.gg/zquZfjWq";

	return (
		<motion.section
			initial="hidden"
			whileInView="show"
			viewport={{ once: true, amount: 0.25 }}
			className="px-1 w-full mx-auto relative z-0"
		>
			<div className="flex xl:flex-row flex-col-reverse gap-1 overflow-hidden">
				<motion.div
					variants={slideIn("left", "tween", 0.2, 1)}
					className="flex-1 rounded-2xl"
				>
					{discordUrl && (
						<div className="flex gap-1 py-10 hover:text-slate">
							請直接在 Discord 討論或詢問：
						</div>
					)}
					<div className="font-semibold mb-4 flex gap-5 justify-between">
						{discordUrl && (
							<div className="hover:text-slate">
								<DiscordLink url={discordUrl} />
							</div>
						)}
						{lineId && (
							<div className="hover:text-slate">
								<LineLink url={lineId} />
							</div>
						)}
						{facebookUrl && (
							<div className="hover:text-slate">
								<FacebookLink url={facebookUrl} />
							</div>
						)}
						{igUrl && (
							<div className="hover:text-slate">
								<InstagramLink url={igUrl} />
							</div>
						)}
					</div>

					<Form {...form}>
						<form
							onSubmit={form.handleSubmit(onSubmit)}
							className="w-full space-y-1"
						>
							<FormField
								control={form.control}
								name="name"
								render={({ field }) => (
									<FormItem className="p-3">
										<FormControl>
											<Input
												disabled={loading || form.formState.isSubmitting}
												className="placeholder:text-gray-700 rounded-lg outline-none font-mono"
												placeholder={t("landing_contactus_form_name")}
												{...field}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
							<FormField
								control={form.control}
								name="email"
								render={({ field }) => (
									<FormItem className="p-3">
										<FormControl>
											<Input
												disabled={loading || form.formState.isSubmitting}
												className="placeholder:text-gray-700 rounded-lg disabled:opacity-25 outline-none font-mono"
												placeholder={t("landing_contactus_form_email")}
												{...field}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
							<FormField
								control={form.control}
								name="message"
								render={({ field }) => (
									<FormItem className="p-3">
										<FormControl>
											<Textarea
												rows={7}
												disabled={loading || form.formState.isSubmitting}
												className="placeholder:text-gray-700 rounded-lg outline-none font-mono min-h-50"
												placeholder={t("landing_contactus_form_msg")}
												{...field}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
							<ReCAPTCHA
								size="normal"
								theme={theme === "dark" ? "dark" : "light"}
								sitekey={`${process.env.NEXT_PUBLIC_RECAPTCHA}`}
								onChange={captchaChange}
								//ref={recaptcha}
								className="mx-auto mt-10"
							/>

							<Button
								disabled={
									loading ||
									!form.formState.isValid ||
									form.formState.isSubmitting
								}
								className="w-full disabled:opacity-25"
								type="submit"
							>
								{loading
									? t("landing_contactus_form_sending")
									: t("landing_contactus_form_sendButton")}
							</Button>
						</form>
					</Form>
				</motion.div>
			</div>
		</motion.section>
	);
};

type Props = {
	url: string;
};

const DiscordLink = ({ url }: Props) => (
	<a href={url} target="_blank" rel="noreferrer">
		<div className="flex items-center justify-center gap-1">
			<FaDiscord className="size-5 text-[#7289da]" />
			Discord
		</div>
	</a>
);

const FacebookLink = ({ url }: Props) => (
	<a
		href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`}
		target="_blank"
		rel="noreferrer"
	>
		<div className="flex items-center justify-center gap-1">
			<FaFacebook className="size-5 text-[#4267B2]" />
			Facebook
		</div>
	</a>
);

const InstagramLink = ({ url }: Props) => (
	<a href={url} target="_blank" rel="noreferrer">
		<div className="flex items-center justify-center gap-1">
			<FaInstagram className="size-5" />
			Instagram
		</div>
	</a>
);

const LineLink = ({ url }: Props) => (
	<a
		href={`https://line.me/R/ti/p/${encodeURIComponent(url)}`}
		target="_blank"
		rel="noreferrer"
	>
		<div className="flex items-center justify-center gap-1">
			<FaLine className="size-5 text-[#06C755]" />
			LINE
		</div>
	</a>
);
