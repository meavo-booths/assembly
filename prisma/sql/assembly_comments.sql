-- Map sheet column N (issue description and comments) to Assembly.comments.
-- Applied manually (not via `prisma db push`) because this Neon database is
-- shared with other apps whose tables are not part of this Prisma schema.

ALTER TABLE "Assembly"
  ADD COLUMN IF NOT EXISTS "comments" TEXT;
