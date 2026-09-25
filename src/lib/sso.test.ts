import { afterEach, describe, expect, it, vi } from "vitest";

const records = vi.hoisted(() => new Map<string, { failedCount: number; lockedUntil: Date }>());
vi.mock("@/lib/prisma", () => ({
  prisma: { loginAttempt: {
    create: async ({ data }: { data: { ip: string; failedCount: number; lockedUntil: Date } }) => {
      records.set(data.ip, data);
    },
    deleteMany: async ({ where }: { where: { ip: string; failedCount: number; lockedUntil: { gt: Date } } }) => {
      const record = records.get(where.ip);
      if (!record || record.failedCount !== where.failedCount || record.lockedUntil <= where.lockedUntil.gt) return { count: 0 };
      records.delete(where.ip);
      return { count: 1 };
    },
  } },
}));

import { consumeTicket, issueTicket, safeReturnPath } from "./sso";

const originalPassword = process.env.APP_PASSWORD;
afterEach(() => {
  records.clear();
  if (originalPassword === undefined) delete process.env.APP_PASSWORD;
  else process.env.APP_PASSWORD = originalPassword;
});

describe("transferencia del ingreso", () => {
  it("solo permite consumir una vez el código dentro de su vigencia", async () => {
    process.env.APP_PASSWORD = "local-test-secret";
    const code = await issueTicket("modelo", "/visor.html?id=1");
    expect(await consumeTicket(code)).toEqual({ app: "modelo", path: "/visor.html?id=1" });
    expect(await consumeTicket(code)).toBeNull();
  });

  it("rechaza códigos vencidos y rutas que salgan del dominio", async () => {
    process.env.APP_PASSWORD = "local-test-secret";
    const code = await issueTicket("presupuesto", "/app.html");
    for (const record of records.values()) record.lockedUntil = new Date(Date.now() - 1);
    expect(await consumeTicket(code)).toBeNull();
    expect(safeReturnPath("//otro-sitio.example/")).toBe("/");
    expect(safeReturnPath("/\\otro-sitio.example/")).toBe("/");
    expect(safeReturnPath("/app.html?x=1")).toBe("/app.html?x=1");
  });
});
