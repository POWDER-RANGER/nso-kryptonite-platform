import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Terminal, ChevronRight } from 'lucide-react';
import { rangeAuthHeaders } from '@/lib/range-api';

interface ScenarioSummary { id: string; name: string; stageCount: number }
interface SessionSummary { id: string; name: string; mode: string; status: string; redScore: number; blueScore: number; stage: number; eventCount: number }

export function CommandLine() {
  const [history, setHistory] = useState<string[]>([
    'NSO KRYPTONITE // SYNTHETIC RANGE TERMINAL',
    'No live network actions, mesh status, or external sensors are connected.',
    'Type help to list the commands available in this build.',
  ]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  const say = (...lines: string[]) => setHistory((prev) => [...prev, ...lines]);

  async function readJson<T>(url: string): Promise<T> {
    const response = await fetch(url, { headers: rangeAuthHeaders() });
    const body = await response.json() as T & { error?: string };
    if (!response.ok) throw new Error(body.error || `Request failed: HTTP ${response.status}`);
    return body;
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const cmd = input.toLowerCase().trim();
    if (!cmd || busy) return;
    setHistory((prev) => [...prev, `> ${cmd}`]);
    setInput('');

    if (cmd === 'clear') {
      setHistory([]);
      return;
    }
    if (cmd === 'help') {
      say(
        'Available commands:',
        '  help         List supported commands',
        '  status       Check the API and session store availability',
        '  healthcheck  Check API health and scenario catalogue',
        '  scenarios    List available synthetic scenarios',
        '  sessions     List saved range sessions and scores',
        '  scope        Show the current safety boundary',
        '  mesh         Report whether a real mesh is connected',
        '  clear        Clear terminal output',
        'Unsupported commands do not trigger an operation.',
      );
      return;
    }
    if (cmd === 'scope') {
      say(
        'Scope: BUILT-IN SYNTHETIC SCENARIOS ONLY',
        'Live targets: none | External network actions: disabled',
        'Wireless transmission: disabled | Credential collection: disabled',
      );
      return;
    }
    if (cmd === 'mesh') {
      say('Mesh: NOT CONNECTED', 'No real nodes or WireGuard peers are registered by this synthetic range slice.');
      return;
    }
    if (!['status', 'healthcheck', 'scenarios', 'sessions'].includes(cmd)) {
      say(`Command not implemented: ${cmd}`, 'No operation was sent. Use help for supported commands.');
      return;
    }

    setBusy(true);
    try {
      if (cmd === 'status') {
        const health = await readJson<{ status: string; version: string }>('/health');
        say(`API: ${health.status.toUpperCase()} (version ${health.version})`);
        try {
          const body = await readJson<{ data: SessionSummary[] }>('/api/v1/range/sessions');
          say(`Range session store: available; ${body.data.length} session(s) listed.`);
        } catch (error) {
          say(`Range session store: unavailable — ${error instanceof Error ? error.message : 'request failed'}`);
        }
      } else if (cmd === 'healthcheck') {
        const health = await readJson<{ status: string; version: string }>('/health');
        const scenarios = await readJson<{ data: ScenarioSummary[] }>('/api/v1/range/scenarios');
        say(`API health: ${health.status.toUpperCase()} (version ${health.version})`);
        say(`Scenario catalogue: ${scenarios.data.length} built-in synthetic scenario(s).`);
        say('Database, authentication, mesh, and real sensors are not inferred from this health response.');
      } else if (cmd === 'scenarios') {
        const body = await readJson<{ data: ScenarioSummary[] }>('/api/v1/range/scenarios');
        say(...body.data.map((scenario) => `${scenario.id} — ${scenario.name} (${scenario.stageCount} stages)`));
      } else if (cmd === 'sessions') {
        const body = await readJson<{ data: SessionSummary[] }>('/api/v1/range/sessions');
        if (!body.data.length) say('No saved range sessions. Create one from Training Range.');
        else say(...body.data.map((session) => `${session.name} | ${session.mode} | ${session.status} | Red ${session.redScore} : Blue ${session.blueScore} | stage ${session.stage}`));
      }
    } catch (error) {
      say(`Command failed: ${error instanceof Error ? error.message : 'unknown error'}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="command-line">
      <div className="flex items-center gap-2 mb-2 text-muted-foreground">
        <Terminal className="w-4 h-4" />
        <span className="text-xs">Range CLI / read-only diagnostics</span>
      </div>
      <div className="h-36 overflow-auto font-mono text-xs space-y-0.5" aria-live="polite">
        {history.map((line, i) => (
          <div key={i} className={line.startsWith('>') ? 'text-yellow-400' : 'text-green-400/70'}>{line}</div>
        ))}
        <div ref={endRef} />
      </div>
      <form onSubmit={handleSubmit} className="mt-2 flex items-center gap-1">
        <ChevronRight className="w-4 h-4 text-yellow-400" />
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="flex-1 bg-transparent text-yellow-400 outline-none text-xs"
          placeholder={busy ? 'Checking…' : 'Enter a supported command…'}
          autoComplete="off"
          spellCheck={false}
          disabled={busy}
          aria-label="Range diagnostic command"
        />
      </form>
    </div>
  );
}
