import React, { useState } from 'react';
import { useDairy } from '../../context/DairyContext';
import { FileSpreadsheet, FileText, Download, Calendar, DollarSign, Package, TrendingUp, Users } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { useProductName } from '../../i18n/useProductName';

type ReportType =
  | 'daily_summary'
  | 'monthly_sales'
  | 'product_sales'
  | 'expenses'
  | 'credit_dues'
  | 'current_stock';

export const ReportsScreen: React.FC = () => {
  const {
    sales,
    products,
    categories,
    expenses,
    customers,
    dailyClosings,
    customerLedger,
    currentBusinessDate,
    settings,
  } = useDairy();
  const { t, tx } = useLanguage();
  const { productLabel, nameOf, unitOf } = useProductName();

  const [activeReport, setActiveReport] = useState<ReportType>('daily_summary');

  // CSV Generator helper
  const downloadCSV = (filename: string, content: string) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${filename}_${currentBusinessDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // 1. Daily Summary Report
  const getDailySummaryData = () => {
    const dates = Array.from(new Set(sales.map(s => s.business_date))).sort().reverse();
    return dates.map(date => {
      const daySales = sales.filter(s => s.business_date === date && s.status === 'completed');
      const cash = daySales.filter(s => s.payment_method === 'cash').reduce((sum, s) => sum + s.total, 0);
      const upi = daySales.filter(s => s.payment_method === 'upi').reduce((sum, s) => sum + s.total, 0);
      const card = daySales.filter(s => s.payment_method === 'card').reduce((sum, s) => sum + s.total, 0);
      const credit = daySales.filter(s => s.payment_method === 'credit').reduce((sum, s) => sum + s.total, 0);
      const total = cash + upi + card + credit;

      const dayExpenses = expenses.filter(e => e.expense_date === date).reduce((sum, e) => sum + e.amount, 0);
      const duesCollected = customerLedger
        .filter(cl => cl.type === 'payment' && cl.created_at.startsWith(date))
        .reduce((sum, cl) => sum + Math.abs(cl.amount), 0);

      return {
        date,
        bills_count: daySales.length,
        cash,
        upi,
        card,
        credit,
        total_sales: total,
        expenses: dayExpenses,
        dues_collected: duesCollected,
      };
    });
  };

  // 2. Product-wise Sales Report
  const getProductSalesData = () => {
    const map = new Map<
      string,
      { product_id: string; product_name: string; unit: string; qty_sold: number; revenue: number; category: string }
    >();

    sales
      .filter(s => s.status === 'completed')
      .forEach(sale => {
        sale.items.forEach(item => {
          const prod = products.find(p => p.id === item.product_id);
          const cat = categories.find(c => c.id === prod?.category_id);
          const existing = map.get(item.product_id) || {
            product_id: item.product_id,
            product_name: item.product_name,
            unit: item.unit,
            qty_sold: 0,
            revenue: 0,
            category: cat ? cat.name : 'General',
          };
          existing.qty_sold = Number((existing.qty_sold + item.qty).toFixed(3));
          existing.revenue = Number((existing.revenue + item.line_total).toFixed(2));
          map.set(item.product_id, existing);
        });
      });

    return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue);
  };

  // 3. Monthly Sales Report
  const getMonthlySalesData = () => {
    const map = new Map<string, { month: string; sales: number; count: number }>();
    sales
      .filter(s => s.status === 'completed')
      .forEach(s => {
        const monthKey = s.business_date.slice(0, 7); // YYYY-MM
        const existing = map.get(monthKey) || { month: monthKey, sales: 0, count: 0 };
        existing.sales += s.total;
        existing.count += 1;
        map.set(monthKey, existing);
      });
    return Array.from(map.values()).sort((a, b) => b.month.localeCompare(a.month));
  };

  // 4. Expenses Breakdown Report
  const getExpensesData = () => {
    const map = new Map<string, { category: string; count: number; total: number }>();
    expenses.forEach(e => {
      const existing = map.get(e.category) || { category: e.category, count: 0, total: 0 };
      existing.count += 1;
      existing.total += e.amount;
      map.set(e.category, existing);
    });
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  };

  // 5. Credit Dues Report
  const getCreditDuesData = () => {
    return customers
      .map(c => ({
        name: c.name,
        mobile: c.mobile,
        limit: c.credit_limit || 0,
        dues: c.current_dues,
      }))
      .sort((a, b) => b.dues - a.dues);
  };

  // 6. Current Stock Valuation Report
  const getStockValuationData = () => {
    return products.map(p => {
      const cat = categories.find(c => c.id === p.category_id);
      return {
        name: p.name,
        name_hi: p.name_hi,
        sku: p.sku,
        category: cat ? cat.name : '',
        stock: p.current_stock,
        unit: p.unit,
        cost: p.purchase_price,
        selling: p.selling_price,
        valuation: Number((p.current_stock * p.purchase_price).toFixed(2)),
      };
    });
  };

  // One table per report, shared by the CSV and PDF exports
  type ExportTable = { filename: string; title: string; headers: string[]; rows: (string | number)[][] };

  const getExportTable = (): ExportTable => {
    if (activeReport === 'daily_summary') {
      return {
        filename: 'daily_summary_report',
        title: 'Daily Summary',
        headers: ['Date', 'Bills Count', 'Cash Sales', 'UPI Sales', 'Card Sales', 'Credit (Udhaar)', 'Total Sales', 'Expenses', 'Dues Collected'],
        rows: getDailySummaryData().map(d => [d.date, d.bills_count, d.cash, d.upi, d.card, d.credit, d.total_sales, d.expenses, d.dues_collected]),
      };
    }
    if (activeReport === 'product_sales') {
      return {
        filename: 'product_wise_sales_report',
        title: 'Product-wise Sales',
        headers: ['Product Name', 'Category', 'Quantity Sold', 'Unit', 'Total Revenue'],
        rows: getProductSalesData().map(d => [d.product_name, d.category, d.qty_sold, d.unit, d.revenue]),
      };
    }
    if (activeReport === 'monthly_sales') {
      return {
        filename: 'monthly_sales_report',
        title: 'Monthly Sales',
        headers: ['Month', 'Bills Count', 'Total Revenue'],
        rows: getMonthlySalesData().map(d => [d.month, d.count, d.sales]),
      };
    }
    if (activeReport === 'expenses') {
      return {
        filename: 'expense_breakdown_report',
        title: 'Expenses by Category',
        headers: ['Category', 'Entries Count', 'Total Amount'],
        rows: getExpensesData().map(d => [d.category, d.count, d.total]),
      };
    }
    if (activeReport === 'credit_dues') {
      return {
        filename: 'customer_credit_dues_report',
        title: 'Credit (Udhaar) Dues',
        headers: ['Customer Name', 'Mobile', 'Credit Limit', 'Current Outstanding Dues'],
        rows: getCreditDuesData().map(d => [d.name, d.mobile, d.limit, d.dues]),
      };
    }
    return {
      filename: 'stock_valuation_report',
      title: 'Stock Valuation',
      headers: ['Product Name', 'SKU', 'Category', 'Current Stock', 'Unit', 'Cost Price', 'Selling Price', 'Stock Valuation'],
      rows: getStockValuationData().map(d => [d.name, d.sku, d.category, d.stock, d.unit, d.cost, d.selling, d.valuation]),
    };
  };

  const csvCell = (v: string | number) => (typeof v === 'number' ? String(v) : `"${v.replace(/"/g, '""')}"`);

  // Export handlers
  const handleExportCSV = () => {
    const table = getExportTable();
    const csv = [table.headers.map(csvCell), ...table.rows.map(r => r.map(csvCell))].map(r => r.join(',')).join('\n');
    downloadCSV(table.filename, csv);
  };

  const [isExportingPDF, setIsExportingPDF] = useState(false);

  const handleExportPDF = async () => {
    if (isExportingPDF) return;
    setIsExportingPDF(true);
    try {
      // Loaded on demand so the PDF library stays out of the main bundle
      const [{ jsPDF }, { autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
      const table = getExportTable();
      const pdf = new jsPDF({ orientation: table.headers.length > 5 ? 'landscape' : 'portrait', unit: 'pt', format: 'a4' });

      pdf.setFontSize(14);
      pdf.text(settings.shop_name || 'Dairy Shop', 40, 40);
      pdf.setFontSize(10);
      pdf.text(`${table.title} report · generated ${currentBusinessDate}`, 40, 58);

      // jsPDF's built-in fonts have no ₹ glyph, so amounts print as plain numbers
      const fmt = (v: string | number) =>
        typeof v === 'number' ? v.toLocaleString('en-IN', { maximumFractionDigits: 3 }) : v;
      const numericCols = table.headers.map((_, i) => table.rows.length > 0 && table.rows.every(r => typeof r[i] === 'number'));

      autoTable(pdf, {
        startY: 72,
        head: [table.headers],
        body: table.rows.map(r => r.map(fmt)),
        styles: { fontSize: 8 },
        headStyles: { fillColor: [15, 23, 42] },
        columnStyles: Object.fromEntries(
          numericCols.flatMap((isNum, i) => (isNum ? [[i, { halign: 'right' as const }]] : []))
        ),
        didDrawPage: () => {
          const pageSize = pdf.internal.pageSize;
          pdf.setFontSize(8);
          pdf.text(
            `Page ${pdf.getNumberOfPages()} · Amounts in Rs.`,
            pageSize.getWidth() - 40,
            pageSize.getHeight() - 20,
            { align: 'right' }
          );
        },
      });

      pdf.save(`${table.filename}_${currentBusinessDate}.pdf`);
    } catch (err) {
      console.error('PDF export failed:', err);
      alert(t('reports.pdfFailed'));
    } finally {
      setIsExportingPDF(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Title & CSV Export Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">
            {t('reports.title')}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            {t('reports.subtitle')}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>{t('reports.exportCsv')}</span>
          </button>
          <button
            type="button"
            onClick={handleExportPDF}
            disabled={isExportingPDF}
            className="flex items-center gap-1.5 px-4 py-2 bg-red-700 hover:bg-red-800 text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors disabled:opacity-60"
          >
            <FileText className="w-4 h-4" />
            <span>{isExportingPDF ? t('reports.preparingPdf') : t('reports.downloadPdf')}</span>
          </button>
        </div>
      </div>

      {/* Report Selector Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        <button
          onClick={() => setActiveReport('daily_summary')}
          className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors ${
            activeReport === 'daily_summary'
              ? 'bg-slate-900 text-white'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          {t('reports.tab.daily_summary')}
        </button>
        <button
          onClick={() => setActiveReport('product_sales')}
          className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors ${
            activeReport === 'product_sales'
              ? 'bg-slate-900 text-white'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          {t('reports.tab.product_sales')}
        </button>
        <button
          onClick={() => setActiveReport('monthly_sales')}
          className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors ${
            activeReport === 'monthly_sales'
              ? 'bg-slate-900 text-white'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          {t('reports.tab.monthly_sales')}
        </button>
        <button
          onClick={() => setActiveReport('expenses')}
          className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors ${
            activeReport === 'expenses'
              ? 'bg-slate-900 text-white'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          {t('reports.tab.expenses')}
        </button>
        <button
          onClick={() => setActiveReport('credit_dues')}
          className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors ${
            activeReport === 'credit_dues'
              ? 'bg-slate-900 text-white'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          {t('reports.tab.credit_dues')}
        </button>
        <button
          onClick={() => setActiveReport('current_stock')}
          className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors ${
            activeReport === 'current_stock'
              ? 'bg-slate-900 text-white'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          {t('reports.tab.current_stock')}
        </button>
      </div>

      {/* REPORT CONTENT TABLES */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        {/* 1. Daily Summary */}
        {activeReport === 'daily_summary' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono-numbers">
              <thead>
                <tr className="bg-slate-50 text-slate-500 border-b border-slate-200 font-sans">
                  <th className="py-3 px-4">{t('common.date')}</th>
                  <th className="py-3 px-4 text-center">{t('reports.bills')}</th>
                  <th className="py-3 px-4 text-right">{t('reports.cash')}</th>
                  <th className="py-3 px-4 text-right">{t('reports.upiQr')}</th>
                  <th className="py-3 px-4 text-right">{t('reports.card')}</th>
                  <th className="py-3 px-4 text-right">{t('reports.udhaarAdded')}</th>
                  <th className="py-3 px-4 text-right font-bold text-slate-900">{t('reports.totalSales')}</th>
                  <th className="py-3 px-4 text-right text-red-600">{t('reports.expenses')}</th>
                  <th className="py-3 px-4 text-right text-blue-600">{t('reports.duesCollected')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {getDailySummaryData().map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-semibold text-slate-900 font-sans">{row.date}</td>
                    <td className="py-3 px-4 text-center text-slate-500">{row.bills_count}</td>
                    <td className="py-3 px-4 text-right text-emerald-600">₹{row.cash.toFixed(2)}</td>
                    <td className="py-3 px-4 text-right text-blue-600">₹{row.upi.toFixed(2)}</td>
                    <td className="py-3 px-4 text-right text-purple-600">₹{row.card.toFixed(2)}</td>
                    <td className="py-3 px-4 text-right text-amber-700">₹{row.credit.toFixed(2)}</td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900">
                      ₹{row.total_sales.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right text-red-600">₹{row.expenses.toFixed(2)}</td>
                    <td className="py-3 px-4 text-right text-blue-600 font-semibold">
                      ₹{row.dues_collected.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 2. Product-wise Sales */}
        {activeReport === 'product_sales' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-500 border-b border-slate-200">
                  <th className="py-3 px-4">{t('reports.productName')}</th>
                  <th className="py-3 px-4">{t('common.category')}</th>
                  <th className="py-3 px-4 text-right font-semibold">{t('reports.unitsSold')}</th>
                  <th className="py-3 px-4 text-right font-semibold">{t('reports.totalRevenue')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono-numbers">
                {getProductSalesData().map((p, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-sans font-semibold text-slate-900">
                      {nameOf(p.product_id, p.product_name)}
                    </td>
                    <td className="py-3 px-4 font-sans text-slate-600">{p.category}</td>
                    <td className="py-3 px-4 text-right font-bold text-slate-800">
                      {p.qty_sold} {unitOf(p.unit)}
                    </td>
                    <td className="py-3 px-4 text-right font-extrabold text-slate-900">
                      ₹{p.revenue.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 3. Monthly Sales */}
        {activeReport === 'monthly_sales' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono-numbers">
              <thead>
                <tr className="bg-slate-50 text-slate-500 border-b border-slate-200 font-sans">
                  <th className="py-3 px-4">{t('reports.month')}</th>
                  <th className="py-3 px-4 text-center">{t('reports.completedInvoices')}</th>
                  <th className="py-3 px-4 text-right font-bold text-slate-900">{t('reports.totalSalesRevenue')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {getMonthlySalesData().map((m, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-bold text-slate-900">{m.month}</td>
                    <td className="py-3 px-4 text-center text-slate-500">{m.count}</td>
                    <td className="py-3 px-4 text-right font-extrabold text-slate-900">
                      ₹{m.sales.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 4. Expenses Breakdown */}
        {activeReport === 'expenses' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-500 border-b border-slate-200">
                  <th className="py-3 px-4">{t('reports.expenseCategory')}</th>
                  <th className="py-3 px-4 text-center">{t('reports.entries')}</th>
                  <th className="py-3 px-4 text-right font-semibold">{t('reports.totalAmount')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono-numbers">
                {getExpensesData().map((cat, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-sans font-semibold text-slate-900">{tx(`expense.category.${cat.category}`, cat.category)}</td>
                    <td className="py-3 px-4 text-center text-slate-500">{cat.count}</td>
                    <td className="py-3 px-4 text-right font-bold text-red-600">
                      ₹{cat.total.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 5. Credit Dues */}
        {activeReport === 'credit_dues' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-500 border-b border-slate-200">
                  <th className="py-3 px-4">{t('reports.customerName')}</th>
                  <th className="py-3 px-4">{t('reports.mobile')}</th>
                  <th className="py-3 px-4 text-right">{t('reports.creditLimit')}</th>
                  <th className="py-3 px-4 text-right font-bold text-slate-900">
                    {t('reports.outstanding')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono-numbers">
                {getCreditDuesData().map((c, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-sans font-semibold text-slate-900">{c.name}</td>
                    <td className="py-3 px-4 text-slate-500">{c.mobile}</td>
                    <td className="py-3 px-4 text-right text-slate-500">
                      {c.limit ? `₹${c.limit}` : t('reports.noLimit')}
                    </td>
                    <td className="py-3 px-4 text-right font-extrabold text-amber-900">
                      ₹{c.dues.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 6. Current Stock Valuation */}
        {activeReport === 'current_stock' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-500 border-b border-slate-200">
                  <th className="py-3 px-4">{t('reports.productName')}</th>
                  <th className="py-3 px-4">{t('reports.sku')}</th>
                  <th className="py-3 px-4">{t('common.category')}</th>
                  <th className="py-3 px-4 text-right">{t('reports.currentStock')}</th>
                  <th className="py-3 px-4 text-right">{t('reports.costPrice')}</th>
                  <th className="py-3 px-4 text-right">{t('reports.sellingPrice')}</th>
                  <th className="py-3 px-4 text-right font-bold text-slate-900">{t('reports.valuation')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono-numbers">
                {getStockValuationData().map((p, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-sans font-semibold text-slate-900">{productLabel(p)}</td>
                    <td className="py-3 px-4 text-slate-500">{p.sku}</td>
                    <td className="py-3 px-4 font-sans text-slate-600">{p.category}</td>
                    <td className="py-3 px-4 text-right font-bold text-slate-800">
                      {p.stock} {unitOf(p.unit)}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-600">₹{p.cost.toFixed(2)}</td>
                    <td className="py-3 px-4 text-right text-slate-600">₹{p.selling.toFixed(2)}</td>
                    <td className="py-3 px-4 text-right font-extrabold text-slate-900">
                      ₹{p.valuation.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
