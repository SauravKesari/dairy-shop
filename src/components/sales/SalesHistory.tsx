import React, { useState, useMemo } from 'react';
import { useDairy } from '../../context/DairyContext';
import { Sale } from '../../types';
import { ReceiptModal } from '../pos/ReceiptModal';
import {
  Search,
  Filter,
  Eye,
  Ban,
  Calendar,
  AlertCircle,
  CheckCircle2,
  XCircle,
  FileSpreadsheet,
} from 'lucide-react';

export const SalesHistory: React.FC = () => {
  const { sales, currentUser, currentBusinessDate, cancelSale, isDateClosed } = useDairy();

  const [dateFilter, setDateFilter] = useState<string>(currentBusinessDate);
  const [cashierFilter, setCashierFilter] = useState<string>('all');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchInvoice, setSearchInvoice] = useState<string>('');

  // Selected for view/re-print
  const [activeReceiptSale, setActiveReceiptSale] = useState<Sale | null>(null);

  // Cancellation modal
  const [cancellingSale, setCancellingSale] = useState<Sale | null>(null);
  const [cancelReason, setCancelReason] = useState<string>('');
  const [cancelError, setCancelError] = useState<string | null>(null);

  const filteredSales = useMemo(() => {
    return sales.filter(s => {
      const matchesDate = !dateFilter || s.business_date === dateFilter;
      const matchesCashier = cashierFilter === 'all' || s.created_by === cashierFilter;
      const matchesPayment = paymentFilter === 'all' || s.payment_method === paymentFilter;
      const matchesStatus = statusFilter === 'all' || s.status === statusFilter;
      const matchesSearch =
        !searchInvoice ||
        s.invoice_no.toLowerCase().includes(searchInvoice.toLowerCase()) ||
        (s.customer_name && s.customer_name.toLowerCase().includes(searchInvoice.toLowerCase()));
      return matchesDate && matchesCashier && matchesPayment && matchesStatus && matchesSearch;
    });
  }, [sales, dateFilter, cashierFilter, paymentFilter, statusFilter, searchInvoice]);

  const totalSalesAmount = filteredSales
    .filter(s => s.status === 'completed')
    .reduce((sum, s) => sum + s.total, 0);

  const handleConfirmCancel = () => {
    if (!cancellingSale) return;
    setCancelError(null);

    const res = cancelSale(cancellingSale.id, cancelReason);
    if (!res.success) {
      setCancelError(res.error || 'Failed to cancel sale');
      return;
    }

    setCancellingSale(null);
    setCancelReason('');
  };

  const cashiersList = useMemo(() => {
    const map = new Map<string, string>();
    sales.forEach(s => {
      map.set(s.created_by, s.created_by_name);
    });
    return Array.from(map.entries());
  }, [sales]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Title & Summary Strip */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">
            Sales & Billing History
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Browse and review issued invoices, reprint thermal bills, or initiate audited cancellations
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-xs">
            <span className="text-slate-500">Filtered Net Sales:</span>{' '}
            <span className="font-extrabold font-mono-numbers text-slate-900 text-sm">
              ₹{totalSalesAmount.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 text-xs">
          {/* Date Picker */}
          <div>
            <label className="block text-slate-500 mb-1 font-medium">Business Date</label>
            <div className="relative">
              <input
                type="date"
                value={dateFilter}
                onChange={e => setDateFilter(e.target.value)}
                className="w-full pl-8 pr-2 py-1.5 border border-slate-200 rounded-lg bg-slate-50 font-mono-numbers"
              />
              <Calendar className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            </div>
          </div>

          {/* Search by Invoice / Customer */}
          <div>
            <label className="block text-slate-500 mb-1 font-medium">Search Bill / Customer</label>
            <div className="relative">
              <input
                type="text"
                placeholder="DP-2026-..."
                value={searchInvoice}
                onChange={e => setSearchInvoice(e.target.value)}
                className="w-full pl-8 pr-2 py-1.5 border border-slate-200 rounded-lg bg-slate-50"
              />
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            </div>
          </div>

          {/* Payment Method Filter */}
          <div>
            <label className="block text-slate-500 mb-1 font-medium">Payment Mode</label>
            <select
              value={paymentFilter}
              onChange={e => setPaymentFilter(e.target.value)}
              className="w-full py-1.5 px-2 border border-slate-200 rounded-lg bg-slate-50"
            >
              <option value="all">All Modes</option>
              <option value="cash">Cash</option>
              <option value="upi">UPI / QR</option>
              <option value="card">Card</option>
              <option value="credit">Udhaar (Credit)</option>
            </select>
          </div>

          {/* Cashier Filter */}
          <div>
            <label className="block text-slate-500 mb-1 font-medium">Billed By</label>
            <select
              value={cashierFilter}
              onChange={e => setCashierFilter(e.target.value)}
              className="w-full py-1.5 px-2 border border-slate-200 rounded-lg bg-slate-50"
            >
              <option value="all">All Staff</option>
              {cashiersList.map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-slate-500 mb-1 font-medium">Bill Status</label>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="w-full py-1.5 px-2 border border-slate-200 rounded-lg bg-slate-50"
            >
              <option value="all">All (Active & Cancelled)</option>
              <option value="completed">Completed Only</option>
              <option value="cancelled">Cancelled Only</option>
            </select>
          </div>
        </div>

        {/* Clear Filters Quick Action */}
        {(dateFilter !== currentBusinessDate ||
          cashierFilter !== 'all' ||
          paymentFilter !== 'all' ||
          statusFilter !== 'all' ||
          searchInvoice) && (
          <div className="flex justify-end pt-1">
            <button
              onClick={() => {
                setDateFilter(currentBusinessDate);
                setCashierFilter('all');
                setPaymentFilter('all');
                setStatusFilter('all');
                setSearchInvoice('');
              }}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium"
            >
              Reset to Today's Bills
            </button>
          </div>
        )}
      </div>

      {/* Sales Invoices Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-500 border-b border-slate-200">
                <th className="py-3 px-4 font-semibold">Invoice No</th>
                <th className="py-3 px-4 font-semibold">Date & Time</th>
                <th className="py-3 px-4 font-semibold">Customer</th>
                <th className="py-3 px-4 font-semibold">Items</th>
                <th className="py-3 px-4 font-semibold">Payment</th>
                <th className="py-3 px-4 text-right font-semibold">Total Amount</th>
                <th className="py-3 px-4 font-semibold">Billed By</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 px-4 text-center font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSales.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    No sales records found matching the selected criteria.
                  </td>
                </tr>
              ) : (
                filteredSales.map(sale => {
                  const isDayClosedForSale = isDateClosed(sale.business_date);
                  const isCashierBlocked =
                    currentUser.role === 'cashier' &&
                    (sale.business_date !== currentBusinessDate || isDayClosedForSale);

                  return (
                    <tr
                      key={sale.id}
                      className={`hover:bg-slate-50/70 transition-colors ${
                        sale.status === 'cancelled' ? 'bg-red-50/30' : ''
                      }`}
                    >
                      <td className="py-3 px-4 font-bold font-mono-numbers text-slate-900">
                        {sale.invoice_no}
                        {sale.is_offline_entry && (
                          <span className="block text-[10px] text-amber-600 font-normal">
                            Paper Bill {sale.offline_bill_ref ? `(${sale.offline_bill_ref})` : ''}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono-numbers text-slate-600 whitespace-nowrap">
                        {sale.business_date}{' '}
                        <span className="text-[11px] text-slate-400">
                          {new Date(sale.created_at).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-medium text-slate-800">
                          {sale.customer_name || 'Retail Walk-in'}
                        </span>
                        {sale.customer_mobile && (
                          <span className="block text-[11px] text-slate-400 font-mono-numbers">
                            {sale.customer_mobile}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        <span className="font-mono-numbers">{sale.items.length} items</span>
                        <span className="block text-[11px] text-slate-400 truncate max-w-[140px]">
                          {sale.items.map(i => `${i.qty} ${i.product_name}`).join(', ')}
                        </span>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`font-semibold uppercase text-[11px] px-2 py-0.5 rounded ${
                            sale.payment_method === 'cash'
                              ? 'bg-emerald-50 text-emerald-700'
                              : sale.payment_method === 'upi'
                              ? 'bg-blue-50 text-blue-700'
                              : sale.payment_method === 'credit'
                              ? 'bg-amber-50 text-amber-800'
                              : 'bg-purple-50 text-purple-700'
                          }`}
                        >
                          {sale.payment_method === 'credit' ? 'Udhaar' : sale.payment_method}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-extrabold font-mono-numbers text-slate-900 whitespace-nowrap">
                        ₹{sale.total.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-slate-600">{sale.created_by_name}</td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {sale.status === 'completed' ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Paid</span>
                          </span>
                        ) : (
                          <div>
                            <span className="inline-flex items-center gap-1 text-red-600 font-medium">
                              <XCircle className="w-3.5 h-3.5" />
                              <span>Cancelled</span>
                            </span>
                            {sale.cancel_reason && (
                              <span className="block text-[10px] text-red-500 max-w-[130px] truncate" title={sale.cancel_reason}>
                                {sale.cancel_reason}
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* View / Print Receipt */}
                          <button
                            type="button"
                            onClick={() => setActiveReceiptSale(sale)}
                            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
                            title="View / Print Receipt"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Cancel Bill (Audited) */}
                          {sale.status === 'completed' && (
                            <button
                              type="button"
                              onClick={() => {
                                setCancellingSale(sale);
                                setCancelReason('');
                                setCancelError(null);
                              }}
                              disabled={isCashierBlocked}
                              className={`p-1.5 rounded-md transition-colors ${
                                isCashierBlocked
                                  ? 'text-slate-300 cursor-not-allowed'
                                  : 'text-red-500 hover:text-red-700 hover:bg-red-50'
                              }`}
                              title={
                                isCashierBlocked
                                  ? 'Cashiers cannot cancel past or closed-day sales. Owner required.'
                                  : 'Cancel Sale & Reverse Stock'
                              }
                            >
                              <Ban className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Cancellation Confirmation Modal */}
      {cancellingSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-5 space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-red-100 rounded-lg text-red-700 shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">
                  Cancel Bill {cancellingSale.invoice_no}?
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Amount: ₹{cancellingSale.total.toFixed(2)} · Payment: {cancellingSale.payment_method.toUpperCase()}
                </p>
              </div>
            </div>

            <div className="p-3 bg-amber-50 rounded-lg text-amber-900 text-xs space-y-1">
              <p className="font-semibold">Business Rule Enforcement:</p>
              <ul className="list-disc pl-4 space-y-0.5 text-[11px] text-amber-800">
                <li>Bill is never deleted; status changes to Cancelled.</li>
                <li>Stock for all {cancellingSale.items.length} items will be reversed automatically.</li>
                {cancellingSale.payment_method === 'credit' && (
                  <li>Customer Udhaar dues will be reduced by ₹{cancellingSale.total.toFixed(2)}.</li>
                )}
                <li>Action is recorded permanently in the system audit log.</li>
              </ul>
            </div>

            {cancelError && (
              <p className="text-xs text-red-600 bg-red-50 p-2 rounded border border-red-200">
                {cancelError}
              </p>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Mandatory Cancellation Reason *
              </label>
              <textarea
                required
                rows={2}
                placeholder="e.g. Customer returned items / Milk pouch leaked / Wrong bill entry..."
                value={cancelReason}
                onChange={e => setCancelReason(e.target.value)}
                className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setCancellingSale(null)}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900"
              >
                Keep Bill
              </button>
              <button
                type="button"
                disabled={!cancelReason.trim()}
                onClick={handleConfirmCancel}
                className="px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50"
              >
                Confirm Cancellation & Reversal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Receipt Modal */}
      {activeReceiptSale && (
        <ReceiptModal sale={activeReceiptSale} onClose={() => setActiveReceiptSale(null)} />
      )}
    </div>
  );
};
