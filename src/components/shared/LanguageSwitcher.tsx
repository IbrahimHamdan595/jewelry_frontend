"use client";
import { useLang } from "@/context/LanguageContext";

interface Props {
  className?: string;
  variant?: "dark" | "light";
}

export function LanguageSwitcher({ className = "", variant = "light" }: Props) {
  const { lang, setLang } = useLang();

  const base =
    "text-xs font-medium px-2.5 py-1 rounded border transition-colors select-none cursor-pointer";
  const styles =
    variant === "dark"
      ? "border-white/20 text-white/60 hover:text-white hover:border-white/40"
      : "border-gray-200 text-gray-500 hover:text-gray-800 hover:border-gray-400";

  return (
    <button
      onClick={() => setLang(lang === "en" ? "ar" : "en")}
      className={`${base} ${styles} ${className}`}
      title={lang === "en" ? "Switch to Arabic" : "التبديل إلى الإنجليزية"}
    >
      {lang === "en" ? "العربية" : "English"}
    </button>
  );
}
