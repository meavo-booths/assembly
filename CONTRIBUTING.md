# Contributing — meavo-assembly

## Before you open a PR

- [ ] Changes are scoped to the request — no drive-by refactors
- [ ] `npm run lint` passes
- [ ] No test suite — manual check documented in the PR (routes touched, verified at 375px and 1280px for UI changes)
- [ ] Agent docs updated if you added routes, domain modules, crons, or auth rules
- [ ] Assembly mutations touching sheet-mirrored fields write back to the sheet (`appendAssemblyRow` / `updateAssemblyRow` / `clearAssemblyRow`)

## Branch naming

`feature/short-description`, `fix/short-description`, `docs/short-description` (agent branches: `cursor/<task>-<id>`).

## Commit messages

Imperative mood, sentence case, concise — e.g. `Add Delete assembly button with confirmation`.

## Code placement

| Layer | Location |
|-------|----------|
| Staff pages | `src/app/(meavo)/` |
| Partner portal pages | `src/app/[slug]/` |
| Mutations (Server Actions) | `src/app/actions/` |
| REST routes (auth, cron, file streaming only) | `src/app/api/` |
| Business logic / integrations | `src/lib/` (feature-prefixed modules) |
| Shared UI kit + components | `src/components/` |

## Cross-repo dependencies

- `@meavo/db` — pinned to a git tag in `package.json`; bump the ref, `npm install`, `npm run db:generate`.
- `@meavo/navigation` — same pattern (git tag ref).

## Schema changes

Only in [meavo-db](https://github.com/meavo-booths/meavo-db): edit schema there → tag release → bump git ref here → `npm install` + `prisma generate` → redeploy. Never `prisma db push` from this repo (shared DB). Data fixes: idempotent `prisma/sql/*.sql` + `npm run db:execute`.

## Deployment

Push to `main` deploys to production automatically via the Vercel Git integration — do **not** run manual `vercel --prod` deploys.

## PR description

Include:

1. **What** changed (user-visible or API behaviour)
2. **Why** (link issue if any)
3. **How to verify** (commands or manual steps)
4. **Out of scope** (what you intentionally did not change)

## Agent-assisted PRs

If an AI agent wrote the code:

- Verify paths and business rules against `docs/domain.md`
- Reject leftover template placeholder comments in merged files
- Ensure no secrets in diff
