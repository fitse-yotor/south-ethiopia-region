import { NextResponse } from 'next/server';
import { PROVIDERS } from '@/lib/ai/providers';
import { activeConfig } from '@/lib/ai/settings';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Tells the UI whether AI summaries are available. Never returns keys.
export async function GET() {
  const a = await activeConfig();
  if (!a) return NextResponse.json({ enabled: false });
  return NextResponse.json({ enabled: true, provider: PROVIDERS[a.cfg.provider].label, model: a.cfg.model, defaultLang: a.settings.defaultLang });
}
