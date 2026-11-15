"use client";

import { AlertTriangle } from "lucide-react";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto mt-16 max-w-md rounded-xl bg-white p-8 text-center shadow-sm">
      <AlertTriangle className="mx-auto mb-3 text-amber-500" size={36} />
      <h2 className="text-lg font-bold">Algo salió mal</h2>
      <p className="mt-1 text-sm text-slate-500">
        No pudimos cargar esta sección. Intenta de nuevo.
      </p>
      <button
        onClick={reset}
        className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-700"
      >
        Reintentar
      </button>
    </div>
  );
}
