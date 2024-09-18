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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

  //const session = (await getServerSession(authOptions)) as Session;
  const session = await GetSession() as Session;

  return (
    <SessionWrapper session={session}>
      <html
        lang="en"
        className="dark [--scroll-mt:9.875rem] lg:[--scroll-mt:6.3125rem] [scrollbar-gutter:stable]"
      >
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
