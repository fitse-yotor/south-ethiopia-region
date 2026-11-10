'use client';
import { useMemo } from 'react';
import { FileDown, FileSpreadsheet, Lightbulb, Printer } from 'lucide-react';
import { toast } from 'sonner';
import { useWS } from '@/lib/ws/store';
import { ADJ_BY, ADJ_REASONS, type Case } from '@/lib/ws/types';
import { computeKpis, disposedAt, groupKpis, missedSla, outcome } from '@/lib/ws/kpi';
import { scopeLabel, unitName, zoneOfWoreda } from '@/lib/ws/org';
import { evidenceStatus } from '@/lib/ws/evidence';
import { exportCSV, exportPDF, type Table } from '@/lib/ws/reports';
import { PageHead, Panel, Pill } from './ui';
import { ChartCard, lastMonths, SLOT, STATUS_CRITICAL } from './charts';

/** Region / zone / woreda analytics: every group in the user's scope compared with the region's KPI targets. */
export function AnalyticsPage() {
  const { data, user, role, userName, myCases: cases } = useWS();
  const level = user!.scope?.level;
  const T = data.settings.kpiTargets;
  const groupLabel = level === 'region' ? 'Zone' : level === 'zone' ? 'Woreda' : 'Prosecutor';
  const keyOf = (c: Case) => (level === 'region' ? unitName(zoneOfWoreda(c.woredaId)?.id) : level === 'zone' ? c.office : userName(c.prosecutorId));
  const today = new Date().toISOString().slice(0, 10);

  const rows = useMemo(() => {
    const caseKey = new Map(cases.map(c => [c.id, keyOf(c)]));
    const held = data.hearings.filter(h => h.date <= today && caseKey.has(h.caseId));
    return groupKpis(data, cases, keyOf).sort((a, b) => a.name.localeCompare(b.name)).map(g => {
      const hs = held.filter(h => caseKey.get(h.caseId) === g.name), adj = hs.filter(h => h.adjournReason);
      const lab = data.evidence.filter(e => caseKey.get(e.caseId) === g.name && evidenceStatus(e) === 'At laboratory').length;
      return { ...g, held: hs.length, adj: adj.length, adjRate: hs.length ? Math.round((adj.length / hs.length) * 100) : 0, gap: g.k.slaCompliance - T.slaCompliance, lab };
    });
  }, [data, cases, level, T.slaCompliance]); // eslint-disable-line react-hooks/exhaustive-deps

  const all = computeKpis(data, cases);
  const months = lastMonths(6);
  const trend = months.map(m => ({ name: m.label, opened: cases.filter(c => c.openedAt.startsWith(m.key)).length, disposed: cases.filter(c => disposedAt(data, c)?.startsWith(m.key)).length }));
  const heat = rows.map(r => ({ name: r.name, cells: months.map(m => cases.filter(c => keyOf(c) === r.name && missedSla(outcome(data, c)) && (disposedAt(data, c) || c.dueAt).startsWith(m.key)).length) })); // eslint-disable-line react-hooks/exhaustive-deps
  const heatMax = Math.max(1, ...heat.flatMap(h => h.cells));
  const ids = new Set(cases.map(c => c.id));
  const adjusted = data.hearings.filter(h => h.adjournReason && ids.has(h.caseId));
  const byReason = ADJ_REASONS.map(r => ({ name: r.replace('Judge absent / court not sitting', 'Judge absent').replace('Evidence or reports not ready', 'Evidence not ready'), count: adjusted.filter(h => h.adjournReason === r).length })).filter(x => x.count > 0);
  const byParty = ADJ_BY.map(b => ({ name: b, count: adjusted.filter(h => h.adjournedBy === b).length }));
  const below = rows.filter(r => r.gap < 0).sort((a, b) => a.gap - b.gap);
  const worstAdj = [...rows].filter(r => r.held >= 2).sort((a, b) => b.adjRate - a.adjRate)[0];
  const mostMissed = [...rows].sort((a, b) => b.k.overdueAll - a.k.overdueAll)[0];
  const courtShare = adjusted.length ? Math.round((adjusted.filter(h => h.adjournedBy === 'Court').length / adjusted.length) * 100) : 0;

  const insights: string[] = [];
  if (rows.length) {
    insights.push(below.length ? `${below.length} of ${rows.length} ${groupLabel.toLowerCase()}s are below the ${T.slaCompliance}% SLA target. The furthest behind is ${below[0].name} (${below[0].k.slaCompliance}%, ${Math.abs(below[0].gap)} points under).` : `All ${rows.length} ${groupLabel.toLowerCase()}s meet the ${T.slaCompliance}% SLA target.`);
    if (mostMissed?.k.overdueAll) insights.push(`${mostMissed.name} has the most cases that missed their SLA (${mostMissed.k.overdueAll} of ${mostMissed.k.total}).`);
    if (worstAdj?.adjRate) insights.push(`${worstAdj.name} has the highest share of adjourned hearings (${worstAdj.adjRate}%).`);
    if (adjusted.length) insights.push(`${courtShare}% of ${adjusted.length} adjournments were asked for by the court, ${100 - courtShare}% by the parties or others - delays are ${courtShare >= 50 ? 'mostly outside the prosecution office' : 'largely within the control of the parties'}.`);
    if (all.overduePermitted) insights.push(`${all.overduePermitted} overdue case(s) continue only with a Woreda Coordinator's permission.`);
  }

  const brief: Table = {
    columns: [groupLabel, 'Cases', 'Open', 'Missed SLA', 'SLA compliance', `Target ${T.slaCompliance}%`, 'Gap (points)', 'On-time rate', 'Clearance rate', 'Adjournment rate'],
    rows: rows.map(r => [r.name, r.k.total, r.k.open, r.k.overdueAll, r.k.slaCompliance + '%', r.gap >= 0 ? 'Met' : 'Below', r.gap, r.k.onTimeRate + '%', r.k.clearanceRate + '%', r.adjRate + '%']),
    summary: [['Cases', all.total], ['SLA compliance', all.slaCompliance + '%'], ['Missed SLA', all.overdueAll], ['Adjournments', adjusted.length]],
  };
  const stamp = new Date().toISOString().slice(0, 7);
  const meta = { by: user!.name, role: (role?.name || '') + ' - ' + scopeLabel(user!.scope), org: data.settings.orgName, range: 'Monthly brief ' + stamp };

  return <div className="kpi-page">
    <PageHead eyebrow="OVERSIGHT" title="Zone & region analytics" actions={<div className="ws-head-actions sp-noprint">
      <button className="ws-btn ghost" onClick={() => window.print()}><Printer size={16} />Print</button>
      <button className="ws-btn ghost" onClick={() => { exportCSV('monthly-brief-' + stamp, brief); toast.success('CSV downloaded'); }}><FileSpreadsheet size={16} />CSV</button>
      <button className="ws-btn" onClick={async () => { await exportPDF('monthly-brief-' + stamp, 'Monthly brief - ' + scopeLabel(user!.scope), brief, meta); toast.success('Monthly brief downloaded'); }}><FileDown size={16} />Monthly brief (PDF)</button>
    </div>}>
      Every {groupLabel.toLowerCase()} of {scopeLabel(user!.scope)} compared with the KPI targets set by the region.
    </PageHead>

    <div className="kpi-tiles">
      <Tile label="Cases" value={all.total} sub={`${all.open} open · ${all.disposed} disposed`} />
      <Tile label="SLA compliance" value={all.slaCompliance + '%'} sub={`target ${T.slaCompliance}%`} tone={all.slaCompliance >= T.slaCompliance ? 'teal' : 'red'} />
      <Tile label="Missed SLA" value={all.overdueAll} sub={`${all.overdueLocked} locked · ${all.overduePermitted} permitted`} tone="red" />
      <Tile label="Adjourned hearings" value={adjusted.length} sub={`${courtShare}% asked by the court`} tone="gold" />
    </div>

    {insights.length > 0 && <Panel title={<><Lightbulb size={18} />What stands out</>}><ul className="ws-list">{insights.map((t, i) => <li key={i}><div><b>{t}</b></div></li>)}</ul></Panel>}

    <div className="viz-grid">
      <ChartCard title={`SLA compliance by ${groupLabel.toLowerCase()}`} subtitle={`Target ${T.slaCompliance}%`} data={rows.map(r => ({ name: r.name, compliance: r.k.slaCompliance }))} xKey="name" kind="hbar" unit="%" height={Math.max(200, rows.length * 34)} series={[{ key: 'compliance', label: 'SLA compliance', color: SLOT[0] }]} />
      <ChartCard title="Opened vs disposed per month" subtitle="Last 6 months" data={trend} xKey="name" series={[{ key: 'opened', label: 'Opened' }, { key: 'disposed', label: 'Disposed' }]} />
      <ChartCard title="Adjournments by reason" data={byReason} xKey="name" kind="hbar" emptyText="No adjournments recorded" series={[{ key: 'count', label: 'Adjournments', color: STATUS_CRITICAL }]} />
      <ChartCard title="Who asked for the adjournment" data={byParty} xKey="name" emptyText="No adjournments recorded" series={[{ key: 'count', label: 'Adjournments', color: SLOT[1] }]} />
    </div>

    <Panel title={`Ranking by ${groupLabel.toLowerCase()}`}>
      <div className="ws-table-wrap"><table className="ws-table compact kpi-table"><thead><tr><th>{groupLabel}</th><th>Cases</th><th>Open</th><th>Missed SLA</th><th>SLA compliance</th><th>vs target</th><th>On-time</th><th>Clearance</th><th>Adjourned</th><th>Evidence at lab</th></tr></thead>
        <tbody>{[...rows].sort((a, b) => a.gap - b.gap).map(r => <tr key={r.name}>
          <td><b>{r.name}</b></td><td>{r.k.total}</td><td>{r.k.open}</td><td>{r.k.overdueAll ? <Pill tone="red">{r.k.overdueAll}</Pill> : 0}</td>
          <td>{r.k.slaCompliance}%</td><td><Pill tone={r.gap >= 0 ? 'green' : 'red'}>{r.gap >= 0 ? 'Met' : `${r.gap} pts`}</Pill></td>
          <td><Pill tone={r.k.onTimeRate >= T.onTimeRate ? 'green' : 'red'}>{r.k.onTimeRate}%</Pill></td><td><Pill tone={r.k.clearanceRate >= T.clearanceRate ? 'green' : 'red'}>{r.k.clearanceRate}%</Pill></td>
          <td>{r.held ? `${r.adj} of ${r.held} (${r.adjRate}%)` : '–'}</td><td>{r.lab || '–'}</td>
        </tr>)}</tbody></table></div>
    </Panel>

    <Panel title="Cases that missed their SLA, by month" actions={<small className="ws-sub">Darker = more cases</small>}>
      <div className="ws-table-wrap"><table className="ws-table compact"><thead><tr><th>{groupLabel}</th>{months.map(m => <th key={m.key}>{m.label}</th>)}</tr></thead>
        <tbody>{heat.map(h => <tr key={h.name}><td><b>{h.name}</b></td>{h.cells.map((n, i) => <td key={i} style={{ textAlign: 'center', background: n ? `color-mix(in srgb, var(--viz-critical) ${Math.round(12 + (n / heatMax) * 55)}%, transparent)` : undefined }}>{n || '–'}</td>)}</tr>)}</tbody></table></div>
    </Panel>
    <p className="ws-sub kpi-foot">Generated {new Date().toLocaleString('en-GB')} by {user!.name} ({role?.name}) · {scopeLabel(user!.scope)}</p>
  </div>;
}

function Tile({ label, value, sub, tone = 'teal' }: { label: string; value: React.ReactNode; sub: string; tone?: 'teal' | 'red' | 'gold' | 'ink' }) {
  return <div className={'ws-stat tone-' + tone}><span className="ws-stat-label">{label}</span><strong>{value}</strong><small>{sub}</small></div>;
}
