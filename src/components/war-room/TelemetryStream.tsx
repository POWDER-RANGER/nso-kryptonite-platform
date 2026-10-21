import { useEffect, useState } from 'react';
import { Activity, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';
import { rangeAuthHeaders } from '@/lib/range-api';

interface RangeSummary { id: string; name: string; mode: string; status: string }
interface Event { id: string; source: string; title: string; timestamp: string; severity: 'INFO'|'LOW'|'MEDIUM'|'HIGH'; stage: number }
interface SessionDetail { events: Event[]; name: string }
async function loadEvents(): Promise<Event[]> {
  const listResponse = await fetch('/api/v1/range/sessions', { headers: rangeAuthHeaders() });
  if (!listResponse.ok) throw new Error('Range API unavailable');
  const listBody = await listResponse.json() as {data: RangeSummary[]};
  const active = listBody.data.slice(0, 8);
  const details = await Promise.all(active.map(async (session) => {
    const response = await fetch('/api/v1/range/sessions/' + session.id, { headers: rangeAuthHeaders() });
    if (!response.ok) return [] as Event[];
    const body = await response.json() as {data: SessionDetail};
    return body.data.events;
  }));
  return details.flat().sort((a,b)=>b.timestamp.localeCompare(a.timestamp)).slice(0,50);
}

export function TelemetryStream() {
  const [events, setEvents] = useState<Event[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let mounted = true;
    const refresh = async () => {
      try { const next = await loadEvents(); if (mounted) { setEvents(next); setError(''); } }
      catch { if (mounted) setError('Range API unavailable. No telemetry is being received.'); }
      finally { if (mounted) setLoading(false); }
    };
    void refresh();
    const timer = setInterval(() => void refresh(), 4000);
    return () => { mounted = false; clearInterval(timer); };
  }, []);

  const severityIcons = {
    INFO: <CheckCircle className="w-3 h-3 text-kryptonite-DEFAULT" />,
    LOW: <CheckCircle className="w-3 h-3 text-muted-foreground" />,
    MEDIUM: <AlertCircle className="w-3 h-3 text-yellow-500" />,
    HIGH: <AlertCircle className="w-3 h-3 text-red-500" />,
  };

  return (
    <div className="panel">
      <div className="panel-header flex items-center gap-2">
        <Activity className="w-4 h-4" />
        <span>Synthetic Telemetry</span>
        <span className="ml-auto text-xs text-muted-foreground inline-flex items-center gap-1"><RefreshCw className="w-3 h-3"/> POLL 4S</span>
      </div>
      <div className="panel-content h-64 overflow-auto">
        {error && <p role="status" className="text-xs text-amber-300 mb-2">{error}</p>}
        <table className="w-full text-xs">
          <thead><tr className="text-muted-foreground border-b border-border"><th className="text-left py-1">Time</th><th className="text-left py-1">Source</th><th className="text-left py-1">Event</th><th className="text-left py-1">Severity</th></tr></thead>
          <tbody>
            {events.map((event) => <tr key={event.id} className="border-b border-border/50 hover:bg-muted/50"><td className="py-1 font-mono">{new Date(event.timestamp).toISOString().split('T')[1].split('.')[0]}</td><td className="py-1">{event.source}</td><td className="py-1">{event.title}</td><td className="py-1">{severityIcons[event.severity]}</td></tr>)}
            {!events.length && <tr><td colSpan={4} className="py-8 text-center text-muted-foreground">{loading?'Loading range events…':'No synthetic events yet. Create an exercise and advance its scenario.'}</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
