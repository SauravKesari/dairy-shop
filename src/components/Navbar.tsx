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
  LogOut,
  Tags,
  TrendingUp,
} from 'lucide-react';
import { SHOW_DEV_TOOLS } from '../lib/firebase';
import { useLanguage } from '../i18n/LanguageContext';
import { LanguageToggle } from '../i18n/LanguageToggle';

export type NavTab =
  | 'pos'
  | 'sales'
  | 'stock'
  | 'purchases'
  | 'credit'
  | 'expenses'
  | 'closing'
  | 'reports'
  | 'profit'
  | 'products'
  | 'catalog_setup'
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
    signOutUser,
    settings,
    currentBusinessDate,
    setCurrentBusinessDate,
    isDateClosed,
    expiryAlerts,
    can,
  } = useDairy();
  const { t, tx } = useLanguage();

  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showRoleMenu, setShowRoleMenu] = useState(false);

  const isClosed = isDateClosed(currentBusinessDate);

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
      <div className="w-full px-4 sm:px-6 flex items-center justify-between gap-2 sm:gap-4 h-16">
        {/* Zone 1: Single text element wordmark (Display Face / Brand), pinned to the left */}
        <div className="flex items-center gap-3 min-w-0 lg:shrink-0">
          <button
            onClick={() => onSelectTab('pos')}
            className="text-base font-extrabold tracking-tight text-slate-950 uppercase hover:text-slate-700 transition-colors flex items-center gap-2 whitespace-nowrap min-w-0"
          >
            <span className="truncate">{settings.shop_name}</span>
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
            <span>{t('nav.pos')}</span>
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
            <span>{t('nav.sales')}</span>
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
            <span>{t('nav.stock')}</span>
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
            <span>{t('nav.purchases')}</span>
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
            <span>{t('nav.credit')}</span>
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
            <span>{t('nav.expenses')}</span>
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
            <span>{t('nav.closing')}</span>
            <span
              className={`w-2 h-2 rounded-full ${isClosed ? 'bg-amber-500' : 'bg-emerald-500'}`}
              title={isClosed ? t('nav.dayClosedLocked') : t('nav.dayIsOpen')}
            />
          </button>

          {can('view_reports') && (
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
            <span>{t('nav.reports')}</span>
          </button>
          )}

          {can('view_profit') && (
          <button
            type="button"
            onClick={() => onSelectTab('profit')}
            className={`px-3 py-2 rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              currentTab === 'profit'
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>{t('nav.profit')}</span>
          </button>
          )}

          {/* More Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowMoreMenu(!showMoreMenu)}
              className={`px-3 py-2 rounded-lg transition-colors whitespace-nowrap flex items-center gap-1 ${
                ['products', 'catalog_setup', 'audit', 'settings', 'users', 'checklist'].includes(currentTab)
                  ? 'bg-slate-100 text-slate-900 font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <span>{t('nav.more')}</span>
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
                  <span>{t('nav.products')}</span>
                </button>

                {SHOW_DEV_TOOLS && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        onSelectTab('deploy');
                        setShowMoreMenu(false);
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center gap-2 text-blue-700 font-semibold"
                    >
                      <Rocket className="w-4 h-4 text-blue-600" />
                      <span>{t('nav.deploy')}</span>
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
                      <span>{t('nav.checklist')}</span>
                    </button>
                  </>
                )}

                {currentUser.role === 'owner' && (
                  <button
                    type="button"
                    onClick={() => {
                      onSelectTab('catalog_setup');
                      setShowMoreMenu(false);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center gap-2 text-slate-700"
                  >
                    <Tags className="w-4 h-4 text-slate-500" />
                    <span>{t('nav.catalogSetup')}</span>
                  </button>
                )}

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
                    <span>{t('nav.audit')}</span>
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
                    <span>{t('nav.users')}</span>
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
                    <span>{t('nav.settings')}</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </nav>

        {/* Zone 3: 1-2 Primary Actions (Role Switcher & Date Status) */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Business Date Pill with Quick Open/Closed indicator */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono-numbers text-slate-700">
            <span>{currentBusinessDate}</span>
            <span
              className={`w-2 h-2 rounded-full ${isClosed ? 'bg-amber-500' : 'bg-emerald-500'}`}
              title={isClosed ? t('nav.dayLocked') : t('nav.dayOpen')}
            />
          </div>

          <LanguageToggle />

          {/* Signed-in user menu */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowRoleMenu(!showRoleMenu)}
              className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg text-xs font-medium transition-colors"
            >
              <div className="flex flex-col text-left leading-none min-w-0">
                <span className="font-bold text-slate-900 truncate max-w-[4.5rem] sm:max-w-none">{currentUser.name}</span>
                <span className="text-[10px] text-slate-500 capitalize">{tx(`role.${currentUser.role}`, currentUser.role)}</span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {showRoleMenu && (
              <div
                className="absolute right-0 mt-1 w-52 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 text-xs font-medium"
                onMouseLeave={() => setShowRoleMenu(false)}
              >
                <div className="px-3 py-1 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  {t('nav.signedInAs', { mobile: currentUser.mobile })}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowRoleMenu(false);
                    signOutUser();
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center gap-2 text-slate-700"
                >
                  <LogOut className="w-4 h-4 text-slate-500" />
                  <span>{t('nav.signOut')}</span>
                </button>
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
          {t('nav.pos')}
        </button>
        <button
          onClick={() => onSelectTab('sales')}
          className={`px-2.5 py-1 rounded-md whitespace-nowrap ${
            currentTab === 'sales' ? 'bg-slate-900 text-white' : 'text-slate-600'
          }`}
        >
          {t('nav.m.sales')}
        </button>
        <button
          onClick={() => onSelectTab('stock')}
          className={`px-2.5 py-1 rounded-md whitespace-nowrap ${
            currentTab === 'stock' ? 'bg-slate-900 text-white' : 'text-slate-600'
          }`}
        >
          {t('nav.m.stock', { count: expiryAlerts.length })}
        </button>
        <button
          onClick={() => onSelectTab('purchases')}
          className={`px-2.5 py-1 rounded-md whitespace-nowrap ${
            currentTab === 'purchases' ? 'bg-slate-900 text-white' : 'text-slate-600'
          }`}
        >
          {t('nav.m.purchases')}
        </button>
        <button
          onClick={() => onSelectTab('credit')}
          className={`px-2.5 py-1 rounded-md whitespace-nowrap ${
            currentTab === 'credit' ? 'bg-slate-900 text-white' : 'text-slate-600'
          }`}
        >
          {t('nav.m.credit')}
        </button>
        <button
          onClick={() => onSelectTab('expenses')}
          className={`px-2.5 py-1 rounded-md whitespace-nowrap ${
            currentTab === 'expenses' ? 'bg-slate-900 text-white' : 'text-slate-600'
          }`}
        >
          {t('nav.expenses')}
        </button>
        <button
          onClick={() => onSelectTab('closing')}
          className={`px-2.5 py-1 rounded-md whitespace-nowrap ${
            currentTab === 'closing' ? 'bg-slate-900 text-white' : 'text-slate-600'
          }`}
        >
          {t('nav.m.closing')}
        </button>
        {can('view_reports') && (
        <button
          onClick={() => onSelectTab('reports')}
          className={`px-2.5 py-1 rounded-md whitespace-nowrap ${
            currentTab === 'reports' ? 'bg-slate-900 text-white' : 'text-slate-600'
          }`}
        >
          {t('nav.reports')}
        </button>
        )}
        {can('view_profit') && (
        <button
          onClick={() => onSelectTab('profit')}
          className={`px-2.5 py-1 rounded-md whitespace-nowrap ${
            currentTab === 'profit' ? 'bg-slate-900 text-white' : 'text-slate-600'
          }`}
        >
          {t('nav.profit')}
        </button>
        )}
        <button
          onClick={() => onSelectTab('products')}
          className={`px-2.5 py-1 rounded-md whitespace-nowrap ${
            currentTab === 'products' ? 'bg-slate-900 text-white' : 'text-slate-600'
          }`}
        >
          {t('nav.m.products')}
        </button>
        {SHOW_DEV_TOOLS && (
          <>
            <button
              onClick={() => onSelectTab('deploy')}
              className={`px-2.5 py-1 rounded-md whitespace-nowrap ${
                currentTab === 'deploy' ? 'bg-slate-900 text-white' : 'text-slate-600'
              }`}
            >
              {t('nav.m.deploy')}
            </button>
            <button
              onClick={() => onSelectTab('checklist')}
              className={`px-2.5 py-1 rounded-md whitespace-nowrap ${
                currentTab === 'checklist' ? 'bg-slate-900 text-white' : 'text-slate-600'
              }`}
            >
              {t('nav.m.checklist')}
            </button>
          </>
        )}
      </div>
    </header>
  );
};
