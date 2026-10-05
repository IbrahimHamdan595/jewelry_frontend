"use client";
import { useEffect, type RefObject } from "react";

// What Tab can land on. tabindex="-1" is focusable from script only, so it is
// not a stop; a disabled or hidden control is not one either.
const TAB_STOPS = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]",
].join(",");

function tabStops(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(TAB_STOPS)).filter(
    (el) => el.tabIndex >= 0 && !el.hasAttribute("hidden") && el.getAttribute("aria-hidden") !== "true",
  );
}

/**
 * Keeps Tab inside a modal panel. `aria-modal="true"` tells a screen reader
 * that the page behind is inert; without this, Tab walks straight out to it.
 *
 * Tab on the last control wraps to the first and Shift+Tab on the first wraps
 * to the last. Between them the browser's own order is left alone. Focus that
 * has ended up outside the panel (a click on the backdrop) is pulled back in
 * on the next Tab, and a panel with nothing to tab to keeps focus on itself
 * (give it tabIndex={-1}).
 *
 * Only Tab is handled: moving focus in when the dialog opens, giving it back
 * when it closes, and Escape stay with the dialog that uses this.
 */
export function useFocusTrap(panel: RefObject<HTMLElement | null>, active = true) {
  useEffect(() => {
    if (!active) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const container = panel.current;
      if (!container) return;
      const stops = tabStops(container);
      const current = document.activeElement;
      const inside = current instanceof Node && container.contains(current) && current !== container;
      if (stops.length === 0) {
        e.preventDefault();
        container.focus();
        return;
      }
      const first = stops[0];
      const last = stops[stops.length - 1];
      if (e.shiftKey) {
        if (!inside || current === first) {
          e.preventDefault();
          last.focus();
        }
      } else if (!inside || current === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [panel, active]);
}
