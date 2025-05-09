import "./css/globals.css";

import { env } from "node:process";

import { Toaster } from "@/components/ui/toaster";
import { CartProvider } from "@/hooks/use-cart";
import { GetSession } from "@/lib/auth/utils";
import I18nProvider from "@/providers/i18n-provider";
import SessionWrapper from "@/providers/session-provider";
import NextThemeProvider from "@/providers/theme-provider";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import type { Metadata } from "next";
import type { Session } from "next-auth";
import { CookiesProvider } from "next-client-cookies/server";

const title = "riben.life 利便生活";
export const metadata: Metadata = {
	title: {
		template: `%s | ${title}`,
		default: title, // a default is required when creating a template
	},
	keywords: ["掃碼點餐", "線上點餐", "QR code 點餐"],
	authors: [{ name: "利便生活", url: "https://riben.life" }],
	creator: "riben.life",
	publisher: "riben.life",

	openGraph: {
		title: title,
		description:
			"導入線上點餐系統，讓您的銷售流程更順暢。沒有前置費用、 增加營業額、 客戶無需等待、 只需手機或平版電腦，您就可以開始使用系統。",
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

export default async function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	//const session = (await getServerSession(authOptions)) as Session;
	const session = (await GetSession()) as Session;

	return (
		<SessionWrapper session={session}>
			<html className="dark [--scroll-mt:9.875rem] lg:[--scroll-mt:6.3125rem] [scrollbar-gutter:stable]">
				<head>
					<link rel="preconnect" href="https://fonts.googleapis.com" />
					<link
						rel="preconnect"
						href="https://fonts.gstatic.com"
						crossOrigin=""
					/>

					<link
						href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:ital,wght@0,100..700;1,100..700&family=Noto+Sans+TC:wght@100..900&display=swap"
						rel="stylesheet"
					/>
				</head>

				<body className="antialiased text-primary-400 dark:text-primary-400 min-h-screen">
					<NextThemeProvider attribute="class" defaultTheme="dark" enableSystem>
						<CartProvider>
							<CookiesProvider>
								<I18nProvider>{children}</I18nProvider>
							</CookiesProvider>
						</CartProvider>
					</NextThemeProvider>
					<Toaster />
					{env.NODE_ENV === "production" && (
						<>
							<SpeedInsights /> <Analytics />
						</>
					)}
				</body>
			</html>
		</SessionWrapper>
	);
}
