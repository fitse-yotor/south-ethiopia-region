import { NextResponse } from 'next/server';
import { z } from 'zod';
import { PROVIDERS, type ProviderId } from '@/lib/ai/providers';
import { canSaveSettings, checkAdmin, getSettings, publicView, saveSettings, usageToday } from '@/lib/ai/settings';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const providerIds = Object.keys(PROVIDERS) as [ProviderId, ...ProviderId[]];
const Body = z.object({
  enabled: z.boolean(),
  provider: z.enum(providerIds),
  model: z.string().trim().max(200),
  baseUrl: z.string().trim().max(300).refine(v => !v || /^https?:\/\/[^\s]+$/.test(v), 'Must be an http(s) URL'),
  temperature: z.number().min(0).max(1.5),
  maxTokens: z.number().int().min(200).max(8000),
  timeoutSec: z.number().int().min(10).max(120),
  defaultLang: z.enum(['en', 'am']),
  dailyLimit: z.number().int().min(0).max(100_000),
  // undefined = keep the saved key, '' = remove it, text = replace it
  apiKey: z.string().max(500).optional(),
});

export async function GET() {
  const s = await getSettings();
  return NextResponse.json({ ...publicView(s), usageToday: await usageToday() });
}

export async function PUT(req: Request) {
  const auth = checkAdmin(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  if (!canSaveSettings()) return NextResponse.json({ error: 'Saving is disabled: set AI_ADMIN_PASSWORD (and optionally AI_SETTINGS_SECRET) on the server.' }, { status: 403 });
  let b: z.infer<typeof Body>;
  try { b = Body.parse(await req.json()); } catch (e) {
    return NextResponse.json({ error: 'Invalid settings', detail: e instanceof z.ZodError ? e.issues.map(i => `${i.path.join('.')}: ${i.message}`).slice(0, 4) : undefined }, { status: 400 });
  }
  const { apiKey, ...rest } = b;
  try {
    const saved = await saveSettings(rest, apiKey === undefined ? undefined : { provider: b.provider, value: apiKey.trim() || null });
    return NextResponse.json({ ok: true, settings: publicView(saved) });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Could not save settings' }, { status: 500 });
  }
}
