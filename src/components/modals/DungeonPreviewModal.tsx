import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Sword, Skull, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { dungeonsDB } from '../../data/dungeons';
import { DungeonSpawnPoint } from '../map/spawnEngine';
import { getLoc } from '../../utils';

interface DungeonPreviewModalProps {
  dungeon: DungeonSpawnPoint | null;
  playerLevel: number;
  onClose: () => void;
  onEnter: (dungeon: DungeonSpawnPoint) => void;
}

export const DungeonPreviewModal: React.FC<DungeonPreviewModalProps> = ({
  dungeon,
  playerLevel,
  onClose,
  onEnter
}) => {
  const { t } = useTranslation();

  if (!dungeon) return null;

  const dungConfig = dungeonsDB.find(d => d.id === dungeon.dungeonConfigId) || dungeonsDB[0];
  const dungName = getLoc(dungConfig?.name || dungeon.title, 'cz');
  const dungDesc = getLoc(dungConfig?.description, 'cz') || 'Tajemný podzemní komplex plný mocných monster a epického lootu.';
  const bgImg = dungConfig?.backgroundImage || '/dark_cave_bg.png';
  const recLevel = dungConfig?.recommendedLevel || dungeon.recommendedLevel;
  const isUnderleveled = playerLevel < recLevel;
  const bossWave = dungConfig?.waves?.find(w => w.waveIndex === dungConfig.waves.length) || dungConfig?.waves?.[dungConfig.waves.length - 1];
  const bossName = bossWave ? getLoc(bossWave.enemyName, 'cz') : 'Neznámý Boss';

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-end justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm pointer-events-auto">
        <motion.div
          initial={{ y: 250, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 250, opacity: 0 }}
          transition={{ type: 'spring', damping: 26, stiffness: 320 }}
          className="w-full max-w-md bg-slate-900/95 border-2 border-amber-500/40 rounded-[2.5rem] p-6 shadow-2xl backdrop-blur-xl relative overflow-hidden flex flex-col gap-4 text-white"
        >
          {/* Close corner button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-20 p-2 rounded-full bg-black/60 hover:bg-slate-800 text-slate-400 hover:text-white transition border border-white/10"
          >
            <X size={16} />
          </button>

          {/* Background Artwork Ambient Header */}
          <div className="relative w-full h-36 rounded-2xl overflow-hidden border border-white/10 shadow-inner group">
            <img
              src={bgImg}
              alt={dungName}
              className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />

            {/* Badge: Recommended Level */}
            <div className="absolute top-3 left-3 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/80 backdrop-blur-md border border-amber-500/40 shadow-lg">
              <Shield size={12} className={isUnderleveled ? "text-red-400" : "text-amber-400"} />
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-200">
                Doporučený Level: <strong className={isUnderleveled ? "text-red-400" : "text-amber-300"}>Lv.{recLevel}</strong>
              </span>
            </div>

            {/* Badge: Waves count */}
            <div className="absolute top-3 right-12 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/80 backdrop-blur-md border border-purple-500/40 shadow-lg">
              <Sword size={12} className="text-purple-400" />
              <span className="text-[10px] font-black uppercase tracking-wider text-purple-200">
                {dungConfig?.waves?.length || 3} Vlny
              </span>
            </div>

            {/* Boss Name preview bottom */}
            {bossWave && (
              <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-2">
                  <div className="size-6 rounded-lg bg-red-950/80 border border-red-500/40 flex items-center justify-center text-xs">
                    💀
                  </div>
                  <div>
                    <span className="text-[8px] uppercase tracking-widest text-red-400 font-bold block leading-none">Finální Boss</span>
                    <span className="font-black text-white">{bossName}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Dungeon Title & Description */}
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">
                {dungeon.type === 'station' ? '🪨' : (dungeon.type === 'park' ? '🌋' : '💀')}
              </span>
              <h2 className="text-xl font-black text-white uppercase italic tracking-tight">{dungName}</h2>
            </div>
            <p className="text-slate-400 text-xs mt-1.5 leading-relaxed">
              {dungDesc}
            </p>
          </div>

          {/* Level Warning if player is too low */}
          {isUnderleveled && (
            <div className="bg-amber-950/40 border border-amber-500/30 rounded-xl px-3.5 py-2 text-[10px] text-amber-300 font-bold flex items-center gap-2">
              <span>⚠️</span>
              <span>Tento dungeon je náročný! Máš úroveň {playerLevel}, doporučeno je alespoň {recLevel}.</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <button
              onClick={onClose}
              className="py-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-300 font-black text-xs uppercase tracking-wider transition-all border border-white/5 cursor-pointer"
            >
              {t('common.close') || 'Zpět na mapu'}
            </button>
            <button
              onClick={() => onEnter(dungeon)}
              className="py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-red-600 hover:brightness-110 active:scale-95 text-slate-950 font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-orange-500/25 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Sword size={16} />
              <span>Vstoupit</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
