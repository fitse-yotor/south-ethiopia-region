'use client';
import { useState } from 'react';
import Link from 'next/link';
import { ArrowRightLeft, FileSpreadsheet, History, Package, Plus, Search, ShieldCheck, TriangleAlert } from 'lucide-react';
import { toast } from 'sonner';
import { useWS } from '@/lib/ws/store';
import { CUSTODY_ACTIONS, EVIDENCE_KINDS, type Case, type CustodyAction, type EvidenceItem, type EvidenceKind } from '@/lib/ws/types';
import { chainIntact, custodyClosed, evidenceStatus, holder, lastEntry } from '@/lib/ws/evidence';
import { exportCSV } from '@/lib/ws/reports';
import { Empty, F, Modal, PageHead, Panel, Pill, Sel, fmtDate, fmtDateTime } from './ui';

const TONE: Record<string, 'green' | 'gold' | 'blue' | 'grey' | 'red'> = { 'In custody': 'green', 'At laboratory': 'gold', 'In court': 'blue', Returned: 'grey', Disposed: 'grey' };

/** Evidence of one case with register / transfer / history. Custody entries can only be added, never edited. */
export function CaseEvidence({ c }: { c: Case }) {
  const { data, can, user, actions, userName } = useWS();
  const items = data.evidence.filter(e => e.caseId === c.id);
  const canEdit = can('evidence.manage') && (c.prosecutorId === user!.id || can('cases.assign')) && c.status !== 'Closed';
  const [reg, setReg] = useState(false), [step, setStep] = useState<EvidenceItem | null>(null), [hist, setHist] = useState<EvidenceItem | null>(null);
  const [f, setF] = useState({ kind: EVIDENCE_KINDS[0] as EvidenceKind, description: '', collectedFrom: '', custodian: '', note: '' });
  const [s, setS] = useState({ action: 'Transferred' as CustodyAction, to: '', note: '' });
  return <Panel title={<><Package size={18} />Evidence & chain of custody</>} actions={canEdit ? <button className="ws-btn sm ghost" onClick={() => { setF({ kind: EVIDENCE_KINDS[0], description: '', collectedFrom: '', custodian: '', note: '' }); setReg(true); }}><Plus size={14} />Register</button> : undefined}>
    {items.length ? <div className="ws-table-wrap"><table className="ws-table compact"><thead><tr><th>Item</th><th>Status</th><th>Held by</th><th></th></tr></thead><tbody>
      {items.map(e => <tr key={e.id}>
        <td><b>{e.itemNo}</b> · {e.description}<small className="ws-sub">{e.kind}</small></td>
        <td><Pill tone={TONE[evidenceStatus(e)] || 'grey'}>{evidenceStatus(e)}</Pill></td>
        <td>{holder(e)}<small className="ws-sub">{fmtDate(lastEntry(e).at)}</small></td>
        <td className="ws-row-actions"><button aria-label="Custody history" title="Custody history" onClick={() => setHist(e)}><History size={16} /></button>
          {canEdit && !custodyClosed(e) && <button aria-label="Record custody step" title="Record custody step" onClick={() => { setS({ action: 'Transferred', to: '', note: '' }); setStep(e); }}><ArrowRightLeft size={16} /></button>}</td>
      </tr>)}</tbody></table></div> : <Empty title="No evidence registered">Register each exhibit when it is received, then record every hand-over.</Empty>}

    <Modal open={reg} onClose={() => setReg(false)} title="Register evidence" description={`${c.caseNo} · the first custody entry is created automatically`}>
      <form className="ws-form" onSubmit={e => { e.preventDefault(); const r = actions.addEvidence(c.id, f); if (r.ok) { toast.success('Evidence registered'); setReg(false); } else toast.error(r.error); }}>
        <div className="ws-grid2">
          <F label="Kind"><Sel value={f.kind} onChange={v => setF({ ...f, kind: v as EvidenceKind })} options={[...EVIDENCE_KINDS]} /></F>
          <F label="Collected from"><input className="ws-input" value={f.collectedFrom} onChange={e => setF({ ...f, collectedFrom: e.target.value })} placeholder="e.g. Crime scene, police station" /></F>
          <F label="Description" wide><input className="ws-input" required value={f.description} onChange={e => setF({ ...f, description: e.target.value })} placeholder="What is the item? Marks, quantity, seal number" /></F>
          <F label="Now held by"><input className="ws-input" required value={f.custodian} onChange={e => setF({ ...f, custodian: e.target.value })} placeholder="Person or place" /></F>
          <F label="Note"><input className="ws-input" value={f.note} onChange={e => setF({ ...f, note: e.target.value })} /></F>
        </div>
        <div className="ws-form-actions"><button type="button" className="ws-btn ghost" onClick={() => setReg(false)}>Cancel</button><button className="ws-btn">Register</button></div>
      </form>
    </Modal>

    <Modal open={!!step} onClose={() => setStep(null)} title={`Record custody step – ${step?.itemNo || ''}`} description={step ? `Currently held by ${holder(step)}. Entries cannot be edited later.` : undefined}>
      {step && <form className="ws-form" onSubmit={e => { e.preventDefault(); const r = actions.recordCustody(step.id, s.action, s.to, s.note); if (r.ok) { toast.success('Custody recorded'); setStep(null); } else toast.error(r.error); }}>
        <div className="ws-grid2">
          <F label="What happened"><Sel value={s.action} onChange={v => setS({ ...s, action: v as CustodyAction })} options={CUSTODY_ACTIONS.filter(a => a !== 'Collected')} /></F>
          <F label="Goes to (person or place)"><input className="ws-input" required value={s.to} onChange={e => setS({ ...s, to: e.target.value })} /></F>
          <F label="Note" wide><input className="ws-input" value={s.note} onChange={e => setS({ ...s, note: e.target.value })} placeholder="Seal number, receipt, condition…" /></F>
        </div>
        <div className="ws-form-actions"><button type="button" className="ws-btn ghost" onClick={() => setStep(null)}>Cancel</button><button className="ws-btn">Record</button></div>
      </form>}
    </Modal>

    <Modal open={!!hist} onClose={() => setHist(null)} title={`Chain of custody – ${hist?.itemNo || ''}`} description={hist?.description}>
      {hist && <>
        <p className="ws-sub">{chainIntact(hist) ? <><ShieldCheck size={14} /> Unbroken: every hand-over starts where the previous one ended.</> : <><TriangleAlert size={14} /> Gap found: a hand-over does not start where the previous one ended.</>}</p>
        <ol className="ws-timeline">{hist.custody.map(h => <li key={h.id}><b>{h.action}</b><p>{h.from} → {h.to}{h.note ? ' · ' + h.note : ''}</p><small>{userName(h.by)} · {fmtDateTime(h.at)}</small></li>)}</ol>
      </>}
    </Modal>
  </Panel>;
}

/** All evidence the signed-in user may see (their woreda, zone or region). */
export function EvidencePage() {
  const { data } = useWS();
  const [q, setQ] = useState(''), [status, setStatus] = useState('all');
  const rows = data.evidence.map(e => ({ e, c: data.cases.find(x => x.id === e.caseId)! })).filter(x => x.c
    && (status === 'all' || evidenceStatus(x.e) === status) && (x.e.itemNo + ' ' + x.e.description + ' ' + x.c.caseNo + ' ' + x.c.title + ' ' + holder(x.e)).toLowerCase().includes(q.toLowerCase()));
  const statuses = Array.from(new Set(data.evidence.map(evidenceStatus)));
  const csv = () => exportCSV('evidence-register-' + new Date().toISOString().slice(0, 10), {
    columns: ['Item no.', 'Case no.', 'Woreda', 'Kind', 'Description', 'Status', 'Held by', 'Custody steps', 'Last update'],
    rows: rows.map(({ e, c }) => [e.itemNo, c.caseNo, c.office, e.kind, e.description, evidenceStatus(e), holder(e), e.custody.length, fmtDate(lastEntry(e).at)]),
  });
  return <>
    <PageHead eyebrow="PROSECUTION" title="Evidence register" actions={<button className="ws-btn ghost" onClick={csv}><FileSpreadsheet size={16} />CSV</button>}>
      Exhibits of the cases you can see and where each one is now. Register evidence and record hand-overs on the case page; the custody log can only be added to, never edited.
    </PageHead>
    <div className="ws-stats">
      <div className="ws-stat"><span className="ws-stat-label">Items</span><strong>{data.evidence.length}</strong></div>
      <div className="ws-stat tone-gold"><span className="ws-stat-label">At laboratory</span><strong>{data.evidence.filter(e => evidenceStatus(e) === 'At laboratory').length}</strong></div>
      <div className="ws-stat tone-ink"><span className="ws-stat-label">In court</span><strong>{data.evidence.filter(e => evidenceStatus(e) === 'In court').length}</strong></div>
    </div>
    <Panel>
      <div className="ws-filters">
        <div className="lib-search"><Search size={16} /><input placeholder="Search item, case or holder" value={q} onChange={e => setQ(e.target.value)} /></div>
        <Sel aria-label="Status" value={status} onChange={setStatus} options={[['all', 'All statuses'], ...statuses.map(s => [s, s] as [string, string])]} />
      </div>
      <div className="ws-table-wrap"><table className="ws-table cards-on-mobile">
        <thead><tr><th>Item</th><th>Case</th><th>Status</th><th>Held by</th><th>Steps</th></tr></thead>
        <tbody>{rows.map(({ e, c }) => <tr key={e.id}>
          <td data-label="Item"><b>{e.itemNo}</b> · {e.description}<small className="ws-sub">{e.kind}</small></td>
          <td data-label="Case"><Link className="ws-case-link" href={'/dashboard/cases/' + c.id}><b>{c.title}</b><small>{c.caseNo} · {c.office}</small></Link></td>
          <td data-label="Status"><Pill tone={TONE[evidenceStatus(e)] || 'grey'}>{evidenceStatus(e)}</Pill></td>
          <td data-label="Held by">{holder(e)}<small className="ws-sub">{fmtDate(lastEntry(e).at)}</small></td>
          <td data-label="Steps">{e.custody.length}</td>
        </tr>)}</tbody>
      </table>{!rows.length && <Empty title="No evidence found">Change the search or open a case to register its evidence.</Empty>}</div>
    </Panel>
  </>;
}
