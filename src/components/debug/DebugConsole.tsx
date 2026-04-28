import { motion, AnimatePresence } from 'framer-motion';
import { X, Trash2, Terminal, Info, AlertTriangle, Bug } from 'lucide-react';

interface DebugLog {
  id: string;
  type: 'log' | 'error' | 'warn' | 'info';
  message: string;
  timestamp: number;
}

interface DebugConsoleProps {
  isOpen: boolean;
  onClose: () => void;
  logs: DebugLog[];
  onClear: () => void;
  onCheat: (cmd: string) => void;
  onToggleLegacy: () => void;
}

export const DebugConsole = ({ isOpen, onClose, logs, onClear, onCheat, onToggleLegacy }: DebugConsoleProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[10000] flex flex-col bg-slate-950/95 backdrop-blur-xl">
      <div className="flex items-center justify-between p-4 border-b border-white/10 bg-slate-900/50">
        <div className="flex items-center gap-2">
          <Bug className="text-primary" size={20} />
          <h2 className="text-sm font-black text-white uppercase tracking-tighter">Debug Console</h2>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={onClear} className="p-2 text-slate-500 hover:text-red-400 transition-colors">
            <Trash2 size={18} />
          </button>
          <button onClick={onClose} className="p-2 text-slate-500 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 font-mono text-[10px] space-y-1">
        {logs.map((log) => (
          <div key={log.id} className="flex gap-2 border-b border-white/5 py-1">
            <span className="text-slate-600 shrink-0">
              {new Date(log.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
            <span className={
              log.type === 'error' ? 'text-red-400' :
              log.type === 'warn' ? 'text-amber-400' :
              log.type === 'info' ? 'text-blue-400' :
              'text-slate-300'
            }>
              {log.message}
            </span>
          </div>
        ))}
        {logs.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-slate-700 opacity-50 space-y-2 py-20">
            <Terminal size={40} />
            <p className="uppercase font-black tracking-widest text-[8px]">No logs captured yet</p>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-white/10 bg-slate-900/50">
        <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest mb-3">Quick Actions</p>
        <div className="grid grid-cols-2 gap-2 mb-4">
          <button 
            onClick={onToggleLegacy}
            className="p-3 bg-slate-800 border border-slate-700 rounded-lg text-[10px] font-bold text-slate-300 hover:bg-slate-700 transition-all uppercase flex items-center justify-center gap-2"
          >
            Legacy Bar
          </button>
          <button 
            onClick={() => {
                const ref = prompt('Enter Referral Code:');
                if (ref) onCheat(`setReferral:${ref}`);
            }}
            className="p-3 bg-primary/10 border border-primary/20 rounded-lg text-[10px] font-bold text-primary hover:bg-primary/20 transition-all uppercase flex items-center justify-center gap-2"
          >
            Test Referral
          </button>
        </div>

        <div className="relative">
          <input 
            type="text" 
            placeholder="Type cheat command..."
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const val = e.currentTarget.value;
                if (val) {
                  onCheat(val);
                  e.currentTarget.value = '';
                }
              }
            }}
            className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-xs text-white font-mono placeholder:text-slate-700 focus:outline-none focus:border-primary/50 transition-all"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-700 uppercase pointer-events-none">
            Enter
          </div>
        </div>
      </div>
    </div>
  );
};
