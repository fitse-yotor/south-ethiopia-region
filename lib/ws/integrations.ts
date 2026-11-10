// Extension point (left open): national court systems.
// The Federal courts are building an Integrated Court Management Information System (ICMIS) and an
// Electronic Records Management System (ERMS). No public API exists yet, so nothing here is wired up.
// When one is published, implement this interface on the server and call it from the case actions.
import type { Case, Hearing } from './types';

export type CourtSyncResult = { ok: boolean; message: string };
export interface CourtSystemAdapter {
  readonly name: string;
  /** Push a prosecution case file (charge) to the court system. */
  submitCase(c: Case): Promise<CourtSyncResult>;
  /** Pull hearing dates and adjournments for a case. */
  fetchHearings(caseNo: string): Promise<Hearing[]>;
}
