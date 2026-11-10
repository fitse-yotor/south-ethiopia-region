# What to add next – recommendations (Nov 2026)

Based on the current portal, Ethiopian law and national digital programmes. Items marked
**verify** rest on secondary sources and must be confirmed with the authority named.

## 1. Required before real use (go-live blockers)

| # | Item | Why |
|---|---|---|
| 1 | **Real backend**: PostgreSQL database, server-side login and role checks, private file storage | Today all data and files live in each visitor's browser and permissions run in the browser. Nothing is shared or secure yet (see `docs/UPDATE_PLAN.md`). |
| 2 | **Host personal data in Ethiopia** | The Personal Data Protection Proclamation No. 1321/2024 (in force 24 Jul 2024) reportedly requires personal data collected in Ethiopia to be stored on servers in Ethiopia and restricts transfers abroad (**verify**). Vercel runs outside Ethiopia, so the database and files should sit in a local data centre / government cloud, or legal advice should confirm what may stay abroad. |
| 3 | **Data-protection compliance pack** | Registration with the data-protection authority (sources disagree whether this is ECA or INSA – **verify**), privacy notice, consent checkbox at researcher registration, retention periods for cases, receipts and complaints, data-subject request process. |
| 4 | **Staff account security** | Hashed passwords, two-factor login (SMS or authenticator app) for Super Admin, Director, Prosecutor and Library Admin, session timeout, lock after failed logins, tamper-proof audit log. |
| 5 | **Security review** | Government systems in Ethiopia are typically audited by INSA before launch (**verify**). Add backups, uptime monitoring, branch protection on `main` and secret rotation (see `SECURITY.md`). |

## 2. Integrations (high value)

| # | Item | Benefit |
|---|---|---|
| 6 | **Telebirr online payment (H5 C2B web checkout)** with signed payment notifications | Researchers pay inside the portal and access is granted automatically; the Library Admin no longer checks receipts by hand. Keep the receipt upload as a fallback. Needs merchant onboarding and keys from Ethio telecom's developer portal. |
| 7 | **Fayda national ID login (eSignet / OpenID Connect)** | Verified identity for researchers and, later, citizens filing complaints. Register as a relying party at partner.fayda.et; consent is required for every authentication. |
| 8 | **SMS notifications** (e.g. AfroMessage, which runs on Ethio telecom infrastructure) | Payment approved, contribution published, SLA due/overdue alerts to prosecutors and the Director, complaint status updates for citizens, one-time login codes. |
| 9 | **Email** | Password reset, report reminders, weekly summaries for the Director. |

## 3. Feature additions

**Prosecution portal**
- Hearing calendar with court dates and reminders; adjournment tracking.
- Evidence and document attachments per case (charge sheet, police file, judgment) with version history.
- SLA per stage (investigation, charging, trial) in addition to the whole-case SLA; automatic escalation to the Director.
- Daily/weekly/monthly reports pre-filled from case data (new, closed, hearings) instead of typing numbers.
- Case transfer between woredas/prosecutors with history; workload balancing view.
- Prepare for data exchange with the federal court e-justice platforms being rolled out (Integrated Court Management Information System) – e.g. export of charge files in a standard format.

**Digital library**
- Full-text search inside PDFs and Word files; Amharic titles and keywords.
- Download watermark with the researcher's name; citation export (APA, Chicago).
- Access-expiry reminders and online renewal; usage statistics per document.
- Reviewer comments thread on contributions (request changes instead of only approve/reject).

**Citizens and transparency**
- Connect the public complaint form to the staff workspace (today the complaint demo at `/admin` is separate).
- Public statistics page: cases handled, SLA compliance, legal-aid sessions (aggregated, no personal data).
- Legal-aid appointment booking per woreda office.
- Full Amharic translation of every screen, then the main local languages used in South Omo.

**Access in low-connectivity woredas**
- Installable mobile app (PWA) with offline drafts for case updates and reports that sync when online.
- Small page sizes and compressed media for 3G connections.

**Later: AI, aligned with Digital Ethiopia 2030 (AI-driven public services pillar)**
- Summaries of long prosecutor reports for the Director; Amharic search across the library.
- Keep a human decision on every case action, and document any AI use for oversight.

## 4. Suggested order

1. Backend + Ethiopian hosting + staff security (items 1–5) – about 3–4 weeks.
2. SMS + email notifications (8–9) – 1 week.
3. Telebirr online payment (6) – 1–2 weeks after merchant credentials arrive.
4. Prosecution additions (calendar, attachments, stage SLA, pre-filled reports) – 2–3 weeks.
5. Fayda login (7), Amharic completion, PWA/offline – 3–4 weeks.

## Sources

- Telebirr H5 C2B integration (third-party libraries describing the official guide): https://packagist.org/packages/melaku/telebirr, https://packagist.org/packages/bekambeyene/telebirr, https://root.packagist.org/packages/ttechnos/telebirr
- Data protection Proclamation 1321/2024: https://www.mofo.com/privacy-library/ethiopia, https://digitalpolicyalert.org/event/24922-implemented-personal-data-protection-proclamation-proclamation-no-13212024-including-data-localisation-requirements, https://cipit.strathmore.edu/?p=4868, https://www.techhiveadvisory.africa/insights/review-of-ethiopias-data-protection-act
- Fayda / eSignet: https://id.gov.et/api, https://id.gov.et/authentication, https://nidp.atlassian.net/wiki/spaces/~712020e898f1e6ab3543aabe17e0865c3305f5/pages/845905921/Fayda+eSignet+Relying+Party+Integration+Documentation, https://docs.trinsic.id/docs/ethiopia-fayda
- E-justice in Ethiopia: https://addisfortune.news/?p=42445, https://www.devdiscourse.com/article/other/3981612-ethiopias-justice-paradox-fast-courts-face-staffing-digital-and-access-gaps-as-cases-rise, https://www.techandjustice.bsg.ox.ac.uk/ethiopias-emerging-ai-in-criminal-justice-regulation-tools-and-insights-ai-atlas, https://www.afriwise.com/blog/modernizing-ethiopias-courts-electronic-filing-virtual-hearings-in-focus
- SMS: https://shega.co/news/afromessage-is-rising-as-ethiopias-sms-powerhouse, https://pub.dev/packages/afromessage_dart
- Digital Ethiopia 2030: https://www.pmo.gov.et/media/other/Digital_Ethiopia_2030.pdf, https://shega.co/news/ethiopias-ministerial-council-approves-digital-2030-strategy
