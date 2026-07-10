import { prisma } from "@/lib/prisma";
import { isInternalPartnerName, slugifyPartnerName } from "@/lib/slug";

export type EnsurePartnerResult = {
  partner: Awaited<ReturnType<typeof prisma.assemblyPartner.findFirst>>;
  created: boolean;
};

/**
 * Find or create an AssemblyPartner for a free-text name. Returns a null
 * partner for internal/blank names (e.g. "client", "meavo") which are not
 * real partners.
 */
export async function ensurePartner(name: string): Promise<EnsurePartnerResult> {
  const trimmed = name.trim();
  if (!trimmed || isInternalPartnerName(trimmed)) return { partner: null, created: false };

  const slugBase = slugifyPartnerName(trimmed);
  if (!slugBase) return { partner: null, created: false };

  const existing = await prisma.assemblyPartner.findFirst({
    where: {
      OR: [{ name: trimmed }, { slug: slugBase }],
    },
  });
  if (existing) return { partner: existing, created: false };

  let slug = slugBase;
  let suffix = 2;
  while (await prisma.assemblyPartner.findUnique({ where: { slug } })) {
    slug = `${slugBase}-${suffix}`;
    suffix += 1;
  }

  const partner = await prisma.assemblyPartner.create({
    data: {
      name: trimmed,
      slug,
      isInternal: false,
    },
  });
  return { partner, created: true };
}

/** Resolve the install partner id for a free-text name (null when internal/blank). */
export async function resolveInstallPartnerId(name: string): Promise<string | null> {
  const { partner } = await ensurePartner(name);
  return partner?.id ?? null;
}
