import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { UpdateBanner } from "@/components/UpdateBanner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Event Calendar",
  description: "Find events from multiple sources and add them to your calendar.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <UpdateBanner />
        {children}
      </body>
    </html>
  );
}
