'use client';
import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, BookOpen, Building2, Copy, Download, Eye, FileUp, Lock, MessageSquare, Quote, Send, Upload, UserCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { useWS } from '@/lib/ws/store';
import { fmtSize, saveFile, useFileUrl, ACCEPT_DOCS, detectType } from '@/lib/ws/files';
import type { LibDoc } from '@/lib/ws/types';
import { Avatar, DocIcon, Empty, F, Modal, PageHead, Panel, Pill, StatusPill, fmtDate, fmtDateTime } from './ui';
import { PdfView } from './pdf-view';

export function citation(d: LibDoc, style: 'apa' | 'chicago', publisher = 'Southern Ethiopia Regional Justice Bureau Digital Library') {
  return style === 'apa'
    ? `${d.author} (${d.year}). ${d.title} [${d.type === 'video' ? 'Video' : d.type === 'word' ? 'Word document' : 'PDF document'}]. ${publisher}.`
    : `${d.author}. “${d.title}.” ${publisher}, ${d.year}.`;
}

/* ================= 15. Document detail ================= */
export function DocDetailPage({ id }: { id: string }) {
  const { data, actions, hasLibraryAccess, user } = useWS();
  const d = data.docs.find(x => x.id === id);
  const url = useFileUrl(d?.url);
  const [style, setStyle] = useState<'apa' | 'chicago'>('apa');
  if (!d || (d.status !== 'published' && d.uploadedBy !== user!.id && !hasLibraryAccess())) return <Empty title="Document not found" />;
  const locked = d.visibility === 'researchers' && !hasLibraryAccess();
  const cat = data.categories.find(c => c.id === d.categoryId);
  const parent = cat?.parentId ? data.categories.find(c => c.id === cat.parentId) : null;
  const related = data.docs.filter(x => x.id !== d.id && x.status === 'published' && (x.categoryId === d.categoryId || (x.keywords || []).some(k => (d.keywords || []).includes(k)))).slice(0, 5);
  const contributor = d.source === 'researcher' ? data.users.find(u => u.id === d.uploadedBy) : null;
  const cite = citation(d, style);
  return <>
    <Link href="/dashboard/library" className="ws-back"><ArrowLeft size={15} />Library</Link>
    <div className="ws-case-head"><div><div className="ws-eyebrow">{parent ? parent.name + ' › ' : ''}{cat?.name}</div><h1 className="doc-title"><DocIcon type={d.type} size={28} />{d.title}</h1>
      <div className="ws-case-pills"><Pill>{d.type === 'word' ? 'Word' : d.type.toUpperCase()} · {fmtSize(d.size)}</Pill><Pill tone={d.visibility === 'public' ? 'green' : 'teal'}>{d.visibility === 'public' ? 'Public' : 'Researchers & staff'}</Pill>{d.source === 'researcher' && <Pill tone="blue">Researcher contribution</Pill>}{d.status !== 'published' && <StatusPill status={d.status === 'changes_requested' ? 'changes requested' : d.status} />}</div></div></div>
    <div className="ws-detail">
      <div className="ws-detail-main">
        <Panel title="Preview" actions={!locked && url ? <a className="ws-btn sm" href={url} download={d.fileName} onClick={() => actions.trackDoc(d.id, 'downloads')}><Download size={14} />Download</a> : undefined}>
          {locked ? <div className="viewer-locked"><Lock size={34} /><h3>Researcher access required</h3><p>Pay the library fee and upload your receipt to open this document.</p><Link className="ws-btn" href="/dashboard/library/access">Get access</Link></div>
            : !url ? <p className="ws-sub">Loading…</p> : d.type === 'pdf' ? <PdfView url={url} /> : d.type === 'video' ? <video src={url} controls className="viewer-video" /> : <div className="viewer-word"><DocIcon type="word" size={44} /><p>Word documents open in Microsoft Word, LibreOffice or Google Docs after download.</p></div>}
        </Panel>
        <Panel title="About this document">
          <p>{d.description || 'No description.'}</p>
          {d.text && <><h3 className="ws-h3">Summary</h3><p>{d.text}</p></>}
          {d.keywords?.length ? <div className="doc-kw">{d.keywords.map(k => <Link key={k} href={'/dashboard/library?q=' + encodeURIComponent(k)} className="ws-pill pill-grey">#{k}</Link>)}</div> : null}
        </Panel>
      </div>
      <aside className="ws-detail-side">
        <Panel title="Details">
          <dl className="ws-dl"><dt>Author</dt><dd>{contributor ? <Link href={'/dashboard/researchers/' + contributor.id}>{d.author}</Link> : d.author}</dd><dt>Year</dt><dd>{d.year}</dd><dt>Published</dt><dd>{fmtDate(d.publishedAt)}</dd><dt>File</dt><dd>{d.fileName}</dd><dt>Views</dt><dd>{d.views}</dd><dt>Downloads</dt><dd>{d.downloads}</dd></dl>
        </Panel>
        <Panel title={<><Quote size={16} />Cite this document</>}>
          <div className="ws-seg cite-seg"><button role="radio" aria-checked={style === 'apa'} onClick={() => setStyle('apa')}>APA</button><button role="radio" aria-checked={style === 'chicago'} onClick={() => setStyle('chicago')}>Chicago</button></div>
          <p className="doc-cite">{cite}</p>
          <button className="ws-btn sm ghost" onClick={async () => { try { await navigator.clipboard.writeText(cite); toast.success('Citation copied'); } catch { toast.error('Copy not available'); } }}><Copy size={14} />Copy citation</button>
        </Panel>
        {contributor && <Panel title="Contributor"><Link href={'/dashboard/researchers/' + contributor.id} className="ws-user-cell"><Avatar name={contributor.name} /><span><b>{contributor.name}</b><small>{contributor.institution}</small></span></Link></Panel>}
        <Panel title="Related documents">{related.length ? <ul className="ws-list">{related.map(r => <li key={r.id}><Link href={'/dashboard/library/doc/' + r.id}><DocIcon type={r.type} /><div><b>{r.title}</b><small>{r.author} · {r.year}</small></div></Link></li>)}</ul> : <Empty title="No related documents" />}</Panel>
      </aside>
    </div>
  </>;
}

/* ================= 17. Researcher profile ================= */
export function ResearcherProfile({ id }: { id: string }) {
  const { data, user } = useWS();
  const r = data.users.find(u => u.id === id && u.roleId === 'researcher');
  if (!r) return <Empty title="Researcher not found" />;
  const pubs = data.docs.filter(d => d.uploadedBy === r.id && d.status === 'published');
  const views = pubs.reduce((s, d) => s + d.views, 0), downloads = pubs.reduce((s, d) => s + d.downloads, 0);
  return <>
    <Link href="/dashboard/library" className="ws-back"><ArrowLeft size={15} />Library</Link>
    <section className="ws-panel rp-head"><Avatar name={r.name} size={72} /><div><div className="ws-eyebrow">RESEARCHER</div><h1>{r.name}</h1><p className="rp-inst"><Building2 size={15} />{r.institution || '—'}</p>{r.researchArea && <p className="rp-area"><BookOpen size={15} />{r.researchArea}</p>}{r.bio && <p>{r.bio}</p>}{r.id === user!.id && <Link className="ws-btn sm ghost" href="/dashboard/profile"><UserCircle2 size={14} />Edit my profile</Link>}</div>
      <div className="rp-stats"><div><b>{pubs.length}</b><span>publications</span></div><div><b>{views}</b><span>views</span></div><div><b>{downloads}</b><span>downloads</span></div></div></section>
    <Panel title="Published contributions">{pubs.length ? <div className="lib-grid">{pubs.map(d => <Link key={d.id} href={'/dashboard/library/doc/' + d.id} className={'lib-card t-' + d.type}><div className="lib-card-top"><DocIcon type={d.type} size={24} /><span className="lib-type">{d.type.toUpperCase()}</span></div><h3>{d.title}</h3><p>{d.description}</p><div className="lib-meta"><span>{d.year}</span><span>{d.views} views · {d.downloads} downloads</span></div></Link>)}</div> : <Empty title="No published contributions yet" />}</Panel>
  </>;
}

/* ================= 18. Review comments ================= */
export function ReviewThread({ doc, canComment = true }: { doc: LibDoc; canComment?: boolean }) {
  const { data, actions, userName } = useWS();
  const [body, setBody] = useState('');
  const list = data.reviewComments.filter(c => c.docId === doc.id).sort((a, b) => a.at.localeCompare(b.at));
  return <div className="rv-thread">
    <h4><MessageSquare size={14} />Review comments</h4>
    {list.length ? <ul className="ws-comments">{list.map(c => <li key={c.id} className={c.by === doc.uploadedBy ? 'mine' : ''}><Avatar name={userName(c.by)} size={28} /><div><b>{userName(c.by)}</b><small>{fmtDateTime(c.at)}</small><p>{c.body}</p></div></li>)}</ul> : <p className="ws-sub">No comments yet.</p>}
    {canComment && <form className="ws-comment-box" onSubmit={e => { e.preventDefault(); if (!body.trim()) return; actions.addReviewComment(doc.id, body.trim()); setBody(''); toast.success('Comment added'); }}>
      <textarea className="ws-input" rows={2} value={body} onChange={e => setBody(e.target.value)} placeholder="Write a comment…" /><button className="ws-btn" aria-label="Send comment"><Send size={16} /></button></form>}
  </div>;
}

export function RequestChangesDialog({ docId, onClose }: { docId: string | null; onClose: () => void }) {
  const { data, actions } = useWS();
  const [body, setBody] = useState('');
  const d = data.docs.find(x => x.id === docId);
  return <Modal open={!!docId} onClose={onClose} title="Request changes" description={d ? `“${d.title}” goes back to the researcher with your comments. They can upload a revised version.` : undefined}>
    <form className="ws-form" onSubmit={e => { e.preventDefault(); if (!body.trim()) return toast.error('Describe what should change'); actions.requestChanges(docId!, body.trim()); toast.success('Changes requested — the researcher was notified'); setBody(''); onClose(); }}>
      <F label="What should the researcher change?"><textarea className="ws-input" rows={4} value={body} onChange={e => setBody(e.target.value)} autoFocus placeholder="e.g. Add your methodology section and anonymise village names." /></F>
      <div className="ws-form-actions"><button type="button" className="ws-btn ghost" onClick={onClose}>Cancel</button><button className="ws-btn"><Send size={16} />Send to researcher</button></div>
    </form>
  </Modal>;
}

export function ResubmitDialog({ doc, onClose }: { doc: LibDoc | null; onClose: () => void }) {
  const { actions } = useWS();
  const [file, setFile] = useState<File | null>(null), [note, setNote] = useState(''), [busy, setBusy] = useState(false);
  return <Modal open={!!doc} onClose={onClose} title="Upload revised version" description={doc ? `“${doc.title}” – version ${(doc.version || 1) + 1}` : undefined}>
    {doc && <form className="ws-form" onSubmit={async e => {
      e.preventDefault();
      let f: { url: string; fileName: string; size: number; type?: LibDoc['type'] } | null = null;
      if (file) { const t = detectType(file); if (!t) return toast.error('PDF, Word or video only'); setBusy(true); f = { url: await saveFile(file), fileName: file.name, size: file.size, type: t }; }
      if (!f && !note.trim()) return toast.error('Upload a file or explain your changes');
      actions.resubmitDoc(doc.id, f, note.trim()); setBusy(false); toast.success('Resubmitted for review'); setFile(null); setNote(''); onClose();
    }}>
      <F label="Revised file (optional if only answering comments)"><label className="ws-drop"><Upload size={20} /><span>{file ? `${file.name} · ${fmtSize(file.size)}` : 'Choose the revised file'}</span><input type="file" accept={ACCEPT_DOCS} onChange={e => setFile(e.target.files?.[0] || null)} /></label></F>
      <F label="What did you change?"><textarea className="ws-input" rows={3} value={note} onChange={e => setNote(e.target.value)} /></F>
      <div className="ws-form-actions"><button type="button" className="ws-btn ghost" onClick={onClose}>Cancel</button><button className="ws-btn" disabled={busy}><FileUp size={16} />{busy ? 'Uploading…' : 'Resubmit'}</button></div>
    </form>}
  </Modal>;
}

export function DocLinkButton({ id }: { id: string }) { return <Link className="ws-btn ghost sm" href={'/dashboard/library/doc/' + id}><Eye size={15} />Details</Link>; }
