# South Omo Justice Portal — Update Plan (client feedback, Nov 2026)

Status: **Draft for client review** · Branch: `claude/relaxed-noether-3dplhp`

## 0. Where we are today (important)

The current site is a **front-end prototype only**:

- All data (cases, notices, gallery, users/roles) lives in React memory in `components/justice-portal.tsx` / `lib/content.ts` and resets on reload.
- "Admin login" is a role picker, not real authentication. No server-side RBAC.
- No database tables (`db/schema.ts` is empty), no file storage, no uploads.
- Hosting mismatch: deploys on **Vercel** (`vercel.json`), but `db/index.ts` expects a **Cloudflare D1** binding.

Every requested feature (paid researcher accounts, uploads, SLAs, reports, PDF/CSV export) needs a real backend. So the update has a **foundation phase** before the feature modules.

### Proposed stack (keeps existing Next.js 16 + shadcn UI)

| Concern | Choice | Why |
|---|---|---|
| Database | PostgreSQL (Neon / Supabase) + Drizzle ORM (already installed) | Works on Vercel; relational data for cases/SLA/reports |
| Auth | Auth.js (or Better Auth) — email + password, sessions in DB | Self-registration for researchers, staff accounts by Super Admin |
| Authorization | Permission-based RBAC checked **on the server** (route handlers / server actions + middleware) | Real security boundary |
| File storage | Vercel Blob or S3-compatible (Cloudflare R2) — private buckets, signed URLs | PDFs, Word, video, payment receipts |
| Video | Upload to storage, stream via signed URL; size limit (e.g. 500 MB) | Library video files |
| PDF export | `@react-pdf/renderer` (server) ; CSV via streamed text | Role-based report export |
| Scheduling | Vercel Cron | SLA overdue checks, report-due reminders |
| Notifications | In-app + email (SMTP/Resend); SMS optional later | Approvals, feedback, SLA alerts |
| Audit | `audit_log` table written on every state change | Accountability for government use |

> Decision needed: keep Vercel (above) **or** move to Cloudflare (D1 + R2, matches `db/index.ts`). Plan assumes Vercel.

---

## 1. Roles & permissions (covers request #5)

| Role | Scope |
|---|---|
| **Super Admin** (one seeded account) | Everything: users, roles, permissions, settings, all modules, all reports, audit log |
| **Library Admin** | Library categories/folders, upload & publish documents, approve researcher payments/accounts, approve researcher contributions |
| **Researcher** | Self-register, upload Telebirr receipt, access library after approval, submit contributions, see own submissions |
| **Director** | View all prosecutor cases, comment on cases, define SLA per case category, review & give feedback on prosecutor reports |
| **Prosecutor** | Register own cases, update status (blocked when SLA overdue), submit daily/weekly/monthly reports, read director comments/feedback |
| **Content Editor** (existing) | News, notices, gallery, public pages |
| **Complaint Officer** (existing) | Public complaints workflow |
| **Public user** | Browse public site + public library items |

Permissions are stored as rows (`role_permissions`) so the Super Admin can create new roles and toggle permissions from the UI without code changes.

### Super Admin pages
- `/dashboard/admin/users` — list, search, create, edit, deactivate, reset password, assign role(s), assign office/woreda.
- `/dashboard/admin/roles` — create role, permission matrix (checkbox grid: module × action [view/create/update/approve/delete/export]).
- `/dashboard/admin/audit` — filterable audit log.
- `/dashboard/admin/settings` — library fee (default **200 ETB**), Telebirr merchant/short code shown to researchers, SLA defaults, site settings.

### Role-based reports + export (PDF & CSV)
`/dashboard/reports` shows only the reports the user's role permits; each has date-range/office/category filters and **Export PDF** / **Export CSV** buttons (server-generated, permission-checked, logged in audit).

| Role | Reports |
|---|---|
| Super Admin | All below + users by role/status, login activity, audit summary |
| Library Admin | Uploads by category, downloads/views, pending approvals, researcher payments (approved/rejected/revenue) |
| Director | Cases by status/category/prosecutor, SLA compliance & overdue list, report submission compliance (on-time/late/missing) |
| Prosecutor | My cases, my SLA status, my submitted reports + feedback |
| Researcher | My contributions & status, my access validity/payment history |
| Complaint Officer | Complaints by status/woreda/category, resolution time |

---

## 2. Digital Library (request #1)

### Data model
- `library_categories` (id, name_en, name_am, parent_id → nested folders, sort)
- `library_documents` (id, title, description, category_id, file_key, file_type [pdf|docx|video], size, visibility [public|researchers], status [draft|pending|published|rejected], uploaded_by, source [admin|researcher], reviewed_by, review_note, published_at, views, downloads)
- `researcher_profiles` (user_id, institution, phone, purpose)
- `library_payments` (id, user_id, amount=200, telebirr_txn_id, receipt_file_key, status [pending|approved|rejected], reviewed_by, note, access_expires_at)

### Library Admin flow
1. Manage categories/folders (create, rename, reorder, nest).
2. Upload PDF / Word / video into a category → choose visibility (public or researchers-only) → publish.
3. **Approvals queue** with two tabs: *Researcher payments* and *Contributions*. Approve / reject with a note (researcher is notified).

### Researcher flow
1. Register (`/library/register`): name, email, phone, institution, purpose, password.
2. Payment page shows: "Pay **200 ETB** via Telebirr to <merchant code>", then enter Telebirr transaction ID + upload receipt (image/PDF).
3. Status page: *Pending review* → *Approved* (full library access) / *Rejected* (reason, re-upload).
4. After approval: browse/search all library items by category folder, view PDF inline, download Word, stream video.
5. **Contribute**: upload research/document → goes to admin queue as `pending` → on approval it is **published for all users**, credited to the researcher.

### Public library page (`/library`)
Folder/category tree on the left, file grid/list on the right with type icon, search and filters (type, year, category). Public items open for everyone; researcher-only items show a lock with "Register as researcher".

### Security
Files are in a private bucket; the server checks permission and returns a short-lived signed URL. Upload validation: MIME + extension whitelist, size limits, virus scan hook (optional).

> Question for client: is the 200 ETB a one-time fee or annual? (Plan supports `access_expires_at`.) Manual receipt verification now; direct Telebirr API (H5/C2B) can be phase 2 if the bureau gets merchant API credentials.

---

## 3. Prosecutor Portal (request #2)

### Data model
- `case_categories` (id, name, **sla_days**, set_by director, updated_at)
- `cases` (id, case_no, title, category_id, prosecutor_id, office/woreda, parties summary, opened_at, **due_at** = opened_at + sla_days, status, closed_at)
- `case_statuses` (configurable: Registered, Under investigation, Charged, In court, Adjourned, Decided, Closed …)
- `case_status_history` (case_id, from, to, note, changed_by, changed_at)
- `case_comments` (case_id, author_id [director], body, created_at)
- `prosecutor_reports` (id, prosecutor_id, period_type [daily|weekly|monthly], period_start, period_end, body / structured fields, attachment, submitted_at, status [submitted|reviewed])
- `report_feedback` (report_id, director_id, body, created_at)

### Prosecutor
- `/dashboard/prosecutor/cases` — create case, list own cases with SLA badge (On track / Due soon / **Overdue**), update status with note.
- **SLA lock**: when `now > due_at` and the case is not closed, the status form is disabled and the server rejects the update ("SLA overdue — contact Director"). Enforced server-side, not just in UI.
- `/dashboard/prosecutor/reports` — submit daily / weekly / monthly reports (template form + optional attachment); see director feedback.

### Director
- `/dashboard/director/cases` — all cases, filters (prosecutor, category, status, overdue), case detail with status timeline and **comments**.
- `/dashboard/director/sla` — set SLA days per case category.
- **Unlock / extend** (recommended): Director can extend `due_at` for an overdue case with a reason, which re-enables the prosecutor's status updates. *(Needs client confirmation — otherwise an overdue case is permanently locked.)*
- `/dashboard/director/reports` — inbox of prosecutor reports (filter by period type, prosecutor, missing/late), open report → add feedback.

### Automation
Daily cron: flag overdue cases, notify prosecutor + director; remind prosecutors of missing daily/weekly/monthly reports.

> Question for client: does SLA apply to the whole case, or to each status stage (e.g. "investigation must finish in 30 days")? Plan assumes whole case; stage-level SLA is a small extension.

---

## 4. Public site menu aligned with justice.gov.et (request #3)

Note: justice.gov.et could not be fetched from the build environment, so the structure below follows the Ministry of Justice site as commonly organised and **must be verified against the live site** before implementation.

| Top menu | Sub-items | Current status |
|---|---|---|
| Home | | exists |
| About Us | Background/History, Mission · Vision · Values, Powers & Duties, Organizational Structure, Leadership / Management | partial (`/about`, `/structure`, `/leadership`) |
| Services | Legal advice & legal aid, Complaint handling, Registration/licensing of advocates, Prosecution services, Customary justice, Citizens' charter | partial |
| Laws & Legal Documents | Proclamations, Regulations, Directives, Policies & Strategies | partial (`/laws`) |
| **Digital Library** (new) | Browse by category, Researcher registration, Contribute | new |
| Media | News, Announcements/Notices, Photo gallery, Videos, Press releases | partial (no videos) |
| Publications | Reports, Magazines/Newsletters, Research | new |
| Vacancies & Tenders | | new |
| E-Services | Submit complaint, Track complaint, Staff/Researcher login | partial |
| FAQ | | exists |
| Contact Us | Offices directory, map, feedback form | exists |

Plus homepage extras typical of that site: leadership message, key statistics counters, quick links (related institutions), latest news/notices, social links, language switch (EN/Amharic).

---

## 5. Personal dashboards for all users (request #4)

Single `/dashboard` route that renders widgets by role after login (sidebar menu also filtered by permissions). Every dashboard has: profile, change password, notifications.

| Role | Dashboard widgets |
|---|---|
| Super Admin | Users by role, pending approvals across modules, overdue cases, recent audit events, system KPIs |
| Library Admin | Pending payments, pending contributions, uploads this month, top documents |
| Researcher | Access status & expiry, my contributions (pending/published), recently added documents |
| Director | Cases by status (chart), overdue/at-risk cases, unreviewed reports, SLA compliance % |
| Prosecutor | My open cases, due soon/overdue, reports due today/this week/this month, latest feedback/comments |
| Content Editor / Complaint Officer | Existing widgets moved here |

Charts via `recharts` (already installed).

---

## 6. Delivery phases

| Phase | Scope | Est. |
|---|---|---|
| **1. Foundation** | DB + Drizzle schema & migrations, Auth (login/register/reset), RBAC + middleware, Super Admin seed, users & roles pages, audit log, file storage, dashboard shell | 1.5–2 wks |
| **2. Digital Library** | Categories/folders, uploads (PDF/Word/video), public library page, researcher registration + Telebirr receipt, approvals, contributions | 1.5–2 wks |
| **3. Prosecutor Portal** | Cases, statuses, SLA per category + lock, director comments, daily/weekly/monthly reports + feedback, cron reminders | 1.5–2 wks |
| **4. Public menu restructure** | New IA per §4, new pages (Publications, Vacancies, Videos, etc.), migrate existing content | 1 wk |
| **5. Dashboards & reports** | Role dashboards, role-based reports, PDF/CSV export | 1 wk |
| **6. Hardening** | Amharic translations of new screens, security review, backups, UAT with client, deployment | 1 wk |

Each phase ends with a demo to the client.

## 7. Open questions for the client

1. Hosting: stay on Vercel or move to Cloudflare / a government server (on-prem data residency requirement?).
2. Researcher fee: one-time or annual? Any receipt verification rules (e.g. Telebirr transaction ID format)?
3. Overdue SLA: should the Director be able to extend/unlock a case? Whole-case SLA or per-stage?
4. Report format for prosecutors: free text, or a fixed template (counts of new/closed cases, etc.)?
5. Can a user hold multiple roles (e.g. Director who is also Library Admin)?
6. Max video size, and should videos be downloadable or stream-only?
7. Confirm the exact menu from justice.gov.et (or share a screenshot) and which items South Omo actually needs.
8. Official content (laws, office contacts, leadership) — who supplies and verifies it?
