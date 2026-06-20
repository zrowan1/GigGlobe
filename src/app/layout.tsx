import type { Metadata, Viewport } from "next";
import "./globals.css";

import { ThemeProvider } from "@/components/theme-provider";

export const metadata: Metadata = {
  title: "GigGlobe",
  description: "Jouw concertgeschiedenis op de wereldkaart",
  // Makes the app installable on the homescreen (see src/app/manifest.ts).
  manifest: "/manifest.webmanifest",
  // iOS-specific: open in standalone mode with a dark status bar and use our
  // own touch icon instead of a screenshot of the page.
  appleWebApp: {
    capable: true,
    title: "GigGlobe",
    statusBarStyle: "black-translucent",
  },
  icons: {
    apple: "/icons/apple-touch-icon-180.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Color of the browser/OS chrome around the installed app.
  themeColor: "#0a0613",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // suppressHydrationWarning: next-themes sets the `class` on <html> in the
    // browser, which would otherwise trip React's server/client match check.
    <html lang="nl" suppressHydrationWarning>
      <body className="antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
