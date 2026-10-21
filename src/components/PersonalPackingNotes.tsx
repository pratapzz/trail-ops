import React, { useState } from 'react';
import {
  CheckCircle2,
  Circle,
  Plus,
  Trash2,
  ListTodo,
  FileText,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Tag,
} from 'lucide-react';
import { PersonalTodoItem } from '../types';

interface PersonalPackingNotesProps {
  onShowToast: (message: string) => void;
  className?: string;
}

export const PersonalPackingNotes: React.FC<PersonalPackingNotesProps> = ({
  onShowToast,
  className = '',
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [newTodoText, setNewTodoText] = useState('');
  const [newTodoCategory, setNewTodoCategory] = useState<
    'document' | 'clothes' | 'electronics' | 'snack' | 'other'
  >('document');

  const [todos, setTodos] = useState<PersonalTodoItem[]>(() => {
    const saved = localStorage.getItem('trailoPS_personal_todos');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch {}
    }
    return [];
  });

  React.useEffect(() => {
    localStorage.setItem('trailoPS_personal_todos', JSON.stringify(todos));
  }, [todos]);

  const completedCount = todos.filter((t) => t.completed).length;
  const totalCount = todos.length;
  const percent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const toggleTodo = (id: string) => {
    setTodos((prev) =>
      prev.map((t) => {
        if (t.id === id) {
          return { ...t, completed: !t.completed };
        }
        return t;
      })
    );
  };

  const handleAddTodo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTodoText.trim()) return;

    const newItem: PersonalTodoItem = {
      id: `todo-${Date.now()}`,
      text: newTodoText.trim(),
      completed: false,
      category: newTodoCategory,
      priority: 'normal',
    };

    setTodos([...todos, newItem]);
    setNewTodoText('');
    onShowToast(`Added to your personal packing list!`);
  };

  const handleDeleteTodo = (id: string) => {
    setTodos((prev) => prev.filter((t) => t.id !== id));
    onShowToast('Item removed from personal packing list.');
  };

  const getCategoryBadge = (cat?: string) => {
    switch (cat) {
      case 'document':
        return { label: 'Document', color: 'bg-purple-100 text-purple-800' };
      case 'clothes':
        return { label: 'Clothing', color: 'bg-blue-100 text-blue-800' };
      case 'electronics':
        return { label: 'Electronics', color: 'bg-amber-100 text-amber-800' };
      case 'snack':
        return { label: 'Trail Food', color: 'bg-emerald-100 text-emerald-800' };
      default:
        return { label: 'Personal', color: 'bg-slate-100 text-slate-700' };
    }
  };

  return (
    <div
      className={`bg-white rounded-3xl border border-slate-200 p-4.5 shadow-sm overflow-hidden ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center shadow-md shadow-amber-500/15">
            <ListTodo className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-sm font-extrabold text-slate-900 tracking-tight">
                My Packing List
              </h3>
              <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300">
                Personal Notes
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              Track the items you need to pack.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <span
            className={`px-2.5 py-0.5 rounded-full text-xs font-black ${
              percent === 100
                ? 'bg-emerald-100 text-emerald-900'
                : 'bg-amber-100 text-amber-900'
            }`}
          >
            {completedCount}/{totalCount} Packed
          </span>

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center cursor-pointer transition-colors"
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Progress Line */}
      <div className="py-2.5 space-y-1.5">
        <div className="flex items-center justify-between text-xs font-bold text-slate-700">
          <span>Packing Progress</span>
          <span className="text-amber-800 font-mono">{percent}%</span>
        </div>
        <div className="w-full h-2 rounded-full bg-slate-100 border border-slate-200 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full transition-all duration-500"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      {isExpanded && (
        <div className="space-y-3 pt-1 animate-in fade-in duration-200">
          {/* Add Todo Input */}
          <form onSubmit={handleAddTodo} className="space-y-2">
            <div className="flex gap-2">
              <input
                type="text"
                value={newTodoText}
                onChange={(e) => setNewTodoText(e.target.value)}
                placeholder="Add a packing item..."
                className="flex-1 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:bg-white focus:border-amber-500 outline-none"
              />
              <button
                type="submit"
                className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white text-xs font-bold shadow-xs active:scale-95 transition-transform flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            </div>

            {/* Quick Category Selector */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 text-[10px]">
              <span className="text-slate-400 font-semibold shrink-0">Tag:</span>
              {(['document', 'clothes', 'electronics', 'snack', 'other'] as const).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setNewTodoCategory(cat)}
                  className={`px-2 py-0.5 rounded-lg font-bold capitalize transition-colors cursor-pointer ${
                    newTodoCategory === cat
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </form>

          {/* List of Personal Todos */}
          <div className="space-y-2 max-h-56 overflow-y-auto no-scrollbar pr-0.5">
            {todos.length === 0 ? (
              <div className="p-5 rounded-2xl bg-slate-50 border border-dashed border-slate-200 text-center space-y-1.5">
                <p className="text-xs font-bold text-slate-700">No Personal Packing Items</p>
                <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
                  Add an item above and tap &apos;Add&apos; to save it.
                </p>
              </div>
            ) : (
              todos.map((todo) => {
                const badge = getCategoryBadge(todo.category);
                return (
                  <div
                    key={todo.id}
                    onClick={() => toggleTodo(todo.id)}
                    className={`p-2.5 rounded-2xl border transition-colors duration-150 cursor-pointer flex items-center justify-between gap-2 shadow-2xs select-none min-h-[54px] ${
                      todo.completed
                        ? 'bg-amber-50/50 border-amber-200/80'
                        : 'bg-white border-slate-200 hover:border-amber-400'
                    }`}
                  >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="shrink-0 flex items-center justify-center">
                      {todo.completed ? (
                        <CheckCircle2 className="w-5 h-5 text-amber-600 fill-amber-100" />
                      ) : (
                        <Circle className="w-5 h-5 text-slate-300 group-hover:text-amber-500" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <p
                        className={`text-xs font-semibold leading-tight ${
                          todo.completed
                            ? 'text-slate-400 line-through decoration-amber-500/60'
                            : 'text-slate-800'
                        }`}
                      >
                        {todo.text}
                      </p>
                      <span
                        className={`inline-block mt-1 px-1.5 py-0.2 rounded text-[9px] font-bold ${badge.color}`}
                      >
                        {badge.label}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteTodo(todo.id);
                    }}
                    className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                    title="Delete note"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            }))}
          </div>
        </div>
      )}
    </div>
  );
};
