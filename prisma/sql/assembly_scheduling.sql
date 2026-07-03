-- Additive schema changes for assembly scheduling + calendar.
-- Applied manually (not via `prisma db push`) because this Neon database is
-- shared with other apps whose tables are not part of this Prisma schema.

DO $$ BEGIN
  CREATE TYPE "AssemblySource" AS ENUM ('SHEET_IMPORTED', 'APP_CREATED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "AssemblyEventType" AS ENUM ('ASSEMBLY', 'REPAIR', 'MOVING_SERVICE', 'AFTERCARE', 'INFO');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "AssemblyInternalTeam" AS ENUM ('NO', 'LAT');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "AssemblyIssue" AS ENUM ('PENDING', 'YES', 'NO');
EXCEPTION WHEN duplicate_object THEN null; END $$;

ALTER TABLE "Assembly"
  ADD COLUMN IF NOT EXISTS "source" "AssemblySource" NOT NULL DEFAULT 'SHEET_IMPORTED',
  ADD COLUMN IF NOT EXISTS "eventType" "AssemblyEventType" NOT NULL DEFAULT 'ASSEMBLY',
  ADD COLUMN IF NOT EXISTS "internalTeam" "AssemblyInternalTeam" NOT NULL DEFAULT 'NO',
  ADD COLUMN IF NOT EXISTS "clientEmail" TEXT,
  ADD COLUMN IF NOT EXISTS "clientPhone" TEXT,
  ADD COLUMN IF NOT EXISTS "assemblyAddress" TEXT,
  ADD COLUMN IF NOT EXISTS "sheetRowNumber" INTEGER,
  ADD COLUMN IF NOT EXISTS "sheetSyncError" TEXT,
  ADD COLUMN IF NOT EXISTS "closure" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "survey" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "fulfilledOn" DATE,
  ADD COLUMN IF NOT EXISTS "issue" "AssemblyIssue" NOT NULL DEFAULT 'PENDING',
  ADD COLUMN IF NOT EXISTS "status" TEXT,
  ADD COLUMN IF NOT EXISTS "priority" TEXT,
  ADD COLUMN IF NOT EXISTS "issueCategory" TEXT;
