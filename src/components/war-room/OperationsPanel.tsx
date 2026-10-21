import { Link } from 'react-router';
import { Crosshair, BookOpen, Swords, ClipboardList } from 'lucide-react';

export function OperationsPanel() {
  return (
    <div className="panel">
      <div className="panel-header flex items-center gap-2">
        <Crosshair className="w-4 h-4" />
        <span>Range Operations</span>
        <span className="text-xs text-muted-foreground ml-auto">SYNTHETIC ONLY</span>
      </div>
      <div className="panel-content space-y-3">
        <p className="text-sm text-muted-foreground">The executable path currently supports pre-authored telemetry exercises. Live payload deployment, real sensor ingestion, and mesh operations are not enabled.</p>
        <Link to="/exercise" className="flex items-center gap-3 border border-red-700 p-3 hover:bg-red-950/40">
          <BookOpen className="w-5 h-5 text-red-400" />
          <span><strong className="block text-sm">Start training</strong><span className="text-xs text-muted-foreground">Investigate synthetic events and practice response.</span></span>
        </Link>
        <Link to="/exercise" className="flex items-center gap-3 border border-border p-3 hover:bg-muted/40">
          <Swords className="w-5 h-5 text-purple-400" />
          <span><strong className="block text-sm">Operator vs Operator</strong><span className="text-xs text-muted-foreground">Turn-based Red/Blue scorecard; no live attack actions.</span></span>
        </Link>
        <Link to="/debrief" className="flex items-center gap-3 border border-border p-3 hover:bg-muted/40">
          <ClipboardList className="w-5 h-5 text-blue-400" />
          <span><strong className="block text-sm">Debrief room</strong><span className="text-xs text-muted-foreground">Legacy debrief screen; real session-linked reporting is a future milestone.</span></span>
        </Link>
      </div>
    </div>
  );
}
