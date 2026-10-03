import React, { useState } from 'react';
import { useDairy } from '../../context/DairyContext';
import { Users, Plus, Key, Power, ShieldCheck, UserCheck } from 'lucide-react';

export const UsersScreen: React.FC = () => {
  const {
    users,
    currentUser,
    setCurrentUser,
    addUser,
    updateUserPin,
    toggleUserActive,
  } = useDairy();

  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [pin, setPin] = useState('');
  const [role, setRole] = useState<'owner' | 'cashier'>('cashier');

  // Change PIN modal
  const [pinUserId, setPinUserId] = useState<string | null>(null);
  const [newPin, setNewPin] = useState('');

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !mobile.trim()) return;
    addUser(name.trim(), mobile.trim(), pin.trim() || '1234', role);
    setShowAddModal(false);
    setName('');
    setMobile('');
    setPin('');
  };

  const handleChangePin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pinUserId || !newPin.trim()) return;
    updateUserPin(pinUserId, newPin.trim());
    setPinUserId(null);
    setNewPin('');
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">
            Cashiers & User Permissions
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Manage owner and cashier counter accounts, security PINs, and active status
          </p>
        </div>

        {currentUser.role === 'owner' && (
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Add Cashier Staff</span>
          </button>
        )}
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="bg-slate-50 text-slate-500 border-b border-slate-200">
              <th className="py-3 px-4 font-semibold">Staff Name</th>
              <th className="py-3 px-4 font-semibold">Mobile Login</th>
              <th className="py-3 px-4 font-semibold">Role</th>
              <th className="py-3 px-4 font-semibold">Counter PIN</th>
              <th className="py-3 px-4 text-center font-semibold">Status</th>
              <th className="py-3 px-4 text-center font-semibold">Quick Switch (Demo)</th>
              <th className="py-3 px-4 text-center font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map(u => (
              <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                <td className="py-3 px-4 font-semibold text-slate-900">
                  {u.name}
                  {u.id === currentUser.id && (
                    <span className="ml-2 text-[10px] bg-slate-900 text-white px-1.5 py-0.5 rounded font-normal">
                      Current User
                    </span>
                  )}
                </td>
                <td className="py-3 px-4 font-mono-numbers text-slate-600">{u.mobile}</td>
                <td className="py-3 px-4">
                  <span
                    className={`font-semibold uppercase text-[11px] px-2 py-0.5 rounded ${
                      u.role === 'owner'
                        ? 'bg-purple-50 text-purple-700'
                        : 'bg-blue-50 text-blue-700'
                    }`}
                  >
                    {u.role}
                  </span>
                </td>
                <td className="py-3 px-4 font-mono-numbers text-slate-400">••••</td>
                <td className="py-3 px-4 text-center">
                  <span
                    className={`font-semibold text-[11px] px-2 py-0.5 rounded ${
                      u.active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {u.active ? 'Active' : 'Disabled'}
                  </span>
                </td>
                <td className="py-3 px-4 text-center">
                  {u.id !== currentUser.id ? (
                    <button
                      type="button"
                      onClick={() => setCurrentUser(u)}
                      className="px-2.5 py-1 text-[11px] font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded transition-colors"
                    >
                      Switch to this user
                    </button>
                  ) : (
                    <span className="text-xs text-emerald-600 font-medium">Logged in</span>
                  )}
                </td>
                <td className="py-3 px-4 text-center">
                  {currentUser.role === 'owner' && (
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setPinUserId(u.id);
                          setNewPin('');
                        }}
                        className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded"
                        title="Reset PIN"
                      >
                        <Key className="w-3.5 h-3.5" />
                      </button>

                      {u.role !== 'owner' && (
                        <button
                          type="button"
                          onClick={() => toggleUserActive(u.id)}
                          className="p-1 text-slate-500 hover:text-red-600 hover:bg-slate-100 rounded"
                          title="Toggle Active Status"
                        >
                          <Power className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-5 space-y-3">
            <h3 className="font-bold text-slate-900 text-base">Add Counter Staff</h3>
            <form onSubmit={handleCreateUser} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Staff Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Suresh Yadav"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Mobile Login *</label>
                <input
                  type="tel"
                  required
                  placeholder="98XXXXXXXX"
                  value={mobile}
                  onChange={e => setMobile(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg font-mono-numbers"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Counter PIN (4 digits) *</label>
                <input
                  type="password"
                  required
                  maxLength={6}
                  placeholder="1234"
                  value={pin}
                  onChange={e => setPin(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg font-mono-numbers text-center font-bold"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Role Permission *</label>
                <select
                  value={role}
                  onChange={e => setRole(e.target.value as any)}
                  className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50"
                >
                  <option value="cashier">Cashier (Billing, View Stock, View Bills)</option>
                  <option value="owner">Owner (Everything & Admin)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-slate-900 text-white font-bold rounded-lg hover:bg-slate-800"
                >
                  Save User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset PIN Modal */}
      {pinUserId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-xs w-full p-5 space-y-3">
            <h4 className="font-bold text-slate-900 text-sm">Change Counter PIN</h4>
            <form onSubmit={handleChangePin} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">New 4-digit PIN *</label>
                <input
                  type="password"
                  required
                  maxLength={6}
                  value={newPin}
                  onChange={e => setNewPin(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg font-mono-numbers text-center font-bold text-sm"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPinUserId(null)}
                  className="px-3 py-1 text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1 bg-slate-900 text-white font-bold rounded-lg hover:bg-slate-800"
                >
                  Update PIN
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
