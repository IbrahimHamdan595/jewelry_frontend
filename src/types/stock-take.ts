// Mirrors app/schemas/stock_take.py.

export type StockTakeStatus = "DRAFT" | "SUBMITTED" | "CLOSED";

export type StockTakeLineResolution =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "NO_VARIANCE";

export type StockTakeRefType = "COIN_STOCK" | "OUNCE_STOCK";

export interface StockTakeLine {
  id: string;
  stock_take_id: string;
  ref_type: StockTakeRefType;
  ref_id: string;
  counted_qty: number;
  expected_qty_at_submit: number | null;
  variance: number | null;
  resolution: StockTakeLineResolution;
  rejection_reason: string | null;
  adjustment_id: string | null;
  resolved_at: string | null;
  resolved_by_user_id: string | null;
  created_at: string;
}

export interface StockTake {
  id: string;
  started_at: string;
  started_by_user_id: string;
  submitted_at: string | null;
  closed_at: string | null;
  status: StockTakeStatus;
  notes: string | null;
  lines: StockTakeLine[];
}

export interface StockTakeListItem {
  id: string;
  started_at: string;
  started_by_user_id: string;
  submitted_at: string | null;
  closed_at: string | null;
  status: StockTakeStatus;
  notes: string | null;
  line_count: number;
  variance_line_count: number;
  approved_count: number;
  rejected_count: number;
}

export interface StockTakeList {
  items: StockTakeListItem[];
  total: number;
  page: number;
  page_size: number;
}
