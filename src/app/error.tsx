"use client";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto mt-24 max-w-md space-y-4 text-center">
      <h1 className="text-xl font-semibold text-slate-900">Algo salió mal</h1>
      <p className="text-sm text-slate-500">{error.message || "Ocurrió un error inesperado."}</p>
      <button className="btn" onClick={() => reset()}>
        Reintentar
      </button>
    </div>
  );
}
