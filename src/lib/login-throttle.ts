import { prisma } from "@/lib/prisma";

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 10;

export const THROTTLE_ERROR =
  "Too many failed attempts. Please wait 15 minutes and try again.";

/** Returns true when the key is currently locked out. */
export async function isLoginThrottled(key: string): Promise<boolean> {
  const row = await prisma.loginThrottle.findUnique({ where: { key } });
  if (!row) return false;

  if (Date.now() - row.windowStart.getTime() > WINDOW_MS) return false;
  return row.attempts >= MAX_ATTEMPTS;
}

/** Records a failed attempt, starting a fresh window if the old one expired. */
export async function recordLoginFailure(key: string): Promise<void> {
  const now = new Date();
  const windowCutoff = new Date(now.getTime() - WINDOW_MS);

  // Atomic increment for rows inside the current window; avoids the
  // read-modify-write race that could under-count concurrent failures.
  const updated = await prisma.loginThrottle.updateMany({
    where: { key, windowStart: { gt: windowCutoff } },
    data: { attempts: { increment: 1 } },
  });
  if (updated.count > 0) return;

  await prisma.loginThrottle.upsert({
    where: { key },
    create: { key, attempts: 1, windowStart: now },
    update: { attempts: 1, windowStart: now },
  });
}

/** Clears the throttle after a successful login. */
export async function clearLoginThrottle(key: string): Promise<void> {
  await prisma.loginThrottle.deleteMany({ where: { key } });
}
