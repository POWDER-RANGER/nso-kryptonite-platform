import { useState, useRef, useEffect } from 'react';
import { Terminal, ChevronRight } from 'lucide-react';

export function CommandLine() {
  const [history, setHistory] = useState<string[]>([
    '> healthcheck',
    'Mesh: 12/12 nodes online',
    'Telemetry: Zeek ✓ | EDR ✓ | DNS ✓ | NetFlow ✓',
    'Token: Valid, expires in 47s',
    'Scope: 192.168.10.0/24, Techniques: T1003-T1059',
    'Kill-switch: Armed, biometric confirmed',
  ]);
  const [input, setInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    setHistory((prev) => [...prev, `> ${input}`]);

    // Simple command responses
    const cmd = input.toLowerCase().trim();
    if (cmd === 'help') {
      setHistory((prev) => [
        ...prev,
        'Available commands:',
        '  help        Show this help message',
        '  status      Show current status',
        '  healthcheck Run system health check',
        '  scope       Show authorization scope',
        '  mesh        Show mesh node status',
        '  mode        Switch runtime mode',
        '  deploy      Deploy payload (WEAPON mode)',
        '  hunt        Run detection query (SHIELD mode)',
        '  clear       Clear terminal',
      ]);
    } else if (cmd === 'clear') {
      setHistory([]);
    } else if (cmd === 'status') {
      setHistory((prev) => [
        ...prev,
        'Mode: WEAPON',
        'Exercise: tier-1-ad-basics',
        'Scope: 192.168.10.0/24',
        'Token: Valid (expires in 43s)',
      ]);
    } else {
      setHistory((prev) => [...prev, `Command not found: ${input}`]);
    }

    setInput('');
  };

  return (
    <div className="command-line">
      <div className="flex items-center gap-2 mb-2 text-muted-foreground">
        <Terminal className="w-4 h-4" />
        <span className="text-xs">Command Line Interface</span>
      </div>
      <div className="h-32 overflow-auto font-mono text-xs space-y-0.5">
        {history.map((line, i) => (
          <div key={i} className={line.startsWith('>') ? 'text-yellow-400' : 'text-green-400/70'}>
            {line}
          </div>
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
          placeholder="Enter command..."
          autoComplete="off"
          spellCheck={false}
        />
      </form>
    </div>
  );
}
