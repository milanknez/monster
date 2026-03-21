import { useState, useEffect, useRef } from 'react'
import { watchTradeSignals, sendTradeSignal, clearTradeSignal } from '../lib/firebase'
import type { Monster } from '../types'

export type DuelState = {
  step: 'IDLE' | 'WAITING_ACCEPT' | 'INCOMING' | 'PICKING' | 'WAITING_OPPONENT_PICK' | 'READY';
  partnerName: string;
  partnerUid?: string;
  myMonster?: Monster;
  opponentMonster?: Monster;
  role?: 'challenger' | 'defender';
}

export function useP2PDuel(playerName: string | null, activeMonster: Monster | null, addToast: (toast: any) => void, opponentUid?: string) {
  const [duel, setDuel] = useState<DuelState | null>(null);
  const startTimestamp = useRef(Date.now());
  const lastSignalTime = useRef(0);

  const [incomingEmote, setIncomingEmote] = useState<string | null>(null);
  const [incomingAttack, setIncomingAttack] = useState<{ dmg: number, isCrit: boolean, isSkill: boolean, timestamp: number } | null>(null);
  const [incomingExit, setIncomingExit] = useState<string | null>(null);

  // Use ref to track partner UID to avoid stale closures in stable listener
  const partnerUidRef = useRef<string | undefined>(duel?.partnerUid || opponentUid);
  useEffect(() => {
    partnerUidRef.current = duel?.partnerUid || opponentUid;
  }, [duel?.partnerUid, opponentUid]);

  useEffect(() => {
    if (!playerName) return;

    const unsubscribe = watchTradeSignals((signal) => {
      const { type, fromUid, fromName, data, timestamp } = signal;
      
      // Ignore duplicate signals exactly matching the last seen
      if (timestamp && timestamp === lastSignalTime.current) return;
      if (timestamp) lastSignalTime.current = timestamp;

      if (type === 'DRE') { // Duel REquest
         setDuel({ step: 'INCOMING', partnerName: fromName, partnerUid: fromUid });
      }


      const currentPartner = partnerUidRef.current;
      if (currentPartner && fromUid === currentPartner) {
        if (type === 'DEM') { // Duel EMote
           setIncomingEmote(data);
           setTimeout(() => setIncomingEmote(null), 3000); 
        }

        if (type === 'DAT') { // Duel ATtack
           try {
             setIncomingAttack({ ...JSON.parse(data), timestamp });
           } catch(e) {}
        }
        if (type === 'DAC') { // Duel ACcept (Opponent clicked Accept, now both pick)
          setDuel(prev => prev ? { ...prev, step: 'PICKING' } : null);
        }
        if (type === 'DMO') { // Duel Monster Offer (Opponent picked)
          try {
             const mData = JSON.parse(data);
             setDuel(prev => {
                if (!prev) return null;
                const newState: DuelState = { ...prev, opponentMonster: mData };
                if (prev.myMonster) newState.step = 'READY';
                else newState.step = 'PICKING'; // If I haven't picked yet
                return newState;
             });
          } catch(e) { console.error("Duel Monster Data Error", e); }
        }
        if (type === 'DRJ') { // Duel ReJect
          addToast({ title: 'Výzva odmítnuta', message: `${fromName} se boji souboje!`, type: 'info' });
          clearTradeSignal();
          setDuel(null);
        }
        if (type === 'DCN') { // Duel CaNcel
           clearTradeSignal();
           setDuel(null);
           setIncomingExit(fromName);
           setTimeout(() => setIncomingExit(null), 1000);
        }
      }
    });

    return () => { if (unsubscribe) unsubscribe(); };
  }, [playerName, addToast]); // Constant deps for stable listener

  const sendChallenge = (targetUid: string, targetName: string) => {
    setIncomingAttack(null);
    setDuel({ step: 'WAITING_ACCEPT', partnerName: targetName, partnerUid: targetUid, role: 'challenger' });
    sendTradeSignal(targetUid, { type: 'DRE', fromName: playerName || 'Neznámý', data: '' });
  };

  const notifyAccept = () => {
    if (!duel?.partnerUid) return;
    setIncomingAttack(null);
    setDuel({ ...duel, step: 'PICKING', role: 'defender' });
    sendTradeSignal(duel.partnerUid, { type: 'DAC', fromName: playerName || 'Neznámý', data: '' });
  };

  const pickMyFighter = (monster: Monster) => {
    if (!duel?.partnerUid) return;
    setDuel(prev => {
       if (!prev) return null;
       const newState: DuelState = { ...prev, myMonster: monster };
       if (prev.opponentMonster) newState.step = 'READY';
       else newState.step = 'WAITING_OPPONENT_PICK'; 
       return newState;
    });
    sendTradeSignal(duel.partnerUid, { 
       type: 'DMO', 
       fromName: playerName || 'Neznámý', 
       data: JSON.stringify(monster) 
    });
  };

  const sendEmote = (emote: string) => {
    if (duel?.partnerUid) {
      sendTradeSignal(duel.partnerUid, { type: 'DEM', fromName: playerName || 'Neznámý', data: emote });
    }
  };

  const rejectChallenge = () => {
    if (!duel?.partnerUid) return;
    sendTradeSignal(duel.partnerUid, { type: 'DRJ', fromName: playerName || 'Neznámý', data: '' });
    setDuel(null);
    clearTradeSignal();
  };

  const cancelChallenge = () => {
    if (duel?.partnerUid) {
      sendTradeSignal(duel.partnerUid, { type: 'DCN', fromName: playerName || 'Neznámý', data: '' });
    }
    setDuel(null);
  };

  return { duel, setDuel, sendChallenge, notifyAccept, pickMyFighter, rejectChallenge, cancelChallenge, sendEmote, incomingEmote, incomingAttack, incomingExit };
}
