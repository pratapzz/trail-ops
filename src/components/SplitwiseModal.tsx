import React, { useState, useEffect } from 'react';
import {
  Receipt,
  Users,
  CheckCircle2,
  Plus,
  X,
  CreditCard,
  PieChart,
  Trash2,
  Coins,
  ShieldCheck,
  Tag,
  Calendar,
} from 'lucide-react';
import { ExpenseSplit, UserRole, SubGroup } from '../types';
import {
  fetchSquadExpenses,
  createSquadExpense,
  deleteSquadExpense,
} from '../lib/supabase';

interface SplitwiseModalProps {
  isOpen: boolean;
  onClose: () => void;
  userRole: UserRole;
  tripBudget: number;
  amountPaid: number;
  amountPending: number;
  subGroups?: SubGroup[];
  memberCount?: number;
  activeSquadId?: string;
  currentUserId?: string;
  currentUserName?: string;
  onShowToast: (message: string) => void;
  onSettlePayment: (amount: number) => void;
  onBillAdded?: (amountPerMember: number, totalAmount: number) => void;
}

const CATEGORIES = [
  { name: 'Transport', icon: '🚙' },
  { name: 'Food & Meals', icon: '🍲' },
  { name: 'Permits', icon: '📜' },
  { name: 'Stay & Camp', icon: '⛺' },
  { name: 'Gear & Porters', icon: '🎒' },
  { name: 'Medical', icon: '🩹' },
];

export const SplitwiseModal: React.FC<SplitwiseModalProps> = ({
  isOpen,
  onClose,
  userRole,
  tripBudget,
  amountPaid,
  amountPending,
  subGroups = [],
  memberCount = 1,
  activeSquadId = 'default',
  currentUserId = 'user_self',
  currentUserName = 'Pratap Paul',
  onShowToast,
  onSettlePayment,
  onBillAdded,
}) => {
  const [isAddingBill, setIsAddingBill] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New bill state
  const [billTitle, setBillTitle] = useState('');
  const [billAmount, setBillAmount] = useState<string>('');
  const [billCategory, setBillCategory] = useState('Transport');
  const [splitTarget, setSplitTarget] = useState<'all' | 'subgroup'>('all');
  const [selectedSubGroupId, setSelectedSubGroupId] = useState<string>('');

  const isSuperAdmin = userRole === 'super_admin';
  const isSubGroupAdmin = userRole === 'subgroup_admin';
  const hasSplitAuthority = isSuperAdmin || isSubGroupAdmin;

  const activeMembersTotal = Math.max(1, memberCount);

  // Expenses ledger state
  const [expenses, setExpenses] = useState<ExpenseSplit[]>(() => {
    const saved = localStorage.getItem(`trailoPS_expenses_${activeSquadId}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch {}
    }
    return [];
  });

  // Sync expenses with server and localStorage
  const loadServerExpenses = async () => {
    if (!activeSquadId) return;
    const items = await fetchSquadExpenses(activeSquadId);
    if (Array.isArray(items) && items.length > 0) {
      const mapped: ExpenseSplit[] = items.map((item: any) => ({
        id: item.id,
        title: item.title,
        totalAmount: Number(item.total_amount || item.totalAmount || 0),
        paidBy: item.paid_by || item.paidBy || 'Squad Lead',
        date: item.date || 'Today',
        category: item.category || 'General',
        splitType: item.split_type === 'subgroup' ? 'custom' : 'all',
        memberIds: ['all'],
        amountPerMember: Number(item.amount_per_member || item.amountPerMember || 0),
        settledMemberIds: [],
      }));
      setExpenses(mapped);
      localStorage.setItem(`trailoPS_expenses_${activeSquadId}`, JSON.stringify(mapped));
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadServerExpenses();
    }
  }, [isOpen, activeSquadId]);

  useEffect(() => {
    localStorage.setItem(`trailoPS_expenses_${activeSquadId}`, JSON.stringify(expenses));
  }, [expenses, activeSquadId]);

  // Listen for broadcast sync
  useEffect(() => {
    const handleExpenseSync = (e: any) => {
      const { expense } = e.detail || {};
      if (expense && expense.id) {
        setExpenses((prev) => {
          if (prev.some((ex) => ex.id === expense.id)) return prev;
          return [expense, ...prev];
        });
      }
    };
    window.addEventListener('trailoPS_expense_added', handleExpenseSync);
    return () => window.removeEventListener('trailoPS_expense_added', handleExpenseSync);
  }, []);

  if (!isOpen) return null;

  const totalGroupExpenses = expenses.reduce((acc, curr) => acc + curr.totalAmount, 0);
  const paidPercent = tripBudget > 0 ? Math.min(Math.round((amountPaid / tripBudget) * 100), 100) : 0;

  // Split calculation
  const numericAmount = Math.max(0, parseFloat(billAmount) || 0);
  const count =
    splitTarget === 'all'
      ? activeMembersTotal
      : subGroups.find((s) => s.id === selectedSubGroupId)?.memberCount ||
        Math.max(1, Math.round(activeMembersTotal / 2));
  const calculatedPerMember = count > 0 && numericAmount > 0 ? Math.round(numericAmount / count) : 0;

  const handleCreateSplit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!billTitle.trim() || numericAmount <= 0) {
      onShowToast('Please enter a valid bill title and amount.');
      return;
    }

    setIsSubmitting(true);
    const expId = `exp_${Date.now()}`;
    const paidByLabel = isSuperAdmin
      ? `${currentUserName} (Super Admin)`
      : `${currentUserName} (Admin)`;
    const dateStr = new Date().toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

    // Persist to backend server API first so exact member count & share are authoritative
    const serverRes = await createSquadExpense(activeSquadId, {
      id: expId,
      title: billTitle.trim(),
      totalAmount: numericAmount,
      paidBy: paidByLabel,
      paidByUserId: currentUserId,
      category: billCategory,
      splitType: splitTarget,
      subGroupId: selectedSubGroupId || undefined,
      date: dateStr,
    });

    const finalCount = serverRes.memberCount && serverRes.memberCount > 0 ? serverRes.memberCount : count;
    const amountPerMember =
      serverRes.amountPerMember && serverRes.amountPerMember > 0
        ? Math.round(serverRes.amountPerMember)
        : Math.round(numericAmount / finalCount);

    const newExp: ExpenseSplit = {
      id: serverRes.expense?.id || expId,
      title: billTitle.trim(),
      totalAmount: numericAmount,
      paidBy: paidByLabel,
      date: dateStr,
      category: billCategory,
      splitType: splitTarget === 'all' ? 'all' : 'custom',
      memberIds: ['all'],
      amountPerMember,
      settledMemberIds: [],
    };

    // Update local state immediately
    const updated = [newExp, ...expenses.filter((ex) => ex.id !== newExp.id)];
    setExpenses(updated);
    localStorage.setItem(`trailoPS_expenses_${activeSquadId}`, JSON.stringify(updated));

    // Dispatch single deduplicated global event (App.tsx listens and adds amountPerMember once)
    window.dispatchEvent(
      new CustomEvent('trailoPS_expense_added', {
        detail: {
          id: newExp.id,
          expense: newExp,
          amountPerMember,
          totalAmount: numericAmount,
        },
      })
    );

    // Broadcast over BroadcastChannel for multi-tab / multi-phone sync
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        const bc = new BroadcastChannel(`trailops_squad_bus_${activeSquadId}`);
        bc.postMessage({
          type: 'SQUAD_EXPENSE_ADDED',
          groupId: activeSquadId,
          expense: newExp,
          amountPerMember,
        });
        bc.close();
      } catch {}
    }

    setIsSubmitting(false);
    setIsAddingBill(false);
    setBillTitle('');
    setBillAmount('');

    onShowToast(
      `✓ Bill "₹${numericAmount.toLocaleString()}" added! ₹${amountPerMember.toLocaleString()} added to all ${finalCount} members' individual budgets.`
    );
  };

  const handleDeleteExpense = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpenses((prev) => prev.filter((item) => item.id !== id));
    deleteSquadExpense(activeSquadId, id);
    onShowToast('Expense entry removed.');
  };

  const handleSettleUp = () => {
    if (amountPending <= 0) return;
    onSettlePayment(amountPending);
    onShowToast(`✓ ₹${amountPending.toLocaleString()} dues marked as settled!`);
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Clean Modern Header */}
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <PieChart className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-extrabold text-base tracking-tight text-white">
                  Splitwise Ledger
                </h3>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-emerald-400 text-slate-950">
                  Shared
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Automatic equal split added to all members' dues
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Scroll Content */}
        <div className="p-4 space-y-4 overflow-y-auto no-scrollbar flex-1 bg-slate-50/50">
          {/* USER EXPEDITION BUDGET DUES CARD */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                  Your Expedition Dues
                </span>
                <span className="text-2xl font-black text-slate-900">
                  ₹{tripBudget.toLocaleString()}
                </span>
              </div>

              <div className="text-right">
                <span className="text-[10px] font-bold text-amber-600 uppercase block">
                  Pending Balance
                </span>
                <span className="text-lg font-black text-amber-600 font-mono">
                  ₹{amountPending.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Progress bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] font-bold text-slate-600">
                <span className="text-emerald-700">₹{amountPaid.toLocaleString()} Cleared</span>
                <span>{paidPercent}% Settled</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden flex border border-slate-200">
                <div
                  className="bg-emerald-600 h-full transition-all duration-500"
                  style={{ width: `${paidPercent}%` }}
                />
                <div
                  className="bg-amber-400 h-full transition-all duration-500"
                  style={{ width: `${100 - paidPercent}%` }}
                />
              </div>
            </div>

            {/* Settle Up Action */}
            {amountPending > 0 ? (
              <button
                type="button"
                onClick={handleSettleUp}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#0f5238] via-emerald-700 to-teal-700 hover:brightness-105 text-white text-xs font-bold shadow-xs flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer"
              >
                <CreditCard className="w-4 h-4" />
                <span>Settle Pending ₹{amountPending.toLocaleString()}</span>
              </button>
            ) : (
              <div className="py-2 px-3 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold flex items-center justify-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>All Personal Dues Cleared</span>
              </div>
            )}
          </div>

          {/* SQUAD BILLS LEDGER HEADER & ADD BILL BUTTON */}
          <div className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                Total Squad Expenses
              </span>
              <span className="text-lg font-black text-slate-900">
                ₹{totalGroupExpenses.toLocaleString()}
              </span>
              <span className="text-[10px] text-slate-500 block">
                {expenses.length} bill{expenses.length === 1 ? '' : 's'} across {activeMembersTotal} member{activeMembersTotal === 1 ? '' : 's'}
              </span>
            </div>

            {hasSplitAuthority ? (
              <button
                type="button"
                onClick={() => setIsAddingBill(!isAddingBill)}
                className="px-3.5 py-2 rounded-xl bg-[#0f5238] hover:bg-[#166534] text-white text-xs font-bold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>{isAddingBill ? 'Close Form' : 'Add Bill'}</span>
              </button>
            ) : (
              <span className="text-[11px] font-bold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-lg">
                View Only
              </span>
            )}
          </div>

          {/* INLINE CLUTTER-FREE ADD BILL FORM (FOR SUPER ADMIN / ADMIN) */}
          {isAddingBill && hasSplitAuthority && (
            <form
              onSubmit={handleCreateSplit}
              className="bg-white rounded-2xl p-4 border-2 border-emerald-500/40 shadow-md space-y-3 animate-in fade-in slide-in-from-top-2 duration-200"
            >
              <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                <div className="flex items-center gap-1.5">
                  <Coins className="w-4 h-4 text-emerald-700" />
                  <h4 className="text-xs font-extrabold text-slate-900">
                    Add New Squad Expense
                  </h4>
                </div>
                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  Auto-splits to all budgets
                </span>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Bill Title
                </label>
                <input
                  type="text"
                  value={billTitle}
                  onChange={(e) => setBillTitle(e.target.value)}
                  placeholder="e.g. Jeep Ride to Basecamp"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-900 focus:bg-white focus:border-emerald-600 outline-none"
                  required
                />
                {/* Quick suggestions */}
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {['Jeep / Cab', 'Camp Dinner', 'Forest Permits', 'Campfire Wood', 'Porters'].map(
                    (sug) => (
                      <button
                        key={sug}
                        type="button"
                        onClick={() => setBillTitle(sug)}
                        className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-slate-100 hover:bg-emerald-50 hover:text-emerald-800 text-slate-600 transition-colors"
                      >
                        + {sug}
                      </button>
                    )
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Total Amount (₹)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={billAmount}
                    onChange={(e) => setBillAmount(e.target.value)}
                    placeholder="0"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900 focus:bg-white focus:border-emerald-600 outline-none font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Category
                  </label>
                  <select
                    value={billCategory}
                    onChange={(e) => setBillCategory(e.target.value)}
                    className="w-full px-2.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-900 focus:bg-white focus:border-emerald-600 outline-none"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.name} value={c.name}>
                        {c.icon} {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Split Target Selection */}
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Split Among
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSplitTarget('all')}
                    className={`py-1.5 px-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      splitTarget === 'all'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    All Members ({activeMembersTotal})
                  </button>
                  <button
                    type="button"
                    onClick={() => setSplitTarget('subgroup')}
                    className={`py-1.5 px-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      splitTarget === 'subgroup'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Sub-Group
                  </button>
                </div>
              </div>

              {splitTarget === 'subgroup' && subGroups.length > 0 && (
                <div className="bg-slate-50 p-2 rounded-xl border border-slate-200">
                  <select
                    value={selectedSubGroupId}
                    onChange={(e) => setSelectedSubGroupId(e.target.value)}
                    className="w-full p-1.5 text-xs rounded-lg border border-slate-300 bg-white"
                  >
                    <option value="">Choose Sub-Group</option>
                    {subGroups.map((sg) => (
                      <option key={sg.id} value={sg.id}>
                        {sg.name} ({sg.memberCount} members)
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Calculation Summary Pill */}
              <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs space-y-0.5">
                <div className="flex items-center justify-between">
                  <span className="text-emerald-900 font-semibold">Each Member's Share:</span>
                  <span className="font-mono font-black text-emerald-950 text-sm">
                    ₹{calculatedPerMember.toLocaleString()} / person
                  </span>
                </div>
                <p className="text-[10px] text-emerald-800">
                  Automatically added to everyone's expedition budget dues upon confirming.
                </p>
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsAddingBill(false)}
                  className="flex-1 py-2 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || numericAmount <= 0}
                  className="flex-1 py-2 rounded-xl bg-[#0f5238] hover:bg-[#166534] disabled:opacity-50 text-white text-xs font-bold shadow-xs active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-1"
                >
                  <Coins className="w-3.5 h-3.5" />
                  <span>Confirm &amp; Split</span>
                </button>
              </div>
            </form>
          )}

          {/* EXPENSES BREAKDOWN LIST */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                Recorded Squad Bills
              </h4>
              <span className="text-[10px] font-bold text-slate-500">
                {expenses.length} Total
              </span>
            </div>

            {expenses.length === 0 ? (
              <div className="p-6 rounded-2xl bg-white border border-dashed border-slate-200 text-center space-y-2">
                <Receipt className="w-8 h-8 text-slate-300 mx-auto" />
                <h5 className="text-xs font-bold text-slate-700">No Bills Logged Yet</h5>
                <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
                  {hasSplitAuthority
                    ? 'Tap "+ Add Bill" above to record shared transport, food, or gear expenses.'
                    : 'Group admins and leads will log shared expedition expenses here.'}
                </p>
              </div>
            ) : (
              expenses.map((exp) => (
                <div
                  key={exp.id}
                  className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-2xs space-y-2"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center shrink-0 border border-emerald-200 font-bold text-sm">
                        {CATEGORIES.find((c) => c.name === exp.category)?.icon || '💳'}
                      </div>
                      <div>
                        <h4 className="text-xs font-extrabold text-slate-900">{exp.title}</h4>
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-500 mt-0.5">
                          <span>{exp.paidBy}</span>
                          <span>•</span>
                          <span>{exp.date}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-sm font-black text-slate-900 block font-mono">
                        ₹{exp.totalAmount.toLocaleString()}
                      </span>
                      <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 inline-block mt-0.5">
                        ₹{exp.amountPerMember.toLocaleString()} / person
                      </span>
                    </div>
                  </div>

                  {hasSplitAuthority && (
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px]">
                      <span className="text-slate-400">
                        Added to squad budget
                      </span>
                      <button
                        type="button"
                        onClick={(e) => handleDeleteExpense(exp.id, e)}
                        className="text-rose-600 hover:text-rose-700 font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Delete</span>
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
