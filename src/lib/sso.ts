import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";

export const SSO_TARGETS = {
  modelo: "https://modelo-jmr.vercel.app",
  presupuesto: "https://presupuesto-app-web.vercel.app",
} as const;

export type SsoApp = keyof typeof SSO_TARGETS;

export function safeReturnPath(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\") || /[\r\n]/.test(value) || value.length > 1024) return "/";
  return value;
}

function ticketKey(code: string): string {
  return "sso:" + createHash("sha256").update(code).digest("hex");
}

export async function issueTicket(app: SsoApp, path: string): Promise<string> {
  if (!process.env.APP_PASSWORD) throw new Error("Access is not configured");
  const code = Buffer.from(JSON.stringify({ app, path, nonce: randomBytes(32).toString("hex") })).toString("base64url");
  await prisma.loginAttempt.create({
    data: { ip: ticketKey(code), failedCount: 0, lockedUntil: new Date(Date.now() + 45_000) },
  });
  return code;
}

export async function consumeTicket(code: unknown): Promise<{ app: SsoApp; path: string } | null> {
  if (typeof code !== "string" || code.length > 1800 || code.length < 40 || !/^[A-Za-z0-9_-]+$/.test(code)) return null;
  const result = await prisma.loginAttempt.deleteMany({
    where: { ip: ticketKey(code), failedCount: 0, lockedUntil: { gt: new Date() } },
  });
  if (result.count !== 1) return null;
  try {
    const data = JSON.parse(Buffer.from(code, "base64url").toString("utf8"));
    if (!(data.app in SSO_TARGETS) || typeof data.path !== "string" || safeReturnPath(data.path) !== data.path || !/^[a-f0-9]{64}$/.test(data.nonce)) return null;
    return { app: data.app as SsoApp, path: data.path };
  } catch {
    return null;
  }
}
