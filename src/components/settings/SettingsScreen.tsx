import React, { useState } from 'react';
import { useDairy } from '../../context/DairyContext';
import {
  Settings,
  Save,
  Download,
  Upload,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Database,
  ShieldAlert,
} from 'lucide-react';

export const SettingsScreen: React.FC = () => {
  const {
    settings,
    updateSettings,
    currentUser,
    exportDatabaseJSON,
    importDatabaseJSON,
    resetToDemoData,
  } = useDairy();

  const [shopName, setShopName] = useState(settings.shop_name);
  const [address, setAddress] = useState(settings.address);
  const [phone, setPhone] = useState(settings.phone);
  const [upiId, setUpiId] = useState(settings.upi_id);
  const [invoicePrefix, setInvoicePrefix] = useState(settings.invoice_prefix);
  const [gstEnabled, setGstEnabled] = useState(settings.gst_enabled);
  const [defaultGstPercent, setDefaultGstPercent] = useState(settings.default_gst_percent);
  const [receiptFooter, setReceiptFooter] = useState(settings.receipt_footer);
  const [cashierMaxDiscount, setCashierMaxDiscount] = useState(settings.cashier_max_discount_percent);
  const [allowNegativeStock, setAllowNegativeStock] = useState(settings.allow_negative_stock);

  const [savedSuccess, setSavedSuccess] = useState(false);
  const [backupRestoreMsg, setBackupRestoreMsg] = useState<{ success: boolean; msg: string } | null>(null);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings({
      shop_name: shopName.trim(),
      address: address.trim(),
      phone: phone.trim(),
      upi_id: upiId.trim(),
      invoice_prefix: invoicePrefix.trim() || 'DP',
      gst_enabled: gstEnabled,
      default_gst_percent: defaultGstPercent,
      receipt_footer: receiptFooter.trim(),
      cashier_max_discount_percent: cashierMaxDiscount,
      allow_negative_stock: allowNegativeStock,
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handleDownloadBackup = () => {
    const jsonStr = exportDatabaseJSON();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `dairy_parlour_backup_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleRestoreFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBackupRestoreMsg(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = event => {
      const text = event.target?.result as string;
      const res = importDatabaseJSON(text);
      if (res.success) {
        setBackupRestoreMsg({ success: true, msg: 'Full database successfully restored! Reloading state...' });
        setTimeout(() => window.location.reload(), 1200);
      } else {
        setBackupRestoreMsg({ success: false, msg: res.error || 'Failed to restore JSON backup.' });
      }
    };
    reader.readAsText(file);
  };

  const handleResetData = () => {
    if (confirm('Warning: This will reset all products, sales, purchases, and udhaar balances to initial demo seed data. Continue?')) {
      resetToDemoData();
      alert('System reset to clean starter data.');
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold tracking-tight text-slate-900">
          Shop Settings & System Backup
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Configure parlour receipts, UPI payment IDs, cashier discount caps, and automated off-server backups
        </p>
      </div>

      {savedSuccess && (
        <div className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>Shop settings updated successfully!</span>
        </div>
      )}

      {/* Settings Form */}
      <form onSubmit={handleSave} className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs space-y-5">
        <div className="border-b border-slate-200 pb-3">
          <h3 className="text-sm font-bold text-slate-900">Shop Identity & Receipt Printing</h3>
          <p className="text-xs text-slate-500">Appears at top and footer of thermal and A4 bills</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block text-slate-700 font-semibold mb-1">Shop Name *</label>
            <input
              type="text"
              required
              value={shopName}
              onChange={e => setShopName(e.target.value)}
              className="w-full p-2 border border-slate-200 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">Contact Phone *</label>
            <input
              type="text"
              required
              value={phone}
              onChange={e => setPhone(e.target.value)}
              className="w-full p-2 border border-slate-200 rounded-lg font-mono-numbers"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-slate-700 font-semibold mb-1">Shop Address / Landmark *</label>
            <input
              type="text"
              required
              value={address}
              onChange={e => setAddress(e.target.value)}
              className="w-full p-2 border border-slate-200 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">Shop UPI VPA Address *</label>
            <input
              type="text"
              required
              placeholder="e.g. gokuldairy@okaxis"
              value={upiId}
              onChange={e => setUpiId(e.target.value)}
              className="w-full p-2 border border-slate-200 rounded-lg font-mono-numbers"
            />
            <span className="text-[10px] text-slate-400 mt-0.5 block">
              Used to generate dynamic QR codes on customer receipts
            </span>
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">Invoice Prefix *</label>
            <input
              type="text"
              required
              maxLength={4}
              value={invoicePrefix}
              onChange={e => setInvoicePrefix(e.target.value.toUpperCase())}
              className="w-full p-2 border border-slate-200 rounded-lg font-mono-numbers uppercase font-bold"
            />
            <span className="text-[10px] text-slate-400 mt-0.5 block">
              Result: {invoicePrefix}-2026-000104
            </span>
          </div>

          <div className="sm:col-span-2">
            <label className="block text-slate-700 font-semibold mb-1">Receipt Footer Message</label>
            <input
              type="text"
              value={receiptFooter}
              onChange={e => setReceiptFooter(e.target.value)}
              className="w-full p-2 border border-slate-200 rounded-lg"
            />
          </div>
        </div>

        {/* Operational Business Rules */}
        <div className="border-t border-slate-200 pt-5 space-y-4 text-xs">
          <div className="border-b border-slate-100 pb-2">
            <h3 className="text-sm font-bold text-slate-900">Operational Controls & Permissions</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Cashier Max Allowed Discount (%) *
              </label>
              <input
                type="number"
                min="0"
                max="50"
                value={cashierMaxDiscount}
                onChange={e => setCashierMaxDiscount(parseFloat(e.target.value) || 0)}
                className="w-full p-2 border border-slate-200 rounded-lg font-mono-numbers"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                Discounts exceeding this percentage require Owner authorization
              </span>
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">GST Billing Mode</label>
              <div className="flex items-center gap-3 mt-2">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={gstEnabled}
                    onChange={e => setGstEnabled(e.target.checked)}
                    className="rounded text-slate-900"
                  />
                  <span>Enable GST on bills</span>
                </label>
                {gstEnabled && (
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      value={defaultGstPercent}
                      onChange={e => setDefaultGstPercent(parseFloat(e.target.value) || 0)}
                      className="w-16 p-1 border border-slate-200 rounded font-mono-numbers"
                    />
                    <span>%</span>
                  </div>
                )}
              </div>
            </div>

            <div className="sm:col-span-2 pt-2">
              <label className="flex items-center gap-2 cursor-pointer text-slate-800 font-medium">
                <input
                  type="checkbox"
                  checked={allowNegativeStock}
                  onChange={e => setAllowNegativeStock(e.target.checked)}
                  className="rounded text-slate-900"
                />
                <span>Allow negative stock sales (Rule 4: disabled by default)</span>
              </label>
              <span className="text-[10px] text-slate-500 block pl-5 mt-0.5">
                When unchecked, bills are strictly rejected if inventory on hand is insufficient.
              </span>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-3 border-t border-slate-200">
          <button
            type="submit"
            className="flex items-center gap-1.5 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-sm transition-all"
          >
            <Save className="w-4 h-4" />
            <span>Save Configuration</span>
          </button>
        </div>
      </form>

      {/* Database Backup & Disaster Recovery (Week 5) */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs space-y-4">
        <div className="border-b border-slate-200 pb-3 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Database className="w-4 h-4 text-slate-700" />
              <span>Full Database Backup & Disaster Recovery (Week 5 Plan)</span>
            </h3>
            <p className="text-xs text-slate-500">
              Download complete database snapshots (all 15 tables) and test restore procedures
            </p>
          </div>
        </div>

        {backupRestoreMsg && (
          <div
            className={`p-3 rounded-lg text-xs flex items-center gap-2 ${
              backupRestoreMsg.success
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}
          >
            {backupRestoreMsg.success ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            )}
            <span>{backupRestoreMsg.msg}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          {/* Export JSON */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 flex flex-col justify-between">
            <div>
              <h5 className="font-bold text-slate-900">1. Download Backup (JSON)</h5>
              <p className="text-slate-500 text-[11px] mt-1">
                Creates an offline copy of all products, stock movements, bills, customer ledgers, and expenses.
              </p>
            </div>
            <button
              type="button"
              onClick={handleDownloadBackup}
              className="w-full py-2 px-3 bg-white border border-slate-300 hover:bg-slate-100 font-semibold text-slate-800 rounded-lg flex items-center justify-center gap-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Full Database</span>
            </button>
          </div>

          {/* Restore JSON */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 flex flex-col justify-between">
            <div>
              <h5 className="font-bold text-slate-900">2. Restore Database</h5>
              <p className="text-slate-500 text-[11px] mt-1">
                Test disaster restore on a fresh device. Replaces current state with selected backup file.
              </p>
            </div>
            <label className="w-full py-2 px-3 bg-white border border-slate-300 hover:bg-slate-100 font-semibold text-slate-800 rounded-lg flex items-center justify-center gap-1.5 cursor-pointer transition-colors">
              <Upload className="w-3.5 h-3.5" />
              <span>Upload Backup JSON</span>
              <input type="file" accept=".json" onChange={handleRestoreFile} className="hidden" />
            </label>
          </div>

          {/* Reset Demo Data */}
          <div className="p-4 bg-red-50/50 border border-red-200 rounded-xl space-y-2 flex flex-col justify-between">
            <div>
              <h5 className="font-bold text-red-900">3. Reset Starter Data</h5>
              <p className="text-red-700 text-[11px] mt-1">
                Clears custom testing changes and restores clean sample dairy stock and customers.
              </p>
            </div>
            <button
              type="button"
              onClick={handleResetData}
              className="w-full py-2 px-3 bg-white border border-red-300 text-red-700 hover:bg-red-50 font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reset to Starter State</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
