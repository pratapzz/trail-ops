import React, { useState } from 'react';
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
  onShowToast,
  onSettlePayment,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'expenses' | 'settle'>('overview');
  const [isSplitBillModalOpen, setIsSplitBillModalOpen] = useState(false);

  // New bill state
  const [billTitle, setDocTitle] = useState('');
  const [billAmount, setBillAmount] = useState<number>(8400);
  const [billCategory, setBillCategory] = useState('Transport');
  const [splitTarget, setSplitTarget] = useState<'all' | 'subgroup' | 'custom'>('all');
  const [selectedSubGroup, setSelectedSubGroup] = useState<string>('alpha');

  const isSuperAdmin = userRole === 'super_admin';
  const isSubGroupAdmin = userRole === 'subgroup_admin';
  const hasSplitAuthority = isSuperAdmin || isSubGroupAdmin;

  const [expenses, setExpenses] = useState<ExpenseSplit[]>([
    {
      id: 'exp-1',
      title: 'Shared Tempo Traveller (Siliguri to Yuksom)',
      totalAmount: 14000,
      paidBy: 'Prof. Roy (Super Admin)',
      date: '14 Oct 2026',
      category: 'Transport',
      splitType: 'all',
      memberIds: ['all'],
      amountPerMember: 333,
      settledMemberIds: ['user-1', 'user-2', 'user-3'],
    },
    {
      id: 'exp-2',
      title: 'Khangchendzonga Park Permits & Eco Cesses',
      totalAmount: 8400,
      paidBy: 'Prof. Roy (Super Admin)',
      date: '15 Oct 2026',
      category: 'Permits',
      splitType: 'all',
      memberIds: ['all'],
      amountPerMember: 200,
      settledMemberIds: ['user-1'],
    },
    {
      id: 'exp-3',
      title: 'Alpine Ridge Heavy Porter & Tarp Gear',
      totalAmount: 9000,
      paidBy: 'Arjun Sen (Scout Lead)',
      date: '15 Oct 2026',
      category: 'Equipment',
      splitType: 'custom',
      memberIds: ['user-1', 'user-4', 'user-5'],
      amountPerMember: 642,
      settledMemberIds: [],
    },
    {
      id: 'exp-4',
      title: 'Basecamp Ration, Evening Wood & Hot Soup',
      totalAmount: 16800,
      paidBy: 'Dr. Anita Roy',
      date: '16 Oct 2026',
      category: 'Food',
      splitType: 'all',
      memberIds: ['all'],
      amountPerMember: 400,
      settledMemberIds: ['user-1'],
    },
  ]);

  if (!isOpen) return null;

  const totalGroupExpenses = expenses.reduce((acc, curr) => acc + curr.totalAmount, 0);
  const paidPercent = tripBudget > 0 ? Math.min(Math.round((amountPaid / tripBudget) * 100), 100) : 0;

  const handleCreateSplit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!billTitle.trim() || billAmount <= 0) return;

    const count = splitTarget === 'all' ? 42 : 14;
    const perMember = Math.round(billAmount / count);

    const newExp: ExpenseSplit = {
      id: Date.now().toString(),
      title: billTitle.trim(),
      totalAmount: billAmount,
      paidBy: isSuperAdmin ? 'You (Super Admin)' : 'You (Sub-Group Lead)',
      date: 'Today',
      category: billCategory,
      splitType: splitTarget === 'all' ? 'all' : 'custom',
      memberIds: ['all'],
      amountPerMember: perMember,
      settledMemberIds: [],
    };

    setExpenses([newExp, ...expenses]);
    setIsSplitBillModalOpen(false);
    setDocTitle('');
    onShowToast(`New bill "${newExp.title}" of ₹${billAmount.toLocaleString()} split created!`);
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
                  : 'bg-slate-200 text-slate-700'
              }`}
            >
              {isSuperAdmin
                ? 'Super Admin (Full Split Authority)'
                : isSubGroupAdmin
                ? 'Sub-Group Lead (Team Split)'
                : 'Member (Read & Settle)'}
            </span>
          </div>

          {hasSplitAuthority && (
            <button
              type="button"
              onClick={() => setIsSplitBillModalOpen(true)}
              className="px-3 py-1 rounded-full bg-[#0f5238] hover:bg-emerald-800 text-white text-[11px] font-bold flex items-center gap-1 shadow-2xs cursor-pointer transition-all"
            >
              <Plus className="w-3 h-3" />
              <span>Split New Bill</span>
            </button>
          )}
        </div>

        {/* Content Body */}
        <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-[#f8faf9]">
          {/* PERSONAL TRIP BUDGET STATUS CARD */}
          <div className="bg-white rounded-2xl p-4 border-2 border-emerald-500/25 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-extrabold text-emerald-700 uppercase tracking-wider">
                  Your Individual Quota
                </span>
                <h4 className="text-base font-extrabold text-slate-900">
                  Total Budget: ₹{tripBudget.toLocaleString()}
                </h4>
              </div>
              <div className="text-right">
                <span className="text-xs font-bold text-slate-500 block">Status:</span>
                <span
                  className={`text-xs font-black px-2 py-0.5 rounded-full ${
                    amountPending === 0
                      ? 'bg-emerald-100 text-emerald-900'
                      : 'bg-amber-100 text-amber-900'
                  }`}
                >
                  {amountPending === 0 ? '✓ 100% Settled' : `₹${amountPending.toLocaleString()} Pending`}
                </span>
              </div>
            </div>

            {/* Visual Dual-tone Progress Bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-emerald-800 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  Paid: ₹{amountPaid.toLocaleString()} ({paidPercent}%)
                </span>
                <span className="text-amber-700 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  Pending: ₹{amountPending.toLocaleString()}
                </span>
              </div>

              <div className="w-full h-3 rounded-full bg-slate-100 border border-slate-200 overflow-hidden flex">
                <div
                  className="bg-gradient-to-r from-emerald-600 to-[#0f5238] h-full transition-all duration-700"
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
              <span className="text-[10px] text-slate-500 block mt-0.5">Across 42 members</span>
            </div>

            <div className="p-3 bg-white rounded-2xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block">
                Total Bills Logged
              </span>
              <span className="text-lg font-black text-emerald-800">{expenses.length} Bills</span>
              <span className="text-[10px] text-slate-500 block mt-0.5">Faculty Audit Passed</span>
            </div>
          </div>

          {/* EXPENSES BREAKDOWN LIST */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Splitwise Bills &amp; Expenses
              </h4>
              <span className="text-[10px] font-semibold text-slate-500">
                Sorted by latest
              </span>
            </div>

            {expenses.map((exp) => (
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
                      ₹{exp.amountPerMember}/each
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-slate-100 text-slate-600">
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3 text-slate-400" />
                    {exp.splitType === 'all' ? 'Split among All 42' : 'Sub-Group Specific'}
                  </span>

                  <span className="text-emerald-700 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 fill-current" />
                    Your share: ₹{exp.amountPerMember}
                  </span>
                </div>
              </div>
            ))}
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
                  <p className="text-[11px] text-slate-500">Splitwise Algorithm Engine</p>
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
                  onChange={(e) => setDocTitle(e.target.value)}
                  placeholder="e.g. Campsite Generator Fuel & Cooking Gas"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:bg-white focus:border-emerald-600 outline-none"
                  required
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Total Amount (₹)
                  </label>
                  <input
                    type="number"
                    value={billAmount}
                    onChange={(e) => setBillAmount(Number(e.target.value))}
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
                    All 42 Members
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
                  <select
                    value={selectedSubGroup}
                    onChange={(e) => setSelectedSubGroup(e.target.value)}
                    className="w-full p-1.5 text-xs rounded-lg border border-slate-300 bg-white"
                  >
                    <option value="alpha">Scout Team Alpha (Red Highlight)</option>
                    <option value="medical">Medical Vanguard (Blue Highlight)</option>
                    <option value="ridge">Ridge Campers (Emerald Highlight)</option>
                  </select>
                </div>
              )}

              {/* Live calculated share pill */}
              <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between text-xs">
                <span className="text-emerald-900 font-semibold">Calculated Individual Share:</span>
                <span className="font-mono font-bold text-emerald-950 text-sm">
                  ₹{Math.round(billAmount / (splitTarget === 'all' ? 42 : 14)).toLocaleString()} / person
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
