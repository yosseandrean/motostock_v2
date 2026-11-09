import type { Metadata } from "next";
import type { ReactNode } from "react";
import localFont from "next/font/local";
import "./globals.css";

// Self-hosted Inter (variable, wght 100–900). The `--font-inter` variable is
// wired into the Tailwind `--font-sans` token in globals.css, and Inter's
// `tnum` OpenType feature is enabled app-wide via `font-variant-numeric`.
const inter = localFont({
  src: [
    {
      path: "./fonts/InterVariable.woff2",
      weight: "100 900",
      style: "normal",
    },
    {
      path: "./fonts/InterVariable-Italic.woff2",
      weight: "100 900",
      style: "italic",
    },
  ],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: {
    default: "Motostock",
    template: "%s",
  },
  description: "Inventori dan penjualan motor bekas",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="id" className={inter.variable}>
      <body>{children}</body>
    </html>
  );
}
