'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Activity, BookOpen, Briefcase, CalendarCheck, CalendarDays, ClipboardList, Database, Download, FileText, HardDrive, KeyRound, LogIn, Moon, Plus, Search, ShieldAlert, Sparkles, Star, Sun, Trash2, Upload, User, WifiOff } from 'lucide-react';
import { toast } from 'sonner';
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { defaultPrefs, useWS } from '@/lib/ws/store';
import { NOTIFY_EVENTS, OFFICES, type Appointment, type PublicEvent, type UserPrefs } from '@/lib/ws/types';
import { DataTable, Empty, F, Modal, PageHead, Panel, Pill, Sel, Stat, StatusPill, ago, fmtDate, fmtDateTime, useTr } from './ui';
import { Calendar, isoDay } from './calendar';
import { ChartCard, SLOT } from './charts';

/* ================= 19. Global search (Ctrl+K) ================= */
export type NavLink = { href: string; label: string };
export function GlobalSearch({ links }: { links: NavLink[] }) {
  const { data, can, user, userName, hasLibraryAccess } = useWS();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const tr = useTr();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setOpen(o => !o); } if (e.key === '/' && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) { e.preventDefault(); setOpen(true); } };
    window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey);
  }, []);
  const go = (href: string) => { setOpen(false); router.push(href); };
  const { myCases: cases } = useWS();
  const reports = can('preports.review') ? data.preports : can('preports.submit') ? data.preports.filter(r => r.prosecutorId === user!.id) : [];
  const docs = data.docs.filter(d => d.status === 'published' && (d.visibility === 'public' || hasLibraryAccess()));
  return <>
    <button className="ws-search-btn" onClick={() => setOpen(true)} aria-label="Search (Ctrl+K)"><Search size={16} /><span>{tr('Search')}…</span><kbd>Ctrl K</kbd></button>
    <CommandDialog open={open} onOpenChange={setOpen} title="Search the portal" description="Search cases, reports, documents, users and pages">
      <CommandInput placeholder="Search cases, reports, documents, people, pages…" />
      <CommandList>
        <CommandEmpty>No results.</CommandEmpty>
        <CommandGroup heading="Pages">{links.map(l => <CommandItem key={l.href} value={'page ' + l.label} onSelect={() => go(l.href)}><FileText />{tr(l.label)}</CommandItem>)}</CommandGroup>
        {cases.length > 0 && <CommandGroup heading="Cases">{cases.map(c => <CommandItem key={c.id} value={`case ${c.caseNo} ${c.title} ${c.parties} ${c.office} ${userName(c.prosecutorId)}`} onSelect={() => go('/dashboard/cases/' + c.id)}><Briefcase /><span>{c.title}<small className="ws-sub">{c.caseNo} · {c.status}</small></span></CommandItem>)}</CommandGroup>}
        {reports.length > 0 && <CommandGroup heading="Prosecutor reports">{reports.slice(0, 40).map(r => <CommandItem key={r.id} value={`report ${r.period} ${r.periodLabel} ${userName(r.prosecutorId)}`} onSelect={() => go('/dashboard/periodic-reports/' + r.id)}><ClipboardList /><span>{r.period} – {r.periodLabel}<small className="ws-sub">{userName(r.prosecutorId)}</small></span></CommandItem>)}</CommandGroup>}
        <CommandGroup heading="Library">{docs.map(d => <CommandItem key={d.id} value={`doc ${d.title} ${d.author} ${(d.keywords || []).join(' ')}`} onSelect={() => go('/dashboard/library/doc/' + d.id)}><BookOpen /><span>{d.title}<small className="ws-sub">{d.author} · {d.year}</small></span></CommandItem>)}</CommandGroup>
        {can('users.manage') && <CommandGroup heading="People">{data.users.map(u => <CommandItem key={u.id} value={`user ${u.name} ${u.email} ${u.office}`} onSelect={() => go('/dashboard/users')}><User /><span>{u.name}<small className="ws-sub">{u.email}</small></span></CommandItem>)}</CommandGroup>}
        {can('appointments.manage') && <CommandGroup heading="Appointments">{data.appointments.map(a => <CommandItem key={a.id} value={`appointment ${a.code} ${a.name} ${a.phone} ${a.office}`} onSelect={() => go('/dashboard/appointments')}><CalendarCheck /><span>{a.code} – {a.name}<small className="ws-sub">{a.office} · {a.date} {a.time}</small></span></CommandItem>)}</CommandGroup>}
      </CommandList>
    </CommandDialog>
  </>;
}

/* ================= 21/22. Appearance, language & notification preferences ================= */
export function PrefsPanels() {
  const { prefs, actions } = useWS();
  const tr = useTr();
  const set = (p: Partial<UserPrefs>) => { actions.updatePrefs(p); toast.success(tr('Saved')); };
  const notify = { ...defaultPrefs().notify, ...prefs.notify };
  return <>
    <Panel title="Appearance & language">
      <div className="pref-rows">
        <div className="pref-row"><span>{tr('Language')}</span><div className="ws-seg"><button role="radio" aria-checked={prefs.lang === 'en'} onClick={() => set({ lang: 'en' })}>English</button><button role="radio" aria-checked={prefs.lang === 'am'} onClick={() => set({ lang: 'am' })}>አማርኛ</button></div></div>
        <div className="pref-row"><span>{tr('Theme')}</span><div className="ws-seg"><button role="radio" aria-checked={prefs.theme === 'light'} onClick={() => set({ theme: 'light' })}><Sun size={14} /> {tr('Light')}</button><button role="radio" aria-checked={prefs.theme === 'dark'} onClick={() => set({ theme: 'dark' })}><Moon size={14} /> {tr('Dark')}</button></div></div>
        <div className="pref-row"><span>{tr('Text size')}</span><div className="ws-seg">{([100, 112, 125] as const).map(s => <button key={s} role="radio" aria-checked={prefs.textSize === s} onClick={() => set({ textSize: s })} style={{ fontSize: s === 100 ? '.8rem' : s === 112 ? '.92rem' : '1.05rem' }}>A</button>)}</div></div>
      </div>
      <p className="ws-sub">Amharic covers menus, page titles and common labels (draft translation – needs review).</p>
    </Panel>
    <Panel title="Notification preferences">
      <div className="ws-table-wrap"><table className="ws-table compact pref-table"><thead><tr><th>Event</th><th>In app</th><th>Email</th><th>SMS</th><th>Telegram</th></tr></thead><tbody>
        {NOTIFY_EVENTS.map(ev => <tr key={ev}><td>{ev}</td>{(['app', 'email', 'sms', 'telegram'] as const).map(ch => <td key={ch}><input type="checkbox" aria-label={`${ev} by ${ch}`} checked={notify[ev]?.[ch] ?? false} onChange={e => actions.updatePrefs({ notify: { ...notify, [ev]: { ...notify[ev], [ch]: e.target.checked } } })} /></td>)}</tr>)}
      </tbody></table></div>
      <p className="ws-sub">SMS needs your phone number and Telegram needs your chat ID in My profile. Messages are queued now; email, SMS and Telegram delivery start when the gateways are connected on the production server.</p>
    </Panel>
  </>;
}

/* ================= 2 (staff). Legal aid appointments ================= */
export function AppointmentsPage() {
  const { data, actions } = useWS();
  const [status, setStatus] = useState('upcoming'), [office, setOffice] = useState('all'), [sel, setSel] = useState<Appointment | null>(null), [note, setNote] = useState('');
  const today = isoDay(new Date());
  const list = data.appointments.filter(a => (office === 'all' || a.office === office) && (status === 'all' || (status === 'upcoming' ? a.date >= today && ['booked', 'confirmed'].includes(a.status) : a.status === status))).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  const items = data.appointments.filter(a => a.status !== 'cancelled' && (office === 'all' || a.office === office)).map(a => ({ id: a.id, date: a.date, time: a.time, title: `${a.code} ${a.name}`, sub: `${a.office} · ${a.issue}`, tone: (a.status === 'completed' ? 'grey' : a.status === 'confirmed' ? 'teal' : 'gold') as 'gold', onClick: () => { setSel(a); setNote(a.staffNote || ''); } }));
  const setS = (s: Appointment['status']) => { if (!sel) return; actions.updateAppointment(sel.id, { status: s, staffNote: note }); toast.success(`Appointment ${s}`); setSel(null); };
  return <>
    <PageHead eyebrow="CITIZEN SERVICES" title="Legal aid appointments">Bookings made by citizens on the public website. Confirm, complete or cancel them.</PageHead>
    <div className="ws-stats">
      <Stat label="Upcoming" value={data.appointments.filter(a => a.date >= today && ['booked', 'confirmed'].includes(a.status)).length} icon={<CalendarCheck />} />
      <Stat label="Awaiting confirmation" value={data.appointments.filter(a => a.status === 'booked').length} tone="gold" />
      <Stat label="Completed sessions" value={data.appointments.filter(a => a.status === 'completed').length} tone="ink" />
    </div>
    <div className="ws-dash-grid">
      <Panel title="List">
        <div className="ws-filters"><Sel aria-label="Status" value={status} onChange={setStatus} options={[['upcoming', 'Upcoming'], ['booked', 'Booked'], ['confirmed', 'Confirmed'], ['completed', 'Completed'], ['cancelled', 'Cancelled'], ['all', 'All']]} /><Sel aria-label="Office" value={office} onChange={setOffice} options={[['all', 'All offices'], ...OFFICES.map(o => [o, o] as [string, string])]} /></div>
        <div className="ws-table-wrap"><table className="ws-table cards-on-mobile"><thead><tr><th>Citizen</th><th>When</th><th>Office</th><th>Issue</th><th>Status</th></tr></thead><tbody>{list.map(a => <tr key={a.id} className="clickable" onClick={() => { setSel(a); setNote(a.staffNote || ''); }}>
          <td data-label="Citizen"><b>{a.name}</b><small className="ws-sub mono">{a.code} · {a.phone}</small></td><td data-label="When">{fmtDate(a.date + 'T12:00')} {a.time}</td><td data-label="Office">{a.office}</td><td data-label="Issue">{a.issue}</td><td data-label="Status"><StatusPill status={a.status} /></td></tr>)}</tbody></table>{!list.length && <Empty title="No appointments" />}</div>
      </Panel>
      <Panel title="Calendar"><Calendar items={items} views={['month', 'week']} /></Panel>
    </div>
    <Modal open={!!sel} onClose={() => setSel(null)} title={sel ? `Appointment ${sel.code}` : ''} description={sel ? `${sel.name} · ${sel.phone}` : undefined}>
      {sel && <div className="ws-form">
        <dl className="ws-dl"><dt>Office</dt><dd>{sel.office}</dd><dt>When</dt><dd>{fmtDate(sel.date + 'T12:00')} {sel.time}</dd><dt>Issue</dt><dd>{sel.issue}</dd><dt>Details</dt><dd>{sel.details || '—'}</dd><dt>Status</dt><dd><StatusPill status={sel.status} /></dd><dt>Booked</dt><dd>{ago(sel.createdAt)}</dd></dl>
        <F label="Staff note"><textarea className="ws-input" rows={2} value={note} onChange={e => setNote(e.target.value)} /></F>
        <div className="ws-form-actions"><button className="ws-btn danger ghost" onClick={() => setS('cancelled')}>Cancel</button>{sel.status === 'booked' && <button className="ws-btn ghost" onClick={() => setS('confirmed')}>Confirm</button>}<button className="ws-btn" onClick={() => setS('completed')}>Mark completed</button></div>
      </div>}
    </Modal>
  </>;
}

/* ================= 5/6 (staff). Events & ratings ================= */
export function EventsAdminPage() {
  const { data, actions } = useWS();
  const [edit, setEdit] = useState<Partial<PublicEvent> | null>(null);
  const today = isoDay(new Date());
  const services = Array.from(new Set(data.ratings.map(r => r.service)));
  const byService = services.map(s => { const rs = data.ratings.filter(r => r.service === s); return { name: s, average: +(rs.reduce((t, r) => t + r.stars, 0) / rs.length).toFixed(2) }; });
  const avg = data.ratings.length ? (data.ratings.reduce((s, r) => s + r.stars, 0) / data.ratings.length).toFixed(1) : '–';
  return <>
    <PageHead eyebrow="CITIZEN SERVICES" title="Events & ratings" actions={<button className="ws-btn" onClick={() => setEdit({ date: isoDay(new Date(Date.now() + 7 * 864e5)), time: '09:00', type: 'Legal awareness', office: OFFICES[0], place: '', title: '', description: '' })}><Plus size={16} />Add event</button>}>Public events shown on the website calendar, and citizen service ratings.</PageHead>
    <div className="ws-stats"><Stat label="Upcoming events" value={data.events.filter(e => e.date >= today).length} icon={<CalendarDays />} /><Stat label="Citizen satisfaction" value={avg + ' / 5'} tone="gold" icon={<Star />} hint={`${data.ratings.length} ratings`} /></div>
    <div className="ws-dash-grid">
      <Panel title="Events"><DataTable head={['Date', 'Event', 'Type', '']} empty={!data.events.length}>{[...data.events].sort((a, b) => b.date.localeCompare(a.date)).map(e => <tr key={e.id}><td className="nowrap">{fmtDate(e.date + 'T12:00')} {e.time}</td><td><b>{e.title}</b><small className="ws-sub">{e.place}</small></td><td>{e.type}</td><td className="ws-row-actions"><button aria-label="Edit" onClick={() => setEdit(e)}>Edit</button><button aria-label="Delete" onClick={() => { actions.deleteEvent(e.id); toast.success('Event deleted'); }}><Trash2 size={15} /></button></td></tr>)}</DataTable></Panel>
      <div>
        <ChartCard title="Average rating by service" data={byService} xKey="name" kind="hbar" series={[{ key: 'average', label: 'Average stars', color: SLOT[2] }]} />
        <Panel title="Latest comments"><ul className="ws-feed">{data.ratings.filter(r => r.comment).slice(0, 8).map(r => <li key={r.id}><Star size={14} /><div>{'★'.repeat(r.stars)}<span className="ws-sub"> · {r.service} · {r.office}</span><p>{r.comment}</p><small>{ago(r.at)}</small></div></li>)}</ul></Panel>
      </div>
    </div>
    <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? 'Edit event' : 'Add event'}>
      {edit && <form className="ws-form" onSubmit={e => { e.preventDefault(); actions.saveEvent(edit as PublicEvent); toast.success('Event saved'); setEdit(null); }}>
        <F label="Title"><input className="ws-input" required value={edit.title || ''} onChange={e => setEdit({ ...edit, title: e.target.value })} /></F>
        <div className="ws-grid2"><F label="Date"><input className="ws-input" type="date" required value={edit.date || ''} onChange={e => setEdit({ ...edit, date: e.target.value })} /></F><F label="Time"><input className="ws-input" type="time" value={edit.time || ''} onChange={e => setEdit({ ...edit, time: e.target.value })} /></F>
          <F label="Type"><Sel value={edit.type || 'Legal awareness'} onChange={v => setEdit({ ...edit, type: v as PublicEvent['type'] })} options={['Legal awareness', 'Public hearing', 'Community dialogue', 'Training']} /></F><F label="Office"><Sel value={edit.office || OFFICES[0]} onChange={v => setEdit({ ...edit, office: v })} options={OFFICES} /></F>
          <F label="Place" wide><input className="ws-input" required value={edit.place || ''} onChange={e => setEdit({ ...edit, place: e.target.value })} /></F><F label="Description" wide><textarea className="ws-input" rows={2} value={edit.description || ''} onChange={e => setEdit({ ...edit, description: e.target.value })} /></F></div>
        <div className="ws-form-actions"><button className="ws-btn">Save event</button></div>
      </form>}
    </Modal>
  </>;
}

/* ================= 24. System health ================= */
export function SystemHealthPage() {
  const { data, actions } = useWS();
  const [ai, setAi] = useState<{ usageToday?: number; dailyLimit?: number; enabled?: boolean; provider?: string } | null>(null);
  const [storage, setStorage] = useState<{ usage?: number; quota?: number; local: number } | null>(null);
  const [online, setOnline] = useState(true);
  useEffect(() => {
    fetch('/api/ai/settings').then(r => r.json()).then(j => setAi({ usageToday: j.usageToday, dailyLimit: j.dailyLimit, enabled: j.enabled, provider: j.providers?.[j.provider]?.label })).catch(() => setAi({}));
    let local = 0; try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i)!; local += (localStorage.getItem(k) || '').length * 2; } } catch { /* ignore */ }
    (navigator.storage?.estimate?.() || Promise.resolve({} as StorageEstimate)).then(e => setStorage({ usage: e.usage, quota: e.quota, local })).catch(() => setStorage({ local }));
    setOnline(navigator.onLine);
  }, []);
  const days = 14, since = Date.now() - days * 864e5;
  const logins = data.audit.filter(a => a.action === 'Signed in' && new Date(a.at).getTime() > since);
  const failed = data.audit.filter(a => a.action.startsWith('Failed sign-in') && new Date(a.at).getTime() > since);
  const perDay = useMemo(() => Array.from({ length: 7 }, (_, i) => { const d = isoDay(new Date(Date.now() - (6 - i) * 864e5)); return { name: new Date(d + 'T12:00').toLocaleDateString('en-GB', { weekday: 'short' }), logins: data.audit.filter(a => a.action === 'Signed in' && a.at.startsWith(d)).length, failed: data.audit.filter(a => a.action.startsWith('Failed sign-in') && a.at.startsWith(d)).length }; }), [data.audit]);
  const mb = (b?: number) => (b === undefined ? '–' : b > 1048576 ? (b / 1048576).toFixed(1) + ' MB' : Math.round(b / 1024) + ' KB');
  const backupAge = data.lastBackupAt ? Math.floor((Date.now() - new Date(data.lastBackupAt).getTime()) / 864e5) : null;
  return <>
    <PageHead eyebrow="SUPER ADMIN" title="System health">AI usage, storage, sign-ins and backups at a glance.</PageHead>
    <div className="ws-stats">
      <Stat label="AI summaries today" value={ai ? `${ai.usageToday ?? 0}${ai.dailyLimit ? ' / ' + ai.dailyLimit : ''}` : '…'} icon={<Sparkles />} hint={ai?.enabled ? ai.provider : 'AI not configured'} href="/dashboard/settings" />
      <Stat label="Storage used (this device)" value={mb(storage?.usage)} icon={<HardDrive />} hint={storage?.quota ? `of ${mb(storage.quota)} available · data ${mb(storage.local)}` : ''} tone="ink" />
      <Stat label={`Sign-ins (${days} days)`} value={logins.length} icon={<LogIn />} hint={`${new Set(logins.map(l => l.by)).size} different users`} />
      <Stat label={`Failed sign-ins (${days} days)`} value={failed.length} tone={failed.length > 5 ? 'red' : 'gold'} icon={<ShieldAlert />} href="/dashboard/audit" />
      <Stat label="Last backup" value={backupAge === null ? 'Never' : backupAge === 0 ? 'Today' : backupAge + ' d ago'} tone={backupAge === null || backupAge > 7 ? 'red' : 'teal'} icon={<Database />} />
      <Stat label="Connection" value={online ? 'Online' : 'Offline'} tone={online ? 'teal' : 'red'} icon={online ? <Activity /> : <WifiOff />} />
    </div>
    <div className="viz-grid">
      <ChartCard title="Sign-ins in the last 7 days" data={perDay} xKey="name" series={[{ key: 'logins', label: 'Successful' }, { key: 'failed', label: 'Failed', color: 'var(--viz-critical)' }]} />
      <Panel title="Backup & restore">
        <p className="ws-sub">Download a full backup of all portal data (cases, library records, users, settings). Store it safely – it contains personal data. Uploaded files are kept separately.</p>
        <div className="ws-form-actions" style={{ justifyContent: 'flex-start' }}>
          <button className="ws-btn" onClick={() => { const json = actions.exportBackup(); const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([json], { type: 'application/json' })); a.download = `south-omo-portal-backup-${isoDay(new Date())}.json`; a.click(); toast.success('Backup downloaded'); }}><Download size={16} />Download backup</button>
          <label className="ws-btn ghost"><Upload size={16} />Restore from file<input type="file" accept="application/json" hidden onChange={async e => { const f = e.target.files?.[0]; if (!f) return; if (!confirm('Replace all current data with this backup?')) return; const r = actions.importBackup(await f.text()); if (r.ok) toast.success('Backup restored'); else toast.error(r.error); }} /></label>
        </div>
        <h3 className="ws-h3">Recent failed sign-ins</h3>
        {failed.length ? <ul className="ws-feed">{failed.slice(0, 6).map(a => <li key={a.id}><KeyRound size={14} /><div>{a.action.replace('Failed sign-in attempt for ', '')}<small>{fmtDateTime(a.at)}</small></div></li>)}</ul> : <p className="ws-sub">None</p>}
        <Pill tone="grey">Production: also monitor server uptime, database backups and disk space in cPanel.</Pill>
      </Panel>
    </div>
  </>;
}

/* ================= 23. Offline indicator & PWA registration ================= */
export function OfflineBanner() {
  const [online, setOnline] = useState(true);
  useEffect(() => { setOnline(navigator.onLine); const on = () => setOnline(true), off = () => setOnline(false); window.addEventListener('online', on); window.addEventListener('offline', off); return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); }; }, []);
  if (online) return null;
  return <div className="ws-offline" role="status"><WifiOff size={16} />You are offline. You can keep working – drafts and changes are saved on this device.</div>;
}
