import { CashierPermission, User } from '../types';

// Same rule as firestore.rules can(): owner always, cashier unless explicitly turned off
export const can = (user: Pick<User, 'role' | 'permissions'>, permission: CashierPermission) =>
  user.role === 'owner' || user.permissions?.[permission] !== false;

export const PERMISSION_LABELS: { key: CashierPermission; label: string; hint: string }[] = [
  { key: 'give_credit', label: 'Give Udhaar bills', hint: 'Choose Udhaar as payment mode at POS' },
  { key: 'add_udhaar', label: 'Add Udhaar manually', hint: '"Add Udhaar" button on the Udhaar screen' },
  { key: 'receive_payments', label: 'Receive Udhaar payments', hint: 'Record money collected against dues' },
  { key: 'add_customers', label: 'Add customers', hint: 'Create new Udhaar customers' },
  { key: 'cancel_bills', label: 'Cancel bills', hint: "Cancel today's bills (open day only)" },
  { key: 'manage_expenses', label: 'Add / edit expenses', hint: "Today's expenses only" },
  { key: 'record_purchases', label: 'Record purchases', hint: 'Stock inward from suppliers' },
  { key: 'view_reports', label: 'View reports', hint: 'Reports screen and CSV / PDF export' },
  { key: 'daily_closing', label: 'Close the day', hint: 'Daily cash closing' },
];

export const permissionDenied = (permission: CashierPermission) => {
  const label = PERMISSION_LABELS.find(p => p.key === permission)?.label ?? permission;
  return `Permission denied: "${label}" is turned off for your account. Ask the Owner.`;
};
