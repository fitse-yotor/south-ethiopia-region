// SMS / Telegram alert engine (pure functions, no React).
// In-app notifications are created immediately. SMS and Telegram messages are only QUEUED in `outbox`:
// a server worker connected to an SMS gateway and a Telegram bot must deliver them in production.
import { NOTIFY_EVENTS, type OutboxMsg, type WSData } from './types';
import { inScope } from './org';

const DAY = 86400000;
const iso = (t = Date.now()) => new Date(t).toISOString();
const mk = (p: string) => p + '-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

/** Draft Amharic labels put in front of the message for recipients who chose Amharic (needs review by a native translator). */
export const AM_EVENT: Record<string, string> = {
  'Case assigned or updated': 'መዝገብ ተመድቧል/ተሻሽሏል', 'SLA due soon / overdue': 'የጊዜ ገደብ ደርሷል/አልፏል', 'Woreda Coordinator comments & feedback': 'የጽ/ቤት ኃላፊ አስተያየት',
  'Hearing reminders': 'የችሎት ማስታወሻ', 'Library approvals': 'የቤተ መጻሕፍት ማጽደቂያ', 'Report reminders': 'የሪፖርት ማስታወሻ',
};
const urgent = (e: string) => e === 'SLA due soon / overdue' || e === 'Hearing reminders';
export const defaultNotify = () => Object.fromEntries(NOTIFY_EVENTS.map(e => [e, { app: true, email: e !== 'Library approvals', sms: urgent(e), telegram: urgent(e) }]));

/** Create in-app notifications and queue SMS / Telegram messages. `key` makes the call idempotent (used by reminders). */
export function queueFor(d: WSData, userIds: string[], text: string, link: string, event?: string, key?: string): WSData {
  const notifications = [...d.notifications];
  const outbox = [...d.outbox];
  let changed = false;
  for (const uid of Array.from(new Set(userIds))) {
    const nid = key ? `n-${key}-${uid}` : mk('n');
    if (key && notifications.some(n => n.id === nid)) continue;
    changed = true;
    notifications.unshift({ id: nid, userId: uid, text, link, at: iso(), read: false });
    const u = d.users.find(x => x.id === uid);
    if (!event || !u || u.status !== 'active') continue;
    const ch = { ...(defaultNotify()[event] || {}), ...(u.prefs?.notify?.[event] || {}) } as { sms?: boolean; telegram?: boolean };
    const lang = u.prefs?.lang || 'en';
    const body = lang === 'am' ? `${AM_EVENT[event] || ''} · ${text}` : text;
    const base = { userId: uid, lang, event, text: body, link, at: iso(), status: 'queued' as const };
    if (d.settings.alerts.sms && ch.sms && u.phone) outbox.unshift({ ...base, id: 'o-sms-' + nid, channel: 'sms', to: u.phone });
    if (d.settings.alerts.telegram && ch.telegram && u.telegramChatId) outbox.unshift({ ...base, id: 'o-tg-' + nid, channel: 'telegram', to: u.telegramChatId });
  }
  return changed ? { ...d, notifications, outbox: outbox.slice(0, 500) } : d;
}

/** Staff who should hear about a case: its prosecutor and the Woreda Coordinator(s) of its woreda. */
export function caseRecipients(d: WSData, caseId: string): string[] {
  const c = d.cases.find(x => x.id === caseId);
  if (!c) return [];
  const coordinators = d.users.filter(u => u.status === 'active' && u.roleId === 'woreda-coordinator' && inScope(u.scope, c.woredaId)).map(u => u.id);
  return [c.prosecutorId, ...coordinators];
}

/** Hearing reminders (today .. N days ahead) and SLA alerts. Safe to call repeatedly: every alert has a stable key. */
export function runReminders(d: WSData, now = Date.now()): WSData {
  let x = d;
  const today = iso(now).slice(0, 10), horizon = iso(now + d.settings.alerts.hearingReminderDays * DAY).slice(0, 10);
  for (const h of d.hearings) {
    if (h.date < today || h.date > horizon || h.adjournReason) continue;
    const c = d.cases.find(z => z.id === h.caseId);
    if (!c || c.status === 'Closed') continue;
    x = queueFor(x, caseRecipients(d, c.id), `Hearing ${h.date} ${h.time} - ${c.caseNo} (${h.court}).`, '/dashboard/calendar', 'Hearing reminders', `hr:${h.id}:${h.date}`);
  }
  for (const c of d.cases) {
    if (c.status === 'Closed') continue;
    const due = new Date(c.dueAt).getTime();
    const permitted = !!c.permitUntil && new Date(c.permitUntil).getTime() > now;
    if (due < now && !permitted) x = queueFor(x, caseRecipients(d, c.id), `${c.caseNo} is past its SLA due date and is locked.`, '/dashboard/cases/' + c.id, 'SLA due soon / overdue', `sla:${c.id}:overdue`);
    else if (due >= now && (due - now) / DAY <= d.settings.dueSoonDays) x = queueFor(x, caseRecipients(d, c.id), `${c.caseNo} is due within ${d.settings.dueSoonDays} days.`, '/dashboard/cases/' + c.id, 'SLA due soon / overdue', `sla:${c.id}:soon`);
  }
  return x;
}

export const channelLabel = (m: OutboxMsg) => (m.channel === 'sms' ? 'SMS' : 'Telegram');
