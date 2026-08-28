import { useState, useEffect } from 'react'
import type { Monster, Localized } from '../types'
import { monsterDB } from '../data/monsters'
import { RESOURCE_CONFIG } from '../data/resources'
import { watchTradeSignals, sendTradeSignal, clearTradeSignal } from '../lib/firebase'

export type TradeOffer = 
  | { kind: 'monster'; id: string; level: number; name?: string | Localized<string>; monster?: Monster }
  | { kind: 'item'; itemId: string; amount: number; name?: string | Localized<string> };

export type P2PTradeState = {
  step: 'REQUESTING' | 'INCOMING_REQ' | 'SELECTING' | 'WAITING_OFFER' | 'CONFIRMING';
  partnerName: string;
  partnerUid?: string;
  myOffer?: TradeOffer;
  theirOffer?: TradeOffer;
  myMonster?: Monster;
  theirMonster?: { id: string, level: number, name: string | Localized<string> };
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
           if (!data) return prev;

           let theirOffer: TradeOffer;
           let theirMonster: { id: string, level: number, name: string | Localized<string> } | undefined;

           if (data.startsWith('I:')) {
             const [, itemId, amtStr] = data.split(':');
             const amount = Math.max(1, parseInt(amtStr) || 1);
             const resConf = RESOURCE_CONFIG[itemId];
             theirOffer = {
               kind: 'item',
               itemId,
               amount,
               name: resConf?.label || itemId
             };
           } else {
             const cleanData = data.startsWith('M:') ? data.substring(2) : data;
             const [monId, monLvl] = cleanData.split(':');
             const level = parseInt(monLvl) || 1;
             const dbM = monsterDB.find(m => m.id === monId) || monsterDB[0];
             theirOffer = {
               kind: 'monster',
               id: monId,
               level,
               name: dbM.name
             };
             theirMonster = { id: monId, level, name: dbM.name };
           }

           const newState: P2PTradeState = { 
              ...prev, 
              theirOffer,
              theirMonster
           };
           if (newState.myOffer) newState.step = 'CONFIRMING';
           else newState.step = 'SELECTING';
           return newState;
        }

        if (type === 'TCF' && prev.step === 'CONFIRMING') {
           return { ...prev, confirmedByThem: true };
        }

        if (type === 'CNL') {
           addToast({ title: 'Výměna zrušena', message: `${fromName} zrušil proces.`, type: 'xp' });
           clearTradeSignal(userUid);
           return null;
        }

        return prev;
      });
    });

    return () => { 
      if (unsubscribe) unsubscribe(); 
      clearTradeSignal(userUid);
    };
  }, [playerName, addToast, userUid]);

  useEffect(() => {
    if (!p2pTrade || !p2pTrade.partnerUid) return;

    const signalType = 
      p2pTrade.step === 'REQUESTING' ? 'TRQ' :
      p2pTrade.step === 'SELECTING' ? 'TAC' :
      ((p2pTrade.step === 'CONFIRMING' || p2pTrade.step === 'WAITING_OFFER') && p2pTrade.myOffer && !p2pTrade.confirmedByMe) ? 'TOF' : 
      p2pTrade.confirmedByMe ? 'TCF' : null;

    if (signalType) {
       let data = '';
       if (signalType === 'TOF' && p2pTrade.myOffer) {
          if (p2pTrade.myOffer.kind === 'monster') {
            data = `M:${p2pTrade.myOffer.id}:${p2pTrade.myOffer.level}`;
          } else {
            data = `I:${p2pTrade.myOffer.itemId}:${p2pTrade.myOffer.amount}`;
          }
       }
       
       sendTradeSignal(userUid, p2pTrade.partnerUid, {
          type: signalType,
          fromName: playerName || 'Neznámý',
          data
       });
    }
  }, [p2pTrade?.step, p2pTrade?.myOffer, p2pTrade?.confirmedByMe, playerName, userUid]);

  const handleCompleteTrade = (onSuccess: (myOffer: TradeOffer, theirOffer: TradeOffer) => void) => {
    if (p2pTrade?.step === 'CONFIRMING' && p2pTrade.confirmedByMe && p2pTrade.confirmedByThem) {
      if (p2pTrade.myOffer && p2pTrade.theirOffer) {
        onSuccess(p2pTrade.myOffer, p2pTrade.theirOffer);
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
