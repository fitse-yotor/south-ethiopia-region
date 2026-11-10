'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export type CalItem = { id: string; date: string; time?: string; title: string; sub?: string; tone?: 'blue' | 'gold' | 'teal' | 'red' | 'grey'; href?: string; onClick?: () => void };
const pad = (n: number) => String(n).padStart(2, '0');
export const isoDay = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const WD = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function Chip({ it }: { it: CalItem }) {
  const body = <><b>{it.time ? it.time + ' ' : ''}</b>{it.title}</>;
  const cls = 'cal-chip tone-' + (it.tone || 'blue');
  return it.href ? <Link href={it.href} className={cls} title={it.title}>{body}</Link> : <button type="button" className={cls} onClick={it.onClick} title={it.title}>{body}</button>;
}

export function Calendar({ items, initialView = 'month', views = ['month', 'week', 'day'], onDayClick }: { items: CalItem[]; initialView?: 'month' | 'week' | 'day'; views?: ('month' | 'week' | 'day')[]; onDayClick?: (date: string) => void }) {
  const [view, setView] = useState(initialView);
  const [cursor, setCursor] = useState(() => new Date());
  const today = isoDay(new Date());
  const byDay = useMemo(() => { const m: Record<string, CalItem[]> = {}; for (const it of items) (m[it.date] ||= []).push(it); for (const k in m) m[k].sort((a, b) => (a.time || '').localeCompare(b.time || '')); return m; }, [items]);
  const move = (dir: number) => { const d = new Date(cursor); if (view === 'month') d.setMonth(d.getMonth() + dir); else d.setDate(d.getDate() + dir * (view === 'week' ? 7 : 1)); setCursor(d); };
  const monday = (d: Date) => { const x = new Date(d); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; };

  let title = '', body: React.ReactNode;
  if (view === 'month') {
    title = cursor.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1), start = monday(first);
    const cells = Array.from({ length: 42 }, (_, i) => { const d = new Date(start); d.setDate(start.getDate() + i); return d; });
    body = <div className="cal-month">{WD.map(w => <div key={w} className="cal-wd">{w}</div>)}{cells.map(d => { const k = isoDay(d), list = byDay[k] || [];
      return <div key={k} className={'cal-cell' + (d.getMonth() !== cursor.getMonth() ? ' out' : '') + (k === today ? ' today' : '')} onClick={() => onDayClick?.(k)}>
        <span className="cal-num">{d.getDate()}</span>
        {list.slice(0, 3).map(it => <Chip key={it.id} it={it} />)}{list.length > 3 && <button type="button" className="cal-more" onClick={e => { e.stopPropagation(); setCursor(d); setView('day'); }}>+{list.length - 3} more</button>}
        {list.length > 0 && <i className="cal-dot" aria-hidden />}
      </div>; })}</div>;
  } else {
    const days = view === 'week' ? Array.from({ length: 7 }, (_, i) => { const d = monday(cursor); d.setDate(d.getDate() + i); return d; }) : [cursor];
    title = view === 'week' ? `${days[0].toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} – ${days[6].toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}` : cursor.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    body = <div className="cal-agenda">{days.map(d => { const k = isoDay(d), list = byDay[k] || [];
      return <div key={k} className={'cal-agenda-day' + (k === today ? ' today' : '')}><div className="cal-agenda-date"><b>{d.toLocaleDateString('en-GB', { weekday: 'short' })}</b><span>{d.getDate()}</span></div>
        <div className="cal-agenda-items">{list.length ? list.map(it => <div key={it.id} className={'cal-agenda-item tone-' + (it.tone || 'blue')}>{it.href ? <Link href={it.href}><b>{it.time}</b> {it.title}{it.sub && <small>{it.sub}</small>}</Link> : <button type="button" onClick={it.onClick}><b>{it.time}</b> {it.title}{it.sub && <small>{it.sub}</small>}</button>}</div>) : <span className="ws-sub">Nothing scheduled</span>}</div></div>; })}</div>;
  }
  return <div className="cal">
    <div className="cal-bar">
      <div className="cal-nav"><button type="button" className="ws-btn sm ghost" onClick={() => move(-1)} aria-label="Previous"><ChevronLeft size={16} /></button><button type="button" className="ws-btn sm ghost" onClick={() => setCursor(new Date())}>Today</button><button type="button" className="ws-btn sm ghost" onClick={() => move(1)} aria-label="Next"><ChevronRight size={16} /></button></div>
      <h3>{title}</h3>
      {views.length > 1 && <div className="ws-seg">{views.map(v => <button type="button" key={v} role="radio" aria-checked={view === v} onClick={() => setView(v)}>{v[0].toUpperCase() + v.slice(1)}</button>)}</div>}
    </div>
    {body}
  </div>;
}
