'use client';
import { useEffect, useState } from 'react';
import { Check, Copy, Loader2, RefreshCw, Sparkles, TriangleAlert } from 'lucide-react';
import { toast } from 'sonner';
import { useWS } from '@/lib/ws/store';
import type { PReport } from '@/lib/ws/types';

type Status = { enabled: boolean; model?: string; provider?: string; defaultLang?: 'en' | 'am' };
let statusCache: Promise<Status> | null = null;
function loadStatus() {
  statusCache ||= fetch('/api/ai/status').then(r => r.json()).catch(() => ({ enabled: false }));
  return statusCache;
}
export function useAiStatus() {
  const [s, setS] = useState<Status | null>(null);
  useEffect(() => { let live = true; loadStatus().then(v => live && setS(v)); return () => { live = false; }; }, []);
  return s;
}

type Result = { summary: string; model: string; usage?: { inputTokens?: number; outputTokens?: number; ms?: number }; redacted?: number };

export function AiSummaryPanel({ reports, mode, title, onUse, compact }: { reports: PReport[]; mode: 'report' | 'period'; title?: string; onUse?: (text: string) => void; compact?: boolean }) {
  const { data, userName } = useWS();
  const status = useAiStatus();
  const [lang, setLang] = useState<'en' | 'am'>('en');
  const [busy, setBusy] = useState(false), [err, setErr] = useState(''), [res, setRes] = useState<Result | null>(null), [text, setText] = useState('');
  const [copied, setCopied] = useState(false);
  useEffect(() => { if (status?.defaultLang) setLang(status.defaultLang); }, [status?.defaultLang]);

  if (!status) return null;
  if (!status.enabled) return <div className="ai-off"><Sparkles size={16} /><span>AI summaries are switched off. A Super Admin can set them up in Settings → AI summaries.</span></div>;

  const run = async () => {
    setBusy(true); setErr('');
    const prosecutorIds = new Set(reports.map(r => r.prosecutorId));
    const redactNames = [
      ...data.users.map(u => u.name),
      ...data.cases.filter(c => prosecutorIds.has(c.prosecutorId)).flatMap(c => c.parties.split(/\s+v\.?\s+|,| and /i)).map(s => s.replace(/Public Prosecutor/i, '').trim()).filter(s => s.length > 2),
    ];
    try {
      const r = await fetch('/api/ai/summarize', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode, lang, periodTitle: title, redactNames,
          reports: reports.slice(0, 60).map(r => ({
            period: r.period, periodLabel: r.periodLabel, author: userName(r.prosecutorId), office: data.users.find(u => u.id === r.prosecutorId)?.office,
            newCases: r.newCases, closedCases: r.closedCases, hearings: r.hearings, summary: r.summary, challenges: r.challenges, nextPlan: r.nextPlan,
          })),
        }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'Summary failed');
      setRes(j); setText(j.summary);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Summary failed');
    }
    setBusy(false);
  };

  return <div className={'ai-panel' + (compact ? ' compact' : '')}>
    <div className="ai-head">
      <span className="ai-title"><Sparkles size={17} />AI summary{mode === 'period' && reports.length > 1 ? ` · ${reports.length} reports` : ''}</span>
      <div className="ai-lang" role="radiogroup" aria-label="Summary language">
        <button type="button" role="radio" aria-checked={lang === 'en'} onClick={() => setLang('en')}>English</button>
        <button type="button" role="radio" aria-checked={lang === 'am'} onClick={() => setLang('am')}>አማርኛ</button>
      </div>
    </div>
    {!res && !busy && <button type="button" className="ws-btn ai-go" onClick={run}><Sparkles size={16} />Generate summary</button>}
    {busy && <div className="ai-busy"><Loader2 size={18} className="spin" />Writing summary… this can take up to a minute.</div>}
    {err && <div className="ai-err"><TriangleAlert size={16} /><span>{err}</span><button type="button" className="ws-btn sm ghost" onClick={run}>Try again</button></div>}
    {res && !busy && <>
      <div className="ai-draft-label">AI draft — check it against the original reports before using it. Names were hidden from the AI service and restored here.</div>
      <textarea className="ws-input ai-text" rows={compact ? 9 : 12} value={text} onChange={e => setText(e.target.value)} lang={lang === 'am' ? 'am' : 'en'} />
      <div className="ai-actions">
        {onUse && <button type="button" className="ws-btn sm" onClick={() => { onUse(text); toast.success('Summary copied into the feedback box'); }}><Check size={14} />Use in feedback</button>}
        <button type="button" className="ws-btn sm ghost" onClick={async () => { try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { toast.error('Copy not available'); } }}>{copied ? <Check size={14} /> : <Copy size={14} />}{copied ? 'Copied' : 'Copy'}</button>
        <button type="button" className="ws-btn sm ghost" onClick={run}><RefreshCw size={14} />Regenerate</button>
      </div>
      <small className="ai-meta">{status.provider} · {res.model}{res.usage?.ms ? ` · ${(res.usage.ms / 1000).toFixed(1)} s` : ''}{res.redacted ? ` · ${res.redacted} names hidden` : ''}</small>
    </>}
  </div>;
}
