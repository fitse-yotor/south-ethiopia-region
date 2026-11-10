'use client';
import { useState } from 'react';
import { BellRing, Check, RotateCcw, Send, X } from 'lucide-react';
import { toast } from 'sonner';
import { useWS } from '@/lib/ws/store';
import { channelLabel } from '@/lib/ws/alerts';
import { Empty, F, PageHead, Panel, Pill, Sel, ago } from './ui';

const TONE = { queued: 'gold', sent: 'green', failed: 'red' } as const;

/** SMS / Telegram alert settings and the outbox. Messages are queued here; a server worker delivers them in production. */
export function AlertsPage() {
  const { data, actions, userName } = useWS();
  const a = data.settings.alerts;
  const [v, setV] = useState({ sms: a.sms, telegram: a.telegram, days: String(a.hearingReminderDays) });
  const [status, setStatus] = useState('all'), [channel, setChannel] = useState('all');
  const list = data.outbox.filter(m => (status === 'all' || m.status === status) && (channel === 'all' || m.channel === channel));
  const count = (s: string) => data.outbox.filter(m => m.status === s).length;
  return <>
    <PageHead eyebrow="SUPER ADMIN" title="SMS & Telegram alerts">
      Hearing reminders, SLA warnings and new assignments are sent as in-app notifications, and also as SMS or Telegram messages to people who switched those channels on in <b>My profile</b>.
    </PageHead>
    <div className="ws-banner warn"><BellRing /><div><b>Demonstration build: nothing is actually sent</b><p>Messages wait in the outbox below. In production a server worker reads the outbox and delivers through an SMS gateway and a Telegram bot, then marks each message sent or failed. Use the buttons to simulate that.</p></div></div>
    <div className="ws-stats">
      <div className="ws-stat tone-gold"><span className="ws-stat-label">Queued</span><strong>{count('queued')}</strong></div>
      <div className="ws-stat"><span className="ws-stat-label">Sent</span><strong>{count('sent')}</strong></div>
      <div className="ws-stat tone-red"><span className="ws-stat-label">Failed</span><strong>{count('failed')}</strong></div>
    </div>
    <Panel title="Settings">
      <form className="ws-inline wrap" onSubmit={e => { e.preventDefault(); actions.setAlertSettings({ sms: v.sms, telegram: v.telegram, hearingReminderDays: Math.min(14, Math.max(0, Number(v.days) || 0)) }); toast.success('Alert settings saved'); }}>
        <label className="ws-check"><input type="checkbox" checked={v.sms} onChange={e => setV({ ...v, sms: e.target.checked })} />SMS enabled</label>
        <label className="ws-check"><input type="checkbox" checked={v.telegram} onChange={e => setV({ ...v, telegram: e.target.checked })} />Telegram enabled</label>
        <F label="Remind about hearings (days ahead)"><input className="ws-input" type="number" min={0} max={14} value={v.days} onChange={e => setV({ ...v, days: e.target.value })} /></F>
        <button className="ws-btn">Save</button>
        <button type="button" className="ws-btn ghost" onClick={() => { actions.runRemindersNow(); toast.success('Reminders checked'); }}><RotateCcw size={15} />Check reminders now</button>
        <button type="button" className="ws-btn ghost" onClick={() => { actions.sendTestAlert(); toast.success('Test alert queued for you'); }}><Send size={15} />Queue a test alert for me</button>
      </form>
    </Panel>
    <Panel title="Outbox">
      <div className="ws-filters">
        <Sel aria-label="Status" value={status} onChange={setStatus} options={[['all', 'All statuses'], ['queued', 'Queued'], ['sent', 'Sent'], ['failed', 'Failed']]} />
        <Sel aria-label="Channel" value={channel} onChange={setChannel} options={[['all', 'SMS and Telegram'], ['sms', 'SMS'], ['telegram', 'Telegram']]} />
      </div>
      <div className="ws-table-wrap"><table className="ws-table compact cards-on-mobile">
        <thead><tr><th>When</th><th>To</th><th>Channel</th><th>Message</th><th>Status</th><th></th></tr></thead>
        <tbody>{list.map(m => <tr key={m.id}>
          <td data-label="When">{ago(m.at)}</td>
          <td data-label="To">{userName(m.userId)}<small className="ws-sub">{m.to}</small></td>
          <td data-label="Channel"><Pill tone="blue">{channelLabel(m)}</Pill><small className="ws-sub">{m.lang === 'am' ? 'አማርኛ' : 'English'}</small></td>
          <td data-label="Message">{m.text}<small className="ws-sub">{m.event}</small></td>
          <td data-label="Status"><Pill tone={TONE[m.status]}>{m.status}</Pill>{m.note && <small className="ws-sub">{m.note}</small>}</td>
          <td className="ws-row-actions">{m.status !== 'sent' && <button aria-label="Mark sent" title="Simulate: delivered" onClick={() => actions.markOutbox(m.id, 'sent')}><Check size={16} /></button>}
            {m.status === 'queued' && <button aria-label="Mark failed" title="Simulate: failed" onClick={() => actions.markOutbox(m.id, 'failed', 'Gateway error (simulated)')}><X size={16} /></button>}
            {m.status === 'failed' && <button aria-label="Requeue" title="Queue again" onClick={() => actions.markOutbox(m.id, 'queued')}><RotateCcw size={16} /></button>}</td>
        </tr>)}</tbody>
      </table>{!list.length && <Empty title="Outbox is empty">Alerts appear here when hearings or SLA dates approach, or when a case is assigned, for people who chose SMS or Telegram.</Empty>}</div>
    </Panel>
  </>;
}
