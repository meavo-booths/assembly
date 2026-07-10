# Architecture — meavo-assembly

Install questionnaire tool for MEAVO assembly partners at **assembly.meavo.app**. Mirrors the CS delivery-tracker Google Sheet as assemblies, links them to Sales deals, and collects install checklists + photos from external partners.

**Further reading:**
- [domain.md](domain.md) — business rules, personas, mutation map
- [data-model.md](data-model.md) — database tables
- [AGENTS.md](../AGENTS.md) — quick orientation for AI agents

## Sibling repos (meavo-booths)

| Repo | Relationship |
|------|----------------|
| [meavo-db](https://github.com/meavo-booths/meavo-db) | Owns the shared Prisma schema; this repo pins `@meavo/db` to a git tag |
| [meavo-gateway](https://github.com/meavo-booths/meavo-gateway) | Owns `User`, `ToolCard`, `ToolCardAccess`, `LoginThrottle`, `NotificationOutbox`; grants staff access via the Assembly tool card; sends the emails this app enqueues |
| [meavo-navigation](https://github.com/meavo-booths/meavo-navigation) | Shared top nav + tool switcher used on staff pages |
| sales | Owns `Deal` / `QuoteLineItem` tables that this app **reads** to link assemblies to deals (never writes) |

## Stack decisions

- **Next.js 15 App Router + React 19 + TypeScript strict** — org standard for satellite apps.
- **Prisma 6 via `@meavo/db`** — single shared Neon Postgres; `prisma.config.ts` points at `node_modules/@meavo/db/prisma/schema.prisma`; `db:push` is disabled.
- **NextAuth v5 (JWT)** for staff — Google SSO only, invite-only (user must exist and hold tool-card access).
- **Custom HMAC cookie sessions** for partners — partners are not gateway users; they log in with a per-partner access code.
- **Google Sheets remains the CS source of truth** — the app does two-way sync instead of replacing the sheet.
- **Vercel** hosting; **Vercel Blob** (private) for photos and resource files; **Vercel AI Gateway + Gemini** for questionnaire translations.

## Repository layout

```
src/
  middleware.ts            # NextAuth edge gate for staff routes only
  app/
    (meavo)/               # staff routes, force-dynamic, Nav shell
      page.tsx             # assembly list (home)
      assemblies/[dealId]/ # assembly detail
      calendar/            # week calendar, London time slots
      deals/               # ready deals + deal detail (Sales read-only)
      (library)/           # partners, questionnaire editor + translations, resources admin
      questionnaire/preview/, resources/preview/
    [slug]/                # partner portal: assembly list, [dealId] wizard, resources
    login/                 # staff Google SSO login
    actions/               # Server Actions (assemblies, partner, deals, meavo, resources, questionnaire-translations, auth)
    api/
      auth/[...nextauth]/  # NextAuth handlers
      cron/import/         # sheet import cron (CRON_SECRET)
      photos/[id]/, resource-files/[fileId]/, resources/[id]/  # authenticated Blob streaming
  components/              # ui.tsx kit + feature components (wizard, calendar, modals)
  lib/                     # domain modules: assembly-*, questionnaire-*, sheets-*, calendar-*, resource-*, auth, prisma
  types/next-auth.d.ts
prisma/                    # seed.ts, sql/ (idempotent fixes via db:execute), backfill scripts
```

## Data flow

```
CS edits Google Sheet (Deliveries tab)
        │  cron GET /api/cron/import (*/30) or staff "Refresh from sheet"
        ▼
sheets-import.ts ──upsert──▶ Assembly + AssemblyPartner (shared Neon Postgres)
                                    │ linkedDealId ──▶ Deal (Sales-owned, read-only)
staff action (requireMeavoAccess) ──▶ Assembly create/update/delete
        │                                   │
        └──▶ sheets-export.ts writes the row back to the sheet (sheetRowNumber / sheetSyncError)
partner action (requirePartnerSession) ──▶ QuestionnaireSubmission / QuestionAnswer
        │                                   └──▶ SubmissionPhoto → Vercel Blob (private)
        └──▶ enqueueNotification("assembly.questionnaire.submitted") → NotificationOutbox → gateway emails
admin translation action ──▶ Vercel AI Gateway (Gemini) ──▶ QuestionTranslation drafts → approve per locale
```

## API surface

- **Server Actions** (`src/app/actions/`) — all mutations; return `{ error?: string }`.
- **REST routes** (`src/app/api/`):
  - `GET /api/cron/import` — sheet import (Bearer `CRON_SECRET`)
  - `GET /api/photos/[id]`, `/api/resource-files/[fileId]`, `/api/resources/[id]` — authenticated Blob streaming (staff or owning partner)
  - `/api/auth/[...nextauth]` — NextAuth
- No webhooks, no GraphQL/tRPC.

## Scheduled jobs

| Path | Schedule | Purpose |
|------|----------|---------|
| `/api/cron/import` | `*/30 * * * *` (`vercel.json`; Hobby plan caps at daily) | Upsert assemblies + partners from the Deliveries sheet tab |

## Environment variables

Document names only (see `.env.example`):

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Shared Neon Postgres (same as gateway) |
| `AUTH_SECRET` / `AUTH_URL` | NextAuth session signing / canonical URL |
| `PARTNER_SESSION_SECRET` | Optional dedicated HMAC secret for partner cookies (falls back to `AUTH_SECRET`) |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | Google SSO for MEAVO staff |
| `ASSEMBLY_TOOL_CARD_ID` | `seed-assembly-tool` — gateway tool card gating access |
| `MEAVO_APP_KEY` / `GATEWAY_URL` | `@meavo/navigation` shell |
| `GOOGLE_SHEETS_SPREADSHEET_ID` / `GOOGLE_SHEETS_TAB_NAME` | Delivery tracker sheet + tab |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Service account for Sheets API |
| `CRON_SECRET` | Protects `/api/cron/import` |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob uploads |
| `QUESTIONNAIRE_TRANSLATION_MODEL` | Optional AI model override (default Gemini via AI Gateway; local dev needs `vercel env pull` for OIDC) |

## Deployment

Vercel project `meavo-assembly`, domain `assembly.meavo.app`. **Deploys automatically on push to `main`** via the Git integration — never run `vercel --prod` manually. Cron configured in `vercel.json`. AI Gateway enabled in project settings for translations.
