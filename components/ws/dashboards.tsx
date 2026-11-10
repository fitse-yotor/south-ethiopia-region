'use client';
import Link from 'next/link';
import { AlertTriangle, ArrowRight, CalendarDays, BookOpen, Briefcase, CheckCircle2, ClipboardList, Clock, FileCheck2, Globe, Lock, MessageSquare, Users, Wallet } from 'lucide-react';
import { isOverdue, slaState, useWS } from '@/lib/ws/store';
import { CASE_STATUSES } from '@/lib/ws/types';
import { computeKpis, groupKpis } from '@/lib/ws/kpi';
import { scopeLabel, unitName, zoneOfWoreda } from '@/lib/ws/org';
import { Hero, QuickActions } from './dash-parts';
import { Bars, DocIcon, Empty, PageHead, Panel, Pill, SlaPill, Stat, ago, fmtDate } from './ui';

export function Dashboard() {
  const { user, role, can, data, hasLibraryAccess, userName, myCases: visible } = useWS();
  if (!user) return null;
  const hour = new Date().getHours();
  const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const isResearcher = can('library.contribute');
  const director = can('cases.viewAll') || can('cases.viewOffice');
  const prosecutor = can('cases.viewOwn') && !director;
  const libAdmin = can('library.approve');
  const superAdmin = can('users.manage');

  const scope = visible;
  const myCases = scope;
  const open = scope.filter(c => c.status !== 'Closed');
  const overdue = open.filter(c => isOverdue(c));
  const dueSoon = open.filter(c => slaState(c, data.settings.dueSoonDays) === 'due-soon');
  const pendPay = data.payments.filter(p => p.status === 'pending');
  const pendDocs = data.docs.filter(d => d.status === 'pending');
  const toReview = data.preports.filter(r => r.status === 'Submitted');
  const myNotes = data.notifications.filter(n => n.userId === user.id).slice(0, 5);

  return <>
    <Hero greet={greet} firstName={user.name.replace(/^Dr\.\s*/, '').split(' ')[0]} overdue={overdue.length} hearingsToday={data.hearings.filter(h => h.date === new Date().toISOString().slice(0, 10) && scope.some(c => c.id === h.caseId)).length} unread={data.notifications.filter(n => n.userId === user.id && !n.read).length} />
    <QuickActions />

    <div className="ws-stats">
      {superAdmin && <>
        <Stat label="Active users" value={data.users.filter(u => u.status === 'active').length} icon={<Users />} href="/dashboard/users" hint={`${data.roles.length} roles`} />
        <Stat label="Pending approvals" value={pendPay.length + pendDocs.length} tone="gold" icon={<FileCheck2 />} href="/dashboard/library/approvals" hint="Payments & contributions" />
      </>}
      {(director || prosecutor) && <>
        <Stat label={director ? 'Open cases' : 'My open cases'} value={open.length} icon={<Briefcase />} href="/dashboard/cases" hint={`${scope.length} total`} />
        <Stat label="Overdue (SLA)" value={overdue.length} tone="red" icon={<AlertTriangle />} href="/dashboard/cases?filter=overdue" hint={prosecutor ? 'Status updates locked' : 'Need coordinator action'} />
        <Stat label={`Due within ${data.settings.dueSoonDays} days`} value={dueSoon.length} tone="gold" icon={<Clock />} href="/dashboard/cases?filter=due-soon" />
      </>}
      {can('preports.review') && <Stat label="Reports to review" value={toReview.length} tone="ink" icon={<ClipboardList />} href="/dashboard/periodic-reports" />}
      {prosecutor && <Stat label="Reports submitted" value={data.preports.filter(r => r.prosecutorId === user.id).length} tone="ink" icon={<ClipboardList />} href="/dashboard/periodic-reports" hint={`${data.feedback.filter(f => data.preports.find(r => r.id === f.reportId)?.prosecutorId === user.id).length} with feedback`} />}
      {libAdmin && !superAdmin && <>
        <Stat label="Payments to verify" value={pendPay.length} tone="gold" icon={<Wallet />} href="/dashboard/library/approvals" />
        <Stat label="Contributions to review" value={pendDocs.length} tone="gold" icon={<FileCheck2 />} href="/dashboard/library/approvals?tab=contributions" />
      </>}
      {(libAdmin || superAdmin) && <>
        <Stat label="Published documents" value={data.docs.filter(d => d.status === 'published').length} icon={<BookOpen />} href="/dashboard/library/manage" />
        <Stat label="Active researchers" value={data.users.filter(u => u.roleId === 'researcher' && hasLibraryAccess(u)).length} tone="ink" icon={<Users />} hint={`${data.payments.filter(p => p.status === 'approved').reduce((s, p) => s + p.amount, 0)} ETB collected`} />
      </>}
      {isResearcher && <>
        <Stat label="Library documents" value={data.docs.filter(d => d.status === 'published').length} icon={<BookOpen />} href="/dashboard/library" />
        <Stat label="My contributions" value={data.docs.filter(d => d.uploadedBy === user.id).length} tone="gold" icon={<FileCheck2 />} href="/dashboard/library/contribute" hint={`${data.docs.filter(d => d.uploadedBy === user.id && d.status === 'published').length} published`} />
      </>}
      {can('appointments.manage') && !superAdmin && <>
        <Stat label="Appointments to confirm" value={data.appointments.filter(a => a.status === 'booked').length} tone="gold" icon={<CalendarDays />} href="/dashboard/appointments" />
        <Stat label="Upcoming legal aid sessions" value={data.appointments.filter(a => ['booked', 'confirmed'].includes(a.status) && a.date >= new Date().toISOString().slice(0, 10)).length} href="/dashboard/appointments" />
      </>}
      {can('reports.finance') && !superAdmin && !director && <>
        <Stat label="Library fees collected" value={data.payments.filter(p => p.status === 'approved').reduce((t, p) => t + p.amount, 0) + ' ETB'} tone="ink" href="/dashboard/reports" />
        <Stat label="Receipts awaiting check" value={data.payments.filter(p => p.status === 'pending').length} tone="gold" href="/dashboard/reports" />
      </>}
            {can('cms.access') && !superAdmin && <Stat label="Website & complaints" value={<Globe />} href="/admin" hint="Open the CMS workspace" />}
    </div>

    {isResearcher && <ResearcherAccess />}
    {(director || prosecutor) && <HearingReminder />}

    <div className="ws-dash-grid">
      {(director || superAdmin) && <Panel title="Cases by status" actions={<Link className="ws-link" href="/dashboard/reports">Reports <ArrowRight size={14} /></Link>}>
        <Bars data={CASE_STATUSES.map(s => ({ label: s, value: scope.filter(c => c.status === s).length, tone: s === 'Closed' ? 'grey' : s === 'Adjourned' ? 'gold' : undefined }))} />
      </Panel>}
      {(director || superAdmin) && <Panel title="SLA compliance by category" actions={can('sla.manage') ? <Link className="ws-link" href="/dashboard/sla">Set SLAs <ArrowRight size={14} /></Link> : undefined}>
        <div className="ws-compliance">{data.caseCategories.map(cc => {
          const cs = scope.filter(c => c.categoryId === cc.id); const od = cs.filter(c => isOverdue(c)).length; const pct = cs.length ? Math.round(((cs.length - od) / cs.length) * 100) : 100;
          return <div key={cc.id}><span>{cc.name}<small>{cc.slaDays} days SLA · {cs.length} cases</small></span><div className="ws-meter"><i style={{ width: pct + '%' }} className={pct < 70 ? 'bad' : pct < 90 ? 'warn' : ''} /></div><b>{pct}%</b></div>;
        })}</div>
      </Panel>}

      {(director || prosecutor) && <Panel title={overdue.length ? 'Overdue & due-soon cases' : 'Cases needing attention'} actions={<Link className="ws-link" href="/dashboard/cases">All cases <ArrowRight size={14} /></Link>}>
        {[...overdue, ...dueSoon].length ? <ul className="ws-list">{[...overdue, ...dueSoon].slice(0, 6).map(c => <li key={c.id}><Link href={'/dashboard/cases/' + c.id}><div><b>{c.title}</b><small>{c.caseNo} · {director ? userName(c.prosecutorId) : c.office} · {c.status}</small></div><SlaPill c={c} />{prosecutor && isOverdue(c) && <Lock size={15} className="ws-lock" />}</Link></li>)}</ul> : <Empty title="All cases on track" icon={<CheckCircle2 size={30} />} />}
      </Panel>}

      {prosecutor && <Panel title="Reports due" actions={<Link className="ws-link" href="/dashboard/periodic-reports?new=1">Submit report <ArrowRight size={14} /></Link>}>
        <ReportDue />
      </Panel>}

      {can('cases.viewAll') && user.scope && <Panel title={user.scope.level === 'region' ? 'Zones at a glance' : 'Woredas at a glance'} actions={<Link className="ws-link" href="/dashboard/kpi">Full KPI report <ArrowRight size={14} /></Link>}>
        <div className="ws-table-wrap"><table className="ws-table compact"><thead><tr><th>{user.scope.level === 'region' ? 'Zone' : 'Woreda'}</th><th>Cases</th><th>Open</th><th>Missed SLA</th><th>SLA compliance</th><th>Target {data.settings.kpiTargets.slaCompliance}%</th></tr></thead><tbody>
          {groupKpis(data, scope, c => user.scope!.level === 'region' ? unitName(zoneOfWoreda(c.woredaId)?.id) : c.office).sort((a, b) => a.name.localeCompare(b.name)).map(g => <tr key={g.name}><td><b>{g.name}</b></td><td>{g.k.total}</td><td>{g.k.open}</td><td>{g.k.overdueAll ? <Pill tone="red">{g.k.overdueAll}</Pill> : 0}</td><td>{g.k.slaCompliance}%</td><td><Pill tone={g.k.slaCompliance >= data.settings.kpiTargets.slaCompliance ? 'green' : 'red'}>{g.k.slaCompliance >= data.settings.kpiTargets.slaCompliance ? 'Met' : 'Below'}</Pill></td></tr>)}
          <tr className="total"><td><b>All</b></td><td>{computeKpis(data, scope).total}</td><td>{computeKpis(data, scope).open}</td><td>{computeKpis(data, scope).overdueAll}</td><td>{computeKpis(data, scope).slaCompliance}%</td><td></td></tr>
        </tbody></table></div>
      </Panel>}

      {director && <Panel title="Prosecutor report compliance" actions={<Link className="ws-link" href="/dashboard/periodic-reports">Review <ArrowRight size={14} /></Link>}>
        <div className="ws-table-wrap"><table className="ws-table compact"><thead><tr><th>Prosecutor</th><th>Daily (today)</th><th>Weekly</th><th>Monthly</th><th>Awaiting</th></tr></thead><tbody>
          {data.users.filter(u => u.roleId === 'prosecutor' && u.status === 'active' && (can('cases.viewAll') || u.office === user.office)).map(u => {
            const rs = data.preports.filter(r => r.prosecutorId === u.id);
            const daily = rs.some(r => r.period === 'Daily' && Date.now() - new Date(r.submittedAt).getTime() < 1.5 * 86400000);
            const weekly = rs.some(r => r.period === 'Weekly' && Date.now() - new Date(r.submittedAt).getTime() < 7 * 86400000);
            const monthly = rs.some(r => r.period === 'Monthly' && Date.now() - new Date(r.submittedAt).getTime() < 31 * 86400000);
            const ok = (b: boolean) => b ? <Pill tone="green">Submitted</Pill> : <Pill tone="red">Missing</Pill>;
            return <tr key={u.id}><td>{u.name}<small className="ws-sub">{u.office}</small></td><td>{ok(daily)}</td><td>{ok(weekly)}</td><td>{ok(monthly)}</td><td>{rs.filter(r => r.status === 'Submitted').length}</td></tr>;
          })}
        </tbody></table></div>
      </Panel>}

      {libAdmin && <Panel title="Approval queue" actions={<Link className="ws-link" href="/dashboard/library/approvals">Open queue <ArrowRight size={14} /></Link>}>
        {pendPay.length + pendDocs.length ? <ul className="ws-list">
          {pendPay.map(p => <li key={p.id}><Link href="/dashboard/library/approvals"><div><b>Payment · {userName(p.userId)}</b><small>{p.amount} ETB · Telebirr {p.txnId} · {ago(p.createdAt)}</small></div><Pill tone="gold">Payment</Pill></Link></li>)}
          {pendDocs.map(d => <li key={d.id}><Link href="/dashboard/library/approvals?tab=contributions"><div><b>{d.title}</b><small>by {userName(d.uploadedBy)} · {ago(d.createdAt)}</small></div><Pill tone="blue">Contribution</Pill></Link></li>)}
        </ul> : <Empty title="Nothing waiting for approval" icon={<CheckCircle2 size={30} />} />}
      </Panel>}

      {(libAdmin || superAdmin) && <Panel title="Documents by category">
        <Bars data={data.categories.filter(c => !c.parentId).map(c => ({ label: c.name, value: data.docs.filter(d => d.status === 'published' && (d.categoryId === c.id || data.categories.find(x => x.id === d.categoryId)?.parentId === c.id)).length }))} />
      </Panel>}

      {(isResearcher || libAdmin) && <Panel title="Recently added to the library" actions={<Link className="ws-link" href="/dashboard/library">Browse <ArrowRight size={14} /></Link>}>
        <ul className="ws-list">{data.docs.filter(d => d.status === 'published').sort((a, b) => (b.publishedAt || '').localeCompare(a.publishedAt || '')).slice(0, 5).map(d => <li key={d.id}><Link href={'/dashboard/library?doc=' + d.id}><DocIcon type={d.type} /><div><b>{d.title}</b><small>{data.categories.find(c => c.id === d.categoryId)?.name} · {fmtDate(d.publishedAt)}</small></div>{d.visibility === 'researchers' && <Pill tone="teal">Researchers</Pill>}</Link></li>)}</ul>
      </Panel>}

      {director && data.ratings.length > 0 && <Panel title="Citizen satisfaction" actions={can('events.manage') ? <Link className="ws-link" href="/dashboard/events">Details <ArrowRight size={14} /></Link> : undefined}>
        <div className="sat-head"><strong>{(data.ratings.reduce((s, r) => s + r.stars, 0) / data.ratings.length).toFixed(1)}</strong><span>/ 5 from {data.ratings.length} ratings</span></div>
        <Bars data={[5, 4, 3, 2, 1].map(n => ({ label: '★'.repeat(n), value: data.ratings.filter(r => r.stars === n).length }))} />
      </Panel>}
      {superAdmin && <Panel title="Users by role" actions={<Link className="ws-link" href="/dashboard/users">Manage <ArrowRight size={14} /></Link>}>
        <Bars data={data.roles.map(r => ({ label: r.name, value: data.users.filter(u => u.roleId === r.id).length }))} />
      </Panel>}

      {(director || prosecutor) && <Panel title="Latest comments & feedback">
        <ul className="ws-feed">{[
          ...data.comments.filter(c => director || myCases.some(x => x.id === c.caseId)).map(c => ({ at: c.at, by: c.by, text: c.body, link: '/dashboard/cases/' + c.caseId, label: data.cases.find(x => x.id === c.caseId)?.caseNo })),
          ...data.feedback.filter(f => director || data.preports.find(r => r.id === f.reportId)?.prosecutorId === user.id).map(f => ({ at: f.at, by: f.by, text: f.body, link: '/dashboard/periodic-reports/' + f.reportId, label: 'Report feedback' })),
        ].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 5).map((x, i) => <li key={i}><MessageSquare size={16} /><Link href={x.link}><b>{userName(x.by)}</b> · <span>{x.label}</span><p>{x.text}</p><small>{ago(x.at)}</small></Link></li>)}</ul>
      </Panel>}

      {superAdmin && <Panel title="Recent activity" actions={<Link className="ws-link" href="/dashboard/audit">Audit log <ArrowRight size={14} /></Link>}>
        <ul className="ws-feed">{data.audit.slice(0, 6).map(a => <li key={a.id}><span className="dot" /><div><b>{userName(a.by)}</b> {a.action}<small>{ago(a.at)}</small></div></li>)}</ul>
      </Panel>}

      <Panel title="Notifications" actions={<Link className="ws-link" href="/dashboard/notifications">View all <ArrowRight size={14} /></Link>}>
        {myNotes.length ? <ul className="ws-feed">{myNotes.map(n => <li key={n.id} className={n.read ? '' : 'unread'}><span className="dot" /><Link href={n.link}>{n.text}<small>{ago(n.at)}</small></Link></li>)}</ul> : <Empty title="No notifications" />}
      </Panel>
    </div>
  </>;
}

function ReportDue() {
  const { data, user } = useWS();
  const rs = data.preports.filter(r => r.prosecutorId === user!.id);
  const last = (p: string) => rs.filter(r => r.period === p).sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))[0];
  const rows: [string, number][] = [['Daily', 1.5], ['Weekly', 7], ['Monthly', 31]];
  return <ul className="ws-due">{rows.map(([p, win]) => {
    const l = last(p); const ok = l && Date.now() - new Date(l.submittedAt).getTime() < win * 86400000;
    return <li key={p}><b>{p} report</b><span>{l ? 'Last: ' + ago(l.submittedAt) : 'Never submitted'}</span>{ok ? <Pill tone="green"><CheckCircle2 size={13} />Up to date</Pill> : <Link className="ws-btn sm" href={'/dashboard/periodic-reports?new=' + p}>Submit now</Link>}</li>;
  })}</ul>;
}

function ResearcherAccess() {
  const { data, user, hasLibraryAccess } = useWS();
  const pay = data.payments.filter(p => p.userId === user!.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  const access = hasLibraryAccess();
  if (access && pay?.expiresAt) return <div className="ws-banner ok"><CheckCircle2 /><div><b>Full library access active</b><p>Valid until {fmtDate(pay.expiresAt)}. You can read all documents and contribute research.</p></div><Link className="ws-btn sm" href="/dashboard/library">Open library</Link></div>;
  if (pay?.status === 'pending') return <div className="ws-banner warn"><Clock /><div><b>Payment under review</b><p>Receipt {pay.txnId} was submitted {ago(pay.createdAt)}. You will be notified once the Library Admin approves it.</p></div><Link className="ws-btn sm ghost" href="/dashboard/library/access">View status</Link></div>;
  return <div className="ws-banner"><Wallet /><div><b>{pay?.status === 'rejected' ? 'Payment rejected — please resubmit' : 'Unlock the full digital library'}</b><p>{pay?.status === 'rejected' ? pay.note : `Pay ${data.settings.libraryFee} ETB with Telebirr and upload your receipt. Public documents remain available meanwhile.`}</p></div><Link className="ws-btn sm" href="/dashboard/library/access">Pay & upload receipt</Link></div>;
}


function HearingReminder() {
  const { data, user, can } = useWS();
  const today = new Date().toISOString().slice(0, 10), tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  const { myCases: mine } = useWS(); void user; void can;
  const soon = data.hearings.filter(h => (h.date === today || h.date === tomorrow) && mine.some(c => c.id === h.caseId)).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  if (!soon.length) return null;
  return <div className="ws-banner"><CalendarDays /><div><b>{soon.length} hearing{soon.length > 1 ? 's' : ''} today or tomorrow</b><p>{soon.slice(0, 3).map(h => `${h.date === today ? 'Today' : 'Tomorrow'} ${h.time} · ${data.cases.find(c => c.id === h.caseId)?.title} · ${h.court}`).join('  |  ')}</p></div><Link className="ws-btn sm" href="/dashboard/calendar">Open calendar</Link></div>;
}
