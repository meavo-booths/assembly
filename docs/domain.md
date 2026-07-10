# Domain reference — meavo-assembly

Business rules and **where to change what**. For stack see [architecture.md](architecture.md). For tables see [data-model.md](data-model.md).

## Glossary

| Term | Meaning |
|------|---------|
| Assembly | A scheduled on-site event (install, repair, aftercare, …) mirrored from the CS delivery sheet or created in-app. Identified by `dealId` (unique, renameable for app-created rows, suggested as `{DEALID}-ASS`) |
| Linked deal | The Sales `Deal` (by business DealID) an assembly belongs to via `linkedDealId`; several assemblies can link to one deal |
| Install partner | External company doing the install (`AssemblyPartner`). Has a URL slug (`assembly.meavo.app/{slug}`) and an access code. `isInternal` partners (`client`, `direct`, `meavo`, LAT team) have no portal |
| Submission | One partner's questionnaire run for one assembly (`QuestionnaireSubmission`, unique per assembly + partner) |
| Questionnaire | The single global checklist (sections → questions, incl. follow-ups and ends-on-No questions); only the published one is served to partners |
| Translation | Per-locale (EN/DE/FR/ES/IT/CS/NL) AI-drafted text for sections/questions; must be approved before use; goes `STALE` when the source text changes |
| Resource | Booth-model-tagged help material (PDF / YouTube / link / image) in the partner resource library |
| Sheet-mirrored fields | Assembly columns synced both ways with the sheet (closure, survey, fulfilledOn, issue, status, priority, comments); app-only fields never reach the sheet |

## Status / state values

| Enum | Values | Transitions |
|------|--------|-------------|
| `SubmissionStatus` | `NOT_STARTED → IN_PROGRESS → SUBMITTED` | Any answer/photo write sets `IN_PROGRESS`; submit is terminal — answers and photos are locked afterwards; re-submit is idempotent (no re-notify) |
| `TranslationStatus` | `DRAFT → APPROVED → STALE` | AI generates `DRAFT`; admin approves per locale; editing source text marks `STALE` |
| `AssemblySource` | `SHEET_IMPORTED`, `APP_CREATED` | Set at creation, never changes |
| `AssemblyEventType` | `ASSEMBLY`, `REPAIR`, `MOVING_SERVICE`, `AFTERCARE`, `INFO` | App-only field |
| `AssemblyIssue` | `PENDING`, `YES`, `NO` | Sheet-mirrored |

## Roles / personas

| Role | Route or scope | Permissions |
|------|----------------|-------------|
| MEAVO staff (gateway user with Assembly tool card) | `/` and all `(meavo)` routes | Full CRUD on assemblies, partners, questionnaire, translations, resources; view all submissions and photos; trigger sheet refresh |
| Install partner (access code) | `/{slug}` only | See own upcoming assemblies (own `installPartnerId`), fill/submit questionnaire, upload photos, browse resources; scoped to own slug by `requirePartnerSession(slug)` |
| Vercel cron | `GET /api/cron/import` | Sheet import only, Bearer `CRON_SECRET` |

## Mutation map

| Change | Domain module | Action / API | Notes |
|--------|---------------|--------------|-------|
| Create / edit / delete assembly | `src/lib/sheets-export.ts`, `assembly-form-values.ts` | `src/app/actions/assemblies.ts` | Writes back to sheet; records `sheetRowNumber` / `sheetSyncError` |
| Refresh from sheet | `src/lib/sheets-import.ts` | `src/app/actions/meavo.ts` + `/api/cron/import` | Upserts assemblies + partners keyed by `dealId`; updates `SheetImportState` |
| Link assembly ↔ deal | `src/lib/deal-summary.ts` | `src/app/actions/deals.ts` | Reads Sales `Deal` only; writes `Assembly.linkedDealId` |
| Manage partners (codes, active) | `src/lib/password.ts`, `slug.ts` | `src/app/actions/meavo.ts` | Access code stored as bcrypt `codeHash` |
| Partner login / logout | `src/lib/partner-session.ts`, `login-throttle.ts` | `src/app/actions/partner.ts` | Throttled 10 failures / 15 min per slug |
| Answer question / upload photos / submit | `src/lib/upload-limits.ts`, `notifications/enqueue.ts` | `src/app/actions/partner.ts` | Locked after `SUBMITTED`; submit enqueues `assembly.questionnaire.submitted` |
| Edit questionnaire structure | `src/lib/questionnaire-db.ts` | `src/app/actions/meavo.ts` | Editing text marks translations `STALE` |
| Generate / approve translations | `src/lib/questionnaire-translate-ai.ts`, `questionnaire-i18n.ts` | `src/app/actions/questionnaire-translations.ts` | Gemini via Vercel AI Gateway; approve per locale |
| Manage resource library | `src/lib/resources.ts`, `resource-access.ts` | `src/app/actions/resources.ts` | Files to private Blob; tagged by `BoothModel` |

## Authorization

- Resolved in: `src/lib/meavo-auth.ts` (`requireMeavoAccess` — session + `ToolCardAccess` for `ASSEMBLY_TOOL_CARD_ID`), `src/lib/partner-session.ts` (`requirePartnerSession(slug)`), `src/lib/resource-access.ts` (either audience), `src/middleware.ts` (staff pages only).
- Key rules agents get wrong:
  - `/{slug}` is a catch-all — staff route segments must be listed in `MEVAO_RESERVED_SEGMENTS` (`src/lib/constants.ts`) or they'll be shadowed by the partner portal.
  - Partner queries must always filter by `installPartnerId: partner.id` (or `partnerId` on submissions) — the slug alone is not authorization.
  - Middleware never protects `/api/*` or Server Actions; each one re-checks auth.
  - Internal partners (`isInternal: true`) never get a portal; `partnerRecord` lookups for `/{slug}` exclude them.
