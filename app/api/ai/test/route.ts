import { NextResponse } from 'next/server';
import { z } from 'zod';
import { AIError, chat, listModels, PROVIDERS, type ProviderId } from '@/lib/ai/providers';
import { checkAdmin, getSettings, resolveKey, toProviderConfig } from '@/lib/ai/settings';

export const runtime = 'nodejs';
export const maxDuration = 60;

const providerIds = Object.keys(PROVIDERS) as [ProviderId, ...ProviderId[]];
const Body = z.object({
  provider: z.enum(providerIds),
  model: z.string().trim().max(200),
  baseUrl: z.string().trim().max(300),
  apiKey: z.string().max(500).optional(), // a new, not yet saved key to try
  temperature: z.number().min(0).max(1.5).default(0.2),
  maxTokens: z.number().int().min(50).max(8000).default(1200),
  timeoutSec: z.number().int().min(10).max(120).default(55),
});

// Tests unsaved settings from the form: lists models and sends one tiny prompt.
export async function POST(req: Request) {
  const auth = checkAdmin(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  let b: z.infer<typeof Body>;
  try { b = Body.parse(await req.json()); } catch { return NextResponse.json({ error: 'Invalid test request' }, { status: 400 }); }
  const saved = await getSettings();
  const draft = { ...saved, provider: b.provider, model: b.model, baseUrl: b.baseUrl, temperature: b.temperature, maxTokens: b.maxTokens, timeoutSec: b.timeoutSec };
  const cfg = toProviderConfig(draft, b.apiKey?.trim() || resolveKey(saved, b.provider).key);
  const out: { models?: string[]; modelsError?: string; reply?: string; ms?: number; model: string; ok: boolean; error?: string } = { model: cfg.model, ok: false };
  try { out.models = (await listModels(cfg)).slice(0, 100); } catch (e) { out.modelsError = e instanceof Error ? e.message : 'Could not list models'; }
  try {
    const r = await chat(cfg, 'You are a connection test. Reply with one short sentence.', 'Reply with: "Connection OK" and then the word for "justice" in Amharic.', 400);
    out.reply = r.content.slice(0, 300); out.ms = r.ms; out.model = r.model; out.ok = true;
  } catch (e) { out.error = e instanceof AIError || e instanceof Error ? e.message : 'Test failed'; }
  return NextResponse.json(out, { status: out.ok ? 200 : 502 });
}
