"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { after } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMeavoAccess } from "@/lib/meavo-auth";
import { ASSEMBLY_REFERENCE_TAG } from "@/lib/assembly-form-suggestions";
import { importAssembliesFromSheet } from "@/lib/sheets-import";

/**
 * Kick off a sheet import without blocking the request. The import runs after
 * the response is sent; the client polls getSheetImportStatus until the run
 * recorded in SheetImportState completes.
 */
export async function refreshFromSheet(): Promise<{ startedAt: string }> {
  await requireMeavoAccess();
  const startedAt = new Date().toISOString();
  after(async () => {
    try {
      await importAssembliesFromSheet();
      revalidateTag(ASSEMBLY_REFERENCE_TAG);
      revalidatePath("/");
      revalidatePath("/partners");
    } catch (error) {
      // Failure details are recorded in SheetImportState by the importer.
      console.error("Manual sheet refresh failed:", error);
    }
  });
  return { startedAt };
}

export async function getSheetImportStatus(): Promise<{
  lastRunAt: string | null;
  errorMessage: string | null;
}> {
  await requireMeavoAccess();
  const state = await prisma.sheetImportState.findUnique({ where: { id: "default" } });
  return {
    lastRunAt: state?.lastRunAt?.toISOString() ?? null,
    errorMessage: state?.errorMessage ?? null,
  };
}
