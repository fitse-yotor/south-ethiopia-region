'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertTriangle, ArrowLeft, CalendarClock, FilePlus2, History, KeyRound, Lock, MessageSquare, Plus, Save, Search, Send, Timer, Unlock, UserRoundCog } from 'lucide-react';
import { toast } from 'sonner';
import { closedLate, daysLeft, hasPermission, isLocked, isOverdue, slaState, useWS } from '@/lib/ws/store';
import { CASE_STATUSES, CASE_SUBJECTS, type Case, type CaseStatus } from '@/lib/ws/types';
import { scopeLabel, unitName, zoneOfWoreda } from '@/lib/ws/org';
import { Avatar, DataTable, Empty, F, PageHead, Panel, Pill, Sel, SlaPill, StatusPill, ago, fmtDate, fmtDateTime } from './ui';
import { useQueryParam } from './library';
import { CaseDocuments, CaseHearings } from './prosecution-extra';
import { CaseEvidence } from './evidence';

const zoneName = (woredaId: string) => unitName(zoneOfWoreda(woredaId)?.id);

export function CaseList() {
  const { data, can, userName, myCases } = useWS();
  const { user } = useWS();
  const all = can('cases.viewAll'), office = !all && can('cases.viewOffice');
  const filterParam = useQueryParam('filter');
  const [q, setQ] = useState(''), [status, setStatus] = useState('all'), [cat, setCat] = useState('all'), [pros, setPros] = useState('all'), [sla, setSla] = useState('all');
  useEffect(() => { if (filterParam) setSla(filterParam); }, [filterParam]);
  const base = myCases;
  const list = base.filter(c => (status === 'all' || c.status === status) && (cat === 'all' || c.categoryId === cat) && (pros === 'all' || c.prosecutorId === pros)
    && (sla === 'all' || slaState(c, data.settings.dueSoonDays) === sla) && (c.caseNo + ' ' + c.title + ' ' + c.parties + ' ' + c.subject).toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => Number(isOverdue(b)) - Number(isOverdue(a)) || a.dueAt.localeCompare(b.dueAt));
  const counts = { all: base.length, overdue: base.filter(c => slaState(c) === 'overdue').length, 'due-soon': base.filter(c => slaState(c, data.settings.dueSoonDays) === 'due-soon').length, 'on-track': base.filter(c => slaState(c, data.settings.dueSoonDays) === 'on-track').length, closed: base.filter(c => c.status === 'Closed').length };
  return <>
    <PageHead eyebrow="PROSECUTION" title={all ? 'Cases in my scope' : office ? 'Woreda cases' : 'My cases'} actions={can('cases.assign') ? <Link className="ws-btn" href="/dashboard/cases/new"><FilePlus2 size={16} />New case</Link> : undefined}>
      {all ? `Every case in ${scopeLabel(user?.scope)}, with live SLA status. You can comment and check statuses and reports; cases are registered and assigned by the Woreda Coordinators.` : office ? 'Cases of your woreda office, with live SLA status. Register new cases and assign them to your prosecutors.' : 'Cases assigned to you. Status updates are locked once a case passes its SLA due date, until the Woreda Coordinator gives permission.'}
    </PageHead>
    <div className="ws-chips">{([['all', 'All'], ['overdue', 'Overdue'], ['due-soon', 'Due soon'], ['on-track', 'On track'], ['closed', 'Closed']] as const).map(([k, l]) => <button key={k} aria-pressed={sla === k} className={'chip-' + k} onClick={() => setSla(k)}>{l}<em>{counts[k]}</em></button>)}</div>
    <Panel>
      <div className="ws-filters">
        <div className="lib-search"><Search size={16} /><input placeholder="Search case no., title or parties" value={q} onChange={e => setQ(e.target.value)} /></div>
        <Sel aria-label="Status" value={status} onChange={setStatus} options={[['all', 'All statuses'], ...CASE_STATUSES.map(s => [s, s] as [string, string])]} />
        <Sel aria-label="Case type" value={cat} onChange={setCat} options={[['all', 'All case types'], ...data.caseCategories.map(c => [c.id, c.name] as [string, string])]} />
        {(all || office) && <Sel aria-label="Prosecutor" value={pros} onChange={setPros} options={[['all', 'All prosecutors'], ...data.users.filter(u => u.roleId === 'prosecutor').map(u => [u.id, u.name] as [string, string])]} />}
      </div>
      <div className="ws-table-wrap"><table className="ws-table cards-on-mobile">
        <thead><tr><th>Case</th><th>Case type</th>{(all || office) && <th>Prosecutor</th>}<th>Status</th><th>Due date</th><th>SLA</th></tr></thead>
        <tbody>{list.map(c => <tr key={c.id} className={isOverdue(c) ? 'row-overdue' : ''}>
          <td data-label="Case"><Link href={'/dashboard/cases/' + c.id} className="ws-case-link"><b>{c.title}</b><small>{c.caseNo} · {c.office}{all ? ' · ' + (zoneName(c.woredaId)) : ''}{c.priority !== 'Normal' ? ' · ' + c.priority : ''}</small></Link></td>
          <td data-label="Case type">{data.caseCategories.find(x => x.id === c.categoryId)?.name}<small className="ws-sub">{c.subject}</small></td>
          {(all || office) && <td data-label="Prosecutor">{userName(c.prosecutorId)}</td>}
          <td data-label="Status"><StatusPill status={c.status} /></td>
          <td data-label="Due">{fmtDate(c.dueAt)}</td>
          <td data-label="SLA"><SlaPill c={c} />{isLocked(c) && <Lock size={14} className="ws-lock" aria-label="Locked" />}</td>
        </tr>)}</tbody>
      </table>{!list.length && <Empty title="No cases match">Change the filters or register a new case.</Empty>}</div>
    </Panel>
  </>;
}

export function CaseNew() {
  const { data, user, can, actions } = useWS();
  const router = useRouter();
  const myWoreda = user!.scope?.level === 'woreda' ? user!.scope.id : null;
  const prosecutors = data.users.filter(u => u.roleId === 'prosecutor' && u.status === 'active' && !!myWoreda && u.scope?.id === myWoreda);
  const [f, setF] = useState({ title: '', categoryId: data.caseCategories[0].id, subject: CASE_SUBJECTS[0], prosecutorId: prosecutors[0]?.id || '', office: user!.office, parties: '', description: '', priority: 'Normal' as Case['priority'], openedAt: new Date().toISOString().slice(0, 10) });
  const cat = data.caseCategories.find(c => c.id === f.categoryId)!;
  const due = new Date(new Date(f.openedAt).getTime() + cat.slaDays * 86400000);
  if (!myWoreda) return <Empty title="Only a Woreda Coordinator registers cases">Cases are registered and assigned inside a woreda. Zone and region users can view, comment and check reports.</Empty>;
  return <>
    <PageHead eyebrow="PROSECUTION" title="Register a new case" actions={<Link className="ws-btn ghost" href="/dashboard/cases"><ArrowLeft size={16} />Back to cases</Link>}>
      Register the case for your woreda and assign it to one of your prosecutors. The SLA due date comes from the case type set by the region.
    </PageHead>
    <form className="ws-form-layout" onSubmit={e => {
      e.preventDefault();
      const r = actions.createCase(f);
      if (r.ok) { toast.success('Case registered'); router.push('/dashboard/cases/' + r.id); } else toast.error(r.error);
    }}>
      <Panel title="Case details">
        <div className="ws-grid2">
          <F label="Case title" wide><input className="ws-input" required value={f.title} onChange={e => setF({ ...f, title: e.target.value })} placeholder="e.g. Livestock theft – Dimeka" /></F>
          <F label="Case type"><Sel value={f.categoryId} onChange={v => setF({ ...f, categoryId: v })} options={data.caseCategories.map(c => [c.id, `${c.name} (${c.slaDays} days)`] as [string, string])} /></F>
          <F label="Subject"><Sel value={f.subject} onChange={v => setF({ ...f, subject: v })} options={CASE_SUBJECTS} /></F>
          <F label="Priority"><Sel value={f.priority} onChange={v => setF({ ...f, priority: v as Case['priority'] })} options={['Normal', 'High', 'Urgent']} /></F>
          <F label="Assign to prosecutor">{prosecutors.length ? <Sel value={f.prosecutorId} onChange={v => setF({ ...f, prosecutorId: v })} options={prosecutors.map(p => [p.id, p.name] as [string, string])} /> : <input className="ws-input" disabled value="No active prosecutor in your woreda" />}</F>
          <F label="Woreda"><input className="ws-input" disabled value={scopeLabel(user!.scope)} /></F>
          <F label="Date opened"><input className="ws-input" type="date" required value={f.openedAt} max={new Date().toISOString().slice(0, 10)} onChange={e => setF({ ...f, openedAt: e.target.value })} /></F>
          <F label="Parties"><input className="ws-input" required value={f.parties} onChange={e => setF({ ...f, parties: e.target.value })} placeholder="Public Prosecutor v. …" /></F>
          <F label="Summary of facts" wide><textarea className="ws-input" rows={4} required value={f.description} onChange={e => setF({ ...f, description: e.target.value })} /></F>
        </div>
      </Panel>
      <aside>
        <Panel title="SLA preview" className="ws-sla-preview">
          <Timer size={26} />
          <p><b>{cat.name}</b> cases must be completed within <b>{cat.slaDays} days</b>.</p>
          <div className="ws-due-big"><small>Due date</small><strong>{fmtDate(due.toISOString())}</strong></div>
          <p className="ws-sub">After the due date the case is locked. The prosecutor must go to the Woreda Coordinator, who can give permission to continue – the case still counts as overdue in KPIs.</p>
          <button className="ws-btn block" disabled={!f.prosecutorId}><Save size={16} />Register and assign</button>
        </Panel>
      </aside>
    </form>
  </>;
}

export function CaseDetail({ id }: { id: string }) {
  const { data, user, can, actions, userName } = useWS();
  const c = data.cases.find(x => x.id === id);
  const [to, setTo] = useState<CaseStatus>('Under investigation'), [note, setNote] = useState(''), [comment, setComment] = useState('');
  const [extDays, setExtDays] = useState('14'), [extReason, setExtReason] = useState(''), [reassign, setReassign] = useState('');
  const { myCases } = useWS();
  useEffect(() => { if (c) { const i = CASE_STATUSES.indexOf(c.status); setTo(CASE_STATUSES[Math.min(i + 1, CASE_STATUSES.length - 1)]); setReassign(c.prosecutorId); } }, [c?.status, c?.prosecutorId]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!c || !myCases.some(x => x.id === c.id)) return <Empty title="Case not found">It may not be assigned to you.</Empty>;
  const cat = data.caseCategories.find(x => x.id === c.categoryId)!;
  const overdue = isOverdue(c);
  const permitted = hasPermission(c);
  const locked = isLocked(c) && !can('cases.extend');
  const canUpdate = can('cases.update') && (can('cases.viewAll') || c.prosecutorId === user!.id);

  const canComment = can('cases.comment') || c.prosecutorId === user!.id;
  const timeline = [
    ...data.statusChanges.filter(s => s.caseId === id).map(s => ({ at: s.at, by: s.by, kind: 'status' as const, title: s.from ? `${s.from} → ${s.to}` : `Registered`, body: s.note })),
    ...data.extensions.filter(x => x.caseId === id).map(x => ({ at: x.at, by: x.by, kind: 'ext' as const, title: `Permission given for ${x.days} days (until ${fmtDate(x.newDue)}) – still overdue`, body: x.reason })),
  ].sort((a, b) => b.at.localeCompare(a.at));
  const comments = data.comments.filter(x => x.caseId === id).sort((a, b) => a.at.localeCompare(b.at));
  const total = (new Date(c.dueAt).getTime() - new Date(c.openedAt).getTime()) / 86400000;
  const used = Math.min(100, Math.max(0, ((Date.now() - new Date(c.openedAt).getTime()) / 86400000 / total) * 100));

  return <>
    <Link href="/dashboard/cases" className="ws-back"><ArrowLeft size={15} />All cases</Link>
    <div className="ws-case-head">
      <div><div className="ws-eyebrow">{c.caseNo}</div><h1>{c.title}</h1><div className="ws-case-pills"><StatusPill status={c.status} /><SlaPill c={c} />{c.priority !== 'Normal' && <Pill tone="red">{c.priority}</Pill>}<Pill>{cat.name}</Pill><Pill>{c.subject}</Pill>{closedLate(c) && <Pill tone="red">Closed late</Pill>}</div></div>
    </div>
    {overdue && (permitted
      ? <div className="ws-banner warn"><Unlock /><div><b>Overdue – permission given until {fmtDate(c.permitUntil)}</b><p>The Woreda Coordinator allowed work to continue after the prosecutor came to the office. Status updates and reports are possible, but the case still counts as <b>overdue</b> in KPIs (due {fmtDate(c.dueAt)}).</p></div></div>
      : <div className={'ws-banner ' + (locked ? 'bad' : 'warn')}><Lock /><div><b>{locked ? 'SLA overdue — status updates are locked' : 'SLA overdue — locked for the prosecutor'}</b><p>{locked ? `This case passed its due date (${fmtDate(c.dueAt)}). Go to the Woreda Coordinator to explain the delay. The Woreda Coordinator can give permission to continue; the case will still count as overdue.` : `Due ${fmtDate(c.dueAt)}. The prosecutor cannot update this case until you give permission below. The case stays overdue in KPIs.`}</p></div></div>)}
    <div className="ws-detail">
      <div className="ws-detail-main">
        <Panel title="Case information">
          <dl className="ws-dl two"><dt>Parties</dt><dd>{c.parties}</dd><dt>Prosecutor</dt><dd>{userName(c.prosecutorId)}</dd><dt>Office</dt><dd>{c.office}</dd><dt>Registered by</dt><dd>{userName(c.createdBy)}</dd><dt>Opened</dt><dd>{fmtDate(c.openedAt)}</dd><dt>Last update</dt><dd>{ago(c.updatedAt)}</dd></dl>
          <p className="ws-facts">{c.description}</p>
        </Panel>
        {canUpdate && c.status !== 'Closed' && <Panel title="Update status">
          {locked ? <div className="ws-locked"><Lock size={22} /><div><b>Locked</b><p>Status changes are disabled because the SLA is overdue.</p></div></div> :
            <form className="ws-form" onSubmit={e => { e.preventDefault(); const r = actions.updateCaseStatus(id, to, note); if (r.ok) { toast.success('Status updated'); setNote(''); } else toast.error(r.error); }}>
              <div className="ws-grid2"><F label="New status"><Sel value={to} onChange={v => setTo(v as CaseStatus)} options={CASE_STATUSES.filter(s => s !== c.status)} /></F>
                <F label="Note / progress"><input className="ws-input" required value={note} onChange={e => setNote(e.target.value)} placeholder="What happened?" /></F></div>
              <button className="ws-btn"><Save size={16} />Save status</button>
            </form>}
        </Panel>}
        <CaseDocuments c={c} />
        <CaseEvidence c={c} />
        <Panel title={<><MessageSquare size={18} />Comments</>}>
          {comments.length ? <ul className="ws-comments">{comments.map(m => <li key={m.id} className={m.by === user!.id ? 'mine' : ''}><Avatar name={userName(m.by)} size={30} /><div><b>{userName(m.by)}</b><small>{data.roles.find(r => r.id === data.users.find(u => u.id === m.by)?.roleId)?.name} · {fmtDateTime(m.at)}</small><p>{m.body}</p></div></li>)}</ul> : <Empty title="No comments yet" />}
          {canComment && <form className="ws-comment-box" onSubmit={e => { e.preventDefault(); if (!comment.trim()) return; actions.addComment(id, comment.trim()); setComment(''); toast.success('Comment added'); }}>
            <textarea className="ws-input" rows={2} placeholder={can('cases.comment') ? 'Write a comment or instruction for the prosecutor…' : 'Reply to the Woreda Coordinator…'} value={comment} onChange={e => setComment(e.target.value)} />
            <button className="ws-btn" aria-label="Send comment"><Send size={16} /></button>
          </form>}
        </Panel>
      </div>
      <aside className="ws-detail-side">
        <Panel title={<><CalendarClock size={18} />SLA</>}>
          <div className="ws-sla-box"><div><small>{cat.name} SLA</small><b>{cat.slaDays} days</b></div><div><small>Due date</small><b>{fmtDate(c.dueAt)}</b></div><div><small>{overdue ? 'Overdue by' : 'Days left'}</small><b className={overdue ? 'red' : ''}>{c.status === 'Closed' ? '—' : Math.abs(daysLeft(c))}</b></div></div>
          <div className="ws-meter big"><i style={{ width: used + '%' }} className={used >= 100 ? 'bad' : used > 80 ? 'warn' : ''} /></div>
          <small className="ws-sub">{Math.round(used)}% of SLA time used</small>
          {can('cases.extend') && c.status !== 'Closed' && overdue && <form className="ws-form ws-ext" onSubmit={e => { e.preventDefault(); if (!extReason.trim()) return toast.error('Write what the prosecutor explained'); actions.grantPermission(id, Number(extDays), extReason.trim()); setExtReason(''); toast.success('Permission given — the prosecutor can continue; the case stays overdue in KPIs'); }}>
            <b><KeyRound size={14} /> {permitted ? 'Change permission' : 'Give permission to continue'}</b>
            <p className="ws-sub" style={{ margin: 0 }}>Use after the prosecutor has come to the office. The due date does not change.</p>
            <div className="ws-grid2"><F label="Allow for"><Sel value={extDays} onChange={setExtDays} options={[['7', '7 days'], ['14', '14 days'], ['30', '30 days'], ['60', '60 days']]} /></F><F label="Reason"><input className="ws-input" value={extReason} onChange={e => setExtReason(e.target.value)} placeholder="Reason given by the prosecutor" /></F></div>
            <div className="ws-inline"><button className="ws-btn sm"><Unlock size={15} />Give permission</button>{permitted && <button type="button" className="ws-btn sm ghost danger" onClick={() => { actions.revokePermission(id); toast.success('Permission withdrawn – case locked again'); }}>Withdraw</button>}</div>
          </form>}
          {can('cases.assign') && user!.scope?.id === c.woredaId && <form className="ws-form ws-ext" onSubmit={e => { e.preventDefault(); const r = actions.reassignCase(id, reassign); if (r.ok) toast.success('Case reassigned'); else toast.error(r.error); }}>
            <b>Assigned prosecutor</b>
            <div className="ws-inline"><Sel value={reassign} onChange={setReassign} options={data.users.filter(u => u.roleId === 'prosecutor' && u.status === 'active' && u.scope?.id === c.woredaId).map(u => [u.id, u.name] as [string, string])} /><button className="ws-btn sm ghost" disabled={reassign === c.prosecutorId}><UserRoundCog size={15} />Assign</button></div>
          </form>}
        </Panel>
        <CaseHearings c={c} />
        <Panel title={<><History size={18} />Status history</>}>
          <ol className="ws-timeline">{timeline.map((t, i) => <li key={i} className={t.kind}><b>{t.title}</b><p>{t.body}</p><small>{userName(t.by)} · {fmtDateTime(t.at)}</small></li>)}</ol>
        </Panel>
      </aside>
    </div>
  </>;
}

export function SlaSettings() {
  const { data, actions, userName } = useWS();
  const [vals, setVals] = useState<Record<string, string>>(Object.fromEntries(data.caseCategories.map(c => [c.id, String(c.slaDays)])));
  const [apply, setApply] = useState(true), [nc, setNc] = useState({ name: '', days: '30' });
  useEffect(() => { setVals(Object.fromEntries(data.caseCategories.map(c => [c.id, String(c.slaDays)]))); }, [data.caseCategories]);
  return <>
    <PageHead eyebrow="REGION" title="SLA, case types & KPI targets">The region sets the maximum number of days for each case type and the KPI targets. They apply to <b>all zones and woredas</b>. When a case passes its due date it is locked for the prosecutor until the Woreda Coordinator gives permission – it still counts as overdue.</PageHead>
    <Panel actions={<label className="ws-check"><input type="checkbox" checked={apply} onChange={e => setApply(e.target.checked)} />Recalculate due dates of open cases when saving</label>}>
      <DataTable head={['Case type', 'SLA (days)', 'Open cases', 'Overdue', 'Last changed', '']}>
        {data.caseCategories.map(cc => {
          const open = data.cases.filter(c => c.categoryId === cc.id && c.status !== 'Closed');
          const changed = vals[cc.id] !== String(cc.slaDays);
          return <tr key={cc.id}>
            <td><b>{cc.name}</b></td>
            <td><input className="ws-input sla-input" type="number" min={1} max={730} value={vals[cc.id] || ''} onChange={e => setVals({ ...vals, [cc.id]: e.target.value })} aria-label={`SLA days for ${cc.name}`} /></td>
            <td>{open.length}</td>
            <td>{open.filter(c => isOverdue(c)).length ? <Pill tone="red"><AlertTriangle size={12} />{open.filter(c => isOverdue(c)).length}</Pill> : <Pill tone="green">0</Pill>}</td>
            <td>{fmtDate(cc.updatedAt)}<small className="ws-sub">{userName(cc.updatedBy)}</small></td>
            <td><button className="ws-btn sm" disabled={!changed || !(Number(vals[cc.id]) > 0)} onClick={() => { actions.setSla(cc.id, Number(vals[cc.id]), apply); toast.success(`SLA for ${cc.name} set to ${vals[cc.id]} days`); }}><Save size={14} />Save</button></td>
          </tr>;
        })}
      </DataTable>
    </Panel>
    <KpiTargetsPanel />
    <Panel title="Add case type">
      <form className="ws-inline wrap" onSubmit={e => { e.preventDefault(); if (!nc.name.trim()) return; actions.addCaseCategory(nc.name.trim(), Number(nc.days)); setNc({ name: '', days: '30' }); toast.success('Case type added'); }}>
        <F label="Case type name"><input className="ws-input" value={nc.name} onChange={e => setNc({ ...nc, name: e.target.value })} placeholder="e.g. Review case" /></F>
        <F label="SLA days"><input className="ws-input" type="number" min={1} value={nc.days} onChange={e => setNc({ ...nc, days: e.target.value })} /></F>
        <button className="ws-btn"><Plus size={16} />Add</button>
      </form>
    </Panel>
  </>;
}


function KpiTargetsPanel() {
  const { data, actions } = useWS();
  const t = data.settings.kpiTargets;
  const [v, setV] = useState({ slaCompliance: String(t.slaCompliance), onTimeRate: String(t.onTimeRate), clearanceRate: String(t.clearanceRate) });
  const num = (x: string) => Math.min(100, Math.max(0, Number(x) || 0));
  return <Panel title="KPI targets for all zones and woredas">
    <p className="ws-sub">Zone and woreda KPI pages compare their results with these targets.</p>
    <form className="ws-inline wrap" onSubmit={e => { e.preventDefault(); actions.setKpiTargets({ slaCompliance: num(v.slaCompliance), onTimeRate: num(v.onTimeRate), clearanceRate: num(v.clearanceRate) }); toast.success('KPI targets saved for all zones and woredas'); }}>
      <F label="SLA compliance (%)"><input className="ws-input" type="number" min={0} max={100} value={v.slaCompliance} onChange={e => setV({ ...v, slaCompliance: e.target.value })} /></F>
      <F label="On-time completion (%)"><input className="ws-input" type="number" min={0} max={100} value={v.onTimeRate} onChange={e => setV({ ...v, onTimeRate: e.target.value })} /></F>
      <F label="Clearance rate (%)"><input className="ws-input" type="number" min={0} max={100} value={v.clearanceRate} onChange={e => setV({ ...v, clearanceRate: e.target.value })} /></F>
      <button className="ws-btn"><Save size={16} />Save targets</button>
    </form>
  </Panel>;
}
