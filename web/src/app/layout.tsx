import { GoogleAnalytics } from "@next/third-parties/google";
import { SpeedInsights } from "@vercel/speed-insights/next";
import type { Viewport } from "next";
import { cookies } from "next/headers";
import Script from "next/script";
import { CookiesProvider } from "next-client-cookies/server";
import { ThemeProvider } from "next-themes";
import { Suspense } from "react";
import { cookieName, fallbackLng } from "@/app/i18n/settings";
import { PageViewTracker } from "@/components/analytics/page-view-tracker";
import { IOSVersionCheck } from "@/components/ios-version-check";
import { RecaptchaScript } from "@/components/recaptcha-script";
import { DesignMergeOnLogin } from "@/components/shop/design-merge-on-login";
import { Toaster } from "@/components/toaster";
import { AppCartProvider } from "@/providers/app-cart-provider";
import I18nProvider from "@/providers/i18n-provider";
import { SessionWrapper } from "@/providers/session-provider";
import "./css/globals.css";
import { getT } from "@/app/i18n";

export const viewport: Viewport = {
	width: "device-width",
	initialScale: 1,
	maximumScale: 1,
	userScalable: false,
	// Also supported but less commonly used
	// interactiveWidget: 'resizes-visual',
};

const title = "riben.life";

export async function generateMetadata() {
	const { t } = await getT("tw", "translation");

	return {
		title: t("meta_site_title"),
		/*
		 title: {
		   template: `%s | ${title}`,
		   default: title, // a default is required when creating a template
	   }, */

		keywords: ["", "", ""],
		authors: [{ name: title, url: "https://riben.life" }],
		creator: title,
		publisher: title,

		openGraph: {
			title: title,
			description: "",
			url: "https://riben.life",
			siteName: title,
			type: "website",
		},
		robots: {
			index: false,
			follow: true,
			nocache: true,
			googleBot: {
				index: true,
				follow: false,
				noimageindex: true,
				"max-video-preview": -1,
				"max-image-preview": "large",
				"max-snippet": -1,
			},
		},
		manifest: "/favicons/site.webmanifest",
		applicationName: title,
		/*
	  appleWebApp: {
		title: title,
		capable: true,
		statusBarStyle: 'default',
	  },
	  themeColor: [
		{ media: '(prefers-color-scheme: dark)', color: '#38bdf8' },
		{ media: '(prefers-color-scheme: light)', color: '#f8fafc' },
	  ],
	  */
		icons: {
			icon: "/favicons/favicon-16x16.png",
			shortcut: "/favicons/favicon-32x32.png",
			apple: [
				{ url: "/favicons/apple-touch-icon.png" },
				{
					url: "/favicons/apple-touch-icon.png",
					sizes: "180x180",
					type: "image/png",
				},
			],
			other: {
				rel: "apple-touch-icon-precomposed",
				url: "/favicons/apple-touch-icon.png",
			},
		},
		verification: {
			google: "google",
			yandex: "yandex",
			yahoo: "yahoo",
			other: {
				"google-site-verification": "google-site-verification",
			},
		},
	};
}

export default async function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	const cookieStore = await cookies();
	const langCookie = cookieStore.get(cookieName);
	const htmlLang = langCookie?.value ?? fallbackLng;

	//</RecaptchaProvider>
	return (
		<html
			lang={htmlLang}
			data-scroll-behavior="smooth"
			suppressHydrationWarning
		>
			<head suppressHydrationWarning={true} />
			<body className={"antialiased bg-primary/10"}>
				<a
					href="#main-content"
					className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-[200] focus:rounded-md focus:bg-background focus:px-3 focus:py-2 focus:text-sm focus:shadow-md"
				>
					Skip to main content
				</a>
				<Script
					id="theme-init"
					strategy="beforeInteractive"
					// biome-ignore lint/security/noDangerouslySetInnerHtml: Theme initialization must run before hydration to prevent flash
					dangerouslySetInnerHTML={{
						__html: `
							(function() {
								try {
									var theme = localStorage.getItem('theme');
									var isDark = false;

									if (theme === 'dark') {
										isDark = true;
									} else if (theme === 'light') {
										isDark = false;
									} else if (theme === 'system' || !theme) {
										// Use system preference or default to dark
										isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
									}

									if (isDark) {
										document.documentElement.classList.add('dark');
									} else {
										document.documentElement.classList.remove('dark');
									}
								} catch (e) {}
							})();
						`,
					}}
				/>
				<RecaptchaScript useEnterprise={true} />
				<ThemeProvider
					attribute="class"
					defaultTheme="light"
					enableSystem
					disableTransitionOnChange
				>
					<CookiesProvider>
						<I18nProvider initialLng={htmlLang}>
							<SessionWrapper>
								<DesignMergeOnLogin />
								<AppCartProvider>
									<IOSVersionCheck>
										<Suspense fallback={null}>
											<PageViewTracker />
										</Suspense>
										<div
											id="main-content"
											tabIndex={-1}
											className="outline-none"
										>
											{children}
										</div>
									</IOSVersionCheck>
								</AppCartProvider>
							</SessionWrapper>
						</I18nProvider>
					</CookiesProvider>
				</ThemeProvider>
				<Toaster />
				{process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID && (
					<GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID} />
				)}
				{process.env.NODE_ENV === "production" && <SpeedInsights />}
			</body>
		</html>
	);
}
