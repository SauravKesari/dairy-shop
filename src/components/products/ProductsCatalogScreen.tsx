import React, { useState, useMemo } from 'react';
import { useDairy } from '../../context/DairyContext';
import { Product, ProductUnit } from '../../types';
import { Plus, Search, Upload, FileDown, Edit3, Power, Check, AlertCircle } from 'lucide-react';
import { allUnits, unitLabel } from '../../lib/units';

export const ProductsCatalogScreen: React.FC = () => {
  const {
    products,
    categories,
    addProduct,
    updateProduct,
    toggleProductActive,
    importProductsCSV,
    importCustomerDuesCSV,
    currentUser,
    settings,
    addCategory,
    addCustomUnit,
  } = useDairy();

  // Inline "+ New" for category and unit inside the product form (owner only)
  const [newCategoryName, setNewCategoryName] = useState<string | null>(null);
  const [newUnitName, setNewUnitName] = useState<string | null>(null);
  const [isAddingOption, setIsAddingOption] = useState(false);

  const handleAddCategory = async () => {
    if (newCategoryName === null || isAddingOption) return;
    setFormError(null);
    setIsAddingOption(true);
    const res = await addCategory(newCategoryName);
    setIsAddingOption(false);
    if (!res.success || !res.category) {
      setFormError(res.error || 'Failed to add category');
      return;
    }
    setCategoryId(res.category.id);
    setNewCategoryName(null);
  };

  const handleAddUnit = async () => {
    if (newUnitName === null || isAddingOption) return;
    setFormError(null);
    setIsAddingOption(true);
    const res = await addCustomUnit(newUnitName);
    setIsAddingOption(false);
    if (!res.success) {
      setFormError(res.error || 'Failed to add unit');
      return;
    }
    setUnit(newUnitName.trim());
    setNewUnitName(null);
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCat, setSelectedCat] = useState('all');

  // Add / Edit Modal
  const [showModal, setShowModal] = useState(false);
  const [editingProd, setEditingProd] = useState<Product | null>(null);

  // Form Fields
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [sku, setSku] = useState('');
  const [barcode, setBarcode] = useState('');
  const [unit, setUnit] = useState<ProductUnit>('pkt');
  const [purchasePrice, setPurchasePrice] = useState<number>(50);
  const [sellingPrice, setSellingPrice] = useState<number>(60);
  const [gstPercent, setGstPercent] = useState<number>(0);
  const [minStock, setMinStock] = useState<number>(10);
  const [trackExpiry, setTrackExpiry] = useState<boolean>(true);
  const [openingStock, setOpeningStock] = useState<number>(0);
  const [formError, setFormError] = useState<string | null>(null);

  // CSV Import Modal
  const [showCsvModal, setShowCsvModal] = useState(false);
  const [csvType, setCsvType] = useState<'products' | 'customers'>('products');
  const [csvText, setCsvText] = useState('');
  const [importResult, setImportResult] = useState<{ success: boolean; msg: string } | null>(null);

  const filtered = useMemo(() => {
    return products.filter(p => {
      const matchCat = selectedCat === 'all' || p.category_id === selectedCat;
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        (p.barcode && p.barcode.includes(q));
      return matchCat && matchSearch;
    });
  }, [products, selectedCat, searchQuery]);

  const handleOpenAdd = () => {
    setEditingProd(null);
    setName('');
    setCategoryId(categories[0]?.id || '');
    setSku(`SKU-${Date.now().toString().slice(-4)}`);
    setBarcode('');
    setUnit('pkt');
    setPurchasePrice(50);
    setSellingPrice(60);
    setGstPercent(0);
    setMinStock(10);
    setTrackExpiry(true);
    setOpeningStock(0);
    setFormError(null);
    setNewCategoryName(null);
    setNewUnitName(null);
    setShowModal(true);
  };

  const handleOpenEdit = (prod: Product) => {
    setEditingProd(prod);
    setName(prod.name);
    setCategoryId(prod.category_id);
    setSku(prod.sku);
    setBarcode(prod.barcode || '');
    setUnit(prod.unit);
    setPurchasePrice(prod.purchase_price);
    setSellingPrice(prod.selling_price);
    setGstPercent(prod.gst_percent);
    setMinStock(prod.min_stock);
    setTrackExpiry(prod.track_expiry);
    setOpeningStock(0);
    setFormError(null);
    setNewCategoryName(null);
    setNewUnitName(null);
    setShowModal(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!name.trim()) {
      setFormError('Product name is required.');
      return;
    }

    if (!categoryId) {
      setFormError('Please choose or add a category.');
      return;
    }

    if (sellingPrice < 0 || purchasePrice < 0) {
      setFormError('Prices must be non-negative.');
      return;
    }

    const res = editingProd
      ? await updateProduct(editingProd.id, {
        name: name.trim(),
        category_id: categoryId,
        sku: sku.trim(),
        barcode: barcode.trim() || undefined,
        unit,
        purchase_price: purchasePrice,
        selling_price: sellingPrice,
        gst_percent: gstPercent,
        min_stock: minStock,
        track_expiry: trackExpiry,
      })
      : await addProduct(
        {
          name: name.trim(),
          category_id: categoryId,
          sku: sku.trim(),
          barcode: barcode.trim() || undefined,
          unit,
          purchase_price: purchasePrice,
          selling_price: sellingPrice,
          gst_percent: gstPercent,
          min_stock: minStock,
          track_expiry: trackExpiry,
          active: true,
        },
        openingStock
      );
    if (!res.success) {
      setFormError(res.error || 'Failed to save product');
      return;
    }

    setShowModal(false);
  };

  const handleRunCSVImport = async () => {
    setImportResult(null);
    if (!csvText.trim()) {
      setImportResult({ success: false, msg: 'Please enter or paste CSV content.' });
      return;
    }

    if (csvType === 'products') {
      const res = await importProductsCSV(csvText);
      if (res.success) {
        setImportResult({ success: true, msg: `Successfully imported ${res.count} products with opening stock!` });
        setCsvText('');
      } else {
        setImportResult({ success: false, msg: res.error || 'Failed to import products CSV' });
      }
    } else {
      const res = await importCustomerDuesCSV(csvText);
      if (res.success) {
        setImportResult({ success: true, msg: `Successfully imported ${res.count} customer accounts and opening dues!` });
        setCsvText('');
      } else {
        setImportResult({ success: false, msg: res.error || 'Failed to import customers CSV' });
      }
    }
  };

  const loadSampleCSV = () => {
    if (csvType === 'products') {
      setCsvText(`name,category,unit,purchase_price,selling_price,min_stock,track_expiry,opening_stock
A2 Gir Cow Milk (Fresh),Fresh Milk,L,75,90,20,yes,40
Malai Paneer Slab 1kg,Paneer & Butter,kg,340,420,5,yes,15
Amul Butter Chiplet 100g,Paneer & Butter,pkt,52,58,15,yes,30
Gulab Jamun Handi 1kg,Mithai & Sweets,bottle,220,280,4,no,8`);
    } else {
      setCsvText(`name,mobile,address,credit_limit,opening_due
Aggarwal Sweet Shop,9811199988,Main Chowk,15000,4500
Chaudhary Dairy Booth,9822288877,Railway Colony,5000,1200
Gupta Halwai,9833377766,Subhash Nagar,10000,2800`);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">
            Products & Categories Catalog
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Manage dairy products, selling rates, unit configurations, and initial bulk CSV imports
          </p>
        </div>

        <div className="flex items-center gap-2">
          {currentUser.role === 'owner' && (
            <button
              type="button"
              onClick={() => {
                setShowCsvModal(true);
                setImportResult(null);
              }}
              className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg shadow-2xs transition-colors"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>CSV Bulk Import</span>
            </button>
          )}

          {currentUser.role === 'owner' && (
            <button
              type="button"
              onClick={handleOpenAdd}
              className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Add Product</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search product, SKU or barcode..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-lg bg-slate-50"
            />
          </div>

          <select
            value={selectedCat}
            onChange={e => setSelectedCat(e.target.value)}
            className="py-1.5 px-3 border border-slate-200 rounded-lg bg-slate-50"
          >
            <option value="all">All Categories</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <span className="text-slate-500 font-mono-numbers text-xs self-start sm:self-auto">
          {filtered.length} products listed
        </span>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="bg-slate-50 text-slate-500 border-b border-slate-200">
              <th className="py-3 px-4 font-semibold">Product Name</th>
              <th className="py-3 px-4 font-semibold">SKU / Barcode</th>
              <th className="py-3 px-4 font-semibold">Category</th>
              <th className="py-3 px-4 font-semibold">Unit</th>
              <th className="py-3 px-4 text-right font-semibold">Cost (₹)</th>
              <th className="py-3 px-4 text-right font-semibold">Selling Rate (₹)</th>
              <th className="py-3 px-4 text-right font-semibold">Current Stock</th>
              <th className="py-3 px-4 font-semibold">Expiry Track</th>
              <th className="py-3 px-4 text-center font-semibold">Active</th>
              <th className="py-3 px-4 text-center font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map(p => {
              const cat = categories.find(c => c.id === p.category_id);
              return (
                <tr
                  key={p.id}
                  className={`hover:bg-slate-50 transition-colors ${!p.active ? 'opacity-50' : ''}`}
                >
                  <td className="py-3 px-4 font-semibold text-slate-900">{p.name}</td>
                  <td className="py-3 px-4 font-mono-numbers text-slate-500">
                    {p.sku}
                    {p.barcode && <span className="block text-[10px] text-slate-400">{p.barcode}</span>}
                  </td>
                  <td className="py-3 px-4 text-slate-600">{cat ? cat.name : '—'}</td>
                  <td className="py-3 px-4 font-mono-numbers text-slate-700">{p.unit}</td>
                  <td className="py-3 px-4 text-right font-mono-numbers text-slate-600">
                    ₹{p.purchase_price.toFixed(2)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono-numbers font-bold text-slate-900">
                    ₹{p.selling_price.toFixed(2)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono-numbers font-semibold text-slate-800">
                    {p.current_stock} {p.unit}
                  </td>
                  <td className="py-3 px-4">
                    {p.track_expiry ? (
                      <span className="text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded text-[11px] font-medium">
                        Yes (FIFO)
                      </span>
                    ) : (
                      <span className="text-slate-400 text-[11px]">No</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <button
                      type="button"
                      disabled={currentUser.role !== 'owner'}
                      onClick={() => toggleProductActive(p.id)}
                      className={`text-[11px] font-semibold px-2 py-0.5 rounded transition-colors ${
                        p.active
                          ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                          : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                      }`}
                    >
                      {p.active ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="py-3 px-4 text-center">
                    {currentUser.role === 'owner' && (
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(p)}
                        className="p-1 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded"
                        title="Edit Product & Prices"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Add / Edit Product Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 space-y-4 my-8 max-h-[90vh] overflow-y-auto">
            <h3 className="font-bold text-slate-900 text-base">
              {editingProd ? 'Edit Product & Pricing' : 'Add New Product'}
            </h3>

            {formError && (
              <div className="p-2.5 bg-red-50 text-red-700 rounded-lg text-xs flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveProduct} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Product Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Amul Buffalo Milk 1L"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-slate-700 font-semibold">Category *</label>
                    {currentUser.role === 'owner' && newCategoryName === null && (
                      <button
                        type="button"
                        onClick={() => setNewCategoryName('')}
                        className="text-[11px] text-blue-600 hover:text-blue-800 font-medium flex items-center gap-0.5"
                      >
                        <Plus className="w-3 h-3" />
                        <span>New</span>
                      </button>
                    )}
                  </div>
                  {newCategoryName === null ? (
                    <select
                      value={categoryId}
                      onChange={e => setCategoryId(e.target.value)}
                      className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50"
                    >
                      {categories.length === 0 && <option value="">Add a category first</option>}
                      {categories.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="flex gap-1">
                      <input
                        type="text"
                        autoFocus
                        placeholder="e.g. Sweets"
                        value={newCategoryName}
                        onChange={e => setNewCategoryName(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddCategory();
                          }
                        }}
                        className="w-full min-w-0 p-2 border border-slate-200 rounded-lg"
                      />
                      <button
                        type="button"
                        disabled={isAddingOption}
                        onClick={handleAddCategory}
                        className="px-2 bg-slate-900 text-white rounded-lg font-semibold disabled:opacity-60"
                      >
                        Add
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewCategoryName(null)}
                        className="px-1.5 text-slate-500 hover:text-slate-900"
                        title="Cancel"
                      >
                        &times;
                      </button>
                    </div>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-slate-700 font-semibold">Unit of Measure *</label>
                    {currentUser.role === 'owner' && newUnitName === null && (
                      <button
                        type="button"
                        onClick={() => setNewUnitName('')}
                        className="text-[11px] text-blue-600 hover:text-blue-800 font-medium flex items-center gap-0.5"
                      >
                        <Plus className="w-3 h-3" />
                        <span>New</span>
                      </button>
                    )}
                  </div>
                  {newUnitName === null ? (
                    <select
                      value={unit}
                      onChange={e => setUnit(e.target.value as ProductUnit)}
                      className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50"
                    >
                      {allUnits(settings, unit).map(u => (
                        <option key={u} value={u}>
                          {unitLabel(u) ? `${u} (${unitLabel(u)})` : u}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="flex gap-1">
                      <input
                        type="text"
                        autoFocus
                        maxLength={12}
                        placeholder="e.g. dozen, g, box"
                        value={newUnitName}
                        onChange={e => setNewUnitName(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddUnit();
                          }
                        }}
                        className="w-full min-w-0 p-2 border border-slate-200 rounded-lg"
                      />
                      <button
                        type="button"
                        disabled={isAddingOption}
                        onClick={handleAddUnit}
                        className="px-2 bg-slate-900 text-white rounded-lg font-semibold disabled:opacity-60"
                      >
                        Add
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewUnitName(null)}
                        className="px-1.5 text-slate-500 hover:text-slate-900"
                        title="Cancel"
                      >
                        &times;
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">SKU Code *</label>
                  <input
                    type="text"
                    required
                    value={sku}
                    onChange={e => setSku(e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg font-mono-numbers"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Barcode (Optional)</label>
                  <input
                    type="text"
                    placeholder="8901..."
                    value={barcode}
                    onChange={e => setBarcode(e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg font-mono-numbers"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Purchase Cost (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={purchasePrice}
                    onChange={e => setPurchasePrice(parseFloat(e.target.value) || 0)}
                    className="w-full p-2 border border-slate-200 rounded-lg font-mono-numbers font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Selling Price (₹) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={sellingPrice}
                    onChange={e => setSellingPrice(parseFloat(e.target.value) || 0)}
                    className="w-full p-2 border border-slate-200 rounded-lg font-mono-numbers font-bold text-slate-900"
                  />
                  {editingProd && editingProd.selling_price !== sellingPrice && (
                    <span className="text-[10px] text-amber-700 block mt-0.5">
                      (Price change will be logged in audit trail)
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Min Stock Alert Level</label>
                  <input
                    type="number"
                    value={minStock}
                    onChange={e => setMinStock(parseFloat(e.target.value) || 0)}
                    className="w-full p-2 border border-slate-200 rounded-lg font-mono-numbers"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">GST Rate (%)</label>
                  <input
                    type="number"
                    value={gstPercent}
                    onChange={e => setGstPercent(parseFloat(e.target.value) || 0)}
                    className="w-full p-2 border border-slate-200 rounded-lg font-mono-numbers"
                  />
                </div>
              </div>

              {!editingProd && (
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Initial Opening Stock Count ({unit})
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    value={openingStock}
                    onChange={e => setOpeningStock(parseFloat(e.target.value) || 0)}
                    className="w-full p-2 border border-slate-200 rounded-lg font-mono-numbers"
                  />
                  <span className="text-[10px] text-slate-500">
                    Automatically writes an 'opening' stock movement into history.
                  </span>
                </div>
              )}

              <div className="pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-slate-700 font-medium">
                  <input
                    type="checkbox"
                    checked={trackExpiry}
                    onChange={e => setTrackExpiry(e.target.checked)}
                    className="rounded text-slate-900"
                  />
                  <span>Track expiry date alerts (FIFO) for this product</span>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-3 py-1.5 text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-900 text-white font-semibold rounded-lg hover:bg-slate-800"
                >
                  {editingProd ? 'Save Changes' : 'Create Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CSV Bulk Import Modal (Week 1, #8) */}
      {showCsvModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-xl w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Bulk CSV Import (Go-Live Day)</h3>
                <p className="text-xs text-slate-500">
                  Initial import of products & opening stock or customer opening credit dues
                </p>
              </div>
              <button
                onClick={() => setShowCsvModal(false)}
                className="text-slate-400 hover:text-slate-700 text-xl font-bold"
              >
                &times;
              </button>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <button
                type="button"
                onClick={() => {
                  setCsvType('products');
                  setImportResult(null);
                }}
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                  csvType === 'products'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Products & Opening Stock
              </button>
              <button
                type="button"
                onClick={() => {
                  setCsvType('customers');
                  setImportResult(null);
                }}
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                  csvType === 'customers'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Customer Accounts & Opening Dues
              </button>
            </div>

            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-600 font-medium">Paste CSV lines below:</span>
              <button
                type="button"
                onClick={loadSampleCSV}
                className="text-xs text-blue-600 hover:text-blue-800 font-semibold"
              >
                Load Sample Template
              </button>
            </div>

            <textarea
              rows={8}
              value={csvText}
              onChange={e => setCsvText(e.target.value)}
              placeholder="Paste comma-separated values with headers..."
              className="w-full p-3 font-mono-numbers text-xs border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-1 focus:ring-slate-900"
            />

            {importResult && (
              <div
                className={`p-3 rounded-lg text-xs flex items-center gap-2 ${
                  importResult.success
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-red-50 text-red-800 border border-red-200'
                }`}
              >
                {importResult.success ? (
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                )}
                <span>{importResult.msg}</span>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 text-xs">
              <button
                type="button"
                onClick={() => setShowCsvModal(false)}
                className="px-3 py-2 text-slate-600 hover:text-slate-900"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleRunCSVImport}
                className="px-4 py-2 bg-slate-900 text-white font-bold rounded-lg hover:bg-slate-800"
              >
                Parse & Import Data
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
