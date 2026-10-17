import React, { useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { QrCode, CheckCircle2 } from 'lucide-react';
import { buildUpiUrl } from '../../lib/upi';

interface UpiPaymentModalProps {
  upiId: string;
  payeeName: string;
  amount: number;
  isSaving: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

// Shown before a UPI bill is saved: the customer scans, the cashier confirms the money arrived
export const UpiPaymentModal: React.FC<UpiPaymentModalProps> = ({
  upiId,
  payeeName,
  amount,
  isSaving,
  onConfirm,
  onCancel,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    QRCode.toCanvas(
      canvasRef.current,
      buildUpiUrl(upiId, payeeName, amount, `${payeeName} bill`),
      { width: 260, margin: 1, color: { dark: '#000000', light: '#ffffff' } },
      error => {
        if (error) console.error('QR Code error:', error);
      }
    );
  }, [upiId, payeeName, amount]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-5 space-y-4 text-center">
        <div className="flex items-center justify-center gap-1.5 text-slate-900">
          <QrCode className="w-5 h-5" />
          <h3 className="font-bold text-base">Scan & Pay via UPI</h3>
        </div>

        <canvas ref={canvasRef} className="mx-auto border border-slate-200 rounded-lg" />

        <div>
          <span className="text-xs text-slate-500 block">Amount to pay</span>
          <span className="text-3xl font-extrabold font-mono-numbers text-slate-900">
            ₹{amount.toFixed(2)}
          </span>
          <p className="text-[11px] font-mono-numbers text-slate-500 mt-1">UPI: {upiId}</p>
        </div>

        <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded p-2">
          Check the payment on your UPI app or soundbox before confirming. The bill is saved only after you confirm.
        </p>

        <div className="flex flex-col gap-2">
          <button
            type="button"
            disabled={isSaving}
            onClick={onConfirm}
            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-sm flex items-center justify-center gap-1.5 disabled:opacity-60"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{isSaving ? 'Saving…' : 'Payment Received — Complete Bill'}</span>
          </button>
          <button
            type="button"
            disabled={isSaving}
            onClick={onCancel}
            className="w-full py-2 text-xs text-slate-600 hover:text-slate-900"
          >
            Cancel (keep cart)
          </button>
        </div>
      </div>
    </div>
  );
};
