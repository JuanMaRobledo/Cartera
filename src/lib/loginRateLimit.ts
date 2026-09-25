import { Prisma } from "@prisma/client";
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
  let record;
  try {
    record = await prisma.loginAttempt.findUnique({ where: { ip } });
  } catch (error) {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2021") {
      throw error;
    }

    // Las instalaciones anteriores no tenían esta tabla. Crear únicamente
    // la tabla que protege el login, sin sincronizar el resto de la cartera.
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "LoginAttempt" (
        "ip" TEXT NOT NULL,
        "failedCount" INTEGER NOT NULL DEFAULT 0,
        "lockedUntil" TIMESTAMP(3),
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "LoginAttempt_pkey" PRIMARY KEY ("ip")
      )
    `;
    record = await prisma.loginAttempt.findUnique({ where: { ip } });
  }
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
