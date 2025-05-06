import { Toaster } from "@/components/ui/sonner";
import { GetSession } from "@/lib/auth/utils";
import I18nProvider from "@/providers/i18n-provider";
import SessionWrapper from "@/providers/session-provider";
import NextThemeProvider from "@/providers/theme-provider";
import type { Metadata, Viewport } from "next";
import type { Session } from "next-auth";
import { CookiesProvider } from "next-client-cookies/server";
import { Geist_Mono, Noto_Sans_TC, Poppins } from "next/font/google";
import "./css/globals.css";

const notoSans = Noto_Sans_TC({
	variable: "--font-noto-sans",
	weight: ["600"],
	subsets: ["latin"],
});

const popinsSans = Poppins({
	variable: "--font-popins-sans",
	subsets: ["latin"],
	weight: "400",
});

const geistMono = Geist_Mono({
	variable: "--font-geist-mono",
	subsets: ["latin"],
});

export const viewport: Viewport = {
	width: "device-width",
	initialScale: 1,
	maximumScale: 1,
	userScalable: false,
	// Also supported but less commonly used
	// interactiveWidget: 'resizes-visual',
};

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
	const session = (await GetSession()) as Session;

	return (
		<SessionWrapper session={session}>
			<html lang="en">
				<body
					className={`${popinsSans.variable} ${notoSans.variable} ${geistMono.variable} antialiased dark [--scroll-mt:9.875rem] lg:[--scroll-mt:6.3125rem] [scrollbar-gutter:stable]`}
				>
					<NextThemeProvider
						attribute="class"
						defaultTheme="dark"
						enableSystem
						disableTransitionOnChange
					>
						<CookiesProvider>
							<I18nProvider>{children}</I18nProvider>
						</CookiesProvider>
					</NextThemeProvider>
					<Toaster />
				</body>
			</html>
		</SessionWrapper>
	);
}
