import { useEffect, useState } from 'react';
import { ClipboardCheck, Shield, Target, Clock } from 'lucide-react';
import { rangeAuthHeaders } from '@/lib/range-api';

interface Summary { id:string; name:string; scenarioId:string; mode:string; status:string; createdAt:string; redScore:number; blueScore:number; stage:number; eventCount:number }
interface Detail extends Summary { events:Array<{id:string;timestamp:string;source:string;severity:string;title:string;detail:string;clue:string;stage:number}>; objectives:Array<{id:string;label:string;team:string;points:number;complete:boolean}>; notes:string[] }
async function fetchJson<T>(url:string):Promise<T>{
  const response=await fetch(url, { headers: rangeAuthHeaders() });
  const body=await response.json();
  if(!response.ok) throw new Error(body.error||'Unable to load debrief');
  return body.data as T;
}

export function DebriefRoom() {
  const [sessions,setSessions]=useState<Summary[]>([]);
  const [selectedId,setSelectedId]=useState('');
  const [detail,setDetail]=useState<Detail|null>(null);
  const [error,setError]=useState('');
  useEffect(()=>{
    let mounted = true;
    const loadSessions = () => {
      fetchJson<Summary[]>('/api/v1/range/sessions').then((items)=>{
        if (!mounted) return;
        setSessions(items);
        setError('');
        if(items[0]) setSelectedId((previous)=>previous || items[0].id);
      }).catch((e)=>{
        if (mounted) setError(e instanceof Error?e.message:'Range API unavailable');
      });
    };
    loadSessions();
    window.addEventListener('range-access-changed', loadSessions);
    return () => {
      mounted = false;
      window.removeEventListener('range-access-changed', loadSessions);
    };
  },[]);
  useEffect(()=>{
    if(!selectedId){setDetail(null);return;}
    fetchJson<Detail>('/api/v1/range/sessions/'+selectedId).then(setDetail).catch((e)=>setError(e instanceof Error?e.message:'Unable to load session'));
  },[selectedId]);

  return <div className="max-w-5xl mx-auto space-y-6">
    <header><p className="text-xs uppercase tracking-[0.25em] text-red-500">Sanctuary / after-action review</p><h1 className="text-3xl font-bold mt-2">Debrief Room</h1><p className="text-muted-foreground mt-2">Session-linked scores, objectives, synthetic event timeline, and operator notes. No live sensor claims.</p></header>
    {error&&<p role="alert" className="text-sm text-red-400">{error}</p>}
    <section className="panel p-4"><label className="block text-sm font-medium">Select session<select value={selectedId} onChange={e=>setSelectedId(e.target.value)} className="block mt-1 w-full bg-background border border-border p-2"><option value="">No session selected</option>{sessions.map(s=><option key={s.id} value={s.id}>{s.name} — {s.mode.replaceAll('_',' ')} — {s.status}</option>)}</select></label>{!sessions.length&&!error&&<p className="text-sm text-muted-foreground mt-3">No range sessions yet. Create an exercise to populate this report.</p>}</section>
    {detail&&<>
      <div className="grid md:grid-cols-3 gap-4">
        <div className="panel p-4"><div className="flex gap-2 items-center text-sm"><Target className="w-4 h-4 text-red-400"/>Red score</div><p className="text-3xl font-bold mt-2">{detail.redScore}</p><p className="text-xs text-muted-foreground">10 points per synthetic stage revealed</p></div>
        <div className="panel p-4"><div className="flex gap-2 items-center text-sm"><Shield className="w-4 h-4 text-blue-400"/>Blue score</div><p className="text-3xl font-bold mt-2">{detail.blueScore}</p><p className="text-xs text-muted-foreground">Evidence/action rubric; see completed objectives</p></div>
        <div className="panel p-4"><div className="flex gap-2 items-center text-sm"><Clock className="w-4 h-4 text-amber-300"/>Session state</div><p className="text-xl font-bold mt-2">{detail.status}</p><p className="text-xs text-muted-foreground">{detail.stage} stages revealed · {detail.eventCount} events</p></div>
      </div>
      {detail.mode === 'OPERATOR_VS_OPERATOR' && detail.status === 'COMPLETED' && <section className="panel border border-purple-700 p-4"><p className="text-xs uppercase tracking-widest text-purple-300">Final match result</p><h2 className="text-2xl font-bold mt-1">{detail.redScore === detail.blueScore ? 'DRAW' : detail.redScore > detail.blueScore ? 'RED WINS' : 'BLUE WINS'}</h2><p className="text-sm text-muted-foreground mt-1">Red {detail.redScore} — Blue {detail.blueScore}. Scoring reflects the synthetic training rubric.</p></section>}
      <section className="panel p-4"><h2 className="flex items-center gap-2 font-semibold"><ClipboardCheck className="w-4 h-4"/>Objective results</h2><div className="mt-3">{detail.objectives.map(o=><div key={o.id} className="flex justify-between gap-3 border-b border-border/50 py-2 text-sm"><span>{o.complete?'✓':'○'} {o.label} <span className="text-xs text-muted-foreground">({o.team})</span></span><span>+{o.points}</span></div>)}</div></section>
      <section className="panel p-4"><h2 className="font-semibold">Event timeline</h2>{detail.events.length?detail.events.slice().reverse().map(e=><article key={e.id} className="border-b border-border/50 py-3"><p className="text-xs text-muted-foreground">{new Date(e.timestamp).toLocaleString()} · {e.source} · {e.severity}</p><h3 className="font-medium mt-1">{e.title}</h3><p className="text-sm text-muted-foreground mt-1">{e.detail}</p></article>):<p className="text-sm text-muted-foreground mt-3">No events recorded in this session.</p>}</section>
      <section className="panel p-4"><h2 className="font-semibold">Operator notes</h2>{detail.notes.map((note,i)=><p key={i} className="text-sm border-b border-border/50 py-2">{note}</p>)}</section>
    </>}
  </div>;
}
