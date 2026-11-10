'use client';
import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { CalendarCheck, CheckCircle2, Clock, MapPin, Phone, Printer, Share2, Star } from 'lucide-react';
import { toast } from 'sonner';
import { useWS, isOverdue } from '@/lib/ws/store';
import { OFFICES } from '@/lib/ws/types';
import { ZONES } from '@/lib/ws/org';
import { sampleCases } from '@/lib/content';
import { ChartCard, lastMonths, SLOT } from '@/components/ws/charts';
import { Calendar, isoDay } from '@/components/ws/calendar';
import { OmoMap } from '@/components/ws/omo-map';

type T = (en: string, am: string) => string;
function Intro({ eyebrow = 'SOUTHERN ETHIOPIA JUSTICE', title, children }: { eyebrow?: string; title: string; children?: React.ReactNode }) {
  return <div className="page-intro"><div className="eyebrow">{eyebrow}</div><h1>{title}</h1>{children && <p>{children}</p>}</div>;
}
const Sample = () => <span className="badge">Sample data · requires official verification</span>;

/* ---------------- 1. Public statistics ---------------- */
export function StatisticsPage({ t }: { t: T }) {
  const { ready, data } = useWS();
  if (!ready) return <Intro title={t('Justice in numbers', 'ፍትሕ በቁጥር')} />;
  const months = lastMonths(6);
  const perMonth = months.map(m => ({ name: m.label, opened: data.cases.filter(c => c.openedAt.startsWith(m.key)).length, closed: data.statusChanges.filter(s => ['Closed', 'Judgment delivered'].includes(s.to) && s.at.startsWith(m.key)).length }));
  const open = data.cases.filter(c => c.status !== 'Closed');
  const compliance = open.length ? Math.round(((open.length - open.filter(c => isOverdue(c)).length) / open.length) * 100) : 100;
  const legalAid = data.appointments.filter(a => a.status === 'completed').length;
  const resolved = sampleCases.filter(c => ['Resolved', 'Closed'].includes(c.status)).length;
  const avg = data.ratings.length ? data.ratings.reduce((s, r) => s + r.stars, 0) / data.ratings.length : 0;
  const issues = Object.entries(data.appointments.reduce<Record<string, number>>((m, a) => ({ ...m, [a.issue]: (m[a.issue] || 0) + 1 }), {})).map(([name, n]) => ({ name, requests: n })).sort((a, b) => b.requests - a.requests);
  const stars = [5, 4, 3, 2, 1].map(s => ({ name: '★'.repeat(s), ratings: data.ratings.filter(r => r.stars === s).length }));
  const tiles: [string, string | number, string][] = [
    [t('Cases handled', 'የተያዙ መዝገቦች'), data.cases.length, t('registered by prosecutors', 'በዐቃቤ ሕግ የተመዘገቡ')],
    [t('Cases closed or judged', 'የተዘጉ/ውሳኔ ያገኙ'), data.cases.filter(c => ['Closed', 'Judgment delivered'].includes(c.status)).length, t('final outcome reached', 'የመጨረሻ ውሳኔ')],
    [t('SLA compliance', 'የጊዜ ገደብ አፈጻጸም'), compliance + '%', t('open cases within their time limit', 'በጊዜ ገደብ ውስጥ ያሉ')],
    [t('Legal aid sessions', 'የነጻ ሕግ ድጋፍ'), legalAid, t('completed appointments', 'የተጠናቀቁ ቀጠሮዎች')],
    [t('Complaints resolved', 'የተፈቱ ቅሬታዎች'), resolved, t('from the online complaint service', 'ከመስመር ላይ ቅሬታ')],
    [t('Citizen satisfaction', 'የዜጎች እርካታ'), avg.toFixed(1) + ' / 5', `${data.ratings.length} ${t('ratings', 'ደረጃዎች')}`],
  ];
  return <>
    <Intro eyebrow={t('TRANSPARENCY', 'ግልጽነት')} title={t('Justice in numbers', 'ፍትሕ በቁጥር')}>{t('Aggregated figures on cases, legal aid and service quality. No personal information is shown.', 'ስለ መዝገቦች፣ የሕግ ድጋፍና የአገልግሎት ጥራት የተጠቃለሉ አሃዞች። የግል መረጃ አይታይም።')}</Intro>
    <div className="sp-tiles">{tiles.map(([l, v, s]) => <div key={l} className="sp-tile"><span>{l}</span><strong>{v}</strong><small>{s}</small></div>)}</div>
    <div className="viz-grid">
      <ChartCard title={t('Cases opened and closed per month', 'በወር የተከፈቱና የተዘጉ መዝገቦች')} subtitle={t('Last 6 months', 'ያለፉት 6 ወራት')} data={perMonth} xKey="name" series={[{ key: 'opened', label: t('Opened', 'የተከፈቱ') }, { key: 'closed', label: t('Closed / judged', 'የተዘጉ') }]} />
      <ChartCard title={t('Legal aid requests by issue', 'የሕግ ድጋፍ ጥያቄዎች በጉዳይ')} data={issues} xKey="name" kind="hbar" series={[{ key: 'requests', label: t('Requests', 'ጥያቄዎች') }]} />
      <ChartCard title={t('Service ratings', 'የአገልግሎት ደረጃ')} subtitle={t('How citizens rated our services', 'ዜጎች የሰጡት ደረጃ')} data={stars} xKey="name" kind="hbar" series={[{ key: 'ratings', label: t('Ratings', 'ደረጃዎች'), color: SLOT[2] }]} />
      <section className="ws-panel sp-cta-card"><h2>{t('Rate our service', 'አገልግሎታችንን ይገምግሙ')}</h2><p>{t('Tell us how we did. Your rating helps us improve.', 'አስተያየትዎ እንድንሻሻል ይረዳናል።')}</p><Link className="ws-btn" href="/feedback"><Star size={16} />{t('Give feedback', 'አስተያየት ይስጡ')}</Link></section>
    </div>
    <Sample />
  </>;
}

/* ---------------- 2. Legal aid booking ---------------- */
const SLOTS = ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '14:00', '14:30', '15:00', '15:30'];
export const ISSUES = ['Family / divorce', 'Land dispute', 'Inheritance', 'Gender-based violence', 'Labour / employment', 'Criminal case advice', 'Other'];
export function BookAppointment({ t }: { t: T }) {
  const { ready, data, actions } = useWS();
  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
  const [f, setF] = useState({ office: 'Ari Zone office', date: isoDay(tomorrow), time: '', name: '', phone: '', issue: ISSUES[0], details: '', consent: false });
  const [code, setCode] = useState<string | null>(null), [err, setErr] = useState('');
  if (!ready) return <Intro title={t('Book a legal aid appointment', 'የሕግ ድጋፍ ቀጠሮ ይያዙ')} />;
  const taken = new Set(data.appointments.filter(a => a.office === f.office && a.date === f.date && a.status !== 'cancelled').map(a => a.time));
  const sunday = new Date(f.date + 'T12:00').getDay() === 0;
  if (code) return <div className="sp-done panel"><CheckCircle2 size={44} /><h1>{t('Appointment booked', 'ቀጠሮዎ ተይዟል')}</h1><p>{t('Keep this confirmation code and bring an ID and any documents.', 'ይህን ኮድ ይያዙ፤ መታወቂያና ሰነዶችን ይዘው ይምጡ።')}</p>
    <div className="sp-code">{code}</div><dl className="ws-dl"><dt>{t('Office', 'ቢሮ')}</dt><dd>{f.office}</dd><dt>{t('Date & time', 'ቀንና ሰዓት')}</dt><dd>{new Date(f.date + 'T12:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}, {f.time}</dd><dt>{t('Issue', 'ጉዳይ')}</dt><dd>{f.issue}</dd></dl>
    <div className="ws-form-actions"><button className="ws-btn ghost" onClick={() => window.print()}><Printer size={16} />{t('Print', 'አትም')}</button><button className="ws-btn" onClick={() => { setCode(null); setF({ ...f, time: '', details: '', consent: false }); }}>{t('Book another', 'ሌላ ቀጠሮ')}</button></div>
    <small className="ws-sub">{t('Demonstration: the booking is stored in this browser only.', 'ማሳያ፡ ቀጠሮው በዚህ አሳሽ ብቻ ይቀመጣል።')}</small></div>;
  return <>
    <Intro eyebrow={t('FREE LEGAL AID', 'ነጻ የሕግ ድጋፍ')} title={t('Book a legal aid appointment', 'የሕግ ድጋፍ ቀጠሮ ይያዙ')}>{t('Free legal advice for people who cannot afford a lawyer. Choose an office, date and time.', 'ጠበቃ መቅጠር ለማይችሉ ነጻ የሕግ ምክር። ቢሮ፣ ቀንና ሰዓት ይምረጡ።')}</Intro>
    <form className="sp-book panel" onSubmit={e => {
      e.preventDefault(); setErr('');
      if (sunday) return setErr(t('Offices are closed on Sunday. Choose another day.', 'እሁድ ቢሮዎች ዝግ ናቸው።'));
      if (!f.time) return setErr(t('Choose a time.', 'ሰዓት ይምረጡ።'));
      if (!/^\+?[\d\s-]{9,15}$/.test(f.phone)) return setErr(t('Enter a valid phone number.', 'ትክክለኛ ስልክ ቁጥር ያስገቡ።'));
      if (!f.consent) return setErr(t('Please accept the privacy notice.', 'የግላዊነት ማሳሰቢያውን ይቀበሉ።'));
      setCode(actions.bookAppointment({ office: f.office, date: f.date, time: f.time, name: f.name, phone: f.phone, issue: f.issue, details: f.details }));
    }}>
      <div className="ws-grid2">
        <label className="ws-field"><span>{t('Office', 'ቢሮ')}</span><select className="ws-input" value={f.office} onChange={e => setF({ ...f, office: e.target.value, time: '' })}>{OFFICES.map(o => <option key={o}>{o}</option>)}</select></label>
        <label className="ws-field"><span>{t('Date', 'ቀን')}</span><input className="ws-input" type="date" min={isoDay(tomorrow)} value={f.date} onChange={e => setF({ ...f, date: e.target.value, time: '' })} required /></label>
      </div>
      <div className="ws-field"><span>{t('Time', 'ሰዓት')}</span>{sunday ? <p className="ws-error">{t('Closed on Sunday', 'እሁድ ዝግ ነው')}</p> : <div className="sp-slots">{SLOTS.map(s => <button type="button" key={s} disabled={taken.has(s)} aria-pressed={f.time === s} onClick={() => setF({ ...f, time: s })}>{s}{taken.has(s) && <small>{t('booked', 'ተይዟል')}</small>}</button>)}</div>}</div>
      <div className="ws-grid2">
        <label className="ws-field"><span>{t('Full name', 'ሙሉ ስም')}</span><input className="ws-input" required value={f.name} onChange={e => setF({ ...f, name: e.target.value })} /></label>
        <label className="ws-field"><span>{t('Phone', 'ስልክ')}</span><input className="ws-input" required inputMode="tel" placeholder="+251 9…" value={f.phone} onChange={e => setF({ ...f, phone: e.target.value })} /></label>
        <label className="ws-field"><span>{t('Type of issue', 'የጉዳዩ አይነት')}</span><select className="ws-input" value={f.issue} onChange={e => setF({ ...f, issue: e.target.value })}>{ISSUES.map(i => <option key={i}>{i}</option>)}</select></label>
        <label className="ws-field wide"><span>{t('Short description (optional)', 'አጭር መግለጫ (አማራጭ)')}</span><textarea className="ws-input" rows={3} value={f.details} onChange={e => setF({ ...f, details: e.target.value })} /></label>
      </div>
      <label className="ws-check"><input type="checkbox" checked={f.consent} onChange={e => setF({ ...f, consent: e.target.checked })} />{t('I agree that the office uses my name and phone to manage this appointment.', 'ቢሮው ስሜንና ስልኬን ለቀጠሮው እንዲጠቀም እስማማለሁ።')}</label>
      {err && <p className="ws-error">{err}</p>}
      <button className="ws-btn lg"><CalendarCheck size={18} />{t('Book appointment', 'ቀጠሮ ያዝ')}</button>
    </form>
  </>;
}

/* ---------------- 3. Find my office (map) ---------------- */
export const OFFICE_INFO: Record<string, { town: string; phone: string; hours: string; directions: string }> = Object.fromEntries(ZONES.map(z => [z.name + ' office', {
  town: z.seat || '', phone: 'To be confirmed', hours: 'Mon–Fri 8:30–12:30, 13:30–17:30', directions: `${z.seat} - zone administration centre. Sample entry: contact details to be confirmed by the zone.`,
}]));
export function FindOffice({ t }: { t: T }) {
  const [sel, setSel] = useState('Ari Zone office');
  const info = OFFICE_INFO[sel];
  return <>
    <Intro eyebrow={t('CONTACT', 'ያግኙን')} title={t('Find my office', 'ቢሮዬን ፈልግ')}>{t('Tap an office on the map to see its phone number, opening hours and directions.', 'የቢሮውን ስልክ፣ የስራ ሰዓትና አቅጣጫ ለማየት ካርታው ላይ ይጫኑ።')}</Intro>
    <div className="sp-map-layout">
      <div className="panel"><OmoMap markers={OFFICES.map(o => ({ office: o, tone: o === sel ? 'red' : 'teal', size: o === sel ? 10 : 8 }))} selected={sel} onSelect={setSel} /></div>
      <aside className="panel sp-office">
        <MapPin size={28} /><h2>{sel}</h2><p className="ws-sub">{info.town}</p>
        <dl className="ws-dl"><dt><Phone size={14} /> {t('Phone', 'ስልክ')}</dt><dd><a href={`tel:${info.phone.replace(/\s/g, '')}`}>{info.phone}</a></dd><dt><Clock size={14} /> {t('Hours', 'የስራ ሰዓት')}</dt><dd>{info.hours}</dd><dt><MapPin size={14} /> {t('Directions', 'አቅጣጫ')}</dt><dd>{info.directions}</dd></dl>
        <div className="ws-form-actions"><Link className="ws-btn" href="/book-appointment"><CalendarCheck size={16} />{t('Book legal aid here', 'ቀጠሮ ይያዙ')}</Link></div>
        <select className="ws-input" aria-label="Choose office" value={sel} onChange={e => setSel(e.target.value)}>{OFFICES.map(o => <option key={o}>{o}</option>)}</select>
      </aside>
    </div>
    <div className="sp-office-list">{OFFICES.map(o => <button key={o} className={'panel' + (o === sel ? ' sel' : '')} onClick={() => { setSel(o); window.scrollTo({ top: 0, behavior: 'smooth' }); }}><b>{o}</b><span>{OFFICE_INFO[o].town} · {OFFICE_INFO[o].phone}</span></button>)}</div>
    <Sample />
  </>;
}

/* ---------------- 4. Know your rights ---------------- */
const GUIDES: { slug: string; icon: string; en: string; am: string; points: [string, string][] }[] = [
  { slug: 'arrest', icon: '⚖️', en: 'Your rights when arrested', am: 'ሲያዙ ያለዎት መብቶች', points: [
    ['You must be told why you are arrested, in a language you understand.', 'የተያዙበትን ምክንያት በሚገባዎ ቋንቋ የማወቅ መብት አለዎት።'],
    ['You must be brought before a court within 48 hours.', 'በ48 ሰዓት ውስጥ ፍርድ ቤት የመቅረብ መብት አለዎት።'],
    ['You have the right to remain silent and to a lawyer. If you cannot pay, ask for legal aid.', 'ዝም የማለትና ጠበቃ የማግኘት መብት አለዎት። መክፈል ካልቻሉ የሕግ ድጋፍ ይጠይቁ።'],
    ['Family members may be informed and may visit you.', 'ቤተሰብዎ እንዲያውቁና እንዲጎበኙዎ መብት አለ።'],
  ] },
  { slug: 'gbv', icon: '🛡️', en: 'Help for gender-based violence', am: 'በጾታ ላይ የተመሰረተ ጥቃት ድጋፍ', points: [
    ['Violence against women and girls is a crime. You can report it to police, a woreda justice office or a women’s affairs office.', 'በሴቶችና ልጃገረዶች ላይ የሚደርስ ጥቃት ወንጀል ነው። ለፖሊስ፣ ለፍትሕ ጽ/ቤት ወይም ለሴቶች ጉዳይ ማሳወቅ ይችላሉ።'],
    ['Seek medical care quickly and keep any evidence.', 'በፍጥነት ሕክምና ያግኙ፤ ማስረጃዎችን ይያዙ።'],
    ['You can ask for protection and free legal aid.', 'ጥበቃና ነጻ የሕግ ድጋፍ መጠየቅ ይችላሉ።'],
  ] },
  { slug: 'land', icon: '🌾', en: 'Land disputes', am: 'የመሬት ክርክር', points: [
    ['Keep your land holding certificate and any receipts safe.', 'የመሬት ይዞታ ማረጋገጫና ደረሰኞችን በጥንቃቄ ይያዙ።'],
    ['Many disputes can be solved through kebele land committees or elders first.', 'ብዙ ክርክሮች በቀበሌ የመሬት ኮሚቴ ወይም በሽማግሌዎች መፍታት ይቻላል።'],
    ['If not solved, you can take the case to the woreda court. Legal aid can help you prepare.', 'ካልተፈታ ለወረዳ ፍርድ ቤት ማቅረብ ይቻላል። የሕግ ድጋፍ ሊረዳዎ ይችላል።'],
  ] },
  { slug: 'inheritance', icon: '🏠', en: 'Inheritance', am: 'ውርስ', points: [
    ['Children, including daughters, have equal inheritance rights under the law.', 'ሴት ልጆችን ጨምሮ ልጆች በሕግ እኩል የውርስ መብት አላቸው።'],
    ['A written will must follow legal form to be valid.', 'የጽሑፍ ኑዛዜ ሕጋዊ ቅርጽ መከተል አለበት።'],
    ['Disputes can be settled by agreement or in court within legal time limits.', 'ክርክሮች በስምምነት ወይም በሕግ ጊዜ ገደብ ውስጥ በፍርድ ቤት ይፈታሉ።'],
  ] },
  { slug: 'children', icon: '🧒', en: 'Children in conflict with the law', am: 'ከሕግ ጋር የተጋጩ ልጆች', points: [
    ['Children must be treated with care and kept separate from adults.', 'ልጆች በጥንቃቄ መያዝና ከአዋቂዎች መለየት አለባቸው።'],
    ['Parents or guardians should be informed immediately.', 'ወላጆች ወይም አሳዳጊዎች ወዲያውኑ ማወቅ አለባቸው።'],
    ['Courts prefer correction and rehabilitation over punishment.', 'ፍርድ ቤቶች ከቅጣት ይልቅ ማረምና ማቋቋምን ይመርጣሉ።'],
  ] },
  { slug: 'complaints', icon: '📝', en: 'How to complain about a public service', am: 'ስለ ህዝብ አገልግሎት እንዴት ቅሬታ ማቅረብ', points: [
    ['Write down what happened, when, and who you spoke with.', 'ምን፣ መቼና ከማን ጋር እንደተከሰተ ይጻፉ።'],
    ['Submit online or at any justice office. You will receive a tracking number.', 'በመስመር ላይ ወይም በማንኛውም የፍትሕ ቢሮ ያቅርቡ። የመከታተያ ቁጥር ይሰጥዎታል።'],
    ['You can also report anonymously.', 'ማንነትዎን ሳይገልጹ ማሳወቅም ይችላሉ።'],
  ] },
];
export function KnowYourRights({ t, slug }: { t: T; slug?: string }) {
  const g = GUIDES.find(x => x.slug === slug);
  if (g) return <>
    <Link href="/know-your-rights" className="ws-back">← {t('All guides', 'ሁሉም መመሪያዎች')}</Link>
    <article className="panel sp-guide">
      <div className="sp-guide-icon" aria-hidden>{g.icon}</div>
      <h1>{t(g.en, g.am)}</h1><p className="ws-sub" lang="am">{g.am}</p>
      <ol>{g.points.map(([en, am], i) => <li key={i}><p>{en}</p><p lang="am" className="am">{am}</p></li>)}</ol>
      <div className="ws-form-actions sp-noprint">
        <button className="ws-btn ghost" onClick={() => window.print()}><Printer size={16} />{t('Print', 'አትም')}</button>
        <button className="ws-btn" onClick={async () => { const url = location.href; try { if (navigator.share) await navigator.share({ title: g.en, url }); else { await navigator.clipboard.writeText(url); toast.success('Link copied'); } } catch { /* cancelled */ } }}><Share2 size={16} />{t('Share', 'አጋራ')}</button>
      </div>
      <p className="ws-sub">{t('General information, not legal advice. For your situation, book a free legal aid appointment.', 'አጠቃላይ መረጃ ነው፤ የሕግ ምክር አይደለም። ለጉዳይዎ ነጻ የሕግ ድጋፍ ቀጠሮ ይያዙ።')} <Link href="/book-appointment">{t('Book now', 'ቀጠሮ ይያዙ')}</Link></p>
    </article>
  </>;
  return <>
    <Intro eyebrow={t('LEGAL AWARENESS', 'የሕግ ግንዛቤ')} title={t('Know your rights', 'መብትዎን ይወቁ')}>{t('Short guides in English and Amharic. Print them or share them with your community.', 'በእንግሊዝኛና በአማርኛ አጫጭር መመሪያዎች። ያትሙ ወይም ለማህበረሰብዎ ያጋሩ።')}</Intro>
    <div className="sp-guides">{GUIDES.map(x => <Link key={x.slug} href={'/know-your-rights/' + x.slug} className="panel"><span aria-hidden>{x.icon}</span><h3>{x.en}</h3><p lang="am">{x.am}</p><em>{x.points.length} {t('key points', 'ዋና ነጥቦች')} →</em></Link>)}</div>
    <Sample />
  </>;
}

/* ---------------- 5. Events calendar ---------------- */
export function EventsPage({ t }: { t: T }) {
  const { ready, data } = useWS();
  const [type, setType] = useState('All');
  const items = useMemo(() => !ready ? [] : data.events.filter(e => type === 'All' || e.type === type).map(e => ({ id: e.id, date: e.date, time: e.time, title: e.title, sub: `${e.place} · ${e.type}`, tone: (e.type === 'Public hearing' ? 'red' : e.type === 'Training' ? 'gold' : e.type === 'Community dialogue' ? 'teal' : 'blue') as 'red' })), [ready, data, type]);
  if (!ready) return <Intro title={t('Events & hearings calendar', 'የዝግጅቶችና ችሎቶች ቀን መቁጠሪያ')} />;
  const today = isoDay(new Date());
  const upcoming = data.events.filter(e => e.date >= today && (type === 'All' || e.type === type)).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  return <>
    <Intro eyebrow={t('MEDIA', 'ሚዲያ')} title={t('Events & hearings calendar', 'የዝግጅቶችና ችሎቶች ቀን መቁጠሪያ')}>{t('Legal awareness events, community dialogues, trainings and public court hearings.', 'የሕግ ግንዛቤ፣ የማህበረሰብ ውይይት፣ ስልጠናና ግልጽ ችሎቶች።')}</Intro>
    <div className="ws-chips">{['All', 'Legal awareness', 'Public hearing', 'Community dialogue', 'Training'].map(x => <button key={x} aria-pressed={type === x} onClick={() => setType(x)}>{x}</button>)}</div>
    <div className="sp-events">
      <div className="panel"><Calendar items={items} views={['month', 'week']} /></div>
      <aside className="panel"><h2>{t('Upcoming', 'የሚመጡ')}</h2>{upcoming.length ? <ul className="sp-upcoming">{upcoming.map(e => <li key={e.id}><div className="sp-date"><b>{new Date(e.date + 'T12:00').getDate()}</b><span>{new Date(e.date + 'T12:00').toLocaleDateString('en-GB', { month: 'short' })}</span></div><div><b>{e.title}</b><small>{e.time} · {e.place}</small><em className={'sp-type t-' + e.type.split(' ')[0].toLowerCase()}>{e.type}</em></div></li>)}</ul> : <p className="ws-sub">{t('No upcoming events.', 'የሚመጣ ዝግጅት የለም።')}</p>}</aside>
    </div>
    <Sample />
  </>;
}

/* ---------------- 6. Feedback & rating ---------------- */
export function FeedbackPage({ t }: { t: T }) {
  const { ready, actions } = useWS();
  const [f, setF] = useState({ service: 'Legal aid', office: 'Ari Zone office', stars: 0, comment: '' });
  const [sent, setSent] = useState(false), [hover, setHover] = useState(0);
  if (!ready) return <Intro title={t('Rate our service', 'አገልግሎታችንን ይገምግሙ')} />;
  if (sent) return <div className="sp-done panel"><CheckCircle2 size={44} /><h1>{t('Thank you!', 'እናመሰግናለን!')}</h1><p>{t('Your rating helps us improve our services.', 'ደረጃዎ አገልግሎታችንን እንድናሻሽል ይረዳናል።')}</p><div className="ws-form-actions"><Link className="ws-btn ghost" href="/statistics">{t('See results', 'ውጤቶችን ይመልከቱ')}</Link><button className="ws-btn" onClick={() => { setSent(false); setF({ ...f, stars: 0, comment: '' }); }}>{t('Rate another service', 'ሌላ ይገምግሙ')}</button></div></div>;
  const labels = ['', t('Very poor', 'በጣም ደካማ'), t('Poor', 'ደካማ'), t('Fair', 'መካከለኛ'), t('Good', 'ጥሩ'), t('Excellent', 'በጣም ጥሩ')];
  return <>
    <Intro eyebrow={t('FEEDBACK', 'አስተያየት')} title={t('Rate our service', 'አገልግሎታችንን ይገምግሙ')}>{t('Tell us about your visit or complaint. Ratings are anonymous.', 'ስለ ጉብኝትዎ ወይም ቅሬታዎ ይንገሩን። ደረጃዎች ማንነት አይገልጹም።')}</Intro>
    <form className="panel sp-rate" onSubmit={e => { e.preventDefault(); if (!f.stars) return toast.error(t('Choose 1 to 5 stars', 'ከ1–5 ኮከብ ይምረጡ')); actions.addRating(f); setSent(true); }}>
      <div className="ws-grid2">
        <label className="ws-field"><span>{t('Service', 'አገልግሎት')}</span><select className="ws-input" value={f.service} onChange={e => setF({ ...f, service: e.target.value })}>{['Legal aid', 'Complaint handling', 'Prosecution services', 'Information request'].map(s => <option key={s}>{s}</option>)}</select></label>
        <label className="ws-field"><span>{t('Office', 'ቢሮ')}</span><select className="ws-input" value={f.office} onChange={e => setF({ ...f, office: e.target.value })}>{OFFICES.map(o => <option key={o}>{o}</option>)}</select></label>
      </div>
      <div className="sp-stars" role="radiogroup" aria-label={t('Rating', 'ደረጃ')} onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map(n => <button type="button" key={n} role="radio" aria-checked={f.stars === n} aria-label={`${n} – ${labels[n]}`} onMouseEnter={() => setHover(n)} onClick={() => setF({ ...f, stars: n })}><Star size={40} className={(hover || f.stars) >= n ? 'on' : ''} /></button>)}
        <span>{labels[hover || f.stars] || t('Tap a star', 'ኮከብ ይጫኑ')}</span>
      </div>
      <label className="ws-field"><span>{t('Comment (optional)', 'አስተያየት (አማራጭ)')}</span><textarea className="ws-input" rows={3} maxLength={500} value={f.comment} onChange={e => setF({ ...f, comment: e.target.value })} placeholder={t('What went well? What should we improve?', 'ምን ጥሩ ነበር? ምን ይሻሻል?')} /></label>
      <button className="ws-btn lg"><Star size={18} />{t('Submit rating', 'ደረጃ ላክ')}</button>
    </form>
  </>;
}

export const SITE_EXTRA = ['statistics', 'book-appointment', 'find-office', 'know-your-rights', 'events', 'feedback'];
export function SiteExtra({ kind, slug, t }: { kind: string; slug?: string; t: T }) {
  switch (kind) {
    case 'statistics': return <StatisticsPage t={t} />;
    case 'book-appointment': return <BookAppointment t={t} />;
    case 'find-office': return <FindOffice t={t} />;
    case 'know-your-rights': return <KnowYourRights t={t} slug={slug} />;
    case 'events': return <EventsPage t={t} />;
    case 'feedback': return <FeedbackPage t={t} />;
  }
  return null;
}
