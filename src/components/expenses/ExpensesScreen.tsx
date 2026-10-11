import React, { useState, useMemo } from 'react';
import { useDairy } from '../../context/DairyContext';
import { Expense, ExpenseCategory } from '../../types';
import { Plus, Search, Calendar, Tag, Trash2, Edit3, AlertCircle } from 'lucide-react';

const CATEGORIES: ExpenseCategory[] = [
  'Rent',
  'Electricity',
  'Salary',
  'Transport',
  'Packaging',
  'Maintenance',
  'Internet',
  'Other',
];

export const ExpensesScreen: React.FC = () => {
  const {
    expenses,
    addExpense,
    updateExpense,
    deleteExpense,
    currentBusinessDate,
    currentUser,
    isDateClosed,
  } = useDairy();

  const [dateFilter, setDateFilter] = useState<string>(currentBusinessDate);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  // Form State
  const [expCategory, setExpCategory] = useState<ExpenseCategory>('Packaging');
  const [expAmount, setExpAmount] = useState<number>(0);
  const [expDate, setExpDate] = useState<string>(currentBusinessDate);
  const [expPaymentMethod, setExpPaymentMethod] = useState<'cash' | 'upi' | 'bank'>('cash');
  const [expDescription, setExpDescription] = useState<string>('');
  const [formError, setFormError] = useState<string | null>(null);

  const filteredExpenses = useMemo(() => {
    return expenses.filter(e => {
      const matchDate = !dateFilter || e.expense_date === dateFilter;
      const matchCat = categoryFilter === 'all' || e.category === categoryFilter;
      return matchDate && matchCat;
    });
  }, [expenses, dateFilter, categoryFilter]);

  const totalExpense = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  const cashExpense = filteredExpenses
    .filter(e => e.payment_method === 'cash')
    .reduce((sum, e) => sum + e.amount, 0);

  const handleOpenAdd = () => {
    setEditingExpense(null);
    setExpCategory('Packaging');
    setExpAmount(0);
    setExpDate(currentBusinessDate);
    setExpPaymentMethod('cash');
    setExpDescription('');
    setFormError(null);
    setShowAddModal(true);
  };

  const handleOpenEdit = (exp: Expense) => {
    if (currentUser.role === 'cashier' && exp.expense_date !== currentBusinessDate) {
      alert('Cashiers can only edit expenses recorded today.');
      return;
    }
    setEditingExpense(exp);
    setExpCategory(exp.category);
    setExpAmount(exp.amount);
    setExpDate(exp.expense_date);
    setExpPaymentMethod(exp.payment_method);
    setExpDescription(exp.description);
    setFormError(null);
    setShowAddModal(true);
  };

  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (expAmount <= 0) {
      setFormError('Expense amount must be greater than ₹0.');
      return;
    }

    if (currentUser.role === 'cashier' && isDateClosed(expDate)) {
      setFormError('Cannot enter expenses for a closed business day.');
      return;
    }

    if (editingExpense) {
      const res = await updateExpense(editingExpense.id, {
        category: expCategory,
        amount: expAmount,
        expense_date: expDate,
        payment_method: expPaymentMethod,
        description: expDescription,
      });
      if (!res.success) {
        setFormError(res.error || 'Failed to update expense');
        return;
      }
    } else {
      const res = await addExpense({
        category: expCategory,
        amount: expAmount,
        expense_date: expDate,
        payment_method: expPaymentMethod,
        description: expDescription,
      });
      if (!res.success) {
        setFormError(res.error || 'Failed to add expense');
        return;
      }
    }

    setShowAddModal(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this expense record?')) {
      const res = await deleteExpense(id);
      if (!res.success) {
        alert(res.error);
      }
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">
            Parlour Operational Expenses
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Track daily electricity, chiller power, staff wages, carry bags & maintenance costs
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenAdd}
          className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Expense</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs text-slate-500 block">Total Filtered Expenses</span>
          <span className="text-2xl font-bold font-mono-numbers text-slate-900 mt-1 block">
            ₹{totalExpense.toFixed(2)}
          </span>
          <span className="text-[11px] text-slate-400 mt-0.5 block">
            {filteredExpenses.length} entries for chosen filter
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs text-slate-500 block">Paid from Cash Float</span>
          <span className="text-2xl font-bold font-mono-numbers text-red-600 mt-1 block">
            ₹{cashExpense.toFixed(2)}
          </span>
          <span className="text-[11px] text-slate-400 mt-0.5 block">
            Deducted directly from daily expected drawer cash
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs text-slate-500 block">Bank / UPI Expenses</span>
          <span className="text-2xl font-bold font-mono-numbers text-blue-600 mt-1 block">
            ₹{(totalExpense - cashExpense).toFixed(2)}
          </span>
          <span className="text-[11px] text-slate-400 mt-0.5 block">
            Paid directly via UPI/Bank transfer
          </span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <input
              type="date"
              value={dateFilter}
              onChange={e => setDateFilter(e.target.value)}
              className="py-1.5 px-2 border border-slate-200 rounded-lg bg-slate-50 font-mono-numbers"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <Tag className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="py-1.5 px-3 border border-slate-200 rounded-lg bg-slate-50"
            >
              <option value="all">All Categories</option>
              {CATEGORIES.map(cat => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>

        {dateFilter && (
          <button
            onClick={() => setDateFilter('')}
            className="text-xs text-blue-600 hover:text-blue-800 font-medium"
          >
            Show All Dates
          </button>
        )}
      </div>

      {/* Expenses Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="bg-slate-50 text-slate-500 border-b border-slate-200">
              <th className="py-3 px-4 font-semibold">Date</th>
              <th className="py-3 px-4 font-semibold">Category</th>
              <th className="py-3 px-4 font-semibold">Description</th>
              <th className="py-3 px-4 font-semibold">Payment Mode</th>
              <th className="py-3 px-4 text-right font-semibold">Amount</th>
              <th className="py-3 px-4 font-semibold">Recorded By</th>
              <th className="py-3 px-4 text-center font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-mono-numbers">
            {filteredExpenses.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-400 font-sans">
                  No expenses recorded for this date or category.
                </td>
              </tr>
            ) : (
              filteredExpenses.map(exp => (
                <tr key={exp.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3 px-4 text-slate-600 whitespace-nowrap">{exp.expense_date}</td>
                  <td className="py-3 px-4 font-sans font-semibold text-slate-900">
                    <span className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded text-[11px]">
                      {exp.category}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-sans text-slate-700">{exp.description}</td>
                  <td className="py-3 px-4 font-sans uppercase font-medium text-[11px] text-slate-600">
                    {exp.payment_method}
                  </td>
                  <td className="py-3 px-4 text-right font-bold text-slate-900 whitespace-nowrap">
                    ₹{exp.amount.toFixed(2)}
                  </td>
                  <td className="py-3 px-4 font-sans text-slate-500">{exp.created_by_name}</td>
                  <td className="py-3 px-4 text-center whitespace-nowrap font-sans">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(exp)}
                        className="p-1 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded"
                        title="Edit Expense"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      {currentUser.role === 'owner' && (
                        <button
                          type="button"
                          onClick={() => handleDelete(exp.id)}
                          className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
                          title="Delete Expense"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add / Edit Expense Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-5 space-y-4">
            <h3 className="font-bold text-slate-900 text-base">
              {editingExpense ? 'Edit Expense Record' : 'Record New Expense'}
            </h3>

            {formError && (
              <div className="p-2.5 bg-red-50 text-red-700 rounded-lg text-xs flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveExpense} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Expense Date *</label>
                  <input
                    type="date"
                    required
                    value={expDate}
                    onChange={e => setExpDate(e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg font-mono-numbers"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Category *</label>
                  <select
                    value={expCategory}
                    onChange={e => setExpCategory(e.target.value as ExpenseCategory)}
                    className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50"
                  >
                    {CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Amount (₹) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  min="0.01"
                  placeholder="0.00"
                  value={expAmount || ''}
                  onChange={e => setExpAmount(parseFloat(e.target.value) || 0)}
                  className="w-full p-2 border border-slate-200 rounded-lg font-mono-numbers font-bold text-sm"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Payment Mode *</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setExpPaymentMethod('cash')}
                    className={`py-2 px-1 text-center rounded-lg border font-medium transition-colors ${
                      expPaymentMethod === 'cash'
                        ? 'bg-slate-900 text-white border-slate-900 font-bold'
                        : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    Cash Float
                  </button>
                  <button
                    type="button"
                    onClick={() => setExpPaymentMethod('upi')}
                    className={`py-2 px-1 text-center rounded-lg border font-medium transition-colors ${
                      expPaymentMethod === 'upi'
                        ? 'bg-slate-900 text-white border-slate-900 font-bold'
                        : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    UPI
                  </button>
                  <button
                    type="button"
                    onClick={() => setExpPaymentMethod('bank')}
                    className={`py-2 px-1 text-center rounded-lg border font-medium transition-colors ${
                      expPaymentMethod === 'bank'
                        ? 'bg-slate-900 text-white border-slate-900 font-bold'
                        : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    Bank Transfer
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Description *</label>
                <textarea
                  rows={2}
                  required
                  placeholder="e.g. Milk pouch carry bags 500 pcs / Chiller condenser repair..."
                  value={expDescription}
                  onChange={e => setExpDescription(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg text-xs"
                />
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
                  Save Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
