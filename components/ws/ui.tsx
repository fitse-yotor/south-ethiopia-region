'use client';
import React, { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, CheckCircle2, Clock, Download, FileText, FileType2, Film, Inbox, Lock, X } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { useFileUrl, fmtSize } from '@/lib/ws/files';
import { PdfView } from './pdf-view';
import { slaState, daysLeft, useWS } from '@/lib/ws/store';
import { translate } from '@/lib/ws/i18n';
import type { Case, LibDoc } from '@/lib/ws/types';

export const fmtDate = (iso?: string) => (iso ? new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');
export const fmtDateTime = (iso?: string) => (iso ? new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—');
export const ago = (iso: string) => {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return 'just now'; if (s < 3600) return Math.floor(s / 60) + ' min ago'; if (s < 86400) return Math.floor(s / 3600) + ' h ago';
  const d = Math.floor(s / 86400); return d === 1 ? 'yesterday' : d + ' days ago';
};

export function useTr() { const { prefs } = useWS(); return (s: string) => translate(prefs.lang, s); }
const tx = (tr: (s: string) => string, n: React.ReactNode) => (typeof n === 'string' ? tr(n) : n);
export function PageHead({ title, eyebrow, children, actions }: { title: string; eyebrow?: string; children?: React.ReactNode; actions?: React.ReactNode }) {
  const tr = useTr();
  return <div className="ws-head"><div>{eyebrow && <div className="ws-eyebrow">{tr(eyebrow)}</div>}<h1>{tr(title)}</h1>{children && <p>{children}</p>}</div>{actions && <div className="ws-head-actions">{actions}</div>}</div>;
}
export function Stat({ label, value, tone, icon, href, hint }: { label: string; value: React.ReactNode; tone?: 'red' | 'gold' | 'teal' | 'ink'; icon?: React.ReactNode; href?: string; hint?: string }) {
  const tr = useTr();
  const body = <>{icon && <span className="ws-stat-icon">{icon}</span>}<span className="ws-stat-label">{tr(label)}</span><strong>{value}</strong>{hint && <small>{hint}</small>}</>;
  return href ? <Link href={href} className={'ws-stat tone-' + (tone || 'teal')}>{body}</Link> : <div className={'ws-stat tone-' + (tone || 'teal')}>{body}</div>;
}
export function Pill({ children, tone = 'grey' }: { children: React.ReactNode; tone?: 'grey' | 'green' | 'red' | 'gold' | 'blue' | 'teal' }) {
  return <span className={'ws-pill pill-' + tone}>{children}</span>;
}
export function StatusPill({ status }: { status: string }) {
  const tone = ({ Closed: 'grey', 'Judgment delivered': 'green', 'In court': 'blue', 'Charge filed': 'teal', Adjourned: 'gold', 'Under investigation': 'gold', Registered: 'grey', approved: 'green', published: 'green', active: 'green', pending: 'gold', 'changes requested': 'blue', booked: 'gold', confirmed: 'blue', completed: 'green', cancelled: 'grey', Submitted: 'gold', Reviewed: 'green', rejected: 'red', inactive: 'red' } as Record<string, 'grey' | 'green' | 'red' | 'gold' | 'blue' | 'teal'>)[status] || 'grey';
  return <Pill tone={tone}>{status[0].toUpperCase() + status.slice(1)}</Pill>;
}
export function SlaPill({ c }: { c: Case }) {
  const { data } = useWS();
  const s = slaState(c, data.settings.dueSoonDays), d = daysLeft(c);
  if (s === 'closed') return <Pill tone="grey"><CheckCircle2 size={13} />Closed</Pill>;
  if (s === 'overdue') return <Pill tone="red"><AlertTriangle size={13} />Overdue {Math.abs(d)}d{c.permitUntil && new Date(c.permitUntil).getTime() > Date.now() ? ' · permitted' : ''}</Pill>;
  if (s === 'due-soon') return <Pill tone="gold"><Clock size={13} />Due in {d}d</Pill>;
  return <Pill tone="green"><Clock size={13} />{d}d left</Pill>;
}
export function Empty({ title, children, icon }: { title: string; children?: React.ReactNode; icon?: React.ReactNode }) {
  const tr = useTr();
  return <div className="ws-empty">{icon || <Inbox size={34} />}<h3>{tr(title)}</h3>{children && <p>{children}</p>}</div>;
}
export function Panel({ title, children, actions, className = '' }: { title?: React.ReactNode; children: React.ReactNode; actions?: React.ReactNode; className?: string }) {
  const tr = useTr();
  return <section className={'ws-panel ' + className}>{(title || actions) && <div className="ws-panel-head">{title && <h2>{tx(tr, title)}</h2>}{actions}</div>}{children}</section>;
}
export function F({ label, children, hint, wide }: { label: string; children: React.ReactNode; hint?: string; wide?: boolean }) {
  const tr = useTr();
  return <label className={'ws-field' + (wide ? ' wide' : '')}><span>{tr(label)}</span>{children}{hint && <small>{hint}</small>}</label>;
}
export function Sel({ value, onChange, options, ...rest }: { value: string; onChange: (v: string) => void; options: (string | [string, string])[] } & Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'onChange'>) {
  return <select className="ws-input" value={value} onChange={e => onChange(e.target.value)} {...rest}>{options.map(o => Array.isArray(o) ? <option key={o[0]} value={o[0]}>{o[1]}</option> : <option key={o}>{o}</option>)}</select>;
}
export function Modal({ open, onClose, title, description, children, wide }: { open: boolean; onClose: () => void; title: string; description?: string; children: React.ReactNode; wide?: boolean }) {
  return <Dialog open={open} onOpenChange={o => !o && onClose()}><DialogContent className={'ws-modal' + (wide ? ' wide' : '')}><DialogTitle>{title}</DialogTitle>{description ? <DialogDescription>{description}</DialogDescription> : <DialogDescription className="sr-only">{title}</DialogDescription>}{children}</DialogContent></Dialog>;
}
export function DataTable({ head, children, empty }: { head: React.ReactNode[]; children: React.ReactNode; empty?: boolean }) {
  return <div className="ws-table-wrap"><table className="ws-table"><thead><tr>{head.map((h, i) => <th key={i}>{h}</th>)}</tr></thead><tbody>{children}</tbody></table>{empty && <Empty title="Nothing to show">Try changing the filters.</Empty>}</div>;
}

export function DocIcon({ type, size = 20 }: { type: LibDoc['type']; size?: number }) {
  return type === 'video' ? <Film size={size} className="doc-ic video" /> : type === 'word' ? <FileType2 size={size} className="doc-ic word" /> : <FileText size={size} className="doc-ic pdf" />;
}

export function DocViewer({ doc, onClose, locked }: { doc: LibDoc | null; onClose: () => void; locked?: boolean }) {
  const { actions, data } = useWS();
  const url = useFileUrl(doc?.url);
  useEffect(() => { if (doc && !locked) actions.trackDoc(doc.id, 'views'); }, [doc?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!doc) return null;
  const cat = data.categories.find(c => c.id === doc.categoryId);
  return <Dialog open onOpenChange={o => !o && onClose()}><DialogContent className="ws-modal viewer">
    <DialogTitle className="viewer-title"><DocIcon type={doc.type} />{doc.title}</DialogTitle>
    <DialogDescription>{cat?.name} · {doc.author} · {doc.year} · {fmtSize(doc.size)}</DialogDescription>
    {locked ? <div className="viewer-locked"><Lock size={34} /><h3>Researcher access required</h3><p>This document is available to approved researchers. Register, pay the library fee with Telebirr and upload your receipt.</p><Link className="ws-btn" href="/dashboard/register">Register as researcher</Link><Link className="ws-btn ghost" href="/dashboard/login">Sign in</Link></div>
      : <div className="viewer-body">
        {doc.description && <p className="viewer-desc">{doc.description}</p>}
        {!url ? <p>Loading file…</p> : doc.type === 'pdf' ? <PdfView url={url} className="viewer-frame" /> : doc.type === 'video' ? <video src={url} controls className="viewer-video" /> :
          <div className="viewer-word"><FileType2 size={48} /><p>Word documents open in Microsoft Word, LibreOffice or Google Docs after download.</p></div>}
        {url && <a className="ws-btn" href={url} download={doc.fileName} onClick={() => actions.trackDoc(doc.id, 'downloads')}><Download size={16} />Download {doc.type === 'word' ? 'Word file' : doc.type === 'video' ? 'video' : 'PDF'}</a>}
      </div>}
    <button className="viewer-close" onClick={onClose} aria-label="Close"><X /></button>
  </DialogContent></Dialog>;
}

export function Avatar({ name, size = 34 }: { name: string; size?: number }) {
  const ini = name.replace(/^Dr\.\s*/, '').split(' ').map(x => x[0]).slice(0, 2).join('');
  let h = 0; for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) % 360;
  return <span className="ws-avatar" style={{ width: size, height: size, background: `hsl(${h} 35% 32%)`, fontSize: size * 0.38 }}>{ini}</span>;
}

export function Bars({ data, max }: { data: { label: string; value: number; tone?: string }[]; max?: number }) {
  const m = max || Math.max(1, ...data.map(d => d.value));
  return <div className="ws-bars">{data.map(d => <div key={d.label} className="ws-bar-row"><span>{d.label}</span><div><i style={{ width: (d.value / m) * 100 + '%' }} className={d.tone ? 'tone-' + d.tone : ''} /></div><b>{d.value}</b></div>)}</div>;
}
