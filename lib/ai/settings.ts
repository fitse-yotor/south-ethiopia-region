// Server-side AI settings, managed from the Super Admin settings page.
// API keys are encrypted (AES-256-GCM) before storage and never returned to the browser.
// Storage: Upstash Redis (persistent, free tier) when UPSTASH_REDIS_REST_URL/TOKEN are set,
// otherwise a JSON file (.data/ai-settings.json; on Vercel only /tmp, which is temporary).
import 'server-only';
import { createCipheriv, createDecipheriv, createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { PROVIDERS, type ProviderConfig, type ProviderId } from './providers';

export type AISettings = {
  enabled: boolean;
  provider: ProviderId;
  model: string;
  baseUrl: string;            // '' = provider default
  temperature: number;
  maxTokens: number;
  timeoutSec: number;
  defaultLang: 'en' | 'am';
  dailyLimit: number;         // summaries per day, 0 = unlimited
  keys: Partial<Record<ProviderId, string>>; // encrypted
  updatedAt?: string;
};
type Stored = AISettings & { usage?: { day: string; count: number } };

const DEFAULTS: AISettings = { enabled: true, provider: 'ollama-cloud', model: '', baseUrl: '', temperature: 0.2, maxTokens: 1200, timeoutSec: 55, defaultLang: 'en', dailyLimit: 200, keys: {} };
const KEY = 'sojp:ai-settings';
const isProd = process.env.NODE_ENV === 'production';

/* ---------- secrets ---------- */
function secret(): Buffer | null {
  const s = process.env.AI_SETTINGS_SECRET || process.env.AI_ADMIN_PASSWORD || (isProd ? '' : 'local-development-only-secret');
  return s ? createHash('sha256').update('sojp-ai:' + s).digest() : null;
}
function encrypt(plain: string): string {
  const k = secret(); if (!k) throw new Error('No encryption secret');
  const iv = randomBytes(12), c = createCipheriv('aes-256-gcm', k, iv);
  const data = Buffer.concat([c.update(plain, 'utf8'), c.final()]);
  return ['v1', iv.toString('base64'), c.getAuthTag().toString('base64'), data.toString('base64')].join('.');
}
function decrypt(blob?: string): string | undefined {
  if (!blob) return undefined;
  try {
    const [v, iv, tag, data] = blob.split('.'); const k = secret();
    if (v !== 'v1' || !k) return undefined;
    const d = createDecipheriv('aes-256-gcm', k, Buffer.from(iv, 'base64')); d.setAuthTag(Buffer.from(tag, 'base64'));
    return Buffer.concat([d.update(Buffer.from(data, 'base64')), d.final()]).toString('utf8');
  } catch { return undefined; }
}

/* ---------- storage ---------- */
const upstash = () => (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN ? { url: process.env.UPSTASH_REDIS_REST_URL.replace(/\/+$/, ''), token: process.env.UPSTASH_REDIS_REST_TOKEN } : null);
const filePath = () => process.env.AI_SETTINGS_FILE || (process.env.VERCEL ? '/tmp/sojp-ai-settings.json' : path.join(process.cwd(), '.data', 'ai-settings.json'));
export function storageKind(): 'upstash' | 'file' | 'temporary' { return upstash() ? 'upstash' : process.env.VERCEL && !process.env.AI_SETTINGS_FILE ? 'temporary' : 'file'; }

let memo: { at: number; value: Stored | null } | null = null;
async function readStored(): Promise<Stored | null> {
  if (memo && Date.now() - memo.at < 5_000) return memo.value;
  let value: Stored | null = null;
  const u = upstash();
  try {
    if (u) {
      const r = await fetch(`${u.url}/get/${encodeURIComponent(KEY)}`, { headers: { Authorization: `Bearer ${u.token}` }, cache: 'no-store' });
      const j = await r.json() as { result?: string | null };
      value = j.result ? JSON.parse(j.result) : null;
    } else {
      value = JSON.parse(await fs.readFile(filePath(), 'utf8'));
    }
  } catch { value = null; }
  memo = { at: Date.now(), value };
  return value;
}
async function writeStored(v: Stored) {
  const u = upstash(), body = JSON.stringify(v);
  if (u) {
    const r = await fetch(`${u.url}/set/${encodeURIComponent(KEY)}`, { method: 'POST', headers: { Authorization: `Bearer ${u.token}` }, body, cache: 'no-store' });
    if (!r.ok) throw new Error('Could not save settings to Upstash (' + r.status + ')');
  } else {
    await fs.mkdir(path.dirname(filePath()), { recursive: true });
    await fs.writeFile(filePath(), body, { mode: 0o600 });
  }
  memo = { at: Date.now(), value: v };
}

/* ---------- public API ---------- */
function fromEnv(): AISettings {
  const provider = (process.env.AI_PROVIDER as ProviderId) || (process.env.GEMINI_API_KEY && !process.env.OLLAMA_API_KEY ? 'gemini' : 'ollama-cloud');
  return { ...DEFAULTS, provider: PROVIDERS[provider] ? provider : 'ollama-cloud', model: process.env.AI_MODEL || process.env.OLLAMA_MODEL || '', baseUrl: process.env.AI_BASE_URL || process.env.OLLAMA_HOST || '' };
}
export async function getSettings(): Promise<AISettings> {
  const s = await readStored();
  return s ? { ...DEFAULTS, ...s, keys: s.keys || {} } : fromEnv();
}

/** Key for a provider: saved (encrypted) key first, then the provider's environment variable. */
export function resolveKey(s: AISettings, p: ProviderId): { key?: string; source: 'settings' | 'env' | 'none' } {
  const saved = decrypt(s.keys[p]);
  if (saved) return { key: saved, source: 'settings' };
  const env = process.env[PROVIDERS[p].envKey] || (p === 'openai-compatible' ? process.env.OPENAI_API_KEY : undefined);
  return env ? { key: env, source: 'env' } : { source: 'none' };
}

export function toProviderConfig(s: AISettings, overrideKey?: string): ProviderConfig {
  const def = PROVIDERS[s.provider];
  return {
    provider: s.provider, baseUrl: s.baseUrl || def.defaultBaseUrl, model: s.model || def.defaultModel,
    apiKey: overrideKey ?? resolveKey(s, s.provider).key, temperature: s.temperature, maxTokens: s.maxTokens, timeoutMs: s.timeoutSec * 1000,
  };
}

export async function activeConfig(): Promise<{ settings: AISettings; cfg: ProviderConfig } | null> {
  const settings = await getSettings();
  if (!settings.enabled) return null;
  const cfg = toProviderConfig(settings);
  if (PROVIDERS[settings.provider].keyRequired && !cfg.apiKey) return null;
  if (!cfg.model) return null;
  return { settings, cfg };
}

export async function saveSettings(input: Omit<AISettings, 'keys' | 'updatedAt'>, keyChange?: { provider: ProviderId; value: string | null }) {
  const current = (await readStored()) || { ...fromEnv() };
  const keys = { ...(current.keys || {}) };
  if (keyChange) { if (keyChange.value) keys[keyChange.provider] = encrypt(keyChange.value); else delete keys[keyChange.provider]; }
  const next: Stored = { ...current, ...input, keys, updatedAt: new Date().toISOString() };
  await writeStored(next);
  return next;
}

export function publicView(s: AISettings) {
  const keys = Object.fromEntries((Object.keys(PROVIDERS) as ProviderId[]).map(p => {
    const r = resolveKey(s, p);
    return [p, { source: r.source, hint: r.key ? '••••' + r.key.slice(-4) : null }];
  }));
  const { keys: _omit, ...rest } = s; void _omit;
  return { ...rest, keyStatus: keys, providers: PROVIDERS, storage: storageKind(), canSave: canSaveSettings(), passwordRequired: !!process.env.AI_ADMIN_PASSWORD };
}

export function canSaveSettings() { return !!secret() && (!isProd || !!process.env.AI_ADMIN_PASSWORD); }

/** Checks the admin password sent in the x-admin-password header. */
export function checkAdmin(req: Request): { ok: true } | { ok: false; status: number; error: string } {
  const expected = process.env.AI_ADMIN_PASSWORD;
  if (!expected) return isProd ? { ok: false, status: 403, error: 'Saving AI settings is disabled until AI_ADMIN_PASSWORD is set in the hosting environment.' } : { ok: true };
  const got = req.headers.get('x-admin-password') || '';
  const a = createHash('sha256').update(got).digest(), b = createHash('sha256').update(expected).digest();
  return timingSafeEqual(a, b) ? { ok: true } : { ok: false, status: 401, error: 'Wrong admin password.' };
}

/** Counts summaries per day; returns false when the daily limit is reached. */
const memUsage = { day: '', count: 0 };
export async function takeDailyQuota(limit: number): Promise<boolean> {
  const day = new Date().toISOString().slice(0, 10);
  const s = await readStored();
  if (!s) { // settings come from environment variables only: count in memory
    if (memUsage.day !== day) { memUsage.day = day; memUsage.count = 0; }
    if (limit && memUsage.count >= limit) return false;
    memUsage.count++; return true;
  }
  const usage = s.usage?.day === day ? s.usage : { day, count: 0 };
  if (limit && usage.count >= limit) return false;
  try { await writeStored({ ...s, usage: { day, count: usage.count + 1 } }); } catch { /* counting is best effort */ }
  return true;
}
export async function usageToday() { const s = await readStored(); const day = new Date().toISOString().slice(0, 10); return s ? (s.usage?.day === day ? s.usage.count : 0) : (memUsage.day === day ? memUsage.count : 0); }
