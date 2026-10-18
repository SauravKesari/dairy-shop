/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { DairyProvider, useDairy } from './context/DairyContext';
import { Navbar, NavTab } from './components/Navbar';
import { POSScreen } from './components/pos/POSScreen';
import { SalesHistory } from './components/sales/SalesHistory';
import { StockScreen } from './components/stock/StockScreen';
import { PurchasesScreen } from './components/purchases/PurchasesScreen';
import { CreditScreen } from './components/credit/CreditScreen';
import { ExpensesScreen } from './components/expenses/ExpensesScreen';
import { DailyClosingScreen } from './components/closing/DailyClosingScreen';
import { ReportsScreen } from './components/reports/ReportsScreen';
import { ProfitScreen } from './components/profit/ProfitScreen';
import { ProductsCatalogScreen } from './components/products/ProductsCatalogScreen';
import { CategoriesUnitsScreen } from './components/products/CategoriesUnitsScreen';
import { AuditLogScreen } from './components/audit/AuditLogScreen';
import { SettingsScreen } from './components/settings/SettingsScreen';
import { UsersScreen } from './components/users/UsersScreen';
import { GoLiveChecklist } from './components/testing/GoLiveChecklist';
import { DeployScreen } from './components/deploy/DeployScreen';
import { SHOW_DEV_TOOLS } from './lib/firebase';
import { LanguageProvider, useLanguage } from './i18n/LanguageContext';

function AppContent() {
  const [currentTab, setCurrentTab] = useState<NavTab>('pos');
  const { settings, currentUser, can } = useDairy();
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans text-slate-900">
      {/* Top Bar Header adhering to Top Bar Contract */}
      <Navbar currentTab={currentTab} onSelectTab={setCurrentTab} />

      {/* Main View Area */}
      <main className="flex-1">
        {currentTab === 'pos' && <POSScreen />}
        {currentTab === 'sales' && <SalesHistory />}
        {currentTab === 'stock' && <StockScreen />}
        {currentTab === 'purchases' && <PurchasesScreen />}
        {currentTab === 'credit' && <CreditScreen />}
        {currentTab === 'expenses' && <ExpensesScreen />}
        {currentTab === 'closing' && <DailyClosingScreen />}
        {currentTab === 'reports' && can('view_reports') && <ReportsScreen />}
        {currentTab === 'profit' && can('view_profit') && <ProfitScreen />}
        {currentTab === 'products' && <ProductsCatalogScreen />}
        {currentTab === 'catalog_setup' && <CategoriesUnitsScreen />}
        {currentTab === 'audit' && currentUser.role === 'owner' && <AuditLogScreen />}
        {currentTab === 'audit' && currentUser.role !== 'owner' && (
          <div className="p-12 text-center text-slate-500">
            <p className="font-semibold text-sm">{t('app.accessRestricted')}</p>
            <p className="text-xs mt-1">{t('app.auditOwnerOnly')}</p>
          </div>
        )}
        {currentTab === 'settings' && currentUser.role === 'owner' && <SettingsScreen />}
        {currentTab === 'users' && currentUser.role === 'owner' && <UsersScreen />}
        {SHOW_DEV_TOOLS && currentTab === 'checklist' && <GoLiveChecklist />}
        {SHOW_DEV_TOOLS && currentTab === 'deploy' && <DeployScreen />}
      </main>

      {/* Quiet Footer */}
      <footer className="no-print bg-white border-t border-slate-200 py-3 px-6 text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-700">{settings.shop_name}</span>
          <span>·</span>
          <span>{t('app.footer.system')}</span>
        </div>
        <div className="flex items-center gap-4 text-[11px]">
          <span>{t('app.footer.singleDevice')}</span>
          <span>·</span>
          <span>{t('app.footer.offline')}</span>
          <span>·</span>
          <span>{t('app.footer.stock')}</span>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <DairyProvider>
        <AppContent />
      </DairyProvider>
    </LanguageProvider>
  );
}
