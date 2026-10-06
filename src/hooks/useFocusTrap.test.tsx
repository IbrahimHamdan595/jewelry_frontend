import { describe, it, expect } from "vitest";
import { useRef, useState } from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { useFocusTrap } from "@/hooks/useFocusTrap";

function Panel({ active = true, empty = false }: { active?: boolean; empty?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useFocusTrap(ref, active);
  return (
    <>
      <button>before</button>
      <div ref={ref} role="dialog" aria-modal="true" aria-label="panel" tabIndex={-1}>
        {!empty && (
          <>
            <button>first</button>
            <input aria-label="middle" />
            <button disabled>disabled</button>
            <input type="hidden" />
            <a href="/admin/orders">orders</a>
            <span tabIndex={-1}>script-only</span>
            <button>last</button>
          </>
        )}
      </div>
      <button>after</button>
    </>
  );
}
function Toggled() {
  const [on, setOn] = useState(true);
  return (
    <>
      <button onClick={() => setOn(false)}>turn off</button>
      <Panel active={on} />
    </>
  );
}

const button = (name: string) => screen.getByRole("button", { name });
/** Press Tab the way a browser reports it. True when the trap took the key (the browser must not also move focus). */
const tab = (shiftKey = false) => !fireEvent.keyDown(document.activeElement ?? document.body, { key: "Tab", shiftKey });

describe("useFocusTrap — Tab stays inside a modal panel", () => {
  it("Tab on the last control wraps to the first", () => {
    render(<Panel />);
    button("last").focus();
    expect(tab()).toBe(true);
    expect(button("first")).toHaveFocus();
  });

  it("Shift+Tab on the first control wraps to the last", () => {
    render(<Panel />);
    button("first").focus();
    expect(tab(true)).toBe(true);
    expect(button("last")).toHaveFocus();
  });

  it("in between, the browser's own Tab order is left alone", () => {
    render(<Panel />);
    screen.getByLabelText("middle").focus();
    expect(tab()).toBe(false);
    expect(tab(true)).toBe(false);
    expect(screen.getByLabelText("middle")).toHaveFocus();
  });

  it("skips what Tab cannot reach: disabled, hidden and script-only (tabindex=-1) elements", () => {
    render(<Panel />);
    screen.getByRole("link", { name: "orders" }).focus();
    expect(tab()).toBe(false); // the next stop is "last", not the script-only span
    button("last").focus();
    tab();
    expect(button("first")).toHaveFocus();
  });

  it("from the panel itself, Tab goes to the first control and Shift+Tab to the last", () => {
    render(<Panel />);
    const panel = screen.getByRole("dialog");
    panel.focus();
    expect(tab()).toBe(true);
    expect(button("first")).toHaveFocus();
    panel.focus();
    expect(tab(true)).toBe(true);
    expect(button("last")).toHaveFocus();
  });

  it("focus that got out — a click on the page behind — is pulled back in on the next Tab", () => {
    render(<Panel />);
    button("after").focus();
    expect(tab()).toBe(true);
    expect(button("first")).toHaveFocus();
    button("before").focus();
    expect(tab(true)).toBe(true);
    expect(button("last")).toHaveFocus();
  });

  it("a panel with nothing to tab to keeps the focus on itself", () => {
    render(<Panel empty />);
    const panel = screen.getByRole("dialog");
    panel.focus();
    expect(tab()).toBe(true);
    expect(panel).toHaveFocus();
  });

  it("other keys are not touched", () => {
    render(<Panel />);
    button("last").focus();
    expect(fireEvent.keyDown(button("last"), { key: "Enter" })).toBe(true);
    expect(fireEvent.keyDown(button("last"), { key: "Escape" })).toBe(true);
    expect(button("last")).toHaveFocus();
  });

  it("does nothing while inactive, and lets go when it is switched off or unmounted", () => {
    const view = render(<Toggled />);
    button("last").focus();
    expect(tab()).toBe(true);
    fireEvent.click(button("turn off"));
    button("last").focus();
    expect(tab()).toBe(false);
    expect(button("last")).toHaveFocus();
    view.unmount();
    expect(fireEvent.keyDown(document.body, { key: "Tab" })).toBe(true);
  });
});
