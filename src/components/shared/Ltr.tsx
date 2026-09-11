import type { ReactNode } from "react";

/**
 * A machine identifier inside RTL text: phone numbers, emails, IBANs, order
 * numbers, product codes, or a header like "Order #". The bidi algorithm
 * treats "+", "-" and "#" as neutral, so in an RTL paragraph they drift to
 * the wrong end ("961-00-+ 555555"). <bdi> isolates the run and dir="ltr"
 * fixes its direction; it stays inline, so table cells are unaffected.
 *
 * Wrap only the identifier, not the sentence around it.
 */
export function Ltr({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <bdi dir="ltr" className={className}>
      {children}
    </bdi>
  );
}
