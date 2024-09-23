import "./css/addon.css";
import "./css/globals.css";

import { env } from "node:process";

import type { Session } from "next-auth";
import { Toaster } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";
import I18nProvider from "@/providers/i18n-provider";
import SessionWrapper from "@/providers/session-provider";
import NextThemeProvider from "@/providers/theme-provider";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { CartProvider } from "@/hooks/use-cart";
import { GetSession } from "@/utils/auth-utils";
import Head from "next/head";
import type { Metadata, ResolvingMetadata } from "next";

const FAVICON_VERSION = 3;

function v(href: string) {
  return `${href}?v=${FAVICON_VERSION}`;
}

export async function generateMetadata(
  parent: ResolvingMetadata,
): Promise<Metadata> {
  return {
    title: "riben.life 利便生活",
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  //const session = (await getServerSession(authOptions)) as Session;
  const session = (await GetSession()) as Session;

  return (
    <SessionWrapper session={session}>
      <html
        lang="en"
        className="dark [--scroll-mt:9.875rem] lg:[--scroll-mt:6.3125rem] [scrollbar-gutter:stable]"
      >
        <Head>
          <link
            rel="apple-touch-icon"
            sizes="180x180"
            href={v("/favicons/apple-touch-icon.png")}
          />
          <link
            rel="icon"
            type="image/png"
            sizes="32x32"
            href={v("/favicons/favicon-32x32.png")}
          />
          <link
            rel="icon"
            type="image/png"
            sizes="16x16"
            href={v("/favicons/favicon-16x16.png")}
          />
          <link rel="manifest" href={v("/favicons/site.webmanifest")} />
          <link
            rel="mask-icon"
            href={v("/favicons/safari-pinned-tab.svg")}
            color="#38bdf8"
          />
          <link rel="shortcut icon" href={v("/favicons/favicon.ico")} />
          <meta
            name="apple-mobile-web-app-title"
            content="riben.life 利便生活"
          />
          <meta name="application-name" content="riben.life 利便生活" />
          <meta name="msapplication-TileColor" content="#006988" />
          <meta
            name="msapplication-config"
            content={v("/favicons/browserconfig.xml")}
          />
          <meta name="theme-color" content="#f8fafc" />
        </Head>

        <body
          className={cn(
            "antialiased text-slate-500 dark:text-slate-400 min-h-screen",
          )}
        >
          <NextThemeProvider attribute="class" defaultTheme="dark" enableSystem>
            <CartProvider>
              <I18nProvider>{children}</I18nProvider>
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
