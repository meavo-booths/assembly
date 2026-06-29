import { auth } from "@/lib/auth";
import { ASSEMBLY_TOOL_CARD_ID } from "@/lib/constants";
import { getPartnerFromSession } from "@/lib/partner-session";
import { prisma } from "@/lib/prisma";

export async function canAccessResources(): Promise<boolean> {
  const session = await auth();
  if (session?.user?.id) {
    const access = await prisma.toolCardAccess.findFirst({
      where: { userId: session.user.id, cardId: ASSEMBLY_TOOL_CARD_ID },
    });
    if (access) return true;
  }

  const partner = await getPartnerFromSession();
  return Boolean(partner?.isActive);
}
