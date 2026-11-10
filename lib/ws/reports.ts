import { PERMISSIONS, type Permission, type User, type WSData, type Case } from './types';
import { inScope, unitName, zoneOfWoreda } from './org';
import { evidenceStatus, holder, lastEntry } from './evidence';
import { ADJ_BY, ADJ_REASONS } from './types';
import { computeKpis, disposedAt, groupKpis, missedSla, outcome, typeName, type Kpis } from './kpi';

export type Table = { columns: string[]; rows: (string | number)[][]; summary?: [string, string | number][] };
/** perm: who may run it. anyOf: alternative permissions. */
export type ReportDef = { id: string; title: string; description: string; perm: Permission; anyOf?: Permission[]; scope: string; build: (d: WSData, me: User, from?: string, to?: string) => Table };

const DAY = 86400000;
const day = (iso?: string) => (iso ? new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');
const inRange = (iso: string, from?: string, to?: string) => (!from || iso.slice(0, 10) >= from) && (!to || iso.slice(0, 10) <= to);
const nm = (d: WSData, id?: string) => (id === 'system' ? 'System' : d.users.find(u => u.id === id)?.name || '—');
const roleOf = (d: WSData, id?: string) => d.roles.find(r => r.id === d.users.find(u => u.id === id)?.roleId)?.name || '—';
const daysOpen = (d: WSData, c: Case) => Math.round(((disposedAt(d, c) ? new Date(disposedAt(d, c)!).getTime() : Date.now()) - new Date(c.openedAt).getTime()) / DAY);

const KPI_COLS = ['Total', 'Open', 'Disposed', 'On time', 'Overdue – locked', 'Overdue – permitted', 'Closed late', 'Missed SLA', 'SLA compliance', 'Avg days to dispose'];
const kpiCells = (k: Kpis) => [k.total, k.open, k.disposed, k.disposedOnTime, k.overdueLocked, k.overduePermitted, k.closedLate, k.overdueAll, k.slaCompliance + '%', k.avgDaysToDispose];
const kpiSummary = (k: Kpis): [string, string | number][] => [['Cases', k.total], ['SLA compliance', k.slaCompliance + '%'], ['Missed SLA (incl. permitted)', k.overdueAll], ['On-time completion', k.onTimeRate + '%']];

function caseRegister(d: WSData, cases: Case[]): Table {
  const rows = cases.map(c => ({ c, o: outcome(d, c) })).sort((a, b) => Number(missedSla(b.o)) - Number(missedSla(a.o)) || a.c.dueAt.localeCompare(b.c.dueAt));
  return {
    columns: ['Case no.', 'Title', 'Case type', 'Subject', 'Prosecutor', 'Office', 'Opened', 'SLA due', 'Status', 'Days open', 'SLA outcome', 'Permission until'],
    rows: rows.map(({ c, o }) => [c.caseNo, c.title, typeName(d, c), c.subject, nm(d, c.prosecutorId), c.office, day(c.openedAt), day(c.dueAt), c.status, daysOpen(d, c), o, c.permitUntil ? day(c.permitUntil) : '']),
    summary: kpiSummary(computeKpis(d, cases)),
  };
}
function kpiByType(d: WSData, cases: Case[]): Table {
  return { columns: ['Case type', 'SLA (days)', ...KPI_COLS], rows: [...d.caseCategories.map(t => [t.name, t.slaDays, ...kpiCells(computeKpis(d, cases.filter(c => c.categoryId === t.id)))]), ['All case types', '', ...kpiCells(computeKpis(d, cases))]], summary: kpiSummary(computeKpis(d, cases)) };
}
function overdueReport(d: WSData, cases: Case[]): Table {
  const rows = cases.map(c => ({ c, o: outcome(d, c) })).filter(x => missedSla(x.o));
  return {
    columns: ['Case no.', 'Title', 'Case type', 'Prosecutor', 'Office', 'SLA due', 'Days over SLA', 'SLA outcome', 'Permission given by', 'Permission until', 'Reason'],
    rows: rows.map(({ c, o }) => { const p = d.extensions.filter(x => x.caseId === c.id).sort((a, b) => b.at.localeCompare(a.at))[0]; const end = disposedAt(d, c) ? new Date(disposedAt(d, c)!).getTime() : Date.now();
      return [c.caseNo, c.title, typeName(d, c), nm(d, c.prosecutorId), c.office, day(c.dueAt), Math.max(0, Math.round((end - new Date(c.dueAt).getTime()) / DAY)), o, p ? nm(d, p.by) : '', p ? day(p.newDue) : '', p?.reason || '']; }),
    summary: [['Missed SLA', rows.length], ['Locked', rows.filter(r => r.o === 'Overdue – locked').length], ['With permission', rows.filter(r => r.o === 'Overdue – permitted').length], ['Closed late', rows.filter(r => r.o === 'Closed late').length]],
  };
}
function reportSubmissions(d: WSData, ids: Set<string> | null, from?: string, to?: string): Table {
  const rs = d.preports.filter(r => (!ids || ids.has(r.prosecutorId)) && inRange(r.submittedAt, from, to));
  return { columns: ['Prosecutor', 'Office', 'Period', 'Covering', 'Submitted', 'New cases', 'Closed', 'Hearings', 'Status', 'Feedback'], rows: rs.map(r => [nm(d, r.prosecutorId), d.users.find(u => u.id === r.prosecutorId)?.office || '', r.period, r.periodLabel, day(r.submittedAt), r.newCases, r.closedCases, r.hearings, r.status, d.feedback.filter(f => f.reportId === r.id).map(f => f.body).join(' | ')]), summary: [['Reports', rs.length], ['Awaiting feedback', rs.filter(r => r.status === 'Submitted').length]] };
}
const opened = (cases: Case[], from?: string, to?: string) => cases.filter(c => inRange(c.openedAt, from, to));
const officeCases = (d: WSData, me: User) => d.cases.filter(c => inScope(me.scope, c.woredaId));
const zoneName = (c: Case) => unitName(zoneOfWoreda(c.woredaId)?.id);

export const REPORTS: ReportDef[] = [
  /* ---------- Cases & SLA (Woreda Coordinator, Auditor, Super Admin) ---------- */
  { id: 'case-management', title: 'Case management report', scope: 'Cases & SLA', perm: 'reports.cases', description: 'Every case with type, subject, prosecutor, SLA due date, status and SLA outcome (permitted overdue cases stay overdue).', build: (d, _m, f, t) => caseRegister(d, opened(d.cases, f, t)) },
  { id: 'kpi-by-type', title: 'KPI summary by case type', scope: 'Cases & SLA', perm: 'reports.cases', description: 'Ordinary, Appellate and Cassation cases: totals, overdue, closed late, SLA compliance and average days.', build: (d, _m, f, t) => kpiByType(d, opened(d.cases, f, t)) },
  { id: 'kpi-by-prosecutor', title: 'KPI by prosecutor', scope: 'Cases & SLA', perm: 'reports.cases', description: 'Caseload and SLA performance of each prosecutor.', build: (d, _m, f, t) => ({ columns: ['Prosecutor', 'Office', ...KPI_COLS], rows: groupKpis(d, opened(d.cases, f, t), c => c.prosecutorId).map(g => [nm(d, g.name), d.users.find(u => u.id === g.name)?.office || '', ...kpiCells(g.k)]) }) },
  { id: 'kpi-by-office', title: 'KPI by woreda office', scope: 'Cases & SLA', perm: 'reports.cases', description: 'Caseload and SLA performance of each woreda office.', build: (d, _m, f, t) => ({ columns: ['Office', ...KPI_COLS], rows: groupKpis(d, opened(d.cases, f, t), c => c.office).map(g => [g.name, ...kpiCells(g.k)]) }) },
  { id: 'kpi-by-zone', title: 'KPI by zone', scope: 'Cases & SLA', perm: 'reports.cases', description: 'Caseload and SLA performance of each zone in your scope against the SLA-compliance target set by the region.', build: (d, _m, f, t) => ({ columns: ['Zone', ...KPI_COLS, 'Target', 'Meets target'], rows: groupKpis(d, opened(d.cases, f, t), zoneName).map(g => [g.name, ...kpiCells(g.k), d.settings.kpiTargets.slaCompliance + '%', g.k.slaCompliance >= d.settings.kpiTargets.slaCompliance ? 'Yes' : 'No']) }) },
  { id: 'kpi-vs-targets', title: 'KPI vs region targets by woreda', scope: 'Cases & SLA', perm: 'reports.cases', description: 'Every woreda in your scope compared with the KPI targets (SLA compliance, on-time completion, clearance) set by the region.', build: (d, _m, f, t) => { const T = d.settings.kpiTargets; const ok = (v: number, target: number) => (v >= target ? 'Met' : 'Below'); return { columns: ['Zone', 'Woreda', 'Cases', 'SLA compliance', `Target ${T.slaCompliance}%`, 'On-time rate', `Target ${T.onTimeRate}%`, 'Clearance rate', `Target ${T.clearanceRate}%`], rows: groupKpis(d, opened(d.cases, f, t), c => c.woredaId).map(g => { const w = d.cases.find(c => c.woredaId === g.name)!; return [zoneName(w), w.office, g.k.total, g.k.slaCompliance + '%', ok(g.k.slaCompliance, T.slaCompliance), g.k.onTimeRate + '%', ok(g.k.onTimeRate, T.onTimeRate), g.k.clearanceRate + '%', ok(g.k.clearanceRate, T.clearanceRate)]; }) }; } },
  { id: 'adjournments', title: 'Court adjournments', scope: 'Cases & SLA', perm: 'reports.cases', anyOf: ['reports.office'], description: 'Every adjourned hearing in your scope with the reason and who asked for the delay.', build: (d, _m, f, t) => {
      const hs = d.hearings.filter(h => h.adjournReason && inRange(h.date, f, t)).sort((a, b) => b.date.localeCompare(a.date));
      const cs = (id: string) => d.cases.find(c => c.id === id);
      return { columns: ['Hearing date', 'Case no.', 'Case', 'Woreda', 'Court', 'Purpose', 'Reason', 'Asked by', 'Next date', 'Prosecutor'], rows: hs.map(h => { const c = cs(h.caseId)!; return [day(h.date + 'T12:00'), c.caseNo, c.title, c.office, h.court, h.purpose, h.adjournReason!, h.adjournedBy || '—', h.nextDate ? day(h.nextDate + 'T12:00') : '—', nm(d, c.prosecutorId)]; }),
        summary: [['Adjournments', hs.length], ['Cases affected', new Set(hs.map(h => h.caseId)).size], ['Asked by the court', hs.filter(h => h.adjournedBy === 'Court').length]] };
    } },
  { id: 'adjournment-summary', title: 'Adjournments by reason and party', scope: 'Cases & SLA', perm: 'reports.cases', anyOf: ['reports.office'], description: 'Why hearings are delayed and who asks for it - shows whether delays come from the courts, the prosecution or the defence.', build: (d, _m, f, t) => {
      const hs = d.hearings.filter(h => h.adjournReason && inRange(h.date, f, t));
      return { columns: ['Reason', ...ADJ_BY, 'Total', 'Share'], rows: ADJ_REASONS.map(r => { const x = hs.filter(h => h.adjournReason === r); return [r, ...ADJ_BY.map(b => x.filter(h => h.adjournedBy === b).length), x.length, hs.length ? Math.round((x.length / hs.length) * 100) + '%' : '0%']; }).filter(r => Number(r[ADJ_BY.length + 1]) > 0), summary: [['Adjournments', hs.length]] };
    } },
  { id: 'evidence-register', title: 'Evidence register & custody', scope: 'Cases & SLA', perm: 'reports.cases', anyOf: ['reports.office'], description: 'Every evidence item in your scope, where it is now and the last custody step.', build: d => ({
      columns: ['Item no.', 'Case no.', 'Woreda', 'Kind', 'Description', 'Status', 'Held by', 'Custody steps', 'Last action', 'Last update'],
      rows: d.evidence.map(e => { const c = d.cases.find(z => z.id === e.caseId)!; const l = lastEntry(e); return [e.itemNo, c.caseNo, c.office, e.kind, e.description, evidenceStatus(e), holder(e), e.custody.length, l.action, day(l.at)]; }),
      summary: [['Items', d.evidence.length], ['At laboratory', d.evidence.filter(e => evidenceStatus(e) === 'At laboratory').length], ['In court', d.evidence.filter(e => evidenceStatus(e) === 'In court').length]] }) },
  { id: 'overdue-permissions', title: 'Overdue cases & permissions', scope: 'Cases & SLA', perm: 'reports.cases', description: 'All cases that missed their SLA, whether locked, permitted by the Woreda Coordinator, or closed late.', build: (d, _m, f, t) => overdueReport(d, opened(d.cases, f, t)) },
  { id: 'sla-settings', title: 'SLA by case type', scope: 'Cases & SLA', perm: 'reports.cases', description: 'SLA days per case type and when they were last changed.', build: d => ({ columns: ['Case type', 'SLA (days)', 'Open cases', 'Changed', 'Changed by'], rows: d.caseCategories.map(t => [t.name, t.slaDays, d.cases.filter(c => c.categoryId === t.id && !['Closed', 'Judgment delivered'].includes(c.status)).length, day(t.updatedAt), nm(d, t.updatedBy)]) }) },
  { id: 'hearings', title: 'Hearings schedule', scope: 'Cases & SLA', perm: 'reports.cases', description: 'Court hearings held and scheduled, with outcomes.', build: (d, _m, f, t) => { const hs = d.hearings.filter(h => inRange(h.date, f, t)).sort((a, b) => a.date.localeCompare(b.date)); return { columns: ['Date', 'Time', 'Case no.', 'Case', 'Prosecutor', 'Court', 'Purpose', 'Outcome'], rows: hs.map(h => { const c = d.cases.find(x => x.id === h.caseId); return [day(h.date + 'T12:00'), h.time, c?.caseNo || '', c?.title || '', nm(d, c?.prosecutorId), h.court, h.purpose, h.outcome || (h.date >= new Date().toISOString().slice(0, 10) ? 'Scheduled' : '')]; }), summary: [['Hearings', hs.length]] }; } },
  { id: 'case-documents', title: 'Case documents register', scope: 'Cases & SLA', perm: 'reports.cases', description: 'Documents uploaded to each case with latest version.', build: d => ({ columns: ['Case no.', 'Document', 'Type', 'Versions', 'Last upload', 'By'], rows: d.caseDocs.map(x => { const v = x.versions[x.versions.length - 1]; return [d.cases.find(c => c.id === x.caseId)?.caseNo || '', x.title, x.docType, x.versions.length, day(v.at), nm(d, v.by)]; }) }) },
  { id: 'report-submissions', title: 'Prosecutor report submissions', scope: 'Cases & SLA', perm: 'reports.cases', anyOf: ['preports.review'], description: 'Daily, weekly and monthly reports with Woreda Coordinator feedback.', build: (d, _m, f, t) => reportSubmissions(d, null, f, t) },
  { id: 'comments', title: 'Coordinator, zone and region comments', scope: 'Cases & SLA', perm: 'reports.cases', description: 'All comments written on cases.', build: (d, _m, f, t) => ({ columns: ['Date', 'Case no.', 'By', 'Role', 'Comment'], rows: d.comments.filter(c => inRange(c.at, f, t)).sort((a, b) => b.at.localeCompare(a.at)).map(c => [day(c.at), d.cases.find(x => x.id === c.caseId)?.caseNo || '', nm(d, c.by), roleOf(d, c.by), c.body]) }) },

  /* ---------- Woreda office (Woreda Woreda Coordinator, Records Clerk) ---------- */
  { id: 'office-register', title: 'Woreda case register', scope: 'Woreda office', perm: 'reports.office', description: 'All cases of your woreda office with SLA outcome.', build: (d, me, f, t) => caseRegister(d, opened(officeCases(d, me), f, t)) },
  { id: 'office-kpi', title: 'Woreda KPI by case type', scope: 'Woreda office', perm: 'reports.office', description: 'KPIs for your office by case type.', build: (d, me, f, t) => kpiByType(d, opened(officeCases(d, me), f, t)) },
  { id: 'office-overdue', title: 'Woreda overdue cases', scope: 'Woreda office', perm: 'reports.office', description: 'Overdue cases of your office, including permitted and closed late.', build: (d, me, f, t) => overdueReport(d, opened(officeCases(d, me), f, t)) },
  { id: 'office-reports', title: 'Woreda prosecutor reports', scope: 'Woreda office', perm: 'reports.office', description: 'Reports submitted by prosecutors of your office.', build: (d, me, f, t) => reportSubmissions(d, new Set(d.users.filter(u => u.scope?.level === 'woreda' && inScope(me.scope, u.scope.id)).map(u => u.id)), f, t) },

  /* ---------- Library (Library Head) ---------- */
  { id: 'lib-docs', title: 'Library documents & usage', scope: 'Library', perm: 'reports.library', description: 'Published documents with views and downloads.', build: (d, _m, f, t) => { const docs = d.docs.filter(x => x.status === 'published' && inRange(x.createdAt, f, t)); return { columns: ['Title', 'Folder', 'Type', 'Visibility', 'Source', 'Published', 'Views', 'Downloads'], rows: docs.sort((a, b) => b.views - a.views).map(x => [x.title, d.categories.find(c => c.id === x.categoryId)?.name || '—', x.type.toUpperCase(), x.visibility === 'public' ? 'Public' : 'Researchers', x.source === 'admin' ? 'Library' : 'Researcher', day(x.publishedAt), x.views, x.downloads]), summary: [['Documents', docs.length], ['Views', docs.reduce((s, x) => s + x.views, 0)], ['Downloads', docs.reduce((s, x) => s + x.downloads, 0)]] }; } },
  { id: 'lib-folders', title: 'Documents by folder', scope: 'Library', perm: 'reports.library', description: 'Number of documents, views and downloads per folder.', build: d => ({ columns: ['Folder', 'Documents', 'Public', 'Researchers only', 'Views', 'Downloads'], rows: d.categories.map(c => { const ds = d.docs.filter(x => x.status === 'published' && x.categoryId === c.id); return [c.name, ds.length, ds.filter(x => x.visibility === 'public').length, ds.filter(x => x.visibility === 'researchers').length, ds.reduce((s, x) => s + x.views, 0), ds.reduce((s, x) => s + x.downloads, 0)]; }) }) },
  { id: 'lib-payments', title: 'Researcher payments (Telebirr)', scope: 'Library', perm: 'reports.library', anyOf: ['reports.finance'], description: 'Receipts submitted, approved and rejected.', build: (d, _m, f, t) => { const ps = d.payments.filter(p => inRange(p.createdAt, f, t)); const ok = ps.filter(p => p.status === 'approved'); return { columns: ['Researcher', 'Institution', 'Transaction ID', 'Amount (ETB)', 'Submitted', 'Status', 'Reviewed by', 'Access until'], rows: ps.map(p => { const u = d.users.find(x => x.id === p.userId); return [u?.name || '—', u?.institution || '—', p.txnId, p.amount, day(p.createdAt), p.status, nm(d, p.reviewedBy), day(p.expiresAt)]; }), summary: [['Receipts', ps.length], ['Approved', ok.length], ['Pending', ps.filter(p => p.status === 'pending').length], ['Revenue (ETB)', ok.reduce((s, p) => s + p.amount, 0)]] }; } },
  { id: 'lib-researchers', title: 'Researcher accounts', scope: 'Library', perm: 'reports.library', description: 'Registered researchers, access status and contributions.', build: d => ({ columns: ['Researcher', 'Institution', 'Registered', 'Access', 'Access until', 'Contributions', 'Published'], rows: d.users.filter(u => u.roleId === 'researcher').map(u => { const p = d.payments.filter(x => x.userId === u.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]; const ds = d.docs.filter(x => x.uploadedBy === u.id); return [u.name, u.institution || '—', day(u.createdAt), p ? p.status : 'not paid', day(p?.expiresAt), ds.length, ds.filter(x => x.status === 'published').length]; }) }) },
  { id: 'lib-contrib', title: 'Researcher contributions', scope: 'Library', perm: 'reports.library', description: 'Contributions by status, reviewer and comments.', build: (d, _m, f, t) => ({ columns: ['Title', 'Researcher', 'Submitted', 'Version', 'Status', 'Reviewed by', 'Comments'], rows: d.docs.filter(x => x.source === 'researcher' && inRange(x.createdAt, f, t)).map(x => [x.title, nm(d, x.uploadedBy), day(x.createdAt), x.version || 1, x.status.replace('_', ' '), nm(d, x.reviewedBy), d.reviewComments.filter(c => c.docId === x.id).length]) }) },

  /* ---------- Finance (Finance Officer) ---------- */
  { id: 'fin-revenue', title: 'Library fee revenue by month', scope: 'Finance', perm: 'reports.finance', description: 'Approved Telebirr payments and revenue per month.', build: d => { const m = new Map<string, { n: number; s: number; pend: number; rej: number }>(); d.payments.forEach(p => { const k = p.createdAt.slice(0, 7); const v = m.get(k) || { n: 0, s: 0, pend: 0, rej: 0 }; if (p.status === 'approved') { v.n++; v.s += p.amount; } else if (p.status === 'pending') v.pend++; else v.rej++; m.set(k, v); }); const rows = Array.from(m.entries()).sort().map(([k, v]) => [new Date(k + '-01').toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }), v.n, v.s, v.pend, v.rej]); return { columns: ['Month', 'Approved payments', 'Revenue (ETB)', 'Pending', 'Rejected'], rows, summary: [['Total revenue (ETB)', d.payments.filter(p => p.status === 'approved').reduce((s, p) => s + p.amount, 0)]] }; } },

  /* ---------- Citizen services (Legal Aid Officer, Complaint Officer, Content Editor) ---------- */
  { id: 'cs-appointments', title: 'Legal aid appointments', scope: 'Citizen services', perm: 'reports.citizen', description: 'All bookings with office, issue and status.', build: (d, _m, f, t) => { const as = d.appointments.filter(a => inRange(a.date, f, t)); return { columns: ['Code', 'Citizen', 'Phone', 'Office', 'Date', 'Time', 'Issue', 'Status'], rows: as.sort((a, b) => a.date.localeCompare(b.date)).map(a => [a.code, a.name, a.phone, a.office, day(a.date + 'T12:00'), a.time, a.issue, a.status]), summary: [['Bookings', as.length], ['Completed', as.filter(a => a.status === 'completed').length], ['Cancelled', as.filter(a => a.status === 'cancelled').length]] }; } },
  { id: 'cs-legal-aid-summary', title: 'Legal aid by office and issue', scope: 'Citizen services', perm: 'reports.citizen', description: 'How many people each office helped, by type of issue.', build: d => { const issues = Array.from(new Set(d.appointments.map(a => a.issue))); const offices = Array.from(new Set(d.appointments.map(a => a.office))); return { columns: ['Office', ...issues, 'Total'], rows: offices.map(o => [o, ...issues.map(i => d.appointments.filter(a => a.office === o && a.issue === i && a.status !== 'cancelled').length), d.appointments.filter(a => a.office === o && a.status !== 'cancelled').length]) }; } },
  { id: 'cs-ratings', title: 'Citizen service ratings', scope: 'Citizen services', perm: 'reports.citizen', anyOf: ['events.manage'], description: 'Average rating per service and office.', build: (d, _m, f, t) => { const rs = d.ratings.filter(r => inRange(r.at, f, t)); const keys = Array.from(new Set(rs.map(r => r.service + '|' + r.office))); return { columns: ['Service', 'Office', 'Ratings', 'Average stars', '5★', '1–2★'], rows: keys.map(k => { const [s, o] = k.split('|'); const x = rs.filter(r => r.service === s && r.office === o); return [s, o, x.length, (x.reduce((a, r) => a + r.stars, 0) / x.length).toFixed(1), x.filter(r => r.stars === 5).length, x.filter(r => r.stars <= 2).length]; }), summary: [['Ratings', rs.length], ['Average', rs.length ? (rs.reduce((a, r) => a + r.stars, 0) / rs.length).toFixed(1) : '–']] }; } },
  { id: 'cs-events', title: 'Public events', scope: 'Citizen services', perm: 'reports.citizen', anyOf: ['events.manage'], description: 'Legal awareness events, dialogues, trainings and public hearings.', build: (d, _m, f, t) => ({ columns: ['Date', 'Time', 'Event', 'Type', 'Place', 'Office'], rows: d.events.filter(e => inRange(e.date, f, t)).sort((a, b) => a.date.localeCompare(b.date)).map(e => [day(e.date + 'T12:00'), e.time, e.title, e.type, e.place, e.office]) }) },

  /* ---------- System (Super Admin, Woreda Coordinator, Auditor) ---------- */
  { id: 'users-by-role', title: 'Users by role', scope: 'System', perm: 'reports.system', description: 'Active and inactive accounts per role.', build: d => ({ columns: ['Role', 'Total users', 'Active', 'Inactive'], rows: d.roles.map(r => { const us = d.users.filter(u => u.roleId === r.id); return [r.name, us.length, us.filter(u => u.status === 'active').length, us.filter(u => u.status !== 'active').length]; }), summary: [['Total accounts', d.users.length], ['Roles', d.roles.length]] }) },
  { id: 'user-directory', title: 'User directory & last sign-in', scope: 'System', perm: 'reports.system', description: 'All accounts with role, office, status and last sign-in.', build: (d, _m, f, t) => ({ columns: ['Name', 'Email', 'Role', 'Office', 'Status', 'Created', 'Last sign-in'], rows: d.users.filter(u => inRange(u.createdAt, f, t)).map(u => [u.name, u.email, d.roles.find(r => r.id === u.roleId)?.name || '—', u.office, u.status, day(u.createdAt), day(u.lastLogin)]) }) },
  { id: 'roles-matrix', title: 'Roles & permissions', scope: 'System', perm: 'reports.system', description: 'Which role can do what.', build: d => ({ columns: ['Permission', ...d.roles.map(r => r.name)], rows: PERMISSIONS.map(p => [p.label, ...d.roles.map(r => (r.permissions.includes(p.key) ? 'Yes' : ''))]) }) },
  { id: 'failed-logins', title: 'Failed sign-in attempts', scope: 'System', perm: 'reports.system', description: 'Security report of failed sign-ins.', build: (d, _m, f, t) => ({ columns: ['Date & time', 'Attempt'], rows: d.audit.filter(a => a.action.startsWith('Failed sign-in') && inRange(a.at, f, t)).map(a => [new Date(a.at).toLocaleString('en-GB'), a.action.replace('Failed sign-in attempt for ', '')]) }) },
  { id: 'audit', title: 'Audit log', scope: 'System', perm: 'audit.view', description: 'Every recorded action with user and time.', build: (d, _m, f, t) => ({ columns: ['Date & time', 'User', 'Role', 'Action'], rows: d.audit.filter(a => inRange(a.at, f, t)).map(a => [new Date(a.at).toLocaleString('en-GB'), nm(d, a.by), roleOf(d, a.by), a.action]) }) },

  /* ---------- My activity (every user) ---------- */
  { id: 'my-cases', title: 'My cases', scope: 'My activity', perm: 'cases.viewOwn', description: 'Cases assigned to me with SLA outcome.', build: (d, me, f, t) => caseRegister(d, opened(d.cases.filter(c => c.prosecutorId === me.id), f, t)) },
  { id: 'my-kpi', title: 'My KPI', scope: 'My activity', perm: 'cases.viewOwn', description: 'My SLA performance by case type.', build: (d, me, f, t) => kpiByType(d, opened(d.cases.filter(c => c.prosecutorId === me.id), f, t)) },
  { id: 'my-hearings', title: 'My hearings', scope: 'My activity', perm: 'cases.viewOwn', description: 'Hearings of my cases.', build: (d, me) => ({ columns: ['Date', 'Time', 'Case no.', 'Court', 'Purpose', 'Outcome'], rows: d.hearings.filter(h => d.cases.find(c => c.id === h.caseId)?.prosecutorId === me.id).sort((a, b) => a.date.localeCompare(b.date)).map(h => [day(h.date + 'T12:00'), h.time, d.cases.find(c => c.id === h.caseId)?.caseNo || '', h.court, h.purpose, h.outcome || '']) }) },
  { id: 'my-reports', title: 'My submitted reports & feedback', scope: 'My activity', perm: 'preports.submit', description: 'My daily, weekly and monthly reports with Woreda Coordinator feedback.', build: (d, me, f, t) => reportSubmissions(d, new Set([me.id]), f, t) },
  { id: 'my-contrib', title: 'My contributions & library access', scope: 'My activity', perm: 'library.contribute', description: 'My submitted documents and payment history.', build: (d, me) => ({ columns: ['Item', 'Detail', 'Date', 'Status'], rows: [...d.payments.filter(p => p.userId === me.id).map(p => ['Payment', `${p.amount} ETB · ${p.txnId}`, day(p.createdAt), p.status]), ...d.docs.filter(x => x.uploadedBy === me.id).map(x => ['Contribution', x.title, day(x.createdAt), x.status.replace('_', ' ')])] }) },
  { id: 'my-appointments', title: 'Appointments I handled', scope: 'My activity', perm: 'appointments.manage', description: 'Appointment changes I made.', build: (d, me, f, t) => ({ columns: ['Date & time', 'Action'], rows: d.audit.filter(a => a.by === me.id && a.action.includes('appointment') && inRange(a.at, f, t)).map(a => [new Date(a.at).toLocaleString('en-GB'), a.action]) }) },
  { id: 'my-activity', title: 'My activity log', scope: 'My activity', perm: 'reports.own', description: 'Actions I performed in the system.', build: (d, me, f, t) => ({ columns: ['Date & time', 'Action'], rows: d.audit.filter(a => a.by === me.id && inRange(a.at, f, t)).map(a => [new Date(a.at).toLocaleString('en-GB'), a.action]) }) },
];

/** Reports a role may run. */
export function reportsFor(can: (p: Permission) => boolean) { return REPORTS.filter(r => can(r.perm) || (r.anyOf || []).some(can)); }

export function exportCSV(name: string, t: Table) {
  const esc = (v: string | number) => { const s = String(v ?? ''); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
  const csv = '﻿' + [t.columns, ...t.rows].map(r => r.map(esc).join(',')).join('\r\n');
  download(name + '.csv', new Blob([csv], { type: 'text/csv;charset=utf-8' }));
}

export async function exportPDF(name: string, title: string, t: Table, meta: { by: string; role: string; range?: string; org: string }) {
  const { jsPDF } = await import('jspdf');
  const autoTable = (await import('jspdf-autotable')).default;
  const doc = new jsPDF({ orientation: t.columns.length > 5 ? 'landscape' : 'portrait', unit: 'pt', format: 'a4' });
  const w = doc.internal.pageSize.getWidth();
  doc.setFillColor(31, 86, 70); doc.rect(0, 0, w, 64, 'F');
  doc.setTextColor(255, 255, 255); doc.setFontSize(15); doc.text(meta.org, 36, 30);
  doc.setFontSize(10); doc.text('Justice Portal · Role-based report', 36, 48);
  doc.setTextColor(20, 20, 20); doc.setFontSize(16); doc.text(title, 36, 96);
  doc.setFontSize(9); doc.setTextColor(90, 90, 90);
  doc.text(`Generated ${new Date().toLocaleString('en-GB')} by ${meta.by} (${meta.role})${meta.range ? ' · Period: ' + meta.range : ''}`, 36, 114);
  let y = 128;
  if (t.summary?.length) { doc.setTextColor(20, 20, 20); doc.text(t.summary.map(([k, v]) => `${k}: ${v}`).join('    '), 36, y); y += 14; }
  autoTable(doc, {
    startY: y, head: [t.columns], body: t.rows.map(r => r.map(String)), styles: { fontSize: 8, cellPadding: 4 },
    headStyles: { fillColor: [31, 86, 70], textColor: 255 }, alternateRowStyles: { fillColor: [244, 242, 239] }, margin: { left: 36, right: 36 },
    didDrawPage: () => { doc.setFontSize(8); doc.setTextColor(120); doc.text(`Page ${doc.getNumberOfPages()}`, w - 70, doc.internal.pageSize.getHeight() - 18); },
  });
  doc.save(name + '.pdf');
}

function download(name: string, blob: Blob) {
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
