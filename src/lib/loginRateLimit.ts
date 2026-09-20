import { prisma } from "./prisma";

const THRESHOLD = 5; // intentos fallidos libres antes de empezar a bloquear
const BASE_LOCK_SECONDS = 30;
const MAX_LOCK_SECONDS = 60 * 60; // 1 hora

function backoffSeconds(failedCount: number): number {
  const overThreshold = failedCount - THRESHOLD;
  if (overThreshold <= 0) return 0;
  return Math.min(BASE_LOCK_SECONDS * 2 ** (overThreshold - 1), MAX_LOCK_SECONDS);
}

export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || "unknown";
}

/** null si puede intentar; si no, los segundos que faltan para poder reintentar. */
export async function secondsUntilUnlocked(ip: string): Promise<number | null> {
  const record = await prisma.loginAttempt.findUnique({ where: { ip } });
  if (!record?.lockedUntil) return null;
  const remainingMs = record.lockedUntil.getTime() - Date.now();
  return remainingMs > 0 ? Math.ceil(remainingMs / 1000) : null;
}

export async function recordFailedLogin(ip: string): Promise<void> {
  const record = await prisma.loginAttempt.upsert({
    where: { ip },
    create: { ip, failedCount: 1 },
    update: { failedCount: { increment: 1 } },
  });
  const lockSeconds = backoffSeconds(record.failedCount);
  if (lockSeconds > 0) {
    await prisma.loginAttempt.update({
      where: { ip },
      data: { lockedUntil: new Date(Date.now() + lockSeconds * 1000) },
    });
  }
}

export async function clearFailedLogins(ip: string): Promise<void> {
  await prisma.loginAttempt.deleteMany({ where: { ip } });
}
