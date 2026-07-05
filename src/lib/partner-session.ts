import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "crypto";
import { prisma } from "@/lib/prisma";

const COOKIE_NAME = "assembly_partner";

function getSecret(): string {
  // Dedicated secret so partner cookies can be rotated independently of
  // NextAuth sessions; falls back to AUTH_SECRET for existing deployments.
  const secret = process.env.PARTNER_SESSION_SECRET || process.env.AUTH_SECRET;
  if (!secret) throw new Error("PARTNER_SESSION_SECRET or AUTH_SECRET must be set");
  return secret;
}

function sign(partnerId: string): string {
  return createHmac("sha256", getSecret()).update(partnerId).digest("hex");
}

export function createPartnerSessionValue(partnerId: string): string {
  return `${partnerId}.${sign(partnerId)}`;
}

function parsePartnerSessionValue(value: string): string | null {
  const [partnerId, signature] = value.split(".");
  if (!partnerId || !signature) return null;
  const expected = sign(partnerId);
  try {
    const a = Buffer.from(signature);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }
  return partnerId;
}

export async function setPartnerSession(partnerId: string): Promise<void> {
  const jar = await cookies();
  jar.set(COOKIE_NAME, createPartnerSessionValue(partnerId), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearPartnerSession(): Promise<void> {
  const jar = await cookies();
  jar.delete(COOKIE_NAME);
}

export async function getPartnerFromSession() {
  const jar = await cookies();
  const raw = jar.get(COOKIE_NAME)?.value;
  if (!raw) return null;
  const partnerId = parsePartnerSessionValue(raw);
  if (!partnerId) return null;
  return prisma.assemblyPartner.findFirst({
    where: { id: partnerId, isActive: true },
  });
}

export async function requirePartnerSession(expectedSlug: string) {
  const partner = await getPartnerFromSession();
  if (!partner || partner.slug !== expectedSlug) return null;
  return partner;
}
