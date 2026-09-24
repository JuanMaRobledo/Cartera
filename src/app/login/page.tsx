"use client";

import Image from "next/image";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [username, setUsername] = useState("juan0804");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) {
        setError((await res.json()).error ?? "Error al iniciar sesión");
        return;
      }
      const next = searchParams.get("next") || "/";
      router.push(next);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={submit} className="card space-y-4">
      <div>
        <label className="label" htmlFor="username">Usuario</label>
        <input id="username" name="username" type="text" className="input" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" autoCapitalize="none" autoFocus required />
      </div>
      <div>
        <label className="label" htmlFor="password">Contraseña</label>
        <input id="password" name="password" type="password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
      </div>
      {error && <p className="text-sm loss-text">{error}</p>}
      <button className="btn w-full" type="submit" disabled={submitting}>
        {submitting ? "Ingresando…" : "Entrar"}
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="mx-auto mt-12 max-w-sm space-y-6 sm:mt-20">
      <div className="text-center">
        <span className="mx-auto grid h-24 w-24 place-items-center overflow-hidden rounded-full bg-[#314a35] ring-1 ring-[#b18a45]/60">
          <Image src="/jmr-roble-foso-mobile.png" alt="JMR · El Roble en el Foso" width={90} height={90} className="h-20 w-20 object-contain" priority />
        </span>
        <p className="jmr-eyebrow mt-5 text-[#9a7437]">El Roble en el Foso</p>
        <h1 className="mt-2 font-serif text-3xl font-medium text-[#2f4934]">Centro financiero</h1>
        <p className="mt-2 text-sm text-[#746b5c]">Ingresa a tu ecosistema financiero personal.</p>
      </div>
      <Suspense>
        <LoginForm />
      </Suspense>
    </div>
  );
}
