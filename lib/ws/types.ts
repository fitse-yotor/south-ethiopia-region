import type { Scope } from './org';
import { ZONE_OFFICES } from './org';

export type Permission =
  | 'users.manage' | 'roles.manage' | 'settings.manage' | 'audit.view'
  | 'library.view' | 'library.manage' | 'library.approve' | 'library.contribute'
  | 'cases.viewAll' | 'cases.viewOwn' | 'cases.update' | 'cases.comment' | 'cases.extend' | 'sla.manage'
  | 'preports.submit' | 'preports.review'
  | 'cms.access'
  | 'reports.system' | 'reports.library' | 'reports.cases' | 'reports.own'
  | 'appointments.manage' | 'events.manage'
  | 'staff.manage' | 'evidence.manage' | 'cases.assign' | 'cases.viewOffice' | 'cases.documents' | 'preports.view' | 'reports.citizen' | 'reports.finance' | 'reports.office';

export type Role = { id: string; name: string; description: string; permissions: Permission[]; system?: boolean };

export type UserStatus = 'active' | 'inactive';
export type User = {
  id: string; name: string; email: string; password: string; phone: string; roleId: string;
  office: string; /** Where this staff member works: a woreda, a zone or the region. Controls what they see. */ scope?: Scope; status: UserStatus; createdAt: string; institution?: string; purpose?: string; lastLogin?: string;
  researchArea?: string; bio?: string; prefs?: UserPrefs; /** Telegram chat id for alerts (set by the user in My profile). */ telegramChatId?: string;
};

export type LibCategory = { id: string; name: string; parentId: string | null; description: string };
export type DocType = 'pdf' | 'word' | 'video';
export type LibDoc = {
  id: string; title: string; description: string; categoryId: string; type: DocType; url: string; fileName: string;
  size: number; visibility: 'public' | 'researchers'; status: 'published' | 'pending' | 'rejected' | 'changes_requested';
  keywords?: string[]; text?: string; version?: number;
  uploadedBy: string; source: 'admin' | 'researcher'; author: string; year: string; reviewNote?: string;
  reviewedBy?: string; createdAt: string; publishedAt?: string; views: number; downloads: number;
};

export type Payment = {
  id: string; userId: string; amount: number; txnId: string; receiptUrl: string; receiptName: string; paidOn: string;
  status: 'pending' | 'approved' | 'rejected'; note?: string; createdAt: string; reviewedBy?: string; reviewedAt?: string; expiresAt?: string;
};

export type CaseCategory = { id: string; name: string; slaDays: number; updatedAt: string; updatedBy: string };
export type CaseStatus = 'Registered' | 'Under investigation' | 'Charge filed' | 'In court' | 'Adjourned' | 'Judgment delivered' | 'Closed';
export type Case = {
  id: string; caseNo: string; title: string;
  /** Case type (Ordinary / Appellate / Cassation) – the SLA is set per case type */
  categoryId: string; subject: string; prosecutorId: string; createdBy: string; office: string; /** Woreda that owns the case (drives zone and region roll-ups). */ woredaId: string;
  /** Until when the Woreda Coordinator has allowed updates on an overdue case. The case still counts as overdue in KPIs. */
  permitUntil?: string;
  parties: string; description: string; priority: 'Normal' | 'High' | 'Urgent'; openedAt: string; dueAt: string;
  status: CaseStatus; closedAt?: string; updatedAt: string;
};
export type StatusChange = { id: string; caseId: string; from: CaseStatus | null; to: CaseStatus; note: string; by: string; at: string };
export type CaseComment = { id: string; caseId: string; by: string; body: string; at: string };
/** Permission from the Woreda Coordinator to keep working on an overdue case. The SLA due date does NOT change. newDue = permission end. */
export type Extension = { id: string; caseId: string; by: string; days: number; reason: string; at: string; oldDue: string; newDue: string };

export type Period = 'Daily' | 'Weekly' | 'Monthly';
export type PReport = {
  id: string; prosecutorId: string; period: Period; periodLabel: string; periodStart: string; newCases: number; closedCases: number;
  hearings: number; summary: string; challenges: string; nextPlan: string; submittedAt: string; status: 'Submitted' | 'Reviewed';
};
export type Feedback = { id: string; reportId: string; by: string; body: string; at: string };

export type Notification = { id: string; userId: string; text: string; link: string; at: string; read: boolean };
export type Audit = { id: string; by: string; action: string; at: string };
export type KpiTargets = { slaCompliance: number; onTimeRate: number; clearanceRate: number };
export type Settings = { alerts: AlertSettings; kpiTargets: KpiTargets; libraryFee: number; telebirrCode: string; telebirrName: string; accessDays: number; dueSoonDays: number; orgName: string };

export type NotifyChannel = { app: boolean; email: boolean; sms: boolean; telegram?: boolean };
export const NOTIFY_EVENTS = ['Case assigned or updated', 'SLA due soon / overdue', 'Woreda Coordinator comments & feedback', 'Hearing reminders', 'Library approvals', 'Report reminders'] as const;
export const EV = { case: NOTIFY_EVENTS[0], sla: NOTIFY_EVENTS[1], comment: NOTIFY_EVENTS[2], hearing: NOTIFY_EVENTS[3], library: NOTIFY_EVENTS[4], report: NOTIFY_EVENTS[5] } as const;
export type UserPrefs = { lang: 'en' | 'am'; theme: 'light' | 'dark'; textSize: 100 | 112 | 125; notify: Record<string, NotifyChannel> };

export type Appointment = { id: string; code: string; name: string; phone: string; office: string; date: string; time: string; issue: string; details: string; status: 'booked' | 'confirmed' | 'completed' | 'cancelled'; createdAt: string; staffNote?: string };
export type Rating = { id: string; service: string; office: string; stars: number; comment: string; at: string };
export type PublicEvent = { id: string; title: string; type: 'Legal awareness' | 'Public hearing' | 'Community dialogue' | 'Training'; date: string; time: string; place: string; office: string; description: string };
export const ADJ_REASONS = ['Defence requested time', 'Witness absent', 'Accused absent', 'Judge absent / court not sitting', 'Prosecution needs time', 'Evidence or reports not ready', 'Lawyer absent', 'Other'] as const;
export const ADJ_BY = ['Court', 'Prosecution', 'Defence', 'Other'] as const;
export type AdjReason = (typeof ADJ_REASONS)[number];
export type AdjBy = (typeof ADJ_BY)[number];
/** adjournReason set = the hearing was adjourned. Who asked for it and why is tracked so delays can be analysed. */
export type Hearing = { id: string; caseId: string; date: string; time: string; court: string; purpose: string; outcome?: string; createdBy: string; adjournReason?: AdjReason; adjournedBy?: AdjBy; nextDate?: string };

export const EVIDENCE_KINDS = ['Document', 'Physical item', 'Weapon', 'Digital device / media', 'Biological sample', 'Photograph / video', 'Other'] as const;
export const CUSTODY_ACTIONS = ['Collected', 'Transferred', 'Sent to laboratory', 'Returned from laboratory', 'Presented in court', 'Returned to owner', 'Disposed / destroyed'] as const;
export type EvidenceKind = (typeof EVIDENCE_KINDS)[number];
export type CustodyAction = (typeof CUSTODY_ACTIONS)[number];
/** Append-only: entries are never edited or deleted, so the log is a chain of custody. */
export type CustodyEntry = { id: string; action: CustodyAction; from: string; to: string; note: string; by: string; at: string };
export type EvidenceItem = { id: string; caseId: string; itemNo: string; kind: EvidenceKind; description: string; collectedFrom: string; createdBy: string; createdAt: string; custody: CustodyEntry[] };

export type AlertChannel = 'sms' | 'telegram';
/** A message waiting for the SMS / Telegram gateway. This demo never sends it: production needs a server worker. */
export type OutboxMsg = { id: string; userId: string; channel: AlertChannel; to: string; lang: 'en' | 'am'; event: string; text: string; link: string; at: string; status: 'queued' | 'sent' | 'failed'; sentAt?: string; note?: string };
export type AlertSettings = { sms: boolean; telegram: boolean; hearingReminderDays: number };
export type CaseDocVersion = { v: number; url: string; fileName: string; size: number; by: string; at: string; note: string };
export type CaseDoc = { id: string; caseId: string; docType: 'Police investigation file' | 'Charge sheet' | 'Evidence list' | 'Witness statement' | 'Court order' | 'Judgment' | 'Other'; title: string; versions: CaseDocVersion[] };
export type Task = { id: string; userId: string; title: string; due?: string; done: boolean; createdAt: string };
export type ReviewComment = { id: string; docId: string; by: string; body: string; at: string };

export type WSData = {
  version: number; roles: Role[]; users: User[]; categories: LibCategory[]; docs: LibDoc[]; payments: Payment[];
  caseCategories: CaseCategory[]; cases: Case[]; statusChanges: StatusChange[]; comments: CaseComment[]; extensions: Extension[];
  preports: PReport[]; feedback: Feedback[]; notifications: Notification[]; audit: Audit[]; settings: Settings;
  appointments: Appointment[]; ratings: Rating[]; events: PublicEvent[]; hearings: Hearing[]; caseDocs: CaseDoc[]; tasks: Task[]; reviewComments: ReviewComment[]; evidence: EvidenceItem[]; outbox: OutboxMsg[];
  lastBackupAt?: string;
};

export const CASE_STATUSES: CaseStatus[] = ['Registered', 'Under investigation', 'Charge filed', 'In court', 'Adjourned', 'Judgment delivered', 'Closed'];
export const CASE_SUBJECTS = ['Homicide', 'Theft & robbery', 'Gender-based violence', 'Fraud & corruption', 'Land & property', 'Traffic offence', 'Juvenile', 'Assault', 'Other'];
/** Public-facing offices (zone justice offices). Woredas come from lib/ws/org.ts. */
export const OFFICES = ZONE_OFFICES;

export const PERMISSIONS: { key: Permission; label: string; group: string }[] = [
  { key: 'users.manage', label: 'Create & manage users', group: 'Administration' },
  { key: 'staff.manage', label: 'Create woreda accounts and post prosecutors to woredas (region)', group: 'Administration' },
  { key: 'roles.manage', label: 'Manage roles & permissions', group: 'Administration' },
  { key: 'settings.manage', label: 'System settings', group: 'Administration' },
  { key: 'audit.view', label: 'View audit log', group: 'Administration' },
  { key: 'cms.access', label: 'Website content & complaints', group: 'Administration' },
  { key: 'appointments.manage', label: 'Manage legal aid appointments', group: 'Administration' },
  { key: 'events.manage', label: 'Manage public events & ratings', group: 'Administration' },
  { key: 'library.view', label: 'Access full digital library', group: 'Digital library' },
  { key: 'library.manage', label: 'Upload & organize documents', group: 'Digital library' },
  { key: 'library.approve', label: 'Approve payments & contributions', group: 'Digital library' },
  { key: 'library.contribute', label: 'Contribute documents', group: 'Digital library' },
  { key: 'cases.viewAll', label: 'View all cases in own zone or region', group: 'Prosecution' },
  { key: 'cases.assign', label: 'Register cases and assign them to prosecutors (own woreda)', group: 'Prosecution' },
  { key: 'cases.viewOwn', label: 'View own cases', group: 'Prosecution' },
  { key: 'cases.viewOffice', label: 'View cases of own woreda office', group: 'Prosecution' },
  { key: 'cases.documents', label: 'Upload case documents', group: 'Prosecution' },
  { key: 'evidence.manage', label: 'Register evidence and record chain of custody', group: 'Prosecution' },
  { key: 'preports.view', label: 'Read prosecutor reports (no feedback)', group: 'Prosecution' },
  { key: 'cases.update', label: 'Update case status', group: 'Prosecution' },
  { key: 'cases.comment', label: 'Comment on cases', group: 'Prosecution' },
  { key: 'cases.extend', label: 'Give permission on overdue cases', group: 'Prosecution' },
  { key: 'sla.manage', label: 'Set SLA, case types and KPI targets (region)', group: 'Prosecution' },
  { key: 'preports.submit', label: 'Submit daily/weekly/monthly reports', group: 'Prosecution' },
  { key: 'preports.review', label: 'Review reports & give feedback', group: 'Prosecution' },
  { key: 'reports.system', label: 'System & user reports', group: 'Reports & export' },
  { key: 'reports.library', label: 'Library reports', group: 'Reports & export' },
  { key: 'reports.cases', label: 'Case & SLA reports', group: 'Reports & export' },
  { key: 'reports.office', label: 'Woreda office reports', group: 'Reports & export' },
  { key: 'reports.citizen', label: 'Citizen service reports (legal aid, ratings, events)', group: 'Reports & export' },
  { key: 'reports.finance', label: 'Finance reports (library fees)', group: 'Reports & export' },
  { key: 'reports.own', label: 'My own activity reports', group: 'Reports & export' },
];
