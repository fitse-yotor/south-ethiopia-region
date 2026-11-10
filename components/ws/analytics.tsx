'use client';
import { useEffect, useMemo, useState } from 'react';
import { FileDown, FileSpreadsheet, FileText, Search, Star } from 'lucide-react';
import { toast } from 'sonner';
import { useWS } from '@/lib/ws/store';
import { exportCSV, exportPDF, reportsFor, type ReportDef } from '@/lib/ws/reports';
import { scopeLabel } from '@/lib/ws/org';
import { Empty, PageHead, Panel } from './ui';

const iso = (d: Date) => d.toISOString().slice(0, 10);
const PRESETS: [string, () => [string, string]][] = [
  ['Last 7 days', () => [iso(new Date(Date.now() - 6 * 864e5)), iso(new Date())]],
  ['Last 30 days', () => [iso(new Date(Date.now() - 29 * 864e5)), iso(new Date())]],
  ['This month', () => { const n = new Date(); return [iso(new Date(n.getFullYear(), n.getMonth(), 1)), iso(n)]; }],
  ['This year', () => { const n = new Date(); return [iso(new Date(n.getFullYear(), 0, 1)), iso(n)]; }],
  ['All time', () => ['', '']],
];

/** Report centre: search, favourites, quick date ranges and one-click PDF / CSV. Every report covers the user's scope only. */
export function ReportsPage() {
  const { data, user, role, can } = useWS();
  const available = reportsFor(can);
  const favKey = 'serjp-fav-reports-' + user!.id;
  const [fav, setFav] = useState<string[]>([]);
  const [q, setQ] = useState(''), [sel, setSel] = useState(available[0]?.id), [from, setFrom] = useState(''), [to, setTo] = useState(''), [busy, setBusy] = useState(false);
  useEffect(() => { try { setFav(JSON.parse(localStorage.getItem(favKey) || '[]')); } catch { /* storage unavailable */ } }, [favKey]);
  const toggleFav = (id: string) => { const n = fav.includes(id) ? fav.filter(x => x !== id) : [...fav, id]; setFav(n); try { localStorage.setItem(favKey, JSON.stringify(n)); } catch { /* ignore */ } };

  const def = available.find(r => r.id === sel) || available[0];
  const table = useMemo(() => (def ? def.build(data, user!, from || undefined, to || undefined) : null), [def, data, user, from, to]);
  const matches = available.filter(r => (r.title + ' ' + r.description + ' ' + r.scope).toLowerCase().includes(q.toLowerCase()));
  const groups: [string, ReportDef[]][] = [
    ...(fav.length ? [['Favourites', matches.filter(r => fav.includes(r.id))] as [string, ReportDef[]]] : []),
    ...Array.from(new Set(available.map(r => r.scope))).map(s => [s, matches.filter(r => r.scope === s)] as [string, ReportDef[]]),
  ].filter(([, l]) => l.length);
  if (!def || !table) return <Empty title="No reports available for your role" />;
  const file = `${def.id}-${new Date().toISOString().slice(0, 10)}`;
  const range = from || to ? `${from || '…'} to ${to || '…'}` : undefined;
  const activePreset = PRESETS.find(([, f]) => { const [a, b] = f(); return a === from && b === to; })?.[0];

  return <>
    <PageHead eyebrow="REPORTS & EXPORT" title="Reports">
      {available.length} reports for your role ({role?.name}). Each one covers <b>{scopeLabel(user!.scope)}</b> only. Pick a report, choose the period and download it.
    </PageHead>
    <div className="ws-reports">
      <aside className="ws-report-list">
        <div className="lib-search"><Search size={16} /><input placeholder="Search reports" aria-label="Search reports" value={q} onChange={e => setQ(e.target.value)} /></div>
        {groups.map(([s, list]) => <div key={s}><div className="sidebar-caption dark">{s}</div>{list.map(r => <div key={s + r.id} className="rp-item">
          <button aria-pressed={r.id === def.id} onClick={() => setSel(r.id)}><FileText size={16} /><span><b>{r.title}</b><small>{r.description}</small></span></button>
          <button className={'rp-star' + (fav.includes(r.id) ? ' on' : '')} aria-label={fav.includes(r.id) ? 'Remove from favourites' : 'Add to favourites'} aria-pressed={fav.includes(r.id)} onClick={() => toggleFav(r.id)}><Star size={15} /></button>
        </div>)}</div>)}
        {!groups.length && <p className="ws-sub">No report matches “{q}”.</p>}
      </aside>
      <Panel className="ws-report-view" title={def.title} actions={<div className="ws-export">
        <button className="ws-btn ghost sm" onClick={() => { exportCSV(file, table); toast.success('CSV downloaded'); }}><FileSpreadsheet size={15} />CSV</button>
        <button className="ws-btn sm" disabled={busy} onClick={async () => { setBusy(true); try { await exportPDF(file, def.title, table, { by: user!.name, role: (role?.name || '') + ' - ' + scopeLabel(user!.scope), org: data.settings.orgName, range }); toast.success('PDF downloaded'); } finally { setBusy(false); } }}><FileDown size={15} />{busy ? 'Preparing…' : 'PDF'}</button>
      </div>}>
        <p className="ws-sub">{def.description}</p>
        <div className="rp-range" role="group" aria-label="Period">
          {PRESETS.map(([label, f]) => <button key={label} aria-pressed={activePreset === label} onClick={() => { const [a, b] = f(); setFrom(a); setTo(b); }}>{label}</button>)}
          <span className="rp-dates"><input className="ws-input" type="date" aria-label="From" value={from} max={to || undefined} onChange={e => setFrom(e.target.value)} /><i>to</i><input className="ws-input" type="date" aria-label="To" value={to} min={from || undefined} onChange={e => setTo(e.target.value)} /></span>
        </div>
        {table.summary && <div className="ws-summary">{table.summary.map(([k, v]) => <div key={k}><small>{k}</small><b>{v}</b></div>)}</div>}
        <div className="ws-table-wrap"><table className="ws-table compact"><thead><tr>{table.columns.map(c => <th key={c}>{c}</th>)}</tr></thead><tbody>{table.rows.map((r, i) => <tr key={i}>{r.map((v, j) => <td key={j}>{String(v)}</td>)}</tr>)}</tbody></table>{!table.rows.length && <Empty title="No rows for this period">Try “All time” or a wider range.</Empty>}</div>
        <small className="ws-sub">{table.rows.length} row{table.rows.length === 1 ? '' : 's'}{range ? ' · ' + range : ''}</small>
      </Panel>
    </div>
  </>;
}
