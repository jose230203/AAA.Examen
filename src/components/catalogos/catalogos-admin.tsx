"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { Loader2, Pencil, Plus, Power, Trash2 } from "lucide-react";
import {
  actualizarSucursal,
  cambiarEstadoSucursal,
  crearCategoria,
  crearSucursal,
  eliminarCategoria,
  renombrarCategoria,
} from "@/actions/catalogos";
import { useDialogos } from "@/components/ui/dialogos";

type SucursalItem = {
  id: string;
  nombre: string;
  direccion: string | null;
  telefono: string | null;
  activa: boolean;
  prendas: number;
};
type CategoriaItem = { id: string; nombre: string; prendas: number };

const inputCls = "h-11 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-slate-900";
const btnCls = "rounded-lg p-2 hover:bg-slate-100 disabled:opacity-50";

export function CatalogosAdmin({
  sucursales,
  categorias,
}: {
  sucursales: SucursalItem[];
  categorias: CategoriaItem[];
}) {
  const router = useRouter();
  const { formulario, preguntar, confirmar } = useDialogos();
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [sNombre, setSNombre] = useState("");
  const [sDireccion, setSDireccion] = useState("");
  const [sTelefono, setSTelefono] = useState("");
  const [cNombre, setCNombre] = useState("");

  async function ejecutar(fn: () => Promise<{ ok: boolean; error?: string }>) {
    setError(null);
    setCargando(true);
    const res = await fn();
    setCargando(false);
    if (!res.ok) {
      setError(res.error ?? "No se pudo completar la acción");
      return false;
    }
    router.refresh();
    return true;
  }

  async function agregarSucursal(e: React.FormEvent) {
    e.preventDefault();
    const ok = await ejecutar(() =>
      crearSucursal({ nombre: sNombre, direccion: sDireccion, telefono: sTelefono })
    );
    if (ok) {
      setSNombre("");
      setSDireccion("");
      setSTelefono("");
    }
  }

  async function editarSucursal(s: SucursalItem) {
    const v = await formulario({
      titulo: "Editar sucursal",
      textoOk: "Guardar",
      campos: [
        { nombre: "nombre", etiqueta: "Nombre", valorInicial: s.nombre },
        { nombre: "direccion", etiqueta: "Dirección", valorInicial: s.direccion ?? "" },
        { nombre: "telefono", etiqueta: "Teléfono", valorInicial: s.telefono ?? "" },
      ],
    });
    if (!v) return;
    await ejecutar(() =>
      actualizarSucursal({ id: s.id, nombre: v.nombre, direccion: v.direccion, telefono: v.telefono })
    );
  }

  async function agregarCategoria(e: React.FormEvent) {
    e.preventDefault();
    const ok = await ejecutar(() => crearCategoria({ nombre: cNombre }));
    if (ok) setCNombre("");
  }

  async function renombrar(c: CategoriaItem) {
    const nombre = await preguntar({
      titulo: "Renombrar categoría",
      etiqueta: "Nombre",
      valorInicial: c.nombre,
      textoOk: "Guardar",
    });
    if (nombre === null) return;
    await ejecutar(() => renombrarCategoria({ id: c.id, nombre }));
  }

  async function eliminar(c: CategoriaItem) {
    const ok = await confirmar({
      titulo: "Eliminar categoría",
      mensaje: `¿Eliminar la categoría "${c.nombre}"?`,
      textoOk: "Eliminar",
      peligro: true,
    });
    if (!ok) return;
    await ejecutar(() => eliminarCategoria({ id: c.id }));
  }

  return (
    <div className="space-y-6">
      {error && (
        <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <section className="space-y-3 rounded-xl bg-white p-5 shadow-sm">
        <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
          Sucursales {cargando && <Loader2 size={16} className="animate-spin" />}
        </h2>

        <ul className="divide-y divide-slate-100">
          {sucursales.map((s) => (
            <li key={s.id} className="flex items-center justify-between gap-3 py-3">
              <div className={clsx(!s.activa && "text-slate-400")}>
                <p className="font-medium">
                  {s.nombre} {!s.activa && <span className="text-xs">(inactiva)</span>}
                </p>
                <p className="text-xs text-slate-500">
                  {[s.direccion, s.telefono].filter(Boolean).join(" · ") || "Sin datos de contacto"} ·{" "}
                  {s.prendas} prendas registradas
                </p>
              </div>
              <div className="flex">
                <button onClick={() => editarSucursal(s)} disabled={cargando} className={btnCls} title="Editar">
                  <Pencil size={16} />
                </button>
                <button
                  onClick={() => ejecutar(() => cambiarEstadoSucursal({ id: s.id, activa: !s.activa }))}
                  disabled={cargando}
                  className={clsx(btnCls, s.activa ? "text-red-600" : "text-green-700")}
                  title={s.activa ? "Desactivar" : "Activar"}
                >
                  <Power size={16} />
                </button>
              </div>
            </li>
          ))}
        </ul>

        <form onSubmit={agregarSucursal} className="grid gap-2 sm:grid-cols-4">
          <input className={inputCls} placeholder="Nombre *" value={sNombre} onChange={(e) => setSNombre(e.target.value)} />
          <input className={inputCls} placeholder="Dirección" value={sDireccion} onChange={(e) => setSDireccion(e.target.value)} />
          <input className={inputCls} placeholder="Teléfono" value={sTelefono} onChange={(e) => setSTelefono(e.target.value)} />
          <button
            type="submit"
            disabled={cargando}
            className="flex h-11 items-center justify-center gap-2 rounded-lg bg-slate-900 text-sm font-medium text-white disabled:opacity-60"
          >
            <Plus size={16} /> Agregar sucursal
          </button>
        </form>
      </section>

      <section className="space-y-3 rounded-xl bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">Categorías</h2>

        <ul className="divide-y divide-slate-100">
          {categorias.map((c) => (
            <li key={c.id} className="flex items-center justify-between py-3">
              <p>
                <span className="font-medium">{c.nombre}</span>{" "}
                <span className="text-xs text-slate-500">· {c.prendas} prendas</span>
              </p>
              <div className="flex">
                <button onClick={() => renombrar(c)} disabled={cargando} className={btnCls} title="Renombrar">
                  <Pencil size={16} />
                </button>
                <button
                  onClick={() => eliminar(c)}
                  disabled={cargando || c.prendas > 0}
                  className={clsx(btnCls, "text-red-600")}
                  title={c.prendas > 0 ? "Tiene prendas asociadas" : "Eliminar"}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </li>
          ))}
        </ul>

        <form onSubmit={agregarCategoria} className="flex gap-2">
          <input className={inputCls} placeholder="Nueva categoría" value={cNombre} onChange={(e) => setCNombre(e.target.value)} />
          <button
            type="submit"
            disabled={cargando}
            className="flex h-11 shrink-0 items-center gap-2 rounded-lg bg-slate-900 px-4 text-sm font-medium text-white disabled:opacity-60"
          >
            <Plus size={16} /> Agregar
          </button>
        </form>
      </section>
    </div>
  );
}
