// Evidence register helpers (pure). The custody log is append-only: entries are never edited or removed.
import type { CustodyAction, EvidenceItem } from './types';

const CLOSING: CustodyAction[] = ['Returned to owner', 'Disposed / destroyed'];
export const lastEntry = (e: EvidenceItem) => e.custody[e.custody.length - 1];
/** Who or where holds the item now. */
export const holder = (e: EvidenceItem) => lastEntry(e)?.to || '-';
/** Closed items (returned or destroyed) accept no more custody entries. */
export const custodyClosed = (e: EvidenceItem) => CLOSING.includes(lastEntry(e)?.action);
export const evidenceStatus = (e: EvidenceItem): string => {
  const a = lastEntry(e)?.action;
  return a === 'Sent to laboratory' ? 'At laboratory' : a === 'Presented in court' ? 'In court' : a === 'Returned to owner' ? 'Returned' : a === 'Disposed / destroyed' ? 'Disposed' : 'In custody';
};
/** A chain is unbroken when every entry starts where the previous one ended. */
export const chainIntact = (e: EvidenceItem) => e.custody.every((c, i) => i === 0 || c.from === e.custody[i - 1].to);
