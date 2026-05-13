import { KARAT_LABEL } from "@/lib/utils";
import type { Karat } from "@/types/api";

export function KaratBadge({ karat }: { karat: Karat }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded bg-gold-light text-gold-dark text-[10px] font-bold tracking-wider">
      {KARAT_LABEL[karat] ?? karat}
    </span>
  );
}
