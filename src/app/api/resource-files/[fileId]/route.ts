import { NextResponse } from "next/server";
import { get } from "@vercel/blob";
import { canAccessResources } from "@/lib/resource-access";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ fileId: string }> },
) {
  const { fileId } = await params;

  if (!(await canAccessResources())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const file = await prisma.resourceFile.findUnique({
    where: { id: fileId },
    include: { resource: true },
  });
  if (!file) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const result = await get(file.storageKey, { access: "private" });
  if (!result || result.statusCode !== 200 || !result.stream) {
    return NextResponse.json({ error: "File unavailable" }, { status: 404 });
  }

  return new NextResponse(result.stream, {
    headers: {
      "Content-Type": file.mimeType || "application/octet-stream",
      "Content-Disposition": `inline; filename="${file.fileName.replace(/"/g, "")}"`,
    },
  });
}
