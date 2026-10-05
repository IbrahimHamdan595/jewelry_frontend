"use client";
import { useEffect, useId, useRef } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLang } from "@/context/LanguageContext";

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

/**
 * A modal dialog: role="dialog" + aria-modal, named by its title. Focus moves
 * into it when it opens and goes back to whatever opened it when it closes.
 * It closes three ways — the X button, Escape, and a click on the backdrop.
 */
export function Dialog({ open, onClose, title, children, className }: DialogProps) {
  const { t } = useLang();
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const panel = panelRef.current;
    // A child that focused itself (an autofocused field) keeps the focus.
    if (panel && !panel.contains(document.activeElement)) panel.focus();
    return () => opener?.focus();
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* The backdrop is not a control: it only catches clicks that land
          outside the dialog. Escape and the close button are the keyboard path. */}
      <div role="presentation" className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        // Focusable from script only, so the dialog itself can take focus; no
        // ring, because nothing about its look changes when it does.
        tabIndex={-1}
        className={cn("relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6 focus:outline-none", className)}
      >
        {title && (
          <div className="flex items-center justify-between mb-5">
            <h2 id={titleId} className="text-base font-semibold text-gray-800">{title}</h2>
            <button onClick={onClose} aria-label={t.common.close} className="text-gray-400 hover:text-gray-600 transition-colors">
              <X className="w-4 h-4" aria-hidden />
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
