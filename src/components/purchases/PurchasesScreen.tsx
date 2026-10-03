import React, { useState } from 'react';
import { useDairy } from '../../context/DairyContext';
import { Supplier, Purchase } from '../../types';
import { Plus, Truck, FileText, Calendar, AlertCircle, CheckCircle2 } from 'lucide-react';

export const PurchasesScreen: React.FC = () => {
  const {
    purchases,
    suppliers,
    products,
    createPurchase,
    addSupplier,
    currentBusinessDate,
  } = useDairy();

  const [showNewPurchaseModal, setShowNewPurchaseModal] = useState(false);
  const [showAddSupplierModal, setShowAddSupplierModal] = useState(false);

  // New Purchase Form State
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [supplierInvoiceNo, setSupplierInvoiceNo] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(currentBusinessDate);
  const [purchaseNotes, setPurchaseNotes] = useState('');
  const [updateProductCost, setUpdateProductCost] = useState(true);
  const [purchaseLines, setPurchaseLines] = useState<
    Array<{ product_id: string; qty: number; unit_cost: number; expiry_date: string }>
  >([{ product_id: '', qty: 10, unit_cost: 0, expiry_date: '' }]);

  const [purchaseError, setPurchaseError] = useState<string | null>(null);

  // New Supplier Form
  const [newSupName, setNewSupName] = useState('');
  const [newSupMobile, setNewSupMobile] = useState('');
  const [newSupAddress, setNewSupAddress] = useState('');
  const [newSupGst, setNewSupGst] = useState('');

  const handleLineProductChange = (index: number, productId: string) => {
    const prod = products.find(p => p.id === productId);
    setPurchaseLines(prev =>
      prev.map((line, i) =>
        i === index
          ? {
              ...line,
              product_id: productId,
              unit_cost: prod ? prod.purchase_price : 0,
            }
          : line
      )
    );
  };

  const handleAddLine = () => {
    setPurchaseLines(prev => [
      ...prev,
      { product_id: '', qty: 10, unit_cost: 0, expiry_date: '' },
    ]);
  };

  const handleRemoveLine = (index: number) => {
    if (purchaseLines.length <= 1) return;
    setPurchaseLines(prev => prev.filter((_, i) => i !== index));
  };

  const calculateGrandTotal = () => {
    return purchaseLines.reduce((acc, l) => acc + (l.qty || 0) * (l.unit_cost || 0), 0);
  };

  const handleSavePurchase = (e: React.FormEvent) => {
    e.preventDefault();
    setPurchaseError(null);

    if (!selectedSupplierId) {
      setPurchaseError('Please select a dairy supplier.');
      return;
    }

    const validLines = purchaseLines.filter(l => l.product_id && l.qty > 0);
    if (validLines.length === 0) {
      setPurchaseError('Please add at least one valid product line with quantity > 0.');
      return;
    }

    const res = createPurchase({
      supplier_id: selectedSupplierId,
      supplier_invoice_no: supplierInvoiceNo.trim() || `CRATE-${Date.now().toString().slice(-4)}`,
      purchase_date: purchaseDate,
      notes: purchaseNotes,
      update_product_cost: updateProductCost,
      items: validLines.map(l => ({
        product_id: l.product_id,
        qty: l.qty,
        unit_cost: l.unit_cost,
        expiry_date: l.expiry_date || null,
      })),
    });

    if (!res.success) {
      setPurchaseError(res.error || 'Failed to record purchase inward.');
      return;
    }

    // Reset and close
    setShowNewPurchaseModal(false);
    setSelectedSupplierId('');
    setSupplierInvoiceNo('');
    setPurchaseNotes('');
    setPurchaseLines([{ product_id: '', qty: 10, unit_cost: 0, expiry_date: '' }]);
  };

  const handleSaveSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSupName.trim()) return;

    addSupplier({
      name: newSupName.trim(),
      mobile: newSupMobile.trim() || '9898000000',
      address: newSupAddress.trim(),
      gst_number: newSupGst.trim() || undefined,
    });

    setShowAddSupplierModal(false);
    setNewSupName('');
    setNewSupMobile('');
    setNewSupAddress('');
    setNewSupGst('');
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">
            Purchases & Supplier Inward
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Receive milk crates and dairy supplies, track expiry dates per line, and update stock atomically
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowAddSupplierModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg shadow-2xs transition-colors"
          >
            <Truck className="w-3.5 h-3.5" />
            <span>Add Supplier</span>
          </button>

          <button
            type="button"
            onClick={() => setShowNewPurchaseModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>New Purchase Entry</span>
          </button>
        </div>
      </div>

      {/* Purchases List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between text-xs">
          <span className="font-semibold text-slate-900">Recent Purchase Inwards</span>
          <span className="text-slate-500 font-mono-numbers">{purchases.length} Recorded Inwards</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-500 border-b border-slate-200">
                <th className="py-3 px-4 font-semibold">Purchase Date</th>
                <th className="py-3 px-4 font-semibold">Supplier</th>
                <th className="py-3 px-4 font-semibold">Invoice / Challan #</th>
                <th className="py-3 px-4 font-semibold">Items Received</th>
                <th className="py-3 px-4 text-right font-semibold">Total Inward Cost</th>
                <th className="py-3 px-4 font-semibold">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {purchases.map(p => (
                <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3 px-4 font-mono-numbers text-slate-700">{p.purchase_date}</td>
                  <td className="py-3 px-4 font-medium text-slate-900">{p.supplier_name}</td>
                  <td className="py-3 px-4 font-mono-numbers font-semibold text-slate-800">
                    {p.supplier_invoice_no}
                  </td>
                  <td className="py-3 px-4 text-slate-600">
                    <span className="font-mono-numbers font-medium text-slate-800 block">
                      {p.items.length} product lines
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {p.items
                        .map(
                          it =>
                            `${it.qty}x ${it.product_name}${
                              it.expiry_date ? ` (Exp: ${it.expiry_date})` : ''
                            }`
                        )
                        .join(' · ')}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right font-bold font-mono-numbers text-slate-900 whitespace-nowrap">
                    ₹{p.total.toFixed(2)}
                  </td>
                  <td className="py-3 px-4 text-slate-500 text-[11px] max-w-[150px] truncate">
                    {p.notes || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Purchase Inward Modal */}
      {showNewPurchaseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full p-6 my-8 max-h-[90vh] flex flex-col space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Record Purchase Inward</h3>
                <p className="text-xs text-slate-500">
                  Adds stock to inventory, logs purchase movements, and tracks line-item expiry dates
                </p>
              </div>
              <button
                onClick={() => setShowNewPurchaseModal(false)}
                className="text-slate-400 hover:text-slate-700 text-lg font-bold"
              >
                &times;
              </button>
            </div>

            {purchaseError && (
              <div className="p-3 bg-red-50 text-red-700 rounded-lg text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{purchaseError}</span>
              </div>
            )}

            <form onSubmit={handleSavePurchase} className="space-y-4 text-xs flex-1 overflow-y-auto pr-1">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Supplier *</label>
                  <select
                    required
                    value={selectedSupplierId}
                    onChange={e => setSelectedSupplierId(e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50 text-xs"
                  >
                    <option value="">Select Supplier</option>
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Supplier Invoice / Challan #</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. AML/2026/9021"
                    value={supplierInvoiceNo}
                    onChange={e => setSupplierInvoiceNo(e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg text-xs font-mono-numbers"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Purchase Date *</label>
                  <input
                    type="date"
                    required
                    value={purchaseDate}
                    onChange={e => setPurchaseDate(e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg text-xs font-mono-numbers"
                  />
                </div>
              </div>

              {/* Purchase Lines */}
              <div className="space-y-2 pt-2 border-t border-slate-200">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-800">Items & Quantities</span>
                  <button
                    type="button"
                    onClick={handleAddLine}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Item Line</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {purchaseLines.map((line, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-slate-50 border border-slate-200 rounded-lg grid grid-cols-12 gap-2 items-center"
                    >
                      <div className="col-span-5">
                        <label className="text-[10px] text-slate-500 block mb-0.5">Product</label>
                        <select
                          required
                          value={line.product_id}
                          onChange={e => handleLineProductChange(idx, e.target.value)}
                          className="w-full p-1.5 bg-white border border-slate-200 rounded text-xs"
                        >
                          <option value="">Select Product</option>
                          {products.map(p => (
                            <option key={p.id} value={p.id}>
                              {p.name} ({p.unit}) — Current: {p.current_stock}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="col-span-2">
                        <label className="text-[10px] text-slate-500 block mb-0.5">Quantity</label>
                        <input
                          type="number"
                          step="0.001"
                          required
                          min="0.001"
                          value={line.qty}
                          onChange={e =>
                            setPurchaseLines(prev =>
                              prev.map((l, i) =>
                                i === idx ? { ...l, qty: parseFloat(e.target.value) || 0 } : l
                              )
                            )
                          }
                          className="w-full p-1.5 bg-white border border-slate-200 rounded text-xs font-mono-numbers"
                        />
                      </div>

                      <div className="col-span-2">
                        <label className="text-[10px] text-slate-500 block mb-0.5">Unit Cost (₹)</label>
                        <input
                          type="number"
                          step="0.01"
                          required
                          value={line.unit_cost}
                          onChange={e =>
                            setPurchaseLines(prev =>
                              prev.map((l, i) =>
                                i === idx ? { ...l, unit_cost: parseFloat(e.target.value) || 0 } : l
                              )
                            )
                          }
                          className="w-full p-1.5 bg-white border border-slate-200 rounded text-xs font-mono-numbers"
                        />
                      </div>

                      <div className="col-span-2">
                        <label className="text-[10px] text-slate-500 block mb-0.5">Expiry Date</label>
                        <input
                          type="date"
                          value={line.expiry_date}
                          onChange={e =>
                            setPurchaseLines(prev =>
                              prev.map((l, i) =>
                                i === idx ? { ...l, expiry_date: e.target.value } : l
                              )
                            )
                          }
                          className="w-full p-1.5 bg-white border border-slate-200 rounded text-xs font-mono-numbers"
                        />
                      </div>

                      <div className="col-span-1 text-center pt-3">
                        <button
                          type="button"
                          onClick={() => handleRemoveLine(idx)}
                          className="text-red-500 hover:text-red-700 text-sm font-bold"
                          title="Remove Line"
                        >
                          &times;
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Options & Total */}
              <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-200">
                <label className="flex items-center gap-2 cursor-pointer text-slate-700">
                  <input
                    type="checkbox"
                    checked={updateProductCost}
                    onChange={e => setUpdateProductCost(e.target.checked)}
                    className="rounded text-slate-900"
                  />
                  <span>Automatically update product purchase prices to this rate</span>
                </label>

                <div className="text-right">
                  <span className="text-slate-500 text-xs mr-2">Grand Total:</span>
                  <span className="text-lg font-bold font-mono-numbers text-slate-900">
                    ₹{calculateGrandTotal().toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowNewPurchaseModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-sm"
                >
                  Confirm Inward & Increase Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Supplier Modal */}
      {showAddSupplierModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-5 space-y-3">
            <h4 className="font-bold text-slate-900 text-sm">Add Dairy Supplier</h4>
            <form onSubmit={handleSaveSupplier} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 font-medium mb-1">Supplier Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Amul Anand Depot"
                  value={newSupName}
                  onChange={e => setNewSupName(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-slate-600 font-medium mb-1">Mobile</label>
                <input
                  type="tel"
                  placeholder="98XXXXXXXX"
                  value={newSupMobile}
                  onChange={e => setNewSupMobile(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-slate-600 font-medium mb-1">Address / Hub</label>
                <input
                  type="text"
                  placeholder="e.g. Sector 18 Chilling Plant"
                  value={newSupAddress}
                  onChange={e => setNewSupAddress(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-slate-600 font-medium mb-1">GSTIN (Optional)</label>
                <input
                  type="text"
                  placeholder="24AAACA..."
                  value={newSupGst}
                  onChange={e => setNewSupGst(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg font-mono-numbers"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddSupplierModal(false)}
                  className="px-3 py-1.5 text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-slate-900 text-white font-medium rounded-lg hover:bg-slate-800"
                >
                  Save Supplier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
