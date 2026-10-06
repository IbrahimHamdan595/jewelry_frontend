import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ConfirmDeleteDialog } from "@/components/admin/ConfirmDeleteDialog";
import { LanguageProvider } from "@/context/LanguageContext";
import en from "@/i18n/en";
import ar from "@/i18n/ar";

function renderDialog(lang: "en" | "ar", props: Partial<Parameters<typeof ConfirmDeleteDialog>[0]> = {}) {
  const onConfirm = vi.fn();
  const onCancel = vi.fn();
  render(
    <LanguageProvider initialLang={lang}>
      <ConfirmDeleteDialog open title="Twisted Ring (RNG-0042)" busy={false} error={null} onConfirm={onConfirm} onCancel={onCancel} {...props} />
    </LanguageProvider>,
  );
  return { onConfirm, onCancel };
}

describe("ConfirmDeleteDialog i18n and labels (NEX-64)", () => {
  it("renders nothing while closed", () => {
    renderDialog("ar", { open: false });
    expect(screen.queryByText(ar.deleteDialog.title)).toBeNull();
  });

  it("is Arabic throughout, with the record's own name left as data", () => {
    renderDialog("ar");
    for (const english of ["Permanently delete?", "irreversible", "Cancel", "Delete permanently"]) {
      expect(screen.queryByText(english), english).toBeNull();
    }
    expect(screen.getByText(ar.deleteDialog.title)).toBeInTheDocument();
    expect(screen.getByText("Twisted Ring (RNG-0042)")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: ar.deleteDialog.confirm })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: ar.common.cancel })).toBeInTheDocument();
  });

  it("keeps the emphasised word styled, wherever the language puts it in the sentence", () => {
    renderDialog("ar");
    const word = screen.getByText(ar.deleteDialog.irreversibleWord);
    expect(word).toHaveClass("text-red-600");
    expect(word.parentElement).toHaveTextContent(ar.deleteDialog.irreversible(ar.deleteDialog.irreversibleWord));
  });

  it("names the icon-only close button, and it still cancels", () => {
    const { onCancel, onConfirm } = renderDialog("ar");
    fireEvent.click(screen.getByRole("button", { name: ar.common.close }));
    expect(onCancel).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: ar.deleteDialog.confirm }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("shows progress in the interface language", () => {
    renderDialog("ar", { busy: true });
    expect(screen.getByRole("button", { name: ar.deleteDialog.deleting })).toBeDisabled();
  });

  it("reads exactly as before in English", () => {
    renderDialog("en");
    expect(screen.getByText("Permanently delete?")).toBeInTheDocument();
    expect(screen.getByText(en.deleteDialog.irreversibleWord).parentElement).toHaveTextContent(
      "This action is irreversible. The record will be permanently removed from the database.",
    );
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete permanently" })).toBeInTheDocument();
  });
});
