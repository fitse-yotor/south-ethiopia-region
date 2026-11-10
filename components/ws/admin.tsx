'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Bell, CheckCheck, KeyRound, Pencil, Plus, Save, Search, ShieldCheck, Trash2, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { useWS } from '@/lib/ws/store';
import { AiSettingsPanel } from './ai-settings';
import { PrefsPanels } from './system';
import { PERMISSIONS, type Permission, type Role, type User } from '@/lib/ws/types';
import { REGION_ID, REGION_NAME, ZONES, woredasOfZone, zoneOfWoreda, type Scope } from '@/lib/ws/org';
import { Avatar, DataTable, Empty, F, Modal, PageHead, Panel, Pill, Sel, StatusPill, ago, fmtDate, fmtDateTime } from './ui';

/* ---------------- Users ---------------- */
export function UsersPage() {
  const { data, actions, user: me } = useWS();
  const [q, setQ] = useState(''), [role, setRole] = useState('all'), [status, setStatus] = useState('all');
  const [edit, setEdit] = useState<Partial<User> | null>(null);
  const list = data.users.filter(u => (role === 'all' || u.roleId === role) && (status === 'all' || u.status === status) && (u.name + u.email + u.office).toLowerCase().includes(q.toLowerCase()));
  const roleName = (id: string) => data.roles.find(r => r.id === id)?.name || '—';
  return <>
    <PageHead eyebrow="SUPER ADMIN" title="Users" actions={<button className="ws-btn" onClick={() => setEdit({ name: '', email: '', phone: '', roleId: 'prosecutor', office: '—', scope: undefined, status: 'active', password: 'Demo@123' })}><UserPlus size={16} />Create user</button>}>
      Create accounts, assign roles and offices, deactivate access and reset passwords.
    </PageHead>
    <div className="ws-chips">{[['all', 'All roles'], ...data.roles.map(r => [r.id, r.name])].map(([id, n]) => <button key={id} aria-pressed={role === id} onClick={() => setRole(id)}>{n}<em>{id === 'all' ? data.users.length : data.users.filter(u => u.roleId === id).length}</em></button>)}</div>
    <Panel>
      <div className="ws-filters"><div className="lib-search"><Search size={16} /><input placeholder="Search name, email or office" value={q} onChange={e => setQ(e.target.value)} /></div><Sel aria-label="Status" value={status} onChange={setStatus} options={[['all', 'All statuses'], ['active', 'Active'], ['inactive', 'Inactive']]} /></div>
      <div className="ws-table-wrap"><table className="ws-table cards-on-mobile">
        <thead><tr><th>User</th><th>Role</th><th>Office</th><th>Status</th><th>Last login</th><th></th></tr></thead>
        <tbody>{list.map(u => <tr key={u.id}>
          <td data-label="User"><div className="ws-user-cell"><Avatar name={u.name} size={32} /><span><b>{u.name}</b><small>{u.email}</small></span></div></td>
          <td data-label="Role"><Pill tone={u.roleId === 'super-admin' ? 'red' : u.roleId === 'researcher' ? 'blue' : 'teal'}>{roleName(u.roleId)}</Pill></td>
          <td data-label="Office">{u.roleId === 'researcher' ? u.institution : u.office}</td>
          <td data-label="Status"><StatusPill status={u.status} /></td>
          <td data-label="Last login">{u.lastLogin ? ago(u.lastLogin) : 'Never'}</td>
          <td className="ws-row-actions"><button aria-label="Edit" title="Edit" onClick={() => setEdit(u)}><Pencil size={16} /></button><button title="Reset password to Demo@123" aria-label="Reset password" onClick={() => { actions.resetPassword(u.id); toast.success('Password reset to Demo@123'); }}><KeyRound size={16} /></button>
            {u.id !== me!.id && <button className="ws-text-btn" onClick={() => { actions.setUserStatus(u.id, u.status === 'active' ? 'inactive' : 'active'); toast.success(u.status === 'active' ? 'User deactivated' : 'User activated'); }}>{u.status === 'active' ? 'Deactivate' : 'Activate'}</button>}</td>
        </tr>)}</tbody>
      </table>{!list.length && <Empty title="No users match" />}</div>
    </Panel>
    <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? 'Edit user' : 'Create user'} description="The role decides which menus, pages, actions and reports the user sees." wide>
      {edit && <form className="ws-form" onSubmit={e => { e.preventDefault(); const r = actions.saveUser(edit); if (r.ok) { toast.success(edit.id ? 'User updated' : 'User created'); setEdit(null); } else toast.error(r.error); }}>
        <div className="ws-grid2">
          <F label="Full name"><input className="ws-input" required value={edit.name || ''} onChange={e => setEdit({ ...edit, name: e.target.value })} /></F>
          <F label="Email"><input className="ws-input" type="email" required value={edit.email || ''} onChange={e => setEdit({ ...edit, email: e.target.value })} /></F>
          <F label="Phone"><input className="ws-input" value={edit.phone || ''} onChange={e => setEdit({ ...edit, phone: e.target.value })} /></F>
          <F label="Role"><Sel value={edit.roleId || ''} onChange={v => setEdit({ ...edit, roleId: v })} options={data.roles.map(r => [r.id, r.name] as [string, string])} /></F>
          <ScopePicker value={edit.scope} onChange={s => setEdit({ ...edit, scope: s })} />
          <F label="Status"><Sel value={edit.status || 'active'} onChange={v => setEdit({ ...edit, status: v as User['status'] })} options={[['active', 'Active'], ['inactive', 'Inactive']]} /></F>
          {!edit.id && <F label="Initial password" hint="User can change it from My profile"><input className="ws-input" value={edit.password || ''} onChange={e => setEdit({ ...edit, password: e.target.value })} /></F>}
        </div>
        <div className="ws-perm-preview"><ShieldCheck size={16} /><span>{data.roles.find(r => r.id === edit.roleId)?.description}</span></div>
        <div className="ws-form-actions"><button type="button" className="ws-btn ghost" onClick={() => setEdit(null)}>Cancel</button><button className="ws-btn"><Save size={16} />{edit.id ? 'Save changes' : 'Create user'}</button></div>
      </form>}
    </Modal>
  </>;
}

/* ---------------- Roles ---------------- */
export function RolesPage() {
  const { data, actions } = useWS();
  const [sel, setSel] = useState(data.roles[0].id);
  const [draft, setDraft] = useState<Role | null>(null);
  const role = draft || data.roles.find(r => r.id === sel)!;
  const groups = Array.from(new Set(PERMISSIONS.map(p => p.group)));
  const toggle = (p: Permission) => setDraft({ ...role, permissions: role.permissions.includes(p) ? role.permissions.filter(x => x !== p) : [...role.permissions, p] });
  const locked = role.id === 'super-admin';
  return <>
    <PageHead eyebrow="SUPER ADMIN" title="Roles & permissions" actions={<button className="ws-btn" onClick={() => { const r: Role = { id: 'role-' + Date.now().toString(36), name: 'New role', description: '', permissions: ['reports.own'] }; setDraft(r); setSel(r.id); }}><Plus size={16} />New role</button>}>
      Choose a role and tick what it may do. Menus, pages, actions and reports follow these permissions.
    </PageHead>
    <div className="ws-roles">
      <aside className="ws-role-list">{[...data.roles, ...(draft && !data.roles.some(r => r.id === draft.id) ? [draft] : [])].map(r => <button key={r.id} aria-pressed={r.id === sel} onClick={() => { setDraft(null); setSel(r.id); }}><b>{r.name}</b><small>{data.users.filter(u => u.roleId === r.id).length} users · {r.permissions.length} permissions</small></button>)}</aside>
      <Panel className="ws-role-edit">
        <div className="ws-grid2">
          <F label="Role name"><input className="ws-input" value={role.name} disabled={locked} onChange={e => setDraft({ ...role, name: e.target.value })} /></F>
          <F label="Description"><input className="ws-input" value={role.description} onChange={e => setDraft({ ...role, description: e.target.value })} /></F>
        </div>
        {locked && <p className="ws-note">The Super Admin role always has every permission.</p>}
        <div className="ws-perm-grid">{groups.map(g => <fieldset key={g}><legend>{g}</legend>{PERMISSIONS.filter(p => p.group === g).map(p => <label key={p.key} className="ws-check"><input type="checkbox" disabled={locked} checked={role.permissions.includes(p.key)} onChange={() => toggle(p.key)} />{p.label}<code>{p.key}</code></label>)}</fieldset>)}</div>
        <div className="ws-form-actions">
          {!role.system && data.roles.some(r => r.id === role.id) && <button className="ws-btn danger ghost" onClick={() => { const r = actions.deleteRole(role.id); if (r.ok) { toast.success('Role deleted'); setSel(data.roles[0].id); setDraft(null); } else toast.error(r.error); }}><Trash2 size={16} />Delete role</button>}
          <button className="ws-btn" disabled={!draft} onClick={() => { actions.saveRole(role); setDraft(null); toast.success('Role saved'); }}><Save size={16} />Save role</button>
        </div>
      </Panel>
    </div>
    <Panel title="Permission matrix">
      <div className="ws-table-wrap"><table className="ws-table matrix"><thead><tr><th>Permission</th>{data.roles.map(r => <th key={r.id}>{r.name}</th>)}</tr></thead>
        <tbody>{PERMISSIONS.map(p => <tr key={p.key}><td>{p.label}</td>{data.roles.map(r => <td key={r.id}>{r.permissions.includes(p.key) ? <span className="yes">✓</span> : <span className="no">·</span>}</td>)}</tr>)}</tbody></table></div>
    </Panel>
  </>;
}

/* ---------------- Audit ---------------- */
export function AuditPage() {
  const { data, userName } = useWS();
  const [q, setQ] = useState(''), [who, setWho] = useState('all');
  const list = data.audit.filter(a => (who === 'all' || a.by === who) && a.action.toLowerCase().includes(q.toLowerCase()));
  return <>
    <PageHead eyebrow="SUPER ADMIN" title="Audit log">Every create, update, approval and sign-in is recorded. Export it from Reports & export.</PageHead>
    <Panel>
      <div className="ws-filters"><div className="lib-search"><Search size={16} /><input placeholder="Search actions" value={q} onChange={e => setQ(e.target.value)} /></div><Sel aria-label="User" value={who} onChange={setWho} options={[['all', 'All users'], ...data.users.map(u => [u.id, u.name] as [string, string])]} /></div>
      <DataTable head={['When', 'User', 'Role', 'Action']} empty={!list.length}>{list.slice(0, 200).map(a => <tr key={a.id}><td className="nowrap">{fmtDateTime(a.at)}</td><td>{userName(a.by)}</td><td>{data.roles.find(r => r.id === data.users.find(u => u.id === a.by)?.roleId)?.name}</td><td>{a.action}</td></tr>)}</DataTable>
    </Panel>
  </>;
}

/* ---------------- Settings ---------------- */
export function SettingsPage() {
  const { data, actions } = useWS();
  const [s, setS] = useState(data.settings);
  return <>
    <PageHead eyebrow="SUPER ADMIN" title="System settings">Library fee, Telebirr merchant details, SLA alert thresholds and AI summaries.</PageHead>
    <form className="ws-dash-grid" onSubmit={e => { e.preventDefault(); actions.saveSettings(s); toast.success('Settings saved'); }}>
      <Panel title="Digital library">
        <div className="ws-grid2">
          <F label="Researcher access fee (ETB)"><input className="ws-input" type="number" min={0} value={s.libraryFee} onChange={e => setS({ ...s, libraryFee: +e.target.value })} /></F>
          <F label="Access validity (days)"><input className="ws-input" type="number" min={1} value={s.accessDays} onChange={e => setS({ ...s, accessDays: +e.target.value })} /></F>
          <F label="Telebirr merchant short code"><input className="ws-input mono" value={s.telebirrCode} onChange={e => setS({ ...s, telebirrCode: e.target.value })} /></F>
          <F label="Telebirr merchant name"><input className="ws-input" value={s.telebirrName} onChange={e => setS({ ...s, telebirrName: e.target.value })} /></F>
        </div>
      </Panel>
      <Panel title="Organization & SLA">
        <div className="ws-grid2">
          <F label="Organization name" wide><input className="ws-input" value={s.orgName} onChange={e => setS({ ...s, orgName: e.target.value })} /></F>
          <F label="“Due soon” warning (days before SLA)"><input className="ws-input" type="number" min={1} value={s.dueSoonDays} onChange={e => setS({ ...s, dueSoonDays: +e.target.value })} /></F>
        </div>
        <p className="ws-sub">SLA days per case category are set by the Woreda Coordinator under <Link href="/dashboard/sla">SLA by category</Link>.</p>
        <button className="ws-btn"><Save size={16} />Save settings</button>
      </Panel>
    </form>
    <AiSettingsPanel />
  </>;
}

/* ---------------- Profile ---------------- */
export function ProfilePage() {
  const { user, role, actions, data } = useWS();
  const [p, setP] = useState({ name: user!.name, phone: user!.phone, telegramChatId: user!.telegramChatId || '' });
  const [pw, setPw] = useState({ cur: '', next: '', confirm: '' });
  return <>
    <PageHead eyebrow="MY ACCOUNT" title="My profile" />
    <div className="ws-dash-grid">
      <Panel title="Profile">
        <div className="ws-profile"><Avatar name={user!.name} size={64} /><div><b>{user!.name}</b><small>{user!.email}</small><Pill tone="teal">{role?.name}</Pill></div></div>
        <form className="ws-form" onSubmit={e => { e.preventDefault(); actions.updateProfile(p); toast.success('Profile updated'); }}>
          <div className="ws-grid2"><F label="Full name"><input className="ws-input" value={p.name} onChange={e => setP({ ...p, name: e.target.value })} /></F><F label="Phone"><input className="ws-input" value={p.phone} onChange={e => setP({ ...p, phone: e.target.value })} /></F>
            <F label="Telegram chat ID" hint="For Telegram alerts: message the portal's bot to get your ID"><input className="ws-input" value={p.telegramChatId} onChange={e => setP({ ...p, telegramChatId: e.target.value })} placeholder="e.g. 123456789" /></F>
            <F label="Office"><input className="ws-input" disabled value={user!.institution || user!.office} /></F><F label="Member since"><input className="ws-input" disabled value={fmtDate(user!.createdAt)} /></F></div>
          <button className="ws-btn"><Save size={16} />Save profile</button>
        </form>
      </Panel>
      <Panel title="Change password">
        <form className="ws-form" onSubmit={e => { e.preventDefault(); if (pw.next !== pw.confirm) return toast.error('Passwords do not match'); const r = actions.changePassword(pw.cur, pw.next); if (r.ok) { toast.success('Password changed'); setPw({ cur: '', next: '', confirm: '' }); } else toast.error(r.error); }}>
          <F label="Current password"><input className="ws-input" type="password" value={pw.cur} onChange={e => setPw({ ...pw, cur: e.target.value })} /></F>
          <F label="New password"><input className="ws-input" type="password" value={pw.next} onChange={e => setPw({ ...pw, next: e.target.value })} /></F>
          <F label="Confirm new password"><input className="ws-input" type="password" value={pw.confirm} onChange={e => setPw({ ...pw, confirm: e.target.value })} /></F>
          <button className="ws-btn"><KeyRound size={16} />Change password</button>
        </form>
      </Panel>
      {user!.roleId === 'researcher' && <ResearcherFields />}
      <PrefsPanels />
      <Panel title="My permissions"><ul className="ws-perm-list">{PERMISSIONS.filter(x => role?.permissions.includes(x.key)).map(x => <li key={x.key}><ShieldCheck size={14} />{x.label}</li>)}</ul></Panel>
      <Panel title="My recent activity"><ul className="ws-feed">{data.audit.filter(a => a.by === user!.id).slice(0, 8).map(a => <li key={a.id}><span className="dot" /><div>{a.action}<small>{ago(a.at)}</small></div></li>)}</ul></Panel>
    </div>
  </>;
}

/* ---------------- Notifications ---------------- */
export function NotificationsPage() {
  const { data, user, actions } = useWS();
  const list = data.notifications.filter(n => n.userId === user!.id).sort((a, b) => b.at.localeCompare(a.at));
  return <>
    <PageHead eyebrow="MY ACCOUNT" title="Notifications" actions={list.some(n => !n.read) ? <button className="ws-btn ghost" onClick={() => actions.markRead()}><CheckCheck size={16} />Mark all read</button> : undefined} />
    <Panel>{list.length ? <ul className="ws-notes">{list.map(n => <li key={n.id} className={n.read ? '' : 'unread'}><Bell size={18} /><Link href={n.link} onClick={() => actions.markRead(n.id)}>{n.text}<small>{fmtDateTime(n.at)} · {ago(n.at)}</small></Link></li>)}</ul> : <Empty title="You are all caught up" icon={<Bell size={30} />} />}</Panel>
  </>;
}

function ResearcherFields() {
  const { user, actions } = useWS();
  const [f, setF] = useState({ researchArea: user!.researchArea || '', bio: user!.bio || '' });
  return <Panel title="Public researcher profile" actions={<Link className="ws-link" href={'/dashboard/researchers/' + user!.id}>View profile</Link>}>
    <form className="ws-form" onSubmit={e => { e.preventDefault(); actions.updateProfileExtra(f); toast.success('Profile updated'); }}>
      <F label="Research area"><input className="ws-input" value={f.researchArea} onChange={e => setF({ ...f, researchArea: e.target.value })} placeholder="e.g. Customary law, juvenile justice" /></F>
      <F label="Short bio"><textarea className="ws-input" rows={3} value={f.bio} onChange={e => setF({ ...f, bio: e.target.value })} /></F>
      <button className="ws-btn"><Save size={16} />Save</button>
    </form>
  </Panel>;
}

/** Region -> Zone -> Woreda picker. The chosen level decides what the user can see. */
function ScopePicker({ value, onChange }: { value?: Scope; onChange: (s: Scope | undefined) => void }) {
  const level = value?.level || 'none';
  const zoneId = value ? (value.level === 'zone' ? value.id : value.level === 'woreda' ? zoneOfWoreda(value.id)?.id : undefined) || ZONES[0].id : ZONES[0].id;
  return <>
    <F label="Works at" hint="Region: sees everything. Zone: sees its woredas. Woreda: sees only its own woreda."><Sel value={level} onChange={v => onChange(v === 'none' ? undefined : v === 'region' ? { level: 'region', id: REGION_ID } : v === 'zone' ? { level: 'zone', id: zoneId } : { level: 'woreda', id: woredasOfZone(zoneId)[0].id })}
      options={[['none', 'No office (researcher)'], ['region', REGION_NAME], ['zone', 'A zone'], ['woreda', 'A woreda']]} /></F>
    {(level === 'zone' || level === 'woreda') && <F label="Zone"><Sel value={zoneId} onChange={z => onChange(level === 'zone' ? { level: 'zone', id: z } : { level: 'woreda', id: woredasOfZone(z)[0].id })} options={ZONES.map(z => [z.id, z.name] as [string, string])} /></F>}
    {level === 'woreda' && value && <F label="Woreda"><Sel value={value.id} onChange={w => onChange({ level: 'woreda', id: w })} options={woredasOfZone(zoneId).map(w => [w.id, w.name] as [string, string])} /></F>}
  </>;
}
