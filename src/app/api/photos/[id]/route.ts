import { NextResponse } from "next/server";
import { get } from "@vercel/blob";
import { auth } from "@/lib/auth";
import { ASSEMBLY_TOOL_CARD_ID } from "@/lib/constants";
import { getPartnerFromSession } from "@/lib/partner-session";
import { prisma } from "@/lib/prisma";

async function getAuthorizedPhoto(id: string) {
  const photo = await prisma.submissionPhoto.findUnique({
    where: { id },
    include: {
      submission: { select: { partnerId: true } },
    },
  });
  if (!photo) return null;

  const session = await auth();
  if (session?.user?.id) {
    const access = await prisma.toolCardAccess.findFirst({
      where: { userId: session.user.id, cardId: ASSEMBLY_TOOL_CARD_ID },
    });
    if (access) return photo;
  }

  const partner = await getPartnerFromSession();
  if (partner && partner.id === photo.submission.partnerId) return photo;

  return null;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const photo = await getAuthorizedPhoto(id);
  if (!photo) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const result = await get(photo.storageKey, { access: "private" });
  if (!result || result.statusCode !== 200 || !result.stream) {
    return NextResponse.json({ error: "File unavailable" }, { status: 404 });
  }

  return new NextResponse(result.stream, {
    headers: {
      "Content-Type": result.blob.contentType || "image/jpeg",
      "Content-Disposition": `inline; filename="${photo.fileName.replace(/"/g, "")}"`,
    },
  });
}
