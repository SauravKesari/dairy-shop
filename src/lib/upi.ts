// Standard Indian UPI intent link; any UPI app opens it with payee and amount filled in
export const buildUpiUrl = (upiId: string, payeeName: string, amount: number, note: string) =>
  `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(payeeName)}` +
  `&am=${amount.toFixed(2)}&cu=INR&tn=${encodeURIComponent(note)}`;
