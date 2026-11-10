'use client';
import { useMemo, useState } from 'react';
import { FileDown, FileSpreadsheet, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { useWS } from '@/lib/ws/store';
import { exportCSV, exportPDF, reportsFor } from '@/lib/ws/reports';
import { scopeLabel } from '@/lib/ws/org';
import { Empty, F, PageHead, Panel } from './ui';

export function ReportsPage() {
  const { data, user, role, can } = useWS();
  const available = reportsFor(can);
  const [sel, setSel] = useState(available[0]?.id), [from, setFrom] = useState(''), [to, setTo] = useState(''), [busy, setBusy] = useState(false);
  const def = available.find(r => r.id === sel) || available[0];
  const table = useMemo(() => (def ? def.build(data, user!, from || undefined, to || undefined) : null), [def, data, user, from, to]);
  const scopes = Array.from(new Set(available.map(r => r.scope)));
  if (!def || !table) return <Empty title="No reports available for your role" />;
  const file = `${def.id}-${new Date().toISOString().slice(0, 10)}`;
  return <>
    <PageHead eyebrow="REPORTS & EXPORT" title="Reports">{available.length} reports are available to your role ({role?.name}). Every report covers <b>{scopeLabel(user!.scope)}</b> only. Export any report to PDF or CSV.</PageHead>
    <div className="ws-reports">
      <aside className="ws-report-list">{scopes.map(s => <div key={s}><div className="sidebar-caption dark">{s}</div>{available.filter(r => r.scope === s).map(r => <button key={r.id} aria-pressed={r.id === def.id} onClick={() => setSel(r.id)}><FileText size={16} /><span><b>{r.title}</b><small>{r.description}</small></span></button>)}</div>)}</aside>
      <Panel className="ws-report-view" title={def.title} actions={<div className="ws-export">
        <button className="ws-btn ghost sm" onClick={() => { exportCSV(file, table); toast.success('CSV downloaded'); }}><FileSpreadsheet size={15} />CSV</button>
        <button className="ws-btn sm" disabled={busy} onClick={async () => { setBusy(true); try { await exportPDF(file, def.title, table, { by: user!.name, role: (role?.name || '') + ' - ' + scopeLabel(user!.scope), org: data.settings.orgName, range: from || to ? `${from || '…'} to ${to || '…'}` : undefined }); toast.success('PDF downloaded'); } catch { toast.error('PDF export failed'); } setBusy(false); }}><FileDown size={15} />{busy ? 'Preparing…' : 'PDF'}</button>
      </div>}>
        <p className="ws-sub">{def.description}</p>
        <div className="ws-filters"><F label="From"><input className="ws-input" type="date" value={from} onChange={e => setFrom(e.target.value)} /></F><F label="To"><input className="ws-input" type="date" value={to} onChange={e => setTo(e.target.value)} /></F>{(from || to) && <button className="ws-btn ghost sm" onClick={() => { setFrom(''); setTo(''); }}>Clear dates</button>}</div>
        {table.summary && <div className="ws-summary">{table.summary.map(([k, v]) => <div key={k}><small>{k}</small><b>{v}</b></div>)}</div>}
        <div className="ws-table-wrap"><table className="ws-table compact"><thead><tr>{table.columns.map(c => <th key={c}>{c}</th>)}</tr></thead><tbody>{table.rows.map((r, i) => <tr key={i}>{r.map((v, j) => <td key={j}>{String(v)}</td>)}</tr>)}</tbody></table>{!table.rows.length && <Empty title="No rows for this period" />}</div>
        <small className="ws-sub">{table.rows.length} row{table.rows.length === 1 ? '' : 's'}</small>
      </Panel>
    </div>
  </>;
}
