import { Trash2 } from "lucide-react";
import { KaratBadge } from "@/components/shared/KaratBadge";
import { formatUSD } from "@/lib/utils";
import type { CartItem as CartItemType } from "@/hooks/useCart";

interface Props {
  item: CartItemType;
  onRemove: (id: string) => void;
}

export function CartItem({ item, onRemove }: Props) {
  return (
    <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-lg px-4 py-3 animate-slide-in">
      <KaratBadge karat={item.karat} />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-pos-cream truncate">{item.nameEn}</div>
        <div className="text-xs text-pos-gray mt-0.5">
          {item.code} · {item.weightGrams}g @ ${item.goldRate24k.toFixed(2)}/g
        </div>
      </div>
      <span className="font-semibold text-sm text-pos-cream shrink-0">
        {formatUSD(item.finalPrice)}
      </span>
      <button
        onClick={() => onRemove(item.cartId)}
        className="text-pos-gray hover:text-red-400 transition-colors shrink-0"
        aria-label="Remove item"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}
