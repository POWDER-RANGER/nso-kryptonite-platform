import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { Shield, Clock, FlaskConical } from 'lucide-react';

export function StatusBar() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="status-bar">
      <div className="flex items-center gap-3">
        <Shield className="w-5 h-5 text-kryptonite-DEFAULT" />
        <span className="font-bold text-sm">NSO KRYPTONITE</span>
        <span className="text-xs px-2 py-1 border border-amber-500 text-amber-300">SYNTHETIC RANGE</span>
      </div>
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Clock className="w-4 h-4" />
        <span>{time.toISOString().split('T')[1].split('.')[0]} UTC</span>
        <span className="hidden md:inline ml-2">No live targets or sensor connections</span>
      </div>
      <Link to="/exercise" className="inline-flex items-center gap-2 border border-red-700 px-3 py-2 text-sm text-red-300 hover:bg-red-950">
        <FlaskConical className="w-4 h-4" /> TRAINING RANGE
      </Link>
    </header>
  );
}
