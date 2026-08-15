import type { Metadata, Viewport } from "next";
import { Press_Start_2P, Space_Mono } from "next/font/google";
import { PwaRegister } from "@/components/PwaRegister";
import "./globals.css";

/**
 * Self-hosted at build time and exposed as CSS variables, so the booth never waits on a
 * third-party font request. Components reference these through --font-pixel/--font-body.
 */
const pixelFont = Press_Start_2P({
  weight: "400",
  subsets: ["latin"],
  display: "swap",
  variable: "--font-press-start",
});

const bodyFont = Space_Mono({
  weight: ["400", "700"],
  style: ["normal", "italic"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-space-mono",
});

export const metadata: Metadata = {
  title: "LARP EXO GAME",
  description: "Settle who is LARPing harder. YC Startup Internship Expo.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "LARP EXO" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#0a0a0a",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${pixelFont.variable} ${bodyFont.variable}`}>
      <body>
        <PwaRegister />
        {children}
      </body>
    </html>
  );
}
