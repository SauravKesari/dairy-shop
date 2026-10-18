import React, { useState, useMemo } from 'react';
import { useDairy } from '../../context/DairyContext';
import { Product, ProductUnit } from '../../types';
import { Plus, Search, Upload, FileDown, Edit3, Power, Check, AlertCircle, Tags } from 'lucide-react';
import { CategoriesUnitsScreen } from './CategoriesUnitsScreen';
import { allUnits, unitLabel, isLooseUnit, qtyStep, parseQty } from '../../lib/units';
import { useLanguage } from '../../i18n/LanguageContext';
import { useProductName } from '../../i18n/useProductName';

export const ProductsCatalogScreen: React.FC = () => {
  const {
    products,
    categories,
    addProduct,
    updateProduct,
    toggleProductActive,
    importProductsCSV,
    importCustomerDuesCSV,
    importProductNamesHiCSV,
    currentUser,
    settings,
    addCategory,
    addCustomUnit,
  } = useDairy();
  const { t, tx, lang } = useLanguage();
  const { productLabel, unitOf, matchesName } = useProductName();

  // Inline "+ New" for category and unit inside the product form (owner only)
  const [newCategoryName, setNewCategoryName] = useState<string | null>(null);
  const [newUnitName, setNewUnitName] = useState<string | null>(null);
  const [isAddingOption, setIsAddingOption] = useState(false);

  // Categories & Units manager opened from this screen (the More menu has the same screen)
  const [showCatalogSetup, setShowCatalogSetup] = useState(false);

  const handleAddCategory = async () => {
    if (newCategoryName === null || isAddingOption) return;
    setFormError(null);
    setIsAddingOption(true);
    const res = await addCategory(newCategoryName);
    setIsAddingOption(false);
    if (!res.success || !res.category) {
      setFormError(res.error || t('products.err.addCategory'));
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
      setFormError(res.error || t('products.err.addUnit'));
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
  const [nameHi, setNameHi] = useState('');
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
  const [csvType, setCsvType] = useState<'products' | 'customers' | 'namesHi'>('products');
  const [csvText, setCsvText] = useState('');
  const [importResult, setImportResult] = useState<{ success: boolean; msg: string; notFound?: string[] } | null>(null);

  const filtered = useMemo(() => {
    return products.filter(p => {
      const matchCat = selectedCat === 'all' || p.category_id === selectedCat;
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        matchesName(p, q) ||
        p.sku.toLowerCase().includes(q) ||
        (p.barcode && p.barcode.includes(q));
      return matchCat && matchSearch;
    });
  }, [products, selectedCat, searchQuery, matchesName]);

  const formCategories = categories.filter(c => c.active !== false || c.id === categoryId);

  const handleOpenAdd = () => {
    setEditingProd(null);
    setName('');
    setNameHi('');
    setCategoryId(categories.find(c => c.active !== false)?.id || '');
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
    setNameHi(prod.name_hi || '');
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
      setFormError(t('products.err.nameRequired'));
      return;
    }

    if (!categoryId) {
      setFormError(t('products.err.categoryRequired'));
      return;
    }

    if (sellingPrice < 0 || purchasePrice < 0) {
      setFormError(t('products.err.negativePrice'));
      return;
    }

    const res = editingProd
      ? await updateProduct(editingProd.id, {
        name: name.trim(),
        name_hi: nameHi.trim() || undefined,
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
          name_hi: nameHi.trim() || undefined,
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
      setFormError(res.error || t('products.err.save'));
      return;
    }

    setShowModal(false);
  };

  const handleRunCSVImport = async () => {
    setImportResult(null);
    if (!csvText.trim()) {
      setImportResult({ success: false, msg: t('products.csv.empty') });
      return;
    }

    if (csvType === 'products') {
      const res = await importProductsCSV(csvText);
      if (res.success) {
        setImportResult({ success: true, msg: t('products.csv.productsDone', { count: res.count }) });
        setCsvText('');
      } else {
        setImportResult({ success: false, msg: res.error || t('products.csv.productsFailed') });
      }
    } else if (csvType === 'customers') {
      const res = await importCustomerDuesCSV(csvText);
      if (res.success) {
        setImportResult({ success: true, msg: t('products.csv.customersDone', { count: res.count }) });
        setCsvText('');
      } else {
        setImportResult({ success: false, msg: res.error || t('products.csv.customersFailed') });
      }
    } else {
      const res = await importProductNamesHiCSV(csvText);
      if (res.success) {
        setImportResult({ success: true, msg: t('products.csv.namesHiDone', { count: res.count }), notFound: res.notFound });
        setCsvText('');
      } else {
        setImportResult({ success: false, msg: res.error || t('products.csv.namesHiFailed'), notFound: res.notFound });
      }
    }
  };

  const loadSampleCSV = () => {
    if (csvType === 'products') {
      setCsvText(`name,category,unit,purchase_price,selling_price,min_stock,track_expiry,opening_stock,name_hi
A2 Gir Cow Milk (Fresh),Fresh Milk,L,75,90,20,yes,40,A2 गिर गाय का दूध (ताज़ा)
Malai Paneer Slab 1kg,Paneer & Butter,kg,340,420,5,yes,15,मलाई पनीर 1 किलो
Amul Butter Chiplet 100g,Paneer & Butter,pkt,52,58,15,yes,30,अमूल मक्खन चिपलेट 100 ग्राम
Gulab Jamun Handi 1kg,Mithai & Sweets,bottle,220,280,4,no,8,गुलाब जामुन हांडी 1 किलो`);
    } else if (csvType === 'namesHi') {
      setCsvText(`name,name_hi
Amul Gold Milk 500 ml Pouch,अमूल गोल्ड दूध 500 मि.ली. पाउच
Amul Masti Dahi 400g Cup,अमूल मस्ती दही 400 ग्राम कप`);
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
            {t('products.title')}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            {t('products.subtitle')}
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
              <span>{t('products.csvImport')}</span>
            </button>
          )}

          {currentUser.role === 'owner' && (
            <button
              type="button"
              onClick={() => setShowCatalogSetup(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 text-xs font-semibold rounded-lg shadow-2xs transition-colors"
            >
              <Tags className="w-4 h-4" />
              <span>{t('products.categoriesUnits')}</span>
            </button>
          )}

          {currentUser.role === 'owner' && (
            <button
              type="button"
              onClick={handleOpenAdd}
              className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>{t('products.addProduct')}</span>
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
              placeholder={t('products.searchPlaceholder')}
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
            <option value="all">{t('products.allCategories')}</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <span className="text-slate-500 font-mono-numbers text-xs self-start sm:self-auto">
          {t('products.listed', { count: filtered.length })}
        </span>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="bg-slate-50 text-slate-500 border-b border-slate-200">
              <th className="py-3 px-4 font-semibold">{t('products.col.name')}</th>
              <th className="py-3 px-4 font-semibold">{t('products.col.skuBarcode')}</th>
              <th className="py-3 px-4 font-semibold">{t('common.category')}</th>
              <th className="py-3 px-4 font-semibold">{t('common.unit')}</th>
              <th className="py-3 px-4 text-right font-semibold">{t('products.col.cost')}</th>
              <th className="py-3 px-4 text-right font-semibold">{t('products.col.sellingRate')}</th>
              <th className="py-3 px-4 text-right font-semibold">{t('products.col.currentStock')}</th>
              <th className="py-3 px-4 font-semibold">{t('products.col.expiryTrack')}</th>
              <th className="py-3 px-4 text-center font-semibold">{t('common.active')}</th>
              <th className="py-3 px-4 text-center font-semibold">{t('common.actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map(p => {
              const cat = categories.find(c => c.id === p.category_id);
              const subName = lang === 'hi' && p.name_hi?.trim() ? p.name : p.name_hi?.trim();
              return (
                <tr
                  key={p.id}
                  className={`hover:bg-slate-50 transition-colors ${!p.active ? 'opacity-50' : ''}`}
                >
                  <td className="py-3 px-4 font-semibold text-slate-900">
                    {productLabel(p)}
                    {subName && <span className="block text-[10px] font-normal text-slate-400">{subName}</span>}
                  </td>
                  <td className="py-3 px-4 font-mono-numbers text-slate-500">
                    {p.sku}
                    {p.barcode && <span className="block text-[10px] text-slate-400">{p.barcode}</span>}
                  </td>
                  <td className="py-3 px-4 text-slate-600">{cat ? cat.name : '—'}</td>
                  <td className="py-3 px-4 font-mono-numbers text-slate-700">{unitOf(p.unit)}</td>
                  <td className="py-3 px-4 text-right font-mono-numbers text-slate-600">
                    ₹{p.purchase_price.toFixed(2)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono-numbers font-bold text-slate-900">
                    ₹{p.selling_price.toFixed(2)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono-numbers font-semibold text-slate-800">
                    {p.current_stock} {unitOf(p.unit)}
                  </td>
                  <td className="py-3 px-4">
                    {p.track_expiry ? (
                      <span className="text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded text-[11px] font-medium">
                        {t('products.expiryYes')}
                      </span>
                    ) : (
                      <span className="text-slate-400 text-[11px]">{t('common.no')}</span>
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
                      {p.active ? t('common.active') : t('common.inactive')}
                    </button>
                  </td>
                  <td className="py-3 px-4 text-center">
                    {currentUser.role === 'owner' && (
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(p)}
                        className="p-1 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded"
                        title={t('products.editTitle')}
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
              {editingProd ? t('products.form.editHeading') : t('products.form.addHeading')}
            </h3>

            {formError && (
              <div className="p-2.5 bg-red-50 text-red-700 rounded-lg text-xs flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveProduct} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">{t('products.form.name')}</label>
                <input
                  type="text"
                  required
                  placeholder={t('products.form.namePlaceholder')}
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">{t('products.form.nameHi')}</label>
                <input
                  type="text"
                  lang="hi"
                  placeholder={t('products.form.nameHiPlaceholder')}
                  value={nameHi}
                  onChange={e => setNameHi(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-slate-700 font-semibold">{t('products.form.category')}</label>
                    {currentUser.role === 'owner' && newCategoryName === null && (
                      <button
                        type="button"
                        onClick={() => setNewCategoryName('')}
                        className="text-[11px] text-blue-600 hover:text-blue-800 font-medium flex items-center gap-0.5"
                      >
                        <Plus className="w-3 h-3" />
                        <span>{t('products.form.new')}</span>
                      </button>
                    )}
                  </div>
                  {newCategoryName === null ? (
                    <select
                      value={categoryId}
                      onChange={e => setCategoryId(e.target.value)}
                      className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50"
                    >
                      {formCategories.length === 0 && <option value="">{t('products.form.addCategoryFirst')}</option>}
                      {formCategories.map(c => (
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
                        placeholder={t('products.form.categoryPlaceholder')}
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
                        {t('common.add')}
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewCategoryName(null)}
                        className="px-1.5 text-slate-500 hover:text-slate-900"
                        title={t('common.cancel')}
                      >
                        &times;
                      </button>
                    </div>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-slate-700 font-semibold">{t('products.form.unit')}</label>
                    {currentUser.role === 'owner' && newUnitName === null && (
                      <button
                        type="button"
                        onClick={() => setNewUnitName('')}
                        className="text-[11px] text-blue-600 hover:text-blue-800 font-medium flex items-center gap-0.5"
                      >
                        <Plus className="w-3 h-3" />
                        <span>{t('products.form.new')}</span>
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
                          {unitLabel(u) ? `${u} (${tx(`unitLabel.${u}`, unitLabel(u) || u)})` : u}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="flex gap-1">
                      <input
                        type="text"
                        autoFocus
                        maxLength={12}
                        placeholder={t('products.form.unitPlaceholder')}
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
                        {t('common.add')}
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewUnitName(null)}
                        className="px-1.5 text-slate-500 hover:text-slate-900"
                        title={t('common.cancel')}
                      >
                        &times;
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">{t('products.form.sku')}</label>
                  <input
                    type="text"
                    required
                    value={sku}
                    onChange={e => setSku(e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg font-mono-numbers"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">{t('products.form.barcode')}</label>
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
                  <label className="block text-slate-700 font-semibold mb-1">{t('products.form.purchaseCost')}</label>
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
                    {t('products.form.sellingPrice')}
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
                      {t('products.form.priceChangeLogged')}
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">{t('products.form.minStock')}</label>
                  <input
                    type="number"
                    step={qtyStep(unit)}
                    min="0"
                    inputMode={isLooseUnit(unit) ? 'decimal' : 'numeric'}
                    value={minStock}
                    onChange={e => setMinStock(parseQty(e.target.value, unit))}
                    className="w-full p-2 border border-slate-200 rounded-lg font-mono-numbers"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">{t('products.form.gst')}</label>
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
                    {t('products.form.openingStock', { unit: unitOf(unit) })}
                  </label>
                  <input
                    type="number"
                    step={qtyStep(unit)}
                    min="0"
                    inputMode={isLooseUnit(unit) ? 'decimal' : 'numeric'}
                    value={openingStock}
                    onChange={e => setOpeningStock(parseQty(e.target.value, unit))}
                    className="w-full p-2 border border-slate-200 rounded-lg font-mono-numbers"
                  />
                  <span className="text-[10px] text-slate-500">
                    {t('products.form.openingStockHint')}
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
                  <span>{t('products.form.trackExpiry')}</span>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-3 py-1.5 text-slate-600 hover:text-slate-900"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-900 text-white font-semibold rounded-lg hover:bg-slate-800"
                >
                  {editingProd ? t('products.form.saveChanges') : t('products.form.create')}
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
                <h3 className="font-bold text-slate-900 text-base">{t('products.csv.title')}</h3>
                <p className="text-xs text-slate-500">
                  {t('products.csv.subtitle')}
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
                {t('products.csv.tabProducts')}
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
                {t('products.csv.tabCustomers')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setCsvType('namesHi');
                  setImportResult(null);
                }}
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                  csvType === 'namesHi'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {t('products.csv.tabNamesHi')}
              </button>
            </div>

            {csvType === 'namesHi' && (
              <p className="text-[11px] text-slate-500 leading-relaxed">{t('products.csv.namesHiHint')}</p>
            )}

            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-600 font-medium">{t('products.csv.pasteBelow')}</span>
              <button
                type="button"
                onClick={loadSampleCSV}
                className="text-xs text-blue-600 hover:text-blue-800 font-semibold"
              >
                {t('products.csv.loadSample')}
              </button>
            </div>

            <textarea
              rows={8}
              value={csvText}
              onChange={e => setCsvText(e.target.value)}
              placeholder={t('products.csv.placeholder')}
              className="w-full p-3 font-mono-numbers text-xs border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-1 focus:ring-slate-900"
            />

            {importResult && (
              <div
                className={`p-3 rounded-lg text-xs flex items-start gap-2 ${
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
                <div>
                  <span>{importResult.msg}</span>
                  {importResult.notFound && importResult.notFound.length > 0 && (
                    <div className="mt-1 text-slate-700">
                      <span className="font-semibold">
                        {t('products.csv.notFound', { count: importResult.notFound.length })}
                      </span>{' '}
                      {importResult.notFound.slice(0, 10).join(', ')}
                      {importResult.notFound.length > 10 &&
                        ` ${t('products.csv.more', { count: importResult.notFound.length - 10 })}`}
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 text-xs">
              <button
                type="button"
                onClick={() => setShowCsvModal(false)}
                className="px-3 py-2 text-slate-600 hover:text-slate-900"
              >
                {t('common.close')}
              </button>
              <button
                type="button"
                onClick={handleRunCSVImport}
                className="px-4 py-2 bg-slate-900 text-white font-bold rounded-lg hover:bg-slate-800"
              >
                {t('products.csv.run')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Categories & Units Manager */}
      {showCatalogSetup && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-slate-100 rounded-xl shadow-2xl max-w-5xl w-full relative">
            <button
              type="button"
              onClick={() => setShowCatalogSetup(false)}
              className="absolute top-3 right-4 text-slate-400 hover:text-slate-700 text-2xl font-bold"
              title={t('common.close')}
            >
              &times;
            </button>
            <CategoriesUnitsScreen />
          </div>
        </div>
      )}
    </div>
  );
};
