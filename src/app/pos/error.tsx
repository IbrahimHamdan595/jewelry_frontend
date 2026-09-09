"use client";
/**
 * POS boundary. Mounted by Next BELOW pos/layout.tsx and ABOVE the page, so
 * CartProvider (which lives in the layout) stays mounted while this shows and
 * across reset() — the half-built sale is still there when the page comes
 * back. See error.test.tsx for the proof.
 */
import { ErrorScreen } from "@/components/shared/ErrorScreen";
import { useLang } from "@/context/LanguageContext";

export default function PosError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { t } = useLang();
  return <ErrorScreen error={error} reset={reset} variant="dark" home={{ href: "/pos", label: t.errors.goToPos }} />;
}
