export type Karat = "K18" | "K21" | "K24";

export interface Category {
  id: string;
  name_en: string;
  name_ar: string;
  slug: string;
  is_active: boolean;
  created_at: string;
}
export type OrderStatus = "COMPLETED" | "REFUNDED" | "VOIDED";
export type PaymentMethod = "CASH" | "CARD" | "MIXED";
export type Role = "ADMIN" | "CASHIER";

export interface Product {
  id: string;
  code: string;
  name_en: string;
  name_ar: string;
  category: string;
  category_id: string | null;
  karat: Karat;
  weight_grams: number;
  margin_percent: number;
  making_charge: number;
  photos: { url: string; isHero: boolean; order: number }[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProductLookup extends Product {
  gold_rate_24k: number;
  purity_rate: number;
  final_price: number;
}

export interface ProductListResponse {
  items: Product[];
  total: number;
  page: number;
  page_size: number;
}

export interface OrderItem {
  id: string;
  product_id: string;
  product_code: string;
  product_name: string;
  karat: Karat;
  weight_grams: number;
  gold_rate_at_sale: number;
  margin_percent: number;
  making_charge: number;
  final_price: number;
}

export interface Cashier {
  id: string;
  name: string;
  email: string;
}

export interface Order {
  id: string;
  order_number: string;
  status: OrderStatus;
  payment_method: PaymentMethod;
  customer_name: string | null;
  cashier_id: string;
  cashier: Cashier;
  subtotal: number;
  vat_percent: number;
  vat_amount: number;
  total_usd: number;
  total_lbp: number;
  lbp_exchange_rate: number;
  voided_at: string | null;
  voided_by: string | null;
  void_reason: string | null;
  created_at: string;
  items: OrderItem[];
}

export interface OrderSummary {
  id: string;
  order_number: string;
  status: OrderStatus;
  payment_method: PaymentMethod;
  customer_name: string | null;
  cashier: Cashier;
  total_usd: number;
  total_lbp: number;
  item_count: number;
  created_at: string;
}

export interface OrderListResponse {
  items: OrderSummary[];
  total: number;
  total_revenue: number;
  avg_order_value: number;
}

export interface GoldRate {
  rate_24k: number;
  rate_21k: number;
  rate_18k: number;
  source: string;
  fetched_at: string;
  is_stale: boolean;
}

export interface GoldRateHistoryPoint {
  rate_24k: number;
  fetched_at: string;
}

export interface Settings {
  id: string;
  store_name: string;
  store_name_ar: string | null;
  logo_url: string | null;
  address: string;
  phone: string;
  vat_number: string | null;
  default_margin_pct: number;
  default_making_charge: number;
  markup_k18: number;
  markup_k21: number;
  markup_k24: number;
  vat_percent: number;
  lbp_exchange_rate: number;
  receipt_footer: string | null;
  gold_refresh_minutes: number;
  updated_at: string;
}

export interface Staff {
  id: string;
  email: string;
  name: string;
  role: Role;
  is_active: boolean;
  created_at: string;
}

export interface DashboardData {
  today_orders: number;
  today_revenue: number;
  week_revenue: number;
  prev_week_revenue: number;
  gold_rate_24k: number | null;
  chart_data: { date: string; revenue: number; is_today: boolean }[];
  top_sellers: { code: string; name: string; karat: Karat; units: number; revenue: number }[];
  recent_orders: { id: string; order_number: string; status: OrderStatus; total_usd: number; cashier: string; created_at: string }[];
}
