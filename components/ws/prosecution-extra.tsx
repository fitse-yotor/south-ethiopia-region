'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, CalendarPlus, CheckCircle2, CheckSquare, ClipboardList, Download, FileUp, GripVertical, History, ListTodo, MessageSquare, Plus, Printer, Square, Trash2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { isOverdue, slaState, useWS } from '@/lib/ws/store';
import { ADJ_BY, ADJ_REASONS, type AdjBy, type AdjReason, type Case, type CaseDoc, type Hearing } from '@/lib/ws/types';
import { ZONES, zoneOfWoreda } from '@/lib/ws/org';
import { fmtSize, saveFile, useFileUrl } from '@/lib/ws/files';
import { Empty, F, Modal, PageHead, Panel, Pill, Sel, SlaPill, StatusPill, ago, fmtDate, fmtDateTime } from './ui';
import { Calendar, isoDay, type CalItem } from './calendar';
import { ChartCard, lastMonths, SLOT, STATUS_CRITICAL } from './charts';
import { OmoMap } from './omo-map';
import { AiSummaryPanel } from './ai-summary';

const DAY = 86400000;
function useMyCases() {
  return useWS().myCases;
}

/* ================= 7. Hearing calendar ================= */
export function HearingCalendarPage() {
  const { data, can, userName } = useWS();
  const cases = useMyCases();
  const ids = new Set(cases.map(c => c.id));
  const hearings = data.hearings.filter(h => ids.has(h.caseId));
  const [edit, setEdit] = useState<Partial<Hearing> | null>(null);
  const today = isoDay(new Date()), tomorrow = isoDay(new Date(Date.now() + DAY));
  const items: CalItem[] = hearings.map(h => { const c = data.cases.find(x => x.id === h.caseId)!; return { id: h.id, date: h.date, time: h.time, title: `${c.caseNo.split('/').slice(1, 3).join('/')} · ${h.purpose}`, sub: `${c.title} · ${h.court}${can('cases.viewAll') ? ' · ' + userName(c.prosecutorId) : ''}`, tone: h.date < today ? 'grey' : h.date === today || h.date === tomorrow ? 'red' : 'blue', onClick: () => setEdit(h) }; });
  const soon = hearings.filter(h => h.date === today || h.date === tomorrow).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  return <>
    <PageHead eyebrow="PROSECUTION" title="Hearing calendar" actions={<button className="ws-btn" onClick={() => setEdit({ date: tomorrow, time: '09:00', purpose: 'Evidence hearing', court: '' })}><CalendarPlus size={16} />Add hearing</button>}>Court dates for {can('cases.viewAll') ? 'all cases' : 'your cases'}. Hearings today and tomorrow are highlighted in red.</PageHead>
    {soon.length > 0 && <div className="ws-banner warn"><AlertTriangle /><div><b>Reminder: {soon.length} hearing{soon.length > 1 ? 's' : ''} today or tomorrow</b><p>{soon.map(h => `${h.date === today ? 'Today' : 'Tomorrow'} ${h.time} – ${data.cases.find(c => c.id === h.caseId)?.title} (${h.court})`).join(' · ')}</p></div></div>}
    <Panel><Calendar items={items} onDayClick={d => setEdit({ date: d, time: '09:00', purpose: 'Evidence hearing', court: '' })} /></Panel>
    <HearingForm value={edit} onClose={() => setEdit(null)} cases={cases} />
  </>;
}

export function HearingForm({ value, onClose, cases, fixedCase }: { value: Partial<Hearing> | null; onClose: () => void; cases: Case[]; fixedCase?: string }) {
  const { actions, data, userName } = useWS();
  const [f, setF] = useState<Partial<Hearing>>({});
  useEffect(() => { if (value) setF({ caseId: fixedCase || cases[0]?.id, court: '', ...value }); }, [value]); // eslint-disable-line react-hooks/exhaustive-deps
  const c = data.cases.find(x => x.id === f.caseId);
  return <Modal open={!!value} onClose={onClose} title={value?.id ? 'Hearing' : 'Schedule a hearing'} description={c ? `${c.caseNo} · ${c.title} · ${userName(c.prosecutorId)}` : undefined}>
    {value && <form className="ws-form" onSubmit={e => { e.preventDefault(); if (!f.caseId || !f.date) return; actions.saveHearing({ id: f.id, caseId: f.caseId, date: f.date, time: f.time || '09:00', court: f.court || 'Woreda court', purpose: f.purpose || 'Hearing', outcome: f.outcome, adjournReason: f.adjournReason, adjournedBy: f.adjournReason ? f.adjournedBy || 'Court' : undefined, nextDate: f.adjournReason ? f.nextDate : undefined }); toast.success(f.id ? 'Hearing updated' : 'Hearing scheduled'); onClose(); }}>
      {!fixedCase && !value.id && <F label="Case"><Sel value={f.caseId || ''} onChange={v => setF({ ...f, caseId: v })} options={cases.filter(x => x.status !== 'Closed').map(x => [x.id, `${x.caseNo} – ${x.title}`] as [string, string])} /></F>}
      <div className="ws-grid2">
        <F label="Date"><input className="ws-input" type="date" required value={f.date || ''} onChange={e => setF({ ...f, date: e.target.value })} /></F>
        <F label="Time"><input className="ws-input" type="time" value={f.time || ''} onChange={e => setF({ ...f, time: e.target.value })} /></F>
        <F label="Court"><input className="ws-input" required value={f.court || ''} onChange={e => setF({ ...f, court: e.target.value })} placeholder="e.g. Hamer Woreda Court" /></F>
        <F label="Purpose"><Sel value={f.purpose || 'Evidence hearing'} onChange={v => setF({ ...f, purpose: v })} options={['Plea hearing', 'Evidence hearing', 'Witness examination', 'Defence hearing', 'Judgment', 'Appeal hearing', 'Other']} /></F>
        {value.id && <F label="Outcome / notes" wide><textarea className="ws-input" rows={2} value={f.outcome || ''} onChange={e => setF({ ...f, outcome: e.target.value })} placeholder="What happened at the hearing?" /></F>}
        {value.id && <label className="ws-check"><input type="checkbox" checked={!!f.adjournReason} onChange={e => setF({ ...f, adjournReason: e.target.checked ? ADJ_REASONS[0] : undefined, adjournedBy: e.target.checked ? 'Court' : undefined })} />The hearing was adjourned</label>}
        {value.id && f.adjournReason && <>
          <F label="Reason"><Sel value={f.adjournReason} onChange={v => setF({ ...f, adjournReason: v as AdjReason })} options={[...ADJ_REASONS]} /></F>
          <F label="Asked for by"><Sel value={f.adjournedBy || 'Court'} onChange={v => setF({ ...f, adjournedBy: v as AdjBy })} options={[...ADJ_BY]} /></F>
          <F label="Next hearing date" hint="Creates the next hearing automatically"><input className="ws-input" type="date" value={f.nextDate || ''} min={f.date} onChange={e => setF({ ...f, nextDate: e.target.value })} /></F>
        </>}
      </div>
      <div className="ws-form-actions">
        {value.id && <button type="button" className="ws-btn danger ghost" onClick={() => { actions.deleteHearing(value.id!); toast.success('Hearing removed'); onClose(); }}><Trash2 size={15} />Remove</button>}
        {c && <Link className="ws-btn ghost" href={'/dashboard/cases/' + c.id}>Open case</Link>}
        <button className="ws-btn">{value.id ? 'Save' : 'Schedule'}</button>
      </div>
    </form>}
  </Modal>;
}

export function CaseHearings({ c }: { c: Case }) {
  const { data, can, user } = useWS();
  const [edit, setEdit] = useState<Partial<Hearing> | null>(null);
  const list = data.hearings.filter(h => h.caseId === c.id).sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
  const canEdit = can('cases.viewAll') || can('cases.viewOffice') || c.prosecutorId === user!.id;
  const today = isoDay(new Date());
  return <Panel title={<><CalendarPlus size={18} />Hearings</>} actions={canEdit && c.status !== 'Closed' ? <button className="ws-btn sm ghost" onClick={() => setEdit({ date: isoDay(new Date(Date.now() + 7 * DAY)), time: '09:00', court: list[0]?.court || '', purpose: 'Evidence hearing' })}><Plus size={14} />Add</button> : undefined}>
    {list.length ? <ul className="ws-hearings">{list.map(h => <li key={h.id} className={h.date >= today ? 'up' : ''}><button onClick={() => canEdit && setEdit(h)}><b>{fmtDate(h.date + 'T12:00')} · {h.time}</b><span>{h.purpose} · {h.court}</span>{h.outcome && <small>{h.outcome}</small>}{h.adjournReason && <small>Adjourned: {h.adjournReason} · asked by {h.adjournedBy}</small>}</button>{h.date >= today ? <Pill tone="blue">Upcoming</Pill> : <Pill>Held</Pill>}</li>)}</ul> : <Empty title="No hearings yet" />}
    <HearingForm value={edit} onClose={() => setEdit(null)} cases={[c]} fixedCase={c.id} />
  </Panel>;
}

/* ================= 8. Case documents ================= */
const DOC_TYPES: CaseDoc['docType'][] = ['Police investigation file', 'Charge sheet', 'Evidence list', 'Witness statement', 'Court order', 'Judgment', 'Other'];
function VersionLink({ url, name, children }: { url: string; name: string; children: React.ReactNode }) { const u = useFileUrl(url); return <a href={u || '#'} target="_blank" rel="noreferrer" download={name}>{children}</a>; }
export function CaseDocuments({ c }: { c: Case }) {
  const { data, actions, userName, can, user } = useWS();
  const docs = data.caseDocs.filter(d => d.caseId === c.id);
  const canEdit = can('cases.viewAll') || can('cases.documents') || c.prosecutorId === user!.id;
  const [up, setUp] = useState<{ existing?: CaseDoc } | null>(null), [hist, setHist] = useState<CaseDoc | null>(null);
  const [f, setF] = useState({ docType: DOC_TYPES[0], title: '', note: '' }), [file, setFile] = useState<File | null>(null), [busy, setBusy] = useState(false);
  const open = (existing?: CaseDoc) => { setF({ docType: existing?.docType || DOC_TYPES[0], title: existing?.title || '', note: '' }); setFile(null); setUp({ existing }); };
  return <Panel title={<><ClipboardList size={18} />Case documents</>} actions={canEdit ? <button className="ws-btn sm ghost" onClick={() => open()}><Upload size={14} />Upload</button> : undefined}>
    {docs.length ? <div className="ws-table-wrap"><table className="ws-table compact"><thead><tr><th>Document</th><th>Type</th><th>Version</th><th>Updated</th><th></th></tr></thead><tbody>
      {docs.map(d => { const v = d.versions[d.versions.length - 1]; return <tr key={d.id}>
        <td><VersionLink url={v.url} name={v.fileName}><b>{d.title}</b></VersionLink><small className="ws-sub">{v.fileName} · {fmtSize(v.size)}</small></td>
        <td>{d.docType}</td><td><button className="ws-text-btn" onClick={() => setHist(d)}><History size={13} /> v{v.v}{d.versions.length > 1 ? ` (${d.versions.length})` : ''}</button></td>
        <td>{fmtDate(v.at)}<small className="ws-sub">{userName(v.by)}</small></td>
        <td className="ws-row-actions"><VersionLink url={v.url} name={v.fileName}><Download size={16} /></VersionLink>{canEdit && <button aria-label="Upload new version" title="Upload new version" onClick={() => open(d)}><FileUp size={16} /></button>}</td>
      </tr>; })}</tbody></table></div> : <Empty title="No documents yet">Upload the police file, charge sheet, evidence list or judgment.</Empty>}
    <Modal open={!!up} onClose={() => setUp(null)} title={up?.existing ? `New version of “${up.existing.title}”` : 'Upload case document'}>
      {up && <form className="ws-form" onSubmit={async e => {
        e.preventDefault(); if (!file) return toast.error('Choose a file'); if (file.size > 50 * 1048576) return toast.error('Maximum 50 MB');
        setBusy(true); const url = await saveFile(file);
        actions.addCaseDoc(c.id, { docType: f.docType, title: f.title || file.name, url, fileName: file.name, size: file.size, note: f.note }, up.existing?.id);
        setBusy(false); toast.success(up.existing ? 'New version uploaded' : 'Document uploaded'); setUp(null);
      }}>
        {!up.existing && <div className="ws-grid2"><F label="Type"><Sel value={f.docType} onChange={v => setF({ ...f, docType: v as CaseDoc['docType'] })} options={DOC_TYPES} /></F><F label="Title"><input className="ws-input" value={f.title} onChange={e => setF({ ...f, title: e.target.value })} placeholder="e.g. Charge sheet" /></F></div>}
        <F label="File (PDF, Word or image)"><label className="ws-drop"><Upload size={20} /><span>{file ? `${file.name} · ${fmtSize(file.size)}` : 'Choose a file'}</span><input type="file" accept=".pdf,.doc,.docx,image/*" onChange={e => setFile(e.target.files?.[0] || null)} /></label></F>
        <F label={up.existing ? 'What changed?' : 'Note (optional)'}><input className="ws-input" value={f.note} onChange={e => setF({ ...f, note: e.target.value })} /></F>
        <div className="ws-form-actions"><button type="button" className="ws-btn ghost" onClick={() => setUp(null)}>Cancel</button><button className="ws-btn" disabled={busy}>{busy ? 'Uploading…' : 'Upload'}</button></div>
      </form>}
    </Modal>
    <Modal open={!!hist} onClose={() => setHist(null)} title={`Version history – ${hist?.title || ''}`}>
      {hist && <ol className="ws-timeline">{[...hist.versions].reverse().map(v => <li key={v.v}><b>Version {v.v} · <VersionLink url={v.url} name={v.fileName}>{v.fileName}</VersionLink></b><p>{v.note}</p><small>{userName(v.by)} · {fmtDateTime(v.at)} · {fmtSize(v.size)}</small></li>)}</ol>}
    </Modal>
  </Panel>;
}

/* ================= 9. My tasks ================= */
type AutoTask = { id: string; title: string; sub: string; due?: string; href: string; tone: 'red' | 'gold' | 'blue' };
export function useAutoTasks(): AutoTask[] {
  const { data, user, can, myCases } = useWS();
  if (!user) return [];
  const out: AutoTask[] = [];
  const mine = myCases;
  mine.filter(c => slaState(c, data.settings.dueSoonDays) === 'overdue').forEach(c => out.push({ id: 'od-' + c.id, title: can('cases.extend') ? `Review overdue case: ${c.title}` : `Overdue – ask Woreda Coordinator for SLA extension: ${c.title}`, sub: c.caseNo, due: c.dueAt.slice(0, 10), href: '/dashboard/cases/' + c.id, tone: 'red' }));
  mine.filter(c => slaState(c, data.settings.dueSoonDays) === 'due-soon').forEach(c => out.push({ id: 'ds-' + c.id, title: `Complete before SLA: ${c.title}`, sub: c.caseNo, due: c.dueAt.slice(0, 10), href: '/dashboard/cases/' + c.id, tone: 'gold' }));
  const today = isoDay(new Date()), week = isoDay(new Date(Date.now() + 7 * DAY));
  data.hearings.filter(h => mine.some(c => c.id === h.caseId) && h.date >= today && h.date <= week).forEach(h => out.push({ id: 'hr-' + h.id, title: `Prepare for ${h.purpose.toLowerCase()}: ${data.cases.find(c => c.id === h.caseId)?.title}`, sub: `${h.court} · ${h.time}`, due: h.date, href: '/dashboard/calendar', tone: 'blue' }));
  if (can('preports.submit')) {
    const rs = data.preports.filter(r => r.prosecutorId === user.id);
    ([['Daily', 1.5], ['Weekly', 7], ['Monthly', 31]] as const).forEach(([p, win]) => { if (!rs.some(r => r.period === p && Date.now() - new Date(r.submittedAt).getTime() < win * DAY)) out.push({ id: 'rp-' + p, title: `Submit ${p.toLowerCase()} report`, sub: 'Report to the Woreda Coordinator', due: today, href: '/dashboard/periodic-reports?new=' + p, tone: 'gold' }); });
    data.comments.filter(cm => mine.some(c => c.id === cm.caseId) && cm.by !== user.id).forEach(cm => {
      const answered = data.comments.some(x => x.caseId === cm.caseId && x.by === user.id && x.at > cm.at);
      if (!answered) out.push({ id: 'cm-' + cm.id, title: `Answer Woreda Coordinator comment on ${data.cases.find(c => c.id === cm.caseId)?.caseNo}`, sub: cm.body.slice(0, 80), href: '/dashboard/cases/' + cm.caseId, tone: 'blue' });
    });
  }
  if (can('preports.review')) { const n = data.preports.filter(r => r.status === 'Submitted').length; if (n) out.push({ id: 'rv', title: `Review ${n} prosecutor report${n > 1 ? 's' : ''}`, sub: 'Give feedback', href: '/dashboard/periodic-reports', tone: 'gold' }); }
  return out.sort((a, b) => ({ red: 0, gold: 1, blue: 2 }[a.tone] - { red: 0, gold: 1, blue: 2 }[b.tone]) || (a.due || '9').localeCompare(b.due || '9'));
}
export function TasksPage() {
  const { data, user, actions } = useWS();
  const auto = useAutoTasks();
  const mine = data.tasks.filter(t => t.userId === user!.id).sort((a, b) => Number(a.done) - Number(b.done) || (a.due || '9').localeCompare(b.due || '9'));
  const [title, setTitle] = useState(''), [due, setDue] = useState('');
  return <>
    <PageHead eyebrow="MY WORK" title="My tasks">Tasks generated from your cases, hearings, reports and comments, plus your own to-do items.</PageHead>
    <div className="ws-dash-grid">
      <Panel title={<><ListTodo size={18} />From your work <Pill tone="blue">{auto.length}</Pill></>}>
        {auto.length ? <ul className="ws-tasks">{auto.map(t => <li key={t.id} className={'tone-' + t.tone}><Link href={t.href}><b>{t.title}</b><small>{t.sub}{t.due ? ' · due ' + fmtDate(t.due + 'T12:00') : ''}</small></Link></li>)}</ul> : <Empty title="Nothing needs your attention" icon={<CheckCircle2 size={30} />} />}
      </Panel>
      <Panel title={<><CheckSquare size={18} />My to-do list</>}>
        <form className="ws-inline wrap" onSubmit={e => { e.preventDefault(); if (!title.trim()) return; actions.addTask(title.trim(), due || undefined); setTitle(''); setDue(''); }}>
          <F label="New task"><input className="ws-input" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Call witness" /></F>
          <F label="Due"><input className="ws-input" type="date" value={due} onChange={e => setDue(e.target.value)} /></F>
          <button className="ws-btn"><Plus size={16} />Add</button>
        </form>
        <ul className="ws-todo">{mine.map(t => <li key={t.id} className={t.done ? 'done' : ''}><button aria-label={t.done ? 'Mark not done' : 'Mark done'} onClick={() => actions.toggleTask(t.id)}>{t.done ? <CheckSquare size={18} /> : <Square size={18} />}</button><span>{t.title}{t.due && <small className={!t.done && t.due < isoDay(new Date()) ? 'late' : ''}>due {fmtDate(t.due + 'T12:00')}</small>}</span><button className="del" aria-label="Delete" onClick={() => actions.deleteTask(t.id)}><Trash2 size={15} /></button></li>)}</ul>
        {!mine.length && <Empty title="No personal tasks" />}
      </Panel>
    </div>
  </>;
}

/* ================= 11. Performance ================= */
export function PerformancePage() {
  const { data } = useWS();
  const months = lastMonths(6);
  const perMonth = months.map(m => ({ name: m.label, opened: data.cases.filter(c => c.openedAt.startsWith(m.key)).length, closed: data.statusChanges.filter(s => ['Closed', 'Judgment delivered'].includes(s.to) && s.at.startsWith(m.key)).length }));
  const trend = months.map(m => { const end = new Date(m.key + '-01T00:00:00'); end.setMonth(end.getMonth() + 1); const t = Math.min(end.getTime(), Date.now());
    const open = data.cases.filter(c => new Date(c.openedAt).getTime() < t && !(c.closedAt && new Date(c.closedAt).getTime() < t));
    return { name: m.label, compliance: open.length ? Math.round(((open.length - open.filter(c => isOverdue(c, t)).length) / open.length) * 100) : 100 }; });
  const pros = data.users.filter(u => u.roleId === 'prosecutor' && u.status === 'active');
  const workload = pros.map(p => { const cs = data.cases.filter(c => c.prosecutorId === p.id && c.status !== 'Closed'); return { name: p.name, 'on track': cs.filter(c => !isOverdue(c)).length, overdue: cs.filter(c => isOverdue(c)).length }; });
  const byWoreda = Array.from(new Set(data.cases.map(c => c.office))).map(o => ({ name: o, overdue: data.cases.filter(c => c.office === o && isOverdue(c)).length })).filter(x => x.overdue > 0);
  const avg = data.ratings.length ? (data.ratings.reduce((s, r) => s + r.stars, 0) / data.ratings.length).toFixed(1) : '–';
  const closedTotal = perMonth.reduce((s, m) => s + m.closed, 0), openedTotal = perMonth.reduce((s, m) => s + m.opened, 0);
  return <>
    <PageHead eyebrow="OVERSIGHT" title="Performance dashboard">Six-month trends for case flow, SLA compliance, workload and service quality. Switch any chart to a table.</PageHead>
    <div className="ws-stats">
      <div className="ws-stat"><span className="ws-stat-label">Opened (6 months)</span><strong>{openedTotal}</strong></div>
      <div className="ws-stat tone-ink"><span className="ws-stat-label">Closed / judged</span><strong>{closedTotal}</strong><small>clearance {openedTotal ? Math.round((closedTotal / openedTotal) * 100) : 0}%</small></div>
      <div className="ws-stat tone-red"><span className="ws-stat-label">Overdue now</span><strong>{data.cases.filter(c => isOverdue(c)).length}</strong></div>
      <div className="ws-stat tone-gold"><span className="ws-stat-label">Citizen satisfaction</span><strong>{avg}<small> / 5</small></strong><small>{data.ratings.length} ratings</small></div>
    </div>
    <div className="viz-grid">
      <ChartCard title="Cases opened vs closed per month" data={perMonth} xKey="name" series={[{ key: 'opened', label: 'Opened' }, { key: 'closed', label: 'Closed / judged' }]} />
      <ChartCard title="SLA compliance trend" subtitle="% of open cases within their SLA at month end" data={trend} xKey="name" kind="line" unit="%" yMax={100} series={[{ key: 'compliance', label: 'Compliance' }]} />
      <ChartCard title="Workload per prosecutor" subtitle="Open cases" data={workload} xKey="name" kind="hbar" series={[{ key: 'on track', label: 'On track', color: SLOT[0] }, { key: 'overdue', label: 'Overdue', color: STATUS_CRITICAL }]} />
      <ChartCard title={<><AlertTriangle size={16} />Overdue cases by woreda</>} data={byWoreda} xKey="name" kind="hbar" emptyText="No overdue cases" series={[{ key: 'overdue', label: 'Overdue', color: STATUS_CRITICAL }]} />
    </div>
  </>;
}

/* ================= 12. Workload balancing ================= */
export function WorkloadPage() {
  const { data, actions, userName } = useWS();
  const pros = data.users.filter(u => u.roleId === 'prosecutor' && u.status === 'active');
  const [drag, setDrag] = useState<string | null>(null), [over, setOver] = useState<string | null>(null);
  const move = (caseId: string, to: string) => { const c = data.cases.find(x => x.id === caseId); if (!c || c.prosecutorId === to) return; const r = actions.reassignCase(caseId, to); if (r.ok) toast.success(`${c.caseNo} reassigned to ${userName(to)}`); else toast.error(r.error); };
  const max = Math.max(1, ...pros.map(p => data.cases.filter(c => c.prosecutorId === p.id && c.status !== 'Closed').length));
  return <>
    <PageHead eyebrow="OVERSIGHT" title="Workload balancing">Open cases per prosecutor. Drag a case card to another prosecutor to reassign it (on phones use “Move to”).</PageHead>
    <div className="wl-board">{pros.map(p => { const cs = data.cases.filter(c => c.prosecutorId === p.id && c.status !== 'Closed').sort((a, b) => a.dueAt.localeCompare(b.dueAt)); const od = cs.filter(c => isOverdue(c)).length;
      return <section key={p.id} className={'wl-col' + (over === p.id ? ' over' : '')} onDragOver={e => { e.preventDefault(); setOver(p.id); }} onDragLeave={() => setOver(null)} onDrop={e => { e.preventDefault(); setOver(null); if (drag) move(drag, p.id); setDrag(null); }}>
        <header><b>{p.name}</b><small>{p.office}</small><div className="wl-meter"><i style={{ width: (cs.length / max) * 100 + '%' }} className={cs.length >= max ? 'hi' : ''} /></div><span>{cs.length} open{od ? ` · ${od} overdue` : ''}</span></header>
        <div className="wl-cards">{cs.map(c => <article key={c.id} className={'wl-card' + (isOverdue(c) ? ' od' : '')} draggable onDragStart={() => setDrag(c.id)} onDragEnd={() => setDrag(null)}>
          <GripVertical size={14} className="wl-grip" aria-hidden /><div><Link href={'/dashboard/cases/' + c.id}><b>{c.title}</b></Link><small>{c.caseNo} · {c.status}</small><SlaPill c={c} /></div>
          <select className="ws-input wl-move" aria-label="Move to" value="" onChange={e => e.target.value && move(c.id, e.target.value)}><option value="">Move to…</option>{pros.filter(x => x.id !== p.id).map(x => <option key={x.id} value={x.id}>{x.name}</option>)}</select>
        </article>)}{!cs.length && <p className="ws-sub">No open cases</p>}</div>
      </section>; })}</div>
  </>;
}

/* ================= 13. Case map ================= */
export function CaseMapPage() {
  const { data } = useWS();
  const [sel, setSel] = useState<string | null>(null);
  const stats = ZONES.map(z => z.name + ' office').map(o => { const cs = data.cases.filter(c => zoneOfWoreda(c.woredaId)?.name + ' office' === o && c.status !== 'Closed'); const od = cs.filter(c => isOverdue(c)).length; const ds = cs.filter(c => slaState(c, data.settings.dueSoonDays) === 'due-soon').length; return { o, cs, od, ds }; });
  const markers = stats.filter(s => s.cs.length).map(s => ({ office: s.o, value: s.cs.length, tone: (s.od ? 'red' : s.ds ? 'gold' : 'teal') as 'red', size: 9 + Math.min(8, s.cs.length * 1.5) }));
  const cur = stats.find(s => s.o === sel);
  return <>
    <PageHead eyebrow="OVERSIGHT" title="Case map">Open cases by zone (marker at the zone seat; schematic position). Colour shows the worst SLA state in that zone; the number is the count of open cases. Select a zone to see its cases and woredas.</PageHead>
    <div className="sp-map-layout">
      <Panel><OmoMap markers={markers} selected={sel || undefined} onSelect={setSel} legend={<span className="map-legend"><span><i style={{ background: '#c8201a' }} />Has overdue</span><span><i style={{ background: '#c8964f' }} />Due soon</span><span><i style={{ background: '#1f5646' }} />On track</span></span>} /></Panel>
      <Panel title={cur ? cur.o : 'Select a zone'}>{cur ? <ul className="ws-list">{cur.cs.map(c => <li key={c.id}><Link href={'/dashboard/cases/' + c.id}><div><b>{c.title}</b><small>{c.caseNo} · {c.office} · {c.status}</small></div><SlaPill c={c} /></Link></li>)}</ul> :
        <div className="ws-table-wrap"><table className="ws-table compact"><thead><tr><th>Zone</th><th>Open</th><th>Due soon</th><th>Overdue</th></tr></thead><tbody>{stats.filter(s => s.cs.length).map(s => <tr key={s.o} onClick={() => setSel(s.o)} className="clickable"><td>{s.o}</td><td>{s.cs.length}</td><td>{s.ds}</td><td>{s.od ? <Pill tone="red">{s.od}</Pill> : 0}</td></tr>)}</tbody></table></div>}</Panel>
    </div>
  </>;
}

/* ================= 14. Weekly digest ================= */
export function DigestPage() {
  const { data, userName } = useWS();
  const [offset, setOffset] = useState(0);
  const end = new Date(); end.setHours(23, 59, 59, 999); end.setDate(end.getDate() - offset * 7);
  const start = new Date(end.getTime() - 7 * DAY + 1);
  const inWeek = (iso: string) => { const t = new Date(iso).getTime(); return t >= start.getTime() && t <= end.getTime(); };
  const reports = data.preports.filter(r => inWeek(r.submittedAt));
  const opened = data.cases.filter(c => inWeek(c.openedAt)), closed = data.statusChanges.filter(s => ['Closed', 'Judgment delivered'].includes(s.to) && inWeek(s.at));
  const changes = data.statusChanges.filter(s => inWeek(s.at));
  const hearingsNext = data.hearings.filter(h => h.date > isoDay(new Date()) && h.date <= isoDay(new Date(Date.now() + 7 * DAY)));
  const overdue = data.cases.filter(c => isOverdue(c));
  const label = `${start.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} – ${end.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`;
  const totals = useMemo(() => reports.reduce((t, r) => ({ n: t.n + r.newCases, c: t.c + r.closedCases, h: t.h + r.hearings }), { n: 0, c: 0, h: 0 }), [reports]);
  return <div className="digest">
    <PageHead eyebrow="OFFICE HEAD · WEEKLY DIGEST" title={label} actions={<div className="ws-head-actions sp-noprint"><Sel aria-label="Week" value={String(offset)} onChange={v => setOffset(+v)} options={[['0', 'This week'], ['1', 'Last week'], ['2', '2 weeks ago'], ['3', '3 weeks ago']]} /><button className="ws-btn ghost" onClick={() => window.print()}><Printer size={16} />Print</button></div>}>One page with this week’s key numbers, overdue items, hearings and the AI summary.</PageHead>
    <div className="ws-stats">
      <div className="ws-stat"><span className="ws-stat-label">Cases opened</span><strong>{opened.length}</strong></div>
      <div className="ws-stat tone-ink"><span className="ws-stat-label">Closed / judged</span><strong>{closed.length}</strong></div>
      <div className="ws-stat tone-gold"><span className="ws-stat-label">Status updates</span><strong>{changes.length}</strong></div>
      <div className="ws-stat tone-red"><span className="ws-stat-label">Overdue now</span><strong>{overdue.length}</strong></div>
      <div className="ws-stat"><span className="ws-stat-label">Reports received</span><strong>{reports.length}</strong><small>{totals.n} new · {totals.c} closed · {totals.h} hearings reported</small></div>
    </div>
    <div className="ws-dash-grid">
      <Panel title={<><AlertTriangle size={18} />Overdue – needs your decision</>}>{overdue.length ? <ul className="ws-list">{overdue.map(c => <li key={c.id}><Link href={'/dashboard/cases/' + c.id}><div><b>{c.title}</b><small>{c.caseNo} · {userName(c.prosecutorId)} · {c.office}</small></div><SlaPill c={c} /></Link></li>)}</ul> : <Empty title="No overdue cases" />}</Panel>
      <Panel title={<><CalendarPlus size={18} />Hearings in the next 7 days</>}>{hearingsNext.length ? <ul className="ws-list">{hearingsNext.sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time)).map(h => { const c = data.cases.find(x => x.id === h.caseId)!; return <li key={h.id}><Link href={'/dashboard/cases/' + c.id}><div><b>{fmtDate(h.date + 'T12:00')} {h.time} · {h.purpose}</b><small>{c.title} · {h.court} · {userName(c.prosecutorId)}</small></div></Link></li>; })}</ul> : <Empty title="No hearings" />}</Panel>
      <Panel title={<><ClipboardList size={18} />Reports this week</>}>{reports.length ? <ul className="ws-list">{reports.map(r => <li key={r.id}><Link href={'/dashboard/periodic-reports/' + r.id}><div><b>{userName(r.prosecutorId)} · {r.period}</b><small>{r.periodLabel} · {r.newCases} new · {r.closedCases} closed</small></div><StatusPill status={r.status} /></Link></li>)}</ul> : <Empty title="No reports this week" />}</Panel>
      <Panel title={<><MessageSquare size={18} />Latest case updates</>}>{changes.length ? <ul className="ws-feed">{changes.slice(-8).reverse().map(s => <li key={s.id}><span className="dot" /><div><b>{data.cases.find(c => c.id === s.caseId)?.caseNo}</b> {s.from ? `${s.from} → ` : ''}{s.to}<small>{userName(s.by)} · {ago(s.at)}</small></div></li>)}</ul> : <Empty title="No updates" />}</Panel>
    </div>
    {reports.length > 0 && <div className="sp-noprint-ai"><AiSummaryPanel reports={reports} mode="period" title={`week ${label}`} /></div>}
  </div>;
}
