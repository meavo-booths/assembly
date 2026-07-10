# Agent guide — meavo-assembly

Quick orientation for AI agents working in this repo. Read this before exploring blindly.

**Cursor:** `.cursor/rules/core.mdc` is always applied. See also `domain.mdc` and `api.mdc` when editing matching paths.

## What this repo does

Install questionnaire tool for MEAVO assembly partners, live at [assembly.meavo.app](https://assembly.meavo.app). CS schedules deliveries in a Google Sheet; this app mirrors those rows as assemblies (two-way sync), links them to Sales deals, and lets external install partners log in with an access code to complete install checklists, upload photos, and browse booth-model resources.

## Stack

- Next.js 15 App Router, TypeScript strict, React 19 (`@/*` → `./src/*`)
- Tailwind CSS 3 with in-house UI kit (`src/components/ui.tsx`) — no external component library
- Prisma 6 via `@meavo/db` (shared Neon Postgres, schema owned by the meavo-db repo)
- NextAuth v5 JWT sessions (Google SSO, invite-only) for MEAVO staff; HMAC-signed cookie sessions for partners
- `@meavo/navigation` top nav + tool switcher
- Google Sheets API (`googleapis`) for delivery-tracker sync; Vercel Blob for photos/files
- Vercel AI Gateway + `ai` SDK (Gemini) for questionnaire translations
- Hosted on Vercel; dev server runs on port **3001**

## First files to read

| Task | Start here |
|------|------------|
| Assembly list / detail / create (staff) | `src/app/(meavo)/assemblies/[dealId]/page.tsx`, `src/app/actions/assemblies.ts` |
| Partner portal (list, questionnaire wizard) | `src/app/[slug]/page.tsx`, `src/app/[slug]/[dealId]/page.tsx`, `src/app/actions/partner.ts` |
| Google Sheet import / export | `src/lib/sheets-import.ts`, `src/lib/sheets-export.ts`, `src/lib/sheets-columns.ts` |
| Cron sheet import | `src/app/api/cron/import/route.ts`, `vercel.json` |
| Questionnaire editor & translations | `src/app/(meavo)/(library)/questionnaire/`, `src/lib/questionnaire-db.ts`, `src/app/actions/questionnaire-translations.ts` |
| AI translation pipeline | `src/lib/questionnaire-translate-ai.ts`, `src/lib/questionnaire-i18n.ts` |
| Partner resource library | `src/app/actions/resources.ts`, `src/lib/resource-access.ts`, `src/app/(meavo)/(library)/resources/` |
| Deal linking (reads Sales tables) | `src/app/actions/deals.ts`, `src/lib/deal-summary.ts`, `src/app/(meavo)/deals/` |
| Calendar view | `src/app/(meavo)/calendar/page.tsx`, `src/lib/assembly-schedule.ts`, `src/lib/calendar-dates.ts` |
| Photo / file downloads | `src/app/api/photos/[id]/route.ts`, `src/app/api/resource-files/[fileId]/route.ts` |
| Auth & access | `src/lib/meavo-auth.ts` (staff), `src/lib/partner-session.ts` (partners), `src/middleware.ts`, `src/lib/auth.ts` |
| DB schema | `node_modules/@meavo/db/prisma/schema.prisma` (owned by meavo-db repo — read-only here) |
| Tests | N/A — no test suite; verify manually (see CONTRIBUTING.md) |

## Do NOT

- Edit the Prisma schema in this repo — schema lives in [meavo-db](https://github.com/meavo-booths/meavo-db); bump the `@meavo/db` git ref instead
- Run `prisma db push` — the script is intentionally disabled (shared DB; a stale schema can drop other apps' tables)
- Write to Sales-owned tables (`Deal`, `QuoteLineItem`, …) — this app only reads them for deal linking
- Send email directly — enqueue to `NotificationOutbox` via `src/lib/notifications/enqueue.ts`; only gateway sends
- Import `@/lib/auth` (Prisma-backed) in `src/middleware.ts` — edge runtime; use `@/lib/auth.config` only
- Skip `requireMeavoAccess()` in staff Server Actions or `requirePartnerSession(slug)` in partner ones — middleware does not protect actions or `/api/*`
- Add shadcn, Radix, MUI, or any external component library
- Add a partner-facing route segment without checking `MEVAO_RESERVED_SEGMENTS` in `src/lib/constants.ts` — `/{slug}` is a catch-all
- Commit secrets, `.env`, or `.env.local`

## Commands

```bash
npm install          # runs prisma generate via postinstall
npm run dev          # next dev on http://localhost:3001
npm run lint
npm run build
npm run db:execute -- --file prisma/sql/<file>.sql   # targeted SQL against shared DB
npm run db:seed
```

## Conventions

1. Mutations are Server Actions in `src/app/actions/*.ts` returning `{ error?: string }` for user-facing failures; `revalidatePath()` after writes.
2. Domain logic lives in flat feature-prefixed modules in `src/lib/` (e.g. `assembly-*`, `questionnaire-*`, `sheets-*`) — keep actions and pages thin.
3. Assembly mutations that touch sheet-mirrored fields must write back to the sheet (`appendAssemblyRow` / `updateAssemblyRow` / `clearAssemblyRow`) and record `sheetRowNumber` / `sheetSyncError`.
4. Side effects (notifications) are fire-and-forget with `.catch(console.error)` — never block the mutation.
5. `export const dynamic = "force-dynamic"` on authenticated layouts and DB-touching pages.

## Scoped task template (preferred from user)

```
Area/route: <!-- e.g. /assemblies/DEAL123 or /{slug} partner wizard -->
Behaviour: [what should happen]
Reference: [sheet column, deal field, or doc, if any]
Out of scope: [auth / sheet sync / other apps / etc.]
```

## Related docs

- [docs/architecture.md](docs/architecture.md) — stack, layout, data flow
- [docs/domain.md](docs/domain.md) — business rules, personas, mutation map
- [docs/data-model.md](docs/data-model.md) — database tables
- [CONTRIBUTING.md](CONTRIBUTING.md) — PR process
