import { DailyProfit, ProductProfit, Sale } from '../types';

const r2 = (n: number) => Math.round(n * 100) / 100;

export interface SaleProfit {
  revenue: number;
  cost: number;
  tax: number;
  discount: number;
  estimated: boolean;
  products: Record<string, ProductProfit>;
}

// Profit of one bill, before GST. The bill-level discount is spread over the lines by their share,
// so per-product numbers add up to the bill. Lines without unit_cost (older bills) use costOf.
export const saleProfit = (
  sale: Pick<Sale, 'items' | 'discount' | 'tax'>,
  costOf: (productId: string) => number | undefined
): SaleProfit => {
  const lines = sale.items.map(item => ({ item, taxable: Math.max(0, item.qty * item.unit_price - (item.discount || 0)) }));
  const taxableTotal = lines.reduce((sum, l) => sum + l.taxable, 0);
  const billDiscount = sale.discount || 0;

  const products: Record<string, ProductProfit> = {};
  let revenue = 0;
  let cost = 0;
  let estimated = false;
  lines.forEach(({ item, taxable }) => {
    const lineRevenue = taxableTotal > 0 ? taxable - (billDiscount * taxable) / taxableTotal : 0;
    if (item.unit_cost === undefined) estimated = true;
    const lineCost = item.qty * (item.unit_cost ?? costOf(item.product_id) ?? 0);
    revenue += lineRevenue;
    cost += lineCost;
    const p = (products[item.product_id] ??= { name: item.product_name, qty: 0, revenue: 0, cost: 0 });
    p.qty += item.qty;
    p.revenue += lineRevenue;
    p.cost += lineCost;
  });

  Object.values(products).forEach(p => {
    p.qty = Math.round(p.qty * 1000) / 1000;
    p.revenue = r2(p.revenue);
    p.cost = r2(p.cost);
  });
  const lineDiscounts = sale.items.reduce((sum, i) => sum + (i.discount || 0), 0);
  return { revenue: r2(revenue), cost: r2(cost), tax: r2(sale.tax || 0), discount: r2(billDiscount + lineDiscounts), estimated, products };
};

export const emptyDay = (date: string): DailyProfit => ({
  date,
  bills: 0,
  revenue: 0,
  cost: 0,
  tax: 0,
  discount: 0,
  estimated_cost_bills: 0,
  products: {},
});

// Adds one bill's profit into a day summary (used by the owner's rebuild)
export const addSaleToDay = (day: DailyProfit, p: SaleProfit) => {
  day.bills += 1;
  day.revenue = r2(day.revenue + p.revenue);
  day.cost = r2(day.cost + p.cost);
  day.tax = r2(day.tax + p.tax);
  day.discount = r2(day.discount + p.discount);
  if (p.estimated) day.estimated_cost_bills += 1;
  Object.entries(p.products).forEach(([pid, line]) => {
    const t = (day.products[pid] ??= { name: line.name, qty: 0, revenue: 0, cost: 0 });
    t.qty = Math.round((t.qty + line.qty) * 1000) / 1000;
    t.revenue = r2(t.revenue + line.revenue);
    t.cost = r2(t.cost + line.cost);
  });
};

// Sums several days (a month or a year) into one summary
export const sumDays = (days: DailyProfit[], label: string): DailyProfit => {
  const total = emptyDay(label);
  days.forEach(d => {
    total.bills += d.bills || 0;
    total.revenue = r2(total.revenue + (d.revenue || 0));
    total.cost = r2(total.cost + (d.cost || 0));
    total.tax = r2(total.tax + (d.tax || 0));
    total.discount = r2(total.discount + (d.discount || 0));
    total.estimated_cost_bills += d.estimated_cost_bills || 0;
    Object.entries(d.products || {}).forEach(([pid, line]) => {
      const t = (total.products[pid] ??= { name: line.name, qty: 0, revenue: 0, cost: 0 });
      t.qty = Math.round((t.qty + (line.qty || 0)) * 1000) / 1000;
      t.revenue = r2(t.revenue + (line.revenue || 0));
      t.cost = r2(t.cost + (line.cost || 0));
    });
  });
  return total;
};

export type ProfitPeriod = 'day' | 'month' | 'year';

// Date math on YYYY-MM-DD strings in UTC, so the local time zone can never shift a day
const toUtc = (d: string) => new Date(`${d}T00:00:00Z`);
const fromUtc = (d: Date) => d.toISOString().slice(0, 10);
const daysInMonth = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate(); // m is 1-12

export const periodRange = (period: ProfitPeriod, anchor: string): [string, string] => {
  const [y, m] = anchor.split('-').map(Number);
  if (period === 'day') return [anchor, anchor];
  if (period === 'month') {
    const mm = String(m).padStart(2, '0');
    return [`${y}-${mm}-01`, `${y}-${mm}-${String(daysInMonth(y, m)).padStart(2, '0')}`];
  }
  return [`${y}-01-01`, `${y}-12-31`];
};

// Moves the anchor date by whole periods (keeps the day within range when months differ in length)
export const shiftPeriod = (period: ProfitPeriod, anchor: string, delta: number): string => {
  const d = toUtc(anchor);
  if (period === 'day') {
    d.setUTCDate(d.getUTCDate() + delta);
    return fromUtc(d);
  }
  const y = d.getUTCFullYear() + (period === 'year' ? delta : 0);
  const m = d.getUTCMonth() + (period === 'month' ? delta : 0);
  const first = new Date(Date.UTC(y, m, 1));
  const day = Math.min(d.getUTCDate(), daysInMonth(first.getUTCFullYear(), first.getUTCMonth() + 1));
  return fromUtc(new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth(), day)));
};

export const periodLabel = (period: ProfitPeriod, anchor: string) => {
  const d = toUtc(anchor);
  if (period === 'day') return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
  if (period === 'month') return d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  return String(d.getUTCFullYear());
};
