import type { Metadata } from "next";
import { cookies } from "next/headers";
import "./globals.css";
import { LanguageProvider } from "@/context/LanguageContext";
import { LANG_COOKIE, dirFor, parseLang } from "@/lib/lang-cookie";

/**
 * Every route renders per request: the middleware issues a per-request CSP
 * nonce, and Next only tags its inline scripts with it while rendering — a
 * statically cached page would ship without the nonce and be blocked by its
 * own policy. The pages are client components anyway, so the server render
 * is only the shell. Reading the language cookie below also needs a
 * per-request render, so it costs nothing extra.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Fawaz El Namel",
  description: "Gold jewellery management system",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // The saved language is applied on the server, so an Arabic user's first
  // paint is Arabic and right-to-left — no flash, no post-mount mirroring.
  const lang = parseLang(cookies().get(LANG_COOKIE)?.value);
  return (
    <html lang={lang} dir={dirFor(lang)}>
      <body>
        <LanguageProvider initialLang={lang}>{children}</LanguageProvider>
      </body>
    </html>
  );
}
