import { useEffect, useState, type FormEvent } from 'react';
import { KeyRound, LogOut, Save } from 'lucide-react';
import { clearRangeAccess, getSelectedRangeRole, saveRangeAccess, type RangeOperatorRole } from '@/lib/range-api';

const ROLES: RangeOperatorRole[] = ['FACILITATOR', 'RED', 'BLUE'];

export function RangeAccess() {
  const [role, setRole] = useState<RangeOperatorRole>('FACILITATOR');
  const [secret, setSecret] = useState('');
  const [hasSecret, setHasSecret] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setRole(getSelectedRangeRole());
    setHasSecret(Boolean(sessionStorage.getItem('nso_kryptonite_range_token')));
  }, []);

  function apply(event: FormEvent) {
    event.preventDefault();
    saveRangeAccess(role, secret);
    setSecret('');
    setHasSecret(Boolean(sessionStorage.getItem('nso_kryptonite_range_token')));
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2500);
  }

  function clear() {
    clearRangeAccess();
    setSecret('');
    setHasSecret(false);
    setSaved(false);
  }

  return (
    <section aria-label="Range operator access" className="mx-4 mt-3 border border-border bg-card/70 p-3">
      <form onSubmit={apply} className="flex flex-wrap items-end gap-3">
        <div className="mr-auto min-w-44">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest">
            <KeyRound className="h-3.5 w-3.5 text-red-400" /> Operator access
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Local development needs no key. A deployed range requires a role key.</p>
        </div>
        <label className="block text-xs">Role
          <select value={role} onChange={(event) => setRole(event.target.value as RangeOperatorRole)} className="mt-1 block min-w-36 border border-border bg-background px-2 py-2 text-sm">
            {ROLES.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>
        <label className="block min-w-52 flex-1 text-xs">Role key
          <input
            type="password"
            value={secret}
            onChange={(event) => setSecret(event.target.value)}
            autoComplete="off"
            spellCheck={false}
            placeholder={hasSecret ? 'Key stored for this tab' : 'Enter role key for deployed use'}
            className="mt-1 block w-full border border-border bg-background px-3 py-2 text-sm"
          />
        </label>
        <button type="submit" className="inline-flex items-center gap-2 bg-red-800 px-3 py-2 text-sm text-white">
          <Save className="h-4 w-4" /> {saved ? 'Saved' : 'Apply'}
        </button>
        {hasSecret && <button type="button" onClick={clear} className="inline-flex items-center gap-2 border border-border px-3 py-2 text-sm">
          <LogOut className="h-4 w-4" /> Clear
        </button>}
      </form>
      <p aria-live="polite" className="mt-2 text-xs text-muted-foreground">
        {saved ? 'Access setting updated for this browser tab.' : hasSecret ? 'A key is stored for this tab; the key itself determines server permissions.' : 'No key stored. Anonymous range access is accepted only in local development.'}
      </p>
    </section>
  );
}
