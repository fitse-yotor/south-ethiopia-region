'use client';
import { useEffect, useState } from 'react';
import { CheckCircle2, Eye, EyeOff, KeyRound, Loader2, PlugZap, Save, ShieldCheck, Sparkles, TriangleAlert, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { F, Panel, Pill } from './ui';

type ProviderId = 'ollama-cloud' | 'ollama-self' | 'gemini' | 'openai-compatible';
type ProviderInfo = { label: string; defaultBaseUrl: string; defaultModel: string; keyRequired: boolean; envKey: string; note: string };
type View = {
  enabled: boolean; provider: ProviderId; model: string; baseUrl: string; temperature: number; maxTokens: number; timeoutSec: number;
  defaultLang: 'en' | 'am'; dailyLimit: number; updatedAt?: string;
  keyStatus: Record<ProviderId, { source: 'settings' | 'env' | 'none'; hint: string | null }>;
  providers: Record<ProviderId, ProviderInfo>; storage: 'upstash' | 'file' | 'temporary'; canSave: boolean; passwordRequired: boolean; usageToday: number;
};
type TestResult = { ok: boolean; reply?: string; ms?: number; model: string; models?: string[]; modelsError?: string; error?: string };

const PW_KEY = 'sojp-ai-admin-pw';

export function AiSettingsPanel() {
  const [v, setV] = useState<View | null>(null), [loadErr, setLoadErr] = useState('');
  const [form, setForm] = useState<Omit<View, 'keyStatus' | 'providers' | 'storage' | 'canSave' | 'passwordRequired' | 'usageToday' | 'updatedAt'> | null>(null);
  const [newKey, setNewKey] = useState(''), [removeKey, setRemoveKey] = useState(false), [showKey, setShowKey] = useState(false);
  const [pw, setPw] = useState(''), [saving, setSaving] = useState(false), [testing, setTesting] = useState(false), [test, setTest] = useState<TestResult | null>(null);

  const load = async () => {
    try {
      const r = await fetch('/api/ai/settings', { cache: 'no-store' }); const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'Could not load AI settings');
      setV(j); setForm({ enabled: j.enabled, provider: j.provider, model: j.model, baseUrl: j.baseUrl, temperature: j.temperature, maxTokens: j.maxTokens, timeoutSec: j.timeoutSec, defaultLang: j.defaultLang, dailyLimit: j.dailyLimit });
    } catch (e) { setLoadErr(e instanceof Error ? e.message : 'Could not load AI settings'); }
  };
  useEffect(() => { load(); try { setPw(sessionStorage.getItem(PW_KEY) || ''); } catch { /* ignore */ } }, []);

  if (loadErr) return <Panel title={<><Sparkles size={18} />AI summaries</>}><p className="ws-error">{loadErr}</p></Panel>;
  if (!v || !form) return <Panel title={<><Sparkles size={18} />AI summaries</>}><p className="ws-sub">Loading…</p></Panel>;

  const info = v.providers[form.provider];
  const ks = v.keyStatus[form.provider];
  const set = <K extends keyof typeof form>(k: K, val: (typeof form)[K]) => { setForm({ ...form, [k]: val }); setTest(null); };
  const headers = () => { try { if (pw) sessionStorage.setItem(PW_KEY, pw); } catch { /* ignore */ } return { 'Content-Type': 'application/json', ...(pw ? { 'x-admin-password': pw } : {}) }; };
  const keyPayload = removeKey ? '' : newKey.trim() ? newKey.trim() : undefined;
  const active = form.enabled && (!info.keyRequired || (removeKey ? false : !!newKey.trim() || ks.source !== 'none'));

  const runTest = async () => {
    setTesting(true); setTest(null);
    try {
      const r = await fetch('/api/ai/test', { method: 'POST', headers: headers(), body: JSON.stringify({ provider: form.provider, model: form.model || info.defaultModel, baseUrl: form.baseUrl || info.defaultBaseUrl, apiKey: newKey.trim() || undefined, temperature: form.temperature, maxTokens: form.maxTokens, timeoutSec: form.timeoutSec }) });
      const j = await r.json();
      setTest(r.status === 401 || r.status === 403 ? { ok: false, model: '', error: j.error } : j);
    } catch { setTest({ ok: false, model: '', error: 'Network error' }); }
    setTesting(false);
  };
  const save = async () => {
    setSaving(true);
    try {
      const r = await fetch('/api/ai/settings', { method: 'PUT', headers: headers(), body: JSON.stringify({ ...form, apiKey: keyPayload }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error + (j.detail ? ' – ' + j.detail.join('; ') : ''));
      toast.success('AI settings saved'); setNewKey(''); setRemoveKey(false); await load();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Save failed'); }
    setSaving(false);
  };

  return <Panel className="ai-settings" title={<><Sparkles size={18} />AI summaries</>} actions={<span className="ai-set-status">{v.enabled && v.keyStatus[v.provider].source !== 'none' || (v.enabled && !v.providers[v.provider].keyRequired) ? <Pill tone="green">On · {v.providers[v.provider].label}</Pill> : <Pill tone="grey">Off</Pill>}<Pill tone="blue">{v.usageToday} / {v.dailyLimit || '∞'} today</Pill></span>}>
    <p className="ws-sub">Summaries of prosecutor reports for the Woreda Coordinator. Names, case numbers, phone numbers and emails are always removed before text is sent to the AI service.</p>

    {v.storage === 'temporary' && <div className="ws-banner warn"><TriangleAlert /><div><b>Settings storage is temporary on this hosting</b><p>On Vercel, settings saved here can be lost when the server restarts. For permanent storage add a free Upstash Redis database (<code>UPSTASH_REDIS_REST_URL</code>, <code>UPSTASH_REDIS_REST_TOKEN</code>) or set the keys as environment variables.</p></div></div>}
    {!v.canSave && <div className="ws-banner bad"><ShieldCheck /><div><b>Saving is locked</b><p>Set <code>AI_ADMIN_PASSWORD</code> in the hosting environment (e.g. Vercel → Settings → Environment Variables) to allow changes from this page.</p></div></div>}

    <label className="ws-check ai-enable"><input type="checkbox" checked={form.enabled} onChange={e => set('enabled', e.target.checked)} />Enable AI summaries for the Woreda Coordinator</label>

    <div className="ai-providers" role="radiogroup" aria-label="AI provider">
      {(Object.keys(v.providers) as ProviderId[]).map(p => <button type="button" role="radio" aria-checked={form.provider === p} key={p} onClick={() => { setForm({ ...form, provider: p, model: p === v.provider ? v.model : '', baseUrl: p === v.provider ? v.baseUrl : '' }); setNewKey(''); setRemoveKey(false); setTest(null); }}>
        <b>{v.providers[p].label}</b><small>{v.providers[p].note}</small>
        {v.keyStatus[p].source !== 'none' ? <em className="ok"><KeyRound size={12} />key saved</em> : v.providers[p].keyRequired ? <em>needs key</em> : <em className="ok">no key needed</em>}
      </button>)}
    </div>

    <div className="ws-grid2">
      <F label="API key" wide hint={ks.source === 'env' ? `Using the ${info.envKey} environment variable (${ks.hint}). A key entered here takes priority.` : ks.source === 'settings' ? `Saved key ${ks.hint}. Leave empty to keep it.` : info.keyRequired ? 'Required for this provider.' : 'Optional for a self-hosted server.'}>
        <div className="ai-key">
          <input className="ws-input mono" type={showKey ? 'text' : 'password'} autoComplete="off" spellCheck={false} placeholder={ks.hint ? `${ks.hint} (saved)` : 'Paste API key'} value={newKey} onChange={e => { setNewKey(e.target.value); setRemoveKey(false); setTest(null); }} disabled={removeKey} />
          <button type="button" className="ws-btn sm ghost" onClick={() => setShowKey(!showKey)} aria-label={showKey ? 'Hide key' : 'Show key'}>{showKey ? <EyeOff size={15} /> : <Eye size={15} />}</button>
          {ks.source === 'settings' && <button type="button" className={'ws-btn sm ' + (removeKey ? '' : 'ghost danger')} onClick={() => { setRemoveKey(!removeKey); setNewKey(''); }}>{removeKey ? 'Undo remove' : 'Remove'}</button>}
        </div>
      </F>
      <F label="Model" hint={`Default: ${info.defaultModel || 'choose one (use Test connection to list models)'}`}>
        <input className="ws-input mono" list="ai-models" value={form.model} placeholder={info.defaultModel || 'e.g. meta-llama/llama-3.3-70b-instruct:free'} onChange={e => set('model', e.target.value)} />
        <datalist id="ai-models">{(test?.models || []).map(m => <option key={m} value={m} />)}</datalist>
      </F>
      <F label="Server address (base URL)" hint={`Default: ${info.defaultBaseUrl}`}><input className="ws-input mono" value={form.baseUrl} placeholder={info.defaultBaseUrl} onChange={e => set('baseUrl', e.target.value)} /></F>
      <F label="Default summary language"><select className="ws-input" value={form.defaultLang} onChange={e => set('defaultLang', e.target.value as 'en' | 'am')}><option value="en">English</option><option value="am">Amharic (አማርኛ)</option></select></F>
      <F label="Daily limit (summaries per day)" hint="Protects the free quota. 0 = no limit."><input className="ws-input" type="number" min={0} value={form.dailyLimit} onChange={e => set('dailyLimit', +e.target.value)} /></F>
      <F label={`Creativity (temperature): ${form.temperature.toFixed(1)}`} hint="Low = factual and consistent (recommended 0.2)."><input type="range" min={0} max={1} step={0.1} value={form.temperature} onChange={e => set('temperature', +e.target.value)} /></F>
      <F label="Max output tokens" hint="Raise if summaries are cut off (Gemini thinking models need ~1500+)."><input className="ws-input" type="number" min={200} max={8000} step={100} value={form.maxTokens} onChange={e => set('maxTokens', +e.target.value)} /></F>
      <F label="Timeout (seconds)"><input className="ws-input" type="number" min={10} max={120} value={form.timeoutSec} onChange={e => set('timeoutSec', +e.target.value)} /></F>
      {v.passwordRequired && <F label="Admin password" wide hint="Required to test or save AI settings. Set by the server administrator (AI_ADMIN_PASSWORD)."><input className="ws-input" type="password" autoComplete="current-password" value={pw} onChange={e => setPw(e.target.value)} /></F>}
    </div>

    {test && <div className={'ai-test ' + (test.ok ? 'ok' : 'bad')}>
      {test.ok ? <CheckCircle2 size={20} /> : <XCircle size={20} />}
      <div>
        <b>{test.ok ? `Connection works · ${test.model} · ${((test.ms || 0) / 1000).toFixed(1)} s` : 'Connection failed'}</b>
        {test.ok ? <p>Reply: “{test.reply}”</p> : <p>{test.error}</p>}
        {test.models ? <small>{test.models.length} models available{test.models.length ? ' – pick one from the Model field.' : ''}{(form.model || info.defaultModel) && test.models.length && !test.models.some(m => m === (form.model || info.defaultModel) || m.startsWith((form.model || info.defaultModel) + ':')) ? ' Note: the selected model is not in the list.' : ''}</small> : test.modelsError ? <small>Model list: {test.modelsError}</small> : null}
      </div>
    </div>}

    <div className="ws-form-actions">
      {!active && form.enabled && <span className="ws-sub ai-warn">Add an API key to switch summaries on.</span>}
      <button type="button" className="ws-btn ghost" onClick={runTest} disabled={testing || (v.passwordRequired && !pw)}>{testing ? <Loader2 size={16} className="spin" /> : <PlugZap size={16} />}Test connection</button>
      <button type="button" className="ws-btn" onClick={save} disabled={saving || !v.canSave || (v.passwordRequired && !pw)}><Save size={16} />{saving ? 'Saving…' : 'Save AI settings'}</button>
    </div>
    {v.updatedAt && <small className="ws-sub">Last saved {new Date(v.updatedAt).toLocaleString('en-GB')} · storage: {v.storage === 'upstash' ? 'Upstash Redis (permanent)' : v.storage === 'file' ? 'server file' : 'temporary'}</small>}
  </Panel>;
}
