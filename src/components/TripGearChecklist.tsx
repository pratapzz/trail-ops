import React, { useState } from 'react';
import {
  CheckCircle2,
  Circle,
  Plus,
  Trash2,
  ShieldAlert,
  Compass,
  HeartPulse,
  Shirt,
  Flame,
  CheckCheck,
  RotateCcw,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Weight,
  Layers,
  X,
  Minus,
  Backpack,
} from 'lucide-react';

export interface GearItem {
  id: string;
  name: string;
  category: 'navigation' | 'medical' | 'apparel' | 'camp';
  isPacked: boolean;
  isMandatory: boolean;
  weightGrams: number;
  spec?: string;
  isCustom?: boolean;
}

import {
  fetchSquadChecklist,
  saveSquadChecklistItem,
  updateSquadChecklistPacking,
  deleteSquadChecklistRecord,
} from '../lib/supabase';
import { UserRole } from '../types';

export interface GearItem {
  id: string;
  name: string;
  category: 'navigation' | 'medical' | 'apparel' | 'camp';
  isPacked: boolean;
  isMandatory: boolean;
  weightGrams: number;
  spec?: string;
  isCustom?: boolean;
}

interface TripGearChecklistProps {
  onShowToast: (message: string) => void;
  groupId?: string;
  currentUserId?: string;
  userRole?: UserRole;
  className?: string;
}

export const TripGearChecklist: React.FC<TripGearChecklistProps> = ({
  onShowToast,
  groupId = 'default',
  currentUserId,
  userRole = 'member',
  className = '',
}) => {
  const [activeCategory, setActiveCategory] = useState<
    'all' | 'navigation' | 'medical' | 'apparel' | 'camp'
  >('all');
  const [isExpanded, setIsExpanded] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // New item form state
  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState<
    'navigation' | 'medical' | 'apparel' | 'camp'
  >('navigation');
  const [newItemMandatory, setNewItemMandatory] = useState(true);
  const [newItemWeight, setNewItemWeight] = useState(300);
  const [newItemSpec, setNewItemSpec] = useState('');

  const [gearList, setGearList] = useState<GearItem[]>([]);
  const effectiveGroupId = groupId || 'default';

  const loadChecklist = React.useCallback(async () => {
    try {
      const records = await fetchSquadChecklist(effectiveGroupId, currentUserId);
      if (records && Array.isArray(records)) {
        const mapped: GearItem[] = records.map((r) => ({
          id: r.id,
          name: r.name,
          category: r.category,
          isPacked: r.is_packed,
          isMandatory: r.is_mandatory,
          weightGrams: r.weight_grams,
          spec: r.spec || undefined,
          isCustom: r.is_custom || false,
        }));
        setGearList(mapped);
      }
    } catch {}
  }, [effectiveGroupId, currentUserId]);

  React.useEffect(() => {
    loadChecklist();
    const interval = setInterval(loadChecklist, 4000);

    const handleGearUpdated = (e: any) => {
      if (!e?.detail?.groupId || e.detail.groupId === effectiveGroupId) {
        loadChecklist();
      }
    };

    window.addEventListener('trailoPS_gear_updated', handleGearUpdated);

    let bc: BroadcastChannel | null = null;
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        bc = new BroadcastChannel(`trailops_squad_bus_${effectiveGroupId}`);
        bc.onmessage = (ev) => {
          if (ev.data?.type === 'GEAR_CHECKLIST_UPDATED') {
            loadChecklist();
          }
        };
      } catch {}
    }

    return () => {
      clearInterval(interval);
      window.removeEventListener('trailoPS_gear_updated', handleGearUpdated);
      if (bc) bc.close();
    };
  }, [effectiveGroupId, loadChecklist]);

  // Calculations
  const totalItems = gearList.length;
  const packedItems = gearList.filter((item) => item.isPacked).length;
  const completionPercent =
    totalItems > 0 ? Math.round((packedItems / totalItems) * 100) : 0;

  const mandatoryTotal = gearList.filter((item) => item.isMandatory).length;
  const mandatoryPacked = gearList.filter(
    (item) => item.isMandatory && item.isPacked
  ).length;

  const packedWeightKg = (
    gearList
      .filter((item) => item.isPacked)
      .reduce((sum, item) => sum + item.weightGrams, 0) / 1000
  ).toFixed(2);

  const totalWeightKg = (
    gearList.reduce((sum, item) => sum + item.weightGrams, 0) / 1000
  ).toFixed(2);

  const toggleGear = async (id: string) => {
    const target = gearList.find((item) => item.id === id);
    if (!target) return;
    const nextPacked = !target.isPacked;

    setGearList((prev) =>
      prev.map((item) => (item.id === id ? { ...item, isPacked: nextPacked } : item))
    );

    await updateSquadChecklistPacking(effectiveGroupId, id, nextPacked, currentUserId);
  };

  const handlePackAll = async () => {
    setGearList((prev) => prev.map((item) => ({ ...item, isPacked: true })));
    for (const item of gearList) {
      await updateSquadChecklistPacking(effectiveGroupId, item.id, true, currentUserId);
    }
    onShowToast('All gear items marked as Packed in shared expedition kit!');
  };

  const handleResetAll = async () => {
    setGearList((prev) => prev.map((item) => ({ ...item, isPacked: false })));
    for (const item of gearList) {
      await updateSquadChecklistPacking(effectiveGroupId, item.id, false, currentUserId);
    }
    onShowToast('Shared checklist reset to unpacked state.');
  };

  const handleDeleteItem = async (id: string, name: string) => {
    setGearList((prev) => prev.filter((item) => item.id !== id));
    await deleteSquadChecklistRecord(effectiveGroupId, id);
    onShowToast(`Removed "${name}" from shared checklist.`);
  };

  const handleAddCustomItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;

    const newItem: GearItem = {
      id: `custom-${Date.now()}`,
      name: newItemName.trim(),
      category: newItemCategory,
      isPacked: false,
      isMandatory: newItemMandatory,
      weightGrams: newItemWeight > 0 ? newItemWeight : 200,
      spec: newItemSpec.trim() || undefined,
      isCustom: true,
    };

    setGearList((prev) => [...prev, newItem]);
    setNewItemName('');
    setNewItemSpec('');
    setIsAddModalOpen(false);

    await saveSquadChecklistItem(effectiveGroupId, newItem, currentUserId);
    onShowToast(`Added "${newItem.name}" to shared trip checklist!`);
  };

  const filteredItems = gearList.filter((item) => {
    if (activeCategory === 'all') return true;
    return item.category === activeCategory;
  });

  return (
    <div
      className={`bg-white rounded-3xl border-2 border-emerald-500/30 p-4.5 shadow-sm overflow-hidden ${className}`}
    >
      {/* Top Header Row with Expand/Collapse */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#0f5238] to-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-900/15">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-sm font-extrabold text-slate-900 tracking-tight">
                Trip Gear Checklist
              </h3>
              <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase tracking-wider bg-emerald-100 text-[#0f5238] border border-emerald-300">
                Audit
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              Everything you need for your trip.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Completion Badge */}
          <span
            className={`px-2.5 py-1 rounded-full text-xs font-black transition-colors ${
              completionPercent === 100
                ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                : completionPercent >= 60
                ? 'bg-teal-100 text-teal-900 border border-teal-300'
                : 'bg-amber-100 text-amber-900 border border-amber-300'
            }`}
          >
            {completionPercent}% Packed
          </span>

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center cursor-pointer transition-colors"
            title={isExpanded ? 'Collapse Checklist' : 'Expand Checklist'}
          >
            {isExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Visual Progress Bar & Load Metrics */}
      <div className="pt-3 pb-2 space-y-2">
        <div className="flex items-center justify-between text-xs font-bold">
          <span className="text-slate-700 flex items-center gap-1.5">
            <CheckCheck className="w-4 h-4 text-emerald-700" />
            <span>
              {packedItems} of {totalItems} Essential Items Packed
            </span>
            <span className="text-[10px] text-slate-400 font-normal">
              ({mandatoryPacked}/{mandatoryTotal} Required)
            </span>
          </span>

          <span className="text-slate-600 flex items-center gap-1 font-mono text-[11px]">
            <Weight className="w-3.5 h-3.5 text-slate-400" />
            <span>
              <strong>{packedWeightKg}</strong> / {totalWeightKg} kg
            </span>
          </span>
        </div>

        {/* Animated Double-Gradient Progress Bar */}
        <div className="w-full h-3 rounded-full bg-slate-100 border border-slate-200 overflow-hidden relative shadow-inner">
          <div
            className="h-full bg-gradient-to-r from-teal-600 via-emerald-600 to-[#0f5238] rounded-full transition-all duration-500 relative"
            style={{ width: `${completionPercent}%` }}
          >
            <div className="absolute inset-0 bg-white/20 animate-pulse" />
          </div>
        </div>

        {/* Readout Status message (Fixed Height & Truncated to Prevent Layout Shifts / Shaking) */}
        <div className="h-6 min-h-[24px] flex items-center justify-between text-[11px] gap-2 overflow-hidden">
          <span className="text-slate-500 truncate flex-1 min-w-0">
            {completionPercent === 100
              ? '✓ Full loadout verified for alpine ascent.'
              : mandatoryPacked < mandatoryTotal
              ? `⚠️ ${mandatoryTotal - mandatoryPacked} mandatory item(s) unverified.`
              : 'Pack all essential items before departure.'}
          </span>

          <div className="shrink-0">
            {completionPercent === 100 ? (
              <span className="text-emerald-700 font-extrabold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 fill-current" />
                <span>Ridge Certified</span>
              </span>
            ) : (
              <span className="text-amber-700 font-bold whitespace-nowrap">
                {totalItems - packedItems} left
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Expandable Section Content */}
      {isExpanded && (
        <div className="pt-2 space-y-3 animate-in fade-in duration-200">
          {/* Quick Action Controls: Filter Pills & Pack All */}
          <div className="flex items-center justify-between gap-1 overflow-x-auto pb-1 pt-1 no-scrollbar border-t border-slate-100">
            <div className="flex items-center gap-1">
              {(
                [
                  { id: 'all', label: 'All', icon: Layers },
                  { id: 'navigation', label: 'Electronics', icon: Compass },
                  { id: 'medical', label: 'Medical', icon: HeartPulse },
                  { id: 'apparel', label: 'Clothing', icon: Shirt },
                  { id: 'camp', label: 'Camping', icon: Flame },
                ] as const
              ).map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveCategory(tab.id)}
                    className={`px-2.5 py-1 rounded-xl text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer whitespace-nowrap ${
                      activeCategory === tab.id
                        ? 'bg-emerald-800 text-white shadow-2xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <Icon className="w-3 h-3" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(true)}
                className="px-2 py-1 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-900 text-[10px] font-bold flex items-center gap-1 border border-emerald-300 transition-colors cursor-pointer"
                title="Add custom item"
              >
                <Plus className="w-3 h-3" />
                <span>Add Item</span>
              </button>

              <button
                type="button"
                onClick={handlePackAll}
                className="px-2 py-1 rounded-xl bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-900 text-[10px] font-bold transition-colors cursor-pointer"
                title="Mark all as packed"
              >
                Pack All
              </button>
            </div>
          </div>

          {/* Interactive Checklist Items List */}
          <div className="space-y-2 max-h-64 overflow-y-auto no-scrollbar pr-0.5">
            {filteredItems.length === 0 ? (
              <div className="p-6 rounded-2xl bg-slate-50 border border-dashed border-slate-200 text-center space-y-2">
                <Backpack className="w-8 h-8 text-slate-300 mx-auto" />
                <h5 className="text-xs font-bold text-slate-700">No items added yet</h5>
                <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
                  Your checklist is empty. Tap &apos;Add Item&apos; to get started.
                </p>
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(true)}
                  className="mt-1 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-700 text-white text-[11px] font-bold hover:bg-emerald-800 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Item</span>
                </button>
              </div>
            ) : (
              filteredItems.map((item) => (
                <div
                  key={item.id}
                  onClick={() => toggleGear(item.id)}
                  className={`p-2.5 rounded-2xl border transition-colors duration-150 cursor-pointer flex items-center justify-between gap-2 shadow-2xs select-none min-h-[58px] ${
                    item.isPacked
                      ? 'bg-emerald-50/60 border-emerald-300'
                      : 'bg-white border-slate-200 hover:border-emerald-400'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {/* Interactive Checkbox Icon */}
                    <div className="shrink-0 flex items-center justify-center">
                      {item.isPacked ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-700 fill-emerald-100" />
                      ) : (
                        <Circle className="w-5 h-5 text-slate-300 group-hover:text-emerald-600" />
                      )}
                    </div>

                    {/* Gear Info */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          className={`text-xs font-bold truncate ${
                            item.isPacked
                              ? 'text-slate-500 line-through decoration-emerald-600/70'
                              : 'text-slate-900'
                          }`}
                        >
                          {item.name}
                        </span>

                        {item.isMandatory && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase tracking-wider bg-rose-100 text-rose-800 border border-rose-300">
                            Required
                          </span>
                        )}

                        {item.isCustom && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-purple-100 text-purple-800">
                            Custom
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                        {item.spec && <span>{item.spec}</span>}
                        <span>·</span>
                        <span className="font-mono text-slate-600 font-semibold">
                          {item.weightGrams >= 1000
                            ? `${(item.weightGrams / 1000).toFixed(1)} kg`
                            : `${item.weightGrams}g`}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right side status / delete */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        item.isPacked
                          ? 'bg-emerald-100 text-emerald-900'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {item.isPacked ? 'Packed' : 'Pending'}
                    </span>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteItem(item.id, item.name);
                      }}
                      className="w-7 h-7 rounded-lg bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-slate-200 hover:border-rose-300 flex items-center justify-center cursor-pointer transition-colors"
                      title={`Remove (-) ${item.name} from checklist`}
                    >
                      <Minus className="w-3.5 h-3.5 stroke-[2.5]" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Bottom Footer Actions */}
          <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between text-xs">
            <button
              type="button"
              onClick={handleResetAll}
              className="text-[11px] font-semibold text-slate-500 hover:text-rose-700 flex items-center gap-1 cursor-pointer transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Clear Checklist</span>
            </button>

            <span className="text-[11px] text-emerald-800 font-bold">
              {packedItems === totalItems ? 'Ready for Your Trip' : 'Inspection Active'}
            </span>
          </div>
        </div>
      )}

      {/* Quick Add Custom Gear Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-white rounded-3xl p-5 border border-slate-200 shadow-2xl flex flex-col space-y-3.5">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-[#0f5238] flex items-center justify-center">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    Add Gear to Checklist
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Custom trail essential or personal gear
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddCustomItem} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Gear Name / Description
                </label>
                <input
                  type="text"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  placeholder="e.g. 20,000mAh Extreme Powerbank"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900 focus:bg-white focus:border-emerald-600 outline-none"
                  required
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Category
                  </label>
                  <select
                    value={newItemCategory}
                    onChange={(e) =>
                      setNewItemCategory(e.target.value as any)
                    }
                    className="w-full px-2.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:bg-white focus:border-emerald-600 outline-none"
                  >
                    <option value="navigation">Navigation &amp; Comms</option>
                    <option value="medical">Medical &amp; Survival</option>
                    <option value="apparel">Alpine Apparel</option>
                    <option value="camp">Camp &amp; Rations</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Est. Weight (g)
                  </label>
                  <input
                    type="number"
                    value={newItemWeight}
                    onChange={(e) => setNewItemWeight(Number(e.target.value))}
                    step="50"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:bg-white focus:border-emerald-600 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Specification Note (Optional)
                </label>
                <input
                  type="text"
                  value={newItemSpec}
                  onChange={(e) => setNewItemSpec(e.target.value)}
                  placeholder="e.g. QuickCharge 3.0, IP67 waterproof"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:bg-white focus:border-emerald-600 outline-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="mandatoryToggle"
                  checked={newItemMandatory}
                  onChange={(e) => setNewItemMandatory(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-600 cursor-pointer"
                />
                <label
                  htmlFor="mandatoryToggle"
                  className="text-xs font-semibold text-slate-700 cursor-pointer"
                >
                  Mark as Mandatory Pre-Departure Requirement
                </label>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-700 to-teal-800 text-white text-xs font-bold shadow-md hover:brightness-105 active:scale-95 transition-all flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add to Checklist</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
