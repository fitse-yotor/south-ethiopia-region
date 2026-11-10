import { ADJ_REASONS, CASE_STATUSES, OFFICES as OFF_LIST, PERMISSIONS, type CustodyAction, type Case, type CaseStatus, type Permission, type WSData } from './types';
import { REGION_ID, unitName, woredaByName, type Scope } from './org';

const DAY = 86400000;
export const SEED_VERSION = 9;

export function seedData(now = Date.now()): WSData {
  const ago = (d: number, h = 9) => { const t = new Date(now - d * DAY); t.setHours(h, (d * 7) % 60, 0, 0); return t.toISOString(); };
  const addDays = (iso: string, d: number) => new Date(new Date(iso).getTime() + d * DAY).toISOString();
  // Nobody but a Woreda Coordinator registers and assigns cases, not even the Super Admin.
  const all = PERMISSIONS.map(p => p.key).filter(k => k !== 'cases.assign');
  const W = (name: string): Scope => ({ level: 'woreda', id: woredaByName(name)!.id });
  const Z = (id: string): Scope => ({ level: 'zone', id });
  const R: Scope = { level: 'region', id: REGION_ID };
  const P = (...p: Permission[]) => p;

  const roles: WSData['roles'] = [
    { id: 'super-admin', name: 'Super Admin', description: 'Full access to every module, user, role and report.', permissions: all, system: true },
    { id: 'library-admin', name: 'Library Head', description: 'Head of the digital library. Uploads and organizes documents, approves researcher payments and contributions, sees library reports.', permissions: P('library.view', 'library.manage', 'library.approve', 'reports.library', 'reports.own'), system: true },
    { id: 'researcher', name: 'Researcher', description: 'Registered researcher. Pays the library fee, accesses the full library after approval and contributes research.', permissions: P('library.contribute', 'reports.own'), system: true },
    { id: 'region-head', name: 'Region Head', description: 'Head of the Regional Justice Bureau. Sees every zone and woreda, comments on cases, checks reports and statuses, and sets the SLA, case types and KPI targets for all zones and woredas.', permissions: P('cases.viewAll', 'cases.comment', 'cases.update', 'sla.manage', 'preports.view', 'library.view', 'audit.view', 'reports.cases', 'reports.citizen', 'reports.library', 'reports.own'), system: true },
    { id: 'zone-head', name: 'Zone Head', description: 'Head of a zone justice office. Sees all woredas of the own zone, comments on cases and checks their reports and statuses. SLA and KPI targets are set by the region.', permissions: P('cases.viewAll', 'cases.comment', 'preports.view', 'library.view', 'reports.cases', 'reports.citizen', 'reports.own'), system: true },
    { id: 'prosecutor', name: 'Prosecutor', description: 'Works on the cases the Woreda Coordinator assigns, updates status within SLA and submits daily, weekly and monthly reports.', permissions: P('evidence.manage', 'cases.viewOwn', 'cases.update', 'preports.submit', 'library.view', 'reports.own'), system: true },
    { id: 'woreda-coordinator', name: 'Woreda Coordinator', description: 'Coordinator of a woreda justice office. Registers incoming cases and assigns them to the prosecutors of the own woreda, comments, gives permission on overdue cases, reviews prosecutor reports and sees the woreda reports.', permissions: P('evidence.manage', 'cases.assign', 'cases.viewOffice', 'cases.comment', 'cases.extend', 'cases.documents', 'preports.view', 'preports.review', 'library.view', 'reports.office', 'reports.own'), system: true },
    { id: 'legal-aid-officer', name: 'Legal Aid Officer', description: 'Manages free legal aid appointments and sees citizen-service reports.', permissions: P('appointments.manage', 'reports.citizen', 'reports.own'), system: true },
    { id: 'finance-officer', name: 'Finance Officer', description: 'Follows researcher library fees paid with Telebirr and the revenue reports.', permissions: P('reports.finance', 'reports.own'), system: true },
    { id: 'auditor', name: 'Auditor', description: 'Read-only oversight: can look at all cases, reports and the audit log of the whole region but cannot change anything.', permissions: P('cases.viewAll', 'preports.view', 'audit.view', 'library.view', 'reports.system', 'reports.library', 'reports.cases', 'reports.citizen', 'reports.finance', 'reports.own'), system: true },
    { id: 'content-editor', name: 'Content Editor', description: 'Manages public website news, notices, events, gallery and legal documents.', permissions: P('cms.access', 'events.manage', 'reports.own'), system: true },
    { id: 'complaint-officer', name: 'Complaint Officer', description: 'Handles citizen complaints, legal aid appointments and service feedback.', permissions: P('cms.access', 'appointments.manage', 'events.manage', 'reports.own'), system: true },
  ];

  const u = (id: string, name: string, email: string, roleId: string, office: string, d: number, extra: Partial<WSData['users'][number]> = {}) =>
    ({ id, name, email, password: 'Demo@123', phone: '+251 9' + (11000000 + d * 13791).toString().slice(0, 8), roleId, office, status: 'active' as const, createdAt: ago(d), lastLogin: ago(Math.max(0, d % 3)), ...extra });
  const users: WSData['users'] = [
    u('u-super', 'System Administrator', 'superadmin@ser-justice.demo', 'super-admin', 'Regional office', 300, { password: 'Admin@123', scope: R }),
    u('u-rh', 'Abebe Kebede', 'region.head@ser-justice.demo', 'region-head', 'Regional office', 260, { scope: R }),
    u('u-lib', 'Meron Tesfaye', 'library@ser-justice.demo', 'library-admin', 'Regional office', 240, { scope: R }),
    u('u-aud', 'Solomon Gebre', 'auditor@ser-justice.demo', 'auditor', 'Regional office', 120, { scope: R }),
    u('u-cms', 'Tigist Worku', 'editor@ser-justice.demo', 'content-editor', 'Regional office', 210, { scope: R }),
    u('u-co', 'Mulugeta Asfaw', 'complaints@ser-justice.demo', 'complaint-officer', 'Regional office', 205, { scope: R }),
    u('u-la', 'Genet Mamo', 'legalaid@ser-justice.demo', 'legal-aid-officer', 'Regional office', 160, { scope: R }),
    u('u-fin', 'Bekele Tola', 'finance@ser-justice.demo', 'finance-officer', 'Regional office', 160, { scope: R }),
    u('u-zh1', 'Tesfaye Gebre', 'zone.head@ser-justice.demo', 'zone-head', 'South Omo Zone office', 250, { scope: Z('z-south-omo') }),
    u('u-zh2', 'Almaz Wolde', 'zone.head.ari@ser-justice.demo', 'zone-head', 'Ari Zone office', 245, { scope: Z('z-ari') }),
    u('u-wc1', 'Hirut Abera', 'coordinator.jinka@ser-justice.demo', 'woreda-coordinator', 'Jinka Town', 170, { scope: W('Jinka Town') }),
    u('u-wc2', 'Ayele Doyo', 'coordinator.hamer@ser-justice.demo', 'woreda-coordinator', 'Hamer', 180, { scope: W('Hamer'), telegramChatId: '@demo_hamer_coordinator' }),
    u('u-wc3', 'Mulu Bekele', 'coordinator.bena@ser-justice.demo', 'woreda-coordinator', 'Bena Tsemay', 175, { scope: W('Bena Tsemay') }),
    u('u-wc5', 'Tadelech Haile', 'coordinator.offa@ser-justice.demo', 'woreda-coordinator', 'Offa', 165, { scope: W('Offa') }),
    u('u-wc6', 'Getachew Lemma', 'coordinator.chencha@ser-justice.demo', 'woreda-coordinator', 'Chencha', 160, { scope: W('Chencha') }),
    u('u-p1', 'Hana Girma', 'prosecutor@ser-justice.demo', 'prosecutor', 'Jinka Town', 200, { scope: W('Jinka Town') }),
    u('u-p2', 'Dawit Alemu', 'dawit.alemu@ser-justice.demo', 'prosecutor', 'Hamer', 190, { scope: W('Hamer'), telegramChatId: '@demo_dawit' }),
    u('u-p3', 'Selam Tadesse', 'selam.tadesse@ser-justice.demo', 'prosecutor', 'Bena Tsemay', 150, { scope: W('Bena Tsemay') }),
    u('u-p5', 'Eden Tessema', 'eden.tessema@ser-justice.demo', 'prosecutor', 'Offa', 140, { scope: W('Offa') }),
    u('u-p6', 'Kassa Mamo', 'kassa.mamo@ser-justice.demo', 'prosecutor', 'Chencha', 135, { scope: W('Chencha') }),
    u('u-p4', 'Kebede Lemma', 'kebede.lemma@ser-justice.demo', 'prosecutor', 'Male', 400, { status: 'inactive', scope: W('Male') }),
    u('u-r1', 'Dr. Yonas Bekele', 'researcher@example.com', 'researcher', '—', 90, { institution: 'Jinka University', purpose: 'Customary law and formal justice research', researchArea: 'Legal pluralism, customary dispute resolution, juvenile justice', bio: 'Lecturer in law at Jinka University. Researches how elders\u2019 councils and woreda justice offices work together in South Omo.' }),
    u('u-r2', 'Lidya Haile', 'lidya.haile@example.com', 'researcher', '—', 4, { institution: 'Arba Minch University', purpose: 'MA thesis on juvenile justice', researchArea: 'Juvenile justice' }),
    u('u-r3', 'Samuel Ayele', 'samuel.ayele@example.com', 'researcher', '—', 1, { institution: 'Independent researcher', purpose: 'Land dispute resolution study' }),
    u('u-r4', 'Mekdes Alemayehu', 'mekdes.alemayehu@example.com', 'researcher', '—', 2, { institution: 'Addis Ababa University', purpose: 'PhD research on pastoralist land rights' }),
    u('u-r5', 'Biruk Tesfaye', 'biruk.tesfaye@example.com', 'researcher', '—', 14, { institution: 'Wolaita Sodo University', purpose: 'Comparative study of legal aid services' }),
  ];

  const categories: WSData['categories'] = [
    { id: 'c-laws', name: 'Laws & Proclamations', parentId: null, description: 'Federal and regional legislation, regulations and directives.' },
    { id: 'c-research', name: 'Research Papers', parentId: null, description: 'Peer and researcher contributions on justice in South Omo.' },
    { id: 'c-research-cust', name: 'Customary Law', parentId: 'c-research', description: 'Customary dispute resolution and legal pluralism.' },
    { id: 'c-research-crim', name: 'Criminal Justice', parentId: 'c-research', description: 'Prosecution, juvenile justice and crime prevention.' },
    { id: 'c-manuals', name: 'Manuals & Guidelines', parentId: null, description: 'Practice manuals, guidelines and standard procedures.' },
    { id: 'c-videos', name: 'Training Videos', parentId: null, description: 'Recorded trainings and awareness videos.' },
    { id: 'c-reports', name: 'Annual Reports', parentId: null, description: 'Institutional performance reports.' },
    { id: 'c-forms', name: 'Forms & Templates', parentId: null, description: 'Downloadable forms for citizens and staff.' },
  ];

  let dn = 0;
  const doc = (title: string, categoryId: string, type: 'pdf' | 'word' | 'video', url: string, size: number, visibility: 'public' | 'researchers', d: number, extra: Partial<WSData['docs'][number]> = {}) => ({
    id: 'd-' + (++dn), title, description: '', categoryId, type, url, fileName: url.split('/').pop()!, size, visibility, status: 'published' as const,
    uploadedBy: 'u-lib', source: 'admin' as const, author: 'Southern Ethiopia Regional Justice Bureau', year: new Date(now - d * DAY).getFullYear().toString(),
    createdAt: ago(d), publishedAt: ago(d), views: 40 + ((dn * 37) % 260), downloads: 8 + ((dn * 23) % 90), ...extra,
  });
  const docs: WSData['docs'] = [
    doc("Citizens' Charter", 'c-laws', 'pdf', '/samples/citizens-charter.pdf', 2596, 'public', 120, { description: 'Service standards, citizen rights and complaint channels.' }),
    doc('Administrative Justice Guideline', 'c-laws', 'pdf', '/samples/administrative-justice.pdf', 2464, 'public', 100, { description: 'Checklist for recording a concern and communicating outcomes.' }),
    doc('Crime Prevention Strategy', 'c-laws', 'pdf', '/samples/crime-prevention.pdf', 2447, 'researchers', 80, { description: 'Community awareness and coordination framework.' }),
    doc('Prosecution Practice Manual', 'c-manuals', 'word', '/library/prosecution-manual.docx', 3100, 'researchers', 70, { description: 'Case intake, charging standards, court representation and reporting obligations.' }),
    doc('Legal Aid Service Guideline', 'c-manuals', 'word', '/library/legal-aid-guideline.docx', 2600, 'public', 65, { description: 'Eligibility, intake and referral for legal aid.' }),
    doc('Prosecution procedure orientation', 'c-videos', 'video', '/library/video-1.mp4', 113066, 'researchers', 40, { description: 'Orientation video for new prosecutors (sample).' }),
    doc('Customary dispute resolution in South Omo', 'c-videos', 'video', '/library/video-2.mp4', 113735, 'public', 35, { description: 'Awareness video on elders’ reconciliation practices (sample).' }),
    doc('Annual Performance Report 2025', 'c-reports', 'word', '/library/annual-report-2025.docx', 2900, 'public', 30, { description: 'Summary of case handling and service delivery indicators.' }),
    doc('Complaint Form', 'c-forms', 'pdf', '/samples/complaint-form.pdf', 2428, 'public', 150, { description: 'Printable complaint submission form.' }),
    doc('Information Request Form', 'c-forms', 'pdf', '/samples/information-request.pdf', 2319, 'public', 140, { description: 'Request access to public information.' }),
    doc('Customary Law and Formal Justice in South Omo', 'c-research-cust', 'word', '/library/research-customary-law.docx', 3400, 'researchers', 20, { description: 'Interaction between elders’ councils and woreda justice offices.', source: 'researcher', uploadedBy: 'u-r1', author: 'Dr. Yonas Bekele', reviewedBy: 'u-lib' }),
    doc('Juvenile Justice Practice in South Omo: A Field Survey', 'c-research-crim', 'word', '/library/research-customary-law.docx', 3400, 'researchers', 1, { description: 'Field survey of juvenile case handling in four woredas, with recommendations.', source: 'researcher', uploadedBy: 'u-r1', author: 'Dr. Yonas Bekele', status: 'pending', publishedAt: undefined, views: 0, downloads: 0 }),
    doc('Notes on Court Fees (draft)', 'c-research-crim', 'pdf', '/samples/information-request.pdf', 2319, 'researchers', 25, { description: 'Short draft note on court fee practice.', source: 'researcher', uploadedBy: 'u-r1', author: 'Dr. Yonas Bekele', status: 'rejected', publishedAt: undefined, reviewedBy: 'u-lib', reviewNote: 'Too short for publication. Please expand with sources and resubmit.', views: 0, downloads: 0 }),
    doc('Public Legal Awareness in Pastoralist Communities', 'c-research-crim', 'pdf', '/samples/legal-awareness.pdf', 2485, 'researchers', 3, { description: 'Survey of legal awareness campaigns in Hamer and Dasenech.', source: 'researcher', uploadedBy: 'u-r1', author: 'Dr. Yonas Bekele', status: 'pending', publishedAt: undefined, views: 0, downloads: 0 }),
  ];

  const payments: WSData['payments'] = [
    { id: 'pay-1', userId: 'u-r1', amount: 200, txnId: 'TB8K2LQ91X', receiptUrl: '/receipts/receipt-TB8K2LQ91X.pdf', receiptName: 'receipt-TB8K2LQ91X.pdf', paidOn: ago(89), status: 'approved', createdAt: ago(89), reviewedBy: 'u-lib', reviewedAt: ago(88), expiresAt: addDays(ago(88), 365), note: 'Receipt verified against the merchant statement.' },
    { id: 'pay-2', userId: 'u-r2', amount: 200, txnId: 'TB9P4MZ27Q', receiptUrl: '/receipts/receipt-TB9P4MZ27Q.png', receiptName: 'receipt-TB9P4MZ27Q.png', paidOn: ago(2), status: 'pending', createdAt: ago(2) },
    { id: 'pay-3', userId: 'u-r4', amount: 200, txnId: 'TC1R7KD55W', receiptUrl: '/receipts/receipt-TC1R7KD55W.pdf', receiptName: 'receipt-TC1R7KD55W.pdf', paidOn: ago(1), status: 'pending', createdAt: ago(1, 10) },
    { id: 'pay-4', userId: 'u-r5', amount: 200, txnId: 'TA00BAD1', receiptUrl: '/receipts/receipt-TA00BAD1.jpg', receiptName: 'receipt-TA00BAD1.jpg', paidOn: ago(13), status: 'rejected', createdAt: ago(13), reviewedBy: 'u-lib', reviewedAt: ago(12), note: 'Transaction ID was not found in the merchant statement. Please upload the correct receipt.' },
  ];

  const caseCategories: WSData['caseCategories'] = [
    ['ct-ord', 'Ordinary case', 90], ['ct-app', 'Appellate case', 60], ['ct-cas', 'Cassation case', 45],
  ].map(([id, name, slaDays]) => ({ id: id as string, name: name as string, slaDays: slaDays as number, updatedAt: ago(60), updatedBy: 'u-rh' }));
  const sla = Object.fromEntries(caseCategories.map(c => [c.id, c.slaDays]));

  const statusChanges: WSData['statusChanges'] = [];
  // [title, case type, subject, prosecutor, days left until SLA (negative = overdue), status, priority, parties]
  const caseSpec: [string, string, string, string, number, CaseStatus, Case['priority'], string][] = [
    ['Murder investigation – Turmi market incident', 'ct-ord', 'Homicide', 'u-p2', 25, 'In court', 'Urgent', 'Public Prosecutor v. A. Bero'],
    ['Livestock theft – 14 cattle, Dimeka', 'ct-ord', 'Theft & robbery', 'u-p2', -12, 'Charge filed', 'High', 'Public Prosecutor v. K. Lale and 2 others'],
    ['Domestic violence appeal – Jinka kebele 02', 'ct-app', 'Gender-based violence', 'u-p1', -7, 'Under investigation', 'High', 'Public Prosecutor v. T. Mesele'],
    ['Embezzlement of cooperative funds', 'ct-ord', 'Fraud & corruption', 'u-p1', 50, 'Under investigation', 'Normal', 'Public Prosecutor v. Cooperative cashier'],
    ['Boundary dispute appeal – South Ari', 'ct-app', 'Land & property', 'u-p1', 30, 'Adjourned', 'Normal', 'Ayele family v. Gebre family'],
    ['Hit-and-run on Jinka–Key Afer road', 'ct-ord', 'Traffic offence', 'u-p1', -4, 'In court', 'High', 'Public Prosecutor v. Unknown driver'],
    ['Juvenile theft case – Key Afer', 'ct-ord', 'Juvenile', 'u-p3', 4, 'Registered', 'Normal', 'Public Prosecutor v. Minor (sealed)'],
    ['Assault appeal – Key Afer weekly market', 'ct-app', 'Assault', 'u-p3', 5, 'Charge filed', 'Normal', 'Public Prosecutor v. B. Ayke'],
    ['Robbery of mobile money agent – cassation', 'ct-cas', 'Theft & robbery', 'u-p3', -6, 'Under investigation', 'Urgent', 'Public Prosecutor v. Unknown'],
    ['Forgery of land certificate', 'ct-ord', 'Fraud & corruption', 'u-p2', 65, 'Under investigation', 'Normal', 'Public Prosecutor v. M. Dore'],
    ['Motorcycle theft – Jinka Town', 'ct-ord', 'Theft & robbery', 'u-p1', 20, 'Closed', 'Normal', 'Public Prosecutor v. S. Haile'],
    ['Traffic collision – Weyto bridge', 'ct-ord', 'Traffic offence', 'u-p2', 5, 'Registered', 'Normal', 'Public Prosecutor v. Truck driver'],
    ['Child labour exploitation report', 'ct-ord', 'Juvenile', 'u-p1', 24, 'Under investigation', 'High', 'Public Prosecutor v. Employer'],
    ['Attempted homicide – Omorate (cassation)', 'ct-cas', 'Homicide', 'u-p3', 10, 'Judgment delivered', 'Urgent', 'Public Prosecutor v. L. Nakwa'],
    ['Inheritance property appeal – Male', 'ct-app', 'Land & property', 'u-p2', -5, 'In court', 'Normal', 'Ergo family v. Shano family'],
    ['Abduction complaint – Hamer', 'ct-ord', 'Gender-based violence', 'u-p2', 30, 'Under investigation', 'Urgent', 'Public Prosecutor v. Unknown'],
    ['Fraud appeal – Jinka cooperative union', 'ct-app', 'Fraud & corruption', 'u-p1', -20, 'Closed', 'Normal', 'Public Prosecutor v. Union treasurer'],
    ['Cassation review – land expropriation', 'ct-cas', 'Land & property', 'u-p2', 22, 'Charge filed', 'Normal', 'Public Prosecutor v. Kebele administration'],
    ['Land grab and forgery – Offa', 'ct-ord', 'Land & property', 'u-p5', 18, 'Under investigation', 'High', 'Public Prosecutor v. D. Dana'],
    ['Cooperative embezzlement – Offa', 'ct-ord', 'Fraud & corruption', 'u-p5', -9, 'Charge filed', 'High', 'Public Prosecutor v. Union cashier'],
    ['Assault appeal – Offa market', 'ct-app', 'Assault', 'u-p5', 12, 'In court', 'Normal', 'Public Prosecutor v. B. Abera'],
    ['Domestic violence – Offa', 'ct-ord', 'Gender-based violence', 'u-p5', 40, 'Registered', 'Urgent', 'Public Prosecutor v. T. Tadesse'],
    ['Highland livestock theft – Chencha', 'ct-ord', 'Theft & robbery', 'u-p6', 6, 'Charge filed', 'Normal', 'Public Prosecutor v. Two accused'],
    ['Traffic fatality – Chencha road', 'ct-ord', 'Traffic offence', 'u-p6', -14, 'In court', 'Urgent', 'Public Prosecutor v. Bus driver'],
    ['Juvenile case – Chencha', 'ct-ord', 'Juvenile', 'u-p6', 30, 'Under investigation', 'Normal', 'Public Prosecutor v. Minor (sealed)'],
    ['Fraud cassation – Chencha', 'ct-cas', 'Fraud & corruption', 'u-p6', 15, 'Closed', 'Normal', 'Public Prosecutor v. Procurement officer'],
  ];
  const wOf: Record<string, Scope> = { 'u-p1': W('Jinka Town'), 'u-p2': W('Hamer'), 'u-p3': W('Bena Tsemay'), 'u-p5': W('Offa'), 'u-p6': W('Chencha') };
  const coordOf: Record<string, string> = { 'u-p1': 'u-wc1', 'u-p2': 'u-wc2', 'u-p3': 'u-wc3', 'u-p5': 'u-wc5', 'u-p6': 'u-wc6' };
  const cases: Case[] = caseSpec.map(([title, cat, subject, pros, left, status, priority, parties], i) => {
    // Closed cases: 'left' is how many days before (+) or after (-) the SLA due date they were closed.
    const closedDaysAgo = i === 16 ? 10 : 5;
    const d = status === 'Closed' ? sla[cat] - left + closedDaysAgo : sla[cat] - left;
    const openedAt = ago(d, 8);
    const path: CaseStatus[] = status === 'Adjourned'
      ? ['Registered', 'Under investigation', 'Charge filed', 'In court', 'Adjourned']
      : CASE_STATUSES.slice(0, CASE_STATUSES.indexOf(status) + 1).filter(s => s !== 'Adjourned');
    path.forEach((s, k) => statusChanges.push({
      id: `sc-${i}-${k}`, caseId: 'case-' + (i + 1), from: k ? path[k - 1] : null, to: s,
      note: k === 0 ? 'Case registered and assigned.' : ['Investigation file opened with police.', 'Charge prepared and filed with the court.', 'First hearing attended.', 'Hearing adjourned at defence request.', 'Judgment delivered by the woreda court.', 'File closed and archived.'][Math.min(k - 1, 5)],
      by: k === 0 ? coordOf[pros] : pros, at: ago(Math.max(0, d - k * Math.max(1, Math.floor(d / (path.length + 1)))), 10),
    }));
    return {
      id: 'case-' + (i + 1), caseNo: `SER/${({ 'ct-ord': 'OR', 'ct-app': 'AP', 'ct-cas': 'CS' } as Record<string, string>)[cat]}/${String(140 + i).padStart(4, '0')}/${new Date(openedAt).getFullYear()}`,
      title, categoryId: cat, subject, prosecutorId: pros, createdBy: coordOf[pros], office: unitName(wOf[pros].id), woredaId: wOf[pros].id, parties,
      description: 'Sample case record for demonstration. Facts summarised for the case register; no real personal data.',
      priority, openedAt, dueAt: addDays(openedAt, sla[cat]), status, closedAt: status === 'Closed' ? ago(closedDaysAgo) : undefined, updatedAt: statusChanges[statusChanges.length - 1].at,
    };
  });

  const comments: WSData['comments'] = [
    { id: 'cm-1', caseId: 'case-3', by: 'u-wc1', body: 'Please prioritise the medical report and victim protection measures. Update me before the SLA date.', at: ago(10) },
    { id: 'cm-2', caseId: 'case-3', by: 'u-p1', body: 'Medical report requested from Jinka hospital; expected this week.', at: ago(9) },
    { id: 'cm-3', caseId: 'case-9', by: 'u-wc3', body: 'This case is overdue. Come to the office and explain the delay before I give permission.', at: ago(4) },
    { id: 'cm-3b', caseId: 'case-9', by: 'u-p3', body: 'Visited the office today. The forensic report from Hawassa arrived late; requesting permission to continue.', at: ago(3) },
    { id: 'cm-4', caseId: 'case-1', by: 'u-wc2', body: 'Good progress. Coordinate witness protection for the next hearing.', at: ago(6) },
    { id: 'cm-5', caseId: 'case-2', by: 'u-wc2', body: 'Confirm that seized cattle were returned to owners and documented.', at: ago(4) },
    { id: 'cm-6', caseId: 'case-1', by: 'u-zh1', body: 'Zone view: this is the most serious case in the zone this quarter. Please send me a short status note after the next hearing.', at: ago(5) },
    { id: 'cm-7', caseId: 'case-3', by: 'u-zh2', body: 'Zone view: please make sure the victim protection measures are in place.', at: ago(8) },
    { id: 'cm-8', caseId: 'case-19', by: 'u-wc5', body: 'Overdue soon. Meet me at the office this week and bring the land registry extract.', at: ago(3) },
  ];
  // Permission given by the Woreda Coordinator after the prosecutor came to the office. The case stays overdue in KPIs.
  const c9 = cases[8];
  c9.permitUntil = addDays(ago(2), 14);
  const extensions: WSData['extensions'] = [{ id: 'ex-1', caseId: c9.id, by: 'u-wc3', days: 14, reason: 'Prosecutor came to the office: forensic report delayed. Permission to continue; case remains overdue in KPIs.', at: ago(2, 11), oldDue: c9.dueAt, newDue: c9.permitUntil }];

  const preports: WSData['preports'] = [];
  const fb: WSData['feedback'] = [];
  const pros = ['u-p1', 'u-p2', 'u-p3', 'u-p5', 'u-p6'];
  let rn = 0;
  const mk = (p: string, period: 'Daily' | 'Weekly' | 'Monthly', d: number, label: string, reviewed: boolean, feedback?: string) => {
    const id = 'pr-' + (++rn);
    preports.push({
      id, prosecutorId: p, period, periodLabel: label, periodStart: ago(d), newCases: period === 'Daily' ? rn % 3 : period === 'Weekly' ? 3 + (rn % 4) : 9 + (rn % 6),
      closedCases: period === 'Daily' ? rn % 2 : period === 'Weekly' ? 1 + (rn % 3) : 5 + (rn % 4), hearings: period === 'Daily' ? 1 : period === 'Weekly' ? 4 : 14,
      summary: period === 'Daily' ? 'Attended hearings, reviewed police investigation files and met complainants.' : period === 'Weekly' ? 'Filed charges in two cases, attended court sessions and followed up on pending investigations.' : 'Monthly summary of case flow, court outcomes and coordination with police and courts.',
      challenges: ['Delay in forensic/medical reports.', 'Witnesses travelling long distances to court.', 'Limited transport for field visits.'][rn % 3],
      nextPlan: 'Follow up overdue files, prepare charges and attend scheduled hearings.', submittedAt: ago(d, 17), status: reviewed ? 'Reviewed' : 'Submitted',
    });
    if (feedback) fb.push({ id: 'fb-' + rn, reportId: id, by: coordOf[p], body: feedback, at: ago(Math.max(0, d - 1), 11) });
  };
  const fmt = (d: number) => new Date(now - d * DAY).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  pros.forEach((p, i) => {
    [1, 2, 3, 4, 5].forEach(d => { if (!(i === 2 && d === 1)) mk(p, 'Daily', d, fmt(d), d > 2, d === 3 && i === 0 ? 'Well documented. Please attach hearing minutes next time.' : undefined); });
    mk(p, 'Weekly', 3 + i, 'Week ending ' + fmt(3 + i), i !== 1, i === 0 ? 'Good weekly progress. Focus on the overdue GBV file.' : i === 2 ? 'Please include the number of pending investigations.' : undefined);
    mk(p, 'Weekly', 10 + i, 'Week ending ' + fmt(10 + i), true, 'Noted. Keep coordinating with the police.');
    const m = new Date(now); m.setMonth(m.getMonth() - 1);
    mk(p, 'Monthly', 2 + i, m.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }), i === 0, i === 0 ? 'Monthly figures received. Clearance rate improved — well done.' : undefined);
  });

  const notifications: WSData['notifications'] = [
    { id: 'n-0', userId: 'u-lib', text: 'Mekdes Alemayehu uploaded a Telebirr receipt for review.', link: '/dashboard/library/approvals', at: ago(1, 10), read: false },
    { id: 'n-1', userId: 'u-lib', text: 'Lidya Haile uploaded a Telebirr receipt for review.', link: '/dashboard/library/approvals', at: ago(2), read: false },
    { id: 'n-2', userId: 'u-lib', text: 'Dr. Yonas Bekele submitted a contribution: “Public Legal Awareness in Pastoralist Communities”.', link: '/dashboard/library/approvals', at: ago(3), read: false },
    { id: 'n-3', userId: 'u-p1', text: 'Woreda Coordinator commented on SER/AP/0142 (Domestic violence appeal).', link: '/dashboard/cases/case-3', at: ago(10), read: false },
    { id: 'n-4', userId: 'u-p1', text: 'Feedback received on your weekly report.', link: '/dashboard/periodic-reports', at: ago(2), read: false },
    { id: 'n-5', userId: 'u-wc3', text: 'Several cases are past their SLA due date and need your review.', link: '/dashboard/cases?filter=overdue', at: ago(1), read: false },
    { id: 'n-6', userId: 'u-wc2', text: 'Dawit Alemu submitted a weekly report.', link: '/dashboard/periodic-reports', at: ago(4), read: false },
    { id: 'n-7', userId: 'u-r1', text: 'Your library access payment was approved. Access valid for 12 months.', link: '/dashboard/library', at: ago(88), read: true },
    { id: 'n-8', userId: 'u-r2', text: 'Your receipt was received and is awaiting review by the Library Admin.', link: '/dashboard/library/access', at: ago(2), read: false },
    { id: 'n-9', userId: 'u-super', text: '2 new researcher accounts registered this week.', link: '/dashboard/users', at: ago(1), read: false },
  ];

  const audit: WSData['audit'] = [
    ['u-super', 'Seeded demonstration data', 30], ['u-lib', 'Approved payment TB8K2LQ91X for Dr. Yonas Bekele', 88], ['u-rh', 'Updated SLA for Gender-based violence to 45 days', 60],
    ['u-wc2', 'Created case SER/OR/0140/… and assigned to Dawit Alemu', 95], ['u-p1', 'Updated status of SER/AP/0142 to Under investigation', 40],
    ['u-r2', 'Submitted Telebirr receipt TB9P4MZ27Q', 2], ['u-r1', 'Submitted contribution “Public Legal Awareness in Pastoralist Communities”', 3], ['u-wc1', 'Gave feedback on weekly report of Hana Girma', 2],
  ].map(([by, action, d], i) => ({ id: 'a-' + i, by: by as string, action: action as string, at: ago(d as number, 12) })).sort((a, b) => b.at.localeCompare(a.at));


  /* ---------- new feature data (v6) ---------- */
  const ahead = (d: number, h = 9) => { const t = new Date(now + d * DAY); t.setHours(h, 0, 0, 0); return t.toISOString(); };
  const dayStr = (iso: string) => iso.slice(0, 10);

  // Keywords and text summaries for library search
  const KW: Record<string, [string[], string]> = {
    "Citizens' Charter": [['service standards', 'rights', 'complaints'], 'Sets service standards for the department: respectful treatment, clear information, response times and how to complain when a service is not delivered.'],
    'Administrative Justice Guideline': [['administrative justice', 'complaints', 'procedure'], 'Explains how to record a concern, identify the responsible office, communicate progress and explain the outcome to the citizen.'],
    'Crime Prevention Strategy': [['crime prevention', 'community policing', 'coordination'], 'Framework for community awareness, accessible reporting and coordination between police, prosecution, courts and kebele structures.'],
    'Prosecution Practice Manual': [['prosecution', 'charging', 'court', 'reporting'], 'Case intake, evidence review, charging standards, court representation, adjournments and daily, weekly and monthly reporting duties of prosecutors.'],
    'Legal Aid Service Guideline': [['legal aid', 'eligibility', 'referral'], 'Who qualifies for free legal aid, intake steps, priority groups (women, children, persons with disabilities) and referral to representation.'],
    'Prosecution procedure orientation': [['training', 'prosecution', 'video'], 'Orientation video for new prosecutors covering case registration, SLA monitoring and reporting.'],
    'Customary dispute resolution in South Omo': [['customary law', 'elders', 'reconciliation', 'video'], 'Awareness video on how elders\u2019 councils resolve disputes and when cases must go to formal justice institutions.'],
    'Annual Performance Report 2025': [['annual report', 'performance', 'statistics'], 'Case handling figures, clearance rates, legal awareness campaigns and service delivery indicators for 2025.'],
    'Complaint Form': [['form', 'complaint'], 'Printable form for submitting a complaint about a justice service.'],
    'Information Request Form': [['form', 'information access'], 'Form to request access to public information held by the department.'],
    'Customary Law and Formal Justice in South Omo': [['customary law', 'legal pluralism', 'Hamer', 'Dasenech', 'elders'], 'Interviews with elders, woreda justice officers and community members show referral pathways between customary institutions and formal courts, documentation gaps and ways to improve coordination.'],
  };
  docs.forEach(d => { const k = KW[d.title]; if (k) { d.keywords = k[0]; d.text = k[1]; } });
  docs.push(doc('Women\u2019s Access to Justice in Hamer Woreda (draft)', 'c-research-cust', 'pdf', '/samples/legal-awareness.pdf', 2485, 'researchers', 6, { description: 'Draft study on barriers women face when reporting gender-based violence.', source: 'researcher', uploadedBy: 'u-r1', author: 'Dr. Yonas Bekele', status: 'changes_requested', publishedAt: undefined, reviewedBy: 'u-lib', reviewNote: 'Please add your interview method and anonymise the village names.', views: 0, downloads: 0, keywords: ['gender-based violence', 'women', 'Hamer'], text: 'Draft findings on distance to offices, language barriers and fear of stigma.' }));
  const changesDoc = docs[docs.length - 1].id;
  const reviewComments: WSData['reviewComments'] = [
    { id: 'rc-1', docId: changesDoc, by: 'u-lib', body: 'Thank you – valuable topic. Please (1) describe your interview method and sample size, (2) anonymise the village names in section 3.', at: ago(4, 11) },
    { id: 'rc-2', docId: changesDoc, by: 'u-r1', body: 'Thanks. I will add a methods section and replace village names with codes this week.', at: ago(3, 15) },
  ];

  const appointments: WSData['appointments'] = [
    ['Almaz Desta', '+251 916 220 114', 'Ari Zone office', 2, '09:00', 'Family / divorce', 'confirmed'],
    ['Gelgelo Bura', '+251 917 330 225', 'South Omo Zone office', 3, '10:30', 'Land dispute', 'booked'],
    ['Aster Kebede', '+251 918 440 336', 'Ari Zone office', 1, '14:00', 'Gender-based violence', 'confirmed'],
    ['Bona Lale', '+251 919 550 447', 'South Omo Zone office', 6, '11:00', 'Labour / employment', 'booked'],
    ['Meseret Ali', '+251 911 660 558', 'Ari Zone office', -2, '09:30', 'Inheritance', 'completed'],
    ['Kulo Arbe', '+251 912 770 669', 'South Omo Zone office', -5, '15:00', 'Criminal case advice', 'completed'],
    ['Sara Tesfu', '+251 913 880 770', 'Ari Zone office', -1, '10:00', 'Family / divorce', 'cancelled'],
    ['Dula Mena', '+251 914 990 881', 'South Omo Zone office', -9, '13:30', 'Land dispute', 'completed'],
  ].map(([name, phone, office, d, time, issue, status], i) => ({ id: 'ap-' + (i + 1), code: 'LA-' + (4821 + i * 37), name: name as string, phone: phone as string, office: office as string, date: dayStr(d as number >= 0 ? ahead(d as number) : ago(-(d as number))), time: time as string, issue: issue as string, details: 'Sample appointment request (demonstration data).', status: status as WSData['appointments'][number]['status'], createdAt: ago(Math.abs(d as number) + 3) }));

  const services = ['Legal aid', 'Complaint handling', 'Prosecution services', 'Information request'];
  const ratings: WSData['ratings'] = Array.from({ length: 36 }, (_, i) => ({
    id: 'rt-' + i, service: services[i % 4], office: OFF_LIST[i % OFF_LIST.length], stars: [5, 4, 5, 3, 4, 5, 2, 4, 5, 4, 3, 5][i % 12],
    comment: ['Staff explained the next steps clearly.', 'Had to wait long but the officer was helpful.', '', 'Very respectful service.', 'Please add more staff on market days.', ''][i % 6], at: ago(i * 2 + 1, 12),
  }));

  const events: WSData['events'] = [
    ['Legal awareness day: rights of women and children', 'Legal awareness', 4, '09:00', 'Jinka Town hall', 'Ari Zone office'],
    ['Public hearing: Turmi market incident (murder case)', 'Public hearing', 7, '08:30', 'Hamer woreda court', 'South Omo Zone office'],
    ['Community dialogue with elders on customary justice', 'Community dialogue', 11, '10:00', 'Key Afer community centre', 'South Omo Zone office'],
    ['Paralegal training for kebele leaders', 'Training', 15, '09:00', 'Zone justice office, Jinka', 'Ari Zone office'],
    ['Mobile legal aid clinic – Omorate', 'Legal awareness', 20, '09:00', 'Omorate kebele office', 'South Omo Zone office'],
    ['Public hearing: inheritance property dispute', 'Public hearing', 2, '14:00', 'Male woreda court', 'South Omo Zone office'],
    ['Legal awareness radio programme', 'Legal awareness', -3, '18:00', 'Regional FM', 'Ari Zone office'],
    ['Workshop on juvenile justice', 'Training', -10, '09:00', 'Jinka University', 'Ari Zone office'],
  ].map(([title, type, d, time, place, office], i) => ({ id: 'ev-' + (i + 1), title: title as string, type: type as WSData['events'][number]['type'], date: dayStr((d as number) >= 0 ? ahead(d as number) : ago(-(d as number))), time: time as string, place: place as string, office: office as string, description: 'Open to the public. Sample event for demonstration.' }));

  const courts: Record<string, string> = { 'Jinka Town': 'Ari Zone High Court, Jinka', Hamer: 'Hamer Woreda Court, Dimeka', 'Bena Tsemay': 'Bena Tsemay Woreda Court, Key Afer', Offa: 'Offa Woreda Court', Chencha: 'Chencha Woreda Court' };
  const ADJ: [(typeof ADJ_REASONS)[number], 'Court' | 'Prosecution' | 'Defence'][] = [[ADJ_REASONS[0], 'Defence'], [ADJ_REASONS[1], 'Court'], [ADJ_REASONS[3], 'Court'], [ADJ_REASONS[5], 'Prosecution'], [ADJ_REASONS[4], 'Court'], [ADJ_REASONS[2], 'Court']];
  const hearings: WSData['hearings'] = [];
  cases.filter(c => ['Charge filed', 'In court', 'Adjourned', 'Judgment delivered'].includes(c.status)).forEach((c, i) => {
    hearings.push({ id: `hr-${i}-a`, caseId: c.id, date: dayStr(ago(10 + i * 3)), time: '09:00', court: courts[c.office] || 'Woreda court', purpose: 'Plea hearing', ...(i % 2 ? { outcome: 'Adjourned – ' + ADJ[Math.floor(i / 2) % ADJ.length][0], adjournReason: ADJ[Math.floor(i / 2) % ADJ.length][0], adjournedBy: ADJ[Math.floor(i / 2) % ADJ.length][1], nextDate: dayStr(ahead([1, 3, 5, 8, 2, 12, 6][i % 7])) } : { outcome: 'Plea recorded; evidence hearing scheduled' }), createdBy: c.prosecutorId });
    if (c.status !== 'Judgment delivered') hearings.push({ id: `hr-${i}-b`, caseId: c.id, date: dayStr(ahead([1, 3, 5, 8, 2, 12, 6][i % 7])), time: ['08:30', '10:00', '14:00'][i % 3], court: courts[c.office] || 'Woreda court', purpose: ['Evidence hearing', 'Witness examination', 'Defence hearing', 'Judgment'][i % 4], createdBy: c.prosecutorId });
  });

  const caseDocs: WSData['caseDocs'] = [];
  const cdoc = (caseId: string, docType: WSData['caseDocs'][number]['docType'], title: string, url: string, by: string, d: number, extra: WSData['caseDocs'][number]['versions'] = []) =>
    caseDocs.push({ id: 'cd-' + (caseDocs.length + 1), caseId, docType, title, versions: [{ v: 1, url, fileName: url.split('/').pop()!, size: 2400, by, at: ago(d), note: 'Initial upload' }, ...extra] });
  cdoc('case-1', 'Police investigation file', 'Police investigation file – Turmi', '/samples/administrative-justice.pdf', 'u-p2', 90);
  cdoc('case-1', 'Charge sheet', 'Charge sheet', '/samples/crime-prevention.pdf', 'u-p2', 70, [{ v: 2, url: '/samples/crime-prevention.pdf', fileName: 'charge-sheet-v2.pdf', size: 2500, by: 'u-p2', at: ago(60), note: 'Corrected article numbers after Woreda Coordinator review' }]);
  cdoc('case-1', 'Evidence list', 'Evidence list', '/samples/information-request.pdf', 'u-p2', 65);
  cdoc('case-3', 'Police investigation file', 'Police file – Jinka kebele 02', '/samples/administrative-justice.pdf', 'u-p1', 50);
  cdoc('case-3', 'Witness statement', 'Statement of neighbour (sealed)', '/samples/legal-awareness.pdf', 'u-p1', 40);
  cdoc('case-6', 'Charge sheet', 'Charge sheet – hit-and-run', '/samples/crime-prevention.pdf', 'u-p1', 25);
  cdoc('case-14', 'Judgment', 'Judgment of the court', '/samples/citizens-charter.pdf', 'u-p3', 4);

  const evidence: WSData['evidence'] = [];
  const ev = (caseId: string, kind: WSData['evidence'][number]['kind'], description: string, from: string, steps: [CustodyAction, string, string, number][]) => {
    const c = cases.find(z => z.id === caseId)!;
    let prev = from;
    const n = evidence.filter(e => e.caseId === caseId).length + 1;
    evidence.push({ id: 'ev-' + (evidence.length + 1), caseId, itemNo: `EV-${c.caseNo.split('/')[2]}-${String(n).padStart(2, '0')}`, kind, description, collectedFrom: from, createdBy: c.prosecutorId, createdAt: ago(steps[0][3]),
      custody: steps.map(([action, to, note, d], k) => { const e = { id: `cu-${evidence.length + 1}-${k}`, action, from: prev, to, note, by: c.prosecutorId, at: ago(d, 11) }; prev = to; return e; }) });
  };
  ev('case-1', 'Weapon', 'Machete recovered near Turmi market', 'Crime scene, Turmi', [['Collected', 'Turmi police station evidence room', 'Sealed and photographed at the scene.', 85], ['Transferred', 'Hamer woreda prosecution office', 'Handed over with the police file.', 80], ['Sent to laboratory', 'Regional forensic laboratory, Hawassa', 'Blood and fingerprint analysis requested.', 60], ['Returned from laboratory', 'Hamer woreda prosecution office', 'Report attached to the file.', 30], ['Presented in court', 'Hamer Woreda Court', 'Marked as exhibit P-1.', 8]]);
  ev('case-1', 'Document', 'Witness statements bundle (12 pages)', 'Turmi police station', [['Collected', 'Turmi police station', 'Statements taken by the investigating officer.', 88], ['Transferred', 'Hamer woreda prosecution office', 'Copies certified by the prosecutor.', 80]]);
  ev('case-3', 'Document', 'Medical certificate, Jinka hospital', 'Jinka hospital', [['Collected', 'Jinka Town prosecution office', 'Original kept in the case file.', 12]]);
  ev('case-6', 'Photograph / video', 'Photographs of vehicle damage (14 images)', 'Jinka-Key Afer road', [['Collected', 'Jinka Town police station', 'Copied to sealed disc.', 20], ['Transferred', 'Jinka Town prosecution office', 'Disc sealed and signed.', 18]]);
  ev('case-6', 'Digital device / media', 'Mobile phone of the accused', 'Accused, at arrest', [['Collected', 'Jinka Town police station', 'Switched off and bagged.', 20], ['Sent to laboratory', 'Federal Police digital forensics, Addis Ababa', 'Call log and photo extraction requested.', 9]]);
  ev('case-2', 'Document', 'Cattle branding records, Dimeka', 'Dimeka kebele office', [['Collected', 'Hamer woreda prosecution office', 'Certified copies.', 40]]);
  ev('case-19', 'Document', 'Original land certificate (alleged forgery)', 'Offa land administration office', [['Collected', 'Offa police station', 'Seized with a court warrant.', 16], ['Transferred', 'Offa woreda prosecution office', '', 14]]);
  ev('case-24', 'Digital device / media', 'Dashcam memory card from the bus', 'Bus, Chencha road', [['Collected', 'Chencha police station', 'Card sealed in an evidence bag.', 11], ['Transferred', 'Chencha woreda prosecution office', '', 10], ['Presented in court', 'Chencha Woreda Court', 'Footage played in court.', 3]]);

  const tasks: WSData['tasks'] = [
    { id: 'tk-1', userId: 'u-p1', title: 'Collect medical report from Jinka hospital', due: dayStr(ahead(1)), done: false, createdAt: ago(3) },
    { id: 'tk-2', userId: 'u-p1', title: 'Prepare witness list for hit-and-run hearing', due: dayStr(ahead(4)), done: false, createdAt: ago(2) },
    { id: 'tk-3', userId: 'u-p1', title: 'Call complainant in cooperative fraud case', done: true, createdAt: ago(6) },
    { id: 'tk-4', userId: 'u-rh', title: 'Review SLA and KPI targets with the zone heads', due: dayStr(ahead(6)), done: false, createdAt: ago(5) },
  ];

  audit.push(
    { id: 'a-f1', by: 'system', action: 'Failed sign-in attempt for region.head@ser-justice.demo', at: ago(1, 7) },
    { id: 'a-f2', by: 'system', action: 'Failed sign-in attempt for unknown@example.com', at: ago(2, 22) },
    { id: 'a-f3', by: 'system', action: 'Failed sign-in attempt for unknown@example.com', at: ago(2, 22) },
  );
  audit.sort((a, b) => b.at.localeCompare(a.at));

  return {
    version: SEED_VERSION, roles, users, categories, docs, payments, caseCategories, cases, statusChanges, comments, extensions,
    evidence, outbox: [], preports, feedback: fb, notifications, audit, appointments, ratings, events, hearings, caseDocs, tasks, reviewComments,
    settings: { alerts: { sms: true, telegram: true, hearingReminderDays: 1 }, kpiTargets: { slaCompliance: 85, onTimeRate: 80, clearanceRate: 70 }, libraryFee: 200, telebirrCode: '5 1 7 6 2 0', telebirrName: 'Southern Ethiopia Regional Justice Bureau', accessDays: 365, dueSoonDays: 7, orgName: 'Southern Ethiopia Regional Justice Bureau' },
  };
}
