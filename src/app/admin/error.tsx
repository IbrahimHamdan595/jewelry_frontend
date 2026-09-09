"use client";
/** Admin boundary: renders inside the admin shell, so the sidebar stays usable. */
import { ErrorScreen } from "@/components/shared/ErrorScreen";
import { useLang } from "@/context/LanguageContext";

export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { t } = useLang();
  return (
    <ErrorScreen
      error={error}
      reset={reset}
      variant="light"
      home={{ href: "/admin/dashboard", label: t.errors.goToDashboard }}
    />
  );
}
