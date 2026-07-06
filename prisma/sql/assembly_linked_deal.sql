-- Link assemblies to sales deals: several assemblies (assembly, repair,
-- aftercare, ...) can attach to one deal via the business DealID.
--
-- Targeted migration for the shared Neon database. Apply with:
--   npx prisma db execute --file prisma/sql/assembly_linked_deal.sql --schema node_modules/@meavo/db/prisma/schema.prisma
--
-- Never run a bare `prisma db push` from a repo whose schema is behind the
-- other apps — it may try to drop their tables.

ALTER TABLE "Assembly" ADD COLUMN IF NOT EXISTS "linkedDealId" TEXT;

CREATE INDEX IF NOT EXISTS "Assembly_linkedDealId_idx" ON "Assembly"("linkedDealId");

DO $$ BEGIN
  ALTER TABLE "Assembly"
    ADD CONSTRAINT "Assembly_linkedDealId_fkey"
    FOREIGN KEY ("linkedDealId") REFERENCES "Deal"("dealId") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
