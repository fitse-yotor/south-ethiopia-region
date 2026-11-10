'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, BadgeCheck, BarChart3, BookOpen, Briefcase, CalendarDays, FileText, Film, Folder, Gavel, HandHeart, Landmark, Lock, LogIn, Megaphone, Scale, ScrollText, ShieldCheck, UserPlus, Users } from 'lucide-react';
import { useWS } from '@/lib/ws/store';
import { LibraryExplorer } from '@/components/ws/library';
import { DocIcon, DocViewer } from '@/components/ws/ui';
import type { LibDoc } from '@/lib/ws/types';

type T = (en: string, am: string) => string;
function Intro({ eyebrow = 'SOUTHERN ETHIOPIA JUSTICE', title, children }: { eyebrow?: string; title: string; children?: React.ReactNode }) {
  return <div className="page-intro"><div className="eyebrow">{eyebrow}</div><h1>{title}</h1>{children && <p>{children}</p>}</div>;
}
function Go({ href, children }: { href: string; children: React.ReactNode }) { return <Link className="sp-go" href={href}>{children}<ArrowRight size={16} /></Link>; }
const Sample = () => <span className="badge">Sample content · requires official verification</span>;

export const SITE_PAGES = ['library', 'mission-vision', 'powers-duties', 'prosecution', 'legal-aid', 'advocates', 'press-releases', 'videos', 'publications', 'vacancies', 'tenders'];

export function SitePage({ kind, t }: { kind: string; t: T }) {
  switch (kind) {
    case 'library': return <PublicLibrary t={t} />;
    case 'mission-vision': return <>
      <Intro title={t('Mission, vision & values', 'ተልዕኮ፣ ራዕይ እና እሴቶች')}>What guides the Southern Ethiopia Regional Justice Bureau.</Intro>
      <div className="sp-grid3">
        <article className="panel sp-card"><Landmark /><h2>Vision</h2><p>To see a zone where the rule of law prevails, justice is accessible to all and human rights are respected.</p></article>
        <article className="panel sp-card"><Scale /><h2>Mission</h2><p>Provide efficient prosecution, legal aid and legal awareness services; coordinate justice institutions; and support customary dispute resolution in line with the constitution.</p></article>
        <article className="panel sp-card"><ShieldCheck /><h2>Values</h2><ul className="sp-list">{['Rule of law', 'Integrity & impartiality', 'Transparency & accountability', 'Respect for human rights', 'Service excellence', 'Respect for cultural diversity'].map(v => <li key={v}>{v}</li>)}</ul></article>
      </div><Sample />
    </>;
    case 'powers-duties': return <>
      <Intro title={t('Powers & duties', 'ስልጣንና ተግባር')}>Summary of the department’s mandate, based on regional proclamations (for verification).</Intro>
      <div className="sp-grid2">{[
        ['Prosecution', 'Investigate-led prosecution of criminal cases on behalf of the public and the regional state.'],
        ['Legal advice', 'Provide legal advice to zone and woreda government offices and review draft directives.'],
        ['Legal aid', 'Coordinate free legal aid for women, children, persons with disabilities and indigent people.'],
        ['Advocates', 'Register and license advocates practising before zone and woreda courts.'],
        ['Legal awareness', 'Conduct public legal education, including in pastoralist communities.'],
        ['Customary justice', 'Support and document customary dispute resolution consistent with human rights.'],
        ['Crime prevention', 'Coordinate crime prevention with police, courts and community structures.'],
        ['Public property & interest', 'Represent the government in civil cases and protect public property.'],
      ].map(([h, p]) => <article key={h} className="panel sp-duty"><BadgeCheck /><div><h3>{h}</h3><p>{p}</p></div></article>)}</div><Sample />
    </>;
    case 'prosecution': return <ServicePage t={t} icon={<Gavel />} title={t('Public prosecution', 'የዐቃቤ ሕግ አገልግሎት')} intro="Public prosecutors handle criminal cases from investigation to judgment, within service level agreements set for each case category."
      steps={['Police investigation file is received and registered.', 'Prosecutor reviews evidence and decides to charge or close.', 'Charge is filed and the case is followed in court.', 'Judgment, appeal and closure are recorded.']}
      extra={<p>Prosecutors report daily, weekly and monthly to the Woreda Coordinator. Staff can <Link href="/dashboard/login">sign in to the prosecution portal</Link>.</p>} />;
    case 'legal-aid': return <ServicePage t={t} icon={<HandHeart />} title={t('Free legal aid', 'ነጻ የሕግ ድጋፍ')} intro="Free legal advice and representation for people who cannot afford a lawyer, with priority for women, children, elderly people and persons with disabilities."
      steps={['Visit the zone office or your woreda justice office.', 'Explain your case and bring available documents.', 'An officer assesses eligibility.', 'You receive advice, document drafting or referral to representation.']} />;
    case 'advocates': return <ServicePage t={t} icon={<Briefcase />} title={t('Advocates licensing', 'የጥብቅና ፈቃድ')} intro="Registration, licensing and annual renewal for advocates practising before zone and woreda courts."
      steps={['Prepare your LLB/degree, ID, photos and experience letters.', 'Submit the application form to the zone office.', 'Sit the qualification exam where required.', 'Pay the fee and collect the licence. Renew annually.']} />;
    case 'press-releases': return <Listing t={t} title={t('Press releases', 'ጋዜጣዊ መግለጫ')} intro="Official statements from the department." icon={<Megaphone />} items={[
      ['Department launches digital library for researchers', 'The new digital library gives researchers access to laws, manuals and research after a simple Telebirr payment.', 3],
      ['Prosecution portal introduces SLA monitoring', 'Each case category now has a service level agreement monitored by the Woreda Coordinator.', 12],
      ['Legal awareness campaign reaches Hamer and Dasenech', 'Community dialogue sessions held in partnership with elders and woreda offices.', 30],
    ]} />;
    case 'vacancies': return <Listing t={t} title={t('Vacancies', 'ክፍት የስራ ቦታ')} intro="Open positions at the zone department and woreda offices." icon={<Users />} items={[
      ['Public Prosecutor II – Hamer woreda (2 posts)', 'LLB with 2 years of experience. Deadline in 10 days.', 2],
      ['Legal Aid Officer – Wolaita Sodo', 'LLB, good communication in Amharic and a local language. Deadline in 14 days.', 5],
      ['Records & ICT Assistant', 'Diploma in IT or records management. Deadline in 7 days.', 8],
    ]} />;
    case 'tenders': return <Listing t={t} title={t('Tenders', 'ጨረታ')} intro="Procurement notices." icon={<ScrollText />} items={[
      ['Supply of office furniture for woreda offices', 'National open tender. Bid documents available at the zone finance office.', 4],
      ['Printing of legal awareness materials', 'Request for quotation. Submission within 10 working days.', 9],
    ]} />;
    case 'videos': return <MediaDocs t={t} title={t('Videos', 'ቪዲዮዎች')} intro="Training and awareness videos from the digital library." filter={d => d.type === 'video'} />;
    case 'publications': return <MediaDocs t={t} title={t('Publications', 'ህትመቶች')} intro="Reports, research and manuals published by the department and contributed by researchers." filter={d => d.type !== 'video' && !['c-forms'].includes(d.categoryId)} />;
  }
  return null;
}

function ServicePage({ title, intro, steps, icon, extra }: { t: T; title: string; intro: string; steps: string[]; icon: React.ReactNode; extra?: React.ReactNode }) {
  return <>
    <Intro eyebrow="SERVICES" title={title}>{intro}</Intro>
    <div className="two-col"><article className="panel prose"><h2>How it works</h2><ol className="sp-steps">{steps.map((s, i) => <li key={i}><span>{i + 1}</span>{s}</li>)}</ol>{extra}</article>
      <aside className="panel sp-help">{icon}<h3>Need help?</h3><p>Visit the Southern Ethiopia Regional Justice Bureau in Wolaita Sodo, your zone justice office or your woreda justice office during working hours.</p><Go href="/offices">Find an office</Go><Go href="/contact">Contact us</Go></aside></div>
    <Sample />
  </>;
}
function Listing({ title, intro, items, icon }: { t: T; title: string; intro: string; icon: React.ReactNode; items: [string, string, number][] }) {
  return <>
    <Intro eyebrow="MEDIA & NOTICES" title={title}>{intro}</Intro>
    <div className="sp-listing">{items.map(([h, p, d]) => <article key={h} className="panel">{icon}<div><small><CalendarDays size={13} />{new Date(Date.now() - d * 86400000).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}</small><h3>{h}</h3><p>{p}</p></div></article>)}</div>
    <Sample />
  </>;
}
function MediaDocs({ t, title, intro, filter }: { t: T; title: string; intro: string; filter: (d: LibDoc) => boolean }) {
  const { ready, data, user } = useWS();
  const [open, setOpen] = useState<LibDoc | null>(null);
  if (!ready) return <Intro title={title}>{intro}</Intro>;
  if (!user) return <LibraryLanding t={t} compact={title} />;
  const docs = data.docs.filter(d => d.status === 'published' && d.visibility === 'public' && filter(d));
  const locked = data.docs.filter(d => d.status === 'published' && d.visibility === 'researchers' && filter(d)).length;
  return <>
    <Intro eyebrow="DIGITAL LIBRARY" title={title}>{intro}</Intro>
    <div className="lib-grid public">{docs.map(d => <button key={d.id} className={'lib-card t-' + d.type} onClick={() => setOpen(d)}>
      {d.type === 'video' ? <video className="lib-thumb" src={d.url + '#t=2'} muted preload="metadata" /> : <div className="lib-card-top"><DocIcon type={d.type} size={26} /><span className="lib-type">{d.type.toUpperCase()}</span></div>}
      <h3>{d.title}</h3><p>{d.description}</p><div className="lib-meta"><span>{d.author}</span><span>{d.year}</span></div></button>)}</div>
    {locked > 0 && <p className="sp-more"><FileText size={16} />{locked} more item{locked > 1 ? 's are' : ' is'} available to registered researchers in the <Link href="/library">digital library</Link>.</p>}
    <DocViewer doc={open} onClose={() => setOpen(null)} />
  </>;
}

function PublicLibrary({ t }: { t: T }) {
  const { ready, user, hasLibraryAccess } = useWS();
  if (!ready) return <Intro eyebrow="DIGITAL LIBRARY" title={t('Digital Library', 'ዲጂታል ቤተ መጻሕፍት')} />;
  if (!user) return <LibraryLanding t={t} />;
  return <>
    <Intro eyebrow="DIGITAL LIBRARY" title={t('Digital Library', 'ዲጂታል ቤተ መጻሕፍት')}>Welcome back, {user.name}. Browse laws, research, manuals, reports and training videos by folder.</Intro>
    {!hasLibraryAccess() && <div className="ws-banner warn"><Lock /><div><b>Limited access</b><p>Researcher-only documents unlock after your Telebirr payment is approved.</p></div><Link className="ws-btn sm" href="/dashboard/library/access">Get full access</Link></div>}
    <LibraryExplorer fullAccess={hasLibraryAccess()} />
  </>;
}

const CAT_ICONS: Record<string, React.ReactNode> = { 'c-laws': <Scale />, 'c-research': <BookOpen />, 'c-manuals': <ScrollText />, 'c-videos': <Film />, 'c-reports': <BarChart3 />, 'c-forms': <FileText /> };

export function LibraryLanding({ t, compact }: { t: T; compact?: string }) {
  const { ready, data } = useWS();
  const fee = ready ? data.settings.libraryFee : 200;
  const pub = ready ? data.docs.filter(d => d.status === 'published') : [];
  const roots = ready ? data.categories.filter(c => !c.parentId) : [];
  const n = (id: string) => pub.filter(d => d.categoryId === id || data.categories.find(c => c.id === d.categoryId)?.parentId === id).length;
  return <div className="dl-landing">
    <section className="dl-hero">
      <div className="dl-hero-text">
        <div className="eyebrow">{compact ? 'AVAILABLE IN THE DIGITAL LIBRARY' : 'DIGITAL LIBRARY · ዲጂታል ቤተ መጻሕፍት'}</div>
        <h1>{compact || t('Justice knowledge for Southern Ethiopia, in one place', 'የፍትሕ እውቀት በአንድ ቦታ')}</h1>
        <p>The Southern Ethiopia Regional Justice Bureau Digital Library brings together laws and proclamations, research on customary and criminal justice, practice manuals, annual reports and training videos. Sign in to browse the collection.</p>
        <div className="dl-cta"><Link className="ws-btn lg" href="/dashboard/login?next=/library"><LogIn size={18} />Sign in</Link><Link className="ws-btn lg ghost-light" href="/dashboard/register"><UserPlus size={18} />Create researcher account</Link></div>
        <small className="dl-hero-note"><Lock size={13} />Documents are visible only to signed-in users.</small>
      </div>
      <div className="dl-hero-stats">
        <div><b>{pub.length || '—'}</b><span>documents</span></div>
        <div><b>{roots.length || '—'}</b><span>collections</span></div>
        <div><b>3</b><span>formats: PDF, Word, video</span></div>
        <div><b>{fee} ETB</b><span>researcher access fee</span></div>
      </div>
    </section>

    <section className="dl-section">
      <h2>What’s in the collection</h2>
      <div className="dl-cats">{(roots.length ? roots : []).map(c => <article key={c.id}><span className="dl-cat-ic">{CAT_ICONS[c.id] || <Folder />}</span><div><h3>{c.name}</h3><p>{c.description}</p></div><em>{n(c.id)} item{n(c.id) === 1 ? '' : 's'}</em></article>)}</div>
    </section>

    <section className="dl-section dl-two">
      <div>
        <h2>Become a researcher</h2>
        <p>Students, academics and practitioners can register for full access and publish their own research in the library.</p>
        <ol className="dl-steps">
          <li><span>1</span><div><b>Create an account</b><p>Tell us your institution and research purpose.</p></div></li>
          <li><span>2</span><div><b>Pay {fee} ETB with Telebirr</b><p>Pay to the department’s merchant code from your phone.</p></div></li>
          <li><span>3</span><div><b>Upload your receipt</b><p>A screenshot or PDF of the payment receipt.</p></div></li>
          <li><span>4</span><div><b>Get approved & contribute</b><p>After the Library Admin verifies it, read every document and submit your research for publication.</p></div></li>
        </ol>
        <Link className="ws-btn" href="/dashboard/register"><UserPlus size={16} />Register now</Link>
      </div>
      <div className="dl-access">
        <h3>Who can access what</h3>
        <table><thead><tr><th></th><th>Visitors</th><th>Signed-in</th><th>Approved researchers</th></tr></thead><tbody>
          <tr><td>About the library</td><td>✓</td><td>✓</td><td>✓</td></tr>
          <tr><td>Browse documents</td><td>—</td><td>Public items</td><td>All items</td></tr>
          <tr><td>Download & stream videos</td><td>—</td><td>Public items</td><td>✓</td></tr>
          <tr><td>Contribute research</td><td>—</td><td>—</td><td>✓</td></tr>
        </tbody></table>
        <div className="dl-help"><ShieldCheck size={18} /><p>Staff (prosecutors, directors, library and content staff) sign in with the account provided by the Super Admin.</p></div>
      </div>
    </section>
  </div>;
}
