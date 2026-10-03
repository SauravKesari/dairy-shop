import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  User,
  Settings,
  Category,
  Product,
  Supplier,
  Customer,
  Sale,
  Purchase,
  StockMovement,
  CustomerLedgerEntry,
  Expense,
  DailyClosing,
  AuditLog,
  ExpiryAlertItem,
  PaymentMethod,
} from '../types';
import {
  initialSettings,
  initialUsers,
  initialCategories,
  initialProducts,
  initialSuppliers,
  initialCustomers,
  initialSales,
  initialPurchases,
  initialStockMovements,
  initialCustomerLedger,
  initialExpenses,
  initialDailyClosings,
  initialAuditLogs,
} from '../data/initialData';

interface NewSaleItemInput {
  product_id: string;
  qty: number;
  unit_price: number;
  discount?: number;
}

interface NewSaleInput {
  customer_id?: string | null;
  payment_method: PaymentMethod;
  discount: number;
  items: NewSaleItemInput[];
  is_offline_entry?: boolean;
  offline_bill_ref?: string;
  custom_business_date?: string;
}

interface NewPurchaseLineInput {
  product_id: string;
  qty: number;
  unit_cost: number;
  expiry_date?: string | null;
}

interface NewPurchaseInput {
  supplier_id: string;
  supplier_invoice_no: string;
  purchase_date: string;
  notes?: string;
  update_product_cost?: boolean;
  items: NewPurchaseLineInput[];
}

interface DairyContextType {
  currentUser: User;
  setCurrentUser: (user: User) => void;
  users: User[];
  settings: Settings;
  updateSettings: (newSettings: Partial<Settings>) => void;
  categories: Category[];
  addCategory: (name: string) => void;
  products: Product[];
  addProduct: (product: Omit<Product, 'id' | 'current_stock' | 'created_at' | 'updated_at'>, opening_stock?: number) => void;
  updateProduct: (id: string, updates: Partial<Product>) => void;
  toggleProductActive: (id: string) => void;
  suppliers: Supplier[];
  addSupplier: (supplier: Omit<Supplier, 'id' | 'active'>) => void;
  updateSupplier: (id: string, updates: Partial<Supplier>) => void;
  customers: Customer[];
  addCustomer: (cust: Omit<Customer, 'id' | 'active' | 'current_dues'>, opening_due?: number) => Customer;
  updateCustomer: (id: string, updates: Partial<Customer>) => void;
  sales: Sale[];
  createSale: (input: NewSaleInput) => { success: boolean; sale?: Sale; error?: string };
  cancelSale: (saleId: string, reason: string) => { success: boolean; error?: string };
  purchases: Purchase[];
  createPurchase: (input: NewPurchaseInput) => { success: boolean; error?: string };
  stockMovements: StockMovement[];
  adjustStock: (productId: string, type: 'damage' | 'expired' | 'adjustment', qtyChange: number, reason: string) => { success: boolean; error?: string };
  customerLedger: CustomerLedgerEntry[];
  recordCustomerPayment: (customerId: string, amount: number, paymentMethod: 'cash' | 'upi', note?: string) => { success: boolean; error?: string };
  expenses: Expense[];
  addExpense: (expense: Omit<Expense, 'id' | 'created_by' | 'created_by_name' | 'created_at'>) => { success: boolean; error?: string };
  updateExpense: (id: string, updates: Partial<Expense>) => { success: boolean; error?: string };
  deleteExpense: (id: string) => { success: boolean; error?: string };
  dailyClosings: DailyClosing[];
  currentBusinessDate: string;
  setCurrentBusinessDate: (date: string) => void;
  isDateClosed: (date: string) => boolean;
  getDailyCashSummary: (date: string) => {
    opening_cash: number;
    cash_sales: number;
    upi_sales: number;
    card_sales: number;
    credit_sales: number;
    cash_from_dues: number;
    cash_expenses: number;
    expected_cash: number;
    actual_cash?: number;
    difference?: number;
    status: 'closed' | 'open';
  };
  saveDailyClosing: (date: string, openingCash: number, actualCash: number, note?: string) => { success: boolean; error?: string };
  reopenDailyClosing: (date: string, reason: string) => { success: boolean; error?: string };
  auditLogs: AuditLog[];
  expiryAlerts: ExpiryAlertItem[];
  importProductsCSV: (csvText: string) => { success: boolean; count: number; error?: string };
  importCustomerDuesCSV: (csvText: string) => { success: boolean; count: number; error?: string };
  resetToDemoData: () => void;
  exportDatabaseJSON: () => string;
  importDatabaseJSON: (jsonString: string) => { success: boolean; error?: string };
  // User management
  addUser: (name: string, mobile: string, pin: string, role: 'owner' | 'cashier') => void;
  updateUserPin: (userId: string, newPin: string) => void;
  toggleUserActive: (userId: string) => void;
}

const DairyContext = createContext<DairyContextType | undefined>(undefined);

const STORAGE_KEY = 'gokul_dairy_v1_store';

export const DairyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Load from localStorage or initial
  const loadStored = <T,>(key: string, fallback: T): T => {
    try {
      const stored = localStorage.getItem(`${STORAGE_KEY}_${key}`);
      return stored ? JSON.parse(stored) : fallback;
    } catch (e) {
      console.warn(`Error reading ${key} from storage:`, e);
      return fallback;
    }
  };

  const [settings, setSettings] = useState<Settings>(() => loadStored('settings', initialSettings));
  const [users, setUsers] = useState<User[]>(() => loadStored('users', initialUsers));
  const [currentUser, setCurrentUser] = useState<User>(() => users[0] || initialUsers[0]);
  const [categories, setCategories] = useState<Category[]>(() => loadStored('categories', initialCategories));
  const [products, setProducts] = useState<Product[]>(() => loadStored('products', initialProducts));
  const [suppliers, setSuppliers] = useState<Supplier[]>(() => loadStored('suppliers', initialSuppliers));
  const [customers, setCustomers] = useState<Customer[]>(() => loadStored('customers', initialCustomers));
  const [sales, setSales] = useState<Sale[]>(() => loadStored('sales', initialSales));
  const [purchases, setPurchases] = useState<Purchase[]>(() => loadStored('purchases', initialPurchases));
  const [stockMovements, setStockMovements] = useState<StockMovement[]>(() => loadStored('stock_movements', initialStockMovements));
  const [customerLedger, setCustomerLedger] = useState<CustomerLedgerEntry[]>(() => loadStored('customer_ledger', initialCustomerLedger));
  const [expenses, setExpenses] = useState<Expense[]>(() => loadStored('expenses', initialExpenses));
  const [dailyClosings, setDailyClosings] = useState<DailyClosing[]>(() => loadStored('daily_closings', initialDailyClosings));
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => loadStored('audit_logs', initialAuditLogs));
  
  // Default system date: 2026-10-02 (allows easy testing of past dates & today)
  const [currentBusinessDate, setCurrentBusinessDate] = useState<string>('2026-10-02');

  // Sync to localStorage
  useEffect(() => { localStorage.setItem(`${STORAGE_KEY}_settings`, JSON.stringify(settings)); }, [settings]);
  useEffect(() => { localStorage.setItem(`${STORAGE_KEY}_users`, JSON.stringify(users)); }, [users]);
  useEffect(() => { localStorage.setItem(`${STORAGE_KEY}_categories`, JSON.stringify(categories)); }, [categories]);
  useEffect(() => { localStorage.setItem(`${STORAGE_KEY}_products`, JSON.stringify(products)); }, [products]);
  useEffect(() => { localStorage.setItem(`${STORAGE_KEY}_suppliers`, JSON.stringify(suppliers)); }, [suppliers]);
  useEffect(() => { localStorage.setItem(`${STORAGE_KEY}_customers`, JSON.stringify(customers)); }, [customers]);
  useEffect(() => { localStorage.setItem(`${STORAGE_KEY}_sales`, JSON.stringify(sales)); }, [sales]);
  useEffect(() => { localStorage.setItem(`${STORAGE_KEY}_purchases`, JSON.stringify(purchases)); }, [purchases]);
  useEffect(() => { localStorage.setItem(`${STORAGE_KEY}_stock_movements`, JSON.stringify(stockMovements)); }, [stockMovements]);
  useEffect(() => { localStorage.setItem(`${STORAGE_KEY}_customer_ledger`, JSON.stringify(customerLedger)); }, [customerLedger]);
  useEffect(() => { localStorage.setItem(`${STORAGE_KEY}_expenses`, JSON.stringify(expenses)); }, [expenses]);
  useEffect(() => { localStorage.setItem(`${STORAGE_KEY}_daily_closings`, JSON.stringify(dailyClosings)); }, [dailyClosings]);
  useEffect(() => { localStorage.setItem(`${STORAGE_KEY}_audit_logs`, JSON.stringify(auditLogs)); }, [auditLogs]);

  // Audit Log helper
  const logAudit = (action: string, entity: string, entityId: string, details: Record<string, unknown>) => {
    const entry: AuditLog = {
      id: `aud-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      user_id: currentUser.id,
      user_name: currentUser.name,
      action,
      entity,
      entity_id: entityId,
      details,
      created_at: new Date().toISOString(),
    };
    setAuditLogs(prev => [entry, ...prev]);
  };

  const isDateClosed = (date: string) => {
    const closing = dailyClosings.find(c => c.business_date === date);
    return closing ? closing.status === 'closed' : false;
  };

  // Add stock movement - Rule 2: Stock changes ONLY through one service function add_stock_movement()
  const addStockMovement = (
    productId: string,
    type: StockMovement['type'],
    qty: number,
    refType: 'opening' | 'purchase' | 'sale' | 'adjustment',
    refId?: string,
    reason?: string,
  ): { success: boolean; error?: string } => {
    const product = products.find(p => p.id === productId);
    if (!product) return { success: false, error: 'Product not found' };

    const newStock = Number((product.current_stock + qty).toFixed(3));
    if (!settings.allow_negative_stock && newStock < 0) {
      return {
        success: false,
        error: `Insufficient stock for ${product.name}. Available: ${product.current_stock} ${product.unit}, requested deduction: ${Math.abs(qty)} ${product.unit}`,
      };
    }

    const movement: StockMovement = {
      id: `sm-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      product_id: productId,
      product_name: product.name,
      type,
      qty,
      ref_type: refType,
      ref_id: refId,
      reason,
      created_by: currentUser.id,
      created_at: new Date().toISOString(),
    };

    setStockMovements(prev => [movement, ...prev]);
    setProducts(prev =>
      prev.map(p =>
        p.id === productId
          ? { ...p, current_stock: newStock, updated_at: new Date().toISOString() }
          : p
      )
    );

    return { success: true };
  };

  // Settings
  const updateSettings = (newSettings: Partial<Settings>) => {
    setSettings(prev => {
      const updated = { ...prev, ...newSettings };
      logAudit('UPDATE_SETTINGS', 'settings', 'global', newSettings);
      return updated;
    });
  };

  // Categories
  const addCategory = (name: string) => {
    const cat: Category = {
      id: `cat-${Date.now()}`,
      name: name.trim(),
      active: true,
    };
    setCategories(prev => [...prev, cat]);
  };

  // Products
  const addProduct = (
    prodInput: Omit<Product, 'id' | 'current_stock' | 'created_at' | 'updated_at'>,
    opening_stock = 0
  ) => {
    const newId = `prod-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    const now = new Date().toISOString();
    const product: Product = {
      ...prodInput,
      id: newId,
      current_stock: opening_stock,
      created_at: now,
      updated_at: now,
    };

    setProducts(prev => [...prev, product]);

    if (opening_stock !== 0) {
      const movement: StockMovement = {
        id: `sm-${Date.now()}`,
        product_id: newId,
        product_name: product.name,
        type: 'opening',
        qty: opening_stock,
        ref_type: 'opening',
        reason: 'Initial Opening Stock Count',
        created_by: currentUser.id,
        created_at: now,
      };
      setStockMovements(prev => [movement, ...prev]);
    }

    logAudit('CREATE_PRODUCT', 'product', newId, { name: product.name, opening_stock });
  };

  const updateProduct = (id: string, updates: Partial<Product>) => {
    setProducts(prev =>
      prev.map(p => {
        if (p.id === id) {
          const old = { ...p };
          const updated = { ...p, ...updates, updated_at: new Date().toISOString() };
          // Audit price changes specifically as required by Section 1 & Section 4
          if (updates.selling_price !== undefined && updates.selling_price !== old.selling_price) {
            logAudit('PRICE_CHANGE', 'product', id, {
              product_name: p.name,
              old_price: old.selling_price,
              new_price: updates.selling_price,
            });
          }
          return updated;
        }
        return p;
      })
    );
  };

  const toggleProductActive = (id: string) => {
    setProducts(prev =>
      prev.map(p => (p.id === id ? { ...p, active: !p.active } : p))
    );
  };

  // Suppliers
  const addSupplier = (supplierInput: Omit<Supplier, 'id' | 'active'>) => {
    const newId = `sup-${Date.now()}`;
    const supplier: Supplier = {
      ...supplierInput,
      id: newId,
      active: true,
    };
    setSuppliers(prev => [...prev, supplier]);
    logAudit('CREATE_SUPPLIER', 'supplier', newId, { name: supplier.name });
  };

  const updateSupplier = (id: string, updates: Partial<Supplier>) => {
    setSuppliers(prev =>
      prev.map(s => (s.id === id ? { ...s, ...updates } : s))
    );
  };

  // Customers
  const addCustomer = (
    custInput: Omit<Customer, 'id' | 'active' | 'current_dues'>,
    opening_due = 0
  ): Customer => {
    const newId = `cust-${Date.now()}`;
    const customer: Customer = {
      ...custInput,
      id: newId,
      active: true,
      current_dues: opening_due,
    };
    setCustomers(prev => [...prev, customer]);

    if (opening_due > 0) {
      const ledgerEntry: CustomerLedgerEntry = {
        id: `cl-${Date.now()}`,
        customer_id: newId,
        type: 'opening',
        amount: opening_due,
        balance_after: opening_due,
        note: 'Opening Udhaar Balance',
        created_by: currentUser.id,
        created_at: new Date().toISOString(),
      };
      setCustomerLedger(prev => [...prev, ledgerEntry]);
    }

    logAudit('CREATE_CUSTOMER', 'customer', newId, { name: customer.name, opening_due });
    return customer;
  };

  const updateCustomer = (id: string, updates: Partial<Customer>) => {
    setCustomers(prev =>
      prev.map(c => (c.id === id ? { ...c, ...updates } : c))
    );
  };

  // Next invoice generator: e.g. DP-2026-000104
  const getNextInvoiceNo = (): string => {
    const year = currentBusinessDate.split('-')[0] || '2026';
    const prefix = settings.invoice_prefix || 'DP';
    // Count existing sales
    const count = sales.length + 104; // start friendly sequence
    const padded = String(count).padStart(6, '0');
    return `${prefix}-${year}-${padded}`;
  };

  // Create Sale - Business Rules 1, 2, 3, 4, 8, 10
  const createSale = (input: NewSaleInput): { success: boolean; sale?: Sale; error?: string } => {
    const businessDate = input.custom_business_date || currentBusinessDate;

    // Rule 8: After daily closing, cashiers can't create or back-date entries for that date
    if (currentUser.role === 'cashier' && isDateClosed(businessDate)) {
      return {
        success: false,
        error: `Cannot create sale: Day ${businessDate} has already been closed and locked! Contact Owner to re-open.`,
      };
    }

    // Cashier discount limit check
    if (currentUser.role === 'cashier' && input.discount > 0) {
      const rawSubtotal = input.items.reduce((acc, item) => acc + item.qty * item.unit_price, 0);
      const discountPercent = (input.discount / rawSubtotal) * 100;
      if (discountPercent > settings.cashier_max_discount_percent) {
        return {
          success: false,
          error: `Discount of ₹${input.discount} (${discountPercent.toFixed(1)}%) exceeds Cashier limit of ${settings.cashier_max_discount_percent}%. Owner authorization required.`,
        };
      }
    }

    // Rule 10: Credit sale requires customer and credit limit check
    let customer: Customer | undefined;
    if (input.payment_method === 'credit') {
      if (!input.customer_id) {
        return {
          success: false,
          error: 'Credit sale (Udhaar) requires selecting a registered customer.',
        };
      }
      customer = customers.find(c => c.id === input.customer_id);
      if (!customer) {
        return { success: false, error: 'Selected credit customer does not exist.' };
      }
    }

    // Rule 4: Insufficient stock check for all items upfront (row-locking simulation)
    for (const item of input.items) {
      const product = products.find(p => p.id === item.product_id);
      if (!product) return { success: false, error: `Product not found: ${item.product_id}` };
      if (!settings.allow_negative_stock && product.current_stock < item.qty) {
        return {
          success: false,
          error: `Insufficient stock for ${product.name}. Current stock: ${product.current_stock} ${product.unit}, requested: ${item.qty} ${product.unit}`,
        };
      }
    }

    // Calculate totals
    let subtotal = 0;
    let taxTotal = 0;
    const saleId = `sale-${Date.now()}`;
    const invoiceNo = getNextInvoiceNo();

    const saleItems = input.items.map((item, idx) => {
      const product = products.find(p => p.id === item.product_id)!;
      const lineSubtotal = Number((item.qty * item.unit_price).toFixed(2));
      const lineDiscount = item.discount || 0;
      const taxable = Math.max(0, lineSubtotal - lineDiscount);
      const taxRate = settings.gst_enabled ? (product.gst_percent || 0) : 0;
      const lineTax = Number(((taxable * taxRate) / 100).toFixed(2));
      const lineTotal = Number((taxable + lineTax).toFixed(2));

      subtotal += lineSubtotal;
      taxTotal += lineTax;

      return {
        id: `si-${saleId}-${idx + 1}`,
        sale_id: saleId,
        product_id: product.id,
        product_name: product.name,
        qty: item.qty,
        unit: product.unit,
        unit_price: item.unit_price,
        discount: lineDiscount,
        tax: lineTax,
        line_total: lineTotal,
      };
    });

    const overallDiscount = input.discount || 0;
    const finalTotal = Math.max(0, Number((subtotal - overallDiscount + taxTotal).toFixed(2)));

    // Rule 10: Check credit limit
    if (customer && customer.credit_limit !== null && customer.credit_limit !== undefined) {
      const newDues = customer.current_dues + finalTotal;
      if (newDues > customer.credit_limit) {
        return {
          success: false,
          error: `Credit sale would exceed ${customer.name}'s credit limit of ₹${customer.credit_limit}. Current dues: ₹${customer.current_dues}, Bill total: ₹${finalTotal} (Projected dues: ₹${newDues}).`,
        };
      }
    }

    const saleRecord: Sale = {
      id: saleId,
      invoice_no: invoiceNo,
      business_date: businessDate,
      customer_id: customer ? customer.id : null,
      customer_name: customer ? customer.name : 'Retail Customer',
      customer_mobile: customer?.mobile,
      subtotal,
      discount: overallDiscount,
      tax: taxTotal,
      total: finalTotal,
      payment_method: input.payment_method,
      status: 'completed',
      is_offline_entry: Boolean(input.is_offline_entry),
      offline_bill_ref: input.offline_bill_ref,
      items: saleItems,
      created_by: currentUser.id,
      created_by_name: currentUser.name,
      created_at: new Date().toISOString(),
    };

    // Rule 3: Atomic commit: Update stock, append movements, update ledger
    const nowIso = new Date().toISOString();
    const newMovements: StockMovement[] = saleItems.map(item => ({
      id: `sm-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      product_id: item.product_id,
      product_name: item.product_name,
      type: 'sale',
      qty: -item.qty,
      ref_type: 'sale',
      ref_id: saleId,
      reason: `Sale ${invoiceNo}`,
      created_by: currentUser.id,
      created_at: nowIso,
    }));

    // Update products cache
    setProducts(prev =>
      prev.map(p => {
        const matchingItem = saleItems.find(si => si.product_id === p.id);
        if (matchingItem) {
          return {
            ...p,
            current_stock: Number((p.current_stock - matchingItem.qty).toFixed(3)),
            updated_at: nowIso,
          };
        }
        return p;
      })
    );

    setStockMovements(prev => [...newMovements, ...prev]);
    setSales(prev => [saleRecord, ...prev]);

    // Credit ledger update
    if (customer) {
      const newDues = Number((customer.current_dues + finalTotal).toFixed(2));
      const ledgerEntry: CustomerLedgerEntry = {
        id: `cl-${Date.now()}`,
        customer_id: customer.id,
        type: 'credit_sale',
        amount: finalTotal,
        balance_after: newDues,
        sale_id: saleId,
        invoice_no: invoiceNo,
        note: `Credit sale invoice ${invoiceNo}`,
        created_by: currentUser.id,
        created_at: nowIso,
      };
      setCustomerLedger(prev => [...prev, ledgerEntry]);
      setCustomers(prev =>
        prev.map(c => (c.id === customer!.id ? { ...c, current_dues: newDues } : c))
      );
    }

    logAudit('CREATE_SALE', 'sale', saleId, {
      invoice_no: invoiceNo,
      total: finalTotal,
      payment_method: input.payment_method,
      items_count: saleItems.length,
    });

    return { success: true, sale: saleRecord };
  };

  // Cancel Sale - Rule 1 & Rule 8:
  // "Completed sales are never deleted, only cancelled; cancellation writes reverse stock movements and, for credit sales, a reverse ledger entry."
  // Cashier: same open day only; owner: any day, audited.
  const cancelSale = (saleId: string, reason: string): { success: boolean; error?: string } => {
    const sale = sales.find(s => s.id === saleId);
    if (!sale) return { success: false, error: 'Sale not found.' };
    if (sale.status === 'cancelled') return { success: false, error: 'Sale is already cancelled.' };

    if (!reason || reason.trim().length === 0) {
      return { success: false, error: 'A cancellation reason is mandatory.' };
    }

    // Role check: cashier can only cancel on the same day if day is still open
    if (currentUser.role === 'cashier') {
      if (sale.business_date !== currentBusinessDate) {
        return {
          success: false,
          error: 'Cashier permission denied: Cashiers can only cancel sales created today. Past dates require Owner.',
        };
      }
      if (isDateClosed(sale.business_date)) {
        return {
          success: false,
          error: 'Cashier permission denied: Cannot cancel sale from a closed day.',
        };
      }
    }

    const nowIso = new Date().toISOString();

    // 1. Reverse stock movements
    const reverseMovements: StockMovement[] = sale.items.map(item => ({
      id: `sm-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      product_id: item.product_id,
      product_name: item.product_name,
      type: 'sale_cancel',
      qty: item.qty, // Positive reverse
      ref_type: 'sale',
      ref_id: sale.id,
      reason: `Cancellation of ${sale.invoice_no}: ${reason}`,
      created_by: currentUser.id,
      created_at: nowIso,
    }));

    // Update stock cache
    setProducts(prev =>
      prev.map(p => {
        const item = sale.items.find(si => si.product_id === p.id);
        if (item) {
          return {
            ...p,
            current_stock: Number((p.current_stock + item.qty).toFixed(3)),
            updated_at: nowIso,
          };
        }
        return p;
      })
    );

    setStockMovements(prev => [...reverseMovements, ...prev]);

    // 2. Reverse customer credit ledger if credit sale
    if (sale.payment_method === 'credit' && sale.customer_id) {
      const customer = customers.find(c => c.id === sale.customer_id);
      if (customer) {
        const newDues = Math.max(0, Number((customer.current_dues - sale.total).toFixed(2)));
        const ledgerEntry: CustomerLedgerEntry = {
          id: `cl-${Date.now()}`,
          customer_id: customer.id,
          type: 'adjustment',
          amount: -sale.total,
          balance_after: newDues,
          sale_id: sale.id,
          invoice_no: sale.invoice_no,
          note: `Reversal of cancelled credit invoice ${sale.invoice_no}: ${reason}`,
          created_by: currentUser.id,
          created_at: nowIso,
        };
        setCustomerLedger(prev => [...prev, ledgerEntry]);
        setCustomers(prev =>
          prev.map(c => (c.id === customer.id ? { ...c, current_dues: newDues } : c))
        );
      }
    }

    // 3. Update sale status
    setSales(prev =>
      prev.map(s =>
        s.id === saleId
          ? {
              ...s,
              status: 'cancelled',
              cancel_reason: reason,
              cancelled_by: currentUser.name,
              cancelled_at: nowIso,
            }
          : s
      )
    );

    // 4. Audit log
    logAudit('CANCEL_SALE', 'sale', sale.id, {
      invoice_no: sale.invoice_no,
      amount: sale.total,
      reason,
      cancelled_by: currentUser.name,
      role: currentUser.role,
    });

    return { success: true };
  };

  // Purchases - Rule 5: Purchase + purchase items + stock increase are one transaction
  const createPurchase = (input: NewPurchaseInput): { success: boolean; error?: string } => {
    const supplier = suppliers.find(s => s.id === input.supplier_id);
    if (!supplier) return { success: false, error: 'Supplier not found' };
    if (!input.items || input.items.length === 0) {
      return { success: false, error: 'Please add at least one purchase item line.' };
    }

    const purchaseId = `pur-${Date.now()}`;
    let grandTotal = 0;
    const nowIso = new Date().toISOString();

    const purchaseItems = input.items.map((line, idx) => {
      const prod = products.find(p => p.id === line.product_id)!;
      const lineTotal = Number((line.qty * line.unit_cost).toFixed(2));
      grandTotal += lineTotal;
      return {
        id: `pi-${purchaseId}-${idx + 1}`,
        purchase_id: purchaseId,
        product_id: prod.id,
        product_name: prod.name,
        qty: line.qty,
        unit_cost: line.unit_cost,
        expiry_date: line.expiry_date || null,
        line_total: lineTotal,
      };
    });

    const purchaseRecord: Purchase = {
      id: purchaseId,
      supplier_id: supplier.id,
      supplier_name: supplier.name,
      supplier_invoice_no: input.supplier_invoice_no || `INV-${Date.now().toString().slice(-4)}`,
      purchase_date: input.purchase_date,
      total: grandTotal,
      notes: input.notes,
      items: purchaseItems,
      created_by: currentUser.id,
      created_at: nowIso,
    };

    // Stock movements
    const movements: StockMovement[] = purchaseItems.map(pi => ({
      id: `sm-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      product_id: pi.product_id,
      product_name: pi.product_name,
      type: 'purchase',
      qty: pi.qty,
      ref_type: 'purchase',
      ref_id: purchaseId,
      reason: `Supplier Invoice: ${input.supplier_invoice_no}`,
      created_by: currentUser.id,
      created_at: nowIso,
    }));

    // Update stock and optionally update purchase price
    setProducts(prev =>
      prev.map(p => {
        const item = purchaseItems.find(pi => pi.product_id === p.id);
        if (item) {
          return {
            ...p,
            current_stock: Number((p.current_stock + item.qty).toFixed(3)),
            purchase_price: input.update_product_cost ? item.unit_cost : p.purchase_price,
            updated_at: nowIso,
          };
        }
        return p;
      })
    );

    setStockMovements(prev => [...movements, ...prev]);
    setPurchases(prev => [purchaseRecord, ...prev]);

    logAudit('CREATE_PURCHASE', 'purchase', purchaseId, {
      supplier: supplier.name,
      invoice_no: input.supplier_invoice_no,
      total: grandTotal,
      items_count: purchaseItems.length,
    });

    return { success: true };
  };

  // Stock Adjustment - Rule 7: Every adjustment needs a reason and is written to the audit log (Owner only)
  const adjustStock = (
    productId: string,
    type: 'damage' | 'expired' | 'adjustment',
    qtyChange: number,
    reason: string
  ): { success: boolean; error?: string } => {
    if (currentUser.role !== 'owner') {
      return { success: false, error: 'Only shop Owner is authorized to adjust stock.' };
    }
    if (!reason || reason.trim().length === 0) {
      return { success: false, error: 'Mandatory reason required for stock adjustment.' };
    }

    const res = addStockMovement(
      productId,
      type,
      qtyChange,
      'adjustment',
      undefined,
      reason
    );

    if (res.success) {
      const prod = products.find(p => p.id === productId);
      logAudit('STOCK_ADJUSTMENT', 'stock', productId, {
        product_name: prod?.name,
        type,
        qty_change: qtyChange,
        reason,
      });
    }

    return res;
  };

  // Customer Credit Payment
  const recordCustomerPayment = (
    customerId: string,
    amount: number,
    paymentMethod: 'cash' | 'upi',
    note?: string
  ): { success: boolean; error?: string } => {
    if (amount <= 0) return { success: false, error: 'Payment amount must be greater than zero.' };
    const customer = customers.find(c => c.id === customerId);
    if (!customer) return { success: false, error: 'Customer not found.' };

    const newDues = Number((customer.current_dues - amount).toFixed(2));
    const entry: CustomerLedgerEntry = {
      id: `cl-${Date.now()}`,
      customer_id: customer.id,
      type: 'payment',
      amount: -amount,
      balance_after: newDues,
      payment_method: paymentMethod,
      note: note || `Received ₹${amount} via ${paymentMethod.toUpperCase()}`,
      created_by: currentUser.id,
      created_at: new Date().toISOString(),
    };

    setCustomerLedger(prev => [...prev, entry]);
    setCustomers(prev =>
      prev.map(c => (c.id === customer.id ? { ...c, current_dues: newDues } : c))
    );

    logAudit('RECEIVE_CREDIT_PAYMENT', 'customer_ledger', customer.id, {
      customer_name: customer.name,
      amount,
      payment_method: paymentMethod,
      new_dues: newDues,
    });

    return { success: true };
  };

  // Expenses
  const addExpense = (
    expenseInput: Omit<Expense, 'id' | 'created_by' | 'created_by_name' | 'created_at'>
  ): { success: boolean; error?: string } => {
    // Check if date is closed
    if (currentUser.role === 'cashier' && isDateClosed(expenseInput.expense_date)) {
      return { success: false, error: 'Cannot add expense for a closed day.' };
    }

    const newId = `exp-${Date.now()}`;
    const exp: Expense = {
      ...expenseInput,
      id: newId,
      created_by: currentUser.id,
      created_by_name: currentUser.name,
      created_at: new Date().toISOString(),
    };
    setExpenses(prev => [exp, ...prev]);
    logAudit('ADD_EXPENSE', 'expense', newId, {
      category: exp.category,
      amount: exp.amount,
      date: exp.expense_date,
    });
    return { success: true };
  };

  const updateExpense = (id: string, updates: Partial<Expense>): { success: boolean; error?: string } => {
    const exp = expenses.find(e => e.id === id);
    if (!exp) return { success: false, error: 'Expense not found' };
    if (currentUser.role === 'cashier' && exp.expense_date !== currentBusinessDate) {
      return { success: false, error: 'Cashier can only edit same-day expenses.' };
    }
    setExpenses(prev => prev.map(e => (e.id === id ? { ...e, ...updates } : e)));
    logAudit('UPDATE_EXPENSE', 'expense', id, updates);
    return { success: true };
  };

  const deleteExpense = (id: string): { success: boolean; error?: string } => {
    if (currentUser.role !== 'owner') {
      return { success: false, error: 'Only Owner can delete an expense record.' };
    }
    setExpenses(prev => prev.filter(e => e.id !== id));
    logAudit('DELETE_EXPENSE', 'expense', id, {});
    return { success: true };
  };

  // Daily Closing Calculation - Formula from page 5:
  // Expected cash = opening cash + cash sales + cash received against dues - cash expenses
  const getDailyCashSummary = (date: string) => {
    const existingClosing = dailyClosings.find(c => c.business_date === date);
    const opening_cash = existingClosing ? existingClosing.opening_cash : 1000; // default 1000 float

    // Sales on that date
    const daySales = sales.filter(s => s.business_date === date && s.status === 'completed');
    const cash_sales = daySales
      .filter(s => s.payment_method === 'cash')
      .reduce((sum, s) => sum + s.total, 0);
    const upi_sales = daySales
      .filter(s => s.payment_method === 'upi')
      .reduce((sum, s) => sum + s.total, 0);
    const card_sales = daySales
      .filter(s => s.payment_method === 'card')
      .reduce((sum, s) => sum + s.total, 0);
    const credit_sales = daySales
      .filter(s => s.payment_method === 'credit')
      .reduce((sum, s) => sum + s.total, 0);

    // Cash from dues (customer ledger payments with method cash created on date)
    const dayLedger = customerLedger.filter(
      cl =>
        cl.type === 'payment' &&
        cl.payment_method === 'cash' &&
        cl.created_at.startsWith(date)
    );
    const cash_from_dues = dayLedger.reduce((sum, cl) => sum + Math.abs(cl.amount), 0);

    // Cash expenses on that date
    const dayExpenses = expenses.filter(
      e => e.expense_date === date && e.payment_method === 'cash'
    );
    const cash_expenses = dayExpenses.reduce((sum, e) => sum + e.amount, 0);

    const expected_cash = Number(
      (opening_cash + cash_sales + cash_from_dues - cash_expenses).toFixed(2)
    );

    return {
      opening_cash,
      cash_sales: Number(cash_sales.toFixed(2)),
      upi_sales: Number(upi_sales.toFixed(2)),
      card_sales: Number(card_sales.toFixed(2)),
      credit_sales: Number(credit_sales.toFixed(2)),
      cash_from_dues: Number(cash_from_dues.toFixed(2)),
      cash_expenses: Number(cash_expenses.toFixed(2)),
      expected_cash,
      actual_cash: existingClosing?.actual_cash,
      difference: existingClosing?.difference,
      status: existingClosing ? existingClosing.status : 'open',
    };
  };

  const saveDailyClosing = (
    date: string,
    openingCash: number,
    actualCash: number,
    note?: string
  ): { success: boolean; error?: string } => {
    const summary = getDailyCashSummary(date);
    const expected = Number((openingCash + summary.cash_sales + summary.cash_from_dues - summary.cash_expenses).toFixed(2));
    const diff = Number((actualCash - expected).toFixed(2));

    const closingRecord: DailyClosing = {
      id: `close-${date}`,
      business_date: date,
      opening_cash: openingCash,
      cash_sales: summary.cash_sales,
      upi_sales: summary.upi_sales,
      card_sales: summary.card_sales,
      credit_sales: summary.credit_sales,
      cash_from_dues: summary.cash_from_dues,
      cash_expenses: summary.cash_expenses,
      expected_cash: expected,
      actual_cash: actualCash,
      difference: diff,
      note,
      status: 'closed',
      closed_by: currentUser.id,
      closed_by_name: currentUser.name,
      closed_at: new Date().toISOString(),
    };

    setDailyClosings(prev => {
      const filtered = prev.filter(c => c.business_date !== date);
      return [closingRecord, ...filtered];
    });

    logAudit('DAY_CLOSED', 'daily_closing', closingRecord.id, {
      business_date: date,
      expected_cash: expected,
      actual_cash: actualCash,
      difference: diff,
    });

    return { success: true };
  };

  // Rule 8: Owner re-open is audited
  const reopenDailyClosing = (date: string, reason: string): { success: boolean; error?: string } => {
    if (currentUser.role !== 'owner') {
      return { success: false, error: 'Only the Owner can re-open a closed business day.' };
    }
    if (!reason || reason.trim().length === 0) {
      return { success: false, error: 'A mandatory reason is required to re-open a closed day.' };
    }

    setDailyClosings(prev =>
      prev.map(c =>
        c.business_date === date
          ? {
              ...c,
              status: 'open',
              reopened_by: currentUser.id,
              reopened_by_name: currentUser.name,
              reopened_at: new Date().toISOString(),
              reopen_reason: reason,
            }
          : c
      )
    );

    logAudit('DAY_REOPENED', 'daily_closing', `close-${date}`, {
      business_date: date,
      reason,
      reopened_by: currentUser.name,
    });

    return { success: true };
  };

  // Expiry Alerts calculation: matches remaining stock with newest purchases (FIFO assumption)
  // Section 1: "V1: expiry date per purchase line; remaining stock assumed to come from the newest purchases (FIFO)."
  const calculateExpiryAlerts = (): ExpiryAlertItem[] => {
    const alerts: ExpiryAlertItem[] = [];
    const today = new Date(currentBusinessDate);

    // Group purchases by product
    products
      .filter(p => p.track_expiry && p.current_stock > 0)
      .forEach(prod => {
        const cat = categories.find(c => c.id === prod.category_id);
        // Find purchases of this product with expiry_date, sorted by purchase_date desc
        const prodPurchases = purchases
          .flatMap(pur =>
            pur.items
              .filter(pi => pi.product_id === prod.id && pi.expiry_date)
              .map(pi => ({
                purchase: pur,
                item: pi,
                expiry_date: pi.expiry_date!,
              }))
          )
          .sort((a, b) => new Date(b.purchase.purchase_date).getTime() - new Date(a.purchase.purchase_date).getTime());

        if (prodPurchases.length > 0) {
          const nearest = prodPurchases[0];
          const expDate = new Date(nearest.expiry_date);
          const diffDays = Math.ceil((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

          let status: ExpiryAlertItem['status'] | null = null;
          if (diffDays < 0) status = 'expired';
          else if (diffDays === 0) status = 'today';
          else if (diffDays <= 3) status = '3_days';
          else if (diffDays <= 7) status = '7_days';

          if (status) {
            alerts.push({
              product_id: prod.id,
              product_name: prod.name,
              category_name: cat ? cat.name : 'General',
              unit: prod.unit,
              current_stock: prod.current_stock,
              expiry_date: nearest.expiry_date,
              days_remaining: diffDays,
              status,
              purchase_invoice_no: nearest.purchase.supplier_invoice_no,
              supplier_name: nearest.purchase.supplier_name,
            });
          }
        }
      });

    return alerts.sort((a, b) => a.days_remaining - b.days_remaining);
  };

  const expiryAlerts = calculateExpiryAlerts();

  // CSV Import for Products + Opening Stock (Week 1, #8)
  const importProductsCSV = (csvText: string): { success: boolean; count: number; error?: string } => {
    try {
      const lines = csvText.trim().split('\n');
      if (lines.length <= 1) return { success: false, count: 0, error: 'CSV file is empty or only has headers' };

      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      let imported = 0;

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const cols = line.split(',').map(c => c.trim().replace(/^"|"$/g, ''));
        
        // name, category, unit, purchase_price, selling_price, min_stock, track_expiry, opening_stock
        const name = cols[0] || `Product ${i}`;
        const categoryName = cols[1] || 'Fresh Milk';
        const unit = (cols[2] || 'pkt') as any;
        const purchase_price = parseFloat(cols[3]) || 50;
        const selling_price = parseFloat(cols[4]) || 60;
        const min_stock = parseFloat(cols[5]) || 10;
        const track_expiry = (cols[6] || 'yes').toLowerCase() === 'yes';
        const opening_stock = parseFloat(cols[7]) || 0;

        let category = categories.find(c => c.name.toLowerCase() === categoryName.toLowerCase());
        if (!category) {
          const newCat: Category = { id: `cat-${Date.now()}-${i}`, name: categoryName, active: true };
          category = newCat;
          setCategories(prev => [...prev, newCat]);
        }

        const sku = `SKU-${name.slice(0, 3).toUpperCase()}-${Date.now().toString().slice(-4)}`;
        addProduct(
          {
            category_id: category.id,
            name,
            sku,
            unit,
            purchase_price,
            selling_price,
            gst_percent: 0,
            min_stock,
            track_expiry,
            active: true,
          },
          opening_stock
        );
        imported++;
      }

      logAudit('IMPORT_PRODUCTS_CSV', 'products', 'batch', { count: imported });
      return { success: true, count: imported };
    } catch (err: any) {
      return { success: false, count: 0, error: err.message || 'Failed to parse CSV' };
    }
  };

  // CSV Import for Customer Opening Dues (Week 1, #8)
  const importCustomerDuesCSV = (csvText: string): { success: boolean; count: number; error?: string } => {
    try {
      const lines = csvText.trim().split('\n');
      if (lines.length <= 1) return { success: false, count: 0, error: 'CSV file is empty or only has headers' };

      let imported = 0;
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const cols = line.split(',').map(c => c.trim().replace(/^"|"$/g, ''));
        // name, mobile, address, credit_limit, opening_due
        const name = cols[0];
        const mobile = cols[1] || `980000000${i}`;
        const address = cols[2] || '';
        const credit_limit = cols[3] ? parseFloat(cols[3]) : null;
        const opening_due = cols[4] ? parseFloat(cols[4]) : 0;

        if (name) {
          addCustomer({ name, mobile, address, credit_limit }, opening_due);
          imported++;
        }
      }

      logAudit('IMPORT_CUSTOMERS_CSV', 'customers', 'batch', { count: imported });
      return { success: true, count: imported };
    } catch (err: any) {
      return { success: false, count: 0, error: err.message || 'Failed to parse CSV' };
    }
  };

  // Reset to initial demo data
  const resetToDemoData = () => {
    setSettings(initialSettings);
    setUsers(initialUsers);
    setCurrentUser(initialUsers[0]);
    setCategories(initialCategories);
    setProducts(initialProducts);
    setSuppliers(initialSuppliers);
    setCustomers(initialCustomers);
    setSales(initialSales);
    setPurchases(initialPurchases);
    setStockMovements(initialStockMovements);
    setCustomerLedger(initialCustomerLedger);
    setExpenses(initialExpenses);
    setDailyClosings(initialDailyClosings);
    setAuditLogs(initialAuditLogs);
    setCurrentBusinessDate('2026-10-02');
    localStorage.clear();
  };

  // Backup JSON
  const exportDatabaseJSON = (): string => {
    const backup = {
      version: '1.0',
      exported_at: new Date().toISOString(),
      settings,
      users,
      categories,
      products,
      suppliers,
      customers,
      sales,
      purchases,
      stockMovements,
      customerLedger,
      expenses,
      dailyClosings,
      auditLogs,
    };
    return JSON.stringify(backup, null, 2);
  };

  // Restore JSON (Week 5: "Backup script + off-server copy; do a full restore on a fresh database")
  const importDatabaseJSON = (jsonString: string): { success: boolean; error?: string } => {
    try {
      const data = JSON.parse(jsonString);
      if (data.settings) setSettings(data.settings);
      if (data.users) setUsers(data.users);
      if (data.categories) setCategories(data.categories);
      if (data.products) setProducts(data.products);
      if (data.suppliers) setSuppliers(data.suppliers);
      if (data.customers) setCustomers(data.customers);
      if (data.sales) setSales(data.sales);
      if (data.purchases) setPurchases(data.purchases);
      if (data.stockMovements) setStockMovements(data.stockMovements);
      if (data.customerLedger) setCustomerLedger(data.customerLedger);
      if (data.expenses) setExpenses(data.expenses);
      if (data.dailyClosings) setDailyClosings(data.dailyClosings);
      if (data.auditLogs) setAuditLogs(data.auditLogs);

      logAudit('RESTORE_DATABASE', 'system', 'root', { version: data.version });
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Invalid JSON format' };
    }
  };

  // User management
  const addUser = (name: string, mobile: string, pin: string, role: 'owner' | 'cashier') => {
    const newUser: User = {
      id: `user-${Date.now()}`,
      name: name.trim(),
      mobile: mobile.trim(),
      pin: pin.trim(),
      role,
      active: true,
      created_at: new Date().toISOString(),
    };
    setUsers(prev => [...prev, newUser]);
    logAudit('CREATE_USER', 'user', newUser.id, { name: newUser.name, role: newUser.role });
  };

  const updateUserPin = (userId: string, newPin: string) => {
    setUsers(prev => prev.map(u => (u.id === userId ? { ...u, pin: newPin } : u)));
    logAudit('UPDATE_USER_PIN', 'user', userId, {});
  };

  const toggleUserActive = (userId: string) => {
    setUsers(prev => prev.map(u => (u.id === userId ? { ...u, active: !u.active } : u)));
    logAudit('TOGGLE_USER_ACTIVE', 'user', userId, {});
  };

  return (
    <DairyContext.Provider
      value={{
        currentUser,
        setCurrentUser,
        users,
        settings,
        updateSettings,
        categories,
        addCategory,
        products,
        addProduct,
        updateProduct,
        toggleProductActive,
        suppliers,
        addSupplier,
        updateSupplier,
        customers,
        addCustomer,
        updateCustomer,
        sales,
        createSale,
        cancelSale,
        purchases,
        createPurchase,
        stockMovements,
        adjustStock,
        customerLedger,
        recordCustomerPayment,
        expenses,
        addExpense,
        updateExpense,
        deleteExpense,
        dailyClosings,
        currentBusinessDate,
        setCurrentBusinessDate,
        isDateClosed,
        getDailyCashSummary,
        saveDailyClosing,
        reopenDailyClosing,
        auditLogs,
        expiryAlerts,
        importProductsCSV,
        importCustomerDuesCSV,
        resetToDemoData,
        exportDatabaseJSON,
        importDatabaseJSON,
        addUser,
        updateUserPin,
        toggleUserActive,
      }}
    >
      {children}
    </DairyContext.Provider>
  );
};

export const useDairy = () => {
  const context = useContext(DairyContext);
  if (!context) {
    throw new Error('useDairy must be used within a DairyProvider');
  }
  return context;
};
