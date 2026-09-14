import { createHash, timingSafeEqual } from "crypto";

export const SESSION_COOKIE = "cartera_session";

/**
 * Token de sesión derivado de APP_PASSWORD (no la contraseña en texto plano)
 * para no guardarla en la cookie del navegador. Sin APP_PASSWORD configurada
 * la app queda abierta (comportamiento previo, cómodo para desarrollo local);
 * en producción hay que definir la variable en Vercel para que esto proteja algo.
 */
export function expectedSessionToken(): string | null {
  const password = process.env.APP_PASSWORD;
  if (!password) return null;
  return createHash("sha256").update(password).digest("hex");
}

export function isValidSession(token: string | undefined | null): boolean {
  const expected = expectedSessionToken();
  if (!expected) return true;
  if (!token) return false;
  const a = Buffer.from(token);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
