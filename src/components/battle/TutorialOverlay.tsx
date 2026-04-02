import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../utils';

export interface TutorialStep {
  t: string;
  m: string;
  pos: 'center' | 'top' | 'bottom' | 'top-right' | 'bottom-left' | 'bottom-right';
  spotlight?: 'enemy-stats' | 'player-stats' | 'attack' | 'skills' | 'inventory' | 'catch' | 'none';
}

export const BATTLE_TUTORIAL_STEPS: TutorialStep[] = [
  {
    t: "Boj začíná! 🌟",
    m: "Narazil jsi na příšeru! Tvým úkolem je ji buď porazit v boji, nebo oslabit a chytit do týmu. Výběr je na tobě!",
    pos: "center",
    spotlight: "none"
  },
  {
    t: "Soupeř 👹",
    m: "Tento červený pruh nahoře ukazuje životy (HP) soupeře. Snížíš-li je na nulu, monstrum porazíš a získáš zkušenosti a kořist.",
    pos: "bottom",
    spotlight: "enemy-stats"
  },
  {
    t: "Tvůj Status 🛡️",
    m: "Zde vidíš své HP (zelená) a Energii (modrá). Energii potřebuješ pro používání silných Skillů.",
    pos: "bottom",
    spotlight: "player-stats"
  },
  {
    t: "Základní Útok ⚔️",
    m: "Tlačítko 'ÚTOK' nestojí žádnou energii. Naopak ti každým zásahem 25 Energie dobije!",
    pos: "top",
    spotlight: "attack"
  },
  {
    t: "Dovednosti ⚡",
    m: "Kliknutím na 'Skills' otevřeš nabídku unikátních schopností tvého monstra. Stojí energii, ale jsou mnohem silnější.",
    pos: "top",
    spotlight: "skills"
  },
  {
    t: "Inventář 🎒",
    m: "Tady najdeš své lektvary. Můžeš se vyléčit nebo doplnit manu přímo během boje.",
    pos: "top",
    spotlight: "inventory"
  },
  {
    t: "Strategie: Odchyt 🕸️",
    m: "Pokud chceš monstrum získat, musíš ho nejdříve oslabit (dostat HP do červených čísel). Čím méně má HP, tím vyšší je šance na úspěch!",
    pos: "center",
    spotlight: "enemy-stats"
  },
  {
    t: "Tlačítko Chytit! 🎯",
    m: "Až bude nepřítel oslaben, klikni na 'CHYTIT'. Pokud uspěješ, monstrum se přidá k tvé sbírce. Pokud ho ale zabiješ, šance na chycení zmizí!",
    pos: "top",
    spotlight: "catch"
  },
  {
    t: "Hodně Štěstí! 🍀",
    m: "Teď už víš vše potřebné. Rozhodni se moudře a vybojuj své vítězství!",
    pos: "center",
    spotlight: "none"
  }
];

export const HOME_TUTORIAL_STEPS: TutorialStep[] = [
  {
    t: "Vítej! 🌟",
    m: "Tady uvidíš svůj pokrok, úroveň a denní výzvy.",
    pos: "center"
  },
  {
    t: "Profil 👤",
    m: "Svou postavu si můžeš přizpůsobit v nastavení.",
    pos: "center"
  },
  {
    t: "Menu 📱",
    m: "Dole najdeš navigaci. Zkus kliknout na 'MAPA' (Zeměkoule)!",
    pos: "center"
  }
];

export const WORLD_TUTORIAL_STEPS: TutorialStep[] = [
  {
    t: "Mapa 🗺️",
    m: "Svět kolem tebe. Monstra se spawnují podle tvé GPS pozice.",
    pos: "center"
  },
  {
    t: "Pohyb 🏎️",
    m: "Hra sleduje rychlost – hrej za chůze pro nejlepší zážitek.",
    pos: "center"
  }
];

export const COLLECTION_TUTORIAL_STEPS: TutorialStep[] = [
  {
    t: "Tým 📚",
    m: "Tady spravuješ své příšery a vylepšuješ je drahokamy.",
    pos: "center"
  }
];

export const INVENTORY_TUTORIAL_STEPS: TutorialStep[] = [
  {
    t: "Batoh 🎒",
    m: "Sleduj své suroviny a vylepšuj kapacitu svého vybavení.",
    pos: "center"
  }
];

export const CODEX_TUTORIAL_STEPS: TutorialStep[] = [
  {
    t: "Laboratoř 🧪",
    m: "Vyráběj vzácné předměty ze surovin nalezených na mapě.",
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
  const [rect, setRect] = React.useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const current = steps[step] || steps[steps.length - 1];
  const message = current.m.replace('${enemyName}', enemyName || 'nepřítel');

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
            {current.t}
          </h3>
          <p className="text-slate-300 text-[13px] leading-relaxed mb-5 italic opacity-90">{message}</p>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onNext();
            }}
            className="w-full py-3 bg-primary text-slate-950 font-black rounded-xl hover:bg-primary-light active:scale-95 transition-all uppercase tracking-widest text-[10px] shadow-[0_10px_20px_rgba(0,0,0,0.4)]"
          >
            {step === steps.length - 1 ? "Rozumím, jdeme na to!" : "Další krok"}
          </button>
        </motion.div>
      </div>
    </div>
  );
};
