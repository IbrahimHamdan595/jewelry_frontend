export type Karat = "K18" | "K21" | "K22" | "K24";
export type LotSource = "BUYBACK" | "MELT" | "SUPPLIER" | "SEED" | "ADJUSTMENT";
export type AdjustmentTarget = "LOT" | "PRODUCT" | "COIN_STOCK" | "OUNCE_STOCK";
export type AdjustmentReason = "LOSS" | "THEFT" | "GIFT" | "SAMPLE" | "CORRECTION";

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

export type ProductStatus = "AVAILABLE" | "SOLD" | "MELTED" | "RESERVED" | "INACTIVE";

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
  // Phase 4
  is_used: boolean;
  cost_basis_usd: number | string | null;
  status: ProductStatus;
  source_ref_type: string | null;
  source_ref_id: string | null;
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

export type OrderItemKind = "PRODUCT" | "COIN" | "OUNCE";

export interface OrderItem {
  id: string;
  item_kind: OrderItemKind;
  product_id: string | null;
  coin_type_id: string | null;
  ounce_type_id: string | null;
  quantity: number;
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
  // Phase 7 — inventory pulse + AP
  inventory?: {
    pure_gold_by_karat: { karat: Karat; grams_remaining: number; lot_count: number }[];
    coins: { on_hand_total: number; distinct_types: number };
    ounces: { on_hand_total: number; distinct_types: number };
    low_stock_alerts: number;
  };
  accounts_payable?: {
    total_cash_owed: number;
    total_grams_owed_by_karat: Record<string, number>;
    supplier_count: number;
  };
}

// ── Inventory layer (Phases 1-7) ─────────────────────────────────────────────

export interface Lot {
  id: string;
  karat: Karat;
  weight_grams: number;
  weight_remaining_grams: number;
  source: LotSource;
  source_ref_type: string | null;
  source_ref_id: string | null;
  cost_basis_usd: number;
  acquired_at: string;
  notes: string | null;
  is_depleted: boolean;
  created_at: string;
  updated_at: string;
}

export interface LotListResponse {
  items: Lot[];
  total: number;
  page: number;
  page_size: number;
}

export interface LotKaratTotal {
  karat: Karat;
  total_remaining_grams: number;
  total_original_grams: number;
  lot_count: number;
  cost_basis_remaining_usd: number;
}

export interface LotTotalsResponse {
  by_karat: LotKaratTotal[];
  grand_total_remaining_grams: number;
}

export interface ManualAdjustment {
  id: string;
  target_type: AdjustmentTarget;
  target_id: string;
  delta: number;
  reason: AdjustmentReason;
  notes: string;
  occurred_at: string;
  actor_user_id: string;
  created_at: string;
}

export interface LedgerEntry {
  id: string;
  event_type: string;
  actor_user_id: string;
  occurred_at: string;
  ref_type: string;
  ref_id: string;
  payload: Record<string, unknown>;
  created_at: string;
}

export interface LedgerListResponse {
  items: LedgerEntry[];
  total: number;
  page: number;
  page_size: number;
}

export interface InventoryAlertRow {
  kind: "COIN" | "OUNCE";
  id: string;
  code: string;
  name_en: string;
  on_hand_qty: number;
  min_stock_qty: number;
}

export interface InventoryAlertsResponse {
  below_threshold: InventoryAlertRow[];
  total: number;
}

export type MarginMode = "USD" | "PERCENT";

export interface UnitType {
  id: string;
  code: string;
  name_en: string;
  name_ar: string;
  karat: Karat;
  weight_grams: number;
  markup_per_gram: number;
  margin_mode: MarginMode;
  margin_value: number;
  on_hand_qty: number;
  min_stock_qty: number | null;
  photo_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UnitTypeListResponse {
  items: UnitType[];
  total: number;
  page: number;
  page_size: number;
}

export interface UnitPrice {
  type_id: string;
  code: string;
  gold_rate_24k: number;
  effective_rate: number;
  metal_value: number;
  margin_amount: number;
  final_price: number;
  on_hand_qty: number;
  rate_source: string;
  rate_is_stale: boolean;
}

// ── Suppliers + AP (Phase 5) ─────────────────────────────────────────────────

export type SupplierPurchaseMode = "CASH" | "GOLD" | "MIXED";
export type SupplierItemKind = "PRODUCT" | "COIN" | "OUNCE" | "PURE_GOLD";
export type DebtUnit = "CASH" | "GOLD";

export interface Supplier {
  id: string;
  name: string;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  default_currency: string;
  payment_terms: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SupplierListResponse {
  items: Supplier[];
  total: number;
  page: number;
  page_size: number;
}

export interface SupplierBalance {
  unit: DebtUnit;
  karat: string | null;
  balance: number;
}

export interface SupplierPurchaseItem {
  id: string;
  item_kind: SupplierItemKind;
  product_id: string | null;
  coin_type_id: string | null;
  ounce_type_id: string | null;
  lot_id: string | null;
  quantity: number | null;
  weight_grams: number | null;
  karat: Karat | null;
  unit_cost_usd: number;
  notes: string | null;
}

export interface SupplierPurchase {
  id: string;
  supplier_id: string;
  occurred_at: string;
  payment_mode: SupplierPurchaseMode;
  trade_markup_per_gram: number | null;
  total_cash_due: number;
  total_grams_due_by_karat: Record<string, string>;
  cash_paid_at_creation: number;
  grams_paid_at_creation_by_karat: Record<string, string>;
  notes: string | null;
  created_by_user_id: string;
  created_at: string;
  items: SupplierPurchaseItem[];
}

export interface SupplierPayment {
  id: string;
  supplier_id: string;
  paid_at: string;
  unit: DebtUnit;
  karat: Karat | null;
  amount: number;
  source_lot_ids: string[] | null;
  paid_by_user_id: string;
  notes: string | null;
}

export interface SupplierDetail {
  supplier: Supplier;
  balances: SupplierBalance[];
  purchases: SupplierPurchase[];
  payments: SupplierPayment[];
}

export interface APSupplierRow {
  supplier_id: string;
  supplier_name: string;
  balances: SupplierBalance[];
}

export interface AccountsPayable {
  total_cash_owed: number;
  total_grams_owed_by_karat: Record<string, number>;
  suppliers: APSupplierRow[];
}

export interface ReconcileDrift {
  supplier_id: string;
  supplier_name?: string;
  unit: DebtUnit;
  karat: string | null;
  /** Decimal-as-string fields */
  stored: string;
  computed: string;
  drift: string;
}

export interface ReconcileResponse {
  supplier_balance_drifts: ReconcileDrift[];
  drift_count: number;
  discord_alerted: boolean;
}

// ── Walk-in buybacks (Phase 3) ────────────────────────────────────────────────

export type BuybackKind = "PURE_GOLD" | "COIN" | "OUNCE" | "USED_PRODUCT";
export type BuybackMarginMode = "USD_PER_GRAM" | "PERCENT";
export type BuybackPriceMode = "FORMULA" | "MANUAL";

export interface WalkinBuyback {
  id: string;
  occurred_at: string;
  seller_name: string;
  seller_phone: string;
  cashier_id: string;
  kind: BuybackKind;
  karat: Karat | null;
  weight_grams: number | string | null;
  quantity: number | null;
  coin_type_id: string | null;
  ounce_type_id: string | null;
  result_lot_id: string | null;
  product_id: string | null;
  buy_price_usd: number | string;
  gold_rate_at_buy: number | string;
  buyback_margin_mode: BuybackMarginMode | null;
  buyback_margin_value: number | string | null;
  price_mode: BuybackPriceMode;
  notes: string | null;
}

export interface BuybackListResponse {
  items: WalkinBuyback[];
  total: number;
  page: number;
  page_size: number;
}
