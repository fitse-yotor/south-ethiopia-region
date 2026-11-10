'use client';
import { useState } from 'react';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Table2, BarChart3 } from 'lucide-react';

// Categorical slots from the validated reference palette (light/dark via CSS variables in workspace.css).
export const SLOT = ['var(--viz-1)', 'var(--viz-2)', 'var(--viz-3)'] as const;
export const STATUS_CRITICAL = 'var(--viz-critical)';

type Series = { key: string; label: string; color?: string };
type Row = Record<string, string | number>;

function Tip({ active, payload, label, unit }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string; unit?: string }) {
  if (!active || !payload?.length) return null;
  return <div className="viz-tip"><b>{label}</b>{payload.map(p => <div key={p.name}><i style={{ background: p.color }} />{p.name}<span>{p.value}{unit || ''}</span></div>)}</div>;
}

export function ChartCard({ title, subtitle, data, xKey, series, kind = 'bar', unit, height = 240, yMax, emptyText = 'No data yet' }: {
  title: React.ReactNode; subtitle?: string; data: Row[]; xKey: string; series: Series[]; kind?: 'bar' | 'line' | 'hbar'; unit?: string; height?: number; yMax?: number; emptyText?: string;
}) {
  const [table, setTable] = useState(false);
  const colored = series.map((s, i) => ({ ...s, color: s.color || SLOT[i % SLOT.length] }));
  const axis = { stroke: 'var(--viz-axis)', fontSize: 11, tickLine: false, axisLine: false } as const;
  const empty = !data.length || data.every(r => series.every(s => !Number(r[s.key])));
  return <section className="ws-panel viz-card">
    <div className="ws-panel-head"><div><h2>{title}</h2>{subtitle && <small className="ws-sub">{subtitle}</small>}</div>
      <button type="button" className="ws-btn sm ghost" onClick={() => setTable(!table)} aria-pressed={table}>{table ? <BarChart3 size={14} /> : <Table2 size={14} />}{table ? 'Chart' : 'Table'}</button></div>
    {series.length > 1 && !table && <div className="viz-legend">{colored.map(s => <span key={s.key}><i style={{ background: s.color }} />{s.label}</span>)}</div>}
    {empty ? <p className="ws-sub viz-empty">{emptyText}</p> : table ? <div className="ws-table-wrap"><table className="ws-table compact"><thead><tr><th>{xKey === 'name' ? '' : xKey}</th>{colored.map(s => <th key={s.key}>{s.label}</th>)}</tr></thead><tbody>{data.map((r, i) => <tr key={i}><td>{r[xKey]}</td>{colored.map(s => <td key={s.key}>{r[s.key]}{unit || ''}</td>)}</tr>)}</tbody></table></div> :
      <div style={{ width: '100%', height }}>
        <ResponsiveContainer>
          {kind === 'line' ? <LineChart data={data} margin={{ top: 8, right: 12, left: -18, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--viz-grid)" />
            <XAxis dataKey={xKey} {...axis} /><YAxis {...axis} allowDecimals={false} domain={[0, yMax ?? 'auto']} unit={unit} />
            <Tooltip content={<Tip unit={unit} />} cursor={{ stroke: 'var(--viz-axis)', strokeDasharray: '3 3' }} />
            {colored.map(s => <Line key={s.key} isAnimationActive={false} type="monotone" dataKey={s.key} name={s.label} stroke={s.color} strokeWidth={2} dot={{ r: 4, strokeWidth: 2, stroke: 'var(--viz-surface)', fill: s.color }} activeDot={{ r: 6 }} />)}
          </LineChart> : kind === 'hbar' ? <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 0 }} barCategoryGap={6}>
            <CartesianGrid horizontal={false} stroke="var(--viz-grid)" />
            <XAxis type="number" {...axis} allowDecimals={false} /><YAxis type="category" dataKey={xKey} {...axis} width={110} />
            <Tooltip content={<Tip unit={unit} />} cursor={{ fill: 'var(--viz-hover)' }} />
            {colored.map(s => <Bar key={s.key} isAnimationActive={false} dataKey={s.key} name={s.label} fill={s.color} radius={[0, 4, 4, 0]} maxBarSize={18} stackId={series.length > 1 ? 's' : undefined} stroke="var(--viz-surface)" strokeWidth={series.length > 1 ? 2 : 0} />)}
          </BarChart> : <BarChart data={data} margin={{ top: 8, right: 12, left: -18, bottom: 0 }} barGap={2}>
            <CartesianGrid vertical={false} stroke="var(--viz-grid)" />
            <XAxis dataKey={xKey} {...axis} /><YAxis {...axis} allowDecimals={false} domain={[0, yMax ?? 'auto']} unit={unit} />
            <Tooltip content={<Tip unit={unit} />} cursor={{ fill: 'var(--viz-hover)' }} />
            {colored.map(s => <Bar key={s.key} isAnimationActive={false} dataKey={s.key} name={s.label} fill={s.color} radius={[4, 4, 0, 0]} maxBarSize={22} />)}
          </BarChart>}
        </ResponsiveContainer>
      </div>}
  </section>;
}

/** Last n calendar months as {key: 'YYYY-MM', label: 'Jun'} */
export function lastMonths(n: number) {
  const out: { key: string; label: string }[] = []; const d = new Date(); d.setDate(1);
  for (let i = n - 1; i >= 0; i--) { const x = new Date(d.getFullYear(), d.getMonth() - i, 1); out.push({ key: x.toISOString().slice(0, 7), label: x.toLocaleDateString('en-GB', { month: 'short' }) }); }
  return out;
}
