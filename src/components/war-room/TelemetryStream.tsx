import { useEffect, useState } from 'react';
import { Activity, AlertCircle, CheckCircle } from 'lucide-react';

interface TelemetryEvent {
  id: number;
  source: string;
  eventType: string;
  timestamp: string;
  severity: 'info' | 'warning' | 'critical';
}

export function TelemetryStream() {
  const [events, setEvents] = useState<TelemetryEvent[]>([
    { id: 1, source: 'Zeek', eventType: 'kerberos.log', timestamp: '14:22:01', severity: 'info' },
    { id: 2, source: 'EDR', eventType: 'Process Create', timestamp: '14:22:15', severity: 'warning' },
    { id: 3, source: 'DNS', eventType: 'NXDOMAIN', timestamp: '14:22:30', severity: 'info' },
    { id: 4, source: 'Zeek', eventType: 'conn.log', timestamp: '14:23:07', severity: 'critical' },
  ]);

  useEffect(() => {
    // TODO: Connect to WebSocket telemetry stream
    const interval = setInterval(() => {
      setEvents((prev) => [
        {
          id: Date.now(),
          source: ['Zeek', 'EDR', 'DNS', 'NetFlow'][Math.floor(Math.random() * 4)],
          eventType: 'Auto-generated event',
          timestamp: new Date().toISOString().split('T')[1].split('.')[0],
          severity: ['info', 'warning', 'critical'][Math.floor(Math.random() * 3)] as TelemetryEvent['severity'],
        },
        ...prev.slice(0, 49),
      ]);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const severityIcons = {
    info: <CheckCircle className="w-3 h-3 text-kryptonite-DEFAULT" />,
    warning: <AlertCircle className="w-3 h-3 text-yellow-500" />,
    critical: <AlertCircle className="w-3 h-3 text-weapon-DEFAULT" />,
  };

  return (
    <div className="panel">
      <div className="panel-header flex items-center gap-2">
        <Activity className="w-4 h-4" />
        <span>Telemetry Stream</span>
      </div>
      <div className="panel-content h-64 overflow-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-muted-foreground border-b border-border">
              <th className="text-left py-1">Time</th>
              <th className="text-left py-1">Source</th>
              <th className="text-left py-1">Event</th>
              <th className="text-left py-1">Severity</th>
            </tr>
          </thead>
          <tbody>
            {events.map((event) => (
              <tr key={event.id} className="border-b border-border/50 hover:bg-muted/50">
                <td className="py-1 font-mono">{event.timestamp}</td>
                <td className="py-1">{event.source}</td>
                <td className="py-1">{event.eventType}</td>
                <td className="py-1">{severityIcons[event.severity]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
