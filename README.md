# Southern Ethiopia Regional Justice Portal

A copy of the South Omo Justice Portal for the **Southern Ethiopia Regional State**, with the same look, menu style and features, plus an organisation hierarchy:

```
Region ─ Zone (12) ─ Woreda (80+)
```

Hierarchy source: Wikipedia, "South Ethiopia Regional State" (zones, woredas and town administrations). Verify against the official regional list before real use. The data lives in `lib/ws/org.ts`.

## Who sees and does what

| Role | Scope | Can do |
|---|---|---|
| **Woreda Coordinator** | own woreda | Registers cases and **assigns them to prosecutors of the own woreda** (the only role that can), comments, gives permission on overdue cases, reviews prosecutor reports, sees woreda reports |
| **Prosecutor** | own cases | Works on assigned cases, updates status within SLA, submits daily/weekly/monthly reports |
| **Zone Head** | all woredas of the zone | Views cases, status and reports of the zone, can comment. Zone roll-up reports with a per-woreda breakdown |
| **Region Head** | whole region | Same as Zone Head for every zone, **plus sets the SLA per case type, creates case types and sets KPI targets for all zones and woredas** |
| Auditor | whole region | Read-only |
| Super Admin / Library / Finance / Legal aid / Content / Complaint | region | As before; the Super Admin creates users and picks Region / Zone / Woreda for each |

Every list, dashboard, KPI page and report is cut down to the signed-in user's scope (`scopeData()` in `lib/ws/store.tsx`). The KPI page, dashboards and the report `KPI by zone` / `KPI vs region targets by woreda` compare each zone and woreda with the region's targets.

## Demo accounts (password `Demo@123`, super admin `Admin@123`)

`superadmin@`, `region.head@`, `zone.head@` (South Omo), `zone.head.ari@`, `coordinator.hamer@`, `coordinator.jinka@`, `coordinator.offa@`, `prosecutor@` (Jinka Town), `dawit.alemu@` (Hamer), `library@`, `researcher@example.com` … all `@ser-justice.demo` except the researcher. Seed data covers 5 woredas in 4 zones.

## Run

Requires Node 22.13+. `npm install`, `npm run dev` (port 5173), `npx tsc --noEmit`, `npm run build`.

Tests that need no install: `node --test lib/ws/org.test.ts`.


## Added features

| Feature | Where | Notes |
|---|---|---|
| **SMS & Telegram alerts** | Admin → *SMS & Telegram alerts*; opt in per event in *My profile* (phone, Telegram chat ID) | Hearing reminders (today / N days ahead), SLA due-soon and overdue, new assignments, comments. In-app notification always; SMS/Telegram are **queued in an outbox** with an Amharic label for Amharic users. Nothing is sent in this build: a server worker + SMS gateway + Telegram bot must deliver the outbox. Alerts are idempotent (stable keys). |
| **Evidence register & chain of custody** | Case page → *Evidence & chain of custody*, menu *Evidence register*, report *Evidence register & custody* | Only the assigned prosecutor or the Woreda Coordinator registers items and records hand-overs (collected, transferred, lab, court, returned, destroyed). The log is append-only and flags a broken chain. |
| **Court adjournment tracking** | Hearing form (*The hearing was adjourned*), KPI page, reports *Court adjournments* and *Adjournments by reason and party* | Reason, who asked (court / prosecution / defence), next date (auto-creates the next hearing). Shows whether delays come from courts or the office. |
| **Zone & region analytics** | Menu *Zone & region analytics* (Zone Head, Region Head, coordinators) | Each zone (or woreda) against the region's targets, ranking, missed-SLA heat table by month, adjournment charts, auto-written "what stands out" notes and a **monthly brief PDF/CSV**. |
| Open for later | `lib/ws/integrations.ts` | `CourtSystemAdapter` interface for the national ICMIS/ERMS once an API exists. Not implemented. |

## Demo boundary (unchanged)

Data is stored in the browser and scope is enforced in the client. **Scope must be enforced on the server before real use**: every query filtered by the caller's woreda/zone/region and `createCase` / `reassignCase` / SLA changes re-checked server-side. See `docs/UPDATE_PLAN.md` for the backend plan (Postgres, server RBAC, audit log).
