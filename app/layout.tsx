import type { Metadata, Viewport } from "next";
// import { Inter } from "next/font/google";

import "./globals.css";
import TrpcProvider from "./_trpc/provider";
import ProgressBarProvider from "./providers/ProgressBarProvider";
import InstallPrompt from "./components/InstallPrompt";

// const inter = Inter({
//   subsets: ["latin"],
//   variable: "--font-inter",
//   display: "swap",
//   preload: true,
//   fallback: ["system-ui", "arial"],
// });

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: "Echoes of the Stars - 星际回响",
  description: "A global music co-creation platform",
  manifest: "/manifest.json",
  icons: {
    icon: "/logo.svg",
    shortcut: "/logo.svg",
    apple: "/logo.svg",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Stars Echoes",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`antialiased font-sans`}>
        <TrpcProvider>
          <ProgressBarProvider>
            {children}
            <InstallPrompt />
          </ProgressBarProvider>
        </TrpcProvider>
      </body>
    </html>
  );
}
