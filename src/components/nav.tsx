import { MeavoNavBar } from "@meavo/navigation";
import {
  getAccessibleTools,
  isMeavoAppKey,
  resolveCurrentToolId,
} from "@meavo/navigation/server";
import { signOutAction } from "@/app/actions/auth";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const MEAVO_APP_KEY = isMeavoAppKey(process.env.MEAVO_APP_KEY)
  ? process.env.MEAVO_APP_KEY
  : "assembly";

const GATEWAY_URL = process.env.GATEWAY_URL ?? "https://meavo.app";

const links = [
  { href: "/", label: "Assemblies" },
  { href: "/calendar", label: "Calendar" },
  { href: "/partners", label: "Partners" },
  { href: "/questionnaire", label: "Questionnaire" },
  { href: "/resources", label: "Resource library" },
];

export async function Nav() {
  const session = await auth();
  if (!session?.user) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { systemRole: true },
  });
  const admin = user?.systemRole === "ADMIN";

  const toolOptions = await getAccessibleTools(prisma, {
    userId: session.user.id,
    isAdmin: admin,
    gatewayUrl: GATEWAY_URL,
  });

  return (
    <MeavoNavBar
      links={links}
      logoHref={GATEWAY_URL}
      toolSwitcher={{
        currentId: resolveCurrentToolId(toolOptions, MEAVO_APP_KEY),
        options: toolOptions,
      }}
      userName={session.user.name}
      userEmail={session.user.email}
      userImage={session.user.image}
      signOutAction={signOutAction}
    />
  );
}
