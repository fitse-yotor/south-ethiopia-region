'use client';
import React,{useEffect,useRef} from 'react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {ArrowRight,ArrowUpRight,BookOpen,Bird,Clock,FileText,Languages,Landmark,MapPin,MessageSquare,Quote,Scale,Search,ShieldCheck,UserX,Users} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {zoneNames} from '@/lib/content';
import {usePortal,useT,Action,ContentCard} from '@/components/justice-portal';
import {NoticeTicker,NoticeBoard,NewsFeature,GallerySection} from '@/components/portal-extras';

/* Fades sections in as they scroll into view. Content stays visible without JS or with reduced motion. */
function Reveal({children,className='',as:Tag='section',...rest}:{children:React.ReactNode;className?:string;as?:'section'|'div'}&React.HTMLAttributes<HTMLElement>){const ref=useRef<HTMLElement>(null);useEffect(()=>{const el=ref.current;if(!el||window.matchMedia('(prefers-reduced-motion: reduce)').matches||!('IntersectionObserver' in window))return;el.classList.add('reveal');const io=new IntersectionObserver(([e])=>{if(e.isIntersecting){el.classList.add('in');io.disconnect()}},{rootMargin:'0px 0px -8% 0px'});io.observe(el);return ()=>io.disconnect()},[]);return <Tag ref={ref as React.Ref<HTMLDivElement>} className={className} {...rest}>{children}</Tag>}

function Heading({num,eyebrow,title,children,center=false}:{num:string;eyebrow:string;title:React.ReactNode;children?:React.ReactNode;center?:boolean}){return <div className={'lh-heading'+(center?' center':'')}><div className="lh-eyebrow"><span>{num}</span>{eyebrow}</div><h2>{title}</h2>{children&&<p>{children}</p>}</div>}

function Finder(){const router=useRouter(),t=useT();return <div className="wrap lh-finder-wrap"><form className="lh-finder" onSubmit={e=>{e.preventDefault();const q=String(new FormData(e.currentTarget).get('q')||'');router.push('/search?q='+encodeURIComponent(q))}}><div className="lh-finder-title"><Search size={20}/><div><strong>{t('What do you need today?','ዛሬ ምን ይፈልጋሉ?')}</strong><span>{t('Search services, documents, forms and notices','አገልግሎቶችን፣ ሰነዶችንና ማስታወቂያዎችን ይፈልጉ')}</span></div></div><div className="lh-finder-field"><input name="q" aria-label="Search the portal" placeholder={t('e.g. complaint form, citizens’ charter…','ለምሳሌ የቅሬታ ቅጽ…')}/><Button type="submit">{t('Search','ፈልግ')} <ArrowRight size={16}/></Button></div><div className="lh-finder-popular"><span>{t('Popular:','ተፈላጊ፦')}</span>{[['/forms/complaint-form','Complaint form'],['/laws/citizens-charter','Citizens’ charter'],['/track-complaint','Track a complaint'],['/offices','Woreda offices']].map(([h,l])=><Link key={h} href={h}>{l}</Link>)}</div></form></div>}

export default function Landing(){const t=useT(),{items}=usePortal();const laws=items.filter(x=>x.kind==='laws'&&x.published).slice(0,3);return <div className="landing">
 <NoticeTicker/>
 <section className="lh-hero">
  <img className="lh-hero-bg" src="/omo-landscape.jpg" alt="" width="1600" height="1000"/>
  <div className="wrap lh-hero-inner">
   <div className="lh-hero-copy">
    <div className="lh-hero-badge"><img src="/justice-logo.png" alt="" width="44" height="44"/><span>{t('Southern Ethiopia Region · Justice Bureau','ደቡብ ኢትዮጵያ ክልል · ፍትሕ ቢሮ')}</span></div>
    <h1>{t('Justice for','ፍትሕ')} <em>{t('everyone,','ለሁሉም፣')}</em><br/>{t('close to home.','በአቅራቢያዎ።')}</h1>
    <p>{t('Transparent, accessible and dignified public justice services. Find information, raise a concern and understand your next step, in English or Amharic.','ግልጽ፣ ተደራሽ እና ክብር ያለው የፍትሕ አገልግሎት። መረጃ ያግኙ፣ ቅሬታ ያቅርቡ።')}</p>
    <div className="actions"><Action href="/complaint">{t('Submit a complaint','ቅሬታ ያቅርቡ')}</Action><Link className="lh-ghost" href="/services">{t('Explore services','አገልግሎቶችን ይመልከቱ')} <ArrowRight size={16}/></Link></div>
    <ul className="lh-trust">{[[UserX,t('No account needed','መለያ አያስፈልግም')],[Clock,t('Track progress anytime','በማንኛውም ጊዜ ይከታተሉ')],[Languages,t('English & Amharic','እንግሊዝኛና አማርኛ')]].map(([I,l],i)=>{const Icon=I as typeof Clock;return <li key={i}><Icon size={17}/>{l as string}</li>})}</ul>
   </div>
  </div>
  <small className="lh-credit">Lower Valley of the Omo · Karalyn Monteil / UNESCO · CC BY-SA 3.0 IGO</small>
 </section>
 <Finder/>

 <Reveal className="wrap lh-section">
  <Heading num="01" eyebrow={t('How can we help','እንዴት እንርዳዎ')} title={t('Your next step starts here.','የመጀመሪያ እርምጃዎ እዚህ ይጀምራል።')} center>{t('Choose a service to get started. Each one explains what to prepare and what happens next.','አገልግሎት ይምረጡ።')}</Heading>
  <div className="lh-services">{[[MessageSquare,'Submit a complaint','ቅሬታ ያቅርቡ','Tell us about a service concern in a few guided steps.','/complaint'],[ShieldCheck,'Report confidentially','ሚስጥራዊ ሪፖርት','Raise a concern without giving your name.','/complaint/anonymous'],[Search,'Track a complaint','ቅሬታ ይከታተሉ','Follow progress with your tracking number.','/track-complaint'],[BookOpen,'Laws & documents','ህጎችና ሰነዶች','Read public legal information and guidelines.','/laws'],[FileText,'Services & forms','አገልግሎቶችና ቅጾች','Prepare documents before visiting an office.','/services'],[Users,'Customary justice','ባህላዊ ፍትሕ','Learn about dialogue and reconciliation.','/customary-justice']].map(([Icon,en,am,desc,href],i)=>{const I=Icon as typeof Search;return <Link className="lh-service" key={i} href={href as string}><span className="lh-service-icon"><I size={22}/></span><h3>{t(en as string,am as string)}</h3><p>{desc as string}</p><span className="lh-service-go">{t('Get started','ይጀምሩ')} <ArrowRight size={15}/></span></Link>})}</div>
 </Reveal>

 <Reveal className="lh-emblem">
  <div className="wrap lh-emblem-inner">
   <div className="lh-emblem-mark"><img src="/justice-logo.png" alt="Bureau of Justice emblem" width="260" height="260"/></div>
   <div>
    <div className="lh-eyebrow light"><span>02</span>{t('Our emblem, our commitment','አርማችን፣ ቃላችን')}</div>
    <h2>{t('Four symbols guide the way we serve.','አራት ምልክቶች አገልግሎታችንን ይመራሉ።')}</h2>
    <div className="lh-symbols">{[[Scale,'Fairness','The scales: every person is heard and treated equally.'],[Landmark,'Rule of law','The pillar: decisions rest on law, not on influence.'],[Bird,'Peace','The dove: reconciliation and respectful dialogue.'],[BookOpen,'Knowledge','The open book: public information within everyone’s reach.']].map(([Icon,h,p])=>{const I=Icon as typeof Scale;return <div className="lh-symbol" key={h as string}><I size={26}/><h3>{h as string}</h3><p>{p as string}</p></div>})}</div>
   </div>
  </div>
 </Reveal>

 <Reveal as="div"><NoticeBoard/></Reveal>
 <div className="wrap lh-prototype"><ShieldCheck size={16}/><span>Design prototype: please use fictional information when trying the complaint portal.</span><Link href="/news/portal-preview">Learn more <ArrowRight size={14}/></Link></div>

 <Reveal className="lh-leader">
  <div className="wrap lh-leader-inner">
   <div className="lh-portrait"><div><img src="/justice-logo.png" alt="" width="180" height="180"/></div><small>Official portrait pending approval</small></div>
   <div className="lh-quote">
    <div className="lh-eyebrow"><span>03</span>{t('A message from leadership','የአመራር መልዕክት')}</div>
    <Quote className="lh-quote-mark" size={44}/>
    <blockquote>{t('Every person deserves to be heard, treated with dignity and given a clear path to assistance.','ሁሉም ሰው የመሰማት፣ በክብር የመስተናገድና ግልጽ የእርዳታ መንገድ የማግኘት መብት አለው።')}</blockquote>
    <div className="lh-sign"><strong>Bureau Head</strong><span>Southern Ethiopia Regional Justice Bureau · sample message</span></div>
    <Link className="text-link" href="/leadership">{t('Read the full message','ሙሉ መልዕክቱን ያንብቡ')} <ArrowRight size={16}/></Link>
   </div>
  </div>
 </Reveal>

 <Reveal as="div"><NewsFeature/></Reveal>

 <Reveal className="lh-library">
  <div className="wrap">
   <div className="lh-split-head"><Heading num="04" eyebrow={t('Information within reach','በቅርብ ያለ መረጃ')} title={t('Explore the legal library.','የህግ ቤተ መጻሕፍቱን ይመልከቱ።')}>{t('Guidelines, policies and public awareness materials in one place.','መመሪያዎችና ፖሊሲዎች በአንድ ቦታ።')}</Heading><Action href="/laws" outline>{t('All documents','ሁሉም ሰነዶች')}</Action></div>
   <div className="cards">{laws.map(x=><ContentCard key={x.slug} item={x}/>)}</div>
  </div>
 </Reveal>

 <Reveal className="wrap lh-section lh-heritage">
  <div className="lh-heritage-art"><img src="/gallery/community-dialogue.svg" alt="" width="1200" height="800"/><span lang="am">የባህላዊ ፍትሕ ማዕከል</span></div>
  <div>
   <Heading num="05" eyebrow={t('Customary justice','ባህላዊ ፍትሕ')} title={t('Knowledge rooted in community.','በማህበረሰብ ላይ የተመሰረተ እውቀት።')}>{t('Explore customary justice and legal pluralism through respectful, community-reviewed documentation.','ባህላዊ ፍትሕን በአክብሮት ይወቁ።')}</Heading>
   <ul className="lh-points">{['Dialogue and reconciliation practices','The role of elders, women and young people','How customary and formal justice connect'].map(p=><li key={p}><ArrowUpRight size={16}/>{p}</li>)}</ul>
   <Action href="/customary-justice" outline>{t('Explore the hub','ማዕከሉን ይመልከቱ')}</Action>
  </div>
 </Reveal>

 <Reveal as="div"><GallerySection/></Reveal>

 <Reveal className="lh-cta">
  <div className="wrap lh-cta-inner">
   <div><MapPin size={34}/><h2>{t('Justice services closer to you.','የፍትሕ አገልግሎት በአቅራቢያዎ።')}</h2><p>{t('Find the woreda justice office nearest to you, or contact the zonal department in Jinka.','በአቅራቢያዎ ያለውን የወረዳ ፍትሕ ጽ/ቤት ያግኙ።')}</p></div>
   <div className="lh-woredas">{zoneNames.map(w=><Link key={w} href="/offices">{w}</Link>)}</div>
   <div className="actions"><Action href="/offices">{t('Find an office','ቢሮ ያግኙ')}</Action><Link className="lh-ghost" href="/contact">{t('Contact us','ያግኙን')} <ArrowRight size={16}/></Link></div>
  </div>
 </Reveal>
</div>}
