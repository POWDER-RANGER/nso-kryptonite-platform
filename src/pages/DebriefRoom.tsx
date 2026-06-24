import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Clock, Target, Shield } from 'lucide-react';

const halfLifeData = [
  { tier: 'Tier 1', halfLife: 4.2 },
  { tier: 'Tier 2', halfLife: 3.1 },
  { tier: 'Tier 3', halfLife: 2.8 },
  { tier: 'Tier 4', halfLife: 2.3 },
  { tier: 'Tier 5', halfLife: 1.9 },
];

export function DebriefRoom() {
  const [phase] = useState('Blue Team Presents');
  const [timeRemaining] = useState('54:32');

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Debrief Room</h1>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            {timeRemaining}
          </span>
          <span className="px-2 py-1 bg-sanctuary-DEFAULT/10 text-sanctuary-DEFAULT rounded">
            {phase}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="panel p-4">
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-4 h-4 text-weapon-DEFAULT" />
            <span className="font-semibold text-sm">Red Score</span>
          </div>
          <p className="text-2xl font-bold text-weapon-DEFAULT">85/100</p>
          <p className="text-xs text-muted-foreground">3 techniques deployed, 2 detected</p>
        </div>

        <div className="panel p-4">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-4 h-4 text-shield-DEFAULT" />
            <span className="font-semibold text-sm">Blue Score</span>
          </div>
          <p className="text-2xl font-bold text-shield-DEFAULT">72/100</p>
          <p className="text-xs text-muted-foreground">4 rules written, 2 true positives</p>
        </div>

        <div className="panel p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-sanctuary-DEFAULT" />
            <span className="font-semibold text-sm">Detection Half-Life</span>
          </div>
          <p className="text-2xl font-bold text-sanctuary-DEFAULT">3.2 hrs</p>
          <p className="text-xs text-muted-foreground">Target: 2-6 hours (optimal)</p>
        </div>
      </div>

      <div className="panel p-4">
        <h3 className="font-semibold mb-4">Detection Half-Life Trend</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={halfLifeData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="tier" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="halfLife" fill="#7c3aed" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
