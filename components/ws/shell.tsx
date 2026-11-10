'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Activity, Bell, BellRing, Gauge, Layers, Package, BookOpen, BookUp, Briefcase, CalendarCheck, CalendarDays, ChartColumn, CheckSquare, ClipboardList, FilePlus2, FolderCog, Globe, KeyRound, LayoutDashboard,
  ListTodo, LogOut, Map as MapIcon, Newspaper, Scale, ScrollText, Settings2, ShieldCheck, Shuffle, Star, Timer, TrendingUp, UserCircle2, Users, Wallet,
} from 'lucide-react';
import { toast } from 'sonner';
import { SidebarProvider, Sidebar, SidebarContent, SidebarHeader, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarInset, SidebarTrigger, SidebarFooter, useSidebar } from '@/components/ui/sidebar';
import { useWS } from '@/lib/ws/store';
import type { Permission } from '@/lib/ws/types';
import { Avatar } from './ui';
import { Login, Register } from './auth';
import { Dashboard } from './dashboards';
import { LibraryBrowse, LibraryManage, LibraryApprovals, LibraryAccess, LibraryContribute } from './library';
import { CaseList, CaseNew, CaseDetail, SlaSettings } from './cases';
import { PeriodicReports, PeriodicReportDetail } from './preports';
import { UsersPage, RolesPage, AuditPage, SettingsPage, ProfilePage, NotificationsPage } from './admin';
import { ReportsPage } from './analytics';
import { CaseMapPage, DigestPage, HearingCalendarPage, PerformancePage, TasksPage, WorkloadPage, useAutoTasks } from './prosecution-extra';
import { DocDetailPage, ResearcherProfile } from './library-extra';
import { AppointmentsPage, EventsAdminPage, GlobalSearch, OfflineBanner, SystemHealthPage } from './system';
import { translate } from '@/lib/ws/i18n';
import { KpiPage } from './kpi-page';
import { EvidencePage } from './evidence';
import { AlertsPage } from './alerts';
import { AnalyticsPage } from './region-analytics';
import { reportsFor } from '@/lib/ws/reports';
import { scopeOfficeName } from '@/lib/ws/org';

type NavItem = { href: string; label: string; icon: React.ReactNode; show: boolean; badge?: number };

export default function Workspace() {
  const ws = useWS();
  const autoTaskList = useAutoTasks();
  useEffect(() => {
    const html = document.documentElement;
    html.style.fontSize = ws.prefs.textSize === 100 ? '' : ws.prefs.textSize + '%';
    document.body.dataset.wsTheme = ws.prefs.theme;
    return () => { html.style.fontSize = ''; delete document.body.dataset.wsTheme; };
  }, [ws.prefs.textSize, ws.prefs.theme]);
  const path = usePathname() || '/dashboard';
  const router = useRouter();
  const parts = path.split('/').filter(Boolean).slice(1);
  const page = parts[0] || '';
  const isPublicAuth = page === 'login' || page === 'register';

  useEffect(() => { if (ws.ready && !ws.user && !isPublicAuth) router.replace('/dashboard/login?next=' + encodeURIComponent(path)); }, [ws.ready, ws.user, isPublicAuth, path, router]);

  if (!ws.ready) return <div className="ws-loading"><Scale size={36} /><span>Loading workspace…</span></div>;
  if (page === 'login') return <Login />;
  if (page === 'register') return <Register />;
  if (!ws.user) return <div className="ws-loading"><Scale size={36} /><span>Redirecting to sign in…</span></div>;

  const { can, data, user } = ws;
  const isResearcher = can('library.contribute');
  const pendingApprovals = data.payments.filter(p => p.status === 'pending').length + data.docs.filter(d => d.status === 'pending').length;
  const unread = data.notifications.filter(n => n.userId === user.id && !n.read).length;
  const anyReport = reportsFor(can).length > 0;
  const pendingReview = data.preports.filter(r => r.status === 'Submitted').length;
  const autoTasks = autoTaskList.filter(t => t.tone === 'red').length;

  const groups: [string, NavItem[]][] = [
    ['Overview', [
      { href: '/dashboard', label: 'My dashboard', icon: <LayoutDashboard />, show: true },
      { href: '/dashboard/notifications', label: 'Notifications', icon: <Bell />, show: true, badge: unread },
      { href: '/dashboard/tasks', label: 'My tasks', icon: <ListTodo />, show: can('cases.viewAll') || can('cases.viewOwn') || can('cases.viewOffice') || can('preports.review'), badge: autoTasks },
    ]],
    ['Digital library', [
      { href: '/dashboard/library', label: 'Browse library', icon: <BookOpen />, show: true },
      { href: '/dashboard/library/access', label: 'Library access & payment', icon: <Wallet />, show: isResearcher },
      { href: '/dashboard/library/contribute', label: 'My contributions', icon: <BookUp />, show: isResearcher },
      { href: '/dashboard/library/manage', label: 'Manage library', icon: <FolderCog />, show: can('library.manage') },
      { href: '/dashboard/library/approvals', label: 'Approvals', icon: <CheckSquare />, show: can('library.approve'), badge: pendingApprovals },
    ]],
    ['Prosecution', [
      { href: '/dashboard/cases', label: can('cases.viewAll') ? 'Cases in my scope' : can('cases.viewOffice') ? 'Woreda cases' : 'My cases', icon: <Briefcase />, show: can('cases.viewAll') || can('cases.viewOwn') || can('cases.viewOffice') },
      { href: '/dashboard/cases/new', label: 'Register & assign case', icon: <FilePlus2 />, show: can('cases.assign') },
      { href: '/dashboard/kpi', label: 'KPI & case report', icon: <Gauge />, show: can('cases.viewAll') || can('cases.viewOwn') || can('cases.viewOffice') },
      { href: '/dashboard/evidence', label: 'Evidence register', icon: <Package />, show: can('evidence.manage') || can('cases.viewAll') || can('cases.viewOffice') },
      { href: '/dashboard/calendar', label: 'Hearing calendar', icon: <CalendarDays />, show: can('cases.viewAll') || can('cases.viewOwn') || can('cases.viewOffice') },
      { href: '/dashboard/sla', label: 'SLA, case types & KPI targets', icon: <Timer />, show: can('sla.manage') },
      { href: '/dashboard/periodic-reports', label: can('preports.review') || can('preports.view') ? 'Prosecutor reports' : 'My reports', icon: <ClipboardList />, show: can('preports.submit') || can('preports.review') || can('preports.view'), badge: can('preports.review') ? pendingReview : 0 },
    ]],
    ['Oversight', [
      { href: '/dashboard/analytics', label: 'Zone & region analytics', icon: <Layers />, show: can('cases.viewAll') || can('cases.viewOffice') },
      { href: '/dashboard/performance', label: 'Performance', icon: <TrendingUp />, show: can('cases.viewAll') || can('cases.viewOffice') },
      { href: '/dashboard/workload', label: 'Workload balancing', icon: <Shuffle />, show: can('cases.assign') },
      { href: '/dashboard/case-map', label: 'Case map', icon: <MapIcon />, show: can('cases.viewAll') || can('cases.viewOffice') },
      { href: '/dashboard/digest', label: 'Weekly digest', icon: <Newspaper />, show: can('preports.review') || can('cases.viewAll') },
    ]],
    ['Citizen services', [
      { href: '/dashboard/appointments', label: 'Appointments', icon: <CalendarCheck />, show: can('appointments.manage'), badge: data.appointments.filter(a => a.status === 'booked').length },
      { href: '/dashboard/events', label: 'Events & ratings', icon: <Star />, show: can('events.manage') },
    ]],
    ['Reports', [{ href: '/dashboard/reports', label: 'Reports & export', icon: <ChartColumn />, show: anyReport }]],
    ['Administration', [
      { href: '/dashboard/users', label: 'Users', icon: <Users />, show: can('users.manage') },
      { href: '/dashboard/roles', label: 'Roles & permissions', icon: <KeyRound />, show: can('roles.manage') },
      { href: '/dashboard/audit', label: 'Audit log', icon: <ScrollText />, show: can('audit.view') },
      { href: '/dashboard/settings', label: 'Settings', icon: <Settings2 />, show: can('settings.manage') },
      { href: '/dashboard/alerts', label: 'SMS & Telegram alerts', icon: <BellRing />, show: can('settings.manage') },
      { href: '/dashboard/system', label: 'System health', icon: <Activity />, show: can('settings.manage') },
      { href: '/admin', label: 'Website CMS & complaints', icon: <Globe />, show: can('cms.access') },
    ]],
    ['Account', [{ href: '/dashboard/profile', label: 'My profile', icon: <UserCircle2 />, show: true }]],
  ];
  const flat = groups.flatMap(g => g[1]).filter(i => i.show);
  const active = flat.filter(i => path === i.href || (i.href !== '/dashboard' && path.startsWith(i.href + '/'))).sort((a, b) => b.href.length - a.href.length)[0] || flat.find(i => i.href === path);

  const deny = (ok: boolean, el: React.ReactNode) => (ok ? el : <Denied />);
  let content: React.ReactNode;
  switch (page) {
    case '': content = <Dashboard />; break;
    case 'notifications': content = <NotificationsPage />; break;
    case 'profile': content = <ProfilePage />; break;
    case 'library':
      content = parts[1] === 'manage' ? deny(can('library.manage'), <LibraryManage />) : parts[1] === 'approvals' ? deny(can('library.approve'), <LibraryApprovals />)
        : parts[1] === 'access' ? <LibraryAccess /> : parts[1] === 'contribute' ? deny(isResearcher, <LibraryContribute />) : parts[1] === 'doc' && parts[2] ? <DocDetailPage id={parts[2]} /> : <LibraryBrowse />;
      break;
    case 'cases':
      content = !(can('cases.viewAll') || can('cases.viewOwn') || can('cases.viewOffice')) ? <Denied /> : parts[1] === 'new' ? deny(can('cases.assign'), <CaseNew />) : parts[1] ? <CaseDetail id={parts[1]} /> : <CaseList />;
      break;
    case 'sla': content = deny(can('sla.manage'), <SlaSettings />); break;
    case 'calendar': content = deny(can('cases.viewAll') || can('cases.viewOwn') || can('cases.viewOffice'), <HearingCalendarPage />); break;
    case 'tasks': content = <TasksPage />; break;
    case 'kpi': content = deny(can('cases.viewAll') || can('cases.viewOwn') || can('cases.viewOffice'), <KpiPage />); break;
    case 'evidence': content = deny(can('evidence.manage') || can('cases.viewAll') || can('cases.viewOffice'), <EvidencePage />); break;
    case 'analytics': content = deny(can('cases.viewAll') || can('cases.viewOffice'), <AnalyticsPage />); break;
    case 'alerts': content = deny(can('settings.manage'), <AlertsPage />); break;
    case 'performance': content = deny(can('cases.viewAll') || can('cases.viewOffice'), <PerformancePage />); break;
    case 'workload': content = deny(can('cases.assign'), <WorkloadPage />); break;
    case 'case-map': content = deny(can('cases.viewAll') || can('cases.viewOffice'), <CaseMapPage />); break;
    case 'digest': content = deny(can('preports.review') || can('cases.viewAll'), <DigestPage />); break;
    case 'appointments': content = deny(can('appointments.manage'), <AppointmentsPage />); break;
    case 'events': content = deny(can('events.manage'), <EventsAdminPage />); break;
    case 'system': content = deny(can('settings.manage'), <SystemHealthPage />); break;
    case 'researchers': content = parts[1] ? <ResearcherProfile id={parts[1]} /> : <Denied notFound />; break;
    case 'periodic-reports': content = deny(can('preports.submit') || can('preports.review') || can('preports.view'), parts[1] ? <PeriodicReportDetail id={parts[1]} /> : <PeriodicReports />); break;
    case 'reports': content = deny(anyReport, <ReportsPage />); break;
    case 'users': content = deny(can('users.manage'), <UsersPage />); break;
    case 'roles': content = deny(can('roles.manage'), <RolesPage />); break;
    case 'audit': content = deny(can('audit.view'), <AuditPage />); break;
    case 'settings': content = deny(can('settings.manage'), <SettingsPage />); break;
    default: content = <Denied notFound />;
  }

  const tr = (x: string) => translate(ws.prefs.lang, x);
  return <div className="ws-root" data-theme={ws.prefs.theme} lang={ws.prefs.lang}><SidebarProvider>
    <Sidebar className="justice-sidebar ws-sidebar">
      <SidebarHeader><Link className="admin-brand" href="/dashboard"><img src="/justice-logo.png" alt="" width={34} height={34} /><span>Southern Ethiopia Justice<small>{tr('Staff & researcher portal')}</small></span></Link></SidebarHeader>
      <SidebarContent>
        {groups.map(([g, items]) => { const vis = items.filter(i => i.show); if (!vis.length) return null; return <div key={g} className="ws-nav-group"><div className="sidebar-caption">{tr(g)}</div><SidebarMenu>{vis.map(i => <SidebarMenuItem key={i.href}><NavLink item={{ ...i, label: tr(i.label) }} active={active?.href === i.href} /></SidebarMenuItem>)}</SidebarMenu></div>; })}
      </SidebarContent>
      <SidebarFooter><div className="ws-sidebar-user"><Avatar name={user.name} /><div><b>{user.name}</b><small>{ws.role?.name}</small></div></div><Link href="/" className="ws-sidebar-link"><Globe size={15} />{tr('Public website')}</Link></SidebarFooter>
    </Sidebar>
    <SidebarInset className="ws-inset">
      <header className="ws-topbar">
        <SidebarTrigger className="ws-trigger" />
        <span className="ws-crumb">{tr(active?.label || 'Workspace')}</span>
        <GlobalSearch links={flat.filter(i => i.href.startsWith('/dashboard')).map(i => ({ href: i.href, label: i.label }))} />
        <div className="ws-topbar-right">
          <span className="ws-role-chip"><ShieldCheck size={14} />{ws.role?.name}{user.scope ? ' · ' + scopeOfficeName(user.scope) : ''}</span>
          <Link href="/dashboard/notifications" className="ws-bell" aria-label={`Notifications (${unread} unread)`}><Bell size={19} />{unread > 0 && <i>{unread}</i>}</Link>
          <Link href="/dashboard/profile" aria-label="My profile"><Avatar name={user.name} size={32} /></Link>
          <button className="ws-icon-btn" aria-label="Sign out" title="Sign out" onClick={() => { ws.actions.logout(); router.push('/dashboard/login'); }}><LogOut size={18} /></button>
        </div>
      </header>
      <OfflineBanner />
      <main className="ws-main">{content}</main>
      <div className="ws-foot">Demonstration build · sample data is stored in this browser only · <button onClick={() => { if (confirm('Reset all demo data to the original sample data?')) { ws.actions.resetDemo(); toast.success('Demo data reset'); } }}>Reset demo data</button></div>
    </SidebarInset>

  </SidebarProvider></div>;
}

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  const { setOpenMobile } = useSidebar();
  return <SidebarMenuButton asChild isActive={active}><Link href={item.href} onClick={() => setOpenMobile(false)}>{item.icon}<span>{item.label}</span>{!!item.badge && <em className="ws-nav-badge">{item.badge}</em>}</Link></SidebarMenuButton>;
}

function Denied({ notFound }: { notFound?: boolean }) {
  return <div className="ws-empty big"><ShieldCheck size={40} /><h3>{notFound ? 'Page not found' : 'You do not have access to this page'}</h3><p>{notFound ? 'Check the address or use the menu.' : 'Your role does not include the permission required. Contact the Super Admin if you need access.'}</p><Link className="ws-btn" href="/dashboard">Back to my dashboard</Link></div>;
}
