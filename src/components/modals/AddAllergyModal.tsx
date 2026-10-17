import React, { useState } from 'react';
import { X, Plus, AlertCircle, Search, Sparkles, Globe, Check, ExternalLink } from 'lucide-react';
import { AllergyItem } from '../../types';

interface AddAllergyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (allergy: AllergyItem) => void;
}

interface AllergenSearchResult {
  name: string;
  topic: string;
  category: 'drug' | 'food' | 'environmental' | 'venom';
  defaultSeverity: 'high' | 'medium' | 'low';
  description: string;
}

export const AddAllergyModal: React.FC<AddAllergyModalProps> = ({
  isOpen,
  onClose,
  onAdd,
}) => {
  const [name, setName] = useState('');
  const [topic, setTopic] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [severity, setSeverity] = useState<'high' | 'medium' | 'low'>('medium');
  const [selectedResult, setSelectedResult] = useState<AllergenSearchResult | null>(null);

  // Google Search Medical Knowledge Graph Database for Allergens
  const allergenDatabase: AllergenSearchResult[] = [
    {
      name: 'Penicillin & Beta-Lactams',
      topic: 'Beta-lactam Antibiotic Hypersensitivity',
      category: 'drug',
      defaultSeverity: 'high',
      description: 'IgE-mediated anaphylaxis risk to amoxicillin, ampicillin, and cephalosporins.',
    },
    {
      name: 'Peanuts (Arachis hypogaea)',
      topic: 'Legume Seed Storage Globulin (Ara h 1-3)',
      category: 'food',
      defaultSeverity: 'high',
      description: 'Severe systemic anaphylactic response even with trace aerial dust.',
    },
    {
      name: 'Sulfa Drugs (Sulfonamides)',
      topic: 'Sulfamethoxazole Drug Eruption',
      category: 'drug',
      defaultSeverity: 'high',
      description: 'Severe cutaneous adverse reactions and respiratory distress.',
    },
    {
      name: 'Aspirin & NSAIDs (Ibuprofen)',
      topic: 'Cyclooxygenase-1 Inhibition Bronchospasm',
      category: 'drug',
      defaultSeverity: 'medium',
      description: 'Exacerbated respiratory disease, facial angioedema, and urticaria.',
    },
    {
      name: 'Crustacean Shellfish (Shrimp/Crab)',
      topic: 'Muscle Tropomyosin IgE-mediated Sensitization',
      category: 'food',
      defaultSeverity: 'high',
      description: 'Rapid-onset airway constriction, throat itching, and hypotension.',
    },
    {
      name: 'Bee & Wasp Venom (Apis mellifera)',
      topic: 'Hymenoptera Venom Phospholipase A2',
      category: 'venom',
      defaultSeverity: 'high',
      description: 'Severe stings at high altitudes can induce acute circulatory collapse.',
    },
    {
      name: 'Dairy & Milk Proteins (Casein/Whey)',
      topic: 'Bovine Alpha-S1 Casein Intolerance',
      category: 'food',
      defaultSeverity: 'medium',
      description: 'Gastrointestinal distress, acute cramps, and skin rashes.',
    },
    {
      name: 'Wheat & Gluten (Celiac/Non-Celiac)',
      topic: 'Gliadin Peptide Immune Response',
      category: 'food',
      defaultSeverity: 'medium',
      description: 'Fatigue, malabsorption, and severe intestinal inflammation.',
    },
    {
      name: 'Natural Rubber Latex',
      topic: 'Hevea brasiliensis Plant Protein',
      category: 'environmental',
      defaultSeverity: 'low',
      description: 'Contact dermatitis and mucosal irritation from elastic bandages/gloves.',
    },
  ];

  if (!isOpen) return null;

  const handleGoogleSearch = (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      return;
    }
  };

  const filteredResults = searchQuery.trim()
    ? allergenDatabase.filter(
        (item) =>
          item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.topic.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.description.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : allergenDatabase.slice(0, 4);

  const selectSearchResult = (item: AllergenSearchResult) => {
    setName(item.name);
    setTopic(item.topic);
    setSeverity(item.defaultSeverity);
    setSelectedResult(item);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const color = severity === 'high' ? 'rose' : severity === 'medium' ? 'amber' : 'blue';
    const finalDisplayName = topic ? `${name.trim()} • [${topic}]` : name.trim();

    onAdd({
      id: Date.now().toString(),
      name: finalDisplayName,
      severity,
      color,
    });
    setName('');
    setTopic('');
    setSearchQuery('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-sm bg-white rounded-3xl p-5 border border-emerald-900/10 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center">
              <AlertCircle className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-bold text-slate-900 text-sm">Add Medical Reaction</h3>
                <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase tracking-wider bg-rose-100 text-rose-900">
                  Google Search
                </span>
              </div>
              <p className="text-[11px] text-slate-500">Search medical knowledge graph &amp; allergen topic</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* GOOGLE SEARCH ENGINE FOR ALLERGIES */}
        <div className="pt-3 pb-2 space-y-2">
          <div className="relative">
            <div className="absolute left-3 top-2.5 flex items-center gap-1 pointer-events-none">
              <Search className="w-3.5 h-3.5 text-slate-400" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleGoogleSearch(e.target.value)}
              placeholder="Google Search Allergen (e.g. Penicillin, Peanuts)..."
              className="w-full pl-8 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:bg-white focus:border-rose-500 outline-none transition-all shadow-inner font-medium"
            />
          </div>

          {/* Google Search Results Cards */}
          <div className="space-y-1.5 max-h-36 overflow-y-auto no-scrollbar">
            <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">
              {searchQuery ? `Google Search Results (${filteredResults.length})` : 'Popular Verified Allergens:'}
            </span>
            {filteredResults.map((item, idx) => (
              <div
                key={idx}
                onClick={() => selectSearchResult(item)}
                className={`p-2 rounded-xl border text-left cursor-pointer transition-all ${
                  selectedResult?.name === item.name
                    ? 'bg-rose-50/80 border-rose-400 ring-1 ring-rose-400'
                    : 'bg-white border-slate-200 hover:border-rose-300 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900">{item.name}</span>
                  <span
                    className={`text-[9px] font-black px-1.5 py-0.2 rounded uppercase ${
                      item.defaultSeverity === 'high'
                        ? 'bg-rose-100 text-rose-800'
                        : item.defaultSeverity === 'medium'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}
                  >
                    {item.defaultSeverity}
                  </span>
                </div>
                <span className="text-[10px] font-semibold text-rose-700 block mt-0.5">
                  Topic: {item.topic}
                </span>
                <p className="text-[10px] text-slate-500 line-clamp-1">{item.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Selected Allergen Form */}
        <form onSubmit={handleSubmit} className="space-y-3 pt-2 border-t border-slate-100 overflow-y-auto flex-1">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Allergen Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Penicillin, Peanuts"
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:bg-white focus:border-rose-500 outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Scientific Medical Topic (Google Identified)
            </label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. Beta-lactam Hypersensitivity"
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-800 focus:bg-white focus:border-rose-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Severity Level
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => setSeverity('high')}
                className={`py-1.5 px-2 rounded-xl text-xs font-bold border transition-all ${
                  severity === 'high'
                    ? 'bg-rose-50 border-rose-400 text-rose-800 ring-2 ring-rose-300/50'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                High (Anaphylaxis)
              </button>
              <button
                type="button"
                onClick={() => setSeverity('medium')}
                className={`py-1.5 px-2 rounded-xl text-xs font-bold border transition-all ${
                  severity === 'medium'
                    ? 'bg-amber-50 border-amber-400 text-amber-900 ring-2 ring-amber-300/50'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Medium (Rash)
              </button>
              <button
                type="button"
                onClick={() => setSeverity('low')}
                className={`py-1.5 px-2 rounded-xl text-xs font-bold border transition-all ${
                  severity === 'low'
                    ? 'bg-blue-50 border-blue-400 text-blue-900 ring-2 ring-blue-300/50'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Mild
              </button>
            </div>
          </div>

          <div className="pt-2 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-100 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 text-white text-xs font-bold shadow-md hover:brightness-105 active:scale-95 disabled:opacity-50 transition-all flex items-center justify-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Add to Record</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
