import { prisma } from "@/lib/prisma";
import { isInternalPartnerName, slugifyPartnerName } from "@/lib/slug";

/**
 * Find or create an AssemblyPartner for a free-text name. Returns null for
 * internal/blank names (e.g. "client", "meavo") which are not real partners.
 */
export async function ensurePartner(name: string) {
  const trimmed = name.trim();
  if (!trimmed || isInternalPartnerName(trimmed)) return null;

  const slugBase = slugifyPartnerName(trimmed);
  if (!slugBase) return null;

  const existing = await prisma.assemblyPartner.findFirst({
    where: {
      OR: [{ name: trimmed }, { slug: slugBase }],
    },
  });
  if (existing) return existing;

  let slug = slugBase;
  let suffix = 2;
  while (await prisma.assemblyPartner.findUnique({ where: { slug } })) {
    slug = `${slugBase}-${suffix}`;
    suffix += 1;
  }

  return prisma.assemblyPartner.create({
    data: {
      name: trimmed,
      slug,
      isInternal: false,
    },
  });
}

/** Resolve the install partner id for a free-text name (null when internal/blank). */
export async function resolveInstallPartnerId(name: string): Promise<string | null> {
  const partner = await ensurePartner(name);
  return partner?.id ?? null;
}
