import type { Metadata } from "next";
import { Inter } from "next/font/google";

import "./globals.css";
import QueryProvider from "./providers/QueryProvider";
import ProgressBarProvider from "./providers/ProgressBarProvider";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Echoes of the Stars - 星际回响",
  description: "A global music co-creation platform",
  icons: {
    icon: "/logo.webp",
    shortcut: "/logo.webp",
    apple: "/logo.webp",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`antialiased font-sans ${inter.variable}`}>
        <QueryProvider>
          <ProgressBarProvider>{children}</ProgressBarProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
