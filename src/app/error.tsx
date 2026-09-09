"use client";
/**
 * Root boundary: catches whatever the /pos and /admin boundaries do not —
 * chiefly errors thrown by those segments' own layouts, and anything on the
 * login route. Renders inside the root layout, so LanguageProvider is present.
 */
import { ErrorScreen } from "@/components/shared/ErrorScreen";
import { useLang } from "@/context/LanguageContext";

export default function RootError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { t } = useLang();
  return (
    <div className="min-h-screen flex bg-admin-canvas">
      <ErrorScreen error={error} reset={reset} variant="light" home={{ href: "/login", label: t.errors.goToLogin }} />
    </div>
  );
}
