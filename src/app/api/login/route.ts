import { NextResponse } from "next/server";
import { areValidCredentials, SESSION_COOKIE, expectedSessionToken } from "@/lib/auth";
import { clearFailedLogins, clientIp, recordFailedLogin, secondsUntilUnlocked } from "@/lib/loginRateLimit";

export async function POST(request: Request) {
  const ip = clientIp(request);
  const lockedFor = await secondsUntilUnlocked(ip);
  if (lockedFor != null) {
    return NextResponse.json(
      { error: `Demasiados intentos fallidos. Probá de nuevo en ${lockedFor} segundos.` },
      { status: 429, headers: { "Retry-After": String(lockedFor) } },
    );
  }

  const { username, password } = (await request.json()) as {
    username?: unknown;
    password?: unknown;
  };

  if (
    typeof username !== "string" ||
    typeof password !== "string" ||
    !areValidCredentials(username, password)
  ) {
    await recordFailedLogin(ip);
    return NextResponse.json({ error: "Usuario o contraseña incorrectos" }, { status: 401 });
  }

  await clearFailedLogins(ip);
  const token = expectedSessionToken();
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, token!, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
