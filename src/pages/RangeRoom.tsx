import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Activity, Play, Users, ShieldCheck } from 'lucide-react';

interface Scenario { id: string; name: string; description: string; stageCount: number; source: string }
interface Session { id: string; name: string; scenarioId: string; mode: 'TRAINING' | 'OPERATOR_VS_OPERATOR'; status: string; stage: number; currentTurn: 'RED'|'BLUE'|null; redScore: number; blueScore: number; events: Array<{id:string;timestamp:string;source:string;severity:string;title:string;detail:string;clue:string;stage:number}>; objectives: Array<{id:string;label:string;team:string;points:number;complete:boolean}>; notes: string[] }
async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, headers: { 'Content-Type': 'application/json', ...init?.headers } });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || 'Request failed');
  return body.data as T;
}

export function ExerciseSetup() {
  const navigate = useNavigate();
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [name, setName] = useState('Training Exercise');
  const [scenarioId, setScenarioId] = useState('identity-anomaly');
  const [mode, setMode] = useState<'TRAINING' | 'OPERATOR_VS_OPERATOR'>('TRAINING');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { request<Scenario[]>('/api/v1/range/scenarios').then(setScenarios).catch((e) => setError(e.message)); }, []);

  async function createSession() {
    setBusy(true); setError('');
    try {
      const session = await request<Session>('/api/v1/range/sessions', {
        method: 'POST', body: JSON.stringify({ name, scenarioId, mode }),
      });
      navigate('/range/' + session.id);
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to create session'); }
    finally { setBusy(false); }
  }

  return <div className="max-w-3xl mx-auto space-y-6">
    <header><p className="text-xs uppercase tracking-[0.25em] text-red-500">Range control / 01</p><h1 className="text-3xl font-bold mt-2">Create an exercise</h1><p className="text-muted-foreground mt-2">Run a repeatable defensive training scenario or a turn-based Red-vs-Blue scoring match. All events are synthetic.</p></header>
    <div className="panel p-5 space-y-5">
      <label className="block text-sm font-medium">Exercise name<input value={name} onChange={(e)=>setName(e.target.value)} maxLength={80} className="mt-1 w-full px-3 py-2 bg-background border border-border" /></label>
      <label className="block text-sm font-medium">Scenario<select value={scenarioId} onChange={(e)=>setScenarioId(e.target.value)} className="mt-1 w-full px-3 py-2 bg-background border border-border">{scenarios.map((s)=><option key={s.id} value={s.id}>{s.name} · {s.stageCount} stages</option>)}</select></label>
      <div className="grid md:grid-cols-2 gap-3">
        <button type="button" onClick={()=>setMode('TRAINING')} className={'text-left p-4 border '+(mode==='TRAINING'?'border-red-500 bg-red-500/10':'border-border')}><ShieldCheck className="w-5 h-5 mb-2 text-red-500"/><strong className="block">Training</strong><span className="text-sm text-muted-foreground">Practice investigation, detection writing, containment rationale, and recovery.</span></button>
        <button type="button" onClick={()=>setMode('OPERATOR_VS_OPERATOR')} className={'text-left p-4 border '+(mode==='OPERATOR_VS_OPERATOR'?'border-red-500 bg-red-500/10':'border-border')}><Users className="w-5 h-5 mb-2 text-red-500"/><strong className="block">Operator vs Operator</strong><span className="text-sm text-muted-foreground">Turn-based Red/Blue exercise with a shared scorecard. No live attack tools.</span></button>
      </div>
      {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4"><p className="text-xs text-muted-foreground">Prototype runtime: session state is in memory and resets when the API restarts.</p><button disabled={busy||!name.trim()||scenarios.length===0} onClick={createSession} className="inline-flex items-center gap-2 px-4 py-2 bg-red-700 text-white disabled:opacity-50"><Play className="w-4 h-4"/>{busy?'Creating…':'Start exercise'}</button></div>
    </div>
    <div className="panel p-4"><div className="flex gap-2 items-center font-semibold"><Activity className="w-4 h-4"/>Available synthetic scenarios</div><div className="grid md:grid-cols-3 gap-3 mt-4">{scenarios.map(s=><article key={s.id} className="border border-border p-3"><h2 className="font-semibold">{s.name}</h2><p className="text-sm text-muted-foreground mt-1">{s.description}</p><p className="text-xs mt-3 text-red-400">{s.stageCount} pre-authored stages</p></article>)}</div></div>
  </div>;
}

export function RangeRoom() {
  const navigate = useNavigate();
  const id = window.location.pathname.split('/').pop() || '';
  const [session, setSession] = useState<Session|null>(null);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function refresh() { try { setSession(await request<Session>('/api/v1/range/sessions/'+id)); } catch(e) { setError(e instanceof Error?e.message:'Unable to load session'); } }
  useEffect(()=>{ void refresh(); },[id]);
  async function act(action:string) {
    setBusy(true); setError('');
    try {
      const updated = await request<Session>('/api/v1/range/sessions/'+id+'/actions',{method:'POST',body:JSON.stringify({action,...(note.trim()?{note:note.trim()}:{})})});
      setSession(updated); setNote('');
    } catch(e) { setError(e instanceof Error?e.message:'Action failed'); }
    finally { setBusy(false); }
  }
  async function abort() {
    setBusy(true); setError('');
    try { setSession(await request<Session>('/api/v1/range/sessions/'+id+'/abort',{method:'POST'})); }
    catch(e) { setError(e instanceof Error?e.message:'Abort failed'); }
    finally { setBusy(false); }
  }
  if (!session) return <div className="max-w-4xl mx-auto p-6"><p>{error||'Loading range session…'}</p><button className="underline mt-3" onClick={()=>navigate('/exercise')}>Back to exercise setup</button></div>;
  const complete = session.status !== 'ACTIVE';
  const opvop = session.mode === 'OPERATOR_VS_OPERATOR';
  const redTurnAllowed = !opvop || session.currentTurn === 'RED';
  const blueTurnAllowed = !opvop || session.currentTurn === 'BLUE';
  return <div className="max-w-6xl mx-auto space-y-5">
    <header className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs uppercase tracking-[0.25em] text-red-500">Range room / live session</p><h1 className="text-3xl font-bold mt-2">{session.name}</h1><p className="text-sm text-muted-foreground mt-1">{session.mode.replaceAll('_',' ')} · {session.status} · stage {session.stage} · turn {session.currentTurn || 'TRAINING'}</p></div><button onClick={()=>navigate('/exercise')} className="border border-border px-3 py-2">New exercise</button></header>
    <div className="grid md:grid-cols-2 gap-4">
      <div className="panel p-5"><p className="text-xs uppercase tracking-widest text-red-400">Red operator</p><p className="text-4xl font-bold mt-2">{session.redScore}</p><p className="text-sm text-muted-foreground">Scenario progression points</p></div>
      <div className="panel p-5"><p className="text-xs uppercase tracking-widest text-blue-400">Blue operator</p><p className="text-4xl font-bold mt-2">{session.blueScore}</p><p className="text-sm text-muted-foreground">Evidence-based defensive points</p></div>
    </div>
    <div className="grid lg:grid-cols-[1.2fr_0.8fr] gap-4">
      <section className="panel p-4"><div className="flex justify-between items-center gap-2"><h2 className="font-semibold">Synthetic telemetry</h2><button disabled={busy||complete||session.stage>=4||!redTurnAllowed} onClick={()=>act('ADVANCE_SCENARIO')} className="bg-red-700 text-white px-3 py-2 text-sm disabled:opacity-40">Advance scenario</button></div><p className="text-xs text-muted-foreground mt-2">Advancing reveals the next pre-authored event; it does not send network traffic.</p><div className="space-y-3 mt-4">{session.events.length===0?<p className="text-sm text-muted-foreground py-8 text-center">No events yet. Advance the scenario to begin.</p>:session.events.map(event=><article key={event.id} className="border border-border p-3"><div className="flex flex-wrap justify-between gap-2 text-xs"><span>{event.source} · STAGE {event.stage}</span><span className={event.severity==='HIGH'?'text-red-400':event.severity==='MEDIUM'?'text-amber-400':'text-muted-foreground'}>{event.severity}</span></div><h3 className="font-semibold mt-1">{event.title}</h3><p className="text-sm text-muted-foreground mt-1">{event.detail}</p><details className="mt-2 text-sm"><summary className="cursor-pointer text-blue-400">Training clue</summary><p className="mt-2">{event.clue}</p></details></article>)}</div></section>
      <section className="panel p-4 space-y-4"><h2 className="font-semibold">Blue team actions</h2><label className="block text-sm">Finding / rationale<textarea value={note} onChange={e=>setNote(e.target.value)} maxLength={500} rows={4} className="mt-1 w-full bg-background border border-border p-3" placeholder="Explain the evidence, decision, or detection logic…"/></label><div className="grid grid-cols-1 gap-2"><button disabled={busy||complete||!note.trim()||!blueTurnAllowed} onClick={()=>act('INVESTIGATE')} className="border border-blue-500 text-blue-300 p-2 disabled:opacity-40">Submit investigation (+20 when eligible)</button><button disabled={busy||complete||!note.trim()||!blueTurnAllowed} onClick={()=>act('CONTAIN')} className="border border-blue-500 text-blue-300 p-2 disabled:opacity-40">Record containment (+15 when eligible)</button><button disabled={busy||complete||!note.trim()||!blueTurnAllowed} onClick={()=>act('SUBMIT_DETECTION')} className="border border-blue-500 text-blue-300 p-2 disabled:opacity-40">Submit detection rationale</button></div><div className="border-t border-border pt-3"><h3 className="font-semibold text-sm">Objectives</h3>{session.objectives.map(o=><div key={o.id} className="flex justify-between gap-2 text-sm py-2 border-b border-border/50"><span>{o.complete?'✓':'○'} {o.label}</span><span className="font-mono">+{o.points}</span></div>)}</div>{!complete&&opvop&&session.currentTurn==='BLUE'&&<button disabled={busy} onClick={()=>act('END_TURN')} className="w-full border border-blue-500 text-blue-300 p-2">End Blue turn and return control to Red</button>}{!complete&&session.stage>=4&&(!opvop||session.currentTurn==='RED')&&<button disabled={busy} onClick={()=>act('FINISH')} className="w-full bg-green-800 text-white p-2">Finish exercise and lock scorecard</button>}{!complete&&<button disabled={busy} onClick={abort} className="w-full border border-red-800 text-red-300 p-2">Abort session</button>}{complete&&<p className="text-sm text-green-400">Session closed. Review the event timeline and scorecard for the debrief.</p>}{error&&<p role="alert" className="text-sm text-red-400">{error}</p>}</section>
    </div>
    <section className="panel p-4"><h2 className="font-semibold">Session notes</h2>{session.notes.map((n,i)=><p key={i} className="text-sm py-2 border-b border-border/50">{n}</p>)}</section>
  </div>;
}
