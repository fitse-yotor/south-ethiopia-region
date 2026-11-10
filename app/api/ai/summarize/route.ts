import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { AIError, chat } from '@/lib/ai/providers';
import { activeConfig, takeDailyQuota } from '@/lib/ai/settings';
import { redact } from '@/lib/ai/redact';
import { allow } from '@/lib/ai/rate-limit';

export const runtime = 'nodejs';
export const maxDuration = 60;

const Report = z.object({
  period: z.enum(['Daily', 'Weekly', 'Monthly']),
  periodLabel: z.string().max(80),
  office: z.string().max(80).optional(),
  author: z.string().max(80),
  newCases: z.number().int().min(0).max(10_000),
  closedCases: z.number().int().min(0).max(10_000),
  hearings: z.number().int().min(0).max(10_000),
  summary: z.string().max(6000),
  challenges: z.string().max(3000).optional().default(''),
  nextPlan: z.string().max(3000).optional().default(''),
});
const Body = z.object({
  mode: z.enum(['report', 'period']),
  lang: z.enum(['en', 'am']),
  periodTitle: z.string().max(120).optional(),
  reports: z.array(Report).min(1).max(60),
  // Extra names to hide (e.g. case parties) in addition to report authors.
  redactNames: z.array(z.string().max(120)).max(300).optional().default([]),
});

const SYSTEM = (lang: 'en' | 'am') => [
  'You summarise prosecutor activity reports for the Woreda Coordinator of the Southern Ethiopia Regional Justice Bureau, Ethiopia.',
  'Use only facts stated in the reports. Do not invent numbers, names or events.',
  'Do not give opinions on guilt, sentences or legal decisions. The Woreda Coordinator makes all decisions.',
  'Placeholders such as [PERSON-1], [CASE-NO] or [PHONE] replace hidden personal data: keep them exactly as written.',
  'Format: short headings "Key figures", "Progress", "Challenges", "Follow-up for the Woreda Coordinator", each with 1-4 bullet points. Maximum 200 words. No preamble.',
  lang === 'am'
    ? 'Write the whole answer in Amharic (አማርኛ) using Ge\'ez script. Translate the headings into Amharic. Keep numbers as digits.'
    : 'Write the answer in clear, simple English.',
].join('\n');

export async function POST(req: NextRequest) {
  const active = await activeConfig();
  if (!active) return NextResponse.json({ error: 'AI summaries are switched off or not configured. A Super Admin can set them up in Settings → AI summaries.' }, { status: 503 });
  const { cfg, settings } = active;

  // Only accept calls from this site's own pages.
  const origin = req.headers.get('origin');
  if (origin && new URL(origin).host !== req.headers.get('host')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'local';
  if (!allow('sum:' + ip)) return NextResponse.json({ error: 'Too many summary requests. Wait a minute and try again.' }, { status: 429 });

  let body: z.infer<typeof Body>;
  try { body = Body.parse(await req.json()); } catch (e) {
    return NextResponse.json({ error: 'Invalid request', detail: e instanceof z.ZodError ? e.issues.slice(0, 3) : undefined }, { status: 400 });
  }

  if (!(await takeDailyQuota(settings.dailyLimit))) return NextResponse.json({ error: `The daily limit of ${settings.dailyLimit} AI summaries is reached. It resets tomorrow.`, kind: 'rate_limit' }, { status: 429 });

  // Redact before anything leaves the server.
  const names = [...body.reports.map(r => r.author), ...body.redactNames];
  const map: Record<string, string> = {};
  const blocks = body.reports.map((r, i) => {
    const author = redact(r.author, names, map).text;
    const field = (s: string) => redact(s, names, map).text;
    return [
      `Report ${i + 1}: ${r.period} report, ${r.periodLabel}, by ${author}${r.office ? ` (${r.office})` : ''}`,
      `Figures: new cases ${r.newCases}, cases closed ${r.closedCases}, court hearings ${r.hearings}`,
      `Activities: ${field(r.summary)}`,
      `Challenges: ${field(r.challenges) || '-'}`,
      `Plan: ${field(r.nextPlan) || '-'}`,
    ].join('\n');
  });
  const totals = body.reports.reduce((t, r) => ({ n: t.n + r.newCases, c: t.c + r.closedCases, h: t.h + r.hearings }), { n: 0, c: 0, h: 0 });
  const userMsg = [
    body.mode === 'period'
      ? `Summarise these ${body.reports.length} reports for ${body.periodTitle || 'the selected period'}. Totals: new cases ${totals.n}, closed ${totals.c}, hearings ${totals.h}. Mention which [PERSON-n] needs follow-up.`
      : 'Summarise this report.',
    '',
    blocks.join('\n\n'),
  ].join('\n');

  try {
    const out = await chat(cfg, SYSTEM(body.lang), userMsg);
    // Map placeholders back to real names for the Woreda Coordinator (only on our side).
    let summary = out.content;
    for (const [name, ph] of Object.entries(map)) summary = summary.split(ph).join(name);
    return NextResponse.json({
      summary, model: out.model, lang: body.lang, reports: body.reports.length,
      usage: { inputTokens: out.inputTokens, outputTokens: out.outputTokens, ms: out.ms },
      redacted: Object.keys(map).length,
    });
  } catch (e) {
    if (e instanceof AIError) return NextResponse.json({ error: e.message, kind: e.kind }, { status: e.status });
    return NextResponse.json({ error: 'Unexpected error while creating the summary.' }, { status: 500 });
  }
}
