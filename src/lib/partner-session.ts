import { cookies } from "next/headers";
import { createHash, createHmac, timingSafeEqual } from "crypto";
import { prisma } from "@/lib/prisma";

const COOKIE_NAME = "assembly_partner";

function getSecret(): string {
  // Dedicated secret so partner cookies can be rotated independently of
  // NextAuth sessions; falls back to AUTH_SECRET for existing deployments.
  const secret = process.env.PARTNER_SESSION_SECRET || process.env.AUTH_SECRET;
  if (!secret) throw new Error("PARTNER_SESSION_SECRET or AUTH_SECRET must be set");
  return secret;
}

/**
 * Short fingerprint of the partner's access-code hash. Baked into the signed
 * cookie so rotating the code invalidates all existing sessions.
 */
function codeVersion(codeHash: string | null): string {
  if (!codeHash) return "none";
  return createHash("sha256").update(codeHash).digest("hex").slice(0, 12);
}

function sign(payload: string): string {
  return createHmac("sha256", getSecret()).update(payload).digest("hex");
}

export function createPartnerSessionValue(partner: {
  id: string;
  codeHash: string | null;
}): string {
  const payload = `${partner.id}.${codeVersion(partner.codeHash)}`;
  return `${payload}.${sign(payload)}`;
}

function parsePartnerSessionValue(
  value: string,
): { partnerId: string; codeVersion: string } | null {
  const [partnerId, version, signature] = value.split(".");
  if (!partnerId || !version || !signature) return null;
  const expected = sign(`${partnerId}.${version}`);
  try {
    const a = Buffer.from(signature);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }
  return { partnerId, codeVersion: version };
}

export async function setPartnerSession(partner: {
  id: string;
  codeHash: string | null;
}): Promise<void> {
  const jar = await cookies();
  jar.set(COOKIE_NAME, createPartnerSessionValue(partner), {
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
  const parsed = parsePartnerSessionValue(raw);
  if (!parsed) return null;
  const partner = await prisma.assemblyPartner.findFirst({
    where: { id: parsed.partnerId, isActive: true },
  });
  if (!partner) return null;
  // Sessions issued before an access-code rotation are no longer valid.
  if (codeVersion(partner.codeHash) !== parsed.codeVersion) return null;
  return partner;
}

export async function requirePartnerSession(expectedSlug: string) {
  const partner = await getPartnerFromSession();
  if (!partner || partner.slug !== expectedSlug) return null;
  return partner;
}
