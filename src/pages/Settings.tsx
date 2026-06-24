import { useState } from 'react';
import { Settings as SettingsIcon, Shield, Wifi, HardDrive } from 'lucide-react';

export function Settings() {
  const [mode, setMode] = useState<'WEAPON' | 'SHIELD' | 'SANCTUARY'>('SHIELD');

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <SettingsIcon className="w-6 h-6" /> Settings
      </h1>

      <div className="panel p-4 space-y-4">
        <h2 className="font-semibold flex items-center gap-2">
          <Shield className="w-4 h-4" /> Runtime Mode
        </h2>
        <div className="flex gap-2">
          {(['WEAPON', 'SHIELD', 'SANCTUARY'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`px-4 py-2 rounded-lg border transition-colors ${
                mode === m
                  ? m === 'WEAPON'
                    ? 'bg-weapon-DEFAULT text-white border-weapon-DEFAULT'
                    : m === 'SHIELD'
                      ? 'bg-shield-DEFAULT text-white border-shield-DEFAULT'
                      : 'bg-sanctuary-DEFAULT text-white border-sanctuary-DEFAULT'
                  : 'border-border hover:bg-muted'
              }`}
            >
              {m}
            </button>
          ))}
        </div>
        <p className="text-sm text-muted-foreground">
          Mode switching requires cryptographic handoff and biometric confirmation.
        </p>
      </div>

      <div className="panel p-4 space-y-4">
        <h2 className="font-semibold flex items-center gap-2">
          <Wifi className="w-4 h-4" /> Mesh Network
        </h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Gateway</span>
            <span className="font-mono">10.200.200.1:51820</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Status</span>
            <span className="text-kryptonite-DEFAULT">Connected</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Latency</span>
            <span className="font-mono">12ms</span>
          </div>
        </div>
      </div>

      <div className="panel p-4 space-y-4">
        <h2 className="font-semibold flex items-center gap-2">
          <HardDrive className="w-4 h-4" /> Local Storage
        </h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Cache Size</span>
            <span className="font-mono">24.5 MB</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Offline Queue</span>
            <span className="font-mono">0 pending</span>
          </div>
        </div>
      </div>
    </div>
  );
}
