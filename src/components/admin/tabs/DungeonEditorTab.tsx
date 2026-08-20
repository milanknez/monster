import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Trash2, Award, Swords, Image as ImageIcon, Sparkles, Upload, Flame, Droplets, Leaf, Zap, Package, Percent } from 'lucide-react';
import { DungeonConfig, DungeonWaveConfig, BossSpecificDrop } from '../../../data/dungeons';
import { RESOURCE_CONFIG } from '../../../data/resources';
import { getLoc, cn } from '../../../utils';

interface DungeonEditorTabProps {
  dungeons: DungeonConfig[];
  onSave: (data: DungeonConfig[]) => void;
}

const DUNGEON_ELEMENTS = [
  { id: 'fire', label: 'Oheň (Fire)', icon: Flame, color: 'text-amber-500', bg: 'bg-amber-500/10 border-amber-500/30' },
  { id: 'water', label: 'Voda (Water)', icon: Droplets, color: 'text-sky-400', bg: 'bg-sky-500/10 border-sky-500/30' },
  { id: 'nature', label: 'Příroda (Nature)', icon: Leaf, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30' },
  { id: 'electric', label: 'Blesk (Electric)', icon: Zap, color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/30' }
];

export const DungeonEditorTab = ({ dungeons, onSave }: DungeonEditorTabProps) => {
  const [list, setList] = useState<DungeonConfig[]>(dungeons);
  const [selectedId, setSelectedId] = useState<string | null>(dungeons[0]?.id || null);
  const [form, setForm] = useState<DungeonConfig | null>(null);
  const [isUploadingBg, setIsUploadingBg] = useState(false);
  const [uploadingWaveEnemy, setUploadingWaveEnemy] = useState<number | null>(null);

  const availableResources = Object.entries(RESOURCE_CONFIG).map(([id, conf]) => ({
    id,
    label: getLoc(conf.label, 'cz') || id,
    icon: conf.icon,
    rarity: conf.rarity || 'common'
  }));

  useEffect(() => {
    setList(dungeons);
    if (dungeons.length > 0 && !selectedId) {
      setSelectedId(dungeons[0].id);
    }
  }, [dungeons]);

  useEffect(() => {
    const selected = list.find((d) => d.id === selectedId);
    if (selected) {
      const cloned = JSON.parse(JSON.stringify(selected));
      // Zajištění kompatibilního lootTable
      if (!cloned.lootTable.specificDrops) {
        cloned.lootTable.specificDrops = [];
      }
      if (cloned.lootTable.randomDropsCount === undefined) {
        cloned.lootTable.randomDropsCount = 2;
      }
      if (!cloned.lootTable.rarityDistribution) {
        cloned.lootTable.rarityDistribution = { legendary: 0.2, epic: 0.4, rare: 0.4 };
      }
      setForm(cloned);
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

  const handleUpdateWaveEnemyName = (waveIdx: number, lang: 'cz' | 'en' | 'sk', value: string) => {
    if (!form) return;
    const updated = { ...form };
    const wave = updated.waves.find((w) => w.waveIndex === waveIdx);
    if (wave) {
      const currentName = typeof wave.enemyName === 'object'
        ? { ...wave.enemyName }
        : { cz: wave.enemyName || '', en: wave.enemyName || '', sk: wave.enemyName || '' };
      currentName[lang] = value;
      wave.enemyName = currentName;
      setForm(updated);
    }
  };

  const handleAddSpecificDrop = () => {
    if (!form) return;
    const updated = { ...form };
    const defaultRes = availableResources[0]?.id || 'crystal';
    const newDrop: BossSpecificDrop = {
      resourceId: defaultRes,
      chance: 1.0,
      minAmount: 1,
      maxAmount: 3
    };
    updated.lootTable.specificDrops = [...(updated.lootTable.specificDrops || []), newDrop];
    setForm(updated);
  };

  const handleUpdateSpecificDrop = (idx: number, key: keyof BossSpecificDrop, value: any) => {
    if (!form) return;
    const updated = { ...form };
    const drops = [...(updated.lootTable.specificDrops || [])];
    if (drops[idx]) {
      drops[idx] = { ...drops[idx], [key]: value };
      updated.lootTable.specificDrops = drops;
      setForm(updated);
    }
  };

  const handleDeleteSpecificDrop = (idx: number) => {
    if (!form) return;
    const updated = { ...form };
    const drops = [...(updated.lootTable.specificDrops || [])].filter((_, i) => i !== idx);
    updated.lootTable.specificDrops = drops;
    setForm(updated);
  };

  const handleUploadBg = async (file: File) => {
    if (!form) return;
    setIsUploadingBg(true);
    try {
      const filename = `${form.id}_bg_${Date.now()}.${file.name.split('.').pop() || 'png'}`;
      const res = await fetch(`/api/save-dungeon-bg?filename=${filename}`, {
        method: 'POST',
        body: file
      });
      if (res.ok) {
        const data = await res.json().catch(() => ({ path: `/${filename}` }));
        const newPath = data.path || `/${filename}`;
        setForm({ ...form, backgroundImage: newPath });
        alert('Obrázek pozadí byl úspěšně nahrán!');
      } else {
        throw new Error('Chyba při nahrávání na server');
      }
    } catch (err) {
      console.error(err);
      const reader = new FileReader();
      reader.onloadend = () => {
        setForm({ ...form, backgroundImage: reader.result as string });
      };
      reader.readAsDataURL(file);
      alert('Obrázek načten lokálně jako náhled.');
    } finally {
      setIsUploadingBg(false);
    }
  };

  const handleUploadEnemyImage = async (waveIdx: number, file: File) => {
    if (!form) return;
    setUploadingWaveEnemy(waveIdx);
    try {
      const filename = `${form.id}_w${waveIdx}_${Date.now()}.${file.name.split('.').pop() || 'png'}`;
      const res = await fetch(`/api/save-dungeon-image?filename=${filename}`, {
        method: 'POST',
        body: file
      });
      if (res.ok) {
        const data = await res.json().catch(() => ({ path: `/dungeon/${filename}` }));
        const newPath = data.path || `/dungeon/${filename}`;
        handleUpdateWave(waveIdx, 'enemyImage', newPath);
        alert(`Obrázek nepřítele pro vlnu ${waveIdx} byl nahrán!`);
      } else {
        throw new Error('Chyba při nahrávání na server');
      }
    } catch (err) {
      console.error(err);
      const reader = new FileReader();
      reader.onloadend = () => {
        handleUpdateWave(waveIdx, 'enemyImage', reader.result as string);
      };
      reader.readAsDataURL(file);
      alert('Obrázek načten lokálně.');
    } finally {
      setUploadingWaveEnemy(null);
    }
  };

  const handleSaveDungeon = () => {
    if (!form) return;
    const nextList = list.map((d) => (d.id === form.id ? form : d));
    setList(nextList);
    onSave(nextList);
    alert('Dungeon uložen v paměti panelu. Nezapomeňte kliknout na "Uložit Změny" nahoře pro trvalý zápis do souboru.');
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
        {
          waveIndex: 1,
          enemyName: { cz: 'Jeskynní Stráž', en: 'Cave Sentinel', sk: 'Jaskynná Stráž' },
          enemyImage: '/dungeon/shadow_bat.png',
          enemyType: 'fire',
          enemyCount: 2,
          baseHp: 15000,
          level: 10
        },
        {
          waveIndex: 2,
          enemyName: { cz: 'Ohnivý Elementál', en: 'Fire Elemental', sk: 'Ohnivý Elementál' },
          enemyImage: '/dungeon/lava_guardian.png',
          enemyType: 'fire',
          enemyCount: 2,
          baseHp: 30000,
          level: 15,
          shield: 5000
        },
        {
          waveIndex: 3,
          enemyName: { cz: 'Pán Plamenů', en: 'Flame Lord', sk: 'Pán Plameňov' },
          enemyImage: '/dungeon/volcano_lord.png',
          enemyType: 'fire',
          enemyCount: 1,
          baseHp: 75000,
          level: 20,
          shield: 15000
        }
      ],
      lootTable: {
        specificDrops: [
          { resourceId: 'crystal', chance: 1.0, minAmount: 2, maxAmount: 5 }
        ],
        randomDropsCount: 2,
        rarityDistribution: {
          legendary: 0.20,
          epic: 0.40,
          rare: 0.40
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
            title="Přidat nový dungeon"
          >
            <Plus size={16} />
          </button>
        </div>

        <div className="flex flex-col gap-2 max-h-[70vh] overflow-y-auto pr-1">
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
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Editace dungeonu</span>
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

            {/* Base Config Grid & Background Upload */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              {/* ID and Recommended Level */}
              <div className="space-y-3 md:col-span-1">
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
                  <label className="text-[9px] font-black uppercase text-slate-500 tracking-wider">Doporučený Level</label>
                  <input
                    type="number"
                    value={form.recommendedLevel}
                    onChange={(e) => setForm({ ...form, recommendedLevel: Number(e.target.value) })}
                    className="w-full bg-black border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono mt-1 focus:border-primary/50"
                  />
                </div>
              </div>

              {/* Background Image & Upload */}
              <div className="md:col-span-2 bg-black/40 border border-white/5 rounded-2xl p-3 flex flex-col justify-between">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                    <ImageIcon size={12} className="text-primary" /> Pozadí Dungeonu
                  </label>
                  <input
                    type="file"
                    id="dungeon-bg-file-input"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleUploadBg(f);
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => document.getElementById('dungeon-bg-file-input')?.click()}
                    disabled={isUploadingBg}
                    className="px-3 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-[10px] font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5 cursor-pointer transition"
                  >
                    <Upload size={11} /> {isUploadingBg ? 'Nahrávám...' : 'Nahrát obrázek pozadí'}
                  </button>
                </div>

                <div className="flex gap-3 items-center">
                  <div className="w-28 h-16 rounded-xl bg-slate-950 border border-white/10 overflow-hidden relative flex-shrink-0 flex items-center justify-center">
                    {form.backgroundImage ? (
                      <img
                        src={form.backgroundImage}
                        alt="Dungeon Background"
                        className="w-full h-full object-cover"
                        onError={(e) => (e.currentTarget.src = '/dark_cave_bg.png')}
                      />
                    ) : (
                      <ImageIcon size={18} className="text-slate-600" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <label className="text-[8px] font-black uppercase text-slate-500">Cesta k souboru (Path)</label>
                    <input
                      type="text"
                      value={form.backgroundImage}
                      onChange={(e) => setForm({ ...form, backgroundImage: e.target.value })}
                      placeholder="/dark_cave_bg.png"
                      className="w-full bg-black border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white font-mono mt-1 focus:border-primary/50"
                    />
                  </div>
                </div>
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
                {form.waves.map((wave) => {
                  const enemyNames = typeof wave.enemyName === 'object'
                    ? wave.enemyName
                    : { cz: wave.enemyName || '', en: wave.enemyName || '', sk: wave.enemyName || '' };
                  
                  return (
                    <div key={wave.waveIndex} className="bg-black/35 border border-white/5 p-4 rounded-2xl space-y-3 relative overflow-hidden">
                      <div className="flex justify-between items-center">
                        <span className="text-[9px] font-black px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/15">
                          VLNA {wave.waveIndex} {wave.waveIndex === form.waves.length ? '👑 BOSS' : ''}
                        </span>
                      </div>

                      {/* Custom Enemy Configuration */}
                      <div className="bg-black/60 border border-white/5 p-3 rounded-xl space-y-3">
                        <div className="flex items-center justify-between border-b border-white/5 pb-1.5">
                          <span className="text-[9px] font-black uppercase tracking-wider text-primary/80 flex items-center gap-1">
                            <Sparkles size={11} /> Nepřítel Vlny
                          </span>
                        </div>

                        {/* Top: Image Upload & Preview + Element Type */}
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                          {/* Image preview & Upload button */}
                          <div className="md:col-span-4 flex items-center gap-3">
                            <input
                              type="file"
                              id={`wave-enemy-file-${wave.waveIndex}`}
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) handleUploadEnemyImage(wave.waveIndex, f);
                              }}
                            />
                            <div
                              onClick={() => document.getElementById(`wave-enemy-file-${wave.waveIndex}`)?.click()}
                              className="size-24 rounded-2xl bg-slate-900 border border-white/10 p-1.5 flex items-center justify-center relative overflow-hidden shadow-2xl cursor-pointer hover:border-primary transition group shrink-0"
                              title="Klikněte pro nahrání obrázku nepřítele"
                            >
                              {wave.enemyImage ? (
                                <img
                                  src={wave.enemyImage}
                                  alt="Enemy preview"
                                  className="w-full h-full object-contain filter drop-shadow group-hover:scale-105 transition-transform"
                                  onError={(e) => (e.currentTarget.src = '/dark_cave_bg.png')}
                                />
                              ) : (
                                <ImageIcon size={28} className="text-slate-600" />
                              )}
                              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                                <Upload size={20} className="text-white" />
                              </div>
                            </div>

                            <div className="flex flex-col gap-1.5">
                              <button
                                type="button"
                                onClick={() => document.getElementById(`wave-enemy-file-${wave.waveIndex}`)?.click()}
                                disabled={uploadingWaveEnemy === wave.waveIndex}
                                className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5 cursor-pointer transition"
                              >
                                <Upload size={12} /> {uploadingWaveEnemy === wave.waveIndex ? '...' : 'Nahrát PNG'}
                              </button>
                              <span className="text-[8px] font-black uppercase text-slate-500">Klikněte pro změnu</span>
                            </div>
                          </div>

                          {/* Image Path input */}
                          <div className="md:col-span-4">
                            <label className="text-[8px] font-black uppercase text-slate-400">Cesta k obrázku (Image Path)</label>
                            <input
                              type="text"
                              placeholder="/dungeon/wave1.png"
                              value={wave.enemyImage || ''}
                              onChange={(e) => handleUpdateWave(wave.waveIndex, 'enemyImage', e.target.value)}
                              className="w-full bg-slate-950 border border-white/10 rounded-lg px-2.5 py-1.5 text-[11px] text-white font-mono mt-1 outline-none focus:border-primary/50"
                            />
                          </div>

                          {/* Element Type Select (4 elements) */}
                          <div className="md:col-span-4">
                            <label className="text-[8px] font-black uppercase text-slate-400">Element Typ (4 Typy)</label>
                            <select
                              value={wave.enemyType || 'nature'}
                              onChange={(e) => handleUpdateWave(wave.waveIndex, 'enemyType', e.target.value)}
                              className="w-full bg-slate-950 border border-white/10 rounded-lg px-2.5 py-1.5 text-[11px] font-bold text-white mt-1 outline-none focus:border-primary/50"
                            >
                              {DUNGEON_ELEMENTS.map((elem) => (
                                <option key={elem.id} value={elem.id} className="bg-slate-900 text-white">
                                  {elem.label}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        {/* Localized Enemy Names (CZ / EN / SK) */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 border-t border-white/5 pt-2">
                          <div>
                            <label className="text-[8px] font-black uppercase text-slate-400">Název (CZ)</label>
                            <input
                              type="text"
                              placeholder="Stínový Netopýr..."
                              value={enemyNames.cz || ''}
                              onChange={(e) => handleUpdateWaveEnemyName(wave.waveIndex, 'cz', e.target.value)}
                              className="w-full bg-slate-950 border border-white/10 rounded-lg px-2.5 py-1 text-[11px] text-white mt-0.5 outline-none focus:border-primary/50"
                            />
                          </div>
                          <div>
                            <label className="text-[8px] font-black uppercase text-slate-400">Název (EN)</label>
                            <input
                              type="text"
                              placeholder="Umbrabat..."
                              value={enemyNames.en || ''}
                              onChange={(e) => handleUpdateWaveEnemyName(wave.waveIndex, 'en', e.target.value)}
                              className="w-full bg-slate-950 border border-white/10 rounded-lg px-2.5 py-1 text-[11px] text-white mt-0.5 outline-none focus:border-primary/50"
                            />
                          </div>
                          <div>
                            <label className="text-[8px] font-black uppercase text-slate-400">Název (SK)</label>
                            <input
                              type="text"
                              placeholder="Tieňový Netopier..."
                              value={enemyNames.sk || ''}
                              onChange={(e) => handleUpdateWaveEnemyName(wave.waveIndex, 'sk', e.target.value)}
                              className="w-full bg-slate-950 border border-white/10 rounded-lg px-2.5 py-1 text-[11px] text-white mt-0.5 outline-none focus:border-primary/50"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Stats & Spawning */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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

                        <div>
                          <label className="text-[8px] font-black uppercase text-slate-500">Počet nepřátel</label>
                          <input
                            type="number"
                            value={wave.enemyCount}
                            onChange={(e) => handleUpdateWave(wave.waveIndex, 'enemyCount', Number(e.target.value))}
                            className="w-full bg-slate-950 border border-white/10 rounded-lg px-2 py-1 text-[11px] text-white font-mono mt-1"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Boss Loot Configuration (Specific + Random) */}
            <div className="space-y-4">
              <span className="text-[10px] font-black uppercase text-purple-400 tracking-widest block border-b border-white/5 pb-1 flex items-center gap-1.5">
                <Award size={12} /> Odměny z Bosse (Finální Dungeon Loot)
              </span>

              <div className="bg-black/35 border border-white/5 p-4 rounded-2xl space-y-5">
                
                {/* 1. Specific Items Pool */}
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-3 bg-black/40 p-3 rounded-xl border border-white/5">
                    <div>
                      <h4 className="text-[10px] font-black uppercase text-slate-300 flex items-center gap-1.5">
                        <Package size={12} className="text-amber-400" /> Pevné / Specifické itemy z Bosse
                      </h4>
                      <p className="text-[8px] text-slate-500 mt-0.5">Definujte pool unikátních boss itemů a maximální počet, kolik jich může při jednom zabití padnout.</p>
                    </div>

                    <div className="flex items-center gap-3">
                      {/* Max Specific Drops Limit */}
                      <div className="flex items-center gap-2 bg-slate-950 border border-white/10 px-3 py-1 rounded-xl">
                        <label className="text-[8px] font-black uppercase text-amber-400 whitespace-nowrap">Max. padne itemů:</label>
                        <input
                          type="number"
                          min="1"
                          max={form.lootTable.specificDrops?.length || 10}
                          value={form.lootTable.maxSpecificDropsCount ?? 2}
                          onChange={(e) => {
                            const val = e.target.value === '' ? undefined : Number(e.target.value);
                            setForm({
                              ...form,
                              lootTable: { ...form.lootTable, maxSpecificDropsCount: val }
                            });
                          }}
                          className="w-12 bg-black/60 border border-white/10 rounded-lg px-2 py-0.5 text-xs text-white font-mono text-center outline-none focus:border-amber-400/50"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={handleAddSpecificDrop}
                        className="px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 rounded-xl text-[9px] font-black uppercase tracking-wider flex items-center gap-1 cursor-pointer transition"
                      >
                        <Plus size={12} /> Přidat Item
                      </button>
                    </div>
                  </div>

                  {(!form.lootTable.specificDrops || form.lootTable.specificDrops.length === 0) ? (
                    <div className="p-3 bg-black/40 border border-dashed border-white/10 rounded-xl text-center text-slate-500 text-[10px] italic">
                      Zatím nejsou nastaveny žádné specifické itemy. Klikněte na "+ Přidat Item".
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {form.lootTable.specificDrops.map((drop, dIdx) => {
                        const conf = RESOURCE_CONFIG[drop.resourceId];
                        return (
                        <div key={dIdx} className="flex flex-wrap md:flex-nowrap gap-3 items-center bg-black/50 border border-white/5 p-2.5 rounded-xl">
                          {/* PNG Icon Preview */}
                          <div className="size-12 rounded-xl bg-slate-900 border border-white/10 flex items-center justify-center shrink-0 shadow-md p-1">
                            {conf?.hasCustomIcon ? (
                              <img
                                src={`/resources/${conf.customIcon || drop.resourceId}.png`}
                                alt={drop.resourceId}
                                className="w-full h-full object-contain filter drop-shadow"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = 'none';
                                }}
                              />
                            ) : (
                              <span className="text-xl">{conf?.icon || '📦'}</span>
                            )}
                          </div>
                          
                          {/* Resource Selector */}
                          <div className="flex-1 min-w-[160px]">
                            <label className="text-[7px] font-black uppercase text-slate-500 block">Surovina / Item</label>
                            <select
                              value={drop.resourceId}
                              onChange={(e) => handleUpdateSpecificDrop(dIdx, 'resourceId', e.target.value)}
                              className="w-full bg-slate-950 border border-white/10 rounded-lg px-2 py-1 text-[11px] text-white mt-0.5 outline-none font-bold"
                            >
                              {availableResources.map((res) => (
                                <option key={res.id} value={res.id} className="bg-slate-900 text-white">
                                  {res.label} ({res.id})
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Chance */}
                          <div className="w-24">
                            <label className="text-[7px] font-black uppercase text-slate-500 block flex items-center gap-0.5">
                              <Percent size={8} /> Šance (0-1)
                            </label>
                            <input
                              type="number"
                              step="0.05"
                              min="0"
                              max="1"
                              value={drop.chance}
                              onChange={(e) => handleUpdateSpecificDrop(dIdx, 'chance', Number(e.target.value))}
                              className="w-full bg-slate-950 border border-white/10 rounded-lg px-2 py-1 text-[11px] text-white font-mono mt-0.5 text-center"
                              placeholder="1.0"
                            />
                          </div>

                          {/* Min Amount */}
                          <div className="w-20">
                            <label className="text-[7px] font-black uppercase text-slate-500 block">Min ks</label>
                            <input
                              type="number"
                              min="1"
                              value={drop.minAmount || 1}
                              onChange={(e) => handleUpdateSpecificDrop(dIdx, 'minAmount', Number(e.target.value))}
                              className="w-full bg-slate-950 border border-white/10 rounded-lg px-2 py-1 text-[11px] text-white font-mono mt-0.5 text-center"
                            />
                          </div>

                          {/* Max Amount */}
                          <div className="w-20">
                            <label className="text-[7px] font-black uppercase text-slate-500 block">Max ks</label>
                            <input
                              type="number"
                              min="1"
                              value={drop.maxAmount || 1}
                              onChange={(e) => handleUpdateSpecificDrop(dIdx, 'maxAmount', Number(e.target.value))}
                              className="w-full bg-slate-950 border border-white/10 rounded-lg px-2 py-1 text-[11px] text-white font-mono mt-0.5 text-center"
                            />
                          </div>

                          {/* Delete */}
                          <div className="pt-3">
                            <button
                              type="button"
                              onClick={() => handleDeleteSpecificDrop(dIdx)}
                              className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-lg transition cursor-pointer"
                              title="Odebrat drop"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* 2. Random Bonus Drops */}
                <div className="border-t border-white/5 pt-4 space-y-3">
                  <div>
                    <h4 className="text-[10px] font-black uppercase text-slate-300 flex items-center gap-1.5">
                      <Sparkles size={12} className="text-purple-400" /> Náhodný doplňkový loot z Bosse
                    </h4>
                    <p className="text-[8px] text-slate-500 mt-0.5">Kolik náhodných relikvií/itemů navíc padne a jejich distribuce vzácnosti.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-black/50 border border-white/5 p-3 rounded-xl items-center">
                    <div>
                      <label className="text-[8px] font-black uppercase text-slate-400 block">Počet náhodných dropů</label>
                      <input
                        type="number"
                        min="0"
                        max="10"
                        value={form.lootTable.randomDropsCount ?? 2}
                        onChange={(e) => {
                          const updated = { ...form };
                          updated.lootTable.randomDropsCount = Number(e.target.value);
                          setForm(updated);
                        }}
                        className="w-full bg-slate-950 border border-white/10 rounded-lg px-2.5 py-1.5 text-[11px] text-white font-mono mt-1 text-center"
                      />
                    </div>

                    <div>
                      <label className="text-[8px] font-black uppercase text-amber-400 block">Legendary (%)</label>
                      <input
                        type="number"
                        step="0.05"
                        min="0"
                        max="1"
                        value={form.lootTable.rarityDistribution?.legendary ?? 0.2}
                        onChange={(e) => {
                          const updated = { ...form };
                          updated.lootTable.rarityDistribution = {
                            ...updated.lootTable.rarityDistribution,
                            legendary: Number(e.target.value)
                          };
                          setForm(updated);
                        }}
                        className="w-full bg-slate-950 border border-white/10 rounded-lg px-2.5 py-1.5 text-[11px] text-amber-400 font-mono mt-1 text-center"
                      />
                    </div>

                    <div>
                      <label className="text-[8px] font-black uppercase text-purple-400 block">Epic (%)</label>
                      <input
                        type="number"
                        step="0.05"
                        min="0"
                        max="1"
                        value={form.lootTable.rarityDistribution?.epic ?? 0.4}
                        onChange={(e) => {
                          const updated = { ...form };
                          updated.lootTable.rarityDistribution = {
                            ...updated.lootTable.rarityDistribution,
                            epic: Number(e.target.value)
                          };
                          setForm(updated);
                        }}
                        className="w-full bg-slate-950 border border-white/10 rounded-lg px-2.5 py-1.5 text-[11px] text-purple-400 font-mono mt-1 text-center"
                      />
                    </div>

                    <div>
                      <label className="text-[8px] font-black uppercase text-sky-400 block">Rare (%)</label>
                      <input
                        type="number"
                        step="0.05"
                        min="0"
                        max="1"
                        value={form.lootTable.rarityDistribution?.rare ?? 0.4}
                        onChange={(e) => {
                          const updated = { ...form };
                          updated.lootTable.rarityDistribution = {
                            ...updated.lootTable.rarityDistribution,
                            rare: Number(e.target.value)
                          };
                          setForm(updated);
                        }}
                        className="w-full bg-slate-950 border border-white/10 rounded-lg px-2.5 py-1.5 text-[11px] text-sky-400 font-mono mt-1 text-center"
                      />
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


