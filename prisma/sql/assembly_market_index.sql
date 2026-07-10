-- Speeds up market-filtered assembly lists and the calendar (market + date).
-- NOTE: mirror this in meavo-db's schema.prisma as
--   @@index([market, assemblyDate])
-- on Assembly so the shared schema stays the source of truth.
CREATE INDEX IF NOT EXISTS "Assembly_market_assemblyDate_idx"
  ON "Assembly" ("market", "assemblyDate");
