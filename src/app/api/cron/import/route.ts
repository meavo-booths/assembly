import { NextRequest, NextResponse } from "next/server";
import { importAssembliesFromSheet } from "@/lib/sheets-import";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await importAssembliesFromSheet();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("Assembly sheet import cron failed:", error);
    return NextResponse.json({ error: "Import failed" }, { status: 500 });
  }
}
