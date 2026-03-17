import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Settings, Radar, QrCode, Bluetooth, SignalHigh } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { BleClient } from '@capacitor-community/bluetooth-le';
import { cn } from '../utils';

export const ScannerModal = ({ isOpen, onClose, onScan }: { isOpen: boolean; onClose: () => void; onScan: (ean: string) => void }) => {
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [mode, setMode] = useState<'QR' | 'BT'>('QR');
  const [isScanningBT, setIsScanningBT] = useState(false);
  const [foundDevices, setFoundDevices] = useState<{name: string, id: string, data: string}[]>([]);

  // QR Scanner Effect
  useEffect(() => {
    if (!isOpen || mode !== 'QR') return

    const html5QrCode = new Html5Qrcode("reader")
    let isMounted = true

    const startScanner = async () => {
      try {
        await html5QrCode.start(
          { facingMode: "environment" },
          {
            fps: 5, 
            qrbox: { width: 250, height: 250 }, 
            aspectRatio: 1.0, 
            disableFlip: false 
          },
          (decodedText) => {
            if (isMounted) {
              onScan(decodedText)
              onClose()
            }
          },
          () => {} // Ignore errors
        )
      } catch (err) {
        if (isMounted) {
          console.error("Kamera nebyla nalezena nebo schválena", err)
          setCameraError("Kamera není k dispozici")
        }
      }
    }

    startScanner()

    return () => {
      isMounted = false
      if (html5QrCode.isScanning) {
        html5QrCode.stop().catch(e => console.error("Chyba při vypínání", e))
      }
    }
  }, [isOpen, mode, onScan, onClose])

  // Bluetooth Scanner Effect
  useEffect(() => {
    if (!isOpen || mode !== 'BT') return;

    let isScanning = false;
    let isMounted = true;

    const startBTDiscovery = async () => {
      try {
        setIsScanningBT(true);
        await BleClient.initialize();
        isScanning = true;
        
        console.log("BLE Scan started in Modal...");
        
        await BleClient.requestLEScan({}, (result) => {
          if (!isMounted) return;
          
          const deviceName = result.localName || result.device.name || 'Neznámý_Puls';
          const deviceId = result.device.deviceId;
          
          setFoundDevices(prev => {
            // Pokud už zařízení máme, nepřidáváme znova
            if (prev.some(d => d.id === deviceId)) return prev;
            
            // ZDE: V budoucnu můžeme parsovat result.manufacturerData pro MSTR_OFF|...
            // Pro teď vytvoříme mock data, aby se dalo kliknout na zařízení a "zkusit" trade
            // V reálu by to zařízení muselo vysílat svůj profil
            return [...prev, { 
              name: deviceName, 
              id: deviceId,
              data: `MSTR_OFF|001|10` // Default fake data pro testování propletení
            }];
          });
        });

      } catch (e) {
        console.error("BLE Error in Modal:", e);
        setIsScanningBT(false);
      }
    };

    startBTDiscovery();

    return () => {
      isMounted = false;
      if (isScanning) {
        BleClient.stopLEScan().catch(e => console.error("Chyba při stopování BT:", e));
      }
      setIsScanningBT(false);
    };
  }, [isOpen, mode]);

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-background-dark/95 backdrop-blur-md"
      />
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="relative w-full max-w-sm bg-slate-900 border border-primary/30 rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(13,185,242,0.2)]"
      >
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <div className="flex bg-slate-800/50 p-1 rounded-2xl">
              <button 
                onClick={() => setMode('QR')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black transition-all ${mode === 'QR' ? 'bg-primary text-slate-900 shadow-lg' : 'text-slate-400'}`}
              >
                <QrCode size={14} /> QR
              </button>
              <button 
                onClick={() => setMode('BT')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black transition-all ${mode === 'BT' ? 'bg-blue-500 text-white shadow-lg' : 'text-slate-400'}`}
              >
                <Bluetooth size={14} /> BT
              </button>
            </div>
            <h3 className="text-xl font-black text-slate-100 uppercase tracking-tight flex items-center gap-2">
              <div className={cn("size-2 rounded-full animate-pulse", mode === 'QR' ? "bg-red-500" : "bg-blue-500")} />
              {mode === 'QR' ? 'Skenování' : 'Radar'}
            </h3>
            <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-lg transition-colors">
              <Settings size={20} className="text-slate-400" />
            </button>
          </div>
          
          <div className="aspect-square relative rounded-2xl overflow-hidden bg-slate-950 border border-white/5 group">
            {mode === 'QR' ? (
              <>
                {/* Camera Viewport */}
                <div id="reader" className="w-full h-full object-cover [&>video]:object-cover" />
                
                {cameraError && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/80 p-8 text-center z-20">
                    <div className="p-4 rounded-full bg-red-500/10 mb-4">
                      <Radar size={32} className="text-red-500 opacity-50" />
                    </div>
                    <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">{cameraError}</p>
                    <p className="text-[10px] text-slate-600 mt-2">Povolte přístup ke kameře v nastavení prohlížeče.</p>
                  </div>
                )}

                <div className="absolute inset-0 pointer-events-none z-10">
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 border-2 border-primary/40 rounded-2xl">
                    <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-primary rounded-tl-xl" />
                    <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-primary rounded-tr-xl" />
                    <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-primary rounded-bl-xl" />
                    <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-primary rounded-br-xl" />
                    
                    <motion.div 
                      animate={{ top: ['0%', '100%'] }}
                      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                      className="absolute left-0 right-0 h-0.5 bg-primary shadow-[0_0_15px_#0db9f2]"
                    />
                  </div>
                </div>
              </>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center p-8 bg-slate-950 relative overflow-hidden">
                <div className="relative z-10 w-full">
                  {foundDevices.length === 0 ? (
                    <div className="flex flex-col items-center">
                      <div className="size-32 rounded-full border border-blue-500/20 flex items-center justify-center mb-6 relative">
                        <Bluetooth size={48} className="text-blue-500 animate-pulse" />
                        <div className="absolute inset-0 border border-blue-500 rounded-full animate-ping opacity-20" />
                      </div>
                      <p className="text-xs font-black text-blue-500 uppercase tracking-tighter animate-pulse">Vyhledávání_V_Okolí...</p>
                      <button 
                        onClick={() => {
                          // Tlačítko pro manuální simulaci nalezení na webu
                          onScan("MSTR_OFF|001|20");
                          onClose();
                        }}
                        className="mt-8 px-6 py-2 bg-blue-500/10 border border-blue-500/20 rounded-xl text-[10px] text-blue-400 font-bold uppercase hover:bg-blue-500/20 transition-all"
                      >
                        Simulovat nalezení
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-[10px] font-black text-slate-500 uppercase mb-4">Nalezené signály:</p>
                      {foundDevices.map((dev, i) => (
                        <button 
                          key={i}
                          onClick={() => {
                            onScan(dev.data);
                            onClose();
                          }}
                          className="w-full bg-blue-500/10 border border-blue-500/20 p-4 rounded-2xl flex items-center justify-between group hover:bg-blue-500/20 transition-all"
                        >
                          <div className="flex items-center gap-3">
                            <SignalHigh size={20} className="text-blue-500" />
                            <span className="text-sm font-black text-slate-100">{dev.name}</span>
                          </div>
                          <div className="size-8 bg-blue-500 rounded-full flex items-center justify-center text-slate-900 group-hover:scale-110 transition-transform">
                            <Bluetooth size={16} />
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Radar visualization background */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-10">
                   <div className="size-32 border border-blue-500 rounded-full" />
                   <div className="absolute size-64 border border-blue-500 rounded-full" />
                   <div className="absolute size-[400px] border border-blue-500 rounded-full" />
                   <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-blue-500" />
                   <div className="absolute left-1/2 top-0 bottom-0 w-[1px] bg-blue-500" />
                </div>
              </div>
            )}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
          </div>

          <div className="mt-6 text-center">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">
              {mode === 'QR' ? 'Nasměrujte čočku na QR kód' : 'Zůstaňte v blízkosti druhého hráče'}
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  )
}