import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import AuthExpirationGuard from "../components/AuthExpirationGuard";
import Header from "../components/Header";
import Providers from "./providers";
import "./globals.css";
import "./ui.css";
import "./portal.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "EDURA — Их сургуулийн сургалтын систем",
  description: "Их сургуулийн оюутан, хөтөлбөр, хичээл, багшийн нэгдсэн систем.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="mn"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Providers>
          <AuthExpirationGuard />
          <Header />
          {children}
        </Providers>
      </body>
    </html>
  );
}
