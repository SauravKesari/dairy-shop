import React, { useState } from 'react';
import { useDairy } from '../../context/DairyContext';
import { FileSpreadsheet, Download, Calendar, DollarSign, Package, TrendingUp, Users } from 'lucide-react';

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
  } = useDairy();

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
      { product_name: string; unit: string; qty_sold: number; revenue: number; category: string }
    >();

    sales
      .filter(s => s.status === 'completed')
      .forEach(sale => {
        sale.items.forEach(item => {
          const prod = products.find(p => p.id === item.product_id);
          const cat = categories.find(c => c.id === prod?.category_id);
          const existing = map.get(item.product_id) || {
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

  // Export handlers
  const handleExportCSV = () => {
    if (activeReport === 'daily_summary') {
      const data = getDailySummaryData();
      const csv = [
        'Date,Bills Count,Cash Sales,UPI Sales,Card Sales,Credit (Udhaar),Total Sales,Expenses,Dues Collected',
        ...data.map(
          d =>
            `"${d.date}",${d.bills_count},${d.cash},${d.upi},${d.card},${d.credit},${d.total_sales},${d.expenses},${d.dues_collected}`
        ),
      ].join('\n');
      downloadCSV('daily_summary_report', csv);
    } else if (activeReport === 'product_sales') {
      const data = getProductSalesData();
      const csv = [
        'Product Name,Category,Quantity Sold,Unit,Total Revenue',
        ...data.map(
          d => `"${d.product_name}","${d.category}",${d.qty_sold},"${d.unit}",${d.revenue}`
        ),
      ].join('\n');
      downloadCSV('product_wise_sales_report', csv);
    } else if (activeReport === 'monthly_sales') {
      const data = getMonthlySalesData();
      const csv = [
        'Month,Bills Count,Total Revenue',
        ...data.map(d => `"${d.month}",${d.count},${d.sales}`),
      ].join('\n');
      downloadCSV('monthly_sales_report', csv);
    } else if (activeReport === 'expenses') {
      const data = getExpensesData();
      const csv = [
        'Category,Entries Count,Total Amount',
        ...data.map(d => `"${d.category}",${d.count},${d.total}`),
      ].join('\n');
      downloadCSV('expense_breakdown_report', csv);
    } else if (activeReport === 'credit_dues') {
      const data = getCreditDuesData();
      const csv = [
        'Customer Name,Mobile,Credit Limit,Current Outstanding Dues',
        ...data.map(d => `"${d.name}","${d.mobile}",${d.limit},${d.dues}`),
      ].join('\n');
      downloadCSV('customer_credit_dues_report', csv);
    } else if (activeReport === 'current_stock') {
      const data = getStockValuationData();
      const csv = [
        'Product Name,SKU,Category,Current Stock,Unit,Cost Price,Selling Price,Stock Valuation',
        ...data.map(
          d =>
            `"${d.name}","${d.sku}","${d.category}",${d.stock},"${d.unit}",${d.cost},${d.selling},${d.valuation}`
        ),
      ].join('\n');
      downloadCSV('stock_valuation_report', csv);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Title & CSV Export Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">
            Parlour Reports & Analytics
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Standard shop operational reports with instant one-click CSV export
          </p>
        </div>

        <button
          type="button"
          onClick={handleExportCSV}
          className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors self-start sm:self-auto"
        >
          <Download className="w-4 h-4" />
          <span>Export Current Report to CSV</span>
        </button>
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
          Daily Summary
        </button>
        <button
          onClick={() => setActiveReport('product_sales')}
          className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors ${
            activeReport === 'product_sales'
              ? 'bg-slate-900 text-white'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          Product-wise Sales
        </button>
        <button
          onClick={() => setActiveReport('monthly_sales')}
          className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors ${
            activeReport === 'monthly_sales'
              ? 'bg-slate-900 text-white'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          Monthly Sales
        </button>
        <button
          onClick={() => setActiveReport('expenses')}
          className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors ${
            activeReport === 'expenses'
              ? 'bg-slate-900 text-white'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          Expenses by Category
        </button>
        <button
          onClick={() => setActiveReport('credit_dues')}
          className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors ${
            activeReport === 'credit_dues'
              ? 'bg-slate-900 text-white'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          Credit (Udhaar) Dues
        </button>
        <button
          onClick={() => setActiveReport('current_stock')}
          className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors ${
            activeReport === 'current_stock'
              ? 'bg-slate-900 text-white'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          Stock Valuation
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
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4 text-center">Bills</th>
                  <th className="py-3 px-4 text-right">Cash</th>
                  <th className="py-3 px-4 text-right">UPI / QR</th>
                  <th className="py-3 px-4 text-right">Card</th>
                  <th className="py-3 px-4 text-right">Udhaar Added</th>
                  <th className="py-3 px-4 text-right font-bold text-slate-900">Total Sales</th>
                  <th className="py-3 px-4 text-right text-red-600">Expenses</th>
                  <th className="py-3 px-4 text-right text-blue-600">Dues Collected</th>
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
                  <th className="py-3 px-4">Product Name</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4 text-right font-semibold">Units Sold</th>
                  <th className="py-3 px-4 text-right font-semibold">Total Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono-numbers">
                {getProductSalesData().map((p, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-sans font-semibold text-slate-900">
                      {p.product_name}
                    </td>
                    <td className="py-3 px-4 font-sans text-slate-600">{p.category}</td>
                    <td className="py-3 px-4 text-right font-bold text-slate-800">
                      {p.qty_sold} {p.unit}
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
                  <th className="py-3 px-4">Month</th>
                  <th className="py-3 px-4 text-center">Completed Invoices</th>
                  <th className="py-3 px-4 text-right font-bold text-slate-900">Total Sales Revenue</th>
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
                  <th className="py-3 px-4">Expense Category</th>
                  <th className="py-3 px-4 text-center">Number of Entries</th>
                  <th className="py-3 px-4 text-right font-semibold">Total Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono-numbers">
                {getExpensesData().map((cat, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-sans font-semibold text-slate-900">{cat.category}</td>
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
                  <th className="py-3 px-4">Customer Name</th>
                  <th className="py-3 px-4">Mobile</th>
                  <th className="py-3 px-4 text-right">Credit Limit</th>
                  <th className="py-3 px-4 text-right font-bold text-slate-900">
                    Outstanding Udhaar Due
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono-numbers">
                {getCreditDuesData().map((c, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-sans font-semibold text-slate-900">{c.name}</td>
                    <td className="py-3 px-4 text-slate-500">{c.mobile}</td>
                    <td className="py-3 px-4 text-right text-slate-500">
                      {c.limit ? `₹${c.limit}` : 'None'}
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
                  <th className="py-3 px-4">Product Name</th>
                  <th className="py-3 px-4">SKU</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4 text-right">Current Stock</th>
                  <th className="py-3 px-4 text-right">Cost Price</th>
                  <th className="py-3 px-4 text-right">Selling Price</th>
                  <th className="py-3 px-4 text-right font-bold text-slate-900">Valuation at Cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono-numbers">
                {getStockValuationData().map((p, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-sans font-semibold text-slate-900">{p.name}</td>
                    <td className="py-3 px-4 text-slate-500">{p.sku}</td>
                    <td className="py-3 px-4 font-sans text-slate-600">{p.category}</td>
                    <td className="py-3 px-4 text-right font-bold text-slate-800">
                      {p.stock} {p.unit}
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
