import { timingSafeEqual } from "crypto";
import { revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { ASSEMBLY_REFERENCE_TAG } from "@/lib/assembly-form-suggestions";
import { importAssembliesFromSheet } from "@/lib/sheets-import";

function isAuthorized(authHeader: string | null, secret: string | undefined): boolean {
  if (!secret || !authHeader) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const provided = Buffer.from(authHeader);
  return expected.length === provided.length && timingSafeEqual(expected, provided);
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request.headers.get("authorization"), process.env.CRON_SECRET)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await importAssembliesFromSheet();
    revalidateTag(ASSEMBLY_REFERENCE_TAG);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("Assembly sheet import cron failed:", error);
    return NextResponse.json({ error: "Import failed" }, { status: 500 });
  }
}
