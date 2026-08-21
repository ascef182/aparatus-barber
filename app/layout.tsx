import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { NextIntlClientProvider } from "next-intl";
import { getLocale } from "next-intl/server";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import { Toaster } from "./_components/ui/sonner";
import { TooltipProvider } from "./_components/ui/tooltip";
import QueryProvider from "./_providers/query-provider";
import { ThemeProvider } from "./_providers/theme-provider";
import { CookieConsentBanner } from "./_components/cookie-consent-banner";

export const metadata: Metadata = {
  title: "Bladiq — The complete booking platform for local businesses",
  description:
    "White-label online booking, Stripe payments, team management, and German legal compliance — everything a modern local business needs, in one multi-tenant SaaS.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Bladiq",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#57AF78",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  return (
    <html lang={locale} suppressHydrationWarning className="scroll-smooth">
      <body
        className={`${GeistSans.variable} ${GeistMono.variable} antialiased`}
      >
        <NextIntlClientProvider>
          <ThemeProvider>
            <QueryProvider>
              <TooltipProvider>
                {children}
                <Toaster />
                <CookieConsentBanner />
                <Analytics />
              </TooltipProvider>
            </QueryProvider>
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
