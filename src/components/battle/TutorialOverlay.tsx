import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { cn } from '../../utils';

export interface TutorialStep {
  t: string;
  m: string;
  pos: 'center' | 'top' | 'bottom' | 'top-right' | 'bottom-left' | 'bottom-right';
  spotlight?: 'enemy-stats' | 'player-stats' | 'attack' | 'skills' | 'inventory' | 'catch' | 'none';
}

export const BATTLE_TUTORIAL_STEPS: TutorialStep[] = [
  {
    t: "tutorial.battle.start_title",
    m: "tutorial.battle.start_msg",
    pos: "center",
    spotlight: "none"
  },
  {
    t: "tutorial.battle.opponent_title",
    m: "tutorial.battle.opponent_msg",
    pos: "bottom",
    spotlight: "enemy-stats"
  },
  {
    t: "tutorial.battle.status_title",
    m: "tutorial.battle.status_msg",
    pos: "bottom",
    spotlight: "player-stats"
  },
  {
    t: "tutorial.battle.attack_title",
    m: "tutorial.battle.attack_msg",
    pos: "top",
    spotlight: "attack"
  },
  {
    t: "tutorial.battle.skills_title",
    m: "tutorial.battle.skills_msg",
    pos: "top",
    spotlight: "skills"
  },
  {
    t: "tutorial.battle.inventory_title",
    m: "tutorial.battle.inventory_msg",
    pos: "top",
    spotlight: "inventory"
  },
  {
    t: "tutorial.battle.strategy_title",
    m: "tutorial.battle.strategy_msg",
    pos: "center",
    spotlight: "enemy-stats"
  },
  {
    t: "tutorial.battle.catch_title",
    m: "tutorial.battle.catch_msg",
    pos: "top",
    spotlight: "catch"
  },
  {
    t: "tutorial.battle.luck_title",
    m: "tutorial.battle.luck_msg",
    pos: "center",
    spotlight: "none"
  }
];

export const HOME_TUTORIAL_STEPS: TutorialStep[] = [
  {
    t: "tutorial.home.welcome_title",
    m: "tutorial.home.welcome_msg",
    pos: "center"
  },
  {
    t: "tutorial.home.profile_title",
    m: "tutorial.home.profile_msg",
    pos: "center"
  },
  {
    t: "tutorial.home.menu_title",
    m: "tutorial.home.menu_msg",
    pos: "center"
  }
];

export const WORLD_TUTORIAL_STEPS: TutorialStep[] = [
  {
    t: "tutorial.world.map_title",
    m: "tutorial.world.map_msg",
    pos: "center"
  },
  {
    t: "tutorial.world.movement_title",
    m: "tutorial.world.movement_msg",
    pos: "center"
  }
];

export const COLLECTION_TUTORIAL_STEPS: TutorialStep[] = [
  {
    t: "tutorial.collection.team_title",
    m: "tutorial.collection.team_msg",
    pos: "center"
  }
];

export const INVENTORY_TUTORIAL_STEPS: TutorialStep[] = [
  {
    t: "tutorial.inventory.backpack_title",
    m: "tutorial.inventory.backpack_msg",
    pos: "center"
  }
];

export const CODEX_TUTORIAL_STEPS: TutorialStep[] = [
  {
    t: "tutorial.codex.lab_title",
    m: "tutorial.codex.lab_msg",
    pos: "center"
  }
];

interface TutorialOverlayProps {
  step: number;
  onNext: () => void;
  enemyName?: string;
  steps?: TutorialStep[];
}

export const TutorialOverlay = ({ step, onNext, enemyName, steps = BATTLE_TUTORIAL_STEPS }: TutorialOverlayProps) => {
  const { t } = useTranslation();
  const [rect, setRect] = React.useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const current = steps[step] || steps[steps.length - 1];
  const message = t(current.m, { enemyName: enemyName || t('tutorial.common.enemy_placeholder') });

  React.useEffect(() => {
    const updateRect = () => {
      if (!current.spotlight || current.spotlight === 'none') {
        setRect(null);
        return;
      }

      const el = document.getElementById(`tutorial-${current.spotlight}`);
      if (el) {
        const r = el.getBoundingClientRect();
        setRect({ x: r.left, y: r.top, w: r.width, h: r.height });
      } else {
        setRect(null);
      }
    };

    updateRect();
    const timer = setTimeout(updateRect, 100);
    window.addEventListener('resize', updateRect);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateRect);
    }
  }, [current.spotlight, step]);

  const maskStyle = rect ? {
    maskImage: `radial-gradient(circle at ${rect.x + rect.w / 2}px ${rect.y + rect.h / 2}px, transparent ${Math.max(rect.w, rect.h) / 1.4}px, black ${Math.max(rect.w, rect.h) / 1.4 + 2}px)`,
    WebkitMaskImage: `radial-gradient(circle at ${rect.x + rect.w / 2}px ${rect.y + rect.h / 2}px, transparent ${Math.max(rect.w, rect.h) / 1.4}px, black ${Math.max(rect.w, rect.h) / 1.4 + 2}px)`
  } : {};

  return (
    <div className="fixed inset-0 z-[10000] pointer-events-none">
      {/* Blur Backdrop with Hole */}
      <div
        className={cn(
          "absolute inset-0 bg-black/40 transition-all duration-500 pointer-events-auto",
          steps === BATTLE_TUTORIAL_STEPS ? "" : "backdrop-blur-sm"
        )}
        style={steps === BATTLE_TUTORIAL_STEPS ? {
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
          ...maskStyle
        } : {}}
      />

      {/* Glow Highlight */}
      <AnimatePresence>
        {rect && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.2 }}
            className="absolute rounded-2xl border-4 border-primary shadow-[0_0_30px_rgba(var(--primary-rgb),0.6)] z-[10001] pointer-events-none"
            style={{
              left: rect.x - 8,
              top: rect.y - 8,
              width: rect.w + 16,
              height: rect.h + 16,
            }}
          >
            <motion.div
              animate={{ opacity: [0.2, 0.5, 0.2] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="absolute inset-0 bg-primary/10 rounded-xl"
            />
          </motion.div>
        )}
      </AnimatePresence>

      <div className={cn(
        "relative inset-0 flex flex-col items-center p-6 h-full transition-all duration-300 pointer-events-none",
        current.pos === 'center' ? "justify-center" :
          current.pos === 'top' ? "justify-start pt-24" :
            current.pos === 'bottom' ? "justify-end pb-32" : "justify-center",
      )}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          key={step}
          className="bg-slate-900 border-2 border-primary rounded-2xl p-5 shadow-[0_20px_60px_rgba(0,0,0,0.8)] pointer-events-auto max-w-[300px] w-full relative z-[10002]"
        >
          <h3 className="text-sm font-black text-white mb-3 uppercase italic tracking-tighter flex items-center gap-2">
            <span className="size-6 bg-primary text-slate-950 rounded-full flex items-center justify-center text-[11px] not-italic shadow-[0_0_15px_rgba(var(--primary-rgb),0.4)]">{step + 1}</span>
            {t(current.t)}
          </h3>
          <p className="text-slate-300 text-[13px] leading-relaxed mb-5 italic opacity-90">{message}</p>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onNext();
            }}
            className="w-full py-3 bg-primary text-slate-950 font-black rounded-xl hover:bg-primary-light active:scale-95 transition-all uppercase tracking-widest text-[10px] shadow-[0_10px_20px_rgba(0,0,0,0.4)]"
          >
            {step === steps.length - 1 ? t('tutorial.common.finish') : t('tutorial.common.next')}
          </button>
        </motion.div>
      </div>
    </div>
  );
};
