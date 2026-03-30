import useSound from 'use-sound';
import { useSoundSystem } from '../context/SoundContext';

export const SOUND_FILES = {
  // INTERFACE
  CLICK: '/sounds/click.ogg',
  MODAL_OPEN: '/sounds/open.ogg',
  MODAL_CLOSE: '/sounds/close.ogg',
  NOTIFICATION: '/sounds/notification.ogg',
  
  // BATTLE VARIATIONS
  ATTACKS: [
    '/sounds/attack1.ogg',
    '/sounds/attack2.ogg',
    '/sounds/attack3.ogg',
    '/sounds/attack4.ogg',
  ],
  HITS: [
    '/sounds/hit.ogg',
    '/sounds/hit2.ogg',
    '/sounds/hit3.ogg',
  ],

  CRITICAL: '/sounds/critical.ogg',
  SLASH: '/sounds/attack1.ogg',
  HEAL: '/sounds/heal.ogg',
  VICTORY: '/sounds/victory.ogg',
  DEFEAT: '/sounds/defeat.ogg',
  DEATH: '/sounds/hit3.ogg',
  LEVEL_UP: '/sounds/level_up.ogg',
  
  // WORLD
  CATCH_SUCCESS: '/sounds/catch.ogg',
  CATCH_FAIL: '/sounds/miss.ogg',
  
  // SPECIAL
  LAB_START: '/sounds/lab_start.ogg',
  LAB_COMPLETE: '/sounds/lab_complete.ogg',
  BOOK_FLIP: '/sounds/book_flip.ogg',
  BATTLE_BGM: '/sounds/battle_bgm.ogg',
  SPELL: '/sounds/spell.ogg',
} as const;

export const useGameSound = () => {
  const { isMuted, volume } = useSoundSystem();
  const config = { volume, soundEnabled: !isMuted };

  const [playClick] = useSound(SOUND_FILES.CLICK, { ...config, volume: volume * 1.0 });
  const [playOpen] = useSound(SOUND_FILES.MODAL_OPEN, { ...config, volume: volume * 0.9 });
  const [playClose] = useSound(SOUND_FILES.MODAL_CLOSE, { ...config, volume: volume * 0.9 });
  const [playNotif] = useSound(SOUND_FILES.NOTIFICATION, { ...config, volume: volume * 1.0 });
  
  // Attack Hooks
  const [pAtk1] = useSound(SOUND_FILES.ATTACKS[0], { ...config, volume: volume * 1.0 });
  const [pAtk2] = useSound(SOUND_FILES.ATTACKS[1], { ...config, volume: volume * 1.0 });
  const [pAtk3] = useSound(SOUND_FILES.ATTACKS[2], { ...config, volume: volume * 1.0 });
  const [pAtk4] = useSound(SOUND_FILES.ATTACKS[3], { ...config, volume: volume * 1.0 });
  const playAttacks = [pAtk1, pAtk2, pAtk3, pAtk4];

  // Hit Hooks
  const [pHit1] = useSound(SOUND_FILES.HITS[0], { ...config, volume: volume * 1.1 });
  const [pHit2] = useSound(SOUND_FILES.HITS[1], { ...config, volume: volume * 1.1 });
  const [pHit3] = useSound(SOUND_FILES.HITS[2], { ...config, volume: volume * 1.1 });
  const playHits = [pHit1, pHit2, pHit3];

  const [playCritical] = useSound(SOUND_FILES.CRITICAL, { ...config, volume: volume * 1.3 });
  const [playHeal] = useSound(SOUND_FILES.HEAL, { ...config, volume: volume * 1.0 });
  const [playSlash] = useSound(SOUND_FILES.SLASH, { ...config, volume: volume * 1.1 });
  const [playVictory] = useSound(SOUND_FILES.VICTORY, { ...config, volume: volume * 1.2 });
  const [playDefeat] = useSound(SOUND_FILES.DEFEAT, { ...config, volume: volume * 1.1 });
  const [playDeath] = useSound(SOUND_FILES.DEATH, { ...config, volume: volume * 1.3 });
  const [playLevelUp] = useSound(SOUND_FILES.LEVEL_UP, { ...config, volume: volume * 1.1 });
  
  const [playCatchSuccess] = useSound(SOUND_FILES.CATCH_SUCCESS, { ...config, volume: volume * 1.0 });
  const [playCatchFail] = useSound(SOUND_FILES.CATCH_FAIL, { ...config, volume: volume * 1.0 });

  const [playLabStart] = useSound(SOUND_FILES.LAB_START, { ...config, volume: volume * 0.8 });
  const [playLabComplete] = useSound(SOUND_FILES.LAB_COMPLETE, { ...config, volume: volume * 1.0 });
  const [playBookFlip] = useSound(SOUND_FILES.BOOK_FLIP, { ...config, volume: volume * 0.9 });
  const [playSpell] = useSound(SOUND_FILES.SPELL, { ...config, volume: volume * 1.1 });
  
  const [playBattleMusic, { stop: stopBattleMusic }] = useSound(SOUND_FILES.BATTLE_BGM, { 
    ...config, 
    volume: volume * 1.2, 
    loop: true 
  });

  return {
    playClick,
    playModalOpen: playOpen,
    playModalClose: playClose,
    playNotification: playNotif,
    playAttack: () => playAttacks[Math.floor(Math.random() * playAttacks.length)](),
    playHit: () => playHits[Math.floor(Math.random() * playHits.length)](),
    playCritical,
    playHeal,
    playSlash,
    playVictory,
    playDefeat,
    playDeath,
    playLevelUp,
    playCatch: (success: boolean) => success ? playCatchSuccess() : playCatchFail(),
    playLabStart,
    playLabComplete,
    playBookFlip,
    playSpell,
    playBattleMusic,
    stopBattleMusic,
  };
};
