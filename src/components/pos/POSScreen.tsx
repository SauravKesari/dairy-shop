import React, { useState, useMemo } from 'react';
import { useDairy } from '../../context/DairyContext';
import { Product, PaymentMethod, Sale } from '../../types';
import { ReceiptModal } from './ReceiptModal';
import { UpiPaymentModal } from './UpiPaymentModal';
import { isLooseUnit } from '../../lib/units';
import { useLanguage } from '../../i18n/LanguageContext';
import { useProductName } from '../../i18n/useProductName';
import {
  Search,
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  UserCheck,
  AlertTriangle,
  Receipt,
  UserPlus,
  CreditCard,
  Banknote,
  QrCode,
  BookOpen,
  Lock,
} from 'lucide-react';

interface CartItem {
  product: Product;
  qty: number;
  unit_price: number;
}

export const POSScreen: React.FC = () => {
  const {
    products,
    categories,
    customers,
    currentUser,
    settings,
    createSale,
    addCustomer,
    currentBusinessDate,
    isDateClosed,
    can,
  } = useDairy();
  const { t } = useLanguage();
  const { productLabel, unitOf, matchesName } = useProductName();

  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  
  // Offline entry options (for power cut / internet outage fallback)
  const [isOfflineEntry, setIsOfflineEntry] = useState<boolean>(false);
  const [offlineBillRef, setOfflineBillRef] = useState<string>('');
  const [offlineDate, setOfflineDate] = useState<string>(currentBusinessDate);

  // Quick Customer Add Modal
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustMobile, setNewCustMobile] = useState('');
  const [newCustLimit, setNewCustLimit] = useState('');

  // Post sale receipt modal
  const [completedSale, setCompletedSale] = useState<Sale | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  const activeProducts = useMemo(() => {
    return products.filter(p => p.active);
  }, [products]);

  const filteredProducts = useMemo(() => {
    return activeProducts.filter(p => {
      const matchesCat = selectedCategory === 'all' || p.category_id === selectedCategory;
      const query = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !query ||
        matchesName(p, query) ||
        p.sku.toLowerCase().includes(query) ||
        (p.barcode && p.barcode.includes(query));
      return matchesCat && matchesSearch;
    });
  }, [activeProducts, selectedCategory, searchQuery, matchesName]);

  const selectedCustomer = useMemo(() => {
    return customers.find(c => c.id === selectedCustomerId);
  }, [customers, selectedCustomerId]);

  const isDayClosed = isDateClosed(isOfflineEntry ? offlineDate : currentBusinessDate);

  // Add to cart
  const addToCart = (product: Product, deltaQty = 1) => {
    setErrorBanner(null);
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      const currentCartQty = existing ? existing.qty : 0;
      const targetQty = Number((currentCartQty + deltaQty).toFixed(3));

      // Stock check
      if (!settings.allow_negative_stock && targetQty > product.current_stock) {
        setErrorBanner(
          t('pos.err.cannotAdd', {
            qty: targetQty,
            unit: unitOf(product.unit),
            name: productLabel(product),
            stock: product.current_stock,
          })
        );
        return prev;
      }

      if (existing) {
        return prev.map(item =>
          item.product.id === product.id ? { ...item, qty: targetQty } : item
        );
      } else {
        return [
          ...prev,
          {
            product,
            qty: targetQty,
            unit_price: product.selling_price,
          },
        ];
      }
    });
  };

  const updateCartQty = (productId: string, rawQty: number) => {
    setErrorBanner(null);
    const product = products.find(p => p.id === productId);
    if (!product) return;
    // Packs (pouch, pkt, cup, tin…) are counted in whole numbers; only loose L / kg take decimals
    const newQty = isLooseUnit(product.unit) ? rawQty : Math.round(rawQty);
    if (newQty <= 0) {
      removeFromCart(productId);
      return;
    }

    if (!settings.allow_negative_stock && newQty > product.current_stock) {
      setErrorBanner(
        t('pos.err.insufficient', {
          name: productLabel(product),
          stock: product.current_stock,
          unit: unitOf(product.unit),
        })
      );
      return;
    }

    setCart(prev =>
      prev.map(item =>
        item.product.id === productId ? { ...item, qty: Number(newQty.toFixed(3)) } : item
      )
    );
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setDiscountAmount(0);
    setErrorBanner(null);
  };

  // Calculations
  const subtotal = useMemo(() => {
    return cart.reduce((acc, item) => acc + item.qty * item.unit_price, 0);
  }, [cart]);

  const discountPercent = subtotal > 0 ? (discountAmount / subtotal) * 100 : 0;
  const isCashierDiscountExceeded =
    currentUser.role === 'cashier' && discountPercent > settings.cashier_max_discount_percent;

  const taxAmount = useMemo(() => {
    if (!settings.gst_enabled) return 0;
    const taxableSubtotal = Math.max(0, subtotal - discountAmount);
    return (taxableSubtotal * (settings.default_gst_percent || 0)) / 100;
  }, [subtotal, discountAmount, settings]);

  const totalPayable = Math.max(0, Number((subtotal - discountAmount + taxAmount).toFixed(2)));

  // Guards against a double tap creating two bills while the transaction is in flight
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  // UPI bills show the payment QR first; the bill is saved once the cashier confirms payment
  const [showUpiModal, setShowUpiModal] = useState(false);

  // Handle Checkout
  const handleCheckout = async () => {
    if (isCheckingOut) return;
    setErrorBanner(null);

    if (cart.length === 0) {
      setErrorBanner(t('pos.err.cartEmpty'));
      return;
    }

    if (isCashierDiscountExceeded) {
      setErrorBanner(
        t('pos.err.discountLimit', {
          max: settings.cashier_max_discount_percent,
          pct: discountPercent.toFixed(1),
        })
      );
      return;
    }

    if (paymentMethod === 'credit' && !selectedCustomerId) {
      setErrorBanner(t('pos.err.selectCustomer'));
      return;
    }

    // Paper bills were already paid during the outage, so they skip the QR
    if (paymentMethod === 'upi' && !isOfflineEntry && totalPayable > 0) {
      if (!settings.upi_id) {
        setErrorBanner(
          currentUser.role === 'owner'
            ? t('pos.err.upiOwner')
            : t('pos.err.upiCashier')
        );
        return;
      }
      setShowUpiModal(true);
      return;
    }

    await saveSale();
  };

  const saveSale = async () => {
    setIsCheckingOut(true);
    const saleResult = await createSale({
      customer_id: selectedCustomerId || null,
      payment_method: paymentMethod,
      discount: discountAmount,
      is_offline_entry: isOfflineEntry,
      offline_bill_ref: offlineBillRef,
      custom_business_date: isOfflineEntry ? offlineDate : currentBusinessDate,
      items: cart.map(item => ({
        product_id: item.product.id,
        qty: item.qty,
        unit_price: item.unit_price,
      })),
    });

    setIsCheckingOut(false);
    setShowUpiModal(false);

    if (!saleResult.success) {
      setErrorBanner(saleResult.error || t('pos.err.saleFailed'));
      return;
    }

    // Success! Show receipt and clear cart
    setCompletedSale(saleResult.sale!);
    clearCart();
    setSelectedCustomerId('');
    setIsOfflineEntry(false);
    setOfflineBillRef('');
  };

  // Create new customer directly from POS
  const handleQuickAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName.trim()) return;

    const limit = newCustLimit ? parseFloat(newCustLimit) : null;
    const res = await addCustomer({
      name: newCustName.trim(),
      mobile: newCustMobile.trim() || '9800000000',
      credit_limit: limit,
    });
    if (!res.success || !res.customer) {
      setErrorBanner(res.error || t('pos.err.addCustomerFailed'));
      return;
    }

    setSelectedCustomerId(res.customer.id);
    setShowAddCustomerModal(false);
    setNewCustName('');
    setNewCustMobile('');
    setNewCustLimit('');
  };

  return (
    <div className="h-[calc(100vh-65px)] flex flex-col md:flex-row overflow-hidden bg-slate-100">
      {/* LEFT: Product Catalog & Quick Tap Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden border-r border-slate-200 bg-white">
        {/* Top Search & Filter Bar */}
        <div className="p-4 border-b border-slate-200 space-y-3 bg-white">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder={t('pos.searchPlaceholder')}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-800 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-700"
                >
                  {t('pos.clear')}
                </button>
              )}
            </div>

            {/* Offline Entry Button */}
            <button
              type="button"
              onClick={() => setIsOfflineEntry(!isOfflineEntry)}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap ${
                isOfflineEntry
                  ? 'bg-amber-100 border-amber-300 text-amber-900'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
              title={t('pos.paperBillTitle')}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>{isOfflineEntry ? t('pos.offlineBillMode') : t('pos.paperBillEntry')}</span>
            </button>
          </div>

          {/* Offline Entry Settings Bar */}
          {isOfflineEntry && (
            <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg flex flex-wrap items-center gap-3 text-xs">
              <span className="font-semibold text-amber-900">{t('pos.outageMode')}</span>
              <div className="flex items-center gap-1.5">
                <label className="text-slate-600">{t('pos.billBookNo')}</label>
                <input
                  type="text"
                  placeholder={t('pos.billBookPlaceholder')}
                  value={offlineBillRef}
                  onChange={e => setOfflineBillRef(e.target.value)}
                  className="px-2 py-1 bg-white border border-amber-300 rounded text-xs w-28"
                />
              </div>
              <div className="flex items-center gap-1.5">
                <label className="text-slate-600">{t('pos.originalDate')}</label>
                <input
                  type="date"
                  value={offlineDate}
                  onChange={e => setOfflineDate(e.target.value)}
                  className="px-2 py-1 bg-white border border-amber-300 rounded text-xs"
                />
              </div>
              <span className="text-[11px] text-amber-700">
                {t('pos.offlineAuditNote')}
              </span>
            </div>
          )}

          {/* Category Tabs (Segmented Button Control) */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1.5 font-medium rounded-md whitespace-nowrap transition-colors ${
                selectedCategory === 'all'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:text-slate-900'
              }`}
            >
              {t('pos.allItems', { count: activeProducts.length })}
            </button>
            {categories.map(cat => {
              const count = activeProducts.filter(p => p.category_id === cat.id).length;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3 py-1.5 font-medium rounded-md whitespace-nowrap transition-colors ${
                    selectedCategory === cat.id
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {cat.name} ({count})
                </button>
              );
            })}
          </div>
        </div>

        {/* Product Cards Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {filteredProducts.length === 0 ? (
            <div className="h-48 flex flex-col items-center justify-center text-slate-400 text-sm">
              <Search className="w-8 h-8 mb-2 opacity-50" />
              <p>{t('pos.noProducts')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {filteredProducts.map(product => {
                const isLowStock = product.current_stock <= product.min_stock;
                const isOutOfStock = product.current_stock <= 0;
                const inCart = cart.find(item => item.product.id === product.id);

                return (
                  <div
                    key={product.id}
                    className={`relative flex flex-col justify-between p-3 rounded-xl border transition-all text-left group bg-white ${
                      isOutOfStock && !settings.allow_negative_stock
                        ? 'opacity-60 border-slate-200 bg-slate-50'
                        : inCart
                        ? 'border-slate-900 ring-1 ring-slate-900 shadow-xs'
                        : 'border-slate-200 hover:border-slate-400 hover:shadow-xs'
                    }`}
                  >
                    <div>
                      {/* Name & SKU */}
                      <h4 className="font-semibold text-slate-900 text-sm leading-snug line-clamp-2">
                        {productLabel(product)}
                      </h4>
                      <p className="text-[11px] font-mono-numbers text-slate-400 mt-0.5">
                        {product.sku}
                      </p>
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-100">
                      <div className="flex items-baseline justify-between">
                        <span className="text-base font-extrabold text-slate-900 font-mono-numbers">
                          ₹{product.selling_price}
                        </span>
                        <span className="text-xs text-slate-500">/{unitOf(product.unit)}</span>
                      </div>

                      {/* Stock level badge */}
                      <div className="flex items-center justify-between mt-1 text-[11px]">
                        <span
                          className={`font-mono-numbers ${
                            isOutOfStock
                              ? 'text-red-600 font-bold'
                              : isLowStock
                              ? 'text-amber-600 font-medium'
                              : 'text-slate-500'
                          }`}
                        >
                          {t('pos.stock', { qty: product.current_stock, unit: unitOf(product.unit) })}
                        </span>
                        {inCart && (
                          <span className="font-semibold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded font-mono-numbers text-[10px]">
                            {t('pos.inCart', { qty: inCart.qty })}
                          </span>
                        )}
                      </div>

                      {/* Dairy Quick Add Buttons for Loose Milk/Paneer vs Packets */}
                      {isLooseUnit(product.unit) ? (
                        <div className="grid grid-cols-3 gap-1 mt-2">
                          <button
                            type="button"
                            disabled={isOutOfStock && !settings.allow_negative_stock}
                            onClick={() => addToCart(product, 0.25)}
                            className="py-1 text-[10px] font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition-colors"
                          >
                            +0.25
                          </button>
                          <button
                            type="button"
                            disabled={isOutOfStock && !settings.allow_negative_stock}
                            onClick={() => addToCart(product, 0.5)}
                            className="py-1 text-[10px] font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition-colors"
                          >
                            +0.5
                          </button>
                          <button
                            type="button"
                            disabled={isOutOfStock && !settings.allow_negative_stock}
                            onClick={() => addToCart(product, 1.0)}
                            className="py-1 text-[10px] font-medium bg-slate-900 hover:bg-slate-800 text-white rounded transition-colors"
                          >
                            +1 {unitOf(product.unit)}
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          disabled={isOutOfStock && !settings.allow_negative_stock}
                          onClick={() => addToCart(product, 1)}
                          className="w-full mt-2 py-1.5 text-xs font-semibold rounded-lg bg-slate-900 hover:bg-slate-800 text-white transition-colors flex items-center justify-center gap-1 disabled:bg-slate-300 disabled:cursor-not-allowed"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>{t('pos.addToCart')}</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT: Active Cart, Customer Udhaar & Checkout */}
      <div className="w-full md:w-[420px] lg:w-[460px] flex flex-col h-full bg-slate-50 border-t md:border-t-0 md:border-l border-slate-200">
        {/* Cart Header */}
        <div className="p-4 border-b border-slate-200 bg-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-slate-800" />
            <h3 className="font-bold text-slate-900 text-base">{t('pos.currentBill')}</h3>
            <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-mono-numbers">
              {t('pos.itemsCount', { count: cart.length })}
            </span>
          </div>

          {cart.length > 0 && (
            <button
              type="button"
              onClick={clearCart}
              className="text-xs text-red-600 hover:text-red-700 font-medium flex items-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{t('pos.clear')}</span>
            </button>
          )}
        </div>

        {/* Closed Day Lock Notice */}
        {isDayClosed && (
          <div className="p-3 bg-red-50 border-b border-red-200 text-red-800 text-xs flex items-center gap-2">
            <Lock className="w-4 h-4 text-red-600 shrink-0" />
            <span>
              <strong>{t('pos.dayClosed')}</strong> {currentUser.role === 'cashier' ? t('pos.dayClosedCashier') : t('pos.dayClosedOwner')}
            </span>
          </div>
        )}

        {/* Error Banner */}
        {errorBanner && (
          <div className="p-3 bg-red-50 border-b border-red-200 text-red-700 text-xs flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <div className="flex-1">{errorBanner}</div>
            <button
              onClick={() => setErrorBanner(null)}
              className="text-red-500 hover:text-red-800 font-bold"
            >
              &times;
            </button>
          </div>
        )}

        {/* Cart Items List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 text-sm">
              <ShoppingCart className="w-10 h-10 mb-2 stroke-1 opacity-40" />
              <p className="font-medium text-slate-500">{t('pos.cartEmpty')}</p>
              <p className="text-xs text-slate-400 mt-1">{t('pos.cartEmptyHint')}</p>
            </div>
          ) : (
            cart.map(item => (
              <div
                key={item.product.id}
                className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs flex flex-col gap-2"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1 pr-2">
                    <h5 className="text-xs font-semibold text-slate-900 leading-snug">
                      {productLabel(item.product)}
                    </h5>
                    <p className="text-[11px] text-slate-500 font-mono-numbers">
                      ₹{item.unit_price} / {unitOf(item.product.unit)}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold font-mono-numbers text-slate-900">
                      ₹{(item.qty * item.unit_price).toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Quantity Controls & Direct Input */}
                <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() =>
                        updateCartQty(item.product.id, item.qty - (isLooseUnit(item.product.unit) ? 0.25 : 1))
                      }
                      className="p-1 text-slate-600 hover:bg-slate-100 rounded"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>

                    <input
                      type="number"
                      // Browsers count spinner steps from `min`, so min must be a multiple of step
                      step={isLooseUnit(item.product.unit) ? '0.001' : '1'}
                      min={isLooseUnit(item.product.unit) ? '0.001' : '1'}
                      inputMode={isLooseUnit(item.product.unit) ? 'decimal' : 'numeric'}
                      value={item.qty}
                      onChange={e =>
                        updateCartQty(item.product.id, parseFloat(e.target.value) || 0)
                      }
                      className="w-16 text-center font-mono-numbers text-xs font-semibold bg-slate-50 border border-slate-200 rounded py-0.5 focus:outline-none focus:ring-1 focus:ring-slate-900"
                    />

                    <span className="text-[11px] text-slate-500 mr-1">{unitOf(item.product.unit)}</span>

                    <button
                      type="button"
                      onClick={() =>
                        updateCartQty(item.product.id, item.qty + (isLooseUnit(item.product.unit) ? 0.25 : 1))
                      }
                      className="p-1 text-slate-600 hover:bg-slate-100 rounded"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => removeFromCart(item.product.id)}
                    className="p-1 text-slate-400 hover:text-red-600 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Bill Metadata: Customer Udhaar & Discount */}
        <div className="p-4 bg-white border-t border-slate-200 space-y-3">
          {/* Customer Selection (Required for Credit/Udhaar) */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <label className="font-semibold text-slate-700 flex items-center gap-1">
                <UserCheck className="w-3.5 h-3.5 text-slate-500" />
                <span>{t('pos.customerLabel')}</span>
              </label>
              {can('add_customers') && (
              <button
                type="button"
                onClick={() => setShowAddCustomerModal(true)}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-0.5"
              >
                <UserPlus className="w-3 h-3" />
                <span>{t('pos.newCustomer')}</span>
              </button>
              )}
            </div>

            <select
              value={selectedCustomerId}
              onChange={e => setSelectedCustomerId(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-slate-900"
            >
              <option value="">{t('pos.directCustomer')}</option>
              {customers.map(cust => (
                <option key={cust.id} value={cust.id}>
                  {t('pos.customerOption', { name: cust.name, dues: cust.current_dues })}{' '}
                  {cust.credit_limit ? t('pos.customerOptionLimit', { limit: cust.credit_limit }) : ''}
                </option>
              ))}
            </select>

            {selectedCustomer && (
              <div className="p-2 bg-amber-50/70 border border-amber-200 rounded-md text-[11px] flex justify-between items-center text-amber-900">
                <span>
                  {t('pos.existingBalance')} <strong>₹{selectedCustomer.current_dues}</strong>
                </span>
                {selectedCustomer.credit_limit && (
                  <span>
                    {t('pos.limit')} <strong>₹{selectedCustomer.credit_limit}</strong>
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Payment Method Segmented Buttons */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">{t('pos.paymentMode')}</label>
            <div className={`grid gap-1 ${can('give_credit') ? 'grid-cols-4' : 'grid-cols-3'}`}>
              <button
                type="button"
                onClick={() => setPaymentMethod('cash')}
                className={`flex flex-col items-center justify-center py-2 px-1 text-xs font-medium rounded-lg border transition-all ${
                  paymentMethod === 'cash'
                    ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <Banknote className="w-4 h-4 mb-0.5" />
                <span>{t('payment.cash')}</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('upi')}
                className={`flex flex-col items-center justify-center py-2 px-1 text-xs font-medium rounded-lg border transition-all ${
                  paymentMethod === 'upi'
                    ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <QrCode className="w-4 h-4 mb-0.5" />
                <span>{t('pos.upiQr')}</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('card')}
                className={`flex flex-col items-center justify-center py-2 px-1 text-xs font-medium rounded-lg border transition-all ${
                  paymentMethod === 'card'
                    ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <CreditCard className="w-4 h-4 mb-0.5" />
                <span>{t('payment.card')}</span>
              </button>

              {can('give_credit') && (
              <button
                type="button"
                onClick={() => setPaymentMethod('credit')}
                className={`flex flex-col items-center justify-center py-2 px-1 text-xs font-medium rounded-lg border transition-all ${
                  paymentMethod === 'credit'
                    ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                    : 'bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100'
                }`}
              >
                <Receipt className="w-4 h-4 mb-0.5" />
                <span>{t('payment.credit')}</span>
              </button>
              )}
            </div>
          </div>

          {/* Discount & Totals */}
          <div className="space-y-2 pt-2 border-t border-slate-100 text-xs">
            <div className="flex items-center justify-between text-slate-600">
              <span>{t('pos.subtotal')}</span>
              <span className="font-mono-numbers font-medium text-slate-900">
                ₹{subtotal.toFixed(2)}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-600">
                {t('pos.discount')}
                {currentUser.role === 'cashier' && (
                  <span className="text-[10px] text-slate-400 ml-1">
                    {t('pos.maxDiscount', { pct: settings.cashier_max_discount_percent })}
                  </span>
                )}
              </span>
              <input
                type="number"
                min="0"
                max={subtotal}
                value={discountAmount || ''}
                onChange={e => setDiscountAmount(parseFloat(e.target.value) || 0)}
                placeholder="0"
                className={`w-24 text-right font-mono-numbers py-0.5 px-2 bg-slate-50 border rounded text-xs focus:outline-none ${
                  isCashierDiscountExceeded
                    ? 'border-red-500 text-red-600 bg-red-50'
                    : 'border-slate-200'
                }`}
              />
            </div>

            {isCashierDiscountExceeded && (
              <p className="text-[10px] text-red-600 text-right">
                {t('pos.discountExceeded', { pct: settings.cashier_max_discount_percent })}
              </p>
            )}

            {settings.gst_enabled && (
              <div className="flex items-center justify-between text-slate-600">
                <span>{t('pos.gst', { pct: settings.default_gst_percent })}</span>
                <span className="font-mono-numbers">₹{taxAmount.toFixed(2)}</span>
              </div>
            )}

            {/* Total Payable Box */}
            <div className="flex items-center justify-between p-3 bg-slate-900 text-white rounded-xl">
              <div>
                <span className="text-xs text-slate-400 block">{t('pos.totalPayable')}</span>
                <span className="text-2xl font-extrabold font-mono-numbers tracking-tight">
                  ₹{totalPayable.toFixed(2)}
                </span>
              </div>

              <button
                type="button"
                disabled={isCheckingOut || cart.length === 0 || (isDayClosed && currentUser.role === 'cashier')}
                onClick={handleCheckout}
                className="px-6 py-3 bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 font-bold rounded-lg transition-all shadow-md disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed"
              >
                {isCheckingOut ? t('pos.saving') : t('pos.completeBill')}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Add Customer Modal */}
      {showAddCustomerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl p-5 max-w-sm w-full shadow-xl">
            <h4 className="text-sm font-bold text-slate-900 mb-3">{t('pos.addCustomerTitle')}</h4>
            <form onSubmit={handleQuickAddCustomer} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-600 font-medium block mb-1">{t('pos.customerName')}</label>
                <input
                  type="text"
                  required
                  placeholder={t('pos.customerNamePlaceholder')}
                  value={newCustName}
                  onChange={e => setNewCustName(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="text-slate-600 font-medium block mb-1">{t('pos.mobile')}</label>
                <input
                  type="tel"
                  placeholder="98XXXXXXXX"
                  value={newCustMobile}
                  onChange={e => setNewCustMobile(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="text-slate-600 font-medium block mb-1">{t('pos.creditLimit')}</label>
                <input
                  type="number"
                  placeholder={t('pos.creditLimitPlaceholder')}
                  value={newCustLimit}
                  onChange={e => setNewCustLimit(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddCustomerModal(false)}
                  className="px-3 py-1.5 text-slate-600 hover:text-slate-900"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-slate-900 text-white font-medium rounded-lg hover:bg-slate-800"
                >
                  {t('pos.saveCustomer')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* UPI Payment QR (before the bill is saved) */}
      {showUpiModal && (
        <UpiPaymentModal
          upiId={settings.upi_id}
          payeeName={settings.shop_name}
          amount={totalPayable}
          isSaving={isCheckingOut}
          onConfirm={saveSale}
          onCancel={() => setShowUpiModal(false)}
        />
      )}

      {/* Sale Receipt Modal */}
      {completedSale && (
        <ReceiptModal sale={completedSale} onClose={() => setCompletedSale(null)} />
      )}
    </div>
  );
};
