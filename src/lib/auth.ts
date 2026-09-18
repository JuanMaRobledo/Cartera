import { createHash, timingSafeEqual } from "crypto";

export const SESSION_COOKIE = "cartera_session";
export const DEFAULT_APP_USERNAME = "JuanMaRobledo";

export function expectedUsername(): string {
  return process.env.APP_USERNAME?.trim() || DEFAULT_APP_USERNAME;
}

function safeEqualText(value: string, expected: string): boolean {
  const valueHash = createHash("sha256").update(value).digest();
  const expectedHash = createHash("sha256").update(expected).digest();
  return timingSafeEqual(valueHash, expectedHash);
}

export function areValidCredentials(username: string, password: string): boolean {
  const appPassword = process.env.APP_PASSWORD;
  if (!appPassword) return false;

  return safeEqualText(username, expectedUsername()) && safeEqualText(password, appPassword);
}

/**
 * Token de sesión derivado del usuario y APP_PASSWORD (ninguna credencial se
 * guarda en texto plano en la cookie). Sin APP_PASSWORD configurada la app
 * queda abierta para facilitar el desarrollo local; en producción esa variable
 * debe existir. APP_USERNAME puede personalizar el usuario y, si se omite,
 * conserva el usuario inicial JuanMaRobledo.
 */
export function expectedSessionToken(): string | null {
  const password = process.env.APP_PASSWORD;
  if (!password) return null;
  return createHash("sha256")
    .update(`${expectedUsername()}\0${password}`)
    .digest("hex");
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
