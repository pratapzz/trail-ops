import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  Receipt,
  Users,
  CheckCircle2,
  Clock,
  Plus,
  X,
  CreditCard,
  PieChart,
  ArrowRight,
  Shield,
  AlertCircle,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { ExpenseSplit, UserRole, SubGroup } from '../types';

interface SplitwiseModalProps {
  isOpen: boolean;
  onClose: () => void;
  userRole: UserRole;
  tripBudget: number;
  amountPaid: number;
  amountPending: number;
  subGroups?: SubGroup[];
  memberCount?: number;
  onShowToast: (message: string) => void;
  onSettlePayment: (amount: number) => void;
}

export const SplitwiseModal: React.FC<SplitwiseModalProps> = ({
  isOpen,
  onClose,
  userRole,
  tripBudget,
  amountPaid,
  amountPending,
  subGroups = [],
  memberCount = 1,
  onShowToast,
  onSettlePayment,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'expenses' | 'settle'>('overview');
  const [isSplitBillModalOpen, setIsSplitBillModalOpen] = useState(false);

  // New bill state
  const [billTitle, setBillTitle] = useState('');
  const [billAmount, setBillAmount] = useState<number>(0);
  const [billCategory, setBillCategory] = useState('Transport');
  const [splitTarget, setSplitTarget] = useState<'all' | 'subgroup' | 'custom'>('all');
  const [selectedSubGroupId, setSelectedSubGroupId] = useState<string>('');

  const isSuperAdmin = userRole === 'super_admin';
  const isSubGroupAdmin = userRole === 'subgroup_admin';
  const hasSplitAuthority = isSuperAdmin || isSubGroupAdmin;

  // Real expenses state - ZERO mock or demo records
  const [expenses, setExpenses] = useState<ExpenseSplit[]>(() => {
    const saved = localStorage.getItem('trailoPS_expenses');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch {}
    }
    return [];
  });

  useEffect(() => {
    localStorage.setItem('trailoPS_expenses', JSON.stringify(expenses));
  }, [expenses]);

  if (!isOpen) return null;

  const totalGroupExpenses = expenses.reduce((acc, curr) => acc + curr.totalAmount, 0);
  const paidPercent = tripBudget > 0 ? Math.min(Math.round((amountPaid / tripBudget) * 100), 100) : 0;
  const activeMembersTotal = Math.max(1, memberCount);

  const handleCreateSplit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!billTitle.trim() || billAmount <= 0) {
      onShowToast('Please enter a valid bill title and amount.');
      return;
    }

    // Accurate calculation in integer paise
    const totalPaise = Math.round(billAmount * 100);
    const count = splitTarget === 'all'
      ? activeMembersTotal
      : subGroups.find((s) => s.id === selectedSubGroupId)?.memberCount || Math.max(1, Math.round(activeMembersTotal / 2));

    const perMemberPaise = Math.round(totalPaise / count);
    const amountPerMember = perMemberPaise / 100;

    const newExp: ExpenseSplit = {
      id: `exp-${Date.now()}`,
      title: billTitle.trim(),
      totalAmount: billAmount,
      paidBy: isSuperAdmin ? 'Squad Commander (You)' : 'Squad Lead (You)',
      date: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
      category: billCategory,
      splitType: splitTarget === 'all' ? 'all' : 'custom',
      memberIds: ['all'],
      amountPerMember,
      settledMemberIds: [],
    };

    setExpenses([newExp, ...expenses]);
    setIsSplitBillModalOpen(false);
    setBillTitle('');
    setBillAmount(0);
    onShowToast(`Recorded bill "${newExp.title}" of ₹${billAmount.toLocaleString()} split among ${count} member(s)!`);
  };

  const handleDeleteExpense = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpenses((prev) => prev.filter((item) => item.id !== id));
    onShowToast('Expense entry removed from squad ledger.');
  };

  const handleSettleUp = () => {
    onSettlePayment(amountPending);
    onShowToast(`₹${amountPending.toLocaleString()} settled successfully via UPI / Card!`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200 shadow-2xl flex flex-col max-h-[88vh] overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-emerald-950 via-[#0f5238] to-teal-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 text-emerald-300 flex items-center justify-center border border-white/20">
              <PieChart className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-extrabold text-base tracking-tight text-white">Squad Splitwise</h3>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-emerald-400 text-slate-950">
                  Shared Ledger
                </span>
              </div>
              <p className="text-[11px] text-emerald-200">
                Transparent Trip Expenses &amp; Sub-Group Splits
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Authority Notification & Split Button Bar */}
        <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-slate-700">
            <span className="text-[11px] font-semibold">Billing Authority:</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide ${
                hasSplitAuthority
                  ? 'bg-amber-100 text-amber-900 border border-amber-300'
                  : 'bg-slate-200 text-slate-600'
              }`}
            >
              {isSuperAdmin ? 'Squad Commander' : isSubGroupAdmin ? 'Sub-Group Lead' : 'Read-Only Member'}
            </span>
          </div>

          {hasSplitAuthority && (
            <button
              type="button"
              onClick={() => setIsSplitBillModalOpen(true)}
              className="py-1 px-3 rounded-xl bg-[#0f5238] hover:bg-[#166534] text-white text-[11px] font-bold flex items-center gap-1 shadow-xs active:scale-95 transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Bill</span>
            </button>
          )}
        </div>

        {/* Modal Scroll Content */}
        <div className="p-4 space-y-4 overflow-y-auto max-h-[calc(88vh-140px)] no-scrollbar">
          {/* USER PERSONAL EXPEDITION BUDGET CARD */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block">
                  Your Expedition Dues
                </span>
                <span className="text-xl font-black text-slate-900">
                  ₹{tripBudget.toLocaleString()} <span className="text-xs font-normal text-slate-500">total budget</span>
                </span>
              </div>

              <div className="text-right">
                <span className="text-[10px] font-bold text-amber-600 block uppercase">
                  Pending Balance
                </span>
                <span className="text-base font-extrabold text-amber-600 font-mono">
                  ₹{amountPending.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Budget Progress Bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] font-bold text-slate-600">
                <span className="text-emerald-700">₹{amountPaid.toLocaleString()} Cleared</span>
                <span>{paidPercent}% of Trip</span>
              </div>
              <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden flex">
                <div
                  className="bg-emerald-600 h-full transition-all duration-700"
                  style={{ width: `${paidPercent}%` }}
                />
                <div
                  className="bg-gradient-to-r from-amber-400 to-amber-500 h-full transition-all duration-700"
                  style={{ width: `${100 - paidPercent}%` }}
                />
              </div>
            </div>

            {/* Settle Up Action */}
            {amountPending > 0 && (
              <button
                type="button"
                onClick={handleSettleUp}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#0f5238] via-emerald-700 to-teal-700 hover:brightness-105 text-white text-xs font-bold shadow-md flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer"
              >
                <CreditCard className="w-4 h-4" />
                <span>Pay &amp; Settle Pending ₹{amountPending.toLocaleString()}</span>
              </button>
            )}
          </div>

          {/* TOTAL GROUP ACCUMULATED EXPENSES */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-white rounded-2xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block">
                Total Squad Expenses
              </span>
              <span className="text-lg font-black text-slate-900">
                ₹{totalGroupExpenses.toLocaleString()}
              </span>
              <span className="text-[10px] text-slate-500 block mt-0.5">
                Across {activeMembersTotal} squad member{activeMembersTotal === 1 ? '' : 's'}
              </span>
            </div>

            <div className="p-3 bg-white rounded-2xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block">
                Total Bills Logged
              </span>
              <span className="text-lg font-black text-emerald-800">{expenses.length} Bill{expenses.length === 1 ? '' : 's'}</span>
              <span className="text-[10px] text-slate-500 block mt-0.5">Real Ledger</span>
            </div>
          </div>

          {/* EXPENSES BREAKDOWN LIST */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Splitwise Bills &amp; Expenses
              </h4>
              <span className="text-[10px] font-semibold text-slate-500">
                {expenses.length} recorded
              </span>
            </div>

            {expenses.length === 0 ? (
              <div className="p-6 rounded-2xl bg-slate-50 border border-dashed border-slate-200 text-center space-y-2">
                <Receipt className="w-8 h-8 text-slate-300 mx-auto" />
                <h5 className="text-xs font-bold text-slate-700">No Expenses Recorded</h5>
                <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
                  No shared bills or splits logged yet. {hasSplitAuthority ? 'Tap "+ Add Bill" above to record transport, permits, or food.' : 'Squad leads will log group expenses here.'}
                </p>
                {hasSplitAuthority && (
                  <button
                    type="button"
                    onClick={() => setIsSplitBillModalOpen(true)}
                    className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0f5238] text-white text-xs font-bold hover:brightness-105 active:scale-95 transition-all cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add First Bill</span>
                  </button>
                )}
              </div>
            ) : (
              expenses.map((exp) => (
                <div
                  key={exp.id}
                  className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-xs space-y-2"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center shrink-0 border border-emerald-200">
                        <Receipt className="w-4 h-4" />
                      </div>
                      <div>
                        <h5 className="text-xs font-bold text-slate-900 leading-snug">{exp.title}</h5>
                        <p className="text-[10px] text-slate-500">
                          Paid by <strong>{exp.paidBy}</strong> · {exp.date} · {exp.category}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-extrabold text-slate-900 block">
                        ₹{exp.totalAmount.toLocaleString()}
                      </span>
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                        ₹{exp.amountPerMember.toFixed(0)}/each
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-slate-100 text-slate-600">
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3 text-slate-400" />
                      {exp.splitType === 'all' ? `Split among All (${activeMembersTotal})` : 'Sub-Group Specific'}
                    </span>

                    <div className="flex items-center gap-2">
                      <span className="text-emerald-700 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 fill-current" />
                        Share: ₹{exp.amountPerMember.toFixed(0)}
                      </span>
                      {hasSplitAuthority && (
                        <button
                          type="button"
                          onClick={(e) => handleDeleteExpense(exp.id, e)}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                          title="Delete bill"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* CREATE NEW BILL SPLIT MODAL (Restricted to Super Admin & Sub-Group Leads) */}
      {isSplitBillModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-white rounded-3xl p-5 border border-slate-200 shadow-2xl flex flex-col space-y-3.5">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-[#0f5238] flex items-center justify-center">
                  <Receipt className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Split New Group Bill</h3>
                  <p className="text-[11px] text-slate-500">Accurate Integer Paise Engine</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsSplitBillModalOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSplit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Bill / Expense Title
                </label>
                <input
                  type="text"
                  value={billTitle}
                  onChange={(e) => setBillTitle(e.target.value)}
                  placeholder="e.g. Campsite Generator Fuel & Cooking Gas"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:bg-white focus:border-emerald-600 outline-none"
                  required
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Amount (₹ INR)
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={billAmount || ''}
                    onChange={(e) => setBillAmount(Number(e.target.value))}
                    placeholder="0"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900 focus:bg-white focus:border-emerald-600 outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Category
                  </label>
                  <select
                    value={billCategory}
                    onChange={(e) => setBillCategory(e.target.value)}
                    className="w-full px-2.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:bg-white focus:border-emerald-600 outline-none"
                  >
                    <option value="Transport">Transport</option>
                    <option value="Food">Food &amp; Meals</option>
                    <option value="Permits">Forest Permits</option>
                    <option value="Equipment">Gear &amp; Porters</option>
                    <option value="Stay">Campsite Stay</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Who Should This Bill Be Split With?
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSplitTarget('all')}
                    className={`py-2 px-2.5 rounded-xl text-xs font-bold border transition-all ${
                      splitTarget === 'all'
                        ? 'bg-emerald-100 border-emerald-400 text-emerald-900'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    All Members ({activeMembersTotal})
                  </button>
                  <button
                    type="button"
                    onClick={() => setSplitTarget('subgroup')}
                    className={`py-2 px-2.5 rounded-xl text-xs font-bold border transition-all ${
                      splitTarget === 'subgroup'
                        ? 'bg-emerald-100 border-emerald-400 text-emerald-900'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Select Sub-Group
                  </button>
                </div>
              </div>

              {splitTarget === 'subgroup' && (
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 space-y-1">
                  <span className="text-[11px] font-semibold text-slate-700 block">Choose Sub-Group:</span>
                  {subGroups.length > 0 ? (
                    <select
                      value={selectedSubGroupId}
                      onChange={(e) => setSelectedSubGroupId(e.target.value)}
                      className="w-full p-1.5 text-xs rounded-lg border border-slate-300 bg-white"
                    >
                      {subGroups.map((sg) => (
                        <option key={sg.id} value={sg.id}>
                          {sg.name} ({sg.memberCount} members)
                        </option>
                      ))}
                    </select>
                  ) : (
                    <p className="text-[11px] text-slate-500">No sub-groups created yet. Split will apply across active members.</p>
                  )}
                </div>
              )}

              {/* Live calculated share pill */}
              <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between text-xs">
                <span className="text-emerald-900 font-semibold">Calculated Share:</span>
                <span className="font-mono font-bold text-emerald-950 text-sm">
                  ₹{billAmount > 0 ? Math.round(billAmount / (splitTarget === 'all' ? activeMembersTotal : Math.max(1, Math.round(activeMembersTotal / 2)))).toLocaleString() : 0} / person
                </span>
              </div>

              <div className="pt-1 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsSplitBillModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-700 to-teal-800 text-white text-xs font-bold shadow-md hover:brightness-105 active:scale-95 transition-all"
                >
                  Confirm Split
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
