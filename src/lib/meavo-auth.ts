import { redirect } from "next/navigation";
import { ASSEMBLY_TOOL_CARD_ID } from "@/lib/constants";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const TASKS_TOOL_CARD_ID = process.env.TASKS_TOOL_CARD_ID ?? "seed-tasks-tool";

/** Whether the user currently holds the Assembly tool card (checked per request). */
export async function hasAssemblyToolAccess(userId: string): Promise<boolean> {
  const access = await prisma.toolCardAccess.findFirst({
    where: { userId, cardId: ASSEMBLY_TOOL_CARD_ID },
  });
  return Boolean(access);
}

export async function hasTasksAccess(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { systemRole: true },
  });
  if (user?.systemRole === "ADMIN") return true;

  const access = await prisma.toolCardAccess.findFirst({
    where: { userId, cardId: TASKS_TOOL_CARD_ID },
  });
  return Boolean(access);
}

/** Session with verified tool-card access, or null. No redirect side effects. */
export async function getMeavoSession() {
  const session = await auth();
  if (!session?.user?.id) return null;
  if (!(await hasAssemblyToolAccess(session.user.id))) return null;
  return session;
}

export async function requireMeavoAccess() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  if (!(await hasAssemblyToolAccess(session.user.id))) redirect("/login?error=NoAccess");

  return session;
}
