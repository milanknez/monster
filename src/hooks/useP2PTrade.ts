import { useState, useEffect } from 'react'
import type { Monster } from '../types'
import { monsterDB } from '../data/monsters'
import { watchTradeSignals, sendTradeSignal, clearTradeSignal } from '../lib/firebase'

export type P2PTradeState = {
  step: 'REQUESTING' | 'INCOMING_REQ' | 'SELECTING' | 'WAITING_OFFER' | 'CONFIRMING';
  partnerName: string;
  partnerUid?: string;
  myMonster?: Monster;
  theirMonster?: { id: string, level: number, name: string };
  confirmedByMe?: boolean;
  confirmedByThem?: boolean;
};

export function useP2PTrade(playerName: string | null, addToast: (toast: any) => void, userUid: string) {
  const [p2pTrade, setP2pTrade] = useState<P2PTradeState | null>(null);

  useEffect(() => {
    if (!playerName) return;

    const unsubscribe = watchTradeSignals(userUid, (signal) => {
      const { type, fromUid, fromName, data } = signal;
      
      setP2pTrade(prev => {
        if (type === 'TRQ') {
           if (prev && prev.step !== 'INCOMING_REQ') return prev;
           return { step: 'INCOMING_REQ', partnerName: fromName, partnerUid: fromUid };
        }

        if (!prev || prev.partnerUid !== fromUid) return prev;

        if (type === 'TAC' && prev.step === 'REQUESTING') {
           return { ...prev, step: 'SELECTING' };
        }

        if (type === 'TOF' && (prev.step === 'WAITING_OFFER' || prev.step === 'SELECTING' || prev.step === 'REQUESTING')) {
           const [monId, monLvl] = data.split(':');
           const dbM = monsterDB.find(m => m.id === monId) || monsterDB[0];
           const newState: P2PTradeState = { 
              ...prev, 
              theirMonster: { id: monId, level: parseInt(monLvl), name: dbM.name } 
           };
           if (newState.myMonster) newState.step = 'CONFIRMING';
           else newState.step = 'SELECTING';
           return newState;
        }

        if (type === 'TCF' && prev.step === 'CONFIRMING') {
           return { ...prev, confirmedByThem: true };
        }

        if (type === 'CNL') {
           addToast({ title: 'Výměna zrušena', message: `${fromName} zrušil proces.`, type: 'xp' });
           return null;
        }

        return prev;
      });
    });

    return () => { if (unsubscribe) unsubscribe(); };
  }, [playerName, addToast, userUid]);

  useEffect(() => {
    if (!p2pTrade || !p2pTrade.partnerUid) return;

    const signalType = 
      p2pTrade.step === 'REQUESTING' ? 'TRQ' :
      p2pTrade.step === 'SELECTING' ? 'TAC' :
      ((p2pTrade.step === 'CONFIRMING' || p2pTrade.step === 'WAITING_OFFER') && p2pTrade.myMonster && !p2pTrade.confirmedByMe) ? 'TOF' : 
      p2pTrade.confirmedByMe ? 'TCF' : null;

    if (signalType) {
       let data = '';
       if (signalType === 'TOF' && p2pTrade.myMonster) {
          data = `${p2pTrade.myMonster.id}:${p2pTrade.myMonster.level}`;
       }
       
       sendTradeSignal(userUid, p2pTrade.partnerUid, {
          type: signalType,
          fromName: playerName || 'Neznámý',
          data
       });
    }
  }, [p2pTrade?.step, p2pTrade?.myMonster, p2pTrade?.confirmedByMe, playerName]);

  const handleCompleteTrade = (onSuccess: (myMonster: Monster, theirMonster: { id: string, level: number, name: string }) => void) => {
    if (p2pTrade?.step === 'CONFIRMING' && p2pTrade.confirmedByMe && p2pTrade.confirmedByThem) {
      if (p2pTrade.myMonster && p2pTrade.theirMonster) {
        onSuccess(p2pTrade.myMonster, p2pTrade.theirMonster);
        setTimeout(() => {
          clearTradeSignal(userUid);
          setP2pTrade(null);
        }, 1500);
      }
    }
  }

  return {
    p2pTrade,
    setP2pTrade,
    handleCompleteTrade
  }
}
