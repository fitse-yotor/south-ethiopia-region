'use client';
import { useMemo, useState } from 'react';
import { ArrowRightLeft, Building2, Search, UserPlus, UserRoundCheck } from 'lucide-react';
import { toast } from 'sonner';
import { useWS } from '@/lib/ws/store';
import { WOREDAS, ZONES, unitName, woredasOfZone, zoneOfWoreda } from '@/lib/ws/org';
import { openCasesOf, waitingProsecutors, woredaStaffing } from '@/lib/ws/staffing';
import type { User } from '@/lib/ws/types';
import { Empty, F, Modal, PageHead, Panel, Pill, Sel } from './ui';

const LIMIT = 40;

/** Region: create woreda accounts and post prosecutors to every woreda. */
export function StaffingPage() {
  const { data, actions } = useWS();
  const [zone, setZone] = useState('all'), [q, setQ] = useState(''), [gaps, setGaps] = useState(false), [showAll, setShowAll] = useState(false);
  const [create, setCreate] = useState<{ woredaId: string; roleId: 'woreda-coordinator' | 'prosecutor' } | null>(null);
  const [form, setForm] = useState({ name: '', email: '', phone: '' });
  const [post, setPost] = useState<{ userId?: string; woredaId?: string } | null>(null);
  const [pz, setPz] = useState(ZONES[0].id), [pw, setPw] = useState(''), [pu, setPu] = useState('');

  const prosecutors = data.users.filter(u => u.roleId === 'prosecutor' && u.status === 'active');
  const waiting = waitingProsecutors(data);
  const rows = useMemo(() => WOREDAS.map(w => ({ w, z: zoneOfWoreda(w.id)!, s: woredaStaffing(data, w.id) })), [data]);
  const withCoordinator = rows.filter(r => r.s.coordinators.some(c => c.status === 'active')).length;
  const shown = rows.filter(r => (zone === 'all' || r.z.id === zone) && (!gaps || !r.s.coordinators.some(c => c.status === 'active')) && (r.w.name + ' ' + r.z.name).toLowerCase().includes(q.toLowerCase()));
  const list = showAll ? shown : shown.slice(0, LIMIT);

  const openPost = (p: { userId?: string; woredaId?: string }) => {
    const w = p.woredaId || WOREDAS[0].id;
    setPz(zoneOfWoreda(w)?.id || ZONES[0].id); setPw(p.woredaId || ''); setPu(p.userId || ''); setPost(p);
  };
  const submitCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const r = actions.createWoredaAccount({ ...form, ...create! });
    if (r.ok) { toast.success('Account created. Initial password: Demo@123 – the person should change it at first sign-in.'); setCreate(null); setForm({ name: '', email: '', phone: '' }); } else toast.error(r.error);
  };
  const submitPost = (e: React.FormEvent) => {
    e.preventDefault();
    const r = actions.postProsecutor(pu, pw);
    if (r.ok) { toast.success('Prosecutor posted'); setPost(null); } else toast.error(r.error);
  };
  const person = (u: User) => <span key={u.id} className={'stf-person' + (u.status !== 'active' ? ' off' : '')}>{u.name}</span>;

  return <>
    <PageHead eyebrow="REGION" title="Staffing & woreda accounts">
      Create the accounts of every woreda and post prosecutors to the woredas that need them. Cases are then registered and assigned inside each woreda by its Woreda Coordinator.
    </PageHead>

    <div className="ws-stats">
      <div className="ws-stat"><span className="ws-stat-icon"><Building2 /></span><span className="ws-stat-label">Woredas with a coordinator</span><strong>{withCoordinator}<small> / {rows.length}</small></strong></div>
      <div className="ws-stat tone-red"><span className="ws-stat-label">Woredas without a coordinator</span><strong>{rows.length - withCoordinator}</strong></div>
      <div className="ws-stat tone-ink"><span className="ws-stat-icon"><UserRoundCheck /></span><span className="ws-stat-label">Active prosecutors</span><strong>{prosecutors.length}</strong></div>
      <div className="ws-stat tone-gold"><span className="ws-stat-label">Waiting for a posting</span><strong>{waiting.length}</strong></div>
    </div>

    {waiting.length > 0 && <Panel title="Prosecutors waiting for a posting">
      <ul className="ws-list">{waiting.map(u => <li key={u.id}><div><b>{u.name}</b><small>{u.email}</small></div><button className="ws-btn sm" onClick={() => openPost({ userId: u.id })}><ArrowRightLeft size={14} />Post to a woreda</button></li>)}</ul>
    </Panel>}

    <Panel title="Woreda accounts">
      <div className="ws-filters">
        <div className="lib-search"><Search size={16} /><input placeholder="Search woreda or zone" value={q} onChange={e => { setQ(e.target.value); setShowAll(false); }} /></div>
        <Sel aria-label="Zone" value={zone} onChange={v => { setZone(v); setShowAll(false); }} options={[['all', 'All zones'], ...ZONES.map(z => [z.id, z.name] as [string, string])]} />
        <label className="ws-check"><input type="checkbox" checked={gaps} onChange={e => { setGaps(e.target.checked); setShowAll(false); }} />Only woredas without a coordinator</label>
      </div>
      <div className="ws-table-wrap"><table className="ws-table cards-on-mobile">
        <thead><tr><th>Woreda</th><th>Coordinator</th><th>Prosecutors</th><th>Open cases</th><th></th></tr></thead>
        <tbody>{list.map(({ w, z, s }) => <tr key={w.id}>
          <td data-label="Woreda"><b>{w.name}</b><small className="ws-sub">{z.name}</small></td>
          <td data-label="Coordinator">{s.coordinators.length ? s.coordinators.map(c => <span key={c.id} className="stf-person-row">{person(c)}<small className="ws-sub">{c.email}</small>
            <button className="ws-text-btn" onClick={() => { const r = actions.setStaffStatus(c.id, c.status === 'active' ? 'inactive' : 'active'); if (!r.ok) toast.error(r.error); }}>{c.status === 'active' ? 'Deactivate' : 'Activate'}</button></span>) : <Pill tone="red">No account</Pill>}</td>
          <td data-label="Prosecutors">{s.prosecutors.length ? <span className="stf-people">{s.prosecutors.map(person)}</span> : <span className="ws-sub">none</span>}</td>
          <td data-label="Open cases">{s.openCases || '–'}</td>
          <td className="ws-row-actions stf-actions">
            <button className="ws-btn sm ghost" onClick={() => { setForm({ name: '', email: '', phone: '' }); setCreate({ woredaId: w.id, roleId: 'woreda-coordinator' }); }}><UserPlus size={14} />Coordinator</button>
            <button className="ws-btn sm ghost" onClick={() => { setForm({ name: '', email: '', phone: '' }); setCreate({ woredaId: w.id, roleId: 'prosecutor' }); }}><UserPlus size={14} />Prosecutor</button>
            <button className="ws-btn sm" onClick={() => openPost({ woredaId: w.id })}><ArrowRightLeft size={14} />Post</button>
          </td>
        </tr>)}</tbody>
      </table>{!shown.length && <Empty title="No woredas match">Change the search or filters.</Empty>}</div>
      {!showAll && shown.length > LIMIT && <button className="ws-btn ghost" onClick={() => setShowAll(true)}>Show all {shown.length} woredas</button>}
    </Panel>

    <Panel title="All prosecutors">
      <div className="ws-table-wrap"><table className="ws-table compact"><thead><tr><th>Prosecutor</th><th>Woreda</th><th>Zone</th><th>Open cases</th><th></th></tr></thead>
        <tbody>{prosecutors.map(u => { const open = openCasesOf(data, u.id).length; return <tr key={u.id}>
          <td><b>{u.name}</b><small className="ws-sub">{u.email}</small></td>
          <td>{u.scope ? unitName(u.scope.id) : <Pill tone="gold">Not posted</Pill>}</td>
          <td>{u.scope ? unitName(zoneOfWoreda(u.scope.id)?.id) : '–'}</td>
          <td>{open || '–'}</td>
          <td className="ws-row-actions"><button className="ws-btn sm ghost" onClick={() => openPost({ userId: u.id })}><ArrowRightLeft size={14} />{u.scope ? 'Move' : 'Post'}</button></td>
        </tr>; })}</tbody></table></div>
      <p className="ws-sub">A prosecutor with open cases cannot be moved: the Woreda Coordinator reassigns those cases first, because cases stay with the woreda.</p>
    </Panel>

    <Modal open={!!create} onClose={() => setCreate(null)} title={create?.roleId === 'prosecutor' ? 'New prosecutor account' : 'New Woreda Coordinator account'} description={create ? `${unitName(create.woredaId)} · ${unitName(zoneOfWoreda(create.woredaId)?.id)}` : undefined}>
      {create && <form className="ws-form" onSubmit={submitCreate}>
        <div className="ws-grid2">
          <F label="Full name" wide><input className="ws-input" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></F>
          <F label="Email"><input className="ws-input" type="email" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></F>
          <F label="Phone (for SMS alerts)"><input className="ws-input" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="+251 9…" /></F>
        </div>
        <p className="ws-sub">The account can only see {unitName(create.woredaId)}. {create.roleId === 'woreda-coordinator' ? 'It registers cases and assigns them to the woreda’s prosecutors.' : 'It works on the cases the coordinator assigns.'}</p>
        <div className="ws-form-actions"><button type="button" className="ws-btn ghost" onClick={() => setCreate(null)}>Cancel</button><button className="ws-btn">Create account</button></div>
      </form>}
    </Modal>

    <Modal open={!!post} onClose={() => setPost(null)} title="Post a prosecutor to a woreda" description="The prosecutor will see and receive cases of that woreda only.">
      {post && <form className="ws-form" onSubmit={submitPost}>
        <div className="ws-grid2">
          <F label="Prosecutor" wide><Sel value={pu} onChange={setPu} options={[['', 'Choose a prosecutor…'], ...prosecutors.map(u => [u.id, `${u.name} – ${u.scope ? unitName(u.scope.id) : 'not posted'}`] as [string, string])]} /></F>
          <F label="Zone"><Sel value={pz} onChange={v => { setPz(v); setPw(''); }} options={ZONES.map(z => [z.id, z.name] as [string, string])} /></F>
          <F label="Woreda"><Sel value={pw} onChange={setPw} options={[['', 'Choose a woreda…'], ...woredasOfZone(pz).map(w => [w.id, w.name] as [string, string])]} /></F>
        </div>
        <div className="ws-form-actions"><button type="button" className="ws-btn ghost" onClick={() => setPost(null)}>Cancel</button><button className="ws-btn" disabled={!pu || !pw}>Post prosecutor</button></div>
      </form>}
    </Modal>
  </>;
}
