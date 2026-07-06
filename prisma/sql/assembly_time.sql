-- App-only assembly time (HH:mm, Europe/London). Not synced to Google Sheet column A.
-- Applied manually (not via `prisma db push`) because this Neon database is
-- shared with other apps whose tables are not part of this Prisma schema.

ALTER TABLE "Assembly"
  ADD COLUMN IF NOT EXISTS "assemblyTime" TEXT;
