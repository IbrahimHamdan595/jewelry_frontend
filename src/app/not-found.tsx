"use client";
/**
 * Unknown URL. Rendered inside the root layout only (not the admin/POS shells),
 * so it links to both entry points; middleware will bounce a cashier who picks
 * the dashboard back to /pos.
 */
import { SearchX } from "lucide-react";
import { useLang } from "@/context/LanguageContext";

export default function NotFound() {
  const { t } = useLang();
  const linkClass =
    "inline-flex items-center rounded border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50";
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-admin-canvas p-8 text-center text-gray-800">
      <SearchX className="w-8 h-8 text-gray-300" />
      <h1 className="font-serif text-2xl tracking-widest">{t.errors.notFoundTitle}</h1>
      <p className="max-w-md text-sm text-gray-500">{t.errors.notFoundHint}</p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <a href="/pos" className={linkClass}>{t.errors.goToPos}</a>
        <a href="/admin/dashboard" className={linkClass}>{t.errors.goToDashboard}</a>
      </div>
    </div>
  );
}
