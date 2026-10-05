"use client";
import { Trash2, X } from "lucide-react";
import { useLang } from "@/context/LanguageContext";

interface Props {
  open: boolean;
  title: string;
  busy: boolean;
  error: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDeleteDialog({ open, title, busy, error, onConfirm, onCancel }: Props) {
  const { t } = useLang();
  const d = t.deleteDialog;
  if (!open) return null;
  // The sentence decides where its emphasised word goes; split it there so the
  // word can be styled without fixing its position for every language.
  const [beforeWord, afterWord = ""] = d.irreversible("\u0000").split("\u0000");
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 p-6 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-50 flex items-center justify-center">
              <Trash2 className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <div className="font-semibold text-gray-800 text-sm">{d.title}</div>
              <div className="text-xs text-gray-500 mt-0.5">{title}</div>
            </div>
          </div>
          <button
            onClick={onCancel}
            disabled={busy}
            aria-label={t.common.close}
            className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
          >
            <X className="w-4 h-4" aria-hidden />
          </button>
        </div>

        <p className="text-xs text-gray-500">
          {beforeWord}<span className="font-medium text-red-600">{d.irreversibleWord}</span>{afterWord}
        </p>

        {error && (
          <div className="rounded-md bg-red-50 border border-red-100 px-3 py-2 text-xs text-red-700">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <button
            onClick={onCancel}
            disabled={busy}
            className="px-4 py-2 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            {t.common.cancel}
          </button>
          <button
            onClick={onConfirm}
            disabled={busy}
            className="px-4 py-2 text-sm rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium disabled:opacity-50 transition-colors flex items-center gap-1.5"
          >
            {busy ? d.deleting : d.confirm}
          </button>
        </div>
      </div>
    </div>
  );
}
