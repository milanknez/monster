import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Trash2, ShieldAlert, Award, Swords, Layers } from 'lucide-react';
import { DungeonConfig, DungeonWaveConfig } from '../../../data/dungeons';
import { getLoc } from '../../../utils';

interface DungeonEditorTabProps {
  dungeons: DungeonConfig[];
  onSave: (data: DungeonConfig[]) => void;
}

export const DungeonEditorTab = ({ dungeons, onSave }: DungeonEditorTabProps) => {
  const [list, setList] = useState<DungeonConfig[]>(dungeons);
  const [selectedId, setSelectedId] = useState<string | null>(dungeons[0]?.id || null);
  const [form, setForm] = useState<DungeonConfig | null>(null);

  useEffect(() => {
    setList(dungeons);
    if (dungeons.length > 0 && !selectedId) {
      setSelectedId(dungeons[0].id);
    }
  }, [dungeons]);

  useEffect(() => {
    const selected = list.find((d) => d.id === selectedId);
    if (selected) {
      setForm(JSON.parse(JSON.stringify(selected))); // Deep clone
    } else {
      setForm(null);
    }
  }, [selectedId, list]);

  const handleAddField = (field: keyof DungeonConfig, subField: string, value: any) => {
    if (!form) return;
    const updated = { ...form };
    (updated[field] as any)[subField] = value;
    setForm(updated);
  };

  const handleUpdateWave = (waveIdx: number, key: keyof DungeonWaveConfig, value: any) => {
    if (!form) return;
    const updated = { ...form };
    const wave = updated.waves.find((w) => w.waveIndex === waveIdx);
    if (wave) {
      (wave as any)[key] = value;
      setForm(updated);
    }
  };

  const handleUpdateLootTable = (type: 'waveDrops' | 'bossDrops', key: string | number, value: any) => {
    if (!form) return;
    const updated = { ...form };
    if (type === 'waveDrops') {
      const idx = Number(key);
      if (!updated.lootTable.waveDrops[idx]) {
        updated.lootTable.waveDrops[idx] = { chance: 0.15, rarity: 'rare' };
      }
      (updated.lootTable.waveDrops[idx] as any) = value;
    } else {
      (updated.lootTable.bossDrops as any)[key] = value;
    }
    setForm(updated);
  };

  const handleSaveDungeon = () => {
    if (!form) return;
    const nextList = list.map((d) => (d.id === form.id ? form : d));
    setList(nextList);
    onSave(nextList);
    alert('Dungeon uložen v paměti panelu. Uložte změny tlačítkem "Uložit Změny" nahoře pro zápis do souboru.');
  };

  const handleAddDungeon = () => {
    const newId = `dungeon_${Date.now()}`;
    const newDung: DungeonConfig = {
      id: newId,
      name: { cz: 'Nový Dungeon', en: 'New Dungeon', sk: 'Nový dungeon' },
      description: { cz: 'Popis nového dungeonu...', en: 'Description...', sk: 'Popis...' },
      backgroundImage: '/dark_cave_bg.png',
      recommendedLevel: 15,
      waves: [
        { waveIndex: 1, enemyRarityPool: 'rare', enemyCount: 2, cloneSameMonster: true, baseHp: 2000, level: 10 },
        { waveIndex: 2, enemyRarityPool: 'epic', enemyCount: 2, cloneSameMonster: true, baseHp: 3500, level: 15, shield: 500 },
        { waveIndex: 3, enemyRarityPool: 'legendary', enemyCount: 1, cloneSameMonster: false, baseHp: 8000, level: 20, shield: 1500 }
      ],
      lootTable: {
        waveDrops: {
          1: { chance: 0.10, rarity: 'common' },
          2: { chance: 0.15, rarity: 'rare' }
        },
        bossDrops: {
          chance: 1.0,
          rarityDistribution: {
            legendary: 0.55,
            epic: 0.30,
            rare: 0.15
          }
        }
      }
    };
    const nextList = [...list, newDung];
    setList(nextList);
    setSelectedId(newId);
  };

  const handleDeleteDungeon = (id: string) => {
    if (!confirm('Opravdu chcete tento dungeon smazat?')) return;
    const nextList = list.filter((d) => d.id !== id);
    setList(nextList);
    setSelectedId(nextList[0]?.id || null);
    onSave(nextList);
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      
      {/* Left List */}
      <div className="w-full lg:w-80 bg-slate-900 border border-white/5 rounded-3xl p-4 flex flex-col gap-4">
        <div className="flex justify-between items-center px-2">
          <h3 className="text-xs font-black uppercase text-slate-500 tracking-wider">Seznam Dungeonů</h3>
          <button
            onClick={handleAddDungeon}
            className="p-2 bg-primary/10 border border-primary/25 rounded-xl hover:bg-primary/20 text-primary transition active:scale-95 cursor-pointer"
          >
            <Plus size={16} />
          </button>
        </div>

        <div className="flex flex-col gap-2 max-h-[60vh] overflow-y-auto pr-1">
          {list.map((dung) => (
            <div
              key={dung.id}
              onClick={() => setSelectedId(dung.id)}
              className={`p-3.5 rounded-2xl border text-left cursor-pointer transition flex items-center justify-between group ${
                selectedId === dung.id
                  ? 'bg-primary/10 border-primary/30 text-primary'
                  : 'bg-black/25 border-transparent hover:bg-white/5 text-slate-300'
              }`}
            >
              <div className="min-w-0">
                <span className="text-[10px] font-black tracking-widest text-slate-500 block">ID: {dung.id}</span>
                <span className="text-xs font-bold block truncate mt-0.5">{getLoc(dung.name, 'cz')}</span>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteDungeon(dung.id);
                }}
                className="opacity-0 group-hover:opacity-100 p-1.5 hover:text-rose-500 transition cursor-pointer"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Right Form */}
      <div className="flex-1 bg-slate-900 border border-white/5 rounded-3xl p-6 relative">
        {form ? (
          <div className="space-y-6">
            
            {/* Title / Header */}
            <div className="flex justify-between items-center border-b border-white/5 pb-4">
              <div>
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Editace parametrů</span>
                <h3 className="text-lg font-black text-white italic uppercase tracking-tighter mt-0.5">
                  {getLoc(form.name, 'cz')}
                </h3>
              </div>
              <button
                onClick={handleSaveDungeon}
                className="px-5 py-2 bg-emerald-600 border border-emerald-500/30 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-emerald-500 transition cursor-pointer"
              >
                Uložit rozpracované
              </button>
            </div>

            {/* Base Config Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-[9px] font-black uppercase text-slate-500 tracking-wider">Identifikátor (ID)</label>
                <input
                  type="text"
                  value={form.id}
                  disabled
                  className="w-full bg-black/40 border border-white/5 rounded-xl px-3 py-2 text-xs text-slate-400 font-mono mt-1 opacity-50 cursor-not-allowed"
                />
              </div>
              <div>
                <label className="text-[9px] font-black uppercase text-slate-500 tracking-wider">Doporučený Level hrdinů</label>
                <input
                  type="number"
                  value={form.recommendedLevel}
                  onChange={(e) => setForm({ ...form, recommendedLevel: Number(e.target.value) })}
                  className="w-full bg-black border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono mt-1 focus:border-primary/50"
                />
              </div>
              <div className="md:col-span-2">
                <label className="text-[9px] font-black uppercase text-slate-500 tracking-wider">Obrázek na pozadí (Background Path)</label>
                <input
                  type="text"
                  value={form.backgroundImage}
                  onChange={(e) => setForm({ ...form, backgroundImage: e.target.value })}
                  className="w-full bg-black border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono mt-1 focus:border-primary/50"
                />
              </div>
            </div>

            {/* Name Localizations */}
            <div className="space-y-2">
              <span className="text-[9px] font-black uppercase text-primary/70 tracking-widest block border-b border-white/5 pb-1">Lokalizace Názvu</span>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {['cz', 'en', 'sk'].map((loc) => (
                  <div key={loc}>
                    <label className="text-[8px] font-black uppercase text-slate-500">{loc.toUpperCase()}</label>
                    <input
                      type="text"
                      value={(form.name as any)[loc] || ''}
                      onChange={(e) => handleAddField('name', loc, e.target.value)}
                      className="w-full bg-black border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white mt-1"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Description Localizations */}
            <div className="space-y-2">
              <span className="text-[9px] font-black uppercase text-primary/70 tracking-widest block border-b border-white/5 pb-1">Lokalizace Popisu</span>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {['cz', 'en', 'sk'].map((loc) => (
                  <div key={loc}>
                    <label className="text-[8px] font-black uppercase text-slate-500">{loc.toUpperCase()}</label>
                    <textarea
                      value={(form.description as any)[loc] || ''}
                      onChange={(e) => handleAddField('description', loc, e.target.value)}
                      className="w-full h-16 bg-black border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white mt-1 resize-none"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Waves Editor */}
            <div className="space-y-4">
              <span className="text-[10px] font-black uppercase text-amber-500 tracking-widest block border-b border-white/5 pb-1 flex items-center gap-1.5">
                <Swords size={12} /> Nastavení jednotlivých vln
              </span>
              <div className="grid grid-cols-1 gap-4">
                {form.waves.map((wave) => (
                  <div key={wave.waveIndex} className="bg-black/35 border border-white/5 p-4 rounded-2xl space-y-3 relative overflow-hidden">
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] font-black px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/15">
                        VLNA {wave.waveIndex}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                      <div>
                        <label className="text-[8px] font-black uppercase text-slate-500">Rarita Poolu</label>
                        <select
                          value={wave.enemyRarityPool}
                          onChange={(e) => handleUpdateWave(wave.waveIndex, 'enemyRarityPool', e.target.value)}
                          className="w-full bg-slate-950 border border-white/10 rounded-lg px-2 py-1 text-[11px] text-white mt-1 outline-none"
                        >
                          <option value="rare">Vzácná (Rare)</option>
                          <option value="epic">Epická (Epic)</option>
                          <option value="legendary">Legendární</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[8px] font-black uppercase text-slate-500">Počet nepřátel</label>
                        <input
                          type="number"
                          value={wave.enemyCount}
                          onChange={(e) => handleUpdateWave(wave.waveIndex, 'enemyCount', Number(e.target.value))}
                          className="w-full bg-slate-950 border border-white/10 rounded-lg px-2 py-1 text-[11px] text-white font-mono mt-1"
                        />
                      </div>

                      <div>
                        <label className="text-[8px] font-black uppercase text-slate-500">Základní HP</label>
                        <input
                          type="number"
                          value={wave.baseHp}
                          onChange={(e) => handleUpdateWave(wave.waveIndex, 'baseHp', Number(e.target.value))}
                          className="w-full bg-slate-950 border border-white/10 rounded-lg px-2 py-1 text-[11px] text-white font-mono mt-1"
                        />
                      </div>

                      <div>
                        <label className="text-[8px] font-black uppercase text-slate-500">Úroveň (Level)</label>
                        <input
                          type="number"
                          value={wave.level}
                          onChange={(e) => handleUpdateWave(wave.waveIndex, 'level', Number(e.target.value))}
                          className="w-full bg-slate-950 border border-white/10 rounded-lg px-2 py-1 text-[11px] text-white font-mono mt-1"
                        />
                      </div>

                      <div>
                        <label className="text-[8px] font-black uppercase text-slate-500">Štít (Shield)</label>
                        <input
                          type="number"
                          value={wave.shield || 0}
                          onChange={(e) => handleUpdateWave(wave.waveIndex, 'shield', Number(e.target.value))}
                          className="w-full bg-slate-950 border border-white/10 rounded-lg px-2 py-1 text-[11px] text-white font-mono mt-1"
                        />
                      </div>

                      <div className="flex items-center gap-2 mt-4 pl-1">
                        <input
                          type="checkbox"
                          id={`clone-${wave.waveIndex}`}
                          checked={wave.cloneSameMonster}
                          onChange={(e) => handleUpdateWave(wave.waveIndex, 'cloneSameMonster', e.target.checked)}
                          className="size-3.5 bg-slate-950 border border-white/10 rounded outline-none"
                        />
                        <label htmlFor={`clone-${wave.waveIndex}`} className="text-[8px] font-black uppercase text-slate-400 cursor-pointer">Stejné příšery</label>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Loot Table Editor */}
            <div className="space-y-4">
              <span className="text-[10px] font-black uppercase text-purple-400 tracking-widest block border-b border-white/5 pb-1 flex items-center gap-1.5">
                <Award size={12} /> Konfigurace Dropů a Lootu
              </span>

              <div className="bg-black/35 border border-white/5 p-4 rounded-2xl space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  
                  {/* Wave Drops */}
                  <div className="space-y-3">
                    <h4 className="text-[9px] font-black uppercase text-slate-400">Dropy z běžných vln (%)</h4>
                    <div className="space-y-2">
                      {[1, 2].map((idx) => {
                        const val = form.lootTable.waveDrops[idx] || { chance: 0.15, rarity: 'rare' };
                        return (
                          <div key={idx} className="flex gap-2 items-center">
                            <span className="text-[9px] font-bold text-slate-500 w-16">Vlna {idx}:</span>
                            <input
                              type="number"
                              step="0.05"
                              value={val.chance}
                              onChange={(e) => handleUpdateLootTable('waveDrops', idx, { ...val, chance: Number(e.target.value) })}
                              className="w-18 bg-slate-950 border border-white/10 rounded-lg px-2 py-1 text-[11px] text-white font-mono"
                              placeholder="Šance"
                            />
                            <select
                              value={val.rarity}
                              onChange={(e) => handleUpdateLootTable('waveDrops', idx, { ...val, rarity: e.target.value })}
                              className="bg-slate-950 border border-white/10 rounded-lg px-2 py-1 text-[11px] text-white outline-none"
                            >
                              <option value="common">Běžná (Common)</option>
                              <option value="rare">Vzácná (Rare)</option>
                              <option value="epic">Epická (Epic)</option>
                            </select>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Boss Drops */}
                  <div className="space-y-3 border-t md:border-t-0 md:border-l border-white/5 pt-3 md:pt-0 md:pl-4">
                    <h4 className="text-[9px] font-black uppercase text-slate-400">Distribuce lootu z Bosse (Suma = 1.0)</h4>
                    <div className="space-y-2">
                      <div className="flex gap-2 items-center">
                        <span className="text-[9px] font-bold text-slate-500 w-20">Legendary:</span>
                        <input
                          type="number"
                          step="0.05"
                          value={form.lootTable.bossDrops.rarityDistribution.legendary}
                          onChange={(e) => handleUpdateLootTable('bossDrops', 'rarityDistribution', {
                            ...form.lootTable.bossDrops.rarityDistribution,
                            legendary: Number(e.target.value)
                          })}
                          className="w-20 bg-slate-950 border border-white/10 rounded-lg px-2 py-1 text-[11px] text-white font-mono"
                        />
                      </div>
                      <div className="flex gap-2 items-center">
                        <span className="text-[9px] font-bold text-slate-500 w-20">Epic:</span>
                        <input
                          type="number"
                          step="0.05"
                          value={form.lootTable.bossDrops.rarityDistribution.epic}
                          onChange={(e) => handleUpdateLootTable('bossDrops', 'rarityDistribution', {
                            ...form.lootTable.bossDrops.rarityDistribution,
                            epic: Number(e.target.value)
                          })}
                          className="w-20 bg-slate-950 border border-white/10 rounded-lg px-2 py-1 text-[11px] text-white font-mono"
                        />
                      </div>
                      <div className="flex gap-2 items-center">
                        <span className="text-[9px] font-bold text-slate-500 w-20">Rare:</span>
                        <input
                          type="number"
                          step="0.05"
                          value={form.lootTable.bossDrops.rarityDistribution.rare}
                          onChange={(e) => handleUpdateLootTable('bossDrops', 'rarityDistribution', {
                            ...form.lootTable.bossDrops.rarityDistribution,
                            rare: Number(e.target.value)
                          })}
                          className="w-20 bg-slate-950 border border-white/10 rounded-lg px-2 py-1 text-[11px] text-white font-mono"
                        />
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            </div>

          </div>
        ) : (
          <div className="py-20 text-center opacity-25 italic text-[11px] uppercase tracking-wider">
            Zvolte dungeon ze seznamu k editaci
          </div>
        )}
      </div>

    </div>
  );
};
