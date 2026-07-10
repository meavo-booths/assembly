# Data model — meavo-assembly

Canonical schema lives in **[meavo-db](https://github.com/meavo-booths/meavo-db)** (`prisma/schema.prisma`) — one shared Neon Postgres for all meavo apps, organized by owning app. This app owns the `// ---- Assembly (owner: assembly) ----` section.

Local reference: `node_modules/@meavo/db/prisma/schema.prisma`

**Do not edit schema in this repo** — change it in meavo-db, tag a release, then bump the `@meavo/db` git ref in `package.json` and run `npm install` + `prisma generate`. `db:push` is disabled; targeted data fixes go through idempotent `prisma/sql/*.sql` + `npm run db:execute`.

Pinned version: `@meavo/db` `github:meavo-booths/meavo-db#v0.5.0`

## Entity relationship

```
AssemblyPartner 1──n Assembly n──1 Deal (Sales-owned, via linkedDealId, read-only)
       │                │
       └────────n QuestionnaireSubmission (unique per assembly+partner)
                        │── n QuestionAnswer ──1 Question
                        └── n SubmissionPhoto (Vercel Blob storageKey)

Questionnaire 1──n QuestionnaireSection 1──n Question (self-ref follow-ups)
                     │                        └── n QuestionTranslation (per locale)
                     └── n QuestionnaireSectionTranslation

Resource 1──n ResourceFile (Blob)          SheetImportState (singleton)
         └──n ResourceBoothModel (enum BoothModel)

Shared (gateway-owned, read/write as noted):
User / ToolCardAccess (read — staff gate)   LoginThrottle (write — partner login)
NotificationOutbox / NotificationEventSetting (write — enqueue only)
```

## Core tables / models

### `Assembly`

One scheduled on-site event, mirrored two-way with the CS delivery sheet.

| Field | Notes |
|-------|-------|
| `dealId` | Unique assembly identifier (sheet column B, URL param); renameable for app-created rows |
| `linkedDealId` | Business DealID of the Sales deal; several assemblies per deal |
| `assemblyDate`, `market`, `clientName`, `channelType`, `deliveryPartnerName`, `installPartnerName` | Sheet-sourced |
| `installPartnerId` | FK → `AssemblyPartner`, resolved on import |
| `source` | `SHEET_IMPORTED` vs `APP_CREATED` |
| `eventType`, `internalTeam`, `clientEmail`, `clientPhone`, `assemblyAddress`, `assemblyTime` | App-only — never written to the sheet |
| `sheetRowNumber`, `sheetSyncError` | Write-back bookkeeping |
| `closure`, `survey`, `fulfilledOn`, `issue`, `status`, `priority`, `comments`, `issueCategories` | Sheet-mirrored (columns F/G/H/K/L/M/O) |

### `AssemblyPartner`

Install partner company. `slug` (unique, portal URL), `codeHash` (bcrypt access code), `isActive`, `isInternal` (no portal for internal teams).

### `QuestionnaireSubmission` / `QuestionAnswer` / `SubmissionPhoto`

One submission per assembly + partner (`@@unique([assemblyId, partnerId])`). Answers keyed per question (`checked` / `textAnswer` / `yesNoAnswer` by `QuestionType`). Photos store a private Blob `storageKey`, max 40 per submission.

### `Questionnaire` / `QuestionnaireSection` / `Question`

Single global checklist; only `isPublished` is served. Questions support follow-ups (`parentQuestionId`) and `endsQuestionnaireOnNo`.

### `QuestionnaireSectionTranslation` / `QuestionTranslation`

Per-locale (`EN DE FR ES IT CS NL`) text with `TranslationStatus` (`DRAFT` → `APPROVED`; `STALE` when source changes). Composite PK `(id, locale)`.

### `Resource` / `ResourceFile` / `ResourceBoothModel`

Partner help library: PDF / YouTube / link / image entries, files in private Blob, tagged by `BoothModel` enum.

### `SheetImportState`

Singleton row (`id: "default"`) recording last import run, row count, and error.

## Sync / external copies

- **Google Sheet (Deliveries tab)** is the CS-facing copy of assemblies. Import: cron + manual refresh upsert from the sheet. Export: staff mutations write rows back (`sheets-export.ts`). Column map lives in `src/lib/sheets-columns.ts` only.
- **`NotificationOutbox`** — this app enqueues (`assembly.questionnaire.submitted`); gateway delivers email.
- **Vercel Blob** — binary storage for submission photos and resource files; DB stores `storageKey`.

## Queries agents should reuse

- `prisma` singleton from `src/lib/prisma.ts` — never instantiate a new client.
- Partner-scoped assembly/submission queries: follow the patterns in `src/app/actions/partner.ts` (always filter by `installPartnerId` / `partnerId`).
- Questionnaire tree fetching + published checks: `src/lib/questionnaire-db.ts`.
- Deal summaries (Sales tables, read-only): `src/lib/deal-summary.ts`.
- Raw SQL only via committed idempotent files in `prisma/sql/` executed with `npm run db:execute`.
