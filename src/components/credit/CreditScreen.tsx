import React, { useState, useMemo } from 'react';
import { useDairy } from '../../context/DairyContext';
import { Customer, CustomerLedgerEntry } from '../../types';
import { useLanguage } from '../../i18n/LanguageContext';
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
    addCustomerDues,
    addCustomer,
    updateCustomer,
    can,
  } = useDairy();
  const { t, tx } = useLanguage();

  // Add Udhaar (manual dues) Modal
  const [showAddDuesModal, setShowAddDuesModal] = useState(false);
  const [duesCustomerId, setDuesCustomerId] = useState('');
  const [duesSearch, setDuesSearch] = useState('');
  const [duesAmount, setDuesAmount] = useState<number>(0);
  const [duesNote, setDuesNote] = useState('');
  const [duesError, setDuesError] = useState<string | null>(null);
  const [isSavingDues, setIsSavingDues] = useState(false);

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
      setPaymentError(t('credit.err.paymentAmount'));
      return;
    }

    const res = await recordCustomerPayment(
      paymentCustomer.id,
      paymentAmount,
      paymentMode,
      paymentNote || `Received ₹${paymentAmount} via ${paymentMode.toUpperCase()}`
    );

    if (!res.success) {
      setPaymentError(res.error || t('credit.err.paymentFailed'));
      return;
    }

    setPaymentCustomer(null);
    setPaymentAmount(0);
    setPaymentNote('');
  };

  const duesCustomer = customers.find(c => c.id === duesCustomerId) || null;

  const duesCustomerOptions = useMemo(() => {
    const q = duesSearch.toLowerCase().trim();
    return customers
      .filter(c => c.active !== false)
      .filter(c => !q || c.name.toLowerCase().includes(q) || c.mobile.includes(q))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [customers, duesSearch]);

  const openAddDuesModal = () => {
    setDuesCustomerId('');
    setDuesSearch('');
    setDuesAmount(0);
    setDuesNote('');
    setDuesError(null);
    setShowAddDuesModal(true);
  };

  const handleConfirmAddDues = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSavingDues) return;
    setDuesError(null);

    if (!duesCustomer) {
      setDuesError(t('credit.err.selectCustomer'));
      return;
    }
    if (duesAmount <= 0) {
      setDuesError(t('credit.err.amount'));
      return;
    }
    if (!duesNote.trim()) {
      setDuesError(t('credit.err.note'));
      return;
    }

    setIsSavingDues(true);
    const res = await addCustomerDues(duesCustomer.id, duesAmount, duesNote);
    setIsSavingDues(false);

    if (!res.success) {
      setDuesError(res.error || t('credit.err.addFailed'));
      return;
    }
    setShowAddDuesModal(false);
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
      alert(res.error || t('credit.err.customerFailed'));
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
            {t('credit.title')}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            {t('credit.subtitle')}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          {can('add_customers') && (
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>{t('credit.newCustomer')}</span>
          </button>
          )}
          {can('add_udhaar') && (
          <button
            type="button"
            onClick={openAddDuesModal}
            className="flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>{t('credit.addUdhaar')}</span>
          </button>
          )}
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl shadow-2xs">
          <span className="text-xs text-amber-800 font-medium block">{t('credit.kpi.outstanding')}</span>
          <span className="text-2xl font-extrabold font-mono-numbers text-amber-950 mt-1 block">
            ₹{totalOutstandingDues.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </span>
          <span className="text-[11px] text-amber-700 mt-0.5 block">
            {t('credit.kpi.outstandingHint')}
          </span>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-2xs">
          <span className="text-xs text-slate-500 font-medium block">{t('credit.kpi.customers')}</span>
          <span className="text-2xl font-bold font-mono-numbers text-slate-900 mt-1 block">
            {customers.length}
          </span>
          <span className="text-[11px] text-slate-400 mt-0.5 block">
            {t('credit.kpi.withDues', { count: customers.filter(c => c.current_dues > 0).length })}
          </span>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-2xs">
          <span className="text-xs text-slate-500 font-medium block">{t('credit.kpi.cashRule')}</span>
          <p className="text-xs text-slate-700 mt-1 leading-snug">
            {t('credit.kpi.cashRuleBefore')} <strong>{t('credit.kpi.cashRuleStrong')}</strong>{' '}
            {t('credit.kpi.cashRuleAfter')}
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
              placeholder={t('credit.searchPlaceholder')}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-lg bg-slate-50"
            />
          </div>

          <span className="text-slate-500 text-xs self-start sm:self-auto">
            {t('credit.sortedHint')}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-500 border-b border-slate-200">
                <th className="py-3 px-4 font-semibold">{t('credit.col.name')}</th>
                <th className="py-3 px-4 font-semibold">{t('credit.col.mobile')}</th>
                <th className="py-3 px-4 font-semibold">{t('credit.col.address')}</th>
                <th className="py-3 px-4 text-right font-semibold">{t('credit.col.limit')}</th>
                <th className="py-3 px-4 text-right font-semibold">{t('credit.col.dues')}</th>
                <th className="py-3 px-4 text-center font-semibold">{t('common.actions')}</th>
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
                    {cust.credit_limit ? `₹${cust.credit_limit.toFixed(2)}` : t('credit.noLimit')}
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
                      {can('receive_payments') && (
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
                        <span>{t('credit.receivePayment')}</span>
                      </button>
                      )}

                      {/* Passbook / Ledger Statement Button */}
                      <button
                        type="button"
                        onClick={() => setSelectedCustomer(cust)}
                        className="px-2.5 py-1 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-md transition-colors flex items-center gap-1"
                      >
                        <BookOpen className="w-3.5 h-3.5 text-slate-500" />
                        <span>{t('credit.passbook')}</span>
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
                  {t('credit.statementTitle', { name: selectedCustomer.name })}
                </h3>
                <p className="text-xs text-slate-500 font-mono-numbers">
                  {t('credit.statementMeta', { mobile: selectedCustomer.mobile })} <strong>₹{selectedCustomer.current_dues}</strong>
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
                    <th className="py-2 px-3">{t('common.date')}</th>
                    <th className="py-2 px-3">{t('credit.col.type')}</th>
                    <th className="py-2 px-3">{t('credit.col.refNote')}</th>
                    <th className="py-2 px-3 text-right">{t('credit.col.debit')}</th>
                    <th className="py-2 px-3 text-right">{t('credit.col.credit')}</th>
                    <th className="py-2 px-3 text-right">{t('credit.col.balance')}</th>
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
                            ? t('credit.entry.creditBill')
                            : entry.type === 'payment'
                            ? t('credit.entry.paymentRecd')
                            : entry.type === 'adjustment' && entry.amount > 0
                            ? t('credit.entry.udhaarAdded')
                            : tx(`ledger.${entry.type}`, entry.type)}
                        </td>
                        <td className="py-2 px-3 font-sans text-slate-600 text-[11px]">
                          {entry.invoice_no ? t('credit.invoice', { no: entry.invoice_no }) : entry.note || '—'}
                          {entry.payment_method &&
                            ` (${tx(`payment.${entry.payment_method}`, entry.payment_method).toUpperCase()})`}
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
                {t('credit.limitLabel', {
                  limit: selectedCustomer.credit_limit ? `₹${selectedCustomer.credit_limit}` : t('credit.none'),
                })}
              </span>
              <button
                type="button"
                onClick={() => setSelectedCustomer(null)}
                className="px-4 py-1.5 text-xs font-semibold bg-slate-900 text-white rounded-lg"
              >
                {t('credit.closeStatement')}
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
              <h3 className="font-bold text-slate-900 text-base">{t('credit.paymentTitle')}</h3>
              <p className="text-xs text-slate-600 mt-0.5">
                {t('credit.from')} <strong>{paymentCustomer.name}</strong>
              </p>
              <p className="text-xs text-amber-800 bg-amber-50 p-1.5 rounded mt-1 font-mono-numbers">
                {t('credit.pendingDues')} <strong>₹{paymentCustomer.current_dues.toFixed(2)}</strong>
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
                  {t('credit.amountReceived')}
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
                <label className="block text-slate-700 font-semibold mb-1">{t('credit.paymentMethod')}</label>
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
                    <span>{t('payment.cash')}</span>
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
                    <span>{t('credit.upiQr')}</span>
                  </button>
                </div>
                {paymentMode === 'cash' && (
                  <p className="text-[11px] text-slate-500 mt-1">
                    {t('credit.cashHint')}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">{t('credit.noteOptional')}</label>
                <input
                  type="text"
                  placeholder={t('credit.paymentNotePlaceholder')}
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
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-sm"
                >
                  {t('credit.recordPayment', { amount: paymentAmount || 0 })}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Udhaar (manual dues) Modal */}
      {showAddDuesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-5 space-y-4">
            <div>
              <h3 className="font-bold text-slate-900 text-base">{t('credit.addUdhaar')}</h3>
              <p className="text-xs text-slate-600 mt-0.5">
                {t('credit.duesSubtitle')}
              </p>
            </div>

            {duesError && (
              <p className="text-xs text-red-600 bg-red-50 p-2 rounded border border-red-200">{duesError}</p>
            )}

            <form onSubmit={handleConfirmAddDues} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">{t('credit.customerReq')}</label>
                {duesCustomer ? (
                  <div className="flex items-center justify-between p-2 border border-slate-200 rounded-lg bg-slate-50">
                    <div>
                      <span className="font-semibold text-slate-900 block">{duesCustomer.name}</span>
                      <span className="font-mono-numbers text-slate-500">
                        {t('credit.duesMeta', {
                          mobile: duesCustomer.mobile,
                          dues: duesCustomer.current_dues.toFixed(2),
                        })}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setDuesCustomerId('')}
                      className="text-slate-500 hover:text-slate-900 font-medium"
                    >
                      {t('credit.change')}
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        autoFocus
                        placeholder={t('credit.duesSearchPlaceholder')}
                        value={duesSearch}
                        onChange={e => setDuesSearch(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg"
                      />
                    </div>
                    <div className="mt-1 max-h-40 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100">
                      {duesCustomerOptions.map(c => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => setDuesCustomerId(c.id)}
                          className="w-full text-left px-3 py-2 hover:bg-slate-50 flex justify-between gap-2"
                        >
                          <span className="font-medium text-slate-800 truncate">{c.name}</span>
                          <span className="font-mono-numbers text-slate-500 whitespace-nowrap">
                            ₹{c.current_dues.toFixed(2)}
                          </span>
                        </button>
                      ))}
                      {duesCustomerOptions.length === 0 && (
                        <p className="px-3 py-2 text-slate-500">
                          {t('credit.noCustomer')}
                        </p>
                      )}
                    </div>
                  </>
                )}
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">{t('credit.amountReq')}</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  min="0.01"
                  value={duesAmount || ''}
                  onChange={e => setDuesAmount(parseFloat(e.target.value) || 0)}
                  className="w-full p-2.5 border border-slate-200 rounded-lg text-sm font-bold font-mono-numbers"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">{t('credit.noteReq')}</label>
                <input
                  type="text"
                  required
                  placeholder={t('credit.duesNotePlaceholder')}
                  value={duesNote}
                  onChange={e => setDuesNote(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg"
                />
              </div>

              {duesCustomer && duesAmount > 0 && (
                <p className="text-xs text-amber-800 bg-amber-50 p-1.5 rounded font-mono-numbers">
                  {t('credit.newDues')} <strong>₹{(duesCustomer.current_dues + duesAmount).toFixed(2)}</strong>
                  {duesCustomer.credit_limit ? t('credit.limitSuffix', { limit: duesCustomer.credit_limit }) : ''}
                </p>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddDuesModal(false)}
                  className="px-3 py-1.5 text-slate-600 hover:text-slate-900"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isSavingDues}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg shadow-sm disabled:opacity-60"
                >
                  {isSavingDues ? t('credit.saving') : t('credit.addUdhaarAmount', { amount: duesAmount || 0 })}
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
            <h3 className="font-bold text-slate-900 text-base">{t('credit.newCustomer')}</h3>
            <form onSubmit={handleCreateCustomer} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">{t('credit.custName')}</label>
                <input
                  type="text"
                  required
                  placeholder={t('credit.custNamePlaceholder')}
                  value={newCustName}
                  onChange={e => setNewCustName(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-semibold mb-1">{t('credit.mobileNumber')}</label>
                <input
                  type="tel"
                  placeholder="98XXXXXXXX"
                  value={newCustMobile}
                  onChange={e => setNewCustMobile(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg font-mono-numbers"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-semibold mb-1">{t('credit.addressLandmark')}</label>
                <input
                  type="text"
                  placeholder={t('credit.addressPlaceholder')}
                  value={newCustAddress}
                  onChange={e => setNewCustAddress(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">{t('credit.creditLimit')}</label>
                  <input
                    type="number"
                    placeholder={t('credit.limitPlaceholder')}
                    value={newCustLimit}
                    onChange={e => setNewCustLimit(e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg font-mono-numbers"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">{t('credit.openingDues')}</label>
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
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-slate-900 text-white font-semibold rounded-lg hover:bg-slate-800"
                >
                  {t('credit.saveCustomer')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
