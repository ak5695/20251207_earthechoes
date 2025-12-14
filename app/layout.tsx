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
  viewportFit: "cover",
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

import Script from "next/script";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`antialiased font-sans`}>
        <Script
          id="unregister-sw"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              if (typeof window !== 'undefined' && 'serviceWorker' in navigator && window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
                 // Optional: Only unregister if not on standard web https
              }
              
              // Force unregister service workers if we are in Capacitor (or just always to be safe for now)
              // We can detect Capacitor by user agent or just check if we are not in a standard browser environment
              // But simpler: If we want to kill the SW, just kill it.
              
              if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
                navigator.serviceWorker.getRegistrations().then(function(registrations) {
                  for(let registration of registrations) {
                    // If we are in the mobile app (Capacitor), unregister everything
                    if (window.location.protocol === 'https:' && window.location.hostname === 'localhost') {
                        registration.unregister();
                        console.log('Service Worker unregistered');
                    }
                  }
                });
              }
            `,
          }}
        />
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
