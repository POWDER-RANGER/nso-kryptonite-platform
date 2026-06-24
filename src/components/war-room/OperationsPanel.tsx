import { useState } from 'react';
import { Crosshair, Play, Pause, Settings } from 'lucide-react';

export function OperationsPanel() {
  const [mode] = useState<'WEAPON' | 'SHIELD' | 'SANCTUARY'>('WEAPON');

  return (
    <div className="panel">
      <div className="panel-header flex items-center gap-2">
        <Crosshair className="w-4 h-4" />
        <span>Operations Panel</span>
        <span className="text-xs text-muted-foreground ml-auto">{mode}</span>
      </div>
      <div className="panel-content space-y-3">
        {mode === 'WEAPON' && (
          <>
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">Payload Deployment</label>
              <select className="w-full text-sm bg-muted border border-border rounded px-2 py-1">
                <option>Select payload...</option>
                <option>AS-REP Roast (T1558.004)</option>
                <option>Kerberoast (T1558.003)</option>
                <option>DCSync (T1003.006)</option>
              </select>
            </div>

            <div className="flex gap-2">
              <button className="flex items-center gap-1 px-3 py-1.5 text-sm bg-weapon-DEFAULT text-white rounded hover:bg-weapon-dark transition-colors">
                <Play className="w-3 h-3" /> Deploy
              </button>
              <button className="flex items-center gap-1 px-3 py-1.5 text-sm bg-muted rounded hover:bg-muted/80 transition-colors">
                <Pause className="w-3 h-3" /> Abort
              </button>
            </div>

            <div className="pt-2 border-t border-border">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Error Budget</span>
                <span className="text-weapon-DEFAULT font-mono">7/10</span>
              </div>
              <div className="mt-1 h-1.5 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-weapon-DEFAULT rounded-full" style={{ width: '70%' }} />
              </div>
            </div>
          </>
        )}

        {mode === 'SHIELD' && (
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">Sigma Rule Editor</label>
            <textarea
              className="w-full h-24 text-xs font-mono bg-muted border border-border rounded p-2"
              placeholder="title: Your Rule Name&#10;logsource:&#10;  product: windows&#10;detection:&#10;  selection:&#10;    EventID: 4769&#10;  condition: selection"
            />
            <div className="flex gap-2">
              <button className="flex items-center gap-1 px-3 py-1.5 text-sm bg-shield-DEFAULT text-white rounded">
                <Play className="w-3 h-3" /> Deploy Rule
              </button>
              <button className="flex items-center gap-1 px-3 py-1.5 text-sm bg-muted rounded">
                <Settings className="w-3 h-3" /> Tune
              </button>
            </div>
          </div>
        )}

        {mode === 'SANCTUARY' && (
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Detection Half-Life</span>
              <span className="font-mono text-sanctuary-DEFAULT">3.2 hours</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Current Phase</span>
              <span className="font-mono">LATERAL_MOVEMENT</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Blue Confidence</span>
              <span className="font-mono">62%</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
