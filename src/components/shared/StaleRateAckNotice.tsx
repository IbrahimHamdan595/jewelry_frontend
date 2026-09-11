"use client";
/**
 * The required "I am trading on a stale rate" confirmation.
 *
 * Purely presentational — state lives in useStaleRateGuard. Renders nothing when
 * no acknowledgement is required, so call sites can mount it unconditionally.
 *
 * `action` names what is about to happen ("selling", "buying"), because the risk
 * is not symmetric: buying gold on an old rate is money leaving the till.
 */
import { AlertTriangle } from "lucide-react";
import { useFormat } from "@/hooks/useFormat";

interface Props {
  required: boolean;
  accepted: boolean;
  onChange: (v: boolean) => void;
  fetchedAt?: string;
  action: "selling" | "buying";
}

export function StaleRateAckNotice({
  required, accepted, onChange, fetchedAt, action,
}: Props) {
  const { formatDateTime } = useFormat();
  if (!required || !fetchedAt) return null;

  return (
    <div className="rounded-lg border border-red-500/50 bg-red-500/15 p-3.5 space-y-2.5">
      <div className="flex items-start gap-2.5">
        <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
        <div className="text-xs text-red-200">
          <span className="font-semibold block">The gold rate is out of date.</span>
          It last refreshed at {formatDateTime(fetchedAt)} and the feed has not
          recovered since.{" "}
          {action === "buying"
            ? "You are paying out on this price."
            : "You are charging on this price."}
        </div>
      </div>
      <label className="flex items-center gap-2.5 cursor-pointer text-xs text-red-100">
        <input
          type="checkbox"
          checked={accepted}
          onChange={(e) => onChange(e.target.checked)}
          className="w-4 h-4 accent-red-500 shrink-0"
        />
        I confirm {action} on the rate from {formatDateTime(fetchedAt)}.
      </label>
    </div>
  );
}
