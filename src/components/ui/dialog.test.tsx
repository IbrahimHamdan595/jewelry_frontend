import { describe, it, expect, vi } from "vitest";
import { useEffect, useRef, useState } from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { Dialog } from "@/components/ui/dialog";
import { LanguageProvider } from "@/context/LanguageContext";
import en from "@/i18n/en";
import ar from "@/i18n/ar";

function Harness({ onClose = () => {}, untitled = false }: { onClose?: () => void; untitled?: boolean }) {
  const title = untitled ? undefined : "Refund item";
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)}>open</button>
      <Dialog open={open} onClose={() => { setOpen(false); onClose(); }} title={title}>
        <input aria-label="quantity" />
        <button>Confirm</button>
      </Dialog>
    </>
  );
}
function renderOpen(lang: "en" | "ar" = "en", props: Parameters<typeof Harness>[0] = {}) {
  const view = render(<LanguageProvider initialLang={lang}><Harness {...props} /></LanguageProvider>);
  const opener = screen.getByRole("button", { name: "open" });
  opener.focus();
  fireEvent.click(opener);
  return { ...view, opener };
}

describe("Dialog (NEX-64)", () => {
  it("renders nothing while closed", () => {
    render(<Harness />);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("is a modal dialog named by its title", () => {
    renderOpen();
    const dialog = screen.getByRole("dialog", { name: "Refund item" });
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(screen.getByRole("heading", { name: "Refund item" })).toBeInTheDocument();
  });

  it.each([["en", en.common.close], ["ar", ar.common.close]] as const)("%s: the close button has a name, in the UI language", (lang, name) => {
    const onClose = vi.fn();
    renderOpen(lang, { onClose });
    fireEvent.click(screen.getByRole("button", { name }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("Escape closes it", () => {
    const onClose = vi.fn();
    renderOpen("en", { onClose });
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("a click on the backdrop closes it; a click inside does not", () => {
    const onClose = vi.fn();
    const { container } = renderOpen("en", { onClose });
    fireEvent.click(screen.getByLabelText("quantity"));
    fireEvent.click(screen.getByRole("dialog"));
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.click(container.querySelector(".bg-black\\/50") as HTMLElement);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("the backdrop is not offered as a control: Escape and the close button are the keyboard path", () => {
    const { container } = renderOpen();
    const backdrop = container.querySelector(".bg-black\\/50") as HTMLElement;
    expect(backdrop).toHaveAttribute("role", "presentation");
    expect(backdrop).not.toHaveAttribute("tabindex");
    // Everything a screen reader can operate here is a named control.
    for (const button of screen.getAllByRole("button")) expect(button).toHaveAccessibleName();
  });

  it("takes focus when it opens and gives it back to what opened it", () => {
    const { opener } = renderOpen();
    const dialog = screen.getByRole("dialog");
    expect(dialog.contains(document.activeElement)).toBe(true);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(opener).toHaveFocus();
  });

  // React runs a child's effects before its parent's, and applies autoFocus at
  // commit: by the time the dialog's own effect runs, focus is already inside
  // it. What opened the dialog has to be noted before the content mounts.
  it.each([
    ["an effect", false],
    ["autoFocus", true],
  ])("remembers what opened it even when a field inside focuses itself through %s", (_how, auto) => {
    function SelfFocusing() {
      const ref = useRef<HTMLInputElement>(null);
      useEffect(() => { if (!auto) ref.current?.focus(); }, []);
      // eslint-disable-next-line jsx-a11y/no-autofocus -- the case under test
      return <input ref={ref} aria-label="reason" autoFocus={auto} />;
    }
    function Page() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button onClick={() => setOpen(true)}>refund</button>
          <button>something else</button>
          <Dialog open={open} onClose={() => setOpen(false)} title="Refund item"><SelfFocusing /></Dialog>
        </>
      );
    }
    render(<Page />);
    const opener = screen.getByRole("button", { name: "refund" });
    opener.focus();
    fireEvent.click(opener);
    expect(screen.getByLabelText("reason")).toHaveFocus(); // the field kept the focus it took

    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(opener).toHaveFocus();
  });

  it("a dialog that is open from its first render still gives focus back when it closes", () => {
    function Page() {
      const [show, setShow] = useState(false);
      return (
        <>
          <button onClick={() => setShow(true)}>refund</button>
          {show && <Dialog open onClose={() => setShow(false)} title="Refund item"><button>Confirm</button></Dialog>}
        </>
      );
    }
    render(<Page />);
    const opener = screen.getByRole("button", { name: "refund" });
    opener.focus();
    fireEvent.click(opener);
    expect(screen.getByRole("dialog").contains(document.activeElement)).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: en.common.close }));
    expect(opener).toHaveFocus();
  });

  // aria-modal="true" tells a screen reader the page behind is inert; Tab has to agree.
  it("Tab and Shift+Tab cycle inside the dialog and never reach the page behind", () => {
    renderOpen();
    const close = screen.getByRole("button", { name: en.common.close });
    const confirm = screen.getByRole("button", { name: "Confirm" });
    const press = (shiftKey = false) => !fireEvent.keyDown(document.activeElement ?? document.body, { key: "Tab", shiftKey });

    confirm.focus(); // the last control
    expect(press()).toBe(true);
    expect(close).toHaveFocus(); // the first one
    expect(press(true)).toBe(true);
    expect(confirm).toHaveFocus();

    screen.getByLabelText("quantity").focus(); // in the middle: the browser's own order
    expect(press()).toBe(false);
  });

  it("stops trapping Tab once it is closed", () => {
    const { opener } = renderOpen();
    fireEvent.keyDown(document, { key: "Escape" });
    opener.focus();
    expect(fireEvent.keyDown(opener, { key: "Tab" })).toBe(true); // not prevented
    expect(opener).toHaveFocus();
  });

  it("looks as it did: same backdrop, same panel", () => {
    const { container } = renderOpen();
    expect(container.querySelector(".fixed.inset-0.z-50.flex.items-center.justify-center")).not.toBeNull();
    expect(container.querySelector(".absolute.inset-0.bg-black\\/50")).not.toBeNull();
    for (const cls of ["relative", "bg-white", "rounded-xl", "shadow-xl", "w-full", "max-w-md", "mx-4", "p-6"]) {
      expect(screen.getByRole("dialog")).toHaveClass(cls);
    }
  });

  it("an untitled dialog is still a dialog, with no empty header", () => {
    renderOpen("en", { untitled: true });
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.queryByRole("heading")).toBeNull();
  });
});
