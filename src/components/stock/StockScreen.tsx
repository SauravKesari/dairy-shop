import React, { useState, useMemo } from 'react';
import { useDairy } from '../../context/DairyContext';
import { Product, StockMovement } from '../../types';
import {
  Boxes,
  AlertTriangle,
  Clock,
  History,
  TrendingDown,
  Layers,
  ArrowUpDown,
  Search,
  PlusCircle,
  FileDown,
} from 'lucide-react';

export const StockScreen: React.FC = () => {
  const {
    products,
    categories,
    stockMovements,
    expiryAlerts,
    currentUser,
    adjustStock,
  } = useDairy();

  const [activeTab, setActiveTab] = useState<'inventory' | 'expiry' | 'movements'>('inventory');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [expiryFilter, setExpiryFilter] = useState<'all' | 'expired' | 'today' | '3_days' | '7_days'>('all');

  // Adjustment Modal
  const [adjustingProduct, setAdjustingProduct] = useState<Product | null>(null);
  const [adjustType, setAdjustType] = useState<'damage' | 'expired' | 'adjustment'>('damage');
  const [adjustQty, setAdjustQty] = useState<number>(0);
  const [adjustReason, setAdjustReason] = useState<string>('');
  const [adjustError, setAdjustError] = useState<string | null>(null);

  // Movement history modal for single product
  const [inspectProduct, setInspectProduct] = useState<Product | null>(null);

  // KPIs
  const totalSKUs = products.length;
  const totalStockUnits = products.reduce((acc, p) => acc + p.current_stock, 0);
  const totalValuationCost = products.reduce(
    (acc, p) => acc + p.current_stock * p.purchase_price,
    0
  );
  const lowStockCount = products.filter(p => p.current_stock <= p.min_stock).length;
  const expiringCount = expiryAlerts.length;

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesCat = selectedCategory === 'all' || p.category_id === selectedCategory;
      const matchesLow = !lowStockOnly || p.current_stock <= p.min_stock;
      const query = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !query ||
        p.name.toLowerCase().includes(query) ||
        p.sku.toLowerCase().includes(query);
      return matchesCat && matchesLow && matchesSearch;
    });
  }, [products, selectedCategory, lowStockOnly, searchQuery]);

  const filteredExpiryAlerts = useMemo(() => {
    return expiryAlerts.filter(a => {
      if (expiryFilter === 'all') return true;
      return a.status === expiryFilter;
    });
  }, [expiryAlerts, expiryFilter]);

  const handleConfirmAdjust = async () => {
    if (!adjustingProduct) return;
    setAdjustError(null);

    // damage & expired subtract from stock, adjustment takes signed qty
    let signedQty = adjustQty;
    if (adjustType === 'damage' || adjustType === 'expired') {
      signedQty = -Math.abs(adjustQty);
    }

    const res = await adjustStock(adjustingProduct.id, adjustType, signedQty, adjustReason);
    if (!res.success) {
      setAdjustError(res.error || 'Failed to adjust stock');
      return;
    }

    setAdjustingProduct(null);
    setAdjustQty(0);
    setAdjustReason('');
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Title & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">
            Stock & Inventory Management
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Real-time stock built strictly from movements, FIFO expiry tracking, valuation at cost & audited adjustments
          </p>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center bg-white border border-slate-200 rounded-lg p-1 text-xs font-medium shadow-2xs">
          <button
            onClick={() => setActiveTab('inventory')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors ${
              activeTab === 'inventory'
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Boxes className="w-3.5 h-3.5" />
            <span>Current Stock</span>
          </button>
          <button
            onClick={() => setActiveTab('expiry')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors ${
              activeTab === 'expiry'
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Expiry Alerts ({expiringCount})</span>
          </button>
          <button
            onClick={() => setActiveTab('movements')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors ${
              activeTab === 'movements'
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Stock Movements Ledger</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs text-slate-500 block">Total Inventory Value (Cost)</span>
          <span className="text-2xl font-bold font-mono-numbers text-slate-900 mt-1 block">
            ₹{totalValuationCost.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </span>
          <span className="text-[11px] text-slate-400 mt-0.5 block">
            Across {totalSKUs} active product lines
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs text-slate-500 block">Total Volume / Units</span>
          <span className="text-2xl font-bold font-mono-numbers text-slate-900 mt-1 block">
            {totalStockUnits.toFixed(1)}
          </span>
          <span className="text-[11px] text-slate-400 mt-0.5 block">Litres, kgs & packets</span>
        </div>

        <div
          onClick={() => {
            setActiveTab('inventory');
            setLowStockOnly(true);
          }}
          className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs cursor-pointer hover:border-amber-400 transition-colors"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500">Low Stock Alert</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <span className="text-2xl font-bold font-mono-numbers text-amber-600 mt-1 block">
            {lowStockCount} items
          </span>
          <span className="text-[11px] text-slate-400 mt-0.5 block">At or below reorder level</span>
        </div>

        <div
          onClick={() => setActiveTab('expiry')}
          className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs cursor-pointer hover:border-red-400 transition-colors"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500">Expiring Soon (FIFO)</span>
            <Clock className="w-4 h-4 text-red-500" />
          </div>
          <span className="text-2xl font-bold font-mono-numbers text-red-600 mt-1 block">
            {expiringCount} items
          </span>
          <span className="text-[11px] text-slate-400 mt-0.5 block">7 days or less remaining</span>
        </div>
      </div>

      {/* TAB 1: CURRENT STOCK & VALUATION */}
      {activeTab === 'inventory' && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter by product or SKU..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg bg-slate-50"
                />
              </div>

              <select
                value={selectedCategory}
                onChange={e => setSelectedCategory(e.target.value)}
                className="py-1.5 px-3 border border-slate-200 rounded-lg bg-slate-50"
              >
                <option value="all">All Categories</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-3 self-end sm:self-auto">
              <label className="flex items-center gap-1.5 cursor-pointer text-slate-700">
                <input
                  type="checkbox"
                  checked={lowStockOnly}
                  onChange={e => setLowStockOnly(e.target.checked)}
                  className="rounded text-slate-900 focus:ring-0"
                />
                <span>Low stock only</span>
              </label>
            </div>
          </div>

          {/* Inventory Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-500 border-b border-slate-200">
                  <th className="py-3 px-4 font-semibold">Product Name</th>
                  <th className="py-3 px-4 font-semibold">SKU</th>
                  <th className="py-3 px-4 font-semibold">Category</th>
                  <th className="py-3 px-4 text-right font-semibold">Cost Price</th>
                  <th className="py-3 px-4 text-right font-semibold">Selling Price</th>
                  <th className="py-3 px-4 text-right font-semibold">Current Stock</th>
                  <th className="py-3 px-4 text-right font-semibold">Min Stock</th>
                  <th className="py-3 px-4 text-right font-semibold">Inventory Valuation</th>
                  <th className="py-3 px-4 text-center font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProducts.map(product => {
                  const isLow = product.current_stock <= product.min_stock;
                  const cat = categories.find(c => c.id === product.category_id);
                  const valuation = product.current_stock * product.purchase_price;

                  return (
                    <tr key={product.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        {product.name}
                        {product.track_expiry && (
                          <span className="ml-1.5 text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded font-normal">
                            Expiry Tracked
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono-numbers text-slate-500">{product.sku}</td>
                      <td className="py-3 px-4 text-slate-600">{cat ? cat.name : '—'}</td>
                      <td className="py-3 px-4 text-right font-mono-numbers text-slate-600">
                        ₹{product.purchase_price.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono-numbers font-semibold text-slate-900">
                        ₹{product.selling_price.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span
                          className={`font-bold font-mono-numbers px-2 py-0.5 rounded ${
                            product.current_stock <= 0
                              ? 'bg-red-100 text-red-800'
                              : isLow
                              ? 'bg-amber-100 text-amber-800'
                              : 'text-slate-900'
                          }`}
                        >
                          {product.current_stock} {product.unit}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono-numbers text-slate-400">
                        {product.min_stock} {product.unit}
                      </td>
                      <td className="py-3 px-4 text-right font-mono-numbers font-medium text-slate-800">
                        ₹{valuation.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setInspectProduct(product)}
                            className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded"
                            title="View Stock Movement History"
                          >
                            <History className="w-3.5 h-3.5" />
                          </button>

                          {currentUser.role === 'owner' && (
                            <button
                              type="button"
                              onClick={() => {
                                setAdjustingProduct(product);
                                setAdjustType('damage');
                                setAdjustQty(0);
                                setAdjustReason('');
                                setAdjustError(null);
                              }}
                              className="px-2 py-1 text-[11px] font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded transition-colors"
                              title="Stock Adjustment (Damage / Expired / Correction)"
                            >
                              Adjust
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: FIFO EXPIRY ALERTS */}
      {activeTab === 'expiry' && (
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl text-xs text-amber-900">
            <h4 className="font-bold flex items-center gap-1.5 text-sm mb-1 text-amber-950">
              <Clock className="w-4 h-4 text-amber-700" />
              FIFO Expiry Tracking Assumption (V1)
            </h4>
            <p>
              Expiry dates are tracked per purchase invoice line. The remaining physical stock is assumed to come from the newest purchases (FIFO) to generate proactive alerts before products spoil.
            </p>
          </div>

          {/* Status Filter Buttons */}
          <div className="flex items-center gap-2 overflow-x-auto text-xs">
            <button
              onClick={() => setExpiryFilter('all')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                expiryFilter === 'all'
                  ? 'bg-slate-900 text-white'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              All Alerts ({expiryAlerts.length})
            </button>
            <button
              onClick={() => setExpiryFilter('expired')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                expiryFilter === 'expired'
                  ? 'bg-red-700 text-white'
                  : 'bg-white border border-slate-200 text-red-700 hover:bg-red-50'
              }`}
            >
              Expired ({expiryAlerts.filter(a => a.status === 'expired').length})
            </button>
            <button
              onClick={() => setExpiryFilter('today')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                expiryFilter === 'today'
                  ? 'bg-orange-600 text-white'
                  : 'bg-white border border-slate-200 text-orange-700 hover:bg-orange-50'
              }`}
            >
              Expires Today ({expiryAlerts.filter(a => a.status === 'today').length})
            </button>
            <button
              onClick={() => setExpiryFilter('3_days')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                expiryFilter === '3_days'
                  ? 'bg-amber-600 text-white'
                  : 'bg-white border border-slate-200 text-amber-800 hover:bg-amber-50'
              }`}
            >
              Next 3 Days ({expiryAlerts.filter(a => a.status === '3_days').length})
            </button>
            <button
              onClick={() => setExpiryFilter('7_days')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                expiryFilter === '7_days'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white border border-slate-200 text-blue-700 hover:bg-blue-50'
              }`}
            >
              Within 7 Days ({expiryAlerts.filter(a => a.status === '7_days').length})
            </button>
          </div>

          {/* Expiry Alerts Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-500 border-b border-slate-200">
                  <th className="py-3 px-4 font-semibold">Product</th>
                  <th className="py-3 px-4 font-semibold">Category</th>
                  <th className="py-3 px-4 font-semibold">Current Stock on Hand</th>
                  <th className="py-3 px-4 font-semibold">Expiry Date</th>
                  <th className="py-3 px-4 font-semibold">Days Remaining</th>
                  <th className="py-3 px-4 font-semibold">Supplier & Bill No</th>
                  <th className="py-3 px-4 text-center font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredExpiryAlerts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      No products matching this expiry alert window.
                    </td>
                  </tr>
                ) : (
                  filteredExpiryAlerts.map((alert, idx) => {
                    const prod = products.find(p => p.id === alert.product_id);
                    return (
                      <tr key={idx} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-4 font-semibold text-slate-900">
                          {alert.product_name}
                        </td>
                        <td className="py-3 px-4 text-slate-600">{alert.category_name}</td>
                        <td className="py-3 px-4 font-bold font-mono-numbers text-slate-800">
                          {alert.current_stock} {alert.unit}
                        </td>
                        <td className="py-3 px-4 font-mono-numbers text-slate-900 font-semibold">
                          {alert.expiry_date}
                        </td>
                        <td className="py-3 px-4">
                          {alert.status === 'expired' ? (
                            <span className="bg-red-100 text-red-800 font-bold px-2 py-0.5 rounded text-[11px]">
                              EXPIRED ({Math.abs(alert.days_remaining)} days ago)
                            </span>
                          ) : alert.status === 'today' ? (
                            <span className="bg-orange-100 text-orange-800 font-bold px-2 py-0.5 rounded text-[11px]">
                              EXPIRES TODAY!
                            </span>
                          ) : alert.status === '3_days' ? (
                            <span className="bg-amber-100 text-amber-900 font-medium px-2 py-0.5 rounded text-[11px]">
                              {alert.days_remaining} days left
                            </span>
                          ) : (
                            <span className="bg-blue-50 text-blue-700 font-medium px-2 py-0.5 rounded text-[11px]">
                              {alert.days_remaining} days left
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-500">
                          {alert.supplier_name || 'Amul Supply'}
                          {alert.purchase_invoice_no && (
                            <span className="block text-[10px] font-mono-numbers text-slate-400">
                              Bill: {alert.purchase_invoice_no}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {currentUser.role === 'owner' && prod && (
                            <button
                              type="button"
                              onClick={() => {
                                setAdjustingProduct(prod);
                                setAdjustType('expired');
                                setAdjustQty(prod.current_stock);
                                setAdjustReason('Write off expired stock from FIFO batch');
                                setAdjustError(null);
                              }}
                              className="px-2.5 py-1 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded transition-colors"
                            >
                              Write Off
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: STOCK MOVEMENTS LEDGER */}
      {activeTab === 'movements' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between text-xs">
            <span className="text-slate-600">
              Chronological log of every single stock event (Rule 2: stock changes only through movement records).
            </span>
            <span className="font-mono-numbers font-semibold text-slate-900">
              {stockMovements.length} Total Events
            </span>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-500 border-b border-slate-200">
                  <th className="py-3 px-4 font-semibold">Timestamp</th>
                  <th className="py-3 px-4 font-semibold">Product</th>
                  <th className="py-3 px-4 font-semibold">Event Type</th>
                  <th className="py-3 px-4 text-right font-semibold">Quantity</th>
                  <th className="py-3 px-4 font-semibold">Reason / Reference</th>
                  <th className="py-3 px-4 font-semibold">User</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono-numbers">
                {stockMovements.map(m => (
                  <tr key={m.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                      {new Date(m.created_at).toLocaleDateString()}{' '}
                      <span className="text-[10px] text-slate-400">
                        {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-sans font-semibold text-slate-900">
                      {m.product_name}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap font-sans">
                      <span
                        className={`text-[11px] font-medium px-2 py-0.5 rounded capitalize ${
                          m.type === 'purchase'
                            ? 'bg-emerald-50 text-emerald-700'
                            : m.type === 'sale'
                            ? 'bg-blue-50 text-blue-700'
                            : m.type === 'sale_cancel'
                            ? 'bg-purple-50 text-purple-700'
                            : m.type === 'damage' || m.type === 'expired'
                            ? 'bg-red-50 text-red-700'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {m.type.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-bold whitespace-nowrap">
                      <span className={m.qty > 0 ? 'text-emerald-600' : 'text-slate-800'}>
                        {m.qty > 0 ? `+${m.qty}` : m.qty}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-sans text-slate-600">
                      {m.reason || (m.ref_id ? `Ref: ${m.ref_id}` : '—')}
                    </td>
                    <td className="py-3 px-4 font-sans text-slate-500">{m.created_by}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Product Specific Movement History Drawer */}
      {inspectProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-5 space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-base">{inspectProduct.name}</h3>
                <p className="text-xs text-slate-500 font-mono-numbers">
                  SKU: {inspectProduct.sku} · Current Stock: {inspectProduct.current_stock} {inspectProduct.unit}
                </p>
              </div>
              <button
                onClick={() => setInspectProduct(null)}
                className="text-slate-400 hover:text-slate-700 text-lg font-bold"
              >
                &times;
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-500">
                    <th className="p-2">Date</th>
                    <th className="p-2">Type</th>
                    <th className="p-2 text-right">Quantity</th>
                    <th className="p-2">Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono-numbers">
                  {stockMovements
                    .filter(m => m.product_id === inspectProduct.id)
                    .map(m => (
                      <tr key={m.id} className="hover:bg-slate-50">
                        <td className="p-2 text-slate-500">
                          {new Date(m.created_at).toLocaleDateString()}
                        </td>
                        <td className="p-2 font-sans capitalize">{m.type.replace('_', ' ')}</td>
                        <td
                          className={`p-2 text-right font-bold ${
                            m.qty > 0 ? 'text-emerald-600' : 'text-slate-800'
                          }`}
                        >
                          {m.qty > 0 ? `+${m.qty}` : m.qty}
                        </td>
                        <td className="p-2 font-sans text-slate-600">{m.reason || '—'}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end pt-2 border-t">
              <button
                type="button"
                onClick={() => setInspectProduct(null)}
                className="px-4 py-1.5 text-xs font-semibold bg-slate-900 text-white rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stock Adjustment Modal (Owner Only) */}
      {adjustingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-5 space-y-4">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">
                Adjust Stock: {adjustingProduct.name}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Current Stock on Record: <strong>{adjustingProduct.current_stock} {adjustingProduct.unit}</strong>
              </p>
            </div>

            {adjustError && (
              <p className="text-xs text-red-600 bg-red-50 p-2 rounded border border-red-200">
                {adjustError}
              </p>
            )}

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Adjustment Reason Type *</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setAdjustType('damage')}
                    className={`py-2 px-1 text-center rounded-lg border font-medium transition-colors ${
                      adjustType === 'damage'
                        ? 'bg-red-50 border-red-300 text-red-800 font-bold'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Damage / Spoilage
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustType('expired')}
                    className={`py-2 px-1 text-center rounded-lg border font-medium transition-colors ${
                      adjustType === 'expired'
                        ? 'bg-orange-50 border-orange-300 text-orange-800 font-bold'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Expired Write-off
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustType('adjustment')}
                    className={`py-2 px-1 text-center rounded-lg border font-medium transition-colors ${
                      adjustType === 'adjustment'
                        ? 'bg-blue-50 border-blue-300 text-blue-800 font-bold'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Count Correction
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">
                  {adjustType === 'damage' || adjustType === 'expired'
                    ? `Deduct Quantity (${adjustingProduct.unit}) *`
                    : `Net Change Quantity (+/- ${adjustingProduct.unit}) *`}
                </label>
                <input
                  type="number"
                  step="0.001"
                  required
                  placeholder="e.g. 2 or -2"
                  value={adjustQty || ''}
                  onChange={e => setAdjustQty(parseFloat(e.target.value) || 0)}
                  className="w-full p-2 border border-slate-200 rounded-lg font-mono-numbers font-semibold"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">
                  Mandatory Audit Reason *
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="e.g. Leaked pouch found in morning delivery / Physical count matched 42..."
                  value={adjustReason}
                  onChange={e => setAdjustReason(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg text-xs"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setAdjustingProduct(null)}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={adjustQty === 0 || !adjustReason.trim()}
                onClick={handleConfirmAdjust}
                className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-50"
              >
                Record Adjustment & Audit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
