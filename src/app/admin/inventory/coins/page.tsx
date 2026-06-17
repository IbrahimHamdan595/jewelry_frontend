"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
export default function Redirect() {
  const r = useRouter();
  useEffect(() => { r.replace("/admin/products?tab=coins"); }, [r]);
  return null;
}
