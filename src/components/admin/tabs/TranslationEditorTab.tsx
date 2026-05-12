import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Globe, Search, Plus, Trash2, Save, Languages, Hash, Layout, RefreshCw, Check } from 'lucide-react'
import { cn } from '../../../utils'
import { useTranslation } from 'react-i18next'

interface TranslationEditorTabProps {
  resources: any;
  onSave: (newResources: any) => void;
  monsterTypes: any[];
  monsterRarities: any[];
  onSaveValues: (types: any[], rarities: any[]) => void;
}

export const TranslationEditorTab = ({ 
  resources, 
  onSave,
  monsterTypes,
  monsterRarities,
  onSaveValues
}: TranslationEditorTabProps) => {
  const { t, i18n } = useTranslation();
  const [activeSubTab, setActiveSubTab] = useState<'ui' | 'values'>('ui');
  const [search, setSearch] = useState('');
  const [localResources, setLocalResources] = useState(resources);
  const [isSaving, setIsSaving] = useState(false);

  // Flat structure for easier searching and editing of nested i18n keys
  const flattenedKeys = useMemo(() => {
    const keys: { key: string, cz: string, en: string, sk: string }[] = [];
    
    const flatten = (obj: any, path = '') => {
      // Use CZ as the base keys source
      Object.keys(obj).forEach(k => {
        const newPath = path ? `${path}.${k}` : k;
        if (typeof obj[k] === 'object' && obj[k] !== null) {
          flatten(obj[k], newPath);
        } else {
          keys.push({
            key: newPath,
            cz: obj[k] || '',
            en: localResources.en ? getDeepValue(localResources.en, newPath) : '',
            sk: localResources.sk ? getDeepValue(localResources.sk, newPath) : ''
          });
        }
      });
    };

    if (localResources.cz) {
      flatten(localResources.cz);
    }
    return keys;
  }, [localResources]);

  const filteredKeys = flattenedKeys.filter(k => 
    k.key.toLowerCase().includes(search.toLowerCase()) ||
    k.cz.toLowerCase().includes(search.toLowerCase()) ||
    k.en.toLowerCase().includes(search.toLowerCase()) ||
    k.sk.toLowerCase().includes(search.toLowerCase())
  );

  function getDeepValue(obj: any, path: string) {
    return path.split('.').reduce((acc, part) => acc && acc[part], obj) || '';
  }

  function setDeepValue(obj: any, path: string, value: string) {
    const parts = path.split('.');
    let current = obj;
    for (let i = 0; i < parts.length - 1; i++) {
      if (!current[parts[i]]) current[parts[i]] = {};
      current = current[parts[i]];
    }
    current[parts[parts.length - 1]] = value;
  }

  const handleUpdateKey = (key: string, lang: string, value: string) => {
    const newRes = JSON.parse(JSON.stringify(localResources));
    if (!newRes[lang]) newRes[lang] = {};
    setDeepValue(newRes[lang], key, value);
    setLocalResources(newRes);
  };

  const handleSaveAll = async () => {
    setIsSaving(true);
    // Simulate API call
    await new Promise(r => setTimeout(r, 1000));
    onSave(localResources);
    setIsSaving(false);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* SUB TABS */}
      <div className="flex gap-4 border-b border-white/5 pb-4">
        <button 
          onClick={() => setActiveSubTab('ui')}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
            activeSubTab === 'ui' ? "bg-primary text-slate-950" : "bg-white/5 text-slate-500 hover:bg-white/10"
          )}
        >
          <Layout size={14} /> UI Slovník
        </button>
        <button 
          onClick={() => setActiveSubTab('values')}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
            activeSubTab === 'values' ? "bg-primary text-slate-950" : "bg-white/5 text-slate-500 hover:bg-white/10"
          )}
        >
          <Hash size={14} /> Herní Číselníky
        </button>
      </div>

      {activeSubTab === 'ui' ? (
        <div className="space-y-4">
          <div className="flex justify-between items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
              <input 
                type="text"
                placeholder="Hledat v klíčích nebo překladech..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-3 text-sm text-white focus:outline-none focus:border-primary/50 transition-all font-bold"
              />
            </div>
            <button 
              onClick={handleSaveAll}
              disabled={isSaving}
              className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-500/10"
            >
              {isSaving ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />} 
              {isSaving ? 'Ukládám...' : 'Uložit Slovník'}
            </button>
          </div>

          <div className="bg-slate-950/50 border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white/5 border-b border-white/10 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                    <th className="px-6 py-4">Klíč / Cesta</th>
                    <th className="px-6 py-4 border-l border-white/5">🇨🇿 Česky</th>
                    <th className="px-6 py-4 border-l border-white/5">🇸🇰 Slovensky</th>
                    <th className="px-6 py-4 border-l border-white/5">🇺🇸 English</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredKeys.map((k) => (
                    <tr key={k.key} className="group hover:bg-white/[0.02] transition-colors">
                      <td className="px-6 py-3 text-[10px] font-mono text-primary/70">{k.key}</td>
                      <td className="px-6 py-3 border-l border-white/5">
                        <textarea 
                          value={k.cz}
                          onChange={(e) => handleUpdateKey(k.key, 'cz', e.target.value)}
                          className="w-full bg-transparent border-none text-xs font-bold text-slate-200 resize-none focus:ring-0 p-0 custom-scrollbar leading-relaxed"
                          rows={1}
                        />
                      </td>
                      <td className="px-6 py-3 border-l border-white/5">
                        <textarea 
                          value={k.sk}
                          onChange={(e) => handleUpdateKey(k.key, 'sk', e.target.value)}
                          className="w-full bg-transparent border-none text-xs font-bold text-slate-400 focus:text-slate-200 resize-none focus:ring-0 p-0 custom-scrollbar leading-relaxed"
                          rows={1}
                        />
                      </td>
                      <td className="px-6 py-3 border-l border-white/5">
                        <textarea 
                          value={k.en}
                          onChange={(e) => handleUpdateKey(k.key, 'en', e.target.value)}
                          className="w-full bg-transparent border-none text-xs font-bold text-slate-400 focus:text-slate-200 resize-none focus:ring-0 p-0 custom-scrollbar leading-relaxed"
                          rows={1}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-12">
            {/* MONSTER TYPES TABLE */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-primary">
                  <Globe size={18} />
                  <h3 className="text-lg font-black uppercase tracking-tighter italic">Herní Typy</h3>
                </div>
                <button 
                  onClick={() => onSaveValues([...monsterTypes, { cz: 'Nový Typ', en: 'New Type', sk: 'Nový Typ' }], monsterRarities)}
                  className="px-4 py-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2"
                >
                  <Plus size={14} /> Přidat Typ
                </button>
              </div>

              <div className="bg-slate-950/50 border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-white/5 border-b border-white/10 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                      <th className="px-6 py-4">🇨🇿 Česky</th>
                      <th className="px-6 py-4 border-l border-white/5">🇸🇰 Slovensky</th>
                      <th className="px-6 py-4 border-l border-white/5">🇺🇸 English</th>
                      <th className="px-4 py-4 w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {monsterTypes.map((type, idx) => (
                      <tr key={idx} className="group hover:bg-white/[0.02] transition-colors">
                        <td className="px-6 py-3">
                          <input 
                            value={type.cz}
                            onChange={(e) => {
                              const newTypes = [...monsterTypes];
                              newTypes[idx] = { ...type, cz: e.target.value };
                              onSaveValues(newTypes, monsterRarities);
                            }}
                            className="w-full bg-transparent border-none text-xs font-bold text-slate-200 focus:ring-0 p-0"
                          />
                        </td>
                        <td className="px-6 py-3 border-l border-white/5">
                          <input 
                            value={type.sk}
                            onChange={(e) => {
                              const newTypes = [...monsterTypes];
                              newTypes[idx] = { ...type, sk: e.target.value };
                              onSaveValues(newTypes, monsterRarities);
                            }}
                            className="w-full bg-transparent border-none text-xs font-bold text-slate-400 focus:text-slate-200 focus:ring-0 p-0"
                          />
                        </td>
                        <td className="px-6 py-3 border-l border-white/5">
                          <input 
                            value={type.en}
                            onChange={(e) => {
                              const newTypes = [...monsterTypes];
                              newTypes[idx] = { ...type, en: e.target.value };
                              onSaveValues(newTypes, monsterRarities);
                            }}
                            className="w-full bg-transparent border-none text-xs font-bold text-slate-400 focus:text-slate-200 focus:ring-0 p-0"
                          />
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button 
                            onClick={() => {
                              const newTypes = monsterTypes.filter((_, i) => i !== idx);
                              onSaveValues(newTypes, monsterRarities);
                            }}
                            className="p-1.5 text-slate-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* RARITIES TABLE */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-amber-500">
                  <Plus size={18} />
                  <h3 className="text-lg font-black uppercase tracking-tighter italic">Vzácnosti Výskytu</h3>
                </div>
                <button 
                  onClick={() => onSaveValues(monsterTypes, [...monsterRarities, { cz: 'Nová Vzácnost', en: 'New Rarity', sk: 'Nová Vzácnosť' }])}
                  className="px-4 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2"
                >
                  <Plus size={14} /> Přidat Vzácnost
                </button>
              </div>

              <div className="bg-slate-950/50 border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-white/5 border-b border-white/10 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                      <th className="px-6 py-4">🇨🇿 Česky</th>
                      <th className="px-6 py-4 border-l border-white/5">🇸🇰 Slovensky</th>
                      <th className="px-6 py-4 border-l border-white/5">🇺🇸 English</th>
                      <th className="px-4 py-4 w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {monsterRarities.map((rarity, idx) => (
                      <tr key={idx} className="group hover:bg-white/[0.02] transition-colors">
                        <td className="px-6 py-3">
                          <input 
                            value={rarity.cz}
                            onChange={(e) => {
                              const newRarities = [...monsterRarities];
                              newRarities[idx] = { ...rarity, cz: e.target.value };
                              onSaveValues(monsterTypes, newRarities);
                            }}
                            className="w-full bg-transparent border-none text-xs font-bold text-slate-200 focus:ring-0 p-0"
                          />
                        </td>
                        <td className="px-6 py-3 border-l border-white/5">
                          <input 
                            value={rarity.sk}
                            onChange={(e) => {
                              const newRarities = [...monsterRarities];
                              newRarities[idx] = { ...rarity, sk: e.target.value };
                              onSaveValues(monsterTypes, newRarities);
                            }}
                            className="w-full bg-transparent border-none text-xs font-bold text-slate-400 focus:text-slate-200 focus:ring-0 p-0"
                          />
                        </td>
                        <td className="px-6 py-3 border-l border-white/5">
                          <input 
                            value={rarity.en}
                            onChange={(e) => {
                              const newRarities = [...monsterRarities];
                              newRarities[idx] = { ...rarity, en: e.target.value };
                              onSaveValues(monsterTypes, newRarities);
                            }}
                            className="w-full bg-transparent border-none text-xs font-bold text-slate-400 focus:text-slate-200 focus:ring-0 p-0"
                          />
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button 
                            onClick={() => {
                              const newRarities = monsterRarities.filter((_, i) => i !== idx);
                              onSaveValues(monsterTypes, newRarities);
                            }}
                            className="p-1.5 text-slate-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};
