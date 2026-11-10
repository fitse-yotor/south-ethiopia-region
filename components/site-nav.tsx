'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ChevronDown, Search } from 'lucide-react';

type Item = { href: string; en: string; am: string };
type Menu = Item & { children?: Item[] };

// Menu structure modelled on the federal Ministry of Justice site (justice.gov.et), adapted to the zone department.
export const MENU: Menu[] = [
  { href: '/', en: 'Home', am: 'መነሻ' },
  { href: '/about', en: 'About Us', am: 'ስለ እኛ', children: [
    { href: '/about', en: 'Overview & history', am: 'አጠቃላይ ገጽታ' },
    { href: '/mission-vision', en: 'Mission, vision & values', am: 'ተልዕኮ፣ ራዕይ እና እሴቶች' },
    { href: '/powers-duties', en: 'Powers & duties', am: 'ስልጣንና ተግባር' },
    { href: '/structure', en: 'Organizational structure', am: 'መዋቅር' },
    { href: '/leadership', en: 'Leadership', am: 'አመራር' },
    { href: '/find-office', en: 'Woreda offices (map)', am: 'የወረዳ ጽ/ቤቶች (ካርታ)' },
    { href: '/statistics', en: 'Justice in numbers', am: 'ፍትሕ በቁጥር' },
  ] },
  { href: '/services', en: 'Services', am: 'አገልግሎቶች', children: [
    { href: '/prosecution', en: 'Public prosecution', am: 'የዐቃቤ ሕግ አገልግሎት' },
    { href: '/legal-aid', en: 'Free legal aid', am: 'ነጻ የሕግ ድጋፍ' },
    { href: '/book-appointment', en: 'Book legal aid appointment', am: 'የሕግ ድጋፍ ቀጠሮ' },
    { href: '/know-your-rights', en: 'Know your rights', am: 'መብትዎን ይወቁ' },
    { href: '/advocates', en: 'Advocates licensing', am: 'የጥብቅና ፈቃድ' },
    { href: '/complaint', en: 'Complaint handling', am: 'ቅሬታ አቀራረብ' },
    { href: '/customary-justice', en: 'Customary justice', am: 'ባህላዊ ፍትሕ' },
    { href: '/services', en: 'All services', am: 'ሁሉም አገልግሎቶች' },
  ] },
  { href: '/laws', en: 'Laws', am: 'ህጎች', children: [
    { href: '/laws?q=Proclamation', en: 'Proclamations', am: 'አዋጆች' },
    { href: '/laws?q=Regulation', en: 'Regulations', am: 'ደንቦች' },
    { href: '/laws?q=Directive', en: 'Directives', am: 'መመሪያዎች' },
    { href: '/laws?q=Polic', en: 'Policies & strategies', am: 'ፖሊሲና ስትራቴጂ' },
    { href: '/forms', en: 'Forms', am: 'ቅጾች' },
  ] },
  { href: '/library', en: 'Digital Library', am: 'ዲጂታል ቤተ መጻሕፍት', children: [
    { href: '/library', en: 'Browse the library', am: 'ቤተ መጻሕፍቱን ይመልከቱ' },
    { href: '/dashboard/register', en: 'Researcher registration', am: 'የተመራማሪ ምዝገባ' },
    { href: '/dashboard/login', en: 'Researcher sign in', am: 'ይግቡ' },
  ] },
  { href: '/news', en: 'Media', am: 'ሚዲያ', children: [
    { href: '/news', en: 'News', am: 'ዜና' },
    { href: '/notices', en: 'Announcements', am: 'ማስታወቂያ' },
    { href: '/press-releases', en: 'Press releases', am: 'ጋዜጣዊ መግለጫ' },
    { href: '/gallery', en: 'Photo gallery', am: 'ፎቶዎች' },
    { href: '/videos', en: 'Videos', am: 'ቪዲዮዎች' },
    { href: '/events', en: 'Events & hearings calendar', am: 'የዝግጅቶች ቀን መቁጠሪያ' },
  ] },
  { href: '/publications', en: 'Publications', am: 'ህትመቶች', children: [
    { href: '/publications', en: 'Reports & research', am: 'ሪፖርቶችና ጥናቶች' },
    { href: '/vacancies', en: 'Vacancies', am: 'ክፍት የስራ ቦታ' },
    { href: '/tenders', en: 'Tenders', am: 'ጨረታ' },
  ] },
  { href: '/contact', en: 'Contact', am: 'ያግኙን', children: [
    { href: '/contact', en: 'Contact us', am: 'ያግኙን' },
    { href: '/find-office', en: 'Find my office', am: 'ቢሮዬን ፈልግ' },
    { href: '/feedback', en: 'Rate our service', am: 'አገልግሎታችንን ይገምግሙ' },
    { href: '/faq', en: 'FAQ', am: 'ተደጋጋሚ ጥያቄዎች' },
  ] },
];

export function MainNav({ path, open, t }: { path: string; open: boolean; t: (en: string, am: string) => string }) {
  const [drop, setDrop] = useState<string | null>(null);
  const ref = useRef<HTMLElement>(null);
  useEffect(() => setDrop(null), [path]);
  useEffect(() => {
    const close = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setDrop(null); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setDrop(null); };
    document.addEventListener('mousedown', close); document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', esc); };
  }, []);
  const isActive = (m: Menu) => m.href === '/' ? path === '/' : path.startsWith(m.href.split('?')[0]) || !!m.children?.some(c => c.href !== '/' && path === c.href.split('?')[0]);
  return <nav ref={ref} className={'wrap navigation mega ' + (open ? 'is-open' : '')} aria-label="Main navigation">
    {MENU.map(m => m.children ? <div key={m.en} className={'nav-drop' + (drop === m.en ? ' open' : '')} onMouseEnter={() => window.matchMedia('(min-width: 801px)').matches && setDrop(m.en)} onMouseLeave={() => window.matchMedia('(min-width: 801px)').matches && setDrop(null)}>
      <button className={isActive(m) ? 'active' : ''} aria-expanded={drop === m.en} onClick={() => setDrop(drop === m.en ? null : m.en)}>{t(m.en, m.am)}<ChevronDown size={14} /></button>
      <div className="nav-menu" role="menu">{m.children.map(c => <Link role="menuitem" key={c.href + c.en} href={c.href}>{t(c.en, c.am)}</Link>)}</div>
    </div> : <Link key={m.en} href={m.href} className={isActive(m) ? 'active' : ''} aria-current={path === m.href ? 'page' : undefined}>{t(m.en, m.am)}</Link>)}
    <Link className="track-link" href="/track-complaint"><Search size={15} />{t('Track complaint', 'ቅሬታ ይከታተሉ')}</Link>
  </nav>;
}
