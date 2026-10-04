import React, { useState, useMemo } from 'react';
import { useDairy } from '../../context/DairyContext';
import { Customer, CustomerLedgerEntry } from '../../types';
import {
  Users,
  Search,
  Plus,
  ArrowDownLeft,
  BookOpen,
  CreditCard,
  Phone,
  Banknote,
  QrCode,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

export const CreditScreen: React.FC = () => {
  const {
    customers,
    customerLedger,
    recordCustomerPayment,
    addCustomer,
    updateCustomer,
  } = useDairy();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  // Receive Payment Modal
  const [paymentCustomer, setPaymentCustomer] = useState<Customer | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMode, setPaymentMode] = useState<'cash' | 'upi'>('cash');
  const [paymentNote, setPaymentNote] = useState<string>('');
  const [paymentError, setPaymentError] = useState<string | null>(null);

  // New Customer Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustMobile, setNewCustMobile] = useState('');
  const [newCustAddress, setNewCustAddress] = useState('');
  const [newCustLimit, setNewCustLimit] = useState('');
  const [newCustOpeningDue, setNewCustOpeningDue] = useState('');

  const sortedCustomers = useMemo(() => {
    return [...customers]
      .filter(c => {
        const q = searchQuery.toLowerCase().trim();
        return !q || c.name.toLowerCase().includes(q) || c.mobile.includes(q);
      })
      .sort((a, b) => b.current_dues - a.current_dues);
  }, [customers, searchQuery]);

  const totalOutstandingDues = customers.reduce((sum, c) => sum + c.current_dues, 0);

  const handleConfirmPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentCustomer) return;
    setPaymentError(null);

    if (paymentAmount <= 0) {
      setPaymentError('Payment amount must be greater than ₹0.');
      return;
    }

    const res = await recordCustomerPayment(
      paymentCustomer.id,
      paymentAmount,
      paymentMode,
      paymentNote || `Received ₹${paymentAmount} via ${paymentMode.toUpperCase()}`
    );

    if (!res.success) {
      setPaymentError(res.error || 'Failed to record payment');
      return;
    }

    setPaymentCustomer(null);
    setPaymentAmount(0);
    setPaymentNote('');
  };

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName.trim()) return;

    const limit = newCustLimit ? parseFloat(newCustLimit) : null;
    const opening = newCustOpeningDue ? parseFloat(newCustOpeningDue) : 0;

    const res = await addCustomer(
      {
        name: newCustName.trim(),
        mobile: newCustMobile.trim() || '9800000000',
        address: newCustAddress.trim(),
        credit_limit: limit,
      },
      opening
    );
    if (!res.success) {
      alert(res.error || 'Failed to add customer');
      return;
    }

    setShowAddModal(false);
    setNewCustName('');
    setNewCustMobile('');
    setNewCustAddress('');
    setNewCustLimit('');
    setNewCustOpeningDue('');
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">
            Customer Credit (Udhaar) Ledger
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Track customer dues, credit limits, passbook statements and record repayments into daily cash
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Udhaar Customer</span>
        </button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl shadow-2xs">
          <span className="text-xs text-amber-800 font-medium block">Total Outstanding Udhaar</span>
          <span className="text-2xl font-extrabold font-mono-numbers text-amber-950 mt-1 block">
            ₹{totalOutstandingDues.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </span>
          <span className="text-[11px] text-amber-700 mt-0.5 block">
            Credit given to regular tea stalls, bakers & neighbours
          </span>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-2xs">
          <span className="text-xs text-slate-500 font-medium block">Registered Credit Customers</span>
          <span className="text-2xl font-bold font-mono-numbers text-slate-900 mt-1 block">
            {customers.length}
          </span>
          <span className="text-[11px] text-slate-400 mt-0.5 block">
            {customers.filter(c => c.current_dues > 0).length} with active pending dues
          </span>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-2xs">
          <span className="text-xs text-slate-500 font-medium block">Cash Impact Rule</span>
          <p className="text-xs text-slate-700 mt-1 leading-snug">
            Cash collected from customer dues directly adds to your <strong>Expected Cash Float</strong> during daily closing.
          </p>
        </div>
      </div>

      {/* Customer List & Search */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden space-y-3">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="relative w-full sm:w-80">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by customer name or phone..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-lg bg-slate-50"
            />
          </div>

          <span className="text-slate-500 text-xs self-start sm:self-auto">
            Sorted by highest dues first
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-500 border-b border-slate-200">
                <th className="py-3 px-4 font-semibold">Customer Name</th>
                <th className="py-3 px-4 font-semibold">Mobile</th>
                <th className="py-3 px-4 font-semibold">Address</th>
                <th className="py-3 px-4 text-right font-semibold">Credit Limit</th>
                <th className="py-3 px-4 text-right font-semibold">Current Dues (Udhaar)</th>
                <th className="py-3 px-4 text-center font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedCustomers.map(cust => (
                <tr key={cust.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3 px-4 font-semibold text-slate-900">{cust.name}</td>
                  <td className="py-3 px-4 font-mono-numbers text-slate-600">{cust.mobile}</td>
                  <td className="py-3 px-4 text-slate-500 text-[11px] max-w-[160px] truncate">
                    {cust.address || '—'}
                  </td>
                  <td className="py-3 px-4 text-right font-mono-numbers text-slate-600">
                    {cust.credit_limit ? `₹${cust.credit_limit.toFixed(2)}` : 'No Limit'}
                  </td>
                  <td className="py-3 px-4 text-right whitespace-nowrap">
                    <span
                      className={`font-extrabold font-mono-numbers px-2.5 py-0.5 rounded text-xs ${
                        cust.current_dues > 0
                          ? 'bg-amber-100 text-amber-900'
                          : 'bg-emerald-50 text-emerald-700'
                      }`}
                    >
                      ₹{cust.current_dues.toFixed(2)}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center whitespace-nowrap">
                    <div className="flex items-center justify-center gap-2">
                      {/* Receive Payment Button */}
                      <button
                        type="button"
                        onClick={() => {
                          setPaymentCustomer(cust);
                          setPaymentAmount(cust.current_dues > 0 ? cust.current_dues : 0);
                          setPaymentNote('');
                          setPaymentError(null);
                        }}
                        className="px-2.5 py-1 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-md shadow-2xs transition-colors flex items-center gap-1"
                      >
                        <ArrowDownLeft className="w-3.5 h-3.5" />
                        <span>Receive Payment</span>
                      </button>

                      {/* Passbook / Ledger Statement Button */}
                      <button
                        type="button"
                        onClick={() => setSelectedCustomer(cust)}
                        className="px-2.5 py-1 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-md transition-colors flex items-center gap-1"
                      >
                        <BookOpen className="w-3.5 h-3.5 text-slate-500" />
                        <span>Passbook</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Customer Passbook Modal */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-6 space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-base">
                  {selectedCustomer.name} — Statement / Passbook
                </h3>
                <p className="text-xs text-slate-500 font-mono-numbers">
                  Ph: {selectedCustomer.mobile} · Outstanding Balance: <strong>₹{selectedCustomer.current_dues}</strong>
                </p>
              </div>
              <button
                onClick={() => setSelectedCustomer(null)}
                className="text-slate-400 hover:text-slate-700 text-xl font-bold"
              >
                &times;
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 border-b">
                    <th className="py-2 px-3">Date</th>
                    <th className="py-2 px-3">Type</th>
                    <th className="py-2 px-3">Ref / Note</th>
                    <th className="py-2 px-3 text-right">Debit (+)</th>
                    <th className="py-2 px-3 text-right">Credit (-)</th>
                    <th className="py-2 px-3 text-right">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono-numbers">
                  {customerLedger
                    .filter(cl => cl.customer_id === selectedCustomer.id)
                    .map(entry => (
                      <tr key={entry.id} className="hover:bg-slate-50">
                        <td className="py-2 px-3 text-slate-600">
                          {new Date(entry.created_at).toLocaleDateString()}
                        </td>
                        <td className="py-2 px-3 font-sans capitalize font-medium">
                          {entry.type === 'credit_sale'
                            ? 'Credit Bill'
                            : entry.type === 'payment'
                            ? 'Payment Recd'
                            : entry.type}
                        </td>
                        <td className="py-2 px-3 font-sans text-slate-600 text-[11px]">
                          {entry.invoice_no ? `Invoice ${entry.invoice_no}` : entry.note || '—'}
                          {entry.payment_method && ` (${entry.payment_method.toUpperCase()})`}
                        </td>
                        <td className="py-2 px-3 text-right text-red-600 font-semibold">
                          {entry.amount > 0 ? `+₹${entry.amount.toFixed(2)}` : '—'}
                        </td>
                        <td className="py-2 px-3 text-right text-emerald-600 font-semibold">
                          {entry.amount < 0 ? `-₹${Math.abs(entry.amount).toFixed(2)}` : '—'}
                        </td>
                        <td className="py-2 px-3 text-right font-bold text-slate-900">
                          ₹{entry.balance_after.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between items-center pt-3 border-t">
              <span className="text-xs text-slate-500">
                Limit: {selectedCustomer.credit_limit ? `₹${selectedCustomer.credit_limit}` : 'None'}
              </span>
              <button
                type="button"
                onClick={() => setSelectedCustomer(null)}
                className="px-4 py-1.5 text-xs font-semibold bg-slate-900 text-white rounded-lg"
              >
                Close Statement
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Receive Payment Modal */}
      {paymentCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-5 space-y-4">
            <div>
              <h3 className="font-bold text-slate-900 text-base">Receive Udhaar Payment</h3>
              <p className="text-xs text-slate-600 mt-0.5">
                From: <strong>{paymentCustomer.name}</strong>
              </p>
              <p className="text-xs text-amber-800 bg-amber-50 p-1.5 rounded mt-1 font-mono-numbers">
                Current Pending Dues: <strong>₹{paymentCustomer.current_dues.toFixed(2)}</strong>
              </p>
            </div>

            {paymentError && (
              <p className="text-xs text-red-600 bg-red-50 p-2 rounded border border-red-200">
                {paymentError}
              </p>
            )}

            <form onSubmit={handleConfirmPayment} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Amount Received (₹) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  min="1"
                  value={paymentAmount || ''}
                  onChange={e => setPaymentAmount(parseFloat(e.target.value) || 0)}
                  className="w-full p-2.5 border border-slate-200 rounded-lg text-sm font-bold font-mono-numbers"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Payment Method *</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMode('cash')}
                    className={`py-2 px-3 rounded-lg border font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                      paymentMode === 'cash'
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <Banknote className="w-4 h-4" />
                    <span>Cash</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMode('upi')}
                    className={`py-2 px-3 rounded-lg border font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                      paymentMode === 'upi'
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <QrCode className="w-4 h-4" />
                    <span>UPI / QR</span>
                  </button>
                </div>
                {paymentMode === 'cash' && (
                  <p className="text-[11px] text-slate-500 mt-1">
                    Cash received will be tallied into today's expected cash closing.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Note (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Cleared morning tea bill..."
                  value={paymentNote}
                  onChange={e => setPaymentNote(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setPaymentCustomer(null)}
                  className="px-3 py-1.5 text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-sm"
                >
                  Record Payment (₹{paymentAmount || 0})
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Customer Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-5 space-y-3">
            <h3 className="font-bold text-slate-900 text-base">New Udhaar Customer</h3>
            <form onSubmit={handleCreateCustomer} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Customer Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Verma Ji Chai Stall"
                  value={newCustName}
                  onChange={e => setNewCustName(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Mobile Number</label>
                <input
                  type="tel"
                  placeholder="98XXXXXXXX"
                  value={newCustMobile}
                  onChange={e => setNewCustMobile(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg font-mono-numbers"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Address / Landmark</label>
                <input
                  type="text"
                  placeholder="e.g. Near Station Gate"
                  value={newCustAddress}
                  onChange={e => setNewCustAddress(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Credit Limit (₹)</label>
                  <input
                    type="number"
                    placeholder="e.g. 5000"
                    value={newCustLimit}
                    onChange={e => setNewCustLimit(e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg font-mono-numbers"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Opening Dues (₹)</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={newCustOpeningDue}
                    onChange={e => setNewCustOpeningDue(e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg font-mono-numbers"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-slate-900 text-white font-semibold rounded-lg hover:bg-slate-800"
                >
                  Save Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
