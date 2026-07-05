-- Partner contact email for assembly partner records.
-- Applied manually (not via `prisma db push`) because this Neon database is
-- shared with other apps whose tables are not part of this Prisma schema.

ALTER TABLE "AssemblyPartner"
  ADD COLUMN IF NOT EXISTS "email" TEXT;
