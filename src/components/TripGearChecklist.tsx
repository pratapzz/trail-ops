import React, { useState } from 'react';
import {
  Plus,
  Layers,
  ChevronDown,
  ChevronUp,
  Minus,
  Backpack,
} from 'lucide-react';
import {
  fetchSquadChecklist,
  saveSquadChecklistItem,
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
  className = '',
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [newItemName, setNewItemName] = useState('');
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

  const handleDeleteItem = async (id: string, name: string) => {
    setGearList((prev) => prev.filter((item) => item.id !== id));
    await deleteSquadChecklistRecord(effectiveGroupId, id);
    onShowToast(`Removed "${name}" from Check List.`);
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newItemName.trim().replace(/^-\s*/, '');
    if (!trimmed) return;

    const newItem: GearItem = {
      id: `custom-${Date.now()}`,
      name: trimmed,
      category: 'camp',
      isPacked: false,
      isMandatory: false,
      weightGrams: 0,
      isCustom: true,
    };

    setGearList((prev) => [...prev, newItem]);
    setNewItemName('');

    await saveSquadChecklistItem(effectiveGroupId, newItem, currentUserId);
    onShowToast(`Added "- ${newItem.name}" to Check List!`);
  };

  return (
    <div
      className={`bg-white rounded-3xl border-2 border-emerald-500/30 p-4.5 shadow-sm overflow-hidden ${className}`}
    >
      {/* Top Header Row */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#0f5238] to-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-900/15">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 tracking-tight">
              Check List
            </h3>
            <p className="text-[11px] text-slate-500">
              Shared trip items list ({gearList.length} {gearList.length === 1 ? 'item' : 'items'})
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center cursor-pointer transition-colors"
          title={isExpanded ? 'Collapse Check List' : 'Expand Check List'}
        >
          {isExpanded ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </button>
      </div>

      {isExpanded && (
        <div className="pt-3 space-y-3 animate-in fade-in duration-200">
          {/* Add Item Input Form */}
          <form onSubmit={handleAddItem} className="flex items-center gap-2">
            <input
              type="text"
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              placeholder="Add item (e.g. shoes, voter id)..."
              className="flex-1 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-900 focus:outline-none focus:border-emerald-600"
            />
            <button
              type="submit"
              disabled={!newItemName.trim()}
              className="px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-40 text-white text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add</span>
            </button>
          </form>

          {/* Non-tickable Hyphenated Check List Items */}
          <div className="space-y-1.5 max-h-64 overflow-y-auto no-scrollbar pr-0.5">
            {gearList.length === 0 ? (
              <div className="p-5 rounded-2xl bg-slate-50 border border-dashed border-slate-200 text-center space-y-1.5">
                <Backpack className="w-7 h-7 text-slate-300 mx-auto" />
                <h5 className="text-xs font-bold text-slate-700">No items in Check List</h5>
                <p className="text-[11px] text-slate-500">
                  Add items above (e.g. - shoes, - voter id) for everyone in the group.
                </p>
              </div>
            ) : (
              gearList.map((item) => (
                <div
                  key={item.id}
                  className="px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50/70 flex items-center justify-between gap-2"
                >
                  <span className="text-xs font-bold text-slate-900 truncate">
                    - {item.name.replace(/^-\s*/, '')}
                  </span>

                  <button
                    type="button"
                    onClick={() => handleDeleteItem(item.id, item.name)}
                    className="w-6 h-6 rounded-lg bg-white hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-slate-200 hover:border-rose-300 flex items-center justify-center cursor-pointer transition-colors shrink-0"
                    title={`Remove ${item.name} from Check List`}
                  >
                    <Minus className="w-3.5 h-3.5 stroke-[2.5]" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
