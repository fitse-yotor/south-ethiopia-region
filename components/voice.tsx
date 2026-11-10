'use client';
// Read-aloud for the "Know your rights" guides, using the browser's built-in speech synthesis.
// No audio is uploaded anywhere. Amharic needs an Amharic voice installed on the device; if it is missing we say so
// and offer English. A guide may also ship recorded audio files (public/audio/rights/…) which are preferred when present.
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pause, Play, Square, Volume2 } from 'lucide-react';

export type VoiceLang = 'en' | 'am';
export type Line = { en: string; am: string };

const TAG: Record<VoiceLang, string> = { en: 'en', am: 'am' };

export function useSpeech() {
  const [supported, setSupported] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [current, setCurrent] = useState(-1);
  const [state, setState] = useState<'idle' | 'playing' | 'paused'>('idle');
  const run = useRef(0);

  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    setSupported(true);
    const load = () => setVoices(window.speechSynthesis.getVoices());
    load();
    window.speechSynthesis.addEventListener('voiceschanged', load);
    return () => { window.speechSynthesis.removeEventListener('voiceschanged', load); window.speechSynthesis.cancel(); };
  }, []);

  const hasVoice = useCallback((lang: VoiceLang) => voices.some(v => v.lang.toLowerCase().startsWith(TAG[lang])), [voices]);

  const stop = useCallback(() => {
    run.current++;
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel();
    setCurrent(-1); setState('idle');
  }, []);

  /** Speak the lines one after another, starting at `from`. */
  const speak = useCallback((lines: string[], lang: VoiceLang, rate = 1, from = 0) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const id = ++run.current;
    const voice = voices.find(v => v.lang.toLowerCase().startsWith(TAG[lang]));
    const next = (i: number) => {
      if (id !== run.current) return;
      if (i >= lines.length) { setCurrent(-1); setState('idle'); return; }
      const u = new SpeechSynthesisUtterance(lines[i]);
      u.lang = voice?.lang || (lang === 'am' ? 'am-ET' : 'en-GB');
      if (voice) u.voice = voice;
      u.rate = rate;
      u.onstart = () => { if (id === run.current) { setCurrent(i); setState('playing'); } };
      u.onend = () => next(i + 1);
      u.onerror = () => { if (id === run.current) { setCurrent(-1); setState('idle'); } };
      window.speechSynthesis.speak(u);
    };
    next(from);
  }, [voices]);

  const pause = useCallback(() => { window.speechSynthesis.pause(); setState('paused'); }, []);
  const resume = useCallback(() => { window.speechSynthesis.resume(); setState('playing'); }, []);
  return { supported, hasVoice, speak, stop, pause, resume, current, state };
}

/** Controls for reading a guide aloud. `title` is read first, then each point. */
export function ListenBar({ title, points, audio, onCurrent }: { title: Line; points: Line[]; audio?: Partial<Record<VoiceLang, string>>; onCurrent?: (lang: VoiceLang | null, index: number) => void }) {
  const sp = useSpeech();
  const [lang, setLang] = useState<VoiceLang>('en');
  const [rate, setRate] = useState(1);
  const lines = (l: VoiceLang) => [title[l], ...points.map(p => p[l])];
  const missing = sp.supported && lang === 'am' && !sp.hasVoice('am') && !audio?.am;

  useEffect(() => { onCurrent?.(sp.state === 'idle' ? null : lang, sp.current - 1); }, [sp.current, sp.state, lang]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => sp.stop(), []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!sp.supported && !audio) return <p className="ws-sub">Listening is not supported by this browser. Try Chrome, Edge or Safari.</p>;
  return <div className="listen sp-noprint" role="group" aria-label="Listen to this guide">
    <div className="listen-main">
      <Volume2 size={20} aria-hidden />
      <div className="ws-seg" role="radiogroup" aria-label="Language">
        <button role="radio" aria-checked={lang === 'en'} onClick={() => { sp.stop(); setLang('en'); }}>English</button>
        <button role="radio" aria-checked={lang === 'am'} onClick={() => { sp.stop(); setLang('am'); }}>አማርኛ</button>
      </div>
      {audio?.[lang] ? <audio controls src={audio[lang]} preload="none" aria-label={lang === 'am' ? 'የድምፅ ንባብ' : 'Audio recording'} /> : <>
        {sp.state === 'idle' && <button className="ws-btn" disabled={!sp.supported || missing} onClick={() => sp.speak(lines(lang), lang, rate)}><Play size={16} />{lang === 'am' ? 'ያዳምጡ' : 'Listen'}</button>}
        {sp.state === 'playing' && <button className="ws-btn" onClick={sp.pause}><Pause size={16} />{lang === 'am' ? 'ለአፍታ አቁም' : 'Pause'}</button>}
        {sp.state === 'paused' && <button className="ws-btn" onClick={sp.resume}><Play size={16} />{lang === 'am' ? 'ቀጥል' : 'Resume'}</button>}
        {sp.state !== 'idle' && <button className="ws-btn ghost" onClick={sp.stop}><Square size={15} />{lang === 'am' ? 'አቁም' : 'Stop'}</button>}
        <label className="listen-rate">{lang === 'am' ? 'ፍጥነት' : 'Speed'}
          <select className="ws-input" value={rate} onChange={e => setRate(Number(e.target.value))} aria-label="Speed"><option value={0.8}>0.8×</option><option value={1}>1×</option><option value={1.25}>1.25×</option></select></label>
      </>}
    </div>
    {missing && <p className="listen-note">This device has no Amharic voice installed, so it cannot read Amharic aloud. On Windows: Settings → Time &amp; language → Speech → Add voices. You can still listen in English, or read the Amharic text below.</p>}
    {sp.supported && lang === 'en' && !sp.hasVoice('en') && <p className="listen-note">No English voice was found on this device.</p>}
  </div>;
}

/** Small speaker button that reads one point aloud. */
export function SpeakPoint({ line, lang }: { line: string; lang: VoiceLang }) {
  const sp = useSpeech();
  if (!sp.supported || (lang === 'am' && !sp.hasVoice('am'))) return null;
  return <button type="button" className="listen-one sp-noprint" aria-label={lang === 'am' ? 'ይህን ያዳምጡ' : 'Listen to this point'} title={lang === 'am' ? 'ያዳምጡ' : 'Listen'} onClick={() => (sp.state === 'idle' ? sp.speak([line], lang) : sp.stop())}><Volume2 size={15} /></button>;
}
