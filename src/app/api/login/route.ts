import { NextResponse } from "next/server";
import { areValidCredentials, SESSION_COOKIE, expectedSessionToken } from "@/lib/auth";

export async function POST(request: Request) {
  const { username, password } = (await request.json()) as {
    username?: unknown;
    password?: unknown;
  };

  if (
    typeof username !== "string" ||
    typeof password !== "string" ||
    !areValidCredentials(username, password)
  ) {
    return NextResponse.json({ error: "Usuario o contraseña incorrectos" }, { status: 401 });
  }

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
