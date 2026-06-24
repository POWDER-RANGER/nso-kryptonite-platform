import { useState } from 'react';
import { Play, Settings, Users } from 'lucide-react';

export function ExerciseSetup() {
  const [name, setName] = useState('');
  const [scenario, setScenario] = useState('');
  const [scope, setScope] = useState('192.168.10.0/24');

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Exercise Setup</h1>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Exercise Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 border border-border rounded-lg bg-card"
            placeholder="e.g., Tier 1: AD Basics"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Scenario</label>
          <select
            value={scenario}
            onChange={(e) => setScenario(e.target.value)}
            className="w-full px-3 py-2 border border-border rounded-lg bg-card"
          >
            <option value="">Select scenario...</option>
            <option value="tier-1-ad">Tier 1: AD Basics</option>
            <option value="tier-1-wireless">Tier 1: Wireless Basics</option>
            <option value="tier-1-protocol">Tier 1: Protocol Layer</option>
            <option value="tier-2-advanced">Tier 2: Advanced Persistent Threat</option>
            <option value="tier-3-nso">Tier 3: NSO Full Campaign</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Network Scope</label>
          <input
            type="text"
            value={scope}
            onChange={(e) => setScope(e.target.value)}
            className="w-full px-3 py-2 border border-border rounded-lg bg-card"
          />
        </div>

        <div className="flex gap-3 pt-4">
          <button className="flex items-center gap-2 px-4 py-2 bg-kryptonite-DEFAULT text-white rounded-lg hover:bg-kryptonite-dark transition-colors">
            <Play className="w-4 h-4" /> Deploy Exercise
          </button>
          <button className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors">
            <Settings className="w-4 h-4" /> Advanced
          </button>
          <button className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors">
            <Users className="w-4 h-4" /> Assign Operators
          </button>
        </div>
      </div>
    </div>
  );
}
