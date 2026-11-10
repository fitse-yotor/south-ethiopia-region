'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ClipboardList, MessageSquareReply, Plus, Send, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { useWS } from '@/lib/ws/store';
import type { Period } from '@/lib/ws/types';
import { Avatar, Empty, F, Modal, PageHead, Panel, Pill, Sel, StatusPill, ago, fmtDate, fmtDateTime } from './ui';
import { useQueryParam } from './library';
import { AiSummaryPanel, useAiStatus } from './ai-summary';

const PERIODS: Period[] = ['Daily', 'Weekly', 'Monthly'];
function defaultLabel(p: Period) {
  const d = new Date();
  if (p === 'Daily') return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  if (p === 'Weekly') return 'Week ending ' + d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  return d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
}

export function PeriodicReports() {
  const { data, user, can, userName } = useWS();
  const reviewer = can('preports.review') || can('preports.view');
  const officeOf = (id: string) => data.users.find(u => u.id === id)?.office;
  const canSee = (pid: string) => pid === user!.id || can('preports.review') || (can('preports.view') && (can('cases.viewAll') || officeOf(pid) === user!.office));
  const newParam = useQueryParam('new');
  const [open, setOpen] = useState(false), [period, setPeriod] = useState('all'), [pros, setPros] = useState('all'), [status, setStatus] = useState('all'), [aiOpen, setAiOpen] = useState(false);
  const ai = useAiStatus();
  useEffect(() => { if (newParam && can('preports.submit')) setOpen(true); }, [newParam]); // eslint-disable-line react-hooks/exhaustive-deps
  const list = data.preports.filter(r => canSee(r.prosecutorId) && (period === 'all' || r.period === period) && (pros === 'all' || r.prosecutorId === pros) && (status === 'all' || r.status === status))
    .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
  return <>
    <PageHead eyebrow="PROSECUTION" title={reviewer ? 'Prosecutor reports' : 'My reports'} actions={can('preports.submit') ? <button className="ws-btn" onClick={() => setOpen(true)}><Plus size={16} />Submit report</button> : reviewer && ai?.enabled ? <button className="ws-btn" onClick={() => setAiOpen(true)} disabled={!list.length}><Sparkles size={16} />AI summary of this list</button> : undefined}>
      {reviewer ? 'Daily, weekly and monthly reports submitted by prosecutors. Open a report to give feedback.' : 'Submit your daily, weekly and monthly reports. The Woreda Coordinator reviews each report and gives feedback.'}
    </PageHead>
    <div className="ws-chips">{['all', ...PERIODS].map(p => <button key={p} aria-pressed={period === p} onClick={() => setPeriod(p)}>{p === 'all' ? 'All periods' : p}<em>{data.preports.filter(r => canSee(r.prosecutorId) && (p === 'all' || r.period === p)).length}</em></button>)}</div>
    <Panel>
      {reviewer && <div className="ws-filters">
        <Sel aria-label="Prosecutor" value={pros} onChange={setPros} options={[['all', 'All prosecutors'], ...data.users.filter(u => u.roleId === 'prosecutor').map(u => [u.id, u.name] as [string, string])]} />
        <Sel aria-label="Status" value={status} onChange={setStatus} options={[['all', 'All statuses'], ['Submitted', 'Awaiting feedback'], ['Reviewed', 'Reviewed']]} />
      </div>}
      <div className="ws-table-wrap"><table className="ws-table cards-on-mobile">
        <thead><tr>{reviewer && <th>Prosecutor</th>}<th>Period</th><th>Covering</th><th>Figures</th><th>Submitted</th><th>Status</th></tr></thead>
        <tbody>{list.map(r => <tr key={r.id}>
          {reviewer && <td data-label="Prosecutor"><Link className="ws-case-link" href={'/dashboard/periodic-reports/' + r.id}><b>{userName(r.prosecutorId)}</b><small>{data.users.find(u => u.id === r.prosecutorId)?.office}</small></Link></td>}
          <td data-label="Period"><Pill tone={r.period === 'Monthly' ? 'blue' : r.period === 'Weekly' ? 'teal' : 'grey'}>{r.period}</Pill></td>
          <td data-label="Covering"><Link href={'/dashboard/periodic-reports/' + r.id}>{r.periodLabel}</Link></td>
          <td data-label="Figures"><span className="ws-figs">{r.newCases} new · {r.closedCases} closed · {r.hearings} hearings</span></td>
          <td data-label="Submitted">{ago(r.submittedAt)}</td>
          <td data-label="Status"><StatusPill status={r.status} />{data.feedback.some(f => f.reportId === r.id) && <MessageSquareReply size={15} className="ws-fb-ic" aria-label="Has feedback" />}</td>
        </tr>)}</tbody>
      </table>{!list.length && <Empty title="No reports yet" icon={<ClipboardList size={30} />} />}</div>
    </Panel>
    {reviewer && <Modal open={aiOpen} onClose={() => setAiOpen(false)} title="AI summary of reports" description={`Summarises the ${Math.min(list.length, 60)} most recent reports matching your filters (${period === 'all' ? 'all periods' : period}${pros !== 'all' ? ', ' + userName(pros) : ''}).`} wide>
      {aiOpen && <AiSummaryPanel reports={list.slice(0, 60)} mode="period" title={`${period === 'all' ? 'all periods' : period + ' reports'}${pros !== 'all' ? ' of ' + userName(pros) : ''}`} />}
    </Modal>}
    <SubmitReport open={open} initial={(PERIODS as string[]).includes(newParam || '') ? newParam as Period : 'Daily'} onClose={() => setOpen(false)} />
  </>;
}

function SubmitReport({ open, onClose, initial }: { open: boolean; onClose: () => void; initial: Period }) {
  const { actions, data, user } = useWS();
  const [f, setF] = useState({ period: initial, periodLabel: defaultLabel(initial), newCases: '0', closedCases: '0', hearings: '0', summary: '', challenges: '', nextPlan: '' });
  const [filled, setFilled] = useState(false);
  // Pre-fill numbers and a draft narrative from the prosecutor's own activity in the period.
  const prefill = (p: Period) => {
    const win = ({ Daily: 1, Weekly: 7, Monthly: 31 })[p] * 86400000, from = Date.now() - win;
    const mine = data.cases.filter(c => c.prosecutorId === user!.id);
    const inWin = (iso: string) => new Date(iso).getTime() >= from;
    const opened = mine.filter(c => inWin(c.openedAt));
    const changes = data.statusChanges.filter(s => s.by === user!.id && inWin(s.at) && s.from);
    const closed = changes.filter(s => ['Closed', 'Judgment delivered'].includes(s.to));
    const today = new Date().toISOString().slice(0, 10), fromDay = new Date(from).toISOString().slice(0, 10);
    const hearings = data.hearings.filter(h => mine.some(c => c.id === h.caseId) && h.date >= fromDay && h.date <= today);
    const upcoming = data.hearings.filter(h => mine.some(c => c.id === h.caseId) && h.date > today).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 3);
    const overdue = mine.filter(c => c.status !== 'Closed' && new Date(c.dueAt).getTime() < Date.now());
    const caseNo = (id: string) => data.cases.find(c => c.id === id)?.caseNo || '';
    const lines = [
      opened.length ? `Registered ${opened.length} new case(s): ${opened.map(c => c.caseNo).join(', ')}.` : '',
      ...changes.slice(0, 6).map(s => `${caseNo(s.caseId)}: ${s.from} → ${s.to}${s.note ? ' (' + s.note + ')' : ''}.`),
      hearings.length ? `Attended ${hearings.length} hearing(s)${hearings.some(h => h.outcome) ? ': ' + hearings.filter(h => h.outcome).map(h => `${caseNo(h.caseId)} – ${h.outcome}`).join('; ') : ''}.` : '',
    ].filter(Boolean);
    setF({ period: p, periodLabel: defaultLabel(p), newCases: String(opened.length), closedCases: String(closed.length), hearings: String(hearings.length),
      summary: lines.join('\n') || '', challenges: overdue.length ? `${overdue.length} case(s) past SLA: ${overdue.map(c => c.caseNo).join(', ')}.` : '',
      nextPlan: upcoming.length ? `Upcoming hearings: ${upcoming.map(h => `${caseNo(h.caseId)} on ${h.date} (${h.purpose})`).join('; ')}.` : '' });
    setFilled(true);
  };
  useEffect(() => { if (open) prefill(initial); }, [open, initial]); // eslint-disable-line react-hooks/exhaustive-deps
  return <Modal open={open} onClose={onClose} title="Submit report" description="Your report is sent to the Woreda Coordinator for review." wide>
    <form className="ws-form" onSubmit={e => {
      e.preventDefault();
      actions.submitReport({ period: f.period, periodLabel: f.periodLabel, periodStart: new Date().toISOString(), newCases: +f.newCases, closedCases: +f.closedCases, hearings: +f.hearings, summary: f.summary, challenges: f.challenges, nextPlan: f.nextPlan });
      toast.success(`${f.period} report submitted`); onClose();
    }}>
      <div className="ws-seg" role="radiogroup" aria-label="Report period">{PERIODS.map(p => <button type="button" role="radio" aria-checked={f.period === p} key={p} onClick={() => prefill(p)}>{p}</button>)}</div>
      {filled && <p className="ws-prefill-note"><Sparkles size={14} />Numbers and a draft were filled in from your case activity in this period. Check and edit before sending.</p>}
      <div className="ws-grid3">
        <F label="Covering period" wide><input className="ws-input" required value={f.periodLabel} onChange={e => setF({ ...f, periodLabel: e.target.value })} /></F>
        <F label="New cases"><input className="ws-input" type="number" min={0} value={f.newCases} onChange={e => setF({ ...f, newCases: e.target.value })} /></F>
        <F label="Cases closed"><input className="ws-input" type="number" min={0} value={f.closedCases} onChange={e => setF({ ...f, closedCases: e.target.value })} /></F>
        <F label="Court hearings"><input className="ws-input" type="number" min={0} value={f.hearings} onChange={e => setF({ ...f, hearings: e.target.value })} /></F>
      </div>
      <F label="Activities & progress"><textarea className="ws-input" rows={3} required value={f.summary} onChange={e => setF({ ...f, summary: e.target.value })} /></F>
      <F label="Challenges"><textarea className="ws-input" rows={2} value={f.challenges} onChange={e => setF({ ...f, challenges: e.target.value })} /></F>
      <F label="Plan for next period"><textarea className="ws-input" rows={2} value={f.nextPlan} onChange={e => setF({ ...f, nextPlan: e.target.value })} /></F>
      <div className="ws-form-actions"><button type="button" className="ws-btn ghost" onClick={onClose}>Cancel</button><button className="ws-btn"><Send size={16} />Submit to Woreda Coordinator</button></div>
    </form>
  </Modal>;
}

export function PeriodicReportDetail({ id }: { id: string }) {
  const { data, user, can, actions, userName } = useWS();
  const r = data.preports.find(x => x.id === id);
  const [fb, setFb] = useState('');
  const officeOk = r && (can('cases.viewAll') || data.users.find(u => u.id === r.prosecutorId)?.office === user!.office);
  if (!r || (!can('preports.review') && !(can('preports.view') && officeOk) && r.prosecutorId !== user!.id)) return <Empty title="Report not found" />;
  const feedback = data.feedback.filter(f => f.reportId === id).sort((a, b) => a.at.localeCompare(b.at));
  const p = data.users.find(u => u.id === r.prosecutorId);
  return <>
    <Link href="/dashboard/periodic-reports" className="ws-back"><ArrowLeft size={15} />All reports</Link>
    <div className="ws-case-head"><div><div className="ws-eyebrow">{r.period.toUpperCase()} REPORT</div><h1>{r.periodLabel}</h1><div className="ws-case-pills"><StatusPill status={r.status} /><Pill>{p?.name} · {p?.office}</Pill><Pill>Submitted {fmtDateTime(r.submittedAt)}</Pill></div></div></div>
    <div className="ws-detail">
      <div className="ws-detail-main">
        <div className="ws-stats three"><div className="ws-stat"><span className="ws-stat-label">New cases</span><strong>{r.newCases}</strong></div><div className="ws-stat tone-ink"><span className="ws-stat-label">Cases closed</span><strong>{r.closedCases}</strong></div><div className="ws-stat tone-gold"><span className="ws-stat-label">Court hearings</span><strong>{r.hearings}</strong></div></div>
        <Panel title="Report">
          <h3 className="ws-h3">Activities & progress</h3><p>{r.summary}</p>
          <h3 className="ws-h3">Challenges</h3><p>{r.challenges || '—'}</p>
          <h3 className="ws-h3">Plan for next period</h3><p>{r.nextPlan || '—'}</p>
        </Panel>
      </div>
      <aside className="ws-detail-side">
        {can('preports.review') && <AiSummaryPanel reports={[r]} mode="report" onUse={t => setFb(t)} compact />}
        <Panel title="Woreda Coordinator feedback">
          {feedback.length ? <ul className="ws-comments">{feedback.map(f => <li key={f.id}><Avatar name={userName(f.by)} size={30} /><div><b>{userName(f.by)}</b><small>{fmtDate(f.at)}</small><p>{f.body}</p></div></li>)}</ul> : <Empty title="No feedback yet">{can('preports.review') ? 'Add your feedback below.' : 'The Woreda Coordinator has not reviewed this report yet.'}</Empty>}
          {can('preports.review') && <form className="ws-form" onSubmit={e => { e.preventDefault(); if (!fb.trim()) return; actions.addFeedback(id, fb.trim()); setFb(''); toast.success('Feedback sent to ' + p?.name); }}>
            <F label="Add feedback"><textarea className="ws-input" rows={4} value={fb} onChange={e => setFb(e.target.value)} placeholder="Comments, guidance or required actions…" /></F>
            <button className="ws-btn"><Send size={16} />Send feedback</button>
          </form>}
        </Panel>
      </aside>
    </div>
  </>;
}

