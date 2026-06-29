import { NextResponse } from "next/server";
import { ResourceType } from "@prisma/client";
import { canAccessResources } from "@/lib/resource-access";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  if (!(await canAccessResources())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const resource = await prisma.resource.findUnique({
    where: { id },
    include: { files: { orderBy: { fileName: "asc" } } },
  });

  if (!resource || resource.type !== ResourceType.PDF || resource.files.length === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.redirect(new URL(`/api/resource-files/${resource.files[0].id}`, _request.url));
}
