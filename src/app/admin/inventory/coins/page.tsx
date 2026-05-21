"use client";
import { UnitCatalog } from "@/components/admin/UnitCatalog";

export default function CoinsPage() {
  return (
    <UnitCatalog
      resource="coins"
      adjustmentTarget="COIN_STOCK"
      singular="Coin Type"
      plural="Coin Types"
    />
  );
}
