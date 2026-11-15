"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import clsx from "clsx";

type Campo = {
  nombre: string;
  etiqueta: string;
  valorInicial?: string;
  tipo?: "text" | "password";
};
type Valores = Record<string, string>;

type Dialogo =
  | {
      clase: "formulario";
      titulo: string;
      mensaje?: string;
      campos: Campo[];
      textoOk: string;
      resolver: (v: Valores | null) => void;
    }
  | {
      clase: "confirmar";
      titulo: string;
      mensaje?: string;
      textoOk: string;
      peligro: boolean;
      resolver: (v: boolean) => void;
    }
  | { clase: "aviso"; titulo: string; mensaje: string; resolver: () => void };

type Api = {
  formulario: (o: {
    titulo: string;
    mensaje?: string;
    campos: Campo[];
    textoOk?: string;
  }) => Promise<Valores | null>;
  preguntar: (o: {
    titulo: string;
    mensaje?: string;
    etiqueta?: string;
    valorInicial?: string;
    tipo?: "text" | "password";
    textoOk?: string;
  }) => Promise<string | null>;
  confirmar: (o: {
    titulo: string;
    mensaje?: string;
    textoOk?: string;
    peligro?: boolean;
  }) => Promise<boolean>;
  avisar: (mensaje: string, titulo?: string) => Promise<void>;
};

const Ctx = createContext<Api | null>(null);

export function useDialogos(): Api {
  const api = useContext(Ctx);
  if (!api) throw new Error("useDialogos debe usarse dentro de <DialogosProvider>");
  return api;
}

function Marco({
  titulo,
  mensaje,
  onEscape,
  children,
}: {
  titulo: string;
  mensaje?: string;
  onEscape: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") onEscape();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onEscape]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={titulo}
    >
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="text-lg font-bold text-slate-900">{titulo}</h2>
        {mensaje && <p className="mt-1 whitespace-pre-line text-sm text-slate-600">{mensaje}</p>}
        {children}
      </div>
    </div>
  );
}

const btnBase = "h-11 rounded-lg px-4 text-sm font-medium";

function FormularioModal({
  d,
  cerrar,
}: {
  d: Extract<Dialogo, { clase: "formulario" }>;
  cerrar: (v: Valores | null) => void;
}) {
  const [valores, setValores] = useState<Valores>(() =>
    Object.fromEntries(d.campos.map((c) => [c.nombre, c.valorInicial ?? ""]))
  );

  return (
    <Marco titulo={d.titulo} mensaje={d.mensaje} onEscape={() => cerrar(null)}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          cerrar(valores);
        }}
        className="mt-4 space-y-3"
      >
        {d.campos.map((c, i) => (
          <label key={c.nombre} className="block text-sm">
            {c.etiqueta && <span className="mb-1 block font-medium text-slate-700">{c.etiqueta}</span>}
            <input
              autoFocus={i === 0}
              type={c.tipo ?? "text"}
              autoComplete={c.tipo === "password" ? "new-password" : "off"}
              value={valores[c.nombre]}
              onChange={(e) => setValores((v) => ({ ...v, [c.nombre]: e.target.value }))}
              className="h-12 w-full rounded-lg border border-slate-300 px-3 outline-none focus:border-slate-900"
            />
          </label>
        ))}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={() => cerrar(null)} className={clsx(btnBase, "bg-slate-100 text-slate-700")}>
            Cancelar
          </button>
          <button type="submit" className={clsx(btnBase, "bg-slate-900 text-white")}>
            {d.textoOk}
          </button>
        </div>
      </form>
    </Marco>
  );
}

export function DialogosProvider({ children }: { children: React.ReactNode }) {
  const [dialogo, setDialogo] = useState<Dialogo | null>(null);

  const formulario = useCallback<Api["formulario"]>(
    (o) =>
      new Promise<Valores | null>((resolve) =>
        setDialogo({
          clase: "formulario",
          titulo: o.titulo,
          mensaje: o.mensaje,
          campos: o.campos,
          textoOk: o.textoOk ?? "Aceptar",
          resolver: resolve,
        })
      ),
    []
  );

  const preguntar = useCallback<Api["preguntar"]>(
    async (o) => {
      const r = await formulario({
        titulo: o.titulo,
        mensaje: o.mensaje,
        textoOk: o.textoOk,
        campos: [
          { nombre: "valor", etiqueta: o.etiqueta ?? "", valorInicial: o.valorInicial, tipo: o.tipo },
        ],
      });
      return r ? r.valor : null;
    },
    [formulario]
  );

  const confirmar = useCallback<Api["confirmar"]>(
    (o) =>
      new Promise<boolean>((resolve) =>
        setDialogo({
          clase: "confirmar",
          titulo: o.titulo,
          mensaje: o.mensaje,
          textoOk: o.textoOk ?? "Aceptar",
          peligro: o.peligro ?? false,
          resolver: resolve,
        })
      ),
    []
  );

  const avisar = useCallback<Api["avisar"]>(
    (mensaje, titulo = "Aviso") =>
      new Promise<void>((resolve) => setDialogo({ clase: "aviso", titulo, mensaje, resolver: resolve })),
    []
  );

  const api = useMemo<Api>(
    () => ({ formulario, preguntar, confirmar, avisar }),
    [formulario, preguntar, confirmar, avisar]
  );

  return (
    <Ctx.Provider value={api}>
      {children}

      {dialogo?.clase === "formulario" && (
        <FormularioModal
          d={dialogo}
          cerrar={(v) => {
            setDialogo(null);
            dialogo.resolver(v);
          }}
        />
      )}

      {dialogo?.clase === "confirmar" && (
        <Marco
          titulo={dialogo.titulo}
          mensaje={dialogo.mensaje}
          onEscape={() => {
            setDialogo(null);
            dialogo.resolver(false);
          }}
        >
          <div className="mt-5 flex justify-end gap-2">
            <button
              onClick={() => {
                setDialogo(null);
                dialogo.resolver(false);
              }}
              className={clsx(btnBase, "bg-slate-100 text-slate-700")}
            >
              Cancelar
            </button>
            <button
              autoFocus
              onClick={() => {
                setDialogo(null);
                dialogo.resolver(true);
              }}
              className={clsx(btnBase, dialogo.peligro ? "bg-red-600 text-white" : "bg-slate-900 text-white")}
            >
              {dialogo.textoOk}
            </button>
          </div>
        </Marco>
      )}

      {dialogo?.clase === "aviso" && (
        <Marco
          titulo={dialogo.titulo}
          mensaje={dialogo.mensaje}
          onEscape={() => {
            setDialogo(null);
            dialogo.resolver();
          }}
        >
          <div className="mt-5 flex justify-end">
            <button
              autoFocus
              onClick={() => {
                setDialogo(null);
                dialogo.resolver();
              }}
              className={clsx(btnBase, "bg-slate-900 text-white")}
            >
              Entendido
            </button>
          </div>
        </Marco>
      )}
    </Ctx.Provider>
  );
}
