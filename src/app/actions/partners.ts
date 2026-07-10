"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireMeavoAccess } from "@/lib/meavo-auth";
import { hashSecret } from "@/lib/password";
import { slugifyPartnerName } from "@/lib/slug";

const MIN_ACCESS_CODE_LENGTH = 8;
const CODE_LENGTH_ERROR = `Access codes must be at least ${MIN_ACCESS_CODE_LENGTH} characters.`;

export async function setPartnerAccessCode(formData: FormData): Promise<{ error?: string }> {
  await requireMeavoAccess();
  const partnerId = String(formData.get("partnerId") ?? "");
  const code = String(formData.get("code") ?? "").trim();
  if (!partnerId) return { error: "Partner not found." };
  if (code && code.length < MIN_ACCESS_CODE_LENGTH) return { error: CODE_LENGTH_ERROR };

  await prisma.assemblyPartner.update({
    where: { id: partnerId },
    data: {
      ...(code ? { codeHash: await hashSecret(code) } : {}),
      isActive: true,
    },
  });
  revalidatePath("/partners");
  return {};
}

export async function updatePartnerSlug(formData: FormData): Promise<{ error?: string }> {
  await requireMeavoAccess();
  const partnerId = String(formData.get("partnerId") ?? "");
  const slug = slugifyPartnerName(String(formData.get("slug") ?? ""));
  if (!partnerId) return { error: "Partner not found." };
  if (!slug) return { error: "Enter a valid slug (letters, numbers, dashes)." };

  const taken = await prisma.assemblyPartner.findUnique({ where: { slug } });
  if (taken && taken.id !== partnerId) return { error: `The slug "${slug}" is already in use.` };

  await prisma.assemblyPartner.update({
    where: { id: partnerId },
    data: { slug },
  });
  revalidatePath("/partners");
  return {};
}

export async function updatePartnerEmail(formData: FormData): Promise<{ error?: string }> {
  await requireMeavoAccess();
  const partnerId = String(formData.get("partnerId") ?? "");
  const email = String(formData.get("email") ?? "").trim();
  if (!partnerId) return { error: "Partner not found." };

  await prisma.assemblyPartner.update({
    where: { id: partnerId },
    data: { email: email || null },
  });
  revalidatePath("/partners");
  return {};
}

export async function createPartner(formData: FormData): Promise<{ error?: string }> {
  await requireMeavoAccess();
  const name = String(formData.get("name") ?? "").trim();
  const code = String(formData.get("code") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  if (!name) return { error: "Partner name is required." };
  if (code && code.length < MIN_ACCESS_CODE_LENGTH) return { error: CODE_LENGTH_ERROR };

  const slugBase = slugifyPartnerName(name);
  if (!slugBase) return { error: "Partner name must contain letters or numbers." };
  let slug = slugBase;
  let suffix = 2;
  while (await prisma.assemblyPartner.findUnique({ where: { slug } })) {
    slug = `${slugBase}-${suffix}`;
    suffix += 1;
  }

  await prisma.assemblyPartner.create({
    data: {
      name,
      slug,
      email: email || null,
      codeHash: code ? await hashSecret(code) : null,
    },
  });
  revalidatePath("/partners");
  return {};
}
