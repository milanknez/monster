import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowLeftRight, Package, Sparkles, Minus, Plus } from 'lucide-react';
import { cn, getLoc, getMonsterImage } from '../../utils';
import type { Monster, InventoryItem } from '../../types';
import { RESOURCE_CONFIG } from '../../data/resources';
import { ResourceIcon } from '../ui/ResourceIcon';
import type { TradeOffer } from '../../hooks/useP2PTrade';

interface TradeSelectionModalProps {
  caughtMonsters: Monster[];
  inventory?: (InventoryItem | null)[];
  onSelect: (offer: TradeOffer) => void;
  onClose: () => void;
  offeringOffer?: TradeOffer;
}

export const TradeSelectionModal = ({
  caughtMonsters,
  inventory = [],
  onSelect,
  onClose,
  offeringOffer
}: TradeSelectionModalProps) => {
  const { t, i18n } = useTranslation();
  const [activeTab, setActiveTab] = useState<'monsters' | 'items'>('monsters');
  const [selectedItemType, setSelectedItemType] = useState<string | null>(null);
  const [selectedAmount, setSelectedAmount] = useState<number>(1);

  // Group inventory items by type to get total available amounts
  const aggregatedItems = useMemo(() => {
    const map: Record<string, { type: string; count: number; config: any }> = {};
    inventory.forEach((slot) => {
      if (!slot) return;
      if (!map[slot.type]) {
        map[slot.type] = {
          type: slot.type,
          count: 0,
          config: RESOURCE_CONFIG[slot.type] || { icon: '📦', label: slot.type, rarity: 'common' }
        };
      }
      map[slot.type].count += slot.count;
    });
    return Object.values(map).filter((item) => item.count > 0);
  }, [inventory]);

  const activeSelectedItem = useMemo(() => {
    if (!selectedItemType) return null;
    return aggregatedItems.find((item) => item.type === selectedItemType) || null;
  }, [selectedItemType, aggregatedItems]);

  const handleOpenItemPicker = (type: string, maxCount: number) => {
    setSelectedItemType(type);
    setSelectedAmount(Math.min(1, maxCount));
  };

  const handleConfirmItem = () => {
    if (!activeSelectedItem || selectedAmount <= 0) return;
    onSelect({
      kind: 'item',
      itemId: activeSelectedItem.type,
      amount: selectedAmount,
      name: activeSelectedItem.config?.label || activeSelectedItem.type
    });
  };

  return (
    <div className="fixed inset-0 z-[2100] flex flex-col bg-slate-950/95 backdrop-blur-xl">
      {/* Header */}
      <div className="p-6 pb-4 border-b border-white/10 flex justify-between items-center bg-slate-900/60">
        <div>
          <h3 className="text-xl font-black text-slate-100 uppercase tracking-tight flex items-center gap-2">
            <ArrowLeftRight className="text-purple-400 size-5" />
            {t('trade.select_trade') || 'Vyber nabídku k výměně'}
          </h3>
          {offeringOffer && (
            <p className="text-[10px] text-amber-400 font-bold uppercase tracking-widest mt-0.5">
              {t('trade.for') || 'Výměna za:'}{' '}
              {offeringOffer.kind === 'monster'
                ? `${getLoc(offeringOffer.name, i18n.language) || offeringOffer.id} (LVL ${offeringOffer.level})`
                : `${offeringOffer.amount}× ${getLoc(offeringOffer.name, i18n.language) || offeringOffer.itemId}`}
            </p>
          )}
        </div>
        <button
          onClick={onClose}
          className="p-2.5 bg-slate-800/80 hover:bg-slate-700 rounded-2xl text-slate-400 hover:text-white transition-colors"
        >
          <X size={20} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex p-3 px-6 gap-3 bg-slate-900/40 border-b border-white/5">
        <button
          onClick={() => { setActiveTab('monsters'); setSelectedItemType(null); }}
          className={cn(
            "flex-1 py-2.5 px-4 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2",
            activeTab === 'monsters'
              ? "bg-purple-600 text-white shadow-lg shadow-purple-600/30 scale-[1.02]"
              : "bg-slate-800/60 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
          )}
        >
          <Sparkles size={16} />
          <span>Příšery</span>
          <span className={cn(
            "text-[10px] px-1.5 py-0.5 rounded-full font-bold",
            activeTab === 'monsters' ? "bg-purple-800/60 text-purple-200" : "bg-slate-700 text-slate-400"
          )}>
            {caughtMonsters.length}
          </span>
        </button>

        <button
          onClick={() => { setActiveTab('items'); setSelectedItemType(null); }}
          className={cn(
            "flex-1 py-2.5 px-4 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2",
            activeTab === 'items'
              ? "bg-amber-600 text-white shadow-lg shadow-amber-600/30 scale-[1.02]"
              : "bg-slate-800/60 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
          )}
        >
          <Package size={16} />
          <span>Předměty</span>
          <span className={cn(
            "text-[10px] px-1.5 py-0.5 rounded-full font-bold",
            activeTab === 'items' ? "bg-amber-800/60 text-amber-200" : "bg-slate-700 text-slate-400"
          )}>
            {aggregatedItems.length}
          </span>
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 relative">
        {activeTab === 'monsters' && (
          caughtMonsters.length > 0 ? (
            caughtMonsters.map((monster, idx) => (
              <motion.div
                key={`${monster.id}-${idx}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.03 }}
                onClick={() => onSelect({
                  kind: 'monster',
                  id: monster.id,
                  level: monster.level,
                  name: monster.name,
                  monster
                })}
                className="bg-slate-900/90 border border-white/10 hover:border-purple-500/50 rounded-2xl p-3.5 flex items-center justify-between active:scale-[0.98] transition-all cursor-pointer shadow-md group"
              >
                <div className="flex items-center gap-3.5">
                  <div className="size-14 bg-black/50 rounded-xl p-1.5 border border-white/10 relative shrink-0 flex items-center justify-center">
                    <img
                      src={getMonsterImage(monster)}
                      className="w-full h-full object-contain mix-blend-screen group-hover:scale-105 transition-transform"
                      alt={getLoc(monster.name, i18n.language)}
                    />
                    
                    {/* Jewel Sockets */}
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 flex flex-row gap-[1px] bg-slate-950/80 p-[2px] px-1 rounded-full border border-white/10 shadow-lg">
                      {[0, 1, 2].map((i) => {
                        const gemId = monster.gems?.[i];
                        const gemConfig = gemId ? RESOURCE_CONFIG[gemId] : null;

                        return (
                          <div
                            key={i}
                            className={cn(
                              "size-[0.22rem] rotate-45 border transition-all",
                              gemId
                                ? "shadow-[0_0_6px_rgba(255,255,255,0.4)]"
                                : "bg-slate-900 border-white/10"
                            )}
                            style={{
                              backgroundColor: gemConfig?.color || (gemId ? '#fff' : 'transparent'),
                              borderColor: gemId ? 'rgba(255,255,255,0.6)' : undefined
                            }}
                          />
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-black text-slate-100 uppercase tracking-tight text-sm">
                      {getLoc(monster.name, i18n.language)}
                    </h4>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                      LVL {monster.level} • {getLoc(monster.type, i18n.language)}
                    </p>
                  </div>
                </div>

                <div className="size-9 bg-purple-500/10 border border-purple-500/20 group-hover:bg-purple-500 group-hover:text-white rounded-xl flex items-center justify-center text-purple-400 transition-all">
                  <ArrowLeftRight size={16} />
                </div>
              </motion.div>
            ))
          ) : (
            <div className="h-64 flex flex-col items-center justify-center text-center p-8 text-slate-500">
              <Sparkles size={36} className="mb-2 opacity-40" />
              <p className="font-bold uppercase tracking-widest text-xs">{t('trade.no_monsters') || 'Nemáš žádné příšery k výměně'}</p>
            </div>
          )
        )}

        {activeTab === 'items' && (
          aggregatedItems.length > 0 ? (
            aggregatedItems.map((item, idx) => {
              const rarity = item.config?.rarity || 'common';
              const rarityBorder = 
                rarity === 'legendary' ? 'border-amber-500/40 hover:border-amber-400 bg-amber-500/5' :
                rarity === 'epic' ? 'border-purple-500/40 hover:border-purple-400 bg-purple-500/5' :
                rarity === 'rare' ? 'border-blue-500/40 hover:border-blue-400 bg-blue-500/5' :
                'border-white/10 hover:border-white/20 bg-slate-900/90';

              return (
                <motion.div
                  key={`${item.type}-${idx}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  onClick={() => handleOpenItemPicker(item.type, item.count)}
                  className={cn(
                    "border rounded-2xl p-3.5 flex items-center justify-between active:scale-[0.98] transition-all cursor-pointer shadow-md group",
                    rarityBorder
                  )}
                >
                  <div className="flex items-center gap-3.5">
                    <div className="size-13 rounded-xl bg-black/40 border border-white/10 p-1.5 flex items-center justify-center shrink-0">
                      <ResourceIcon
                        id={item.type}
                        config={item.config}
                        size="md"
                        className="group-hover:scale-110 transition-transform"
                      />
                    </div>

                    <div>
                      <h4 className="font-black text-slate-100 uppercase tracking-tight text-sm flex items-center gap-2">
                        {getLoc(item.config?.label, i18n.language) || item.type}
                      </h4>
                      <p className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">
                        {getLoc(item.config?.description, i18n.language) || 'Předmět z inventáře'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="px-2.5 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-300 rounded-lg text-xs font-black tracking-wider">
                      {item.count}×
                    </span>
                    <div className="size-9 bg-amber-500/10 border border-amber-500/20 group-hover:bg-amber-500 group-hover:text-white rounded-xl flex items-center justify-center text-amber-400 transition-all">
                      <ArrowLeftRight size={16} />
                    </div>
                  </div>
                </motion.div>
              );
            })
          ) : (
            <div className="h-64 flex flex-col items-center justify-center text-center p-8 text-slate-500">
              <Package size={36} className="mb-2 opacity-40" />
              <p className="font-bold uppercase tracking-widest text-xs">Inventář je prázdný</p>
            </div>
          )
        )}
      </div>

      {/* Item Quantity Selection Drawer */}
      <AnimatePresence>
        {activeSelectedItem && (
          <motion.div
            initial={{ y: 200, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 200, opacity: 0 }}
            className="p-6 bg-slate-900 border-t border-amber-500/30 rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.6)] flex flex-col gap-4 relative z-20"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="size-12 rounded-xl bg-black/50 border border-amber-500/30 p-1 flex items-center justify-center">
                  <ResourceIcon id={activeSelectedItem.type} config={activeSelectedItem.config} size="md" />
                </div>
                <div>
                  <h4 className="font-black text-white uppercase text-sm tracking-wide">
                    {getLoc(activeSelectedItem.config?.label, i18n.language) || activeSelectedItem.type}
                  </h4>
                  <p className="text-[10px] text-slate-400">
                    V batohu k dispozici: <span className="text-amber-400 font-bold">{activeSelectedItem.count}×</span>
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedItemType(null)}
                className="p-2 bg-slate-800 text-slate-400 hover:text-white rounded-xl"
              >
                <X size={18} />
              </button>
            </div>

            {/* Quantity Controls */}
            <div className="bg-slate-950/80 p-4 rounded-2xl border border-white/5 flex flex-col gap-3">
              <div className="flex items-center justify-between gap-4">
                <button
                  disabled={selectedAmount <= 1}
                  onClick={() => setSelectedAmount((prev) => Math.max(1, prev - 1))}
                  className="size-11 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-white text-lg font-bold transition active:scale-95"
                >
                  <Minus size={18} />
                </button>

                <div className="flex-1 text-center">
                  <div className="text-3xl font-black text-amber-400 tracking-wider">
                    {selectedAmount}
                    <span className="text-xs text-slate-400 ml-1 font-bold">/ {activeSelectedItem.count} ks</span>
                  </div>
                </div>

                <button
                  disabled={selectedAmount >= activeSelectedItem.count}
                  onClick={() => setSelectedAmount((prev) => Math.min(activeSelectedItem.count, prev + 1))}
                  className="size-11 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-white text-lg font-bold transition active:scale-95"
                >
                  <Plus size={18} />
                </button>
              </div>

              {/* Slider */}
              <input
                type="range"
                min={1}
                max={activeSelectedItem.count}
                value={selectedAmount}
                onChange={(e) => setSelectedAmount(parseInt(e.target.value) || 1)}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />

              {/* Quick Presets */}
              <div className="grid grid-cols-4 gap-2 pt-1">
                <button
                  onClick={() => setSelectedAmount(1)}
                  className={cn(
                    "py-1.5 rounded-lg text-xs font-black uppercase transition",
                    selectedAmount === 1 ? "bg-amber-500 text-slate-950" : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                  )}
                >
                  1×
                </button>
                <button
                  disabled={activeSelectedItem.count < 5}
                  onClick={() => setSelectedAmount(Math.min(activeSelectedItem.count, 5))}
                  className={cn(
                    "py-1.5 rounded-lg text-xs font-black uppercase transition disabled:opacity-30",
                    selectedAmount === 5 ? "bg-amber-500 text-slate-950" : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                  )}
                >
                  5×
                </button>
                <button
                  disabled={activeSelectedItem.count < 10}
                  onClick={() => setSelectedAmount(Math.min(activeSelectedItem.count, 10))}
                  className={cn(
                    "py-1.5 rounded-lg text-xs font-black uppercase transition disabled:opacity-30",
                    selectedAmount === 10 ? "bg-amber-500 text-slate-950" : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                  )}
                >
                  10×
                </button>
                <button
                  onClick={() => setSelectedAmount(activeSelectedItem.count)}
                  className={cn(
                    "py-1.5 rounded-lg text-xs font-black uppercase transition",
                    selectedAmount === activeSelectedItem.count ? "bg-amber-500 text-slate-950" : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                  )}
                >
                  MAX
                </button>
              </div>
            </div>

            {/* Confirm Selection Button */}
            <button
              onClick={handleConfirmItem}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black uppercase text-xs tracking-widest shadow-lg shadow-amber-500/20 active:scale-[0.98] transition flex items-center justify-center gap-2"
            >
              <ArrowLeftRight size={16} />
              Zvolit k výměně ({selectedAmount}×)
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer Info */}
      {!activeSelectedItem && (
        <div className="p-4 bg-slate-950/80 backdrop-blur-xl border-t border-white/5">
          <p className="text-[10px] text-slate-500 text-center font-bold uppercase tracking-[0.2em] leading-relaxed">
            {t('trade.trade_desc') || 'Můžeš nabídnout své chycené monstrum nebo suroviny a předměty z batohu'}
          </p>
        </div>
      )}
    </div>
  );
};
