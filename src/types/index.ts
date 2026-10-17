export type UserRole = 'owner' | 'cashier';

// What a cashier may do; the owner can always do everything. A missing key means allowed,
// so cashiers created before permissions existed keep working as before.
export type CashierPermission =
  | 'give_credit'
  | 'add_udhaar'
  | 'receive_payments'
  | 'add_customers'
  | 'cancel_bills'
  | 'manage_expenses'
  | 'record_purchases'
  | 'view_reports'
  | 'daily_closing';

export type CashierPermissions = Partial<Record<CashierPermission, boolean>>;

export interface User {
  id: string;
  name: string;
  mobile: string;
  pin?: string; // Only in demo seed data; real PINs live in Firebase Auth, never in Firestore
  role: UserRole;
  active: boolean;
  created_at: string;
  permissions?: CashierPermissions;
}

export interface Settings {
  shop_name: string;
  address: string;
  phone: string;
  upi_id: string;
  invoice_prefix: string;
  gst_enabled: boolean;
  default_gst_percent: number;
  receipt_footer: string;
  cashier_max_discount_percent: number;
  allow_negative_stock: boolean;
  custom_units?: string[]; // Units added by the owner on top of the built-in list (src/lib/units.ts)
}

export interface Category {
  id: string;
  name: string;
  active: boolean;
}

// Built-in units live in src/lib/units.ts; the owner can add custom ones
export type ProductUnit = string;

export interface Product {
  id: string;
  category_id: string;
  name: string;
  sku: string;
  barcode?: string;
  unit: ProductUnit;
  purchase_price: number;
  selling_price: number;
  gst_percent: number;
  min_stock: number;
  track_expiry: boolean;
  current_stock: number; // Cached, updated with stock_movements
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Supplier {
  id: string;
  name: string;
  mobile: string;
  address: string;
  gst_number?: string;
  active: boolean;
}

export interface Customer {
  id: string;
  name: string;
  mobile: string;
  address?: string;
  credit_limit?: number | null;
  active: boolean;
  current_dues: number; // Cached balance from ledger
}

export type PaymentMethod = 'cash' | 'upi' | 'card' | 'credit';
export type SaleStatus = 'completed' | 'cancelled';

export interface SaleItem {
  id: string;
  sale_id: string;
  product_id: string;
  product_name: string;
  qty: number; // NUMERIC(12,3)
  unit: string;
  unit_price: number;
  discount: number;
  tax: number;
  line_total: number;
}

export interface Sale {
  id: string;
  invoice_no: string; // e.g. DP-2026-000123
  business_date: string; // YYYY-MM-DD
  customer_id?: string | null;
  customer_name?: string | null;
  customer_mobile?: string | null;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  payment_method: PaymentMethod;
  status: SaleStatus;
  cancel_reason?: string;
  cancelled_by?: string;
  cancelled_at?: string;
  is_offline_entry: boolean;
  offline_bill_ref?: string;
  items: SaleItem[];
  created_by: string; // user id
  created_by_name: string;
  created_at: string;
}

export interface PurchaseItem {
  id: string;
  purchase_id: string;
  product_id: string;
  product_name: string;
  qty: number;
  unit_cost: number;
  expiry_date?: string | null; // YYYY-MM-DD
  line_total: number;
}

export interface Purchase {
  id: string;
  supplier_id: string;
  supplier_name: string;
  supplier_invoice_no: string;
  purchase_date: string; // YYYY-MM-DD
  total: number;
  notes?: string;
  items: PurchaseItem[];
  created_by: string;
  created_at: string;
}

export type StockMovementType =
  | 'opening'
  | 'purchase'
  | 'sale'
  | 'sale_cancel'
  | 'damage'
  | 'expired'
  | 'adjustment';

export interface StockMovement {
  id: string;
  product_id: string;
  product_name: string;
  type: StockMovementType;
  qty: number; // Signed: positive = increase, negative = decrease
  ref_type: 'opening' | 'purchase' | 'sale' | 'adjustment';
  ref_id?: string;
  reason?: string;
  created_by: string;
  created_at: string;
}

export type CustomerLedgerType = 'opening' | 'credit_sale' | 'payment' | 'adjustment';

export interface CustomerLedgerEntry {
  id: string;
  customer_id: string;
  type: CustomerLedgerType;
  amount: number; // Signed: positive adds to dues, negative payment reduces dues
  balance_after: number;
  sale_id?: string | null;
  invoice_no?: string | null;
  payment_method?: 'cash' | 'upi';
  note?: string;
  created_by: string;
  created_at: string;
}

export type ExpenseCategory =
  | 'Rent'
  | 'Electricity'
  | 'Salary'
  | 'Transport'
  | 'Packaging'
  | 'Maintenance'
  | 'Internet'
  | 'Other';

export interface Expense {
  id: string;
  category: ExpenseCategory;
  amount: number;
  expense_date: string; // YYYY-MM-DD
  payment_method: 'cash' | 'upi' | 'bank';
  description: string;
  created_by: string;
  created_by_name: string;
  created_at: string;
}

export interface DailyClosing {
  id: string;
  business_date: string; // YYYY-MM-DD (unique)
  opening_cash: number;
  cash_sales: number;
  upi_sales: number;
  card_sales: number;
  credit_sales: number;
  cash_from_dues: number; // Cash received against dues
  cash_expenses: number;
  expected_cash: number; // opening_cash + cash_sales + cash_from_dues - cash_expenses
  actual_cash: number;
  difference: number; // actual_cash - expected_cash
  note?: string;
  status: 'closed' | 'open';
  closed_by: string;
  closed_by_name: string;
  closed_at: string;
  reopened_by?: string;
  reopened_by_name?: string;
  reopened_at?: string;
  reopen_reason?: string;
}

export interface AuditLog {
  id: string;
  user_id: string;
  user_name: string;
  action: string;
  entity: string;
  entity_id: string;
  details: Record<string, unknown>;
  created_at: string;
}

export interface ExpiryAlertItem {
  product_id: string;
  product_name: string;
  category_name: string;
  unit: string;
  current_stock: number;
  expiry_date: string;
  days_remaining: number;
  status: 'expired' | 'today' | '3_days' | '7_days';
  purchase_invoice_no?: string;
  supplier_name?: string;
}
