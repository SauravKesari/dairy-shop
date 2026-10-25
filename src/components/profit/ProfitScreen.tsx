import React, { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import { useDairy } from '../../context/DairyContext';
import { DailyProfit } from '../../types';
import {
  ProfitPeriod,
  periodRange,
  shiftPeriod,
  periodLabel,
  sumDays,
} from '../../lib/profit';
import type { ChartPoint } from './ProfitChart';
import { TrendingUp, ChevronLeft, ChevronRight, RefreshCw, AlertTriangle, Info, FileText } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { useProductName } from '../../i18n/useProductName';

// Recharts is only downloaded when this screen opens
const ProfitChart = lazy(() => import('./ProfitChart'));

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const inr = (v: number) => `₹${v.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const r2 = (n: number) => Math.round(n * 100) / 100;

// Change against the previous period; null when there is nothing to compare with
const change = (curr: number, prev: number) => (prev === 0 ? null : ((curr - prev) / Math.abs(prev)) * 100);

export const ProfitScreen: React.FC = () => {
  const { currentBusinessDate, currentUser, settings, expenses, products, categories, fetchDailyProfit, rebuildDailyProfit } = useDairy();
  const { t, tx } = useLanguage();
  const { nameOf } = useProductName();

  const [period, setPeriod] = useState<ProfitPeriod>('day');
  const [anchor, setAnchor] = useState(currentBusinessDate);
  const [days, setDays] = useState<DailyProfit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  // Owner-only rebuild form
  const [showRebuild, setShowRebuild] = useState(false);
  const [rebuildFrom, setRebuildFrom] = useState('');
  const [rebuildTo, setRebuildTo] = useState('');
  const [rebuildMsg, setRebuildMsg] = useState<string | null>(null);
  const [rebuilding, setRebuilding] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);

  const [from, to] = periodRange(period, anchor);
  const [prevFrom, prevTo] = periodRange(period, shiftPeriod(period, anchor, -1));

  // One query covers the previous period and this one (they are back to back)
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchDailyProfit(prevFrom, to)
      .then(rows => !cancelled && setDays(rows))
      .catch(err => {
        console.error(err);
        if (!cancelled) setError(t('profit.loadFailed'));
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prevFrom, to, reloadKey]);

  const inRange = (date: string, a: string, b: string) => date >= a && date <= b;

  const current = useMemo(() => sumDays(days.filter(d => inRange(d.date, from, to)), from), [days, from, to]);
  const previous = useMemo(() => sumDays(days.filter(d => inRange(d.date, prevFrom, prevTo)), prevFrom), [days, prevFrom, prevTo]);

  const expenseTotal = (a: string, b: string) =>
    r2(expenses.filter(e => inRange(e.expense_date, a, b)).reduce((sum, e) => sum + e.amount, 0));

  const gross = r2(current.revenue - current.cost);
  const prevGross = r2(previous.revenue - previous.cost);
  const exp = expenseTotal(from, to);
  const prevExp = expenseTotal(prevFrom, prevTo);
  const net = r2(gross - exp);
  const prevNet = r2(prevGross - prevExp);
  const margin = current.revenue > 0 ? (gross / current.revenue) * 100 : 0;

  // Chart: daily bars for a month, monthly bars for a year, categories for a single day
  const chartData: ChartPoint[] = useMemo(() => {
    const byDate = new Map(days.map(d => [d.date, d]));
    if (period === 'month') {
      const n = Number(to.slice(8, 10));
      return Array.from({ length: n }, (_, i) => {
        const date = `${from.slice(0, 8)}${String(i + 1).padStart(2, '0')}`;
        const d = byDate.get(date);
        const g = d ? r2(d.revenue - d.cost) : 0;
        return { label: String(i + 1), gross: g, net: r2(g - expenseTotal(date, date)) };
      });
    }
    if (period === 'year') {
      return MONTHS.map((m, i) => {
        const label = tx(`profit.month.${i}`, m);
        const prefix = `${from.slice(0, 4)}-${String(i + 1).padStart(2, '0')}`;
        const month = sumDays(days.filter(d => d.date.startsWith(prefix)), prefix);
        const g = r2(month.revenue - month.cost);
        return { label, gross: g, net: r2(g - expenseTotal(`${prefix}-01`, `${prefix}-31`)) };
      });
    }
    const byCat = new Map<string, number>();
    Object.entries(current.products).forEach(([pid, p]) => {
      const catId = products.find(x => x.id === pid)?.category_id;
      const name = categories.find(c => c.id === catId)?.name || t('profit.otherCategory');
      byCat.set(name, r2((byCat.get(name) || 0) + p.revenue - p.cost));
    });
    return Array.from(byCat, ([label, g]) => ({ label, gross: g })).sort((a, b) => b.gross - a.gross);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days, period, from, to, current, expenses, products, categories, t, tx]);

  const productRows = useMemo(
    () =>
      Object.entries(current.products)
        .map(([pid, p]) => ({ pid, ...p, profit: r2(p.revenue - p.cost) }))
        .filter(p => p.qty !== 0 || p.revenue !== 0),
    [current]
  );
  const topProducts = [...productRows].sort((a, b) => b.profit - a.profit).slice(0, 10);
  const belowCost = productRows.filter(p => p.profit < 0).sort((a, b) => a.profit - b.profit);

  const openRebuild = () => {
    setRebuildFrom(from);
    setRebuildTo(to);
    setRebuildMsg(null);
    setShowRebuild(true);
  };

  const handleRebuild = async () => {
    setRebuilding(true);
    setRebuildMsg(null);
    const res = await rebuildDailyProfit(rebuildFrom, rebuildTo);
    setRebuilding(false);
    if (!res.success) {
      setRebuildMsg(res.error || t('profit.rebuildFailed'));
      return;
    }
    setRebuildMsg(t('profit.rebuilt', { days: res.days ?? 0, bills: res.bills ?? 0 }));
    setReloadKey(k => k + 1);
  };

  // PDF of exactly what the screen shows for the chosen period. The PDF fonts can't draw Hindi, so it
  // uses English labels and the English product names stored on the bills.
  const handleDownloadPdf = async () => {
    if (exportingPdf) return;
    setExportingPdf(true);
    try {
      const { downloadProfitPdf } = await import('./profitPdf');
      await downloadProfitPdf({
        shopName: settings.shop_name || 'Dairy Shop',
        periodTitle: periodLabel(period, anchor),
        generatedOn: currentBusinessDate,
        summary: [
          { label: 'Sales (before GST)', current: current.revenue, previous: previous.revenue },
          { label: 'Cost of goods sold', current: current.cost, previous: previous.cost },
          { label: 'Gross profit', current: gross, previous: prevGross },
          { label: 'Expenses', current: exp, previous: prevExp },
          { label: 'Net profit', current: net, previous: prevNet },
        ],
        marginPct: margin,
        bills: current.bills,
        chartTitle: period === 'day' ? 'Gross profit by category' : period === 'month' ? 'Profit by day' : 'Profit by month',
        chartColumn: period === 'day' ? 'Category' : period === 'month' ? 'Day' : 'Month',
        // Month names come from the language toggle and the "other" category is translated, so swap in English
        chart: chartData.map((d, i) => ({
          ...d,
          label: period === 'year' ? MONTHS[i] : /[^\x20-\x7E]/.test(d.label) ? 'Other' : d.label,
        })),
        showNet: period !== 'day',
        topProducts: topProducts.map(p => ({ name: p.name, qty: p.qty, revenue: p.revenue, profit: p.profit })),
        belowCost: belowCost.map(p => ({ name: p.name, qty: p.qty, revenue: p.revenue, cost: p.cost, profit: p.profit })),
        filename: `profit_report_${period}_${from}${from === to ? '' : `_to_${to}`}.pdf`,
      });
    } catch (err) {
      console.error('Profit PDF export failed:', err);
      setError(t('profit.pdfFailed'));
    } finally {
      setExportingPdf(false);
    }
  };

  const card = (title: string, value: number, prev: number, opts: { hint?: string; tone?: 'profit' | 'cost' } = {}) => {
    const pct = change(value, prev);
    const periodWord = tx(`profit.periodWord.${period}`, period);
    // For costs and expenses, going down is the good direction
    const good = pct === null ? null : opts.tone === 'cost' ? pct <= 0 : pct >= 0;
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
        <span className="text-xs text-slate-500 font-medium block">{title}</span>
        <span
          className={`text-xl font-extrabold font-mono-numbers mt-1 block ${
            opts.tone === 'profit' ? (value < 0 ? 'text-red-600' : 'text-emerald-700') : 'text-slate-900'
          }`}
        >
          {inr(value)}
        </span>
        <span className="text-[11px] mt-0.5 block text-slate-500">
          {pct === null ? (
            t('profit.noPrevData')
          ) : (
            <span className={good ? 'text-emerald-700' : 'text-red-600'}>
              {pct >= 0 ? '▲' : '▼'} {t('profit.vsPrevious', { pct: Math.abs(pct).toFixed(1), period: periodWord })}
            </span>
          )}
          {opts.hint && <span className="block text-slate-400">{opts.hint}</span>}
        </span>
      </div>
    );
  };

  const isEmpty = !loading && current.bills === 0 && exp === 0;

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-5">
      {/* Header + filters */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-600" />
            <span>{t('profit.title')}</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">{t('profit.subtitle')}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="flex bg-white border border-slate-200 rounded-lg p-0.5">
            {(['day', 'month', 'year'] as ProfitPeriod[]).map(p => (
              <button
                key={p}
                type="button"
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded-md font-semibold capitalize ${
                  period === p ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {tx(`profit.period.${p}`, p)}
              </button>
            ))}
          </div>

          <div className="flex items-center bg-white border border-slate-200 rounded-lg">
            <button
              type="button"
              onClick={() => setAnchor(a => shiftPeriod(period, a, -1))}
              className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-l-lg"
              title={t('profit.prevPeriod', { period: tx(`profit.periodWord.${period}`, period) })}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {period === 'day' && (
              <input
                type="date"
                value={anchor}
                onChange={e => e.target.value && setAnchor(e.target.value)}
                className="px-2 py-1 font-mono-numbers bg-transparent"
              />
            )}
            {period === 'month' && (
              <input
                type="month"
                value={anchor.slice(0, 7)}
                onChange={e => e.target.value && setAnchor(`${e.target.value}-01`)}
                className="px-2 py-1 font-mono-numbers bg-transparent"
              />
            )}
            {period === 'year' && (
              <select
                value={anchor.slice(0, 4)}
                onChange={e => setAnchor(`${e.target.value}-01-01`)}
                className="px-2 py-1 font-mono-numbers bg-transparent"
              >
                {Array.from({ length: 6 }, (_, i) => Number(currentBusinessDate.slice(0, 4)) - i).map(y => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            )}
            <button
              type="button"
              onClick={() => setAnchor(a => shiftPeriod(period, a, 1))}
              className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-r-lg"
              title={t('profit.nextPeriod', { period: tx(`profit.periodWord.${period}`, period) })}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => setAnchor(currentBusinessDate)}
            className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg font-semibold text-slate-700 hover:bg-slate-50"
          >
            {t('profit.today')}
          </button>

          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={exportingPdf || loading}
            className="px-3 py-1.5 bg-red-700 hover:bg-red-800 text-white rounded-lg font-semibold flex items-center gap-1 disabled:opacity-60"
            title={t('profit.downloadPdfTitle')}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>{exportingPdf ? t('profit.preparingPdf') : t('profit.downloadPdf')}</span>
          </button>

          {currentUser.role === 'owner' && (
            <button
              type="button"
              onClick={openRebuild}
              className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-1"
              title={t('profit.rebuildTitle')}
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>{t('profit.rebuild')}</span>
            </button>
          )}
        </div>
      </div>

      <p className="text-sm font-semibold text-slate-800">{periodLabel(period, anchor)}</p>

      {showRebuild && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs space-y-2">
          <p className="text-amber-900">
            {t('profit.rebuildHelp')}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <input type="date" value={rebuildFrom} onChange={e => setRebuildFrom(e.target.value)} className="px-2 py-1 border border-amber-300 rounded bg-white" />
            <span>{t('profit.to')}</span>
            <input type="date" value={rebuildTo} onChange={e => setRebuildTo(e.target.value)} className="px-2 py-1 border border-amber-300 rounded bg-white" />
            <button
              type="button"
              disabled={rebuilding}
              onClick={handleRebuild}
              className="px-3 py-1.5 bg-slate-900 text-white font-semibold rounded-lg disabled:opacity-60"
            >
              {rebuilding ? t('profit.rebuilding') : t('profit.rebuildNow')}
            </button>
            <button type="button" onClick={() => setShowRebuild(false)} className="px-2 py-1.5 text-slate-600 hover:text-slate-900">
              {t('common.close')}
            </button>
          </div>
          {rebuildMsg && <p className="font-semibold text-slate-800">{rebuildMsg}</p>}
        </div>
      )}

      {error && <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg p-2">{error}</p>}

      {current.estimated_cost_bills > 0 && (
        <p className="text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded-lg p-2 flex items-start gap-1.5">
          <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <span>
            {t('profit.estimated', { count: current.estimated_cost_bills })}
          </span>
        </p>
      )}

      {/* Summary cards */}
      <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 ${loading ? 'opacity-50' : ''}`}>
        {card(t('profit.card.sales'), current.revenue, previous.revenue, { hint: t('profit.billsCount', { count: current.bills }) })}
        {card(t('profit.card.cost'), current.cost, previous.cost, { tone: 'cost' })}
        {card(t('profit.card.gross'), gross, prevGross, { tone: 'profit', hint: t('profit.marginHint', { pct: margin.toFixed(1) }) })}
        {card(t('profit.card.expenses'), exp, prevExp, { tone: 'cost' })}
        {card(t('profit.card.net'), net, prevNet, { tone: 'profit', hint: t('profit.netHint') })}
      </div>

      {isEmpty ? (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center text-slate-500 text-sm">
          {t('profit.empty', { period: periodLabel(period, anchor) })}
        </div>
      ) : (
        <>
          {/* Chart */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
            <h3 className="font-bold text-sm text-slate-900 mb-3">
              {period === 'day' ? t('profit.chart.byCategory') : period === 'month' ? t('profit.chart.byDay') : t('profit.chart.byMonth')}
            </h3>
            {chartData.length === 0 ? (
              <p className="text-xs text-slate-500">{t('profit.chart.empty')}</p>
            ) : (
              <Suspense fallback={<div className="h-72 flex items-center justify-center text-xs text-slate-400">{t('profit.chart.loading')}</div>}>
                <ProfitChart data={chartData} showNet={period !== 'day'} />
              </Suspense>
            )}
          </div>

          {/* Product tables */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden">
              <h3 className="font-bold text-sm text-slate-900 p-4 border-b border-slate-200">{t('profit.topProducts')}</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 border-b border-slate-200">
                      <th className="py-2 px-3 font-semibold">{t('common.product')}</th>
                      <th className="py-2 px-3 font-semibold text-right">{t('common.qty')}</th>
                      <th className="py-2 px-3 font-semibold text-right">{t('profit.col.sales')}</th>
                      <th className="py-2 px-3 font-semibold text-right">{t('profit.col.profit')}</th>
                      <th className="py-2 px-3 font-semibold text-right">{t('profit.col.margin')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono-numbers">
                    {topProducts.map(p => (
                      <tr key={p.pid}>
                        <td className="py-2 px-3 font-sans text-slate-800">{nameOf(p.pid, p.name)}</td>
                        <td className="py-2 px-3 text-right">{p.qty}</td>
                        <td className="py-2 px-3 text-right">{inr(p.revenue)}</td>
                        <td className={`py-2 px-3 text-right font-semibold ${p.profit < 0 ? 'text-red-600' : 'text-emerald-700'}`}>
                          {inr(p.profit)}
                        </td>
                        <td className="py-2 px-3 text-right">{p.revenue > 0 ? `${((p.profit / p.revenue) * 100).toFixed(1)}%` : '—'}</td>
                      </tr>
                    ))}
                    {topProducts.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-3 px-3 font-sans text-slate-500">
                          {t('profit.noProducts')}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden">
              <h3 className="font-bold text-sm text-slate-900 p-4 border-b border-slate-200 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-red-500" />
                <span>{t('profit.belowCost')}</span>
              </h3>
              {belowCost.length === 0 ? (
                <p className="p-4 text-xs text-emerald-700">{t('profit.noneBelowCost')}</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 border-b border-slate-200">
                        <th className="py-2 px-3 font-semibold">{t('common.product')}</th>
                        <th className="py-2 px-3 font-semibold text-right">{t('common.qty')}</th>
                        <th className="py-2 px-3 font-semibold text-right">{t('profit.col.sales')}</th>
                        <th className="py-2 px-3 font-semibold text-right">{t('profit.col.cost')}</th>
                        <th className="py-2 px-3 font-semibold text-right">{t('profit.col.loss')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono-numbers">
                      {belowCost.map(p => (
                        <tr key={p.pid} className="bg-red-50/40">
                          <td className="py-2 px-3 font-sans text-slate-800">{nameOf(p.pid, p.name)}</td>
                          <td className="py-2 px-3 text-right">{p.qty}</td>
                          <td className="py-2 px-3 text-right">{inr(p.revenue)}</td>
                          <td className="py-2 px-3 text-right">{inr(p.cost)}</td>
                          <td className="py-2 px-3 text-right font-semibold text-red-600">{inr(p.profit)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
