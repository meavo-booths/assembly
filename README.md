# MEAVO Assembly

Install questionnaire tool for assembly partners. CS schedules deliveries in Google Sheets; this app mirrors assemblies and collects install checklists + photos.

## Local setup

```bash
cp .env.example .env
# Same DATABASE_URL as meavo-gateway

npm install
npm run db:push
npm run db:seed
npm run dev
```

Open [http://localhost:3001](http://localhost:3001).

## Environment variables

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Shared Neon Postgres (same as gateway) |
| `AUTH_SECRET` | Session signing |
| `AUTH_URL` | `http://localhost:3001` / `https://assembly.meavo.app` |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | Google SSO for MEAVO team |
| `ASSEMBLY_TOOL_CARD_ID` | `seed-assembly-tool` (gateway tool card) |
| `GOOGLE_SHEETS_SPREADSHEET_ID` | Delivery tracker sheet |
| `GOOGLE_SHEETS_TAB_NAME` | `Deliveries` |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Service account JSON (Viewer on sheet) |
| `CRON_SECRET` | Protects `/api/cron/import` (set in Vercel; auto-sent by Cron Jobs) |
| `BLOB_READ_WRITE_TOKEN` | Photo uploads |
| AI Gateway (Vercel) | Questionnaire translations via Gemini — enable in project settings; `vercel env pull` for local OIDC |

## Questionnaire translations

Translations use **Vercel AI Gateway** with **Gemini 3.5 Flash** (`google/gemini-3.5-flash` by default). MEAVO admins generate drafts on `/questionnaire`, review, and approve per language.

1. Enable [AI Gateway](https://vercel.com/docs/ai-gateway) on the assembly Vercel project
2. For local dev: `vercel link` then `vercel env pull .env.local` (provisions `VERCEL_OIDC_TOKEN`)
3. Optional: `QUESTIONNAIRE_TRANSLATION_MODEL` to override the model slug

## Sheet sync cron

`vercel.json` schedules `GET /api/cron/import` **every 30 minutes** (`*/30 * * * *`).

On each run Vercel:

1. Calls `/api/cron/import` on the production deployment
2. Sends `Authorization: Bearer <CRON_SECRET>` (from your env vars)
3. The route runs the same import as **Refresh from sheet** — upserts assemblies and partners from the Deliveries tab

**Plan limits (Vercel):**

| Plan | How often cron actually runs |
|------|------------------------------|
| **Pro** | Every 30 minutes (per schedule) |
| **Hobby** | Once per day (Vercel caps Hobby cron invocations) |

To change frequency, edit the `schedule` in `vercel.json` (cron syntax). Examples:

- `0 * * * *` — hourly, on the hour
- `*/15 * * * *` — every 15 minutes (Pro)
- `0 6,12,18 * * *` — three times daily

Manual test (replace secret):

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://assembly.meavo.app/api/cron/import
```

## Deploy

1. New Vercel project from this repo
2. Same `DATABASE_URL` as gateway
3. Domain: `assembly.meavo.app`
4. Run `npm run db:push` once against shared DB (schema includes gateway + assembly tables)
5. Grant users access via gateway Admin → Assembly tool card
