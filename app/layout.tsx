import type React from "react";
import type { Metadata, Viewport } from "next";
import { Playfair_Display, Merriweather } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { Analytics } from "@vercel/analytics/react";
import ServiceWorkerRegistration from "@/components/service-worker-registration";
import PwaInstallPrompt from "@/components/pwa-install-prompt";

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
});

const merriweather = Merriweather({
  weight: ["300", "400", "700", "900"],
  subsets: ["latin"],
  variable: "--font-merriweather",
});

export const metadata: Metadata = {
  title: "Quick Fiji News - News from Multiple Sources",
  description:
    "Stay informed with the latest news from Fiji and around the world",
  applicationName: "Quick Fiji News",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Quick Fiji News",
    statusBarStyle: "default",
  },
  icons: {
    icon: [
      { url: "/favicon-v4.ico", sizes: "32x32" },
      { url: "/icon-192-v4.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [
      {
        url: "/apple-touch-icon-v4.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: "#123943",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head />
      <body
        className={`${playfair.variable} ${merriweather.variable} font-serif`}
      >
        {" "}
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {" "}
          <ServiceWorkerRegistration />
          {children}
          <PwaInstallPrompt />
          <Toaster />
          <Analytics />
        </ThemeProvider>
      </body>
    </html>
  );
}
