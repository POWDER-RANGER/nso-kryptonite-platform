import { useState, useEffect } from 'react';
import { Shield, Wifi, Clock, AlertTriangle } from 'lucide-react';

export function StatusBar() {
  const [mode, setMode] = useState<'WEAPON' | 'SHIELD' | 'SANCTUARY' | 'SPECTATOR'>('SHIELD');
  const [meshNodes, setMeshNodes] = useState(12);
  const [time, setTime] = useState(new Date());
  const [scope, setScope] = useState('192.168.10/24');

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const modeColors = {
    WEAPON: 'text-weapon-DEFAULT bg-weapon-DEFAULT/10 border-weapon-DEFAULT',
    SHIELD: 'text-shield-DEFAULT bg-shield-DEFAULT/10 border-shield-DEFAULT',
    SANCTUARY: 'text-sanctuary-DEFAULT bg-sanctuary-DEFAULT/10 border-sanctuary-DEFAULT',
    SPECTATOR: 'text-muted-foreground bg-muted border-border',
  };

  return (
    <header className="status-bar">
      <div className="flex items-center gap-4">
        <Shield className="w-5 h-5 text-kryptonite-DEFAULT" />
        <span className="font-bold text-sm">NSO KRYPTONITE</span>
        <span className={`text-xs px-2 py-1 rounded border ${modeColors[mode]}`}>
          {mode}
        </span>
      </div>

      <div className="flex items-center gap-6 text-sm text-muted-foreground">
        <div className="flex items-center gap-1">
          <Clock className="w-4 h-4" />
          <span>{time.toISOString().split('T')[1].split('.')[0]} UTC</span>
        </div>
        <div className="flex items-center gap-1">
          <Wifi className="w-4 h-4" />
          <span>{meshNodes} nodes</span>
        </div>
        <div className="flex items-center gap-1">
          <AlertTriangle className="w-4 h-4" />
          <span>Scope: {scope}</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button className="kill-switch">KILL SWITCH</button>
      </div>
    </header>
  );
}
