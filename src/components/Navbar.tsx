import React, { useState } from 'react';
import { useDairy } from '../context/DairyContext';
import {
  ShoppingCart,
  Receipt,
  Boxes,
  Truck,
  CreditCard,
  DollarSign,
  Lock,
  BarChart3,
  Settings as SettingsIcon,
  ShieldCheck,
  ClipboardCheck,
  ChevronDown,
  User,
  Package,
  Rocket,
} from 'lucide-react';

export type NavTab =
  | 'pos'
  | 'sales'
  | 'stock'
  | 'purchases'
  | 'credit'
  | 'expenses'
  | 'closing'
  | 'reports'
  | 'products'
  | 'audit'
  | 'settings'
  | 'users'
  | 'checklist'
  | 'deploy';

interface NavbarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentTab, onSelectTab }) => {
  const {
    currentUser,
    setCurrentUser,
    users,
    settings,
    currentBusinessDate,
    setCurrentBusinessDate,
    isDateClosed,
    expiryAlerts,
  } = useDairy();

  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showRoleMenu, setShowRoleMenu] = useState(false);

  const isClosed = isDateClosed(currentBusinessDate);

  const handleSwitchRole = (userId: string) => {
    const target = users.find(u => u.id === userId);
    if (target) {
      setCurrentUser(target);
      setShowRoleMenu(false);
    }
  };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
        {/* Zone 1: Single text element wordmark (Display Face / Brand) */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => onSelectTab('pos')}
            className="text-base font-extrabold tracking-tight text-slate-950 uppercase hover:text-slate-700 transition-colors flex items-center gap-2 whitespace-nowrap"
          >
            <span>{settings.shop_name}</span>
          </button>
        </div>

        {/* Zone 2: Navigation Links (Clean text with active indicator) */}
        <nav className="hidden lg:flex items-center gap-1 xl:gap-2 text-xs font-semibold">
          <button
            type="button"
            onClick={() => onSelectTab('pos')}
            className={`px-3 py-2 rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              currentTab === 'pos'
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            <span>POS Billing</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectTab('sales')}
            className={`px-3 py-2 rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              currentTab === 'sales'
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>Sales & Bills</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectTab('stock')}
            className={`px-3 py-2 rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              currentTab === 'stock'
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Boxes className="w-3.5 h-3.5" />
            <span>Stock & Expiry</span>
            {expiryAlerts.length > 0 && (
              <span className="w-2 h-2 rounded-full bg-red-500" />
            )}
          </button>

          <button
            type="button"
            onClick={() => onSelectTab('purchases')}
            className={`px-3 py-2 rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              currentTab === 'purchases'
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Truck className="w-3.5 h-3.5" />
            <span>Purchases</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectTab('credit')}
            className={`px-3 py-2 rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              currentTab === 'credit'
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>Udhaar (Credit)</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectTab('expenses')}
            className={`px-3 py-2 rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              currentTab === 'expenses'
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <DollarSign className="w-3.5 h-3.5" />
            <span>Expenses</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectTab('closing')}
            className={`px-3 py-2 rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              currentTab === 'closing'
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Daily Closing</span>
            <span
              className={`w-2 h-2 rounded-full ${isClosed ? 'bg-amber-500' : 'bg-emerald-500'}`}
              title={isClosed ? 'Day is closed & locked' : 'Day is open'}
            />
          </button>

          <button
            type="button"
            onClick={() => onSelectTab('reports')}
            className={`px-3 py-2 rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              currentTab === 'reports'
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Reports</span>
          </button>

          {/* More Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowMoreMenu(!showMoreMenu)}
              className={`px-3 py-2 rounded-lg transition-colors whitespace-nowrap flex items-center gap-1 ${
                ['products', 'audit', 'settings', 'users', 'checklist'].includes(currentTab)
                  ? 'bg-slate-100 text-slate-900 font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <span>More</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </button>

            {showMoreMenu && (
              <div
                className="absolute right-0 mt-1 w-48 bg-white rounded-xl shadow-lg border border-slate-200 py-1.5 z-50 text-xs font-medium"
                onMouseLeave={() => setShowMoreMenu(false)}
              >
                <button
                  type="button"
                  onClick={() => {
                    onSelectTab('products');
                    setShowMoreMenu(false);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center gap-2 text-slate-700"
                >
                  <Package className="w-4 h-4 text-slate-500" />
                  <span>Product Catalog & CSV</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onSelectTab('deploy');
                    setShowMoreMenu(false);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center gap-2 text-blue-700 font-semibold"
                >
                  <Rocket className="w-4 h-4 text-blue-600" />
                  <span>Deployment & Go-Live</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onSelectTab('checklist');
                    setShowMoreMenu(false);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center gap-2 text-slate-700"
                >
                  <ClipboardCheck className="w-4 h-4 text-blue-600" />
                  <span>Go-Live Test Runner</span>
                </button>

                {currentUser.role === 'owner' && (
                  <button
                    type="button"
                    onClick={() => {
                      onSelectTab('audit');
                      setShowMoreMenu(false);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center gap-2 text-slate-700"
                  >
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>Audit Log</span>
                  </button>
                )}

                {currentUser.role === 'owner' && (
                  <button
                    type="button"
                    onClick={() => {
                      onSelectTab('users');
                      setShowMoreMenu(false);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center gap-2 text-slate-700"
                  >
                    <User className="w-4 h-4 text-slate-500" />
                    <span>Staff & Cashiers</span>
                  </button>
                )}

                {currentUser.role === 'owner' && (
                  <button
                    type="button"
                    onClick={() => {
                      onSelectTab('settings');
                      setShowMoreMenu(false);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center gap-2 text-slate-700"
                  >
                    <SettingsIcon className="w-4 h-4 text-slate-500" />
                    <span>Settings & Backup</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </nav>

        {/* Zone 3: 1-2 Primary Actions (Role Switcher & Date Status) */}
        <div className="flex items-center gap-3">
          {/* Business Date Pill with Quick Open/Closed indicator */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono-numbers text-slate-700">
            <span>{currentBusinessDate}</span>
            <span
              className={`w-2 h-2 rounded-full ${isClosed ? 'bg-amber-500' : 'bg-emerald-500'}`}
              title={isClosed ? 'Day Locked' : 'Day Open'}
            />
          </div>

          {/* Quick Role Switcher Button */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowRoleMenu(!showRoleMenu)}
              className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg text-xs font-medium transition-colors"
            >
              <div className="flex flex-col text-left leading-none">
                <span className="font-bold text-slate-900">{currentUser.name}</span>
                <span className="text-[10px] text-slate-500 capitalize">{currentUser.role}</span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {showRoleMenu && (
              <div
                className="absolute right-0 mt-1 w-52 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 text-xs font-medium"
                onMouseLeave={() => setShowRoleMenu(false)}
              >
                <div className="px-3 py-1 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  Switch Active Role (Demo)
                </div>
                {users.map(u => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => handleSwitchRole(u.id)}
                    className={`w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center justify-between ${
                      u.id === currentUser.id ? 'bg-slate-50 font-bold text-slate-900' : 'text-slate-700'
                    }`}
                  >
                    <div>
                      <span className="block">{u.name}</span>
                      <span className="text-[10px] text-slate-400 capitalize">{u.role}</span>
                    </div>
                    {u.id === currentUser.id && (
                      <span className="w-2 h-2 rounded-full bg-slate-900" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Navigation Scrollbar */}
      <div className="lg:hidden flex items-center gap-1 overflow-x-auto px-4 py-2 border-t border-slate-100 bg-slate-50 text-xs font-semibold no-scrollbar">
        <button
          onClick={() => onSelectTab('pos')}
          className={`px-2.5 py-1 rounded-md whitespace-nowrap ${
            currentTab === 'pos' ? 'bg-slate-900 text-white' : 'text-slate-600'
          }`}
        >
          POS Billing
        </button>
        <button
          onClick={() => onSelectTab('sales')}
          className={`px-2.5 py-1 rounded-md whitespace-nowrap ${
            currentTab === 'sales' ? 'bg-slate-900 text-white' : 'text-slate-600'
          }`}
        >
          Bills
        </button>
        <button
          onClick={() => onSelectTab('stock')}
          className={`px-2.5 py-1 rounded-md whitespace-nowrap ${
            currentTab === 'stock' ? 'bg-slate-900 text-white' : 'text-slate-600'
          }`}
        >
          Stock ({expiryAlerts.length})
        </button>
        <button
          onClick={() => onSelectTab('purchases')}
          className={`px-2.5 py-1 rounded-md whitespace-nowrap ${
            currentTab === 'purchases' ? 'bg-slate-900 text-white' : 'text-slate-600'
          }`}
        >
          Inward
        </button>
        <button
          onClick={() => onSelectTab('credit')}
          className={`px-2.5 py-1 rounded-md whitespace-nowrap ${
            currentTab === 'credit' ? 'bg-slate-900 text-white' : 'text-slate-600'
          }`}
        >
          Udhaar
        </button>
        <button
          onClick={() => onSelectTab('expenses')}
          className={`px-2.5 py-1 rounded-md whitespace-nowrap ${
            currentTab === 'expenses' ? 'bg-slate-900 text-white' : 'text-slate-600'
          }`}
        >
          Expenses
        </button>
        <button
          onClick={() => onSelectTab('closing')}
          className={`px-2.5 py-1 rounded-md whitespace-nowrap ${
            currentTab === 'closing' ? 'bg-slate-900 text-white' : 'text-slate-600'
          }`}
        >
          Closing
        </button>
        <button
          onClick={() => onSelectTab('reports')}
          className={`px-2.5 py-1 rounded-md whitespace-nowrap ${
            currentTab === 'reports' ? 'bg-slate-900 text-white' : 'text-slate-600'
          }`}
        >
          Reports
        </button>
        <button
          onClick={() => onSelectTab('products')}
          className={`px-2.5 py-1 rounded-md whitespace-nowrap ${
            currentTab === 'products' ? 'bg-slate-900 text-white' : 'text-slate-600'
          }`}
        >
          Products
        </button>
        <button
          onClick={() => onSelectTab('deploy')}
          className={`px-2.5 py-1 rounded-md whitespace-nowrap ${
            currentTab === 'deploy' ? 'bg-slate-900 text-white' : 'text-slate-600'
          }`}
        >
          Deploy
        </button>
        <button
          onClick={() => onSelectTab('checklist')}
          className={`px-2.5 py-1 rounded-md whitespace-nowrap ${
            currentTab === 'checklist' ? 'bg-slate-900 text-white' : 'text-slate-600'
          }`}
        >
          Acceptance Tests
        </button>
      </div>
    </header>
  );
};
