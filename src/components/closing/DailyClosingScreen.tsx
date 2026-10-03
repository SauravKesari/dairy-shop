import React, { useState } from 'react';
import { useDairy } from '../../context/DairyContext';
import {
  Lock,
  Unlock,
  AlertTriangle,
  CheckCircle2,
  DollarSign,
  Calculator,
  Calendar,
  AlertCircle,
} from 'lucide-react';

export const DailyClosingScreen: React.FC = () => {
  const {
    currentBusinessDate,
    setCurrentBusinessDate,
    getDailyCashSummary,
    saveDailyClosing,
    reopenDailyClosing,
    currentUser,
    dailyClosings,
  } = useDairy();

  const [selectedDate, setSelectedDate] = useState<string>(currentBusinessDate);
  const summary = getDailyCashSummary(selectedDate);

  const [openingFloatInput, setOpeningFloatInput] = useState<number>(summary.opening_cash);
  const [actualCashInput, setActualCashInput] = useState<number>(
    summary.actual_cash !== undefined ? summary.actual_cash : summary.expected_cash
  );
  const [closingNote, setClosingNote] = useState<string>('');

  // Re-open day modal
  const [showReopenModal, setShowReopenModal] = useState(false);
  const [reopenReason, setReopenReason] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);

  // Dynamic Expected Cash calculation based on input float
  const calculatedExpected = Number(
    (openingFloatInput + summary.cash_sales + summary.cash_from_dues - summary.cash_expenses).toFixed(2)
  );
  const variance = Number((actualCashInput - calculatedExpected).toFixed(2));

  const handleCloseDay = () => {
    setActionError(null);
    const res = saveDailyClosing(selectedDate, openingFloatInput, actualCashInput, closingNote);
    if (!res.success) {
      setActionError(res.error || 'Failed to close day');
      return;
    }
  };

  const handleConfirmReopen = () => {
    setActionError(null);
    if (!reopenReason.trim()) {
      setActionError('A mandatory reason is required to re-open a locked business day.');
      return;
    }
    const res = reopenDailyClosing(selectedDate, reopenReason);
    if (!res.success) {
      setActionError(res.error || 'Failed to re-open day');
      return;
    }
    setShowReopenModal(false);
    setReopenReason('');
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Title & Date Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">
            Daily Cash Reconciliation & Day Closing
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Enforces strict cash drawer balance formula and locks transactions to prevent tampering
          </p>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-slate-600">Select Date:</label>
          <div className="relative">
            <input
              type="date"
              value={selectedDate}
              onChange={e => {
                setSelectedDate(e.target.value);
                const s = getDailyCashSummary(e.target.value);
                setOpeningFloatInput(s.opening_cash);
                setActualCashInput(s.actual_cash !== undefined ? s.actual_cash : s.expected_cash);
              }}
              className="py-1.5 px-3 border border-slate-200 rounded-lg text-xs font-mono-numbers bg-white shadow-2xs"
            />
          </div>
        </div>
      </div>

      {/* Lock Status Banner */}
      <div
        className={`p-4 rounded-xl border flex items-center justify-between ${
          summary.status === 'closed'
            ? 'bg-amber-50 border-amber-300 text-amber-950'
            : 'bg-emerald-50 border-emerald-200 text-emerald-950'
        }`}
      >
        <div className="flex items-center gap-3">
          {summary.status === 'closed' ? (
            <div className="p-2 bg-amber-200 rounded-lg text-amber-900">
              <Lock className="w-5 h-5" />
            </div>
          ) : (
            <div className="p-2 bg-emerald-200 rounded-lg text-emerald-900">
              <Unlock className="w-5 h-5" />
            </div>
          )}
          <div>
            <h4 className="font-bold text-sm">
              Day Status for {selectedDate}: {summary.status === 'closed' ? 'CLOSED & LOCKED' : 'OPEN FOR BILLING'}
            </h4>
            <p className="text-xs opacity-80 mt-0.5">
              {summary.status === 'closed'
                ? 'Cashiers cannot create, cancel or edit transactions for this date. (Owner re-open is audited).'
                : 'Transactions and receipts are currently being recorded into cash float.'}
            </p>
          </div>
        </div>

        {summary.status === 'closed' && currentUser.role === 'owner' && (
          <button
            type="button"
            onClick={() => setShowReopenModal(true)}
            className="px-3 py-1.5 bg-amber-900 hover:bg-amber-800 text-white rounded-lg text-xs font-bold transition-colors shadow-2xs"
          >
            Re-open Day (Audited)
          </button>
        )}
      </div>

      {actionError && (
        <div className="p-3 bg-red-50 text-red-700 text-xs rounded-lg flex items-center gap-2 border border-red-200">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* The Core Formula Breakdown Grid */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs space-y-6">
        <div className="border-b border-slate-200 pb-3 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Calculator className="w-4 h-4 text-slate-600" />
              <span>Core Expected Cash Formula</span>
            </h3>
            <p className="text-xs text-slate-500 font-mono-numbers mt-0.5">
              Expected Cash = Opening Cash + Cash Sales + Cash from Dues − Cash Expenses
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 1. Opening Cash Float */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
            <span className="text-xs font-semibold text-slate-600 block">1. Opening Cash Float</span>
            <div className="flex items-center gap-1 mt-1">
              <span className="text-sm font-bold text-slate-500">₹</span>
              <input
                type="number"
                disabled={summary.status === 'closed'}
                value={openingFloatInput}
                onChange={e => setOpeningFloatInput(parseFloat(e.target.value) || 0)}
                className="w-full font-bold font-mono-numbers text-lg bg-white border border-slate-200 rounded px-2 py-0.5 text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 disabled:bg-slate-100"
              />
            </div>
            <span className="text-[11px] text-slate-400 block">Entered in the morning</span>
          </div>

          {/* 2. Cash Sales Today */}
          <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-xl space-y-1">
            <span className="text-xs font-semibold text-emerald-800 block">2. Cash Sales Total (+)</span>
            <span className="text-2xl font-extrabold font-mono-numbers text-emerald-950 block mt-1">
              +₹{summary.cash_sales.toFixed(2)}
            </span>
            <span className="text-[11px] text-emerald-700 block">From retail customer bills</span>
          </div>

          {/* 3. Cash Received against Dues */}
          <div className="p-4 bg-blue-50/60 border border-blue-200 rounded-xl space-y-1">
            <span className="text-xs font-semibold text-blue-800 block">3. Dues Cash Collected (+)</span>
            <span className="text-2xl font-extrabold font-mono-numbers text-blue-950 block mt-1">
              +₹{summary.cash_from_dues.toFixed(2)}
            </span>
            <span className="text-[11px] text-blue-700 block">From Udhaar customer repayments</span>
          </div>

          {/* 4. Cash Expenses Paid Out */}
          <div className="p-4 bg-red-50/60 border border-red-200 rounded-xl space-y-1">
            <span className="text-xs font-semibold text-red-800 block">4. Cash Expenses Paid (−)</span>
            <span className="text-2xl font-extrabold font-mono-numbers text-red-950 block mt-1">
              −₹{summary.cash_expenses.toFixed(2)}
            </span>
            <span className="text-[11px] text-red-700 block">Carry bags, repair, wages in cash</span>
          </div>
        </div>

        {/* Other Sales Channels (Non-Cash) */}
        <div className="p-3 bg-slate-50 rounded-lg text-xs flex flex-wrap items-center justify-between gap-4 text-slate-600">
          <span className="font-semibold text-slate-700">Digital / Credit Sales Today (Bank & Ledger):</span>
          <div className="flex items-center gap-6 font-mono-numbers">
            <span>
              UPI / QR: <strong>₹{summary.upi_sales.toFixed(2)}</strong>
            </span>
            <span>
              Card: <strong>₹{summary.card_sales.toFixed(2)}</strong>
            </span>
            <span>
              Udhaar Added: <strong>₹{summary.credit_sales.toFixed(2)}</strong>
            </span>
          </div>
        </div>

        {/* Expected vs Actual Cash Counter */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-slate-200">
          {/* Expected Cash Box */}
          <div className="p-4 bg-slate-900 text-white rounded-xl">
            <span className="text-xs text-slate-400 block font-medium">EXPECTED DRAWER CASH</span>
            <span className="text-3xl font-extrabold font-mono-numbers mt-1 block tracking-tight">
              ₹{calculatedExpected.toFixed(2)}
            </span>
            <span className="text-[11px] text-slate-400 mt-1 block">
              Formula: {openingFloatInput} + {summary.cash_sales} + {summary.cash_from_dues} − {summary.cash_expenses}
            </span>
          </div>

          {/* Actual Cash Input */}
          <div className="p-4 bg-white border-2 border-slate-300 rounded-xl space-y-1">
            <label className="text-xs font-bold text-slate-800 block">ACTUAL COUNTED CASH (₹)</label>
            <div className="flex items-center gap-1 mt-1">
              <span className="text-lg font-bold text-slate-400">₹</span>
              <input
                type="number"
                step="0.01"
                disabled={summary.status === 'closed'}
                value={actualCashInput}
                onChange={e => setActualCashInput(parseFloat(e.target.value) || 0)}
                className="w-full text-2xl font-bold font-mono-numbers p-1 border-b-2 border-slate-900 focus:outline-none disabled:border-slate-200 disabled:text-slate-500"
              />
            </div>
            <span className="text-[11px] text-slate-500 block">Physical count of notes & coins</span>
          </div>

          {/* Variance / Difference */}
          <div
            className={`p-4 rounded-xl border flex flex-col justify-between ${
              variance === 0
                ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                : variance > 0
                ? 'bg-blue-50 border-blue-300 text-blue-950'
                : 'bg-red-50 border-red-300 text-red-950'
            }`}
          >
            <div>
              <span className="text-xs font-bold block uppercase tracking-wider">
                Variance / Discrepancy
              </span>
              <span className="text-3xl font-black font-mono-numbers mt-1 block">
                {variance > 0 ? `+₹${variance}` : variance < 0 ? `-₹${Math.abs(variance)}` : '₹0.00 Exact Match!'}
              </span>
            </div>
            <span className="text-[11px] opacity-80 mt-2 block">
              {variance === 0
                ? '✓ Drawer tally perfectly balanced.'
                : variance > 0
                ? 'Surplus cash in drawer.'
                : 'Shortage of cash in drawer.'}
            </span>
          </div>
        </div>

        {/* Closing Notes & Submit Action */}
        <div className="pt-2 space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Daily Closing Remarks / Note
            </label>
            <input
              type="text"
              disabled={summary.status === 'closed'}
              placeholder="e.g. All counts verified, ₹200 denomination shortage explained by..."
              value={closingNote}
              onChange={e => setClosingNote(e.target.value)}
              className="w-full text-xs p-2.5 border border-slate-200 rounded-lg bg-slate-50 disabled:bg-slate-100"
            />
          </div>

          <div className="flex justify-end pt-2">
            {summary.status === 'open' ? (
              <button
                type="button"
                onClick={handleCloseDay}
                className="px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2"
              >
                <Lock className="w-4 h-4" />
                <span>Save Closing & Lock Day</span>
              </button>
            ) : (
              <div className="flex items-center gap-2 text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 px-4 py-2 rounded-lg font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Day was locked by {summary.status === 'closed' ? 'Owner / Manager' : ''}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Historical Daily Closings Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-200">
          <h4 className="font-semibold text-slate-900 text-xs">Past Closing History</h4>
        </div>
        <table className="w-full text-left text-xs font-mono-numbers">
          <thead>
            <tr className="bg-slate-50 text-slate-500 border-b border-slate-200 font-sans">
              <th className="py-2.5 px-4">Date</th>
              <th className="py-2.5 px-4 text-right">Opening Float</th>
              <th className="py-2.5 px-4 text-right">Cash Sales</th>
              <th className="py-2.5 px-4 text-right">Dues Recd</th>
              <th className="py-2.5 px-4 text-right">Cash Exp</th>
              <th className="py-2.5 px-4 text-right">Expected</th>
              <th className="py-2.5 px-4 text-right">Actual</th>
              <th className="py-2.5 px-4 text-right">Variance</th>
              <th className="py-2.5 px-4">Closed By</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {dailyClosings.map(c => (
              <tr key={c.id} className="hover:bg-slate-50">
                <td className="py-2.5 px-4 font-semibold text-slate-900 font-sans">
                  {c.business_date}
                </td>
                <td className="py-2.5 px-4 text-right text-slate-600">₹{c.opening_cash}</td>
                <td className="py-2.5 px-4 text-right text-emerald-600">+₹{c.cash_sales}</td>
                <td className="py-2.5 px-4 text-right text-blue-600">+₹{c.cash_from_dues}</td>
                <td className="py-2.5 px-4 text-right text-red-600">−₹{c.cash_expenses}</td>
                <td className="py-2.5 px-4 text-right font-bold text-slate-800">₹{c.expected_cash}</td>
                <td className="py-2.5 px-4 text-right font-bold text-slate-900">₹{c.actual_cash}</td>
                <td className="py-2.5 px-4 text-right">
                  <span
                    className={`font-bold px-1.5 py-0.5 rounded text-[11px] ${
                      c.difference === 0
                        ? 'text-emerald-700 bg-emerald-50'
                        : 'text-red-700 bg-red-50'
                    }`}
                  >
                    {c.difference === 0 ? 'Exact' : `₹${c.difference}`}
                  </span>
                </td>
                <td className="py-2.5 px-4 text-slate-500 font-sans">{c.closed_by_name}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Owner Re-open Modal */}
      {showReopenModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-5 space-y-4">
            <div className="flex items-center gap-2 text-amber-900">
              <Unlock className="w-5 h-5 text-amber-600" />
              <h3 className="font-bold text-sm text-slate-900">Re-open Locked Day {selectedDate}?</h3>
            </div>
            <p className="text-xs text-slate-600">
              Re-opening allows cashiers to make further entries or cancellations. This action is permanently audited.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Mandatory Reason for Re-opening *
              </label>
              <textarea
                rows={2}
                required
                placeholder="e.g. Need to enter late evening loose milk crate sale..."
                value={reopenReason}
                onChange={e => setReopenReason(e.target.value)}
                className="w-full text-xs p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 text-xs">
              <button
                type="button"
                onClick={() => setShowReopenModal(false)}
                className="px-3 py-1.5 text-slate-600 hover:text-slate-900"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!reopenReason.trim()}
                onClick={handleConfirmReopen}
                className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg disabled:opacity-50"
              >
                Confirm & Re-open
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
