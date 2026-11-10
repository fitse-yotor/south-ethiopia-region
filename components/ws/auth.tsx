'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, BarChart3, BookOpen, Briefcase, Building2, ChevronDown, Eye, EyeOff, Lock, LogIn, Mail, Phone, ShieldCheck, User, UserPlus, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import { useWS } from '@/lib/ws/store';

const DEMO = [
  ['Super Admin', 'superadmin@ser-justice.demo', 'Admin@123'], ['Region Head', 'region.head@ser-justice.demo', 'Demo@123'], ['Zone Head (South Omo)', 'zone.head@ser-justice.demo', 'Demo@123'], ['Zone Head (Ari)', 'zone.head.ari@ser-justice.demo', 'Demo@123'],
  ['Woreda Coordinator (Hamer)', 'coordinator.hamer@ser-justice.demo', 'Demo@123'], ['Woreda Coordinator (Jinka Town)', 'coordinator.jinka@ser-justice.demo', 'Demo@123'], ['Woreda Coordinator (Offa)', 'coordinator.offa@ser-justice.demo', 'Demo@123'],
  ['Prosecutor (Jinka Town)', 'prosecutor@ser-justice.demo', 'Demo@123'], ['Prosecutor (Hamer)', 'dawit.alemu@ser-justice.demo', 'Demo@123'],
  ['Library Head', 'library@ser-justice.demo', 'Demo@123'], ['Researcher', 'researcher@example.com', 'Demo@123'], ['Researcher (pending)', 'lidya.haile@example.com', 'Demo@123'],
  ['Content Editor', 'editor@ser-justice.demo', 'Demo@123'], ['Complaint Officer', 'complaints@ser-justice.demo', 'Demo@123'],
  ['Legal Aid Officer', 'legalaid@ser-justice.demo', 'Demo@123'], ['Finance Officer', 'finance@ser-justice.demo', 'Demo@123'], ['Auditor', 'auditor@ser-justice.demo', 'Demo@123'],
];

function AuthLayout({ mode, children, aside }: { mode: 'login' | 'register'; children: React.ReactNode; aside: React.ReactNode }) {
  return <main className="au">
    <section className="au-visual">
      <div className="au-visual-inner">
        <Link href="/" className="au-logo"><img src="/justice-logo.png" alt="" width={54} height={54} /><span><b lang="am">የደቡብ ኢትዮጵያ ክልል ፍትሕ ቢሮ</b>Southern Ethiopia Regional Justice Bureau</span></Link>
        {aside}
        <Link href="/" className="au-back"><ArrowLeft size={15} />Back to public website</Link>
      </div>
    </section>
    <section className="au-main">
      <div className="au-card">
        <div className="au-switch" role="tablist">
          <Link role="tab" aria-selected={mode === 'login'} href="/dashboard/login"><LogIn size={16} />Sign in</Link>
          <Link role="tab" aria-selected={mode === 'register'} href="/dashboard/register"><UserPlus size={16} />Register</Link>
        </div>
        {children}
      </div>
      <p className="au-legal">Demonstration portal · Do not enter real personal or case information.</p>
    </section>
  </main>;
}

function IconInput({ icon, right, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { icon: React.ReactNode; right?: React.ReactNode }) {
  return <div className="au-input">{icon}<input {...props} />{right}</div>;
}
function PasswordInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const [show, setShow] = useState(false);
  return <IconInput icon={<Lock size={17} />} type={show ? 'text' : 'password'} {...props}
    right={<button type="button" className="au-eye" onClick={() => setShow(!show)} aria-label={show ? 'Hide password' : 'Show password'}>{show ? <EyeOff size={17} /> : <Eye size={17} />}</button>} />;
}
const Field = ({ label, children, hint }: { label: string; children: React.ReactNode; hint?: React.ReactNode }) => <label className="au-field"><span>{label}</span>{children}{hint && <small>{hint}</small>}</label>;

export function Login() {
  const { actions } = useWS();
  const router = useRouter();
  const [email, setEmail] = useState(''), [pw, setPw] = useState(''), [err, setErr] = useState(''), [demo, setDemo] = useState(true);
  const submit = (e?: React.FormEvent, em = email, p = pw) => {
    e?.preventDefault();
    const r = actions.login(em, p);
    if (!r.ok) { setErr(r.error); return; }
    const next = new URLSearchParams(window.location.search).get('next');
    router.push(next && next.startsWith('/') && !next.startsWith('//') ? next : '/dashboard');
  };
  return <AuthLayout mode="login" aside={<div className="au-pitch">
    <h2>One secure portal for justice services, prosecution and research.</h2>
    <ul className="au-features">
      <li><Briefcase /><div><b>Prosecution portal</b>Cases, SLA monitoring and daily, weekly and monthly reporting.</div></li>
      <li><BookOpen /><div><b>Digital library</b>Laws, research, manuals and training videos for researchers and staff.</div></li>
      <li><BarChart3 /><div><b>Personal dashboards</b>Role-based reports with PDF and CSV export.</div></li>
    </ul>
  </div>}>
    <form onSubmit={submit} className="au-form">
      <div><h1>Welcome back</h1><p>Sign in with your staff or researcher account.</p></div>
      <Field label="Email address"><IconInput icon={<Mail size={17} />} type="email" autoComplete="username" required placeholder="name@ser-justice.demo" value={email} onChange={e => { setEmail(e.target.value); setErr(''); }} /></Field>
      <Field label="Password"><PasswordInput autoComplete="current-password" required placeholder="Your password" value={pw} onChange={e => { setPw(e.target.value); setErr(''); }} /></Field>
      <div className="au-row"><label className="au-check"><input type="checkbox" defaultChecked />Keep me signed in</label><button type="button" className="au-link" onClick={() => toast.info('Contact the Super Admin or Library Admin to reset your password.')}>Forgot password?</button></div>
      {err && <p className="au-error" role="alert">{err}</p>}
      <button className="au-submit"><LogIn size={18} />Sign in</button>
      <p className="au-alt">New researcher? <Link href="/dashboard/register">Create an account</Link></p>
    </form>
    <div className="au-demo">
      <button type="button" className="au-demo-toggle" onClick={() => setDemo(!demo)} aria-expanded={demo}><ShieldCheck size={15} />Demo accounts – one-click sign in<ChevronDown size={15} className={demo ? 'up' : ''} /></button>
      {demo && <div className="au-demo-grid">{DEMO.map(([r, e, p]) => <button key={e} type="button" onClick={() => { setEmail(e); setPw(p); submit(undefined, e, p); }}><b>{r}</b><small>{e}</small></button>)}</div>}
    </div>
  </AuthLayout>;
}

function strength(p: string) { let s = 0; if (p.length >= 8) s++; if (/[A-Z]/.test(p) && /[a-z]/.test(p)) s++; if (/\d/.test(p)) s++; if (/[^A-Za-z0-9]/.test(p)) s++; return s; }

export function Register() {
  const { actions, data } = useWS();
  const router = useRouter();
  const [f, setF] = useState({ name: '', email: '', phone: '', institution: '', purpose: '', password: '', confirm: '' });
  const [agree, setAgree] = useState(false), [err, setErr] = useState('');
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => { setF({ ...f, [k]: e.target.value }); setErr(''); };
  const st = strength(f.password);
  return <AuthLayout mode="register" aside={<div className="au-pitch">
    <h2>Join the Digital Library as a researcher.</h2>
    <ol className="au-steps">
      <li><span>1</span><div><b>Create your account</b>Your details and research purpose.</div></li>
      <li><span>2</span><div><b>Pay {data.settings.libraryFee} ETB with Telebirr</b>Merchant code {data.settings.telebirrCode}.</div></li>
      <li><span>3</span><div><b>Upload the receipt</b>Image or PDF – verified by the Library Admin.</div></li>
      <li><span>4</span><div><b>Read & contribute</b>Full access for {Math.round(data.settings.accessDays / 30)} months; publish your research.</div></li>
    </ol>
  </div>}>
    <form className="au-form" onSubmit={e => {
      e.preventDefault();
      if (f.password.length < 8) return setErr('Password must be at least 8 characters.');
      if (f.password !== f.confirm) return setErr('Passwords do not match.');
      if (!agree) return setErr('Please accept the library terms of use.');
      const r = actions.register({ name: f.name, email: f.email, phone: f.phone, institution: f.institution, purpose: f.purpose, password: f.password });
      if (!r.ok) return setErr(r.error);
      toast.success('Account created. Next: pay the library fee and upload your receipt.');
      router.push('/dashboard/library/access');
    }}>
      <div><h1>Create researcher account</h1><p>Researchers get access to the full Digital Library after paying the access fee.</p></div>
      <div className="au-fee"><Wallet size={20} /><div><b>{data.settings.libraryFee} ETB</b> one-time access fee via Telebirr<small>Valid for {Math.round(data.settings.accessDays / 30)} months · paid after registration</small></div></div>
      <fieldset className="au-group"><legend>About you</legend>
        <div className="au-grid">
          <Field label="Full name"><IconInput icon={<User size={17} />} required value={f.name} onChange={set('name')} placeholder="First and last name" /></Field>
          <Field label="Phone (Telebirr)"><IconInput icon={<Phone size={17} />} required inputMode="tel" placeholder="+251 9…" value={f.phone} onChange={set('phone')} /></Field>
        </div>
        <Field label="Email address"><IconInput icon={<Mail size={17} />} type="email" required placeholder="you@university.edu.et" value={f.email} onChange={set('email')} /></Field>
        <Field label="Institution / organization"><IconInput icon={<Building2 size={17} />} required placeholder="University, NGO or office" value={f.institution} onChange={set('institution')} /></Field>
        <Field label="Research purpose"><textarea className="au-textarea" rows={2} required placeholder="What will you use the library for?" value={f.purpose} onChange={set('purpose')} /></Field>
      </fieldset>
      <fieldset className="au-group"><legend>Account security</legend>
        <div className="au-grid">
          <Field label="Password" hint={f.password && <span className={'au-strength s' + st}><i /><i /><i /><i />{['Too weak', 'Weak', 'Fair', 'Good', 'Strong'][st]}</span>}><PasswordInput required value={f.password} onChange={set('password')} placeholder="At least 8 characters" /></Field>
          <Field label="Confirm password"><PasswordInput required value={f.confirm} onChange={set('confirm')} placeholder="Repeat password" /></Field>
        </div>
      </fieldset>
      <label className="au-check"><input type="checkbox" checked={agree} onChange={e => setAgree(e.target.checked)} />I agree to use library materials for research and to credit sources.</label>
      {err && <p className="au-error" role="alert">{err}</p>}
      <button className="au-submit"><UserPlus size={18} />Create account</button>
      <p className="au-alt">Already registered? <Link href="/dashboard/login">Sign in</Link></p>
    </form>
  </AuthLayout>;
}
