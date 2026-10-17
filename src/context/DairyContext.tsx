import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { onAuthStateChanged, signOut, User as FirebaseUser, EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth';
import {
  collection,
  doc,
  onSnapshot,
  query,
  where,
  writeBatch,
  runTransaction,
  increment,
  arrayUnion,
  arrayRemove,
  deleteField,
  DocumentReference,
  DocumentData,
  Query,
  WriteBatch,
} from 'firebase/firestore';
import {
  auth,
  db,
  isFirebaseConfigured,
  createAuthUser,
  friendlyFirebaseError,
  mobileToEmail,
  HISTORY_DAYS,
  MIN_PIN_LENGTH,
} from '../lib/firebase';
import {
  User,
  CashierPermission,
  CashierPermissions,
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
import { LoginScreen, AuthStatus } from '../components/auth/LoginScreen';
import { can, permissionDenied } from '../lib/permissions';
import { allUnits, isValidQtyForUnit, wholeQtyError } from '../lib/units';

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

export type Result = { success: boolean; error?: string };

interface DairyContextType {
  currentUser: User;
  signOutUser: () => Promise<void>;
  historyDays: number;
  users: User[];
  settings: Settings;
  updateSettings: (newSettings: Partial<Settings>) => Promise<Result>;
  categories: Category[];
  addCategory: (name: string) => Promise<Result & { category?: Category }>;
  addCustomUnit: (unit: string) => Promise<Result>;
  updateCategory: (id: string, updates: Partial<Pick<Category, 'name' | 'active'>>) => Promise<Result>;
  renameCustomUnit: (oldUnit: string, newUnit: string) => Promise<Result & { productsUpdated?: number }>;
  removeCustomUnit: (unit: string) => Promise<Result>;
  products: Product[];
  addProduct: (product: Omit<Product, 'id' | 'current_stock' | 'created_at' | 'updated_at'>, opening_stock?: number) => Promise<Result>;
  updateProduct: (id: string, updates: Partial<Product>) => Promise<Result>;
  toggleProductActive: (id: string) => Promise<Result>;
  suppliers: Supplier[];
  addSupplier: (supplier: Omit<Supplier, 'id' | 'active'>) => Promise<Result>;
  updateSupplier: (id: string, updates: Partial<Supplier>) => Promise<Result>;
  customers: Customer[];
  addCustomer: (cust: Omit<Customer, 'id' | 'active' | 'current_dues'>, opening_due?: number) => Promise<Result & { customer?: Customer }>;
  updateCustomer: (id: string, updates: Partial<Customer>) => Promise<Result>;
  sales: Sale[];
  createSale: (input: NewSaleInput) => Promise<Result & { sale?: Sale }>;
  cancelSale: (saleId: string, reason: string) => Promise<Result>;
  purchases: Purchase[];
  createPurchase: (input: NewPurchaseInput) => Promise<Result>;
  stockMovements: StockMovement[];
  adjustStock: (productId: string, type: 'damage' | 'expired' | 'adjustment', qtyChange: number, reason: string) => Promise<Result>;
  customerLedger: CustomerLedgerEntry[];
  recordCustomerPayment: (customerId: string, amount: number, paymentMethod: 'cash' | 'upi', note?: string) => Promise<Result>;
  addCustomerDues: (customerId: string, amount: number, note: string) => Promise<Result>;
  expenses: Expense[];
  addExpense: (expense: Omit<Expense, 'id' | 'created_by' | 'created_by_name' | 'created_at'>) => Promise<Result>;
  updateExpense: (id: string, updates: Partial<Expense>) => Promise<Result>;
  deleteExpense: (id: string) => Promise<Result>;
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
  saveDailyClosing: (date: string, openingCash: number, actualCash: number, note?: string) => Promise<Result>;
  reopenDailyClosing: (date: string, reason: string) => Promise<Result>;
  auditLogs: AuditLog[];
  expiryAlerts: ExpiryAlertItem[];
  importProductsCSV: (csvText: string) => Promise<Result & { count: number }>;
  importCustomerDuesCSV: (csvText: string) => Promise<Result & { count: number }>;
  loadDemoData: () => Promise<Result>;
  exportDatabaseJSON: () => string;
  importDatabaseJSON: (jsonString: string) => Promise<Result>;
  // User management
  addUser: (name: string, mobile: string, pin: string, role: 'owner' | 'cashier') => Promise<Result>;
  changeOwnPin: (currentPin: string, newPin: string) => Promise<Result>;
  toggleUserActive: (userId: string) => Promise<Result>;
  updateUserPermissions: (userId: string, permissions: CashierPermissions) => Promise<Result>;
  can: (permission: CashierPermission) => boolean;
}

const DairyContext = createContext<DairyContextType | undefined>(undefined);

// Thrown inside transactions to abort with a message for the counter user
class BusinessError extends Error {}

type Op = (b: WriteBatch) => void;
const setOp = (ref: DocumentReference, data: DocumentData): Op => b => b.set(ref, data);
const updateOp = (ref: DocumentReference, data: DocumentData): Op => b => b.update(ref, data);

const r2 = (n: number) => Number(n.toFixed(2));
const r3 = (n: number) => Number(n.toFixed(3));

const localDate = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const newRef = (col: string) => doc(collection(db, col));

const OFFLINE_SALE_ERROR =
  'No internet connection. Sales need internet to lock stock and issue an invoice number — write a numbered paper bill now and enter it later as an offline entry.';

// Online: wait for the server so rule rejections are shown. Offline: Firestore queues the write.
const persist = async (write: Promise<unknown>): Promise<Result> => {
  if (!navigator.onLine) {
    write.catch(err => console.error('Queued write was rejected when it synced:', err));
    return { success: true };
  }
  try {
    await write;
    return { success: true };
  } catch (err) {
    console.error(err);
    return { success: false, error: friendlyFirebaseError(err) };
  }
};

// Firestore batches hold max 500 writes; big imports are split
const commitOps = (ops: Op[]): Promise<Result> => {
  const commits: Promise<void>[] = [];
  for (let i = 0; i < ops.length; i += 450) {
    const batch = writeBatch(db);
    ops.slice(i, i + 450).forEach(op => op(batch));
    commits.push(batch.commit());
  }
  return persist(Promise.all(commits));
};

// Firestore ignores undefined fields; in partial updates they mean "clear this field"
const toUpdate = (updates: Record<string, unknown>) => {
  const out: Record<string, unknown> = {};
  Object.entries(updates).forEach(([k, v]) => {
    if (k !== 'id') out[k] = v === undefined ? deleteField() : v;
  });
  return out;
};

const byDesc = <T,>(key: keyof T) => (a: T, b: T) => String(b[key] ?? '').localeCompare(String(a[key] ?? ''));
const byAsc = <T,>(key: keyof T) => (a: T, b: T) => String(a[key] ?? '').localeCompare(String(b[key] ?? ''));

// Live-subscribes to a Firestore query and keeps it as a sorted array
const useLiveCollection = <T,>(makeQuery: (() => Query) | null, sort?: (a: T, b: T) => number): [T[], boolean] => {
  const [rows, setRows] = useState<T[]>([]);
  const [loaded, setLoaded] = useState(false);
  const enabled = makeQuery !== null;
  useEffect(() => {
    if (!makeQuery) {
      setRows([]);
      setLoaded(true);
      return;
    }
    return onSnapshot(
      makeQuery(),
      snap => {
        const data = snap.docs.map(d => ({ ...d.data(), id: d.id }) as T);
        if (sort) data.sort(sort);
        setRows(data);
        setLoaded(true);
      },
      err => {
        console.error('Firestore subscription failed:', err);
        setLoaded(true);
      }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);
  return [rows, loaded];
};

const FullScreenMessage: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6 font-sans">
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 max-w-md w-full text-sm text-slate-700 space-y-2">
      {children}
    </div>
  </div>
);

// Top-level provider: resolves Firebase login + staff profile, then mounts the data layer
export const DairyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [authUser, setAuthUser] = useState<FirebaseUser | null | undefined>(undefined);
  const [profile, setProfile] = useState<User | null | undefined>(undefined);

  useEffect(() => {
    if (!isFirebaseConfigured) return;
    return onAuthStateChanged(auth, u => setAuthUser(u));
  }, []);

  useEffect(() => {
    if (!authUser) {
      setProfile(authUser === null ? null : undefined);
      return;
    }
    setProfile(undefined);
    return onSnapshot(
      doc(db, 'users', authUser.uid),
      { includeMetadataChanges: true },
      snap => {
        // During first-time setup the profile is visible locally before the server has it; mounting the
        // data listeners then would get them permission-denied, so wait until the write is committed.
        if (snap.metadata.hasPendingWrites) return;
        setProfile(snap.exists() ? ({ ...snap.data(), id: snap.id } as User) : null);
      },
      err => {
        console.error('Failed to load staff profile:', err);
        setProfile(null);
      }
    );
  }, [authUser]);

  if (!isFirebaseConfigured) {
    return (
      <FullScreenMessage>
        <p className="font-bold text-slate-900">Firebase is not configured</p>
        <p>
          Copy <code>.env.example</code> to <code>.env.local</code>, fill in the <code>VITE_FIREBASE_*</code> values from
          Firebase console → Project settings → Your apps, and restart <code>npm run dev</code>.
        </p>
      </FullScreenMessage>
    );
  }

  let status: AuthStatus | null = null;
  if (authUser === undefined) status = 'loading';
  else if (authUser === null) status = 'signed_out';
  else if (profile === undefined) status = 'loading';
  else if (profile === null) status = 'no_profile';
  else if (!profile.active) status = 'inactive';

  if (status) return <LoginScreen status={status} />;

  return <DairyDataProvider currentUser={profile!}>{children}</DairyDataProvider>;
};

const DairyDataProvider: React.FC<{ currentUser: User; children: React.ReactNode }> = ({ currentUser, children }) => {
  const isOwner = currentUser.role === 'owner';

  // History window for high-volume collections (Section: keeps Firestore reads in the free tier)
  const { cutoffDate, cutoffIso } = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - HISTORY_DAYS);
    return { cutoffDate: localDate(d), cutoffIso: d.toISOString() };
  }, []);

  const [settingsDoc, setSettingsDoc] = useState<Partial<Settings> | null>(null);
  useEffect(
    () =>
      onSnapshot(
        doc(db, 'settings', 'shop'),
        snap => setSettingsDoc(snap.exists() ? (snap.data() as Settings) : {}),
        err => {
          console.error('Failed to load settings:', err);
          setSettingsDoc({});
        }
      ),
    []
  );
  const settings: Settings = { ...initialSettings, ...(settingsDoc || {}) };

  const [users, usersLoaded] = useLiveCollection<User>(() => collection(db, 'users'), byAsc('created_at'));
  const [categories, categoriesLoaded] = useLiveCollection<Category>(() => collection(db, 'categories'), byAsc('name'));
  const [products, productsLoaded] = useLiveCollection<Product>(() => collection(db, 'products'), byAsc('created_at'));
  const [suppliers] = useLiveCollection<Supplier>(() => collection(db, 'suppliers'), byAsc('name'));
  const [customers, customersLoaded] = useLiveCollection<Customer>(() => collection(db, 'customers'), byAsc('name'));
  const [purchases] = useLiveCollection<Purchase>(() => collection(db, 'purchases'), byDesc('created_at'));
  const [customerLedger] = useLiveCollection<CustomerLedgerEntry>(() => collection(db, 'customer_ledger'), byAsc('created_at'));
  const [expenses] = useLiveCollection<Expense>(() => collection(db, 'expenses'), byDesc('created_at'));
  const [dailyClosings] = useLiveCollection<DailyClosing>(() => collection(db, 'daily_closings'), byDesc('business_date'));
  const [sales, salesLoaded] = useLiveCollection<Sale>(
    () => query(collection(db, 'sales'), where('business_date', '>=', cutoffDate)),
    byDesc('created_at')
  );
  const [stockMovements] = useLiveCollection<StockMovement>(
    () => query(collection(db, 'stock_movements'), where('created_at', '>=', cutoffIso)),
    byDesc('created_at')
  );
  const [auditLogs] = useLiveCollection<AuditLog>(
    isOwner ? () => query(collection(db, 'audit_logs'), where('created_at', '>=', cutoffIso)) : null,
    byDesc('created_at')
  );

  const [currentBusinessDate, setCurrentBusinessDate] = useState<string>(() => localDate());

  // Audit entry to be written in the same batch/transaction as the action it records
  const auditEntry = (action: string, entity: string, entityId: string, details: Record<string, unknown>): [DocumentReference, AuditLog] => {
    const ref = newRef('audit_logs');
    return [
      ref,
      {
        id: ref.id,
        user_id: currentUser.id,
        user_name: currentUser.name,
        action,
        entity,
        entity_id: entityId,
        details,
        created_at: new Date().toISOString(),
      },
    ];
  };
  const auditOp = (...args: Parameters<typeof auditEntry>): Op => setOp(...auditEntry(...args));

  const isDateClosed = (date: string) => {
    const closing = dailyClosings.find(c => c.business_date === date);
    return closing ? closing.status === 'closed' : false;
  };

  const movementRecord = (
    product: Pick<Product, 'id' | 'name'>,
    type: StockMovement['type'],
    qty: number,
    refType: StockMovement['ref_type'],
    refId: string | undefined,
    reason: string | undefined,
    nowIso: string
  ): [DocumentReference, StockMovement] => {
    const ref = newRef('stock_movements');
    return [
      ref,
      {
        id: ref.id,
        product_id: product.id,
        product_name: product.name,
        type,
        qty,
        ref_type: refType,
        ref_id: refId,
        reason,
        created_by: currentUser.id,
        created_at: nowIso,
      },
    ];
  };

  // Settings
  const updateSettings = (newSettings: Partial<Settings>) =>
    commitOps([
      b => b.set(doc(db, 'settings', 'shop'), newSettings, { merge: true }),
      auditOp('UPDATE_SETTINGS', 'settings', 'global', newSettings),
    ]);

  // Categories
  const addCategory = async (name: string): Promise<Result & { category?: Category }> => {
    if (currentUser.role !== 'owner') return { success: false, error: 'Only the Owner can add categories.' };
    const trimmed = name.trim();
    if (!trimmed) return { success: false, error: 'Category name is required.' };
    if (categories.some(c => c.name.toLowerCase() === trimmed.toLowerCase())) {
      return { success: false, error: `Category "${trimmed}" already exists.` };
    }
    const ref = newRef('categories');
    const category: Category = { id: ref.id, name: trimmed, active: true };
    const res = await commitOps([setOp(ref, category), auditOp('CREATE_CATEGORY', 'category', ref.id, { name: trimmed })]);
    return res.success ? { ...res, category } : res;
  };

  const addCustomUnit = (unit: string): Promise<Result> => {
    if (currentUser.role !== 'owner') {
      return Promise.resolve({ success: false, error: 'Only the Owner can add units.' });
    }
    const trimmed = unit.trim();
    if (!trimmed) return Promise.resolve({ success: false, error: 'Unit name is required.' });
    if (trimmed.length > 12) return Promise.resolve({ success: false, error: 'Keep the unit short (12 characters max), e.g. "dozen".' });
    if (allUnits(settings).some(u => u.toLowerCase() === trimmed.toLowerCase())) {
      return Promise.resolve({ success: false, error: `Unit "${trimmed}" already exists.` });
    }
    return commitOps([
      b => b.set(doc(db, 'settings', 'shop'), { custom_units: arrayUnion(trimmed) }, { merge: true }),
      auditOp('ADD_CUSTOM_UNIT', 'settings', 'global', { unit: trimmed }),
    ]);
  };

  // Products point at the category id, so a rename shows everywhere at once. Categories are hidden, never deleted.
  const updateCategory = (id: string, updates: Partial<Pick<Category, 'name' | 'active'>>): Promise<Result> => {
    if (currentUser.role !== 'owner') {
      return Promise.resolve({ success: false, error: 'Only the Owner can edit categories.' });
    }
    const cat = categories.find(c => c.id === id);
    if (!cat) return Promise.resolve({ success: false, error: 'Category not found.' });

    const changes: Partial<Category> = {};
    if (updates.name !== undefined) {
      const trimmed = updates.name.trim();
      if (!trimmed) return Promise.resolve({ success: false, error: 'Category name is required.' });
      if (categories.some(c => c.id !== id && c.name.toLowerCase() === trimmed.toLowerCase())) {
        return Promise.resolve({ success: false, error: `Category "${trimmed}" already exists.` });
      }
      changes.name = trimmed;
    }
    if (updates.active !== undefined) changes.active = updates.active;

    return commitOps([
      updateOp(doc(db, 'categories', id), changes),
      auditOp('UPDATE_CATEGORY', 'category', id, { old_name: cat.name, ...changes }),
    ]);
  };

  // Products store the unit as text, so a rename rewrites every product using it. Past bills keep the old text.
  const renameCustomUnit = async (
    oldUnit: string,
    newUnit: string
  ): Promise<Result & { productsUpdated?: number }> => {
    if (currentUser.role !== 'owner') return { success: false, error: 'Only the Owner can edit units.' };
    const customUnits = settings.custom_units || [];
    if (!customUnits.includes(oldUnit)) return { success: false, error: 'Only custom units can be renamed.' };
    const trimmed = newUnit.trim();
    if (!trimmed) return { success: false, error: 'Unit name is required.' };
    if (trimmed.length > 12) return { success: false, error: 'Keep the unit short (12 characters max).' };
    if (trimmed === oldUnit) return { success: true, productsUpdated: 0 };
    if (allUnits(settings).some(u => u !== oldUnit && u.toLowerCase() === trimmed.toLowerCase())) {
      return { success: false, error: `Unit "${trimmed}" already exists.` };
    }
    if (!navigator.onLine) return { success: false, error: 'No internet connection. Rename the unit once online.' };

    const affected = products.filter(p => p.unit === oldUnit);
    const nowIso = new Date().toISOString();
    const res = await commitOps([
      b => b.set(doc(db, 'settings', 'shop'), { custom_units: customUnits.map(u => (u === oldUnit ? trimmed : u)) }, { merge: true }),
      ...affected.map(p => updateOp(doc(db, 'products', p.id), { unit: trimmed, updated_at: nowIso })),
      auditOp('RENAME_CUSTOM_UNIT', 'settings', 'global', { old_unit: oldUnit, new_unit: trimmed, products_updated: affected.length }),
    ]);
    return res.success ? { ...res, productsUpdated: affected.length } : res;
  };

  const removeCustomUnit = (unit: string): Promise<Result> => {
    if (currentUser.role !== 'owner') {
      return Promise.resolve({ success: false, error: 'Only the Owner can remove units.' });
    }
    if (!(settings.custom_units || []).includes(unit)) {
      return Promise.resolve({ success: false, error: 'Built-in units cannot be removed.' });
    }
    const inUse = products.filter(p => p.unit === unit);
    if (inUse.length > 0) {
      const names = inUse.slice(0, 3).map(p => p.name).join(', ');
      return Promise.resolve({
        success: false,
        error: `"${unit}" is used by ${inUse.length} product(s): ${names}${inUse.length > 3 ? '…' : ''}. Change their unit first.`,
      });
    }
    return commitOps([
      b => b.set(doc(db, 'settings', 'shop'), { custom_units: arrayRemove(unit) }, { merge: true }),
      auditOp('REMOVE_CUSTOM_UNIT', 'settings', 'global', { unit }),
    ]);
  };

  // Products
  const productOps = (
    prodInput: Omit<Product, 'id' | 'current_stock' | 'created_at' | 'updated_at'>,
    opening_stock: number
  ): Op[] => {
    const ref = newRef('products');
    const now = new Date().toISOString();
    const product: Product = { ...prodInput, id: ref.id, current_stock: opening_stock, created_at: now, updated_at: now };
    const ops: Op[] = [setOp(ref, product)];
    if (opening_stock !== 0) {
      ops.push(setOp(...movementRecord(product, 'opening', opening_stock, 'opening', undefined, 'Initial Opening Stock Count', now)));
    }
    ops.push(auditOp('CREATE_PRODUCT', 'product', ref.id, { name: product.name, opening_stock }));
    return ops;
  };

  const addProduct = (
    prodInput: Omit<Product, 'id' | 'current_stock' | 'created_at' | 'updated_at'>,
    opening_stock = 0
  ) => {
    if (!isValidQtyForUnit(opening_stock, prodInput.unit)) {
      return Promise.resolve({ success: false, error: wholeQtyError(prodInput.name, prodInput.unit, opening_stock) });
    }
    return commitOps(productOps(prodInput, opening_stock));
  };

  const updateProduct = (id: string, updates: Partial<Product>) => {
    const old = products.find(p => p.id === id);
    const ops: Op[] = [updateOp(doc(db, 'products', id), toUpdate({ ...updates, updated_at: new Date().toISOString() }))];
    // Audit price changes specifically as required by Section 1 & Section 4
    if (old && updates.selling_price !== undefined && updates.selling_price !== old.selling_price) {
      ops.push(
        auditOp('PRICE_CHANGE', 'product', id, {
          product_name: old.name,
          old_price: old.selling_price,
          new_price: updates.selling_price,
        })
      );
    }
    return commitOps(ops);
  };

  const toggleProductActive = (id: string) => {
    const p = products.find(x => x.id === id);
    if (!p) return Promise.resolve({ success: false, error: 'Product not found' });
    return commitOps([updateOp(doc(db, 'products', id), { active: !p.active, updated_at: new Date().toISOString() })]);
  };

  // Suppliers
  const addSupplier = (supplierInput: Omit<Supplier, 'id' | 'active'>) => {
    const ref = newRef('suppliers');
    return commitOps([
      setOp(ref, { ...supplierInput, id: ref.id, active: true }),
      auditOp('CREATE_SUPPLIER', 'supplier', ref.id, { name: supplierInput.name }),
    ]);
  };

  const updateSupplier = (id: string, updates: Partial<Supplier>) =>
    commitOps([updateOp(doc(db, 'suppliers', id), toUpdate(updates))]);

  // Customers
  const customerOps = (custInput: Omit<Customer, 'id' | 'active' | 'current_dues'>, opening_due: number): [Customer, Op[]] => {
    const ref = newRef('customers');
    const customer: Customer = { ...custInput, id: ref.id, active: true, current_dues: opening_due };
    const ops: Op[] = [setOp(ref, customer)];
    if (opening_due > 0) {
      const lref = newRef('customer_ledger');
      const ledgerEntry: CustomerLedgerEntry = {
        id: lref.id,
        customer_id: ref.id,
        type: 'opening',
        amount: opening_due,
        balance_after: opening_due,
        note: 'Opening Udhaar Balance',
        created_by: currentUser.id,
        created_at: new Date().toISOString(),
      };
      ops.push(setOp(lref, ledgerEntry));
    }
    ops.push(auditOp('CREATE_CUSTOMER', 'customer', ref.id, { name: customer.name, opening_due }));
    return [customer, ops];
  };

  const addCustomer = async (custInput: Omit<Customer, 'id' | 'active' | 'current_dues'>, opening_due = 0) => {
    if (!can(currentUser, 'add_customers')) return { success: false, error: permissionDenied('add_customers') };
    const [customer, ops] = customerOps(custInput, opening_due);
    const res = await commitOps(ops);
    return res.success ? { ...res, customer } : res;
  };

  const updateCustomer = (id: string, updates: Partial<Customer>) =>
    commitOps([updateOp(doc(db, 'customers', id), toUpdate(updates))]);

  // Create Sale - Business Rules 1, 2, 3, 4, 8, 10
  // Runs as one Firestore transaction: fresh stock is read and re-checked, so two counters
  // can't sell the last packet twice (replaces SELECT … FOR UPDATE from the plan).
  const createSale = async (input: NewSaleInput): Promise<Result & { sale?: Sale }> => {
    const businessDate = input.custom_business_date || currentBusinessDate;
    const closedDayError = `Cannot create sale: Day ${businessDate} has already been closed and locked! Contact Owner to re-open.`;

    // Rule 8: After daily closing, cashiers can't create or back-date entries for that date
    if (currentUser.role === 'cashier' && isDateClosed(businessDate)) {
      return { success: false, error: closedDayError };
    }

    if (input.items.length === 0) return { success: false, error: 'Cart is empty.' };
    const fractionalPack = input.items
      .map(item => ({ item, product: products.find(p => p.id === item.product_id) }))
      .find(({ item, product }) => product && !isValidQtyForUnit(item.qty, product.unit));
    if (fractionalPack?.product) {
      return { success: false, error: wholeQtyError(fractionalPack.product.name, fractionalPack.product.unit, fractionalPack.item.qty) };
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

    if (input.payment_method === 'credit' && !can(currentUser, 'give_credit')) {
      return { success: false, error: permissionDenied('give_credit') };
    }

    // Rule 10: Credit sale requires customer
    if (input.payment_method === 'credit' && !input.customer_id) {
      return { success: false, error: 'Credit sale (Udhaar) requires selecting a registered customer.' };
    }

    if (!navigator.onLine) return { success: false, error: OFFLINE_SALE_ERROR };

    const qtyByProduct = new Map<string, number>();
    input.items.forEach(item => qtyByProduct.set(item.product_id, (qtyByProduct.get(item.product_id) || 0) + item.qty));

    const prefix = settings.invoice_prefix || 'DP';
    const year = businessDate.split('-')[0];
    const counterRef = doc(db, 'counters', `invoice-${prefix}-${year}`);
    const saleRef = newRef('sales');
    const saleId = saleRef.id;

    try {
      const saleRecord = await runTransaction(db, async tx => {
        // All reads first (Firestore transaction rule)
        const productSnaps = await Promise.all([...qtyByProduct.keys()].map(id => tx.get(doc(db, 'products', id))));
        const closingSnap = await tx.get(doc(db, 'daily_closings', businessDate));
        const counterSnap = await tx.get(counterRef);
        const customerSnap =
          input.payment_method === 'credit' ? await tx.get(doc(db, 'customers', input.customer_id!)) : null;

        if (currentUser.role === 'cashier' && closingSnap.exists() && closingSnap.data().status === 'closed') {
          throw new BusinessError(closedDayError);
        }

        const fresh = new Map<string, Product>();
        productSnaps.forEach(s => {
          if (!s.exists()) throw new BusinessError(`Product not found: ${s.id}`);
          fresh.set(s.id, { ...s.data(), id: s.id } as Product);
        });

        // Rule 4: Insufficient stock check against the latest stock
        qtyByProduct.forEach((qty, pid) => {
          const product = fresh.get(pid)!;
          if (!settings.allow_negative_stock && product.current_stock < qty) {
            throw new BusinessError(
              `Insufficient stock for ${product.name}. Current stock: ${product.current_stock} ${product.unit}, requested: ${qty} ${product.unit}`
            );
          }
        });

        let customer: Customer | undefined;
        if (customerSnap) {
          if (!customerSnap.exists()) throw new BusinessError('Selected credit customer does not exist.');
          customer = { ...customerSnap.data(), id: customerSnap.id } as Customer;
        }

        // Calculate totals
        let subtotal = 0;
        let taxTotal = 0;
        const last = counterSnap.exists() ? Number(counterSnap.data().last) || 0 : 0;
        const invoiceNo = `${prefix}-${year}-${String(last + 1).padStart(6, '0')}`;

        const saleItems = input.items.map((item, idx) => {
          const product = fresh.get(item.product_id)!;
          const lineSubtotal = r2(item.qty * item.unit_price);
          const lineDiscount = item.discount || 0;
          const taxable = Math.max(0, lineSubtotal - lineDiscount);
          const taxRate = settings.gst_enabled ? product.gst_percent || 0 : 0;
          const lineTax = r2((taxable * taxRate) / 100);
          const lineTotal = r2(taxable + lineTax);

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
        const finalTotal = Math.max(0, r2(subtotal - overallDiscount + taxTotal));

        // Rule 10: Check credit limit
        if (customer && customer.credit_limit !== null && customer.credit_limit !== undefined) {
          const projected = customer.current_dues + finalTotal;
          if (projected > customer.credit_limit) {
            throw new BusinessError(
              `Credit sale would exceed ${customer.name}'s credit limit of ₹${customer.credit_limit}. Current dues: ₹${customer.current_dues}, Bill total: ₹${finalTotal} (Projected dues: ₹${projected}).`
            );
          }
        }

        const nowIso = new Date().toISOString();
        const sale: Sale = {
          id: saleId,
          invoice_no: invoiceNo,
          business_date: businessDate,
          customer_id: customer ? customer.id : null,
          customer_name: customer ? customer.name : 'Retail Customer',
          customer_mobile: customer?.mobile,
          subtotal: r2(subtotal),
          discount: overallDiscount,
          tax: r2(taxTotal),
          total: finalTotal,
          payment_method: input.payment_method,
          status: 'completed',
          is_offline_entry: Boolean(input.is_offline_entry),
          offline_bill_ref: input.offline_bill_ref,
          items: saleItems,
          created_by: currentUser.id,
          created_by_name: currentUser.name,
          created_at: nowIso,
        };

        // Rule 3: sale + items + stock movements + ledger entry commit together
        tx.set(counterRef, { last: last + 1 });
        tx.set(saleRef, sale);
        qtyByProduct.forEach((qty, pid) => {
          tx.update(doc(db, 'products', pid), {
            current_stock: r3(fresh.get(pid)!.current_stock - qty),
            updated_at: nowIso,
          });
        });
        saleItems.forEach(item => {
          tx.set(
            ...movementRecord(
              { id: item.product_id, name: item.product_name },
              'sale',
              -item.qty,
              'sale',
              saleId,
              `Sale ${invoiceNo}`,
              nowIso
            )
          );
        });

        if (customer) {
          const newDues = r2(customer.current_dues + finalTotal);
          const lref = newRef('customer_ledger');
          const ledgerEntry: CustomerLedgerEntry = {
            id: lref.id,
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
          tx.set(lref, ledgerEntry);
          tx.update(doc(db, 'customers', customer.id), { current_dues: newDues });
        }

        tx.set(
          ...auditEntry('CREATE_SALE', 'sale', saleId, {
            invoice_no: invoiceNo,
            total: finalTotal,
            payment_method: input.payment_method,
            items_count: saleItems.length,
          })
        );

        return sale;
      });

      return { success: true, sale: saleRecord };
    } catch (err) {
      if (err instanceof BusinessError) return { success: false, error: err.message };
      console.error(err);
      return { success: false, error: friendlyFirebaseError(err) };
    }
  };

  // Cancel Sale - Rule 1 & Rule 8:
  // "Completed sales are never deleted, only cancelled; cancellation writes reverse stock movements and, for credit sales, a reverse ledger entry."
  // Cashier: same open day only; owner: any day, audited.
  const cancelSale = async (saleId: string, reason: string): Promise<Result> => {
    const localSale = sales.find(s => s.id === saleId);
    if (!localSale) return { success: false, error: 'Sale not found.' };
    if (localSale.status === 'cancelled') return { success: false, error: 'Sale is already cancelled.' };

    if (!reason || reason.trim().length === 0) {
      return { success: false, error: 'A cancellation reason is mandatory.' };
    }
    if (!can(currentUser, 'cancel_bills')) return { success: false, error: permissionDenied('cancel_bills') };

    // Role check: cashier can only cancel on the same day if day is still open
    if (currentUser.role === 'cashier') {
      if (localSale.business_date !== currentBusinessDate) {
        return {
          success: false,
          error: 'Cashier permission denied: Cashiers can only cancel sales created today. Past dates require Owner.',
        };
      }
      if (isDateClosed(localSale.business_date)) {
        return { success: false, error: 'Cashier permission denied: Cannot cancel sale from a closed day.' };
      }
    }

    if (!navigator.onLine) return { success: false, error: 'No internet connection. Cancel the bill once the connection is back.' };

    try {
      await runTransaction(db, async tx => {
        const saleSnap = await tx.get(doc(db, 'sales', saleId));
        if (!saleSnap.exists()) throw new BusinessError('Sale not found.');
        const sale = { ...saleSnap.data(), id: saleSnap.id } as Sale;
        if (sale.status === 'cancelled') throw new BusinessError('Sale is already cancelled.');

        const customerSnap =
          sale.payment_method === 'credit' && sale.customer_id ? await tx.get(doc(db, 'customers', sale.customer_id)) : null;

        const nowIso = new Date().toISOString();

        // 1. Reverse stock movements
        sale.items.forEach(item => {
          tx.set(
            ...movementRecord(
              { id: item.product_id, name: item.product_name },
              'sale_cancel',
              item.qty,
              'sale',
              sale.id,
              `Cancellation of ${sale.invoice_no}: ${reason}`,
              nowIso
            )
          );
          tx.update(doc(db, 'products', item.product_id), { current_stock: increment(item.qty), updated_at: nowIso });
        });

        // 2. Reverse customer credit ledger if credit sale
        if (customerSnap?.exists()) {
          const dues = Number(customerSnap.data().current_dues) || 0;
          const newDues = Math.max(0, r2(dues - sale.total));
          const lref = newRef('customer_ledger');
          const ledgerEntry: CustomerLedgerEntry = {
            id: lref.id,
            customer_id: customerSnap.id,
            type: 'adjustment',
            amount: -sale.total,
            balance_after: newDues,
            sale_id: sale.id,
            invoice_no: sale.invoice_no,
            note: `Reversal of cancelled credit invoice ${sale.invoice_no}: ${reason}`,
            created_by: currentUser.id,
            created_at: nowIso,
          };
          tx.set(lref, ledgerEntry);
          tx.update(customerSnap.ref, { current_dues: newDues });
        }

        // 3. Update sale status
        tx.update(saleSnap.ref, {
          status: 'cancelled',
          cancel_reason: reason,
          cancelled_by: currentUser.name,
          cancelled_at: nowIso,
        });

        // 4. Audit log
        tx.set(
          ...auditEntry('CANCEL_SALE', 'sale', sale.id, {
            invoice_no: sale.invoice_no,
            amount: sale.total,
            reason,
            cancelled_by: currentUser.name,
            role: currentUser.role,
          })
        );
      });
      return { success: true };
    } catch (err) {
      if (err instanceof BusinessError) return { success: false, error: err.message };
      console.error(err);
      return { success: false, error: friendlyFirebaseError(err) };
    }
  };

  // Purchases - Rule 5: Purchase + purchase items + stock increase are one atomic batch
  const createPurchase = (input: NewPurchaseInput): Promise<Result> => {
    if (!can(currentUser, 'record_purchases')) {
      return Promise.resolve({ success: false, error: permissionDenied('record_purchases') });
    }
    const supplier = suppliers.find(s => s.id === input.supplier_id);
    if (!supplier) return Promise.resolve({ success: false, error: 'Supplier not found' });
    if (!input.items || input.items.length === 0) {
      return Promise.resolve({ success: false, error: 'Please add at least one purchase item line.' });
    }
    const missing = input.items.find(line => !products.some(p => p.id === line.product_id));
    if (missing) return Promise.resolve({ success: false, error: `Product not found: ${missing.product_id}` });
    for (const line of input.items) {
      const prod = products.find(p => p.id === line.product_id)!;
      if (!isValidQtyForUnit(line.qty, prod.unit)) {
        return Promise.resolve({ success: false, error: wholeQtyError(prod.name, prod.unit, line.qty) });
      }
    }

    const purchaseRef = newRef('purchases');
    const purchaseId = purchaseRef.id;
    let grandTotal = 0;
    const nowIso = new Date().toISOString();

    const purchaseItems = input.items.map((line, idx) => {
      const prod = products.find(p => p.id === line.product_id)!;
      const lineTotal = r2(line.qty * line.unit_cost);
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
      total: r2(grandTotal),
      notes: input.notes,
      items: purchaseItems,
      created_by: currentUser.id,
      created_at: nowIso,
    };

    const ops: Op[] = [setOp(purchaseRef, purchaseRecord)];

    // Stock movements
    purchaseItems.forEach(pi => {
      ops.push(
        setOp(
          ...movementRecord(
            { id: pi.product_id, name: pi.product_name },
            'purchase',
            pi.qty,
            'purchase',
            purchaseId,
            `Supplier Invoice: ${input.supplier_invoice_no}`,
            nowIso
          )
        )
      );
    });

    // Update stock (increment works offline and with concurrent sales) and optionally purchase price
    const perProduct = new Map<string, { qty: number; unit_cost: number }>();
    purchaseItems.forEach(pi => {
      const prev = perProduct.get(pi.product_id);
      perProduct.set(pi.product_id, { qty: (prev?.qty || 0) + pi.qty, unit_cost: pi.unit_cost });
    });
    perProduct.forEach(({ qty, unit_cost }, pid) => {
      ops.push(
        updateOp(doc(db, 'products', pid), {
          current_stock: increment(qty),
          updated_at: nowIso,
          ...(input.update_product_cost ? { purchase_price: unit_cost } : {}),
        })
      );
    });

    ops.push(
      auditOp('CREATE_PURCHASE', 'purchase', purchaseId, {
        supplier: supplier.name,
        invoice_no: input.supplier_invoice_no,
        total: r2(grandTotal),
        items_count: purchaseItems.length,
      })
    );

    return commitOps(ops);
  };

  // Stock Adjustment - Rule 7: Every adjustment needs a reason and is written to the audit log (Owner only)
  const adjustStock = async (
    productId: string,
    type: 'damage' | 'expired' | 'adjustment',
    qtyChange: number,
    reason: string
  ): Promise<Result> => {
    if (currentUser.role !== 'owner') {
      return { success: false, error: 'Only shop Owner is authorized to adjust stock.' };
    }
    if (!reason || reason.trim().length === 0) {
      return { success: false, error: 'Mandatory reason required for stock adjustment.' };
    }
    if (!navigator.onLine) return { success: false, error: 'No internet connection. Try the adjustment again once online.' };

    try {
      await runTransaction(db, async tx => {
        const snap = await tx.get(doc(db, 'products', productId));
        if (!snap.exists()) throw new BusinessError('Product not found');
        const product = { ...snap.data(), id: snap.id } as Product;
        if (!isValidQtyForUnit(qtyChange, product.unit)) {
          throw new BusinessError(wholeQtyError(product.name, product.unit, qtyChange));
        }

        const newStock = r3(product.current_stock + qtyChange);
        if (!settings.allow_negative_stock && newStock < 0) {
          throw new BusinessError(
            `Insufficient stock for ${product.name}. Available: ${product.current_stock} ${product.unit}, requested deduction: ${Math.abs(qtyChange)} ${product.unit}`
          );
        }

        const nowIso = new Date().toISOString();
        tx.set(...movementRecord(product, type, qtyChange, 'adjustment', undefined, reason, nowIso));
        tx.update(snap.ref, { current_stock: newStock, updated_at: nowIso });
        tx.set(
          ...auditEntry('STOCK_ADJUSTMENT', 'stock', productId, {
            product_name: product.name,
            type,
            qty_change: qtyChange,
            reason,
          })
        );
      });
      return { success: true };
    } catch (err) {
      if (err instanceof BusinessError) return { success: false, error: err.message };
      console.error(err);
      return { success: false, error: friendlyFirebaseError(err) };
    }
  };

  // Customer Credit Payment
  const recordCustomerPayment = (
    customerId: string,
    amount: number,
    paymentMethod: 'cash' | 'upi',
    note?: string
  ): Promise<Result> => {
    if (!can(currentUser, 'receive_payments')) {
      return Promise.resolve({ success: false, error: permissionDenied('receive_payments') });
    }
    if (amount <= 0) return Promise.resolve({ success: false, error: 'Payment amount must be greater than zero.' });
    const customer = customers.find(c => c.id === customerId);
    if (!customer) return Promise.resolve({ success: false, error: 'Customer not found.' });

    const newDues = r2(customer.current_dues - amount);
    const lref = newRef('customer_ledger');
    const entry: CustomerLedgerEntry = {
      id: lref.id,
      customer_id: customer.id,
      type: 'payment',
      amount: -amount,
      balance_after: newDues,
      payment_method: paymentMethod,
      note: note || `Received ₹${amount} via ${paymentMethod.toUpperCase()}`,
      created_by: currentUser.id,
      created_at: new Date().toISOString(),
    };

    return commitOps([
      setOp(lref, entry),
      updateOp(doc(db, 'customers', customer.id), { current_dues: increment(-amount) }),
      auditOp('RECEIVE_CREDIT_PAYMENT', 'customer_ledger', customer.id, {
        customer_name: customer.name,
        amount,
        payment_method: paymentMethod,
        new_dues: newDues,
      }),
    ]);
  };

  // Manual Udhaar: goods or cash given to a customer without a bill
  const addCustomerDues = async (customerId: string, amount: number, note: string): Promise<Result> => {
    if (!can(currentUser, 'add_udhaar')) return { success: false, error: permissionDenied('add_udhaar') };
    if (!(amount > 0)) return { success: false, error: 'Amount must be greater than zero.' };
    if (!note || note.trim().length === 0) {
      return { success: false, error: 'A note is mandatory (what was given on Udhaar).' };
    }
    if (currentUser.role === 'cashier' && isDateClosed(currentBusinessDate)) {
      return { success: false, error: 'Cashier permission denied: Cannot add Udhaar on a closed day.' };
    }
    if (!navigator.onLine) return { success: false, error: 'No internet connection. Add the Udhaar once online.' };

    try {
      await runTransaction(db, async tx => {
        const snap = await tx.get(doc(db, 'customers', customerId));
        if (!snap.exists()) throw new BusinessError('Customer not found.');
        const customer = { ...snap.data(), id: snap.id } as Customer;

        const dues = Number(customer.current_dues) || 0;
        const newDues = r2(dues + amount);
        // Rule 10: same credit limit check as credit bills
        if (customer.credit_limit !== null && customer.credit_limit !== undefined && newDues > customer.credit_limit) {
          throw new BusinessError(
            `Would exceed ${customer.name}'s credit limit of ₹${customer.credit_limit}. Current dues: ₹${dues}, Adding: ₹${amount} (Projected dues: ₹${newDues}).`
          );
        }

        const nowIso = new Date().toISOString();
        const lref = newRef('customer_ledger');
        const entry: CustomerLedgerEntry = {
          id: lref.id,
          customer_id: customer.id,
          type: 'adjustment',
          amount: r2(amount),
          balance_after: newDues,
          note: note.trim(),
          created_by: currentUser.id,
          created_at: nowIso,
        };
        tx.set(lref, entry);
        tx.update(snap.ref, { current_dues: newDues });
        tx.set(
          ...auditEntry('ADD_CUSTOMER_DUES', 'customer_ledger', customer.id, {
            customer_name: customer.name,
            amount: r2(amount),
            note: note.trim(),
            new_dues: newDues,
          })
        );
      });
      return { success: true };
    } catch (err) {
      if (err instanceof BusinessError) return { success: false, error: err.message };
      console.error(err);
      return { success: false, error: friendlyFirebaseError(err) };
    }
  };

  // Expenses
  const addExpense = (
    expenseInput: Omit<Expense, 'id' | 'created_by' | 'created_by_name' | 'created_at'>
  ): Promise<Result> => {
    if (!can(currentUser, 'manage_expenses')) {
      return Promise.resolve({ success: false, error: permissionDenied('manage_expenses') });
    }
    // Check if date is closed
    if (currentUser.role === 'cashier' && isDateClosed(expenseInput.expense_date)) {
      return Promise.resolve({ success: false, error: 'Cannot add expense for a closed day.' });
    }

    const ref = newRef('expenses');
    const exp: Expense = {
      ...expenseInput,
      id: ref.id,
      created_by: currentUser.id,
      created_by_name: currentUser.name,
      created_at: new Date().toISOString(),
    };
    return commitOps([
      setOp(ref, exp),
      auditOp('ADD_EXPENSE', 'expense', ref.id, {
        category: exp.category,
        amount: exp.amount,
        date: exp.expense_date,
      }),
    ]);
  };

  const updateExpense = (id: string, updates: Partial<Expense>): Promise<Result> => {
    const exp = expenses.find(e => e.id === id);
    if (!exp) return Promise.resolve({ success: false, error: 'Expense not found' });
    if (!can(currentUser, 'manage_expenses')) {
      return Promise.resolve({ success: false, error: permissionDenied('manage_expenses') });
    }
    if (currentUser.role === 'cashier' && exp.expense_date !== currentBusinessDate) {
      return Promise.resolve({ success: false, error: 'Cashier can only edit same-day expenses.' });
    }
    return commitOps([
      updateOp(doc(db, 'expenses', id), toUpdate(updates)),
      auditOp('UPDATE_EXPENSE', 'expense', id, updates),
    ]);
  };

  const deleteExpense = (id: string): Promise<Result> => {
    if (currentUser.role !== 'owner') {
      return Promise.resolve({ success: false, error: 'Only Owner can delete an expense record.' });
    }
    return commitOps([b => b.delete(doc(db, 'expenses', id)), auditOp('DELETE_EXPENSE', 'expense', id, {})]);
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
  ): Promise<Result> => {
    if (!can(currentUser, 'daily_closing')) {
      return Promise.resolve({ success: false, error: permissionDenied('daily_closing') });
    }
    const summary = getDailyCashSummary(date);
    const expected = r2(openingCash + summary.cash_sales + summary.cash_from_dues - summary.cash_expenses);
    const diff = r2(actualCash - expected);

    // Document id is the business date, so there is only ever one closing per day
    const closingRecord: DailyClosing = {
      id: date,
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

    return commitOps([
      setOp(doc(db, 'daily_closings', date), closingRecord),
      auditOp('DAY_CLOSED', 'daily_closing', date, {
        business_date: date,
        expected_cash: expected,
        actual_cash: actualCash,
        difference: diff,
      }),
    ]);
  };

  // Rule 8: Owner re-open is audited
  const reopenDailyClosing = (date: string, reason: string): Promise<Result> => {
    if (currentUser.role !== 'owner') {
      return Promise.resolve({ success: false, error: 'Only the Owner can re-open a closed business day.' });
    }
    if (!reason || reason.trim().length === 0) {
      return Promise.resolve({ success: false, error: 'A mandatory reason is required to re-open a closed day.' });
    }

    return commitOps([
      updateOp(doc(db, 'daily_closings', date), {
        status: 'open',
        reopened_by: currentUser.id,
        reopened_by_name: currentUser.name,
        reopened_at: new Date().toISOString(),
        reopen_reason: reason,
      }),
      auditOp('DAY_REOPENED', 'daily_closing', date, {
        business_date: date,
        reason,
        reopened_by: currentUser.name,
      }),
    ]);
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
  const importProductsCSV = async (csvText: string): Promise<Result & { count: number }> => {
    try {
      const lines = csvText.trim().split('\n');
      if (lines.length <= 1) return { success: false, count: 0, error: 'CSV file is empty or only has headers' };

      const ops: Op[] = [];
      const knownCategories = [...categories];
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
        if (!isValidQtyForUnit(opening_stock, unit)) {
          return { success: false, count: 0, error: `Line ${i + 1}: ${wholeQtyError(name, unit, opening_stock)}` };
        }

        let category = knownCategories.find(c => c.name.toLowerCase() === categoryName.toLowerCase());
        if (!category) {
          const cref = newRef('categories');
          category = { id: cref.id, name: categoryName, active: true };
          knownCategories.push(category);
          ops.push(setOp(cref, category));
        }

        const sku = `SKU-${name.slice(0, 3).toUpperCase()}-${Date.now().toString().slice(-4)}${i}`;
        ops.push(
          ...productOps(
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
          )
        );
        imported++;
      }

      ops.push(auditOp('IMPORT_PRODUCTS_CSV', 'products', 'batch', { count: imported }));
      const res = await commitOps(ops);
      return { ...res, count: res.success ? imported : 0 };
    } catch (err: any) {
      return { success: false, count: 0, error: err.message || 'Failed to parse CSV' };
    }
  };

  // CSV Import for Customer Opening Dues (Week 1, #8)
  const importCustomerDuesCSV = async (csvText: string): Promise<Result & { count: number }> => {
    try {
      const lines = csvText.trim().split('\n');
      if (lines.length <= 1) return { success: false, count: 0, error: 'CSV file is empty or only has headers' };

      const ops: Op[] = [];
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
          ops.push(...customerOps({ name, mobile, address, credit_limit }, opening_due)[1]);
          imported++;
        }
      }

      ops.push(auditOp('IMPORT_CUSTOMERS_CSV', 'customers', 'batch', { count: imported }));
      const res = await commitOps(ops);
      return { ...res, count: res.success ? imported : 0 };
    } catch (err: any) {
      return { success: false, count: 0, error: err.message || 'Failed to parse CSV' };
    }
  };

  // Writes whole collections with their existing ids (demo seed + backup restore)
  const restoreOps = (data: {
    categories?: Category[];
    products?: Product[];
    suppliers?: Supplier[];
    customers?: Customer[];
    sales?: Sale[];
    purchases?: Purchase[];
    stockMovements?: StockMovement[];
    customerLedger?: CustomerLedgerEntry[];
    expenses?: Expense[];
    dailyClosings?: DailyClosing[];
    auditLogs?: AuditLog[];
  }): Op[] => {
    const ops: Op[] = [];
    const add = <T extends { id: string }>(col: string, rows: T[] | undefined, idOf: (r: T) => string = r => r.id) =>
      (rows || []).forEach(r => ops.push(setOp(doc(db, col, idOf(r)), { ...r, id: idOf(r) })));
    add('categories', data.categories);
    add('products', data.products);
    add('suppliers', data.suppliers);
    add('customers', data.customers);
    add('sales', data.sales);
    add('purchases', data.purchases);
    add('stock_movements', data.stockMovements);
    add('customer_ledger', data.customerLedger);
    add('expenses', data.expenses);
    add('daily_closings', data.dailyClosings, c => c.business_date);
    add('audit_logs', data.auditLogs);

    // Keep invoice numbers moving forward past the restored ones (never reused)
    const lastByCounter = new Map<string, number>();
    (data.sales || []).forEach(s => {
      const m = s.invoice_no.match(/^(.*)-(\d{4})-(\d+)$/);
      if (!m) return;
      const key = `invoice-${m[1]}-${m[2]}`;
      lastByCounter.set(key, Math.max(lastByCounter.get(key) || 0, Number(m[3])));
    });
    lastByCounter.forEach((last, key) => ops.push(b => b.set(doc(db, 'counters', key), { last })));
    return ops;
  };

  // Demo seed: only into an empty shop, so real data is never overwritten
  const loadDemoData = async (): Promise<Result> => {
    if (!isOwner) return { success: false, error: 'Only the Owner can load demo data.' };
    if (products.length > 0) return { success: false, error: 'Demo data can only be loaded into an empty shop (no products yet).' };
    if (!navigator.onLine) return { success: false, error: 'No internet connection.' };
    return commitOps([
      ...restoreOps({
        categories: initialCategories,
        products: initialProducts,
        suppliers: initialSuppliers,
        customers: initialCustomers,
        sales: initialSales,
        purchases: initialPurchases,
        stockMovements: initialStockMovements,
        customerLedger: initialCustomerLedger,
        expenses: initialExpenses,
        dailyClosings: initialDailyClosings,
        auditLogs: initialAuditLogs,
      }),
      auditOp('LOAD_DEMO_DATA', 'system', 'root', {}),
    ]);
  };

  // Backup JSON (covers the loaded history window for sales, movements and audit logs)
  const exportDatabaseJSON = (): string => {
    const backup = {
      version: '1.0',
      exported_at: new Date().toISOString(),
      history_days: HISTORY_DAYS,
      settings,
      users: users.map(({ pin, ...u }) => u),
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

  // Restore JSON (Week 5: "do a full restore on a fresh database"). Staff logins are not restored.
  const importDatabaseJSON = async (jsonString: string): Promise<Result> => {
    if (!isOwner) return { success: false, error: 'Only the Owner can restore a backup.' };
    if (!navigator.onLine) return { success: false, error: 'No internet connection.' };
    try {
      const data = JSON.parse(jsonString);
      const ops = restoreOps(data);
      if (data.settings) ops.push(setOp(doc(db, 'settings', 'shop'), data.settings));
      ops.push(auditOp('RESTORE_DATABASE', 'system', 'root', { version: data.version }));
      return commitOps(ops);
    } catch (err: any) {
      return { success: false, error: err.message || 'Invalid JSON format' };
    }
  };

  // User management: each staff member gets a Firebase Auth login (mobile + PIN)
  const addUser = async (name: string, mobile: string, pin: string, role: 'owner' | 'cashier'): Promise<Result> => {
    if (!isOwner) return { success: false, error: 'Only the Owner can add users.' };
    if (pin.length < MIN_PIN_LENGTH) return { success: false, error: `PIN must be at least ${MIN_PIN_LENGTH} digits.` };
    if (!navigator.onLine) return { success: false, error: 'No internet connection.' };
    try {
      const uid = await createAuthUser(mobile, pin);
      const newUser: User = {
        id: uid,
        name: name.trim(),
        mobile: mobile.trim(),
        role,
        active: true,
        created_at: new Date().toISOString(),
      };
      return commitOps([
        setOp(doc(db, 'users', uid), newUser),
        auditOp('CREATE_USER', 'user', uid, { name: newUser.name, role: newUser.role }),
      ]);
    } catch (err) {
      return { success: false, error: friendlyFirebaseError(err) };
    }
  };

  const changeOwnPin = async (currentPin: string, newPin: string): Promise<Result> => {
    if (newPin.length < MIN_PIN_LENGTH) return { success: false, error: `PIN must be at least ${MIN_PIN_LENGTH} digits.` };
    const fbUser = auth.currentUser;
    if (!fbUser) return { success: false, error: 'Not signed in.' };
    try {
      await reauthenticateWithCredential(fbUser, EmailAuthProvider.credential(mobileToEmail(currentUser.mobile), currentPin));
      await updatePassword(fbUser, newPin);
      await commitOps([auditOp('UPDATE_USER_PIN', 'user', currentUser.id, {})]);
      return { success: true };
    } catch (err) {
      return { success: false, error: friendlyFirebaseError(err) };
    }
  };

  const toggleUserActive = (userId: string): Promise<Result> => {
    if (userId === currentUser.id) return Promise.resolve({ success: false, error: 'You cannot deactivate your own account.' });
    const u = users.find(x => x.id === userId);
    if (!u) return Promise.resolve({ success: false, error: 'User not found.' });
    return commitOps([
      updateOp(doc(db, 'users', userId), { active: !u.active }),
      auditOp('TOGGLE_USER_ACTIVE', 'user', userId, { name: u.name, active: !u.active }),
    ]);
  };

  const updateUserPermissions = (userId: string, permissions: CashierPermissions): Promise<Result> => {
    if (currentUser.role !== 'owner') {
      return Promise.resolve({ success: false, error: 'Only the Owner can change staff permissions.' });
    }
    const u = users.find(x => x.id === userId);
    if (!u) return Promise.resolve({ success: false, error: 'User not found.' });
    return commitOps([
      updateOp(doc(db, 'users', userId), { permissions }),
      auditOp('UPDATE_USER_PERMISSIONS', 'user', userId, { name: u.name, permissions }),
    ]);
  };

  const signOutUser = () => signOut(auth);

  if (!settingsDoc || !usersLoaded || !productsLoaded || !categoriesLoaded || !customersLoaded || !salesLoaded) {
    return (
      <FullScreenMessage>
        <p className="font-semibold text-slate-900">Loading shop data…</p>
      </FullScreenMessage>
    );
  }

  return (
    <DairyContext.Provider
      value={{
        currentUser,
        signOutUser,
        historyDays: HISTORY_DAYS,
        users,
        settings,
        updateSettings,
        categories,
        addCategory,
        addCustomUnit,
        updateCategory,
        renameCustomUnit,
        removeCustomUnit,
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
        addCustomerDues,
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
        loadDemoData,
        exportDatabaseJSON,
        importDatabaseJSON,
        addUser,
        changeOwnPin,
        toggleUserActive,
        updateUserPermissions,
        can: (permission: CashierPermission) => can(currentUser, permission),
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
