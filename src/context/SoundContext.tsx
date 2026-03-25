import React, { createContext, useContext, useState, useEffect } from 'react';
import useSound from 'use-sound';

interface SoundContextType {
  isMuted: boolean;
  volume: number;
  setIsMuted: (muted: boolean) => void;
  setVolume: (volume: number) => void;
}

const SoundContext = createContext<SoundContextType | undefined>(undefined);

export const SoundProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isMuted, setIsMuted] = useState(() => {
    const saved = localStorage.getItem('sound_muted');
    return saved ? JSON.parse(saved) : false;
  });

  const [volume, setVolume] = useState(() => {
    const saved = localStorage.getItem('sound_volume');
    return saved ? JSON.parse(saved) : 0.8;
  });

  useEffect(() => {
    localStorage.setItem('sound_muted', JSON.stringify(isMuted));
  }, [isMuted]);

  useEffect(() => {
    localStorage.setItem('sound_volume', JSON.stringify(volume));
  }, [volume]);

  return (
    <SoundContext.Provider value={{ isMuted, volume, setIsMuted, setVolume }}>
      {children}
    </SoundContext.Provider>
  );
};

export const useSoundSystem = () => {
  const context = useContext(SoundContext);
  if (context === undefined) {
    throw new Error('useSoundSystem must be used within a SoundProvider');
  }
  return context;
};
