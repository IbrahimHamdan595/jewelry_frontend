"use client";
import { UnitCatalog } from "@/components/admin/UnitCatalog";

export default function OuncesPage() {
  return (
    <UnitCatalog
      resource="ounces"
      adjustmentTarget="OUNCE_STOCK"
      singular="Ounce Type"
      plural="Ounce Types"
    />
  );
}
