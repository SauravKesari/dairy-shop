import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { Sale } from '../../types';
import { useDairy } from '../../context/DairyContext';
import { Printer, Share2, X, Check, Copy } from 'lucide-react';

interface ReceiptModalProps {
  sale: Sale | null;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ sale, onClose }) => {
  const { settings, customers } = useDairy();
  const [paperFormat, setPaperFormat] = useState<'80mm' | '58mm' | 'A4'>('80mm');
  const [copied, setCopied] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const customer = sale?.customer_id
    ? customers.find(c => c.id === sale.customer_id)
    : null;

  // Generate UPI QR Code URL
  useEffect(() => {
    if (sale && canvasRef.current && settings.upi_id) {
      // Standard Indian UPI Intent format
      const upiUrl = `upi://pay?pa=${encodeURIComponent(settings.upi_id)}&pn=${encodeURIComponent(
        settings.shop_name
      )}&am=${sale.total.toFixed(2)}&cu=INR&tn=${encodeURIComponent(`Bill ${sale.invoice_no}`)}`;

      QRCode.toCanvas(
        canvasRef.current,
        upiUrl,
        {
          width: paperFormat === '58mm' ? 120 : 150,
          margin: 1,
          color: {
            dark: '#000000',
            light: '#ffffff',
          },
        },
        error => {
          if (error) console.error('QR Code error:', error);
        }
      );
    }
  }, [sale, settings, paperFormat]);

  if (!sale) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleCopyText = () => {
    const text = `*${settings.shop_name}*
${settings.address}
Ph: ${settings.phone}
--------------------------------
Invoice: ${sale.invoice_no}
Date: ${sale.business_date} ${new Date(sale.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
Cashier: ${sale.created_by_name}
Customer: ${sale.customer_name || 'Retail'}
--------------------------------
${sale.items.map(it => `${it.product_name}\n  ${it.qty} ${it.unit} x ₹${it.unit_price} = ₹${it.line_total.toFixed(2)}`).join('\n')}
--------------------------------
Subtotal: ₹${sale.subtotal.toFixed(2)}
${sale.discount > 0 ? `Discount: -₹${sale.discount.toFixed(2)}\n` : ''}${settings.gst_enabled && sale.tax > 0 ? `GST: ₹${sale.tax.toFixed(2)}\n` : ''}*TOTAL AMOUNT: ₹${sale.total.toFixed(2)}*
Payment: ${sale.payment_method.toUpperCase()}
${customer ? `Current Dues: ₹${customer.current_dues.toFixed(2)}\n` : ''}
${settings.receipt_footer}`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col my-8 max-h-[90vh]">
        {/* Modal Controls Header (no-print) */}
        <div className="no-print flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div>
            <h3 className="text-base font-bold text-slate-900">Sale Receipt</h3>
            <p className="text-xs text-slate-500 font-mono-numbers">{sale.invoice_no}</p>
          </div>

          <div className="flex items-center gap-2">
            {/* Paper Format Selector */}
            <div className="flex items-center bg-white border border-slate-200 rounded-lg p-0.5 text-xs font-medium">
              <button
                type="button"
                onClick={() => setPaperFormat('80mm')}
                className={`px-2 py-1 rounded transition-colors ${
                  paperFormat === '80mm' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                80mm
              </button>
              <button
                type="button"
                onClick={() => setPaperFormat('58mm')}
                className={`px-2 py-1 rounded transition-colors ${
                  paperFormat === '58mm' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                58mm
              </button>
              <button
                type="button"
                onClick={() => setPaperFormat('A4')}
                className={`px-2 py-1 rounded transition-colors ${
                  paperFormat === 'A4' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                A4
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Receipt Container */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-100 flex justify-center">
          <div
            id="printable-receipt"
            className={`bg-white p-5 shadow-sm text-slate-900 font-sans transition-all border border-slate-200 ${
              paperFormat === '58mm'
                ? 'w-[280px] text-[11px]'
                : paperFormat === '80mm'
                ? 'w-[360px] text-xs'
                : 'w-full max-w-xl text-sm'
            }`}
          >
            {/* Shop Header */}
            <div className="text-center pb-3 border-b border-dashed border-slate-300">
              <h2 className="font-extrabold text-base tracking-tight uppercase">{settings.shop_name}</h2>
              <p className="text-slate-600 text-[11px] leading-tight mt-0.5">{settings.address}</p>
              <p className="text-slate-600 text-[11px]">Phone: {settings.phone}</p>
              {settings.gst_enabled && (
                <p className="text-slate-600 text-[11px]">GSTIN: 24AAACG8899K1Z4</p>
              )}
            </div>

            {/* Invoice Meta */}
            <div className="py-2.5 border-b border-dashed border-slate-300 text-[11px] space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Invoice:</span>
                <span className="font-bold font-mono-numbers">{sale.invoice_no}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Date & Time:</span>
                <span className="font-mono-numbers">
                  {sale.business_date}{' '}
                  {new Date(sale.created_at).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Billed by:</span>
                <span>{sale.created_by_name}</span>
              </div>
              {sale.customer_name && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Customer:</span>
                  <span className="font-medium text-slate-800">
                    {sale.customer_name} {sale.customer_mobile ? `(${sale.customer_mobile})` : ''}
                  </span>
                </div>
              )}
              {sale.is_offline_entry && (
                <div className="text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded text-[10px] inline-block font-medium">
                  Offline Bill Entry {sale.offline_bill_ref ? `(Book ref: ${sale.offline_bill_ref})` : ''}
                </div>
              )}
              {sale.status === 'cancelled' && (
                <div className="text-red-700 bg-red-50 px-2 py-1 rounded text-xs font-bold text-center border border-red-200">
                  *** CANCELLED BILL ***
                  {sale.cancel_reason && <div className="text-[10px] font-normal font-sans">Reason: {sale.cancel_reason}</div>}
                </div>
              )}
            </div>

            {/* Items Table */}
            <div className="py-2 border-b border-dashed border-slate-300">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-slate-500 text-[10px] border-b border-slate-200 pb-1">
                    <th className="py-1 font-medium">Item</th>
                    <th className="py-1 text-center font-medium">Qty</th>
                    <th className="py-1 text-right font-medium">Rate</th>
                    <th className="py-1 text-right font-medium">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sale.items.map((it, idx) => (
                    <tr key={idx} className="text-[11px]">
                      <td className="py-1.5 pr-1 font-medium text-slate-800 leading-tight">
                        {it.product_name}
                      </td>
                      <td className="py-1.5 text-center font-mono-numbers whitespace-nowrap text-slate-600">
                        {it.qty} {it.unit}
                      </td>
                      <td className="py-1.5 text-right font-mono-numbers text-slate-600">
                        ₹{it.unit_price.toFixed(2)}
                      </td>
                      <td className="py-1.5 text-right font-mono-numbers font-semibold text-slate-900">
                        ₹{it.line_total.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals Section */}
            <div className="py-2.5 border-b border-dashed border-slate-300 text-[11px] space-y-1 font-mono-numbers">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal</span>
                <span>₹{sale.subtotal.toFixed(2)}</span>
              </div>
              {sale.discount > 0 && (
                <div className="flex justify-between text-emerald-600 font-medium">
                  <span>Discount</span>
                  <span>-₹{sale.discount.toFixed(2)}</span>
                </div>
              )}
              {settings.gst_enabled && sale.tax > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>GST Total</span>
                  <span>₹{sale.tax.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between items-center text-sm font-extrabold text-slate-900 pt-1 border-t border-slate-200">
                <span>TOTAL PAYABLE</span>
                <span>₹{sale.total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-700 pt-0.5">
                <span className="font-sans text-[10px] uppercase text-slate-500">Payment Mode:</span>
                <span className="font-bold uppercase text-[11px] bg-slate-100 px-1.5 py-0.5 rounded">
                  {sale.payment_method === 'credit' ? 'Udhaar (Credit)' : sale.payment_method}
                </span>
              </div>
            </div>

            {/* Customer Udhaar balance if credit sale */}
            {customer && (
              <div className="py-2 border-b border-dashed border-slate-300 text-[11px] bg-amber-50/50 p-2 rounded my-1.5">
                <div className="flex justify-between text-amber-900">
                  <span>Total Udhaar Dues:</span>
                  <span className="font-bold font-mono-numbers">₹{customer.current_dues.toFixed(2)}</span>
                </div>
                {customer.credit_limit && (
                  <div className="flex justify-between text-[10px] text-amber-700 mt-0.5">
                    <span>Credit Limit:</span>
                    <span>₹{customer.credit_limit.toFixed(2)}</span>
                  </div>
                )}
              </div>
            )}

            {/* Shop UPI QR Code */}
            {settings.upi_id && sale.total > 0 && sale.status !== 'cancelled' && (
              <div className="py-3 text-center flex flex-col items-center justify-center border-b border-dashed border-slate-300">
                <p className="text-[10px] text-slate-500 mb-1">Scan & Pay via any UPI App</p>
                <div className="p-1.5 bg-white border border-slate-200 rounded inline-block shadow-2xs">
                  <canvas ref={canvasRef} />
                </div>
                <p className="text-[10px] font-mono-numbers text-slate-600 mt-1">UPI: {settings.upi_id}</p>
              </div>
            )}

            {/* Footer Message */}
            <div className="text-center pt-3 text-[10px] text-slate-500 leading-tight">
              <p className="font-medium text-slate-700">{settings.receipt_footer}</p>
              <p className="mt-1">Computer Generated Receipt</p>
            </div>
          </div>
        </div>

        {/* Modal Actions Footer (no-print) */}
        <div className="no-print flex items-center justify-between px-6 py-4 bg-white border-t border-slate-200">
          <button
            type="button"
            onClick={handleCopyText}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'Copied Receipt Text' : 'Copy Text (WhatsApp)'}</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors"
            >
              Done
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-sm transition-colors"
            >
              <Printer className="w-4 h-4" />
              <span>Print Receipt</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
