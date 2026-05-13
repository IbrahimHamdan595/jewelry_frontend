import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MAISON ZAHAB",
  description: "Gold jewellery management system",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
