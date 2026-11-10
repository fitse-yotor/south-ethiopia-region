// Case-management KPIs. An overdue case stays overdue in every KPI, even after the Woreda Coordinator gives permission to continue.
import type { Case, WSData } from './types';

const DAY = 86400000;
export const DISPOSED = ['Closed', 'Judgment delivered'];

export type SlaOutcome = 'On track' | 'Due soon' | 'Overdue – locked' | 'Overdue – permitted' | 'Closed on time' | 'Closed late';

/** When a case was disposed (closed or judgment delivered), if it was. */
export function disposedAt(d: WSData, c: Case): string | undefined {
  if (!DISPOSED.includes(c.status)) return undefined;
  if (c.closedAt) return c.closedAt;
  const ch = d.statusChanges.filter(s => s.caseId === c.id && DISPOSED.includes(s.to)).sort((a, b) => b.at.localeCompare(a.at))[0];
  return ch?.at || c.updatedAt;
}

export function outcome(d: WSData, c: Case, now = Date.now()): SlaOutcome {
  const due = new Date(c.dueAt).getTime();
  const disp = disposedAt(d, c);
  if (disp) return new Date(disp).getTime() > due ? 'Closed late' : 'Closed on time';
  if (due < now) return c.permitUntil && new Date(c.permitUntil).getTime() > now ? 'Overdue – permitted' : 'Overdue – locked';
  return (due - now) / DAY <= d.settings.dueSoonDays ? 'Due soon' : 'On track';
}

/** True if the case missed (or is missing) its SLA – used for every "overdue" KPI. */
export const missedSla = (o: SlaOutcome) => o === 'Overdue – locked' || o === 'Overdue – permitted' || o === 'Closed late';

export type Kpis = {
  total: number; open: number; disposed: number; disposedOnTime: number; closedLate: number;
  overdueOpen: number; overdueLocked: number; overduePermitted: number; overdueAll: number; dueSoon: number;
  slaCompliance: number; onTimeRate: number; clearanceRate: number; avgDaysToDispose: number; avgOpenAge: number; permissions: number;
};

export function computeKpis(d: WSData, cases: Case[], now = Date.now()): Kpis {
  const os = cases.map(c => ({ c, o: outcome(d, c, now) }));
  const disposed = os.filter(x => x.o.startsWith('Closed'));
  const open = os.filter(x => !x.o.startsWith('Closed'));
  const late = os.filter(x => x.o === 'Closed late').length;
  const locked = os.filter(x => x.o === 'Overdue – locked').length, permitted = os.filter(x => x.o === 'Overdue – permitted').length;
  const daysTo = disposed.map(x => (new Date(disposedAt(d, x.c)!).getTime() - new Date(x.c.openedAt).getTime()) / DAY);
  const ages = open.map(x => (now - new Date(x.c.openedAt).getTime()) / DAY);
  const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 100);
  const ids = new Set(cases.map(c => c.id));
  return {
    total: cases.length, open: open.length, disposed: disposed.length, disposedOnTime: disposed.length - late, closedLate: late,
    overdueOpen: locked + permitted, overdueLocked: locked, overduePermitted: permitted, overdueAll: locked + permitted + late,
    dueSoon: os.filter(x => x.o === 'Due soon').length,
    slaCompliance: pct(cases.length - (locked + permitted + late), cases.length),
    onTimeRate: pct(disposed.length - late, disposed.length),
    clearanceRate: pct(disposed.length, cases.length),
    avgDaysToDispose: daysTo.length ? Math.round(daysTo.reduce((a, b) => a + b, 0) / daysTo.length) : 0,
    avgOpenAge: ages.length ? Math.round(ages.reduce((a, b) => a + b, 0) / ages.length) : 0,
    permissions: d.extensions.filter(x => ids.has(x.caseId)).length,
  };
}

export function groupKpis(d: WSData, cases: Case[], key: (c: Case) => string) {
  const groups = new Map<string, Case[]>();
  cases.forEach(c => { const k = key(c); groups.set(k, [...(groups.get(k) || []), c]); });
  return Array.from(groups.entries()).map(([name, cs]) => ({ name, k: computeKpis(d, cs) })).sort((a, b) => b.k.total - a.k.total);
}

export const typeName = (d: WSData, c: Case) => d.caseCategories.find(t => t.id === c.categoryId)?.name || '—';
