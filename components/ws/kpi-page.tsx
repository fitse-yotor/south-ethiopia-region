'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, FileDown, FileSpreadsheet, Info, Printer } from 'lucide-react';
import { toast } from 'sonner';
import { useWS } from '@/lib/ws/store';
import { scopeLabel, unitName, zoneOfWoreda } from '@/lib/ws/org';
import { ADJ_REASONS } from '@/lib/ws/types';
import { computeKpis, disposedAt, groupKpis, missedSla, outcome, typeName, type Kpis, type SlaOutcome } from '@/lib/ws/kpi';
import { exportCSV, exportPDF, type Table } from '@/lib/ws/reports';
import { PageHead, Panel, Pill, Sel, fmtDate } from './ui';
import { ChartCard, lastMonths, SLOT, STATUS_CRITICAL } from './charts';

const DAY = 86400000;
const PERIODS: [string, string][] = [['all', 'All time'], ['30', 'Last 30 days'], ['90', 'Last 3 months'], ['year', 'This year']];
const TONE: Record<SlaOutcome, 'green' | 'gold' | 'red' | 'grey' | 'blue'> = { 'On track': 'green', 'Due soon': 'gold', 'Overdue – locked': 'red', 'Overdue – permitted': 'red', 'Closed on time': 'grey', 'Closed late': 'red' };

const kpiRow = (name: string, k: Kpis) => [name, k.total, k.open, k.disposed, k.disposedOnTime, k.overdueLocked, k.overduePermitted, k.closedLate, k.overdueAll, k.slaCompliance + '%', k.onTimeRate + '%', k.avgDaysToDispose];
const KPI_COLS = ['Group', 'Total', 'Open', 'Disposed', 'On time', 'Overdue – locked', 'Overdue – permitted', 'Closed late', 'Missed SLA (total)', 'SLA compliance', 'On-time rate', 'Avg days to dispose'];

export function KpiPage() {
  const { data, can, user, role, userName, myCases } = useWS();
  const scopeText = can('cases.viewAll') || can('cases.viewOffice') ? scopeLabel(user!.scope) : 'my cases';
  const T = data.settings.kpiTargets;
  const [period, setPeriod] = useState('all'), [type, setType] = useState('all'), [office, setOffice] = useState('all'), [pros, setPros] = useState('all');
  const since = period === 'all' ? 0 : period === 'year' ? new Date(new Date().getFullYear(), 0, 1).getTime() : Date.now() - Number(period) * DAY;
  const cases = useMemo(() => myCases.filter(c => new Date(c.openedAt).getTime() >= since && (type === 'all' || c.categoryId === type) && (office === 'all' || c.office === office) && (pros === 'all' || c.prosecutorId === pros)), [myCases, since, type, office, pros]);
  const k = computeKpis(data, cases);
  const byType = data.caseCategories.map(t => ({ name: t.name, sla: t.slaDays, k: computeKpis(data, cases.filter(c => c.categoryId === t.id)) }));
  const byPros = groupKpis(data, cases, c => userName(c.prosecutorId));
  const byOffice = groupKpis(data, cases, c => c.office);
  const byZone = groupKpis(data, cases, c => unitName(zoneOfWoreda(c.woredaId)?.id));
  const offices = Array.from(new Set(myCases.map(c => c.office))).sort();
  const caseIds = new Set(cases.map(c => c.id));
  const adjourned = data.hearings.filter(h => h.adjournReason && caseIds.has(h.caseId));
  const adjByReason = ADJ_REASONS.map(r => ({ name: r.replace('Judge absent / court not sitting', 'Judge absent').replace('Evidence or reports not ready', 'Evidence not ready'), count: adjourned.filter(h => h.adjournReason === r).length })).filter(x => x.count > 0);
  const months = lastMonths(6);
  const trend = months.map(m => ({ name: m.label, opened: cases.filter(c => c.openedAt.startsWith(m.key)).length, disposed: cases.filter(c => disposedAt(data, c)?.startsWith(m.key)).length, missed: cases.filter(c => missedSla(outcome(data, c)) && (disposedAt(data, c) || c.dueAt).startsWith(m.key)).length }));
  const register = cases.map(c => ({ c, o: outcome(data, c) })).sort((a, b) => Number(missedSla(b.o)) - Number(missedSla(a.o)) || a.c.dueAt.localeCompare(b.c.dueAt));
  const prosecutors = Array.from(new Set(myCases.map(c => c.prosecutorId)));
  const filterText = [PERIODS.find(p => p[0] === period)?.[1], type !== 'all' ? data.caseCategories.find(t => t.id === type)?.name : 'all case types', office !== 'all' ? office : scopeText, pros !== 'all' ? userName(pros) : ''].filter(Boolean).join(' · ');

  const summaryTable: Table = { columns: KPI_COLS, rows: [...byType.map(t => kpiRow(`${t.name} (SLA ${t.sla} d)`, t.k)), kpiRow('All case types', k)], summary: [['Cases', k.total], ['SLA compliance', k.slaCompliance + '%'], ['Missed SLA', k.overdueAll], ['Permissions given', k.permissions]] };
  const registerTable: Table = {
    columns: ['Case no.', 'Title', 'Case type', 'Subject', 'Prosecutor', 'Office', 'Opened', 'SLA due', 'Status', 'Days open', 'SLA outcome', 'Permission until'],
    rows: register.map(({ c, o }) => [c.caseNo, c.title, typeName(data, c), c.subject, userName(c.prosecutorId), c.office, fmtDate(c.openedAt), fmtDate(c.dueAt), c.status, Math.round(((disposedAt(data, c) ? new Date(disposedAt(data, c)!).getTime() : Date.now()) - new Date(c.openedAt).getTime()) / DAY), o, c.permitUntil ? fmtDate(c.permitUntil) : '']),
    summary: [['Cases', register.length], ['Missed SLA', register.filter(r => missedSla(r.o)).length]],
  };
  const meta = { by: user!.name, role: role?.name || '', org: data.settings.orgName, range: filterText };
  const stamp = new Date().toISOString().slice(0, 10);

  return <div className="kpi-page">
    <PageHead eyebrow="PROSECUTION" title="KPI & case management report" actions={<div className="ws-head-actions sp-noprint">
      <button className="ws-btn ghost" onClick={() => window.print()}><Printer size={16} />Print</button>
      <button className="ws-btn ghost" onClick={() => { exportCSV(`kpi-summary-${stamp}`, summaryTable); exportCSV(`case-register-${stamp}`, registerTable); toast.success('CSV files downloaded'); }}><FileSpreadsheet size={16} />CSV</button>
      <button className="ws-btn" onClick={async () => { await exportPDF(`kpi-summary-${stamp}`, 'KPI summary by case type', summaryTable, meta); await exportPDF(`case-management-report-${stamp}`, 'Case management report', registerTable, meta); toast.success('PDF reports downloaded'); }}><FileDown size={16} />PDF</button>
    </div>}>Key performance indicators and the full case register for {scopeText}. Targets are set by the region. Filters apply to cases opened in the selected period.</PageHead>

    <div className="ws-filters sp-noprint">
      <Sel aria-label="Period" value={period} onChange={setPeriod} options={PERIODS} />
      <Sel aria-label="Case type" value={type} onChange={setType} options={[['all', 'All case types'], ...data.caseCategories.map(t => [t.id, t.name] as [string, string])]} />
      {offices.length > 1 && <Sel aria-label="Woreda" value={office} onChange={setOffice} options={[['all', 'All woredas'], ...offices.map(o => [o, o] as [string, string])]} />}
      {prosecutors.length > 1 && <Sel aria-label="Prosecutor" value={pros} onChange={setPros} options={[['all', 'All prosecutors'], ...prosecutors.map(p => [p, userName(p)] as [string, string])]} />}
    </div>

    <div className="kpi-tiles">
      <Tile label="Total cases" value={k.total} sub={`${k.open} open · ${k.disposed} disposed`} />
      <Tile label="SLA compliance" value={k.slaCompliance + '%'} sub={`target ${T.slaCompliance}% · ${k.slaCompliance >= T.slaCompliance ? 'target met' : 'below target'}`} tone={k.slaCompliance >= T.slaCompliance ? 'teal' : 'red'} />
      <Tile label="Missed SLA (overdue)" value={k.overdueAll} sub={`${k.overdueLocked} locked · ${k.overduePermitted} with permission · ${k.closedLate} closed late`} tone="red" />
      <Tile label="On-time completion" value={k.onTimeRate + '%'} sub={`target ${T.onTimeRate}% · ${k.disposedOnTime} of ${k.disposed} on time`} tone={k.onTimeRate >= T.onTimeRate ? 'teal' : 'red'} />
      <Tile label="Due soon" value={k.dueSoon} sub={`within ${data.settings.dueSoonDays} days`} tone="gold" />
      <Tile label="Clearance rate" value={k.clearanceRate + '%'} sub={`target ${T.clearanceRate}% · disposed ÷ registered`} tone={k.clearanceRate >= T.clearanceRate ? 'teal' : 'red'} />
      <Tile label="Avg. days to dispose" value={k.avgDaysToDispose} sub={`open cases avg. age ${k.avgOpenAge} days`} />
      <Tile label="Court adjournments" value={adjourned.length} sub={`${new Set(adjourned.map(h => h.caseId)).size} cases · ${adjourned.length ? Math.round((adjourned.filter(h => h.adjournedBy === 'Court').length / adjourned.length) * 100) : 0}% asked by the court`} tone="gold" />
      <Tile label="Permissions given" value={k.permissions} sub="by Woreda Coordinators on overdue cases" tone="ink" />
    </div>

    <div className="ws-banner warn kpi-note"><Info /><div><b>How overdue is counted</b><p>When a case passes its SLA due date it is locked. If the prosecutor comes to the office and the Woreda Coordinator gives permission, the prosecutor can update the case and file reports – but the case <b>stays counted as overdue</b> (“Overdue – permitted”, or “Closed late” when finished).</p></div></div>

    <Panel title="KPIs by case type">
      <div className="ws-table-wrap"><table className="ws-table compact kpi-table"><thead><tr><th>Case type</th><th>SLA</th><th>Total</th><th>Open</th><th>Disposed</th><th>On time</th><th>Overdue – locked</th><th>Overdue – permitted</th><th>Closed late</th><th>SLA compliance</th><th>Avg days</th></tr></thead>
        <tbody>{byType.map(t => <tr key={t.name}><td><b>{t.name}</b></td><td>{t.sla} d</td><td>{t.k.total}</td><td>{t.k.open}</td><td>{t.k.disposed}</td><td>{t.k.disposedOnTime}</td><td>{t.k.overdueLocked || '–'}</td><td>{t.k.overduePermitted || '–'}</td><td>{t.k.closedLate || '–'}</td><td><Bar pct={t.k.slaCompliance} /></td><td>{t.k.avgDaysToDispose || '–'}</td></tr>)}
          <tr className="total"><td><b>All case types</b></td><td></td><td>{k.total}</td><td>{k.open}</td><td>{k.disposed}</td><td>{k.disposedOnTime}</td><td>{k.overdueLocked}</td><td>{k.overduePermitted}</td><td>{k.closedLate}</td><td><Bar pct={k.slaCompliance} /></td><td>{k.avgDaysToDispose || '–'}</td></tr></tbody></table></div>
    </Panel>

    <div className="viz-grid">
      <ChartCard title="Within SLA vs missed SLA by case type" data={byType.map(t => ({ name: t.name.replace(' case', ''), within: t.k.total - t.k.overdueAll, missed: t.k.overdueAll }))} xKey="name" kind="hbar" series={[{ key: 'within', label: 'Within SLA', color: SLOT[0] }, { key: 'missed', label: 'Missed SLA', color: STATUS_CRITICAL }]} />
      <ChartCard title="Opened vs disposed per month" subtitle="Last 6 months" data={trend} xKey="name" series={[{ key: 'opened', label: 'Opened' }, { key: 'disposed', label: 'Disposed' }]} />
    </div>

    <div className="viz-grid"><ChartCard title="Adjournments by reason" subtitle="Hearings adjourned in these cases" data={adjByReason} xKey="name" kind="hbar" emptyText="No adjournments recorded" series={[{ key: 'count', label: 'Adjournments', color: STATUS_CRITICAL }]} /></div>

    {byPros.length > 1 && <Panel title="KPIs by prosecutor"><GroupTable rows={byPros} target={T.slaCompliance} /></Panel>}
    {byZone.length > 1 && <Panel title="KPIs by zone"><GroupTable rows={byZone} target={T.slaCompliance} /></Panel>}
    {byOffice.length > 1 && <Panel title="KPIs by woreda"><GroupTable rows={byOffice} target={T.slaCompliance} /></Panel>}

    <Panel title={<>Case management register <Pill>{register.length} cases</Pill></>}>
      <div className="ws-table-wrap"><table className="ws-table compact cards-on-mobile kpi-register">
        <thead><tr><th>Case</th><th>Type / subject</th><th>Prosecutor</th><th>Opened</th><th>SLA due</th><th>Status</th><th>SLA outcome</th></tr></thead>
        <tbody>{register.map(({ c, o }) => <tr key={c.id} className={missedSla(o) ? 'row-overdue' : ''}>
          <td data-label="Case"><Link className="ws-case-link" href={'/dashboard/cases/' + c.id}><b>{c.title}</b><small>{c.caseNo} · {c.office}</small></Link></td>
          <td data-label="Type">{typeName(data, c)}<small className="ws-sub">{c.subject}</small></td>
          <td data-label="Prosecutor">{userName(c.prosecutorId)}</td>
          <td data-label="Opened">{fmtDate(c.openedAt)}</td>
          <td data-label="SLA due">{fmtDate(c.dueAt)}</td>
          <td data-label="Status">{c.status}</td>
          <td data-label="SLA outcome"><Pill tone={TONE[o]}>{missedSla(o) && <AlertTriangle size={12} />}{o}</Pill>{c.permitUntil && o === 'Overdue – permitted' && <small className="ws-sub">until {fmtDate(c.permitUntil)}</small>}</td>
        </tr>)}</tbody>
      </table></div>
    </Panel>
    <p className="ws-sub kpi-foot">Generated {new Date().toLocaleString('en-GB')} by {user!.name} ({role?.name}) · {filterText}</p>
  </div>;
}

function Tile({ label, value, sub, tone = 'teal' }: { label: string; value: React.ReactNode; sub: string; tone?: 'teal' | 'red' | 'gold' | 'ink' }) {
  return <div className={'ws-stat tone-' + tone}><span className="ws-stat-label">{label}</span><strong>{value}</strong><small>{sub}</small></div>;
}
function Bar({ pct }: { pct: number }) {
  return <span className="kpi-bar"><i style={{ width: pct + '%' }} className={pct < 70 ? 'bad' : pct < 90 ? 'warn' : ''} /><b>{pct}%</b></span>;
}
function GroupTable({ rows, target }: { rows: { name: string; k: Kpis }[]; target: number }) {
  return <div className="ws-table-wrap"><table className="ws-table compact kpi-table"><thead><tr><th>Name</th><th>Total</th><th>Open</th><th>Disposed</th><th>Missed SLA</th><th>of which permitted</th><th>SLA compliance</th><th>Target {target}%</th><th>Avg days</th></tr></thead>
    <tbody>{rows.map(r => <tr key={r.name}><td><b>{r.name}</b></td><td>{r.k.total}</td><td>{r.k.open}</td><td>{r.k.disposed}</td><td>{r.k.overdueAll ? <Pill tone="red">{r.k.overdueAll}</Pill> : 0}</td><td>{r.k.overduePermitted || '–'}</td><td><Bar pct={r.k.slaCompliance} /></td><td><Pill tone={r.k.slaCompliance >= target ? 'green' : 'red'}>{r.k.slaCompliance >= target ? 'Met' : 'Below'}</Pill></td><td>{r.k.avgDaysToDispose || '–'}</td></tr>)}</tbody></table></div>;
}
