-- Support up to 5 issue categories (sheet columns O-S) as an array.
-- Applied manually (not via `prisma db push`) because this Neon database is
-- shared with other apps whose tables are not part of this Prisma schema.

ALTER TABLE "Assembly"
  ADD COLUMN IF NOT EXISTS "issueCategories" TEXT[] NOT NULL DEFAULT ARRAY[]::text[];

-- Backfill the array from the legacy single-value column where present.
UPDATE "Assembly"
SET "issueCategories" = ARRAY["issueCategory"]
WHERE "issueCategory" IS NOT NULL
  AND "issueCategory" <> ''
  AND ("issueCategories" IS NULL OR "issueCategories" = ARRAY[]::text[]);

-- The legacy "issueCategory" column is intentionally left in place (orphaned)
-- to avoid data loss; the app no longer reads or writes it.
