'use client';
import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { RequestChangesDialog, ResubmitDialog, ReviewThread } from './library-extra';
import { BookUp, CheckCircle2, MessageSquare, ChevronRight, Clock, Eye, FileText, Folder, FolderOpen, FolderPlus, Image as ImageIcon, Lock, Pencil, Plus, Search, Trash2, Upload, Wallet, XCircle, Download } from 'lucide-react';
import { toast } from 'sonner';
import { useWS } from '@/lib/ws/store';
import { PdfView } from './pdf-view';
import { ACCEPT_DOCS, detectType, fmtSize, saveFile, useFileUrl } from '@/lib/ws/files';
import type { LibDoc } from '@/lib/ws/types';
import { Avatar, DataTable, DocIcon, DocViewer, Empty, F, Modal, PageHead, Panel, Pill, Sel, Stat, StatusPill, ago, fmtDate } from './ui';

export function useQueryParam(name: string) {
  const [v, setV] = useState<string | null>(null);
  useEffect(() => { setV(new URLSearchParams(window.location.search).get(name)); }, [name]);
  return v;
}

/* ---------------- Explorer (shared by public site and workspace) ---------------- */
export function LibraryExplorer({ fullAccess, initialDoc, publicMode }: { fullAccess: boolean; initialDoc?: string | null; publicMode?: boolean }) {
  const { data } = useWS();
  const router = useRouter();
  const [cat, setCat] = useState<string>('all'), [q, setQ] = useState(''), [type, setType] = useState('all'), [open, setOpen] = useState<LibDoc | null>(null);
  const [year, setYear] = useState('all'), [author, setAuthor] = useState('all');
  const qParam = useQueryParam('q');
  useEffect(() => { if (qParam) setQ(qParam); }, [qParam]);
  useEffect(() => { if (initialDoc) { const d = data.docs.find(x => x.id === initialDoc); if (d) setOpen(d); } }, [initialDoc]); // eslint-disable-line react-hooks/exhaustive-deps
  const roots = data.categories.filter(c => !c.parentId);
  const inCat = (d: LibDoc) => cat === 'all' || d.categoryId === cat || data.categories.find(c => c.id === d.categoryId)?.parentId === cat;
  const published = data.docs.filter(d => d.status === 'published');
  const years = Array.from(new Set(published.map(d => d.year))).sort().reverse(), authors = Array.from(new Set(published.map(d => d.author))).sort();
  const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
  const hay = (d: LibDoc) => [d.title, d.description, d.author, d.text || '', (d.keywords || []).join(' '), d.fileName].join(' ').toLowerCase();
  const docs = published.filter(d => inCat(d) && (type === 'all' || d.type === type) && (year === 'all' || d.year === year) && (author === 'all' || d.author === author) && terms.every(t => hay(d).includes(t)))
    .sort((a, b) => (b.publishedAt || '').localeCompare(a.publishedAt || ''));
  const count = (id: string) => data.docs.filter(d => d.status === 'published' && (d.categoryId === id || data.categories.find(c => c.id === d.categoryId)?.parentId === id)).length;
  const current = data.categories.find(c => c.id === cat);
  const locked = (d: LibDoc) => d.visibility === 'researchers' && !fullAccess;

  return <div className="lib-explorer">
    <aside className="lib-tree" aria-label="Library folders">
      <button className={cat === 'all' ? 'active' : ''} onClick={() => setCat('all')}><FolderOpen size={17} />All documents<em>{data.docs.filter(d => d.status === 'published').length}</em></button>
      {roots.map(r => <React.Fragment key={r.id}>
        <button className={cat === r.id ? 'active' : ''} onClick={() => setCat(r.id)}>{cat === r.id ? <FolderOpen size={17} /> : <Folder size={17} />}{r.name}<em>{count(r.id)}</em></button>
        {data.categories.filter(c => c.parentId === r.id).map(s => <button key={s.id} className={'sub ' + (cat === s.id ? 'active' : '')} onClick={() => setCat(s.id)}><ChevronRight size={14} />{s.name}<em>{count(s.id)}</em></button>)}
      </React.Fragment>)}
    </aside>
    <div className="lib-main">
      <div className="lib-toolbar">
        <div className="lib-search"><Search size={17} /><input placeholder="Search title, author, keywords or text" value={q} onChange={e => setQ(e.target.value)} aria-label="Search library" /></div>
        <Sel aria-label="File type" value={type} onChange={setType} options={[['all', 'All types'], ['pdf', 'PDF'], ['word', 'Word'], ['video', 'Video']]} />
        <Sel aria-label="Year" value={year} onChange={setYear} options={[['all', 'All years'], ...years.map(y => [y, y] as [string, string])]} />
        <Sel aria-label="Author" value={author} onChange={setAuthor} options={[['all', 'All authors'], ...authors.map(a => [a, a] as [string, string])]} />
        {(q || type !== 'all' || year !== 'all' || author !== 'all') && <button className="ws-btn sm ghost" onClick={() => { setQ(''); setType('all'); setYear('all'); setAuthor('all'); }}>Clear filters</button>}
        <select className="ws-input lib-cat-mobile" aria-label="Folder" value={cat} onChange={e => setCat(e.target.value)}><option value="all">All folders</option>{data.categories.map(c => <option key={c.id} value={c.id}>{c.parentId ? '— ' : ''}{c.name}</option>)}</select>
      </div>
      <div className="lib-crumb"><FolderOpen size={16} />{current ? <>{current.parentId && <>{data.categories.find(c => c.id === current.parentId)?.name}<ChevronRight size={13} /></>}<b>{current.name}</b></> : <b>All documents</b>}<span>{docs.length} item{docs.length === 1 ? '' : 's'}</span></div>
      {current?.description && <p className="lib-desc">{current.description}</p>}
      {docs.length ? <div className="lib-grid">{docs.map(d => <button key={d.id} className={'lib-card t-' + d.type + (locked(d) ? ' locked' : '')} onClick={() => locked(d) ? setOpen(d) : router.push('/dashboard/library/doc/' + d.id)}>
        <div className="lib-card-top"><DocIcon type={d.type} size={26} /><span className="lib-type">{d.type === 'word' ? 'WORD' : d.type.toUpperCase()}</span>{locked(d) ? <Pill tone="gold"><Lock size={12} />Researchers</Pill> : d.visibility === 'researchers' ? <Pill tone="teal">Researchers</Pill> : <Pill tone="green">Public</Pill>}</div>
        <h3>{d.title}</h3><p>{d.description}</p>
        <div className="lib-meta"><span>{d.author}</span><span>{d.year} · {fmtSize(d.size)}</span>{d.source === 'researcher' && <span className="contrib">Researcher contribution</span>}</div>
        <div className="lib-stats"><span><Eye size={13} />{d.views}</span><span><Download size={13} />{d.downloads}</span></div>
      </button>)}</div> : <Empty title="No documents found">Try another folder or search term.</Empty>}
      {publicMode && !fullAccess && <div className="ws-banner"><Lock /><div><b>Researcher-only documents</b><p>Register as a researcher and pay a one-time {data.settings.libraryFee} ETB library fee via Telebirr to access all documents and contribute research.</p></div><Link className="ws-btn sm" href="/dashboard/register">Register</Link></div>}
    </div>
    <DocViewer doc={open} locked={open ? locked(open) : false} onClose={() => setOpen(null)} />
  </div>;
}

export function LibraryBrowse() {
  const { hasLibraryAccess, can } = useWS();
  const docParam = useQueryParam('doc');
  const access = hasLibraryAccess();
  return <>
    <PageHead eyebrow="DIGITAL LIBRARY" title="Browse the library" actions={can('library.manage') ? <Link className="ws-btn" href="/dashboard/library/manage"><Upload size={16} />Upload</Link> : can('library.contribute') && access ? <Link className="ws-btn" href="/dashboard/library/contribute?new=1"><Plus size={16} />Contribute research</Link> : undefined}>
      Laws, research, manuals, reports and training videos organized by folder.
    </PageHead>
    {!access && <div className="ws-banner warn"><Lock /><div><b>Limited access</b><p>You can open public documents. Researcher-only documents unlock after your Telebirr payment is approved.</p></div><Link className="ws-btn sm" href="/dashboard/library/access">Get full access</Link></div>}
    <LibraryExplorer fullAccess={access} initialDoc={docParam} />
  </>;
}

/* ---------------- Upload / edit document ---------------- */
function DocForm({ open, onClose, contribution, edit }: { open: boolean; onClose: () => void; contribution?: boolean; edit?: LibDoc | null }) {
  const { data, actions, user } = useWS();
  const [f, setF] = useState({ title: '', description: '', categoryId: data.categories[0]?.id || '', visibility: 'public' as LibDoc['visibility'], author: '', year: String(new Date().getFullYear()) });
  const [file, setFile] = useState<File | null>(null), [busy, setBusy] = useState(false), [err, setErr] = useState('');
  useEffect(() => {
    if (!open) return;
    setErr(''); setFile(null);
    setF(edit ? { title: edit.title, description: edit.description, categoryId: edit.categoryId, visibility: edit.visibility, author: edit.author, year: edit.year }
      : { title: '', description: '', categoryId: contribution ? 'c-research' : data.categories[0]?.id || '', visibility: contribution ? 'researchers' : 'public', author: contribution ? user?.name || '' : data.settings.orgName, year: String(new Date().getFullYear()) });
  }, [open, edit]); // eslint-disable-line react-hooks/exhaustive-deps
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (edit) { actions.updateDoc(edit.id, f); toast.success('Document updated'); onClose(); return; }
    if (!file) return setErr('Choose a PDF, Word or video file.');
    const type = detectType(file);
    if (!type) return setErr('Only PDF, Word (.doc/.docx) and video (.mp4/.webm/.mov) files are allowed.');
    if (file.size > 200 * 1048576) return setErr('Maximum file size is 200 MB in this demo.');
    setBusy(true);
    const url = await saveFile(file);
    actions.addDoc({ ...f, type, url, fileName: file.name, size: file.size }, contribution);
    setBusy(false);
    toast.success(contribution ? 'Submitted for review. You will be notified when it is published.' : 'Document uploaded and published');
    onClose();
  };
  return <Modal open={open} onClose={onClose} title={edit ? 'Edit document' : contribution ? 'Contribute research or a document' : 'Upload document'} description={contribution ? 'The Library Admin reviews every contribution before it is published for all users.' : 'PDF, Word and video files are supported.'}>
    <form onSubmit={submit} className="ws-form">
      <div className="ws-grid2">
        <F label="Title" wide><input className="ws-input" required value={f.title} onChange={e => setF({ ...f, title: e.target.value })} /></F>
        <F label="Description" wide><textarea className="ws-input" rows={3} value={f.description} onChange={e => setF({ ...f, description: e.target.value })} /></F>
        <F label="Folder / category"><select className="ws-input" value={f.categoryId} onChange={e => setF({ ...f, categoryId: e.target.value })}>{data.categories.map(c => <option key={c.id} value={c.id}>{c.parentId ? '— ' : ''}{c.name}</option>)}</select></F>
        {!contribution && <F label="Who can open it"><Sel value={f.visibility} onChange={v => setF({ ...f, visibility: v as LibDoc['visibility'] })} options={[['public', 'Public – all visitors'], ['researchers', 'Researchers & staff only']]} /></F>}
        <F label="Author"><input className="ws-input" value={f.author} onChange={e => setF({ ...f, author: e.target.value })} /></F>
        <F label="Year"><input className="ws-input" inputMode="numeric" value={f.year} onChange={e => setF({ ...f, year: e.target.value })} /></F>
        {!edit && <F label="File" wide hint="PDF, Word (.doc, .docx) or video (.mp4, .webm, .mov)"><label className="ws-drop"><Upload size={20} /><span>{file ? `${file.name} · ${fmtSize(file.size)}` : 'Choose a file or drag it here'}</span><input type="file" accept={ACCEPT_DOCS} onChange={e => setFile(e.target.files?.[0] || null)} /></label></F>}
      </div>
      {err && <p className="ws-error">{err}</p>}
      <div className="ws-form-actions"><button type="button" className="ws-btn ghost" onClick={onClose}>Cancel</button><button className="ws-btn" disabled={busy}>{busy ? 'Uploading…' : edit ? 'Save changes' : contribution ? 'Submit for review' : 'Upload & publish'}</button></div>
    </form>
  </Modal>;
}

/* ---------------- Library admin: manage ---------------- */
export function LibraryManage() {
  const { data, actions, userName } = useWS();
  const [tab, setTab] = useState<'docs' | 'folders'>('docs');
  const [upload, setUpload] = useState(false), [edit, setEdit] = useState<LibDoc | null>(null), [view, setView] = useState<LibDoc | null>(null);
  const [q, setQ] = useState(''), [cat, setCat] = useState('all'), [status, setStatus] = useState('all');
  const [folder, setFolder] = useState<{ id?: string; name: string; parentId: string | null; description: string } | null>(null);
  const docs = data.docs.filter(d => (cat === 'all' || d.categoryId === cat) && (status === 'all' || d.status === status) && d.title.toLowerCase().includes(q.toLowerCase()));
  const catName = (id: string) => data.categories.find(c => c.id === id)?.name || '—';
  return <>
    <PageHead eyebrow="LIBRARY ADMIN" title="Manage the digital library" actions={<><button className="ws-btn ghost" onClick={() => setFolder({ name: '', parentId: null, description: '' })}><FolderPlus size={16} />New folder</button><button className="ws-btn" onClick={() => setUpload(true)}><Upload size={16} />Upload document</button></>}>
      Upload PDF, Word and video files into folders, and control who can open them.
    </PageHead>
    <div className="ws-tabs" role="tablist"><button role="tab" aria-selected={tab === 'docs'} onClick={() => setTab('docs')}>Documents <em>{data.docs.length}</em></button><button role="tab" aria-selected={tab === 'folders'} onClick={() => setTab('folders')}>Folders & categories <em>{data.categories.length}</em></button></div>
    {tab === 'docs' ? <Panel>
      <div className="ws-filters">
        <div className="lib-search"><Search size={16} /><input placeholder="Search documents" value={q} onChange={e => setQ(e.target.value)} /></div>
        <select className="ws-input" value={cat} onChange={e => setCat(e.target.value)}><option value="all">All folders</option>{data.categories.map(c => <option key={c.id} value={c.id}>{c.parentId ? '— ' : ''}{c.name}</option>)}</select>
        <Sel value={status} onChange={setStatus} options={[['all', 'All statuses'], ['published', 'Published'], ['pending', 'Pending review'], ['rejected', 'Rejected']]} />
      </div>
      <DataTable head={['Document', 'Folder', 'Visibility', 'Status', 'Uploaded', 'Views', '']} empty={!docs.length}>
        {docs.map(d => <tr key={d.id}>
          <td><button className="ws-doc-cell" onClick={() => setView(d)}><DocIcon type={d.type} /><span><b>{d.title}</b><small>{d.fileName} · {fmtSize(d.size)}</small></span></button></td>
          <td>{catName(d.categoryId)}</td>
          <td><button className="ws-toggle-vis" title="Toggle visibility" onClick={() => actions.updateDoc(d.id, { visibility: d.visibility === 'public' ? 'researchers' : 'public' })}>{d.visibility === 'public' ? <Pill tone="green">Public</Pill> : <Pill tone="teal"><Lock size={11} />Researchers</Pill>}</button></td>
          <td><StatusPill status={d.status} /></td>
          <td>{fmtDate(d.createdAt)}<small className="ws-sub">{userName(d.uploadedBy)}</small></td>
          <td>{d.views}</td>
          <td className="ws-row-actions"><button aria-label="Edit" onClick={() => setEdit(d)}><Pencil size={16} /></button><button aria-label="Delete" onClick={() => { if (confirm(`Delete “${d.title}”?`)) { actions.deleteDoc(d.id); toast.success('Deleted'); } }}><Trash2 size={16} /></button></td>
        </tr>)}
      </DataTable>
    </Panel> : <Panel>
      <ul className="ws-folders">{data.categories.filter(c => !c.parentId).map(r => <li key={r.id}>
        <FolderRow c={r} onEdit={() => setFolder({ ...r })} onAddSub={() => setFolder({ name: '', parentId: r.id, description: '' })} />
        <ul>{data.categories.filter(c => c.parentId === r.id).map(s => <li key={s.id}><FolderRow c={s} onEdit={() => setFolder({ ...s })} /></li>)}</ul>
      </li>)}</ul>
    </Panel>}
    <DocForm open={upload || !!edit} edit={edit} onClose={() => { setUpload(false); setEdit(null); }} />
    <DocViewer doc={view} onClose={() => setView(null)} />
    <Modal open={!!folder} onClose={() => setFolder(null)} title={folder?.id ? 'Edit folder' : 'New folder'}>
      {folder && <form className="ws-form" onSubmit={e => { e.preventDefault(); actions.saveCategory(folder); toast.success('Folder saved'); setFolder(null); }}>
        <F label="Folder name"><input className="ws-input" required value={folder.name} onChange={e => setFolder({ ...folder, name: e.target.value })} /></F>
        <F label="Parent folder"><select className="ws-input" value={folder.parentId || ''} onChange={e => setFolder({ ...folder, parentId: e.target.value || null })}><option value="">— Top level —</option>{data.categories.filter(c => !c.parentId && c.id !== folder.id).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></F>
        <F label="Description"><textarea className="ws-input" rows={2} value={folder.description} onChange={e => setFolder({ ...folder, description: e.target.value })} /></F>
        <div className="ws-form-actions">{folder.id && <button type="button" className="ws-btn danger ghost" onClick={() => { const r = actions.deleteCategory(folder.id!); if (r.ok) { toast.success('Folder deleted'); setFolder(null); } else toast.error(r.error); }}>Delete</button>}<button className="ws-btn">Save folder</button></div>
      </form>}
    </Modal>
  </>;
}
function FolderRow({ c, onEdit, onAddSub }: { c: { id: string; name: string; description: string }; onEdit: () => void; onAddSub?: () => void }) {
  const { data } = useWS();
  const n = data.docs.filter(d => d.categoryId === c.id).length;
  return <div className="ws-folder-row"><Folder size={18} /><div><b>{c.name}</b><small>{c.description || 'No description'} · {n} document{n === 1 ? '' : 's'}</small></div><span>{onAddSub && <button className="ws-btn sm ghost" onClick={onAddSub}><Plus size={14} />Sub-folder</button>}<button className="ws-btn sm ghost" onClick={onEdit}><Pencil size={14} />Edit</button></span></div>;
}

/* ---------------- Library admin: approvals ---------------- */
type Decision = { kind: 'pay' | 'doc'; id: string; approve: boolean } | null;
type Detail = { kind: 'pay' | 'doc'; id: string } | null;
const STATUS_TABS = [['pending', 'Pending'], ['changes_requested', 'Changes requested'], ['approved', 'Approved'], ['rejected', 'Rejected'], ['all', 'All']] as const;

export function LibraryApprovals() {
  const { data, userName } = useWS();
  const tabParam = useQueryParam('tab');
  const [tab, setTab] = useState<'payments' | 'contributions'>('payments');
  useEffect(() => { if (tabParam === 'contributions') setTab('contributions'); }, [tabParam]);
  const [status, setStatus] = useState<string>('all'), [q, setQ] = useState('');
  const [detail, setDetail] = useState<Detail>(null), [decision, setDecision] = useState<Decision>(null), [changes, setChanges] = useState<string | null>(null);

  const contribs = data.docs.filter(d => d.source === 'researcher');
  const docStatus = (s: LibDoc['status']) => (s === 'published' ? 'approved' : s);
  const payRows = data.payments.filter(p => (status === 'all' || p.status === status) && (userName(p.userId) + ' ' + p.txnId).toLowerCase().includes(q.toLowerCase()));
  const docRows = contribs.filter(d => (status === 'all' || docStatus(d.status) === status) && (d.title + ' ' + userName(d.uploadedBy)).toLowerCase().includes(q.toLowerCase()));
  const order = (s: string) => (s === 'pending' ? 0 : 1);
  payRows.sort((a, b) => order(a.status) - order(b.status) || b.createdAt.localeCompare(a.createdAt));
  docRows.sort((a, b) => order(a.status) - order(b.status) || b.createdAt.localeCompare(a.createdAt));
  const pendPay = data.payments.filter(p => p.status === 'pending').length, pendDoc = contribs.filter(d => d.status === 'pending').length;
  const count = (st: string) => tab === 'payments' ? data.payments.filter(p => st === 'all' || p.status === st).length : contribs.filter(d => st === 'all' || docStatus(d.status) === st).length;

  return <>
    <PageHead eyebrow="LIBRARY ADMIN" title="Approvals">Verify researcher Telebirr receipts and review contributed research. Open a row to see the full details and receipt, then approve or reject.</PageHead>
    <div className="ws-stats">
      <Stat label="Payments to verify" value={pendPay} tone="gold" icon={<Wallet />} />
      <Stat label="Contributions to review" value={pendDoc} tone="gold" icon={<BookUp />} />
      <Stat label="Active researchers" value={data.payments.filter(p => p.status === 'approved').length} icon={<CheckCircle2 />} />
      <Stat label="Fees collected" value={data.payments.filter(p => p.status === 'approved').reduce((s, p) => s + p.amount, 0) + ' ETB'} tone="ink" icon={<Wallet />} />
    </div>
    <div className="ws-tabs" role="tablist">
      <button role="tab" aria-selected={tab === 'payments'} onClick={() => setTab('payments')}><Wallet size={16} />Researcher payments <em className={pendPay ? 'hot' : ''}>{pendPay}</em></button>
      <button role="tab" aria-selected={tab === 'contributions'} onClick={() => setTab('contributions')}><BookUp size={16} />Research contributions <em className={pendDoc ? 'hot' : ''}>{pendDoc}</em></button>
    </div>
    <Panel>
      <div className="ws-filters">
        <div className="ws-chips inline">{STATUS_TABS.map(([k, l]) => <button key={k} aria-pressed={status === k} className={'chip-' + k} onClick={() => setStatus(k)}>{l}<em>{count(k)}</em></button>)}</div>
        <div className="lib-search"><Search size={16} /><input placeholder={tab === 'payments' ? 'Search researcher or transaction ID' : 'Search title or researcher'} value={q} onChange={e => setQ(e.target.value)} /></div>
      </div>
      {tab === 'payments' ? <div className="ws-table-wrap"><table className="ws-table cards-on-mobile appr">
        <thead><tr><th>Researcher</th><th>Transaction ID</th><th>Amount</th><th>Receipt</th><th>Submitted</th><th>Status</th><th className="ta-r">Actions</th></tr></thead>
        <tbody>{payRows.map(p => { const u = data.users.find(x => x.id === p.userId); return <tr key={p.id} className={p.status === 'pending' ? 'row-pending' : ''}>
          <td data-label="Researcher"><button className="ws-user-cell linkish" onClick={() => setDetail({ kind: 'pay', id: p.id })}><Avatar name={u?.name || '?'} size={34} /><span><b>{u?.name}</b><small>{u?.institution}</small></span></button></td>
          <td data-label="Transaction" className="mono">{p.txnId}</td>
          <td data-label="Amount"><b>{p.amount} ETB</b></td>
          <td data-label="Receipt"><FileBadge name={p.receiptName} /></td>
          <td data-label="Submitted">{fmtDate(p.createdAt)}<small className="ws-sub">{ago(p.createdAt)}</small></td>
          <td data-label="Status"><StatusPill status={p.status} /></td>
          <td className="ws-actions"><RowActions pending={p.status === 'pending'} onView={() => setDetail({ kind: 'pay', id: p.id })} onApprove={() => setDecision({ kind: 'pay', id: p.id, approve: true })} onReject={() => setDecision({ kind: 'pay', id: p.id, approve: false })} /></td>
        </tr>; })}</tbody>
      </table>{!payRows.length && <Empty title="No payments in this view" icon={<CheckCircle2 size={30} />} />}</div>
        : <div className="ws-table-wrap"><table className="ws-table cards-on-mobile appr">
          <thead><tr><th>Document</th><th>Researcher</th><th>Folder</th><th>Submitted</th><th>Status</th><th className="ta-r">Actions</th></tr></thead>
          <tbody>{docRows.map(d => <tr key={d.id} className={d.status === 'pending' ? 'row-pending' : ''}>
            <td data-label="Document"><button className="ws-doc-cell" onClick={() => setDetail({ kind: 'doc', id: d.id })}><DocIcon type={d.type} size={24} /><span><b>{d.title}</b><small>{d.fileName} · {fmtSize(d.size)}</small></span></button></td>
            <td data-label="Researcher">{userName(d.uploadedBy)}</td>
            <td data-label="Folder">{data.categories.find(c => c.id === d.categoryId)?.name}</td>
            <td data-label="Submitted">{fmtDate(d.createdAt)}<small className="ws-sub">{ago(d.createdAt)}</small></td>
            <td data-label="Status"><StatusPill status={docStatus(d.status) === 'changes_requested' ? 'changes requested' : docStatus(d.status)} />{(d.version || 1) > 1 && <small className="ws-sub">version {d.version}</small>}</td>
            <td className="ws-actions"><RowActions pending={d.status === 'pending'} onView={() => setDetail({ kind: 'doc', id: d.id })} onApprove={() => setDecision({ kind: 'doc', id: d.id, approve: true })} onReject={() => setDecision({ kind: 'doc', id: d.id, approve: false })} onChanges={() => setChanges(d.id)} /></td>
          </tr>)}</tbody>
        </table>{!docRows.length && <Empty title="No contributions in this view" icon={<CheckCircle2 size={30} />} />}</div>}
    </Panel>
    <ApprovalDetail detail={detail} onClose={() => setDetail(null)} onDecide={(approve) => detail && setDecision({ ...detail, approve })} onChanges={id => setChanges(id)} />
    <RequestChangesDialog docId={changes} onClose={() => { setChanges(null); setDetail(null); }} />
    <DecisionDialog decision={decision} onClose={() => setDecision(null)} onDone={() => { setDecision(null); setDetail(null); }} />
  </>;
}

function RowActions({ pending, onView, onApprove, onReject, onChanges }: { pending: boolean; onView: () => void; onApprove: () => void; onReject: () => void; onChanges?: () => void }) {
  return <div className="ws-act-group">
    <button className="ws-btn sm ghost" onClick={onView}><Eye size={15} />View</button>
    {pending && <><button className="ws-btn sm" onClick={onApprove}><CheckCircle2 size={15} />Approve</button>{onChanges && <button className="ws-btn sm ghost" onClick={onChanges} aria-label="Request changes" title="Request changes"><MessageSquare size={15} />Changes</button>}<button className="ws-btn sm danger ghost" onClick={onReject} aria-label="Reject"><XCircle size={15} />Reject</button></>}
  </div>;
}

export function FileBadge({ name }: { name: string }) {
  const img = /\.(png|jpe?g|webp|gif)$/i.test(name);
  return <span className={'ws-file-badge ' + (img ? 'img' : 'pdf')}>{img ? <ImageIcon size={14} /> : <FileText size={14} />}{img ? 'Image' : 'PDF'}</span>;
}

export function ReceiptPreview({ url, name }: { url: string; name: string }) {
  const u = useFileUrl(url);
  const img = /\.(png|jpe?g|webp|gif)$/i.test(name);
  if (!u) return <div className="ws-receipt-frame loading">Loading receipt…</div>;
  return <div className="ws-receipt-frame">
    {img ? <img src={u} alt={'Receipt ' + name} /> : <PdfView url={u} maxPages={3} />}
    <a className="ws-btn ghost sm" href={u} target="_blank" rel="noreferrer" download={name}><Download size={14} />Open / download {img ? 'image' : 'PDF'}</a>
  </div>;
}

function ApprovalDetail({ detail, onClose, onDecide, onChanges }: { detail: Detail; onClose: () => void; onDecide: (approve: boolean) => void; onChanges: (id: string) => void }) {
  const { data, userName } = useWS();
  if (!detail) return null;
  if (detail.kind === 'pay') {
    const p = data.payments.find(x => x.id === detail.id); if (!p) return null;
    const u = data.users.find(x => x.id === p.userId);
    const history = data.payments.filter(x => x.userId === p.userId && x.id !== p.id);
    return <Modal open onClose={onClose} title="Payment verification" description={`${u?.name} · ${p.amount} ETB · Telebirr ${p.txnId}`} wide>
      <div className="ws-approval-detail">
        <ReceiptPreview url={p.receiptUrl} name={p.receiptName} />
        <div className="ws-approval-info">
          <div className="ws-approval-status"><StatusPill status={p.status} />{p.reviewedAt && <small>{p.status === 'approved' ? 'Approved' : 'Reviewed'} by {userName(p.reviewedBy)} · {fmtDate(p.reviewedAt)}</small>}</div>
          <h4>Researcher</h4>
          <dl className="ws-dl"><dt>Name</dt><dd>{u?.name}</dd><dt>Institution</dt><dd>{u?.institution}</dd><dt>Email</dt><dd>{u?.email}</dd><dt>Phone</dt><dd>{u?.phone}</dd><dt>Purpose</dt><dd>{u?.purpose}</dd></dl>
          <h4>Payment</h4>
          <dl className="ws-dl"><dt>Amount</dt><dd><b>{p.amount} ETB</b></dd><dt>Transaction ID</dt><dd className="mono">{p.txnId}</dd><dt>Paid on</dt><dd>{fmtDate(p.paidOn)}</dd><dt>Submitted</dt><dd>{fmtDate(p.createdAt)} ({ago(p.createdAt)})</dd><dt>Receipt file</dt><dd><FileBadge name={p.receiptName} /> {p.receiptName}</dd>{p.expiresAt && <><dt>Access until</dt><dd>{fmtDate(p.expiresAt)}</dd></>}</dl>
          {p.note && <p className="ws-note"><b>Review note:</b> {p.note}</p>}
          {history.length > 0 && <p className="ws-sub">Previous submissions: {history.map(h => `${h.txnId} (${h.status})`).join(', ')}</p>}
          {p.status === 'pending' && <div className="ws-approval-actions"><button className="ws-btn danger ghost" onClick={() => onDecide(false)}><XCircle size={16} />Reject</button><button className="ws-btn" onClick={() => onDecide(true)}><CheckCircle2 size={16} />Approve access</button></div>}
        </div>
      </div>
    </Modal>;
  }
  const d = data.docs.find(x => x.id === detail.id); if (!d) return null;
  return <Modal open onClose={onClose} title="Research contribution" description={`${d.title} · by ${userName(d.uploadedBy)}`} wide>
    <div className="ws-approval-detail">
      <DocPreview doc={d} />
      <div className="ws-approval-info">
        <div className="ws-approval-status"><StatusPill status={d.status === 'published' ? 'approved' : d.status} />{d.reviewedBy && <small>Reviewed by {userName(d.reviewedBy)}</small>}</div>
        <h4>Document</h4>
        <dl className="ws-dl"><dt>Title</dt><dd>{d.title}</dd><dt>Description</dt><dd>{d.description || '—'}</dd><dt>Author</dt><dd>{d.author}, {d.year}</dd><dt>Proposed folder</dt><dd>{data.categories.find(c => c.id === d.categoryId)?.name}</dd><dt>File</dt><dd><DocIcon type={d.type} size={15} /> {d.fileName} · {fmtSize(d.size)}</dd><dt>Submitted</dt><dd>{fmtDate(d.createdAt)} ({ago(d.createdAt)})</dd>{d.publishedAt && <><dt>Published</dt><dd>{fmtDate(d.publishedAt)} · {d.visibility === 'public' ? 'All users' : 'Researchers & staff'}</dd></>}</dl>
        {d.reviewNote && <p className="ws-note"><b>Review note:</b> {d.reviewNote}</p>}
        <ReviewThread doc={d} />
        {d.status === 'pending' && <div className="ws-approval-actions"><button className="ws-btn danger ghost" onClick={() => onDecide(false)}><XCircle size={16} />Reject</button><button className="ws-btn ghost" onClick={() => onChanges(d.id)}><MessageSquare size={16} />Request changes</button><button className="ws-btn" onClick={() => onDecide(true)}><CheckCircle2 size={16} />Approve & publish</button></div>}
      </div>
    </div>
  </Modal>;
}

function DocPreview({ doc }: { doc: LibDoc }) {
  const u = useFileUrl(doc.url);
  if (!u) return <div className="ws-receipt-frame loading">Loading…</div>;
  return <div className="ws-receipt-frame">
    {doc.type === 'pdf' ? <PdfView url={u} maxPages={5} /> : doc.type === 'video' ? <video src={u} controls /> : <div className="viewer-word"><DocIcon type="word" size={44} /><p>Word document – download to review.</p></div>}
    <a className="ws-btn ghost sm" href={u} target="_blank" rel="noreferrer" download={doc.fileName}><Download size={14} />Download file</a>
  </div>;
}

function DecisionDialog({ decision, onClose, onDone }: { decision: Decision; onClose: () => void; onDone: () => void }) {
  const { data, actions, userName } = useWS();
  const [note, setNote] = useState(''), [vis, setVis] = useState<LibDoc['visibility']>('public');
  useEffect(() => { if (decision) { setNote(decision.approve ? (decision.kind === 'pay' ? 'Receipt verified against the merchant statement.' : 'Approved for publication.') : ''); setVis('public'); } }, [decision]);
  if (!decision) return null;
  const p = decision.kind === 'pay' ? data.payments.find(x => x.id === decision.id) : null;
  const d = decision.kind === 'doc' ? data.docs.find(x => x.id === decision.id) : null;
  const who = p ? userName(p.userId) : userName(d?.uploadedBy);
  const title = decision.approve ? (p ? 'Approve payment?' : 'Approve & publish?') : (p ? 'Reject payment?' : 'Reject contribution?');
  return <Modal open onClose={onClose} title={title}>
    <form className="ws-form" onSubmit={e => {
      e.preventDefault();
      if (!decision.approve && !note.trim()) { toast.error('Please give a reason so the researcher can correct it.'); return; }
      if (p) actions.reviewPayment(p.id, decision.approve, note); else if (d) actions.reviewDoc(d.id, decision.approve, note, vis);
      toast.success(decision.approve ? (p ? `Approved — ${who} now has full library access` : `Published “${d?.title}”`) : 'Rejected — the researcher has been notified');
      onDone();
    }}>
      <div className={'ws-confirm ' + (decision.approve ? 'ok' : 'bad')}>
        {decision.approve ? <CheckCircle2 size={28} /> : <XCircle size={28} />}
        <div>{p ? <><b>{who}</b> · {p.amount} ETB · <span className="mono">{p.txnId}</span><p>{decision.approve ? `Grants full library access for ${data.settings.accessDays} days and notifies the researcher.` : 'The researcher will be asked to upload a valid receipt.'}</p></>
          : <><b>{d?.title}</b><p>{decision.approve ? `Publishes the document in the library with ${who} as author.` : 'The researcher will see your reason and can resubmit.'}</p></>}</div>
      </div>
      {d && decision.approve && <F label="Publish for"><Sel value={vis} onChange={v => setVis(v as LibDoc['visibility'])} options={[['public', 'All signed-in users'], ['researchers', 'Researchers & staff only']]} /></F>}
      <F label={decision.approve ? 'Note (optional)' : 'Reason for rejection'}><textarea className="ws-input" rows={3} value={note} onChange={e => setNote(e.target.value)} autoFocus={!decision.approve} /></F>
      <div className="ws-form-actions"><button type="button" className="ws-btn ghost" onClick={onClose}>Cancel</button><button className={'ws-btn' + (decision.approve ? '' : ' danger')}>{decision.approve ? <><CheckCircle2 size={16} />Yes, approve</> : <><XCircle size={16} />Reject</>}</button></div>
    </form>
  </Modal>;
}

/* ---------------- Researcher: access & payment ---------------- */
export function LibraryAccess() {
  const { data, user, actions, hasLibraryAccess } = useWS();
  const mine = data.payments.filter(p => p.userId === user!.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const last = mine[0];
  const access = hasLibraryAccess();
  const [txn, setTxn] = useState(''), [paidOn, setPaidOn] = useState(new Date().toISOString().slice(0, 10)), [file, setFile] = useState<File | null>(null), [busy, setBusy] = useState(false);
  const step = access ? 4 : last?.status === 'pending' ? 3 : 2;
  const canSubmit = !access && last?.status !== 'pending';
  return <>
    <PageHead eyebrow="DIGITAL LIBRARY" title="Library access & payment">Researchers pay a {data.settings.libraryFee} ETB access fee with Telebirr. Access is activated after the Library Admin verifies the receipt.</PageHead>
    <ol className="ws-progress">{['Account created', 'Pay with Telebirr', 'Receipt under review', 'Access granted'].map((s, i) => <li key={s} className={i + 1 < step ? 'done' : i + 1 === step ? 'current' : ''}><span>{i + 1 < step ? <CheckCircle2 size={16} /> : i + 1}</span>{s}</li>)}</ol>
    {access && last?.expiresAt && <div className="ws-banner ok"><CheckCircle2 /><div><b>Access active until {fmtDate(last.expiresAt)}</b><p>You can open every document and contribute your research.</p></div><Link className="ws-btn sm" href="/dashboard/library">Open library</Link></div>}
    {last?.status === 'pending' && <div className="ws-banner warn"><Clock /><div><b>Receipt {last.txnId} is under review</b><p>Submitted {ago(last.createdAt)}. Most reviews are completed within one working day.</p></div></div>}
    {last?.status === 'rejected' && <div className="ws-banner bad"><XCircle /><div><b>Your last receipt was rejected</b><p>{last.note} Please submit a valid receipt.</p></div></div>}
    <div className="ws-dash-grid">
      <Panel title="How to pay with Telebirr">
        <div className="telebirr-card"><div className="tb-logo">tele<b>birr</b></div><dl className="ws-dl"><dt>Amount</dt><dd><b>{data.settings.libraryFee}.00 ETB</b></dd><dt>Merchant / short code</dt><dd className="mono">{data.settings.telebirrCode}</dd><dt>Merchant name</dt><dd>{data.settings.telebirrName}</dd><dt>Reference</dt><dd className="mono">LIB-{user!.id.slice(-6).toUpperCase()}</dd></dl></div>
        <ol className="ws-howto"><li>Open the Telebirr app or dial <b>*127#</b>.</li><li>Choose <b>Pay with merchant</b> and enter the short code.</li><li>Pay <b>{data.settings.libraryFee} ETB</b> and enter your reference.</li><li>Save the SMS / screenshot receipt and upload it here.</li></ol>
      </Panel>
      <Panel title="Upload your receipt">
        {canSubmit ? <form className="ws-form" onSubmit={async e => {
          e.preventDefault();
          if (!file) return toast.error('Attach the receipt screenshot or PDF.');
          if (!/^[A-Z0-9]{8,12}$/i.test(txn.trim())) return toast.error('Enter the Telebirr transaction ID (8–12 letters/numbers).');
          setBusy(true); const url = await saveFile(file);
          actions.submitPayment({ txnId: txn.trim().toUpperCase(), receiptUrl: url, receiptName: file.name, paidOn: new Date(paidOn).toISOString() });
          setBusy(false); setTxn(''); setFile(null); toast.success('Receipt submitted. The Library Admin will review it.');
        }}>
          <F label="Telebirr transaction ID" hint="Shown in the confirmation SMS, e.g. TB8K2LQ91X"><input className="ws-input mono" required value={txn} onChange={e => setTxn(e.target.value)} placeholder="TB…" /></F>
          <F label="Payment date"><input className="ws-input" type="date" required value={paidOn} onChange={e => setPaidOn(e.target.value)} /></F>
          <F label="Receipt (image or PDF)"><label className="ws-drop"><Upload size={20} /><span>{file ? file.name : 'Choose receipt screenshot or PDF'}</span><input type="file" accept="image/*,.pdf" onChange={e => setFile(e.target.files?.[0] || null)} /></label></F>
          <button className="ws-btn block" disabled={busy}>{busy ? 'Submitting…' : 'Submit receipt for approval'}</button>
        </form> : <Empty title={access ? 'No action needed' : 'Receipt submitted'} icon={<CheckCircle2 size={30} />}>{access ? 'Your access is active.' : 'Please wait for the review.'}</Empty>}
      </Panel>
    </div>
    <Panel title="Payment history"><DataTable head={['Submitted', 'Transaction', 'Amount', 'Status', 'Note', 'Access until']} empty={!mine.length}>{mine.map(p => <tr key={p.id}><td>{fmtDate(p.createdAt)}</td><td className="mono">{p.txnId}</td><td>{p.amount} ETB</td><td><StatusPill status={p.status} /></td><td>{p.note || '—'}</td><td>{fmtDate(p.expiresAt)}</td></tr>)}</DataTable></Panel>
  </>;
}

/* ---------------- Researcher: contributions ---------------- */
export function LibraryContribute() {
  const { data, user, hasLibraryAccess } = useWS();
  const newParam = useQueryParam('new');
  const [open, setOpen] = useState(false), [view, setView] = useState<LibDoc | null>(null), [resub, setResub] = useState<LibDoc | null>(null);
  useEffect(() => { if (newParam) setOpen(true); }, [newParam]);
  const mine = useMemo(() => data.docs.filter(d => d.uploadedBy === user!.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)), [data.docs, user]);
  const access = hasLibraryAccess();
  return <>
    <PageHead eyebrow="DIGITAL LIBRARY" title="My contributions" actions={access ? <button className="ws-btn" onClick={() => setOpen(true)}><Plus size={16} />New contribution</button> : undefined}>
      Share research papers, theses and documents. Approved contributions are published for all users with your name as author.
    </PageHead>
    {!access && <div className="ws-banner warn"><Lock /><div><b>Contributions open after access approval</b><p>Pay the library fee and upload your receipt first.</p></div><Link className="ws-btn sm" href="/dashboard/library/access">Get access</Link></div>}
    {mine.length ? <div className="ws-cards">{mine.map(d => <article key={d.id} className="ws-card">
      <header><DocIcon type={d.type} size={22} /><div><b>{d.title}</b><small>{data.categories.find(c => c.id === d.categoryId)?.name} · submitted {fmtDate(d.createdAt)}</small></div><StatusPill status={d.status === 'changes_requested' ? 'changes requested' : d.status} /></header>
      <p>{d.description}</p>
      {d.reviewNote && d.status !== 'changes_requested' && <p className="ws-note"><b>Library Admin:</b> {d.reviewNote}</p>}
      {(d.status === 'changes_requested' || d.status === 'pending' || data.reviewComments.some(c => c.docId === d.id)) && <ReviewThread doc={d} canComment={d.status !== 'published' && d.status !== 'rejected'} />}
      <footer>{d.status === 'changes_requested' && <button className="ws-btn sm" onClick={() => setResub(d)}><Upload size={15} />Upload revised version</button>}<button className="ws-btn ghost sm" onClick={() => setView(d)}><Eye size={15} />Open</button>{d.status === 'published' && <Link className="ws-btn ghost sm" href={'/dashboard/library/doc/' + d.id}>Details</Link>}{d.status === 'published' && <span className="ws-sub">{d.views} views · {d.downloads} downloads</span>}</footer>
    </article>)}</div> : <Empty title="No contributions yet">{access ? 'Use “New contribution” to submit your first document.' : ''}</Empty>}
    <DocForm open={open} contribution onClose={() => setOpen(false)} />
    <DocViewer doc={view} onClose={() => setView(null)} />
    <ResubmitDialog doc={resub} onClose={() => setResub(null)} />
  </>;
}
