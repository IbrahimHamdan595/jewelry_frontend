import type { Metadata } from "next";
import "./globals.css";
import { LanguageProvider } from "@/context/LanguageContext";

/**
 * Every route renders per request: the middleware issues a per-request CSP
 * nonce, and Next only tags its inline scripts with it while rendering — a
 * statically cached page would ship without the nonce and be blocked by its
 * own policy. The pages are client components anyway, so the server render
 * is only the shell.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Fawaz El Namel",
  description: "Gold jewellery management system",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <LanguageProvider>{children}</LanguageProvider>
      </body>
    </html>
  );
}
