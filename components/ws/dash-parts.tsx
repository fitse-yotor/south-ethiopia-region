'use client';
import React from 'react';
import Link from 'next/link';
import { AlertTriangle, ArrowUpRight, BellRing, Bell, BookOpen, BookUp, Briefcase, Building2, CalendarDays, ChartColumn, CheckSquare, ClipboardList, FilePlus2, Gauge, Layers, Package, Shuffle, Timer, Users, Wallet } from 'lucide-react';
import { useWS } from '@/lib/ws/store';
import { scopeLabel } from '@/lib/ws/org';

/** Welcome banner: who you are, where you work and what needs attention today. */
export function Hero({ greet, firstName, overdue, hearingsToday, unread }: { greet: string; firstName: string; overdue: number; hearingsToday: number; unread: number }) {
  const { user, role } = useWS();
  const date = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const chips: { href: string; icon: React.ReactNode; text: string; tone: 'red' | 'gold' | 'teal' }[] = [];
  if (overdue) chips.push({ href: '/dashboard/cases?filter=overdue', icon: <AlertTriangle size={15} />, text: `${overdue} overdue case${overdue > 1 ? 's' : ''}`, tone: 'red' });
  if (hearingsToday) chips.push({ href: '/dashboard/calendar', icon: <CalendarDays size={15} />, text: `${hearingsToday} hearing${hearingsToday > 1 ? 's' : ''} today`, tone: 'gold' });
  if (unread) chips.push({ href: '/dashboard/notifications', icon: <Bell size={15} />, text: `${unread} unread notification${unread > 1 ? 's' : ''}`, tone: 'teal' });
  return <section className="dash-hero" aria-label="Welcome">
    <div className="dash-hero-text">
      <span className="dash-date">{date}</span>
      <h1>{greet}, {firstName}</h1>
      <p><b>{role?.name}</b>{user?.scope ? <> · {scopeLabel(user.scope)}</> : null}</p>
    </div>
    <div className="dash-chips">{chips.length ? chips.map(c => <Link key={c.text} href={c.href} className={'dash-chip tone-' + c.tone}>{c.icon}{c.text}</Link>) : <span className="dash-chip tone-teal">Nothing urgent today</span>}</div>
  </section>;
}

type Action = { href: string; label: string; sub: string; icon: React.ReactNode };

/** The handful of things this role does most, one tap away. */
export function QuickActions() {
  const { can } = useWS();
  const own = can('cases.viewOwn') && !can('cases.viewAll') && !can('cases.viewOffice');
  const a: Action[] = [];
  if (can('cases.assign')) a.push({ href: '/dashboard/cases/new', label: 'Register & assign a case', sub: 'Give it to a prosecutor of your woreda', icon: <FilePlus2 /> }, { href: '/dashboard/workload', label: 'Balance workload', sub: 'Drag cases between prosecutors', icon: <Shuffle /> });
  if (own) a.push({ href: '/dashboard/cases', label: 'My cases', sub: 'Update status before the SLA date', icon: <Briefcase /> }, { href: '/dashboard/periodic-reports?new=1', label: 'Submit a report', sub: 'Daily, weekly or monthly', icon: <ClipboardList /> }, { href: '/dashboard/calendar', label: 'Hearing calendar', sub: 'Dates, courts and adjournments', icon: <CalendarDays /> }, { href: '/dashboard/evidence', label: 'Evidence register', sub: 'Chain of custody', icon: <Package /> });
  if (can('cases.viewAll') || can('cases.viewOffice')) a.push({ href: '/dashboard/analytics', label: 'Zone & region analytics', sub: 'Compare with the targets', icon: <Layers /> }, { href: '/dashboard/kpi', label: 'KPI & case report', sub: 'SLA, overdue, clearance', icon: <Gauge /> });
  if (can('staff.manage')) a.push({ href: '/dashboard/staffing', label: 'Staffing & woreda accounts', sub: 'Post prosecutors, create accounts', icon: <Building2 /> });
  if (can('sla.manage')) a.push({ href: '/dashboard/sla', label: 'SLA & KPI targets', sub: 'Set for all zones and woredas', icon: <Timer /> });
  if (can('reports.cases') || can('reports.office') || can('reports.library') || can('reports.finance')) a.push({ href: '/dashboard/reports', label: 'Reports & export', sub: 'PDF and CSV in one click', icon: <ChartColumn /> });
  if (can('users.manage')) a.push({ href: '/dashboard/users', label: 'Users & roles', sub: 'Accounts and permissions', icon: <Users /> });
  if (can('settings.manage')) a.push({ href: '/dashboard/alerts', label: 'SMS & Telegram alerts', sub: 'Outbox and settings', icon: <BellRing /> });
  if (can('library.approve')) a.push({ href: '/dashboard/library/approvals', label: 'Approvals', sub: 'Payments and contributions', icon: <CheckSquare /> });
  if (can('library.contribute')) a.push({ href: '/dashboard/library', label: 'Browse the library', sub: 'Laws, research, manuals', icon: <BookOpen /> }, { href: '/dashboard/library/access', label: 'Access & payment', sub: 'Telebirr receipt', icon: <Wallet /> }, { href: '/dashboard/library/contribute', label: 'My contributions', sub: 'Share your research', icon: <BookUp /> });
  const seen = new Set<string>();
  const items = a.filter(x => (seen.has(x.href) ? false : (seen.add(x.href), true))).slice(0, 6);
  if (!items.length) return null;
  return <nav className="qa-grid" aria-label="Quick actions">{items.map(x => <Link key={x.href} href={x.href} className="qa-card"><span className="qa-icon">{x.icon}</span><span className="qa-text"><b>{x.label}</b><small>{x.sub}</small></span><ArrowUpRight size={16} className="qa-go" /></Link>)}</nav>;
}
