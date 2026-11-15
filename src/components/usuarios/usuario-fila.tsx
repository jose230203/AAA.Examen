"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { KeyRound, Loader2, LockOpen, Pencil, Power, Save, X } from "lucide-react";
import {
  actualizarUsuario,
  cambiarEstadoUsuario,
  desbloquearUsuario,
  resetearPassword,
} from "@/actions/usuarios";
import { useDialogos } from "@/components/ui/dialogos";
import { ROLES } from "@/schemas/usuarios";

type Usuario = {
  id: string;
  nombre: string;
  email: string;
  rol: (typeof ROLES)[number];
  sucursalId: string | null;
  sucursalNombre: string | null;
  activo: boolean;
  bloqueado: boolean;
};

const selCls = "h-10 w-full rounded-lg border border-slate-300 bg-white px-2 text-sm";
const btnCls = "rounded-lg p-2 hover:bg-slate-100 disabled:opacity-50";

export function UsuarioFila({
  usuario: u,
  sucursales,
  esYo,
}: {
  usuario: Usuario;
  sucursales: { id: string; nombre: string }[];
  esYo: boolean;
}) {
  const router = useRouter();
  const { preguntar, confirmar, avisar } = useDialogos();
  const [editando, setEditando] = useState(false);
  const [nombre, setNombre] = useState(u.nombre);
  const [rol, setRol] = useState<Usuario["rol"]>(u.rol);
  const [sucursalId, setSucursalId] = useState(u.sucursalId ?? "");
  const [cargando, setCargando] = useState(false);

  async function ejecutar(fn: () => Promise<{ ok: boolean; error?: string }>) {
    setCargando(true);
    const res = await fn();
    setCargando(false);
    if (!res.ok) {
      await avisar(res.error ?? "No se pudo completar la acción", "No se pudo completar");
      return false;
    }
    router.refresh();
    return true;
  }

  async function guardar() {
    const ok = await ejecutar(() => actualizarUsuario({ id: u.id, nombre, rol, sucursalId }));
    if (ok) setEditando(false);
  }

  async function resetPassword() {
    const password = await preguntar({
      titulo: "Restablecer contraseña",
      mensaje: `Nueva contraseña temporal para ${u.email}.\nMínimo 8 caracteres, con mayúscula, minúscula y número.`,
      etiqueta: "Contraseña temporal",
      tipo: "password",
      textoOk: "Restablecer",
    });
    if (password === null) return;
    await ejecutar(() => resetearPassword({ id: u.id, password }));
  }

  async function alternarEstado() {
    const ok = await confirmar({
      titulo: u.activo ? "Desactivar usuario" : "Activar usuario",
      mensaje: `¿Seguro que quieres ${u.activo ? "desactivar" : "activar"} a ${u.nombre}?`,
      textoOk: u.activo ? "Desactivar" : "Activar",
      peligro: u.activo,
    });
    if (!ok) return;
    await ejecutar(() => cambiarEstadoUsuario({ id: u.id, activo: !u.activo }));
  }

  return (
    <tr className={clsx(!u.activo && "bg-slate-50 text-slate-400")}>
      <td className="px-4 py-3">
        {editando ? (
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} className={selCls} />
        ) : (
          <>
            <p className="font-medium">
              {u.nombre} {esYo && <span className="text-xs text-slate-400">(tú)</span>}
            </p>
            <p className="text-xs text-slate-500">{u.email}</p>
          </>
        )}
      </td>
      <td className="px-4 py-3">
        {editando ? (
          <select value={rol} onChange={(e) => setRol(e.target.value as Usuario["rol"])} className={selCls}>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        ) : (
          u.rol
        )}
      </td>
      <td className="px-4 py-3">
        {editando ? (
          <select value={sucursalId} onChange={(e) => setSucursalId(e.target.value)} className={selCls}>
            <option value="">— Ninguna —</option>
            {sucursales.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nombre}
              </option>
            ))}
          </select>
        ) : (
          (u.sucursalNombre ?? "—")
        )}
      </td>
      <td className="px-4 py-3 text-xs">
        <span
          className={clsx(
            "rounded-full px-2 py-0.5 font-medium",
            u.activo ? "bg-green-100 text-green-800" : "bg-slate-200 text-slate-600"
          )}
        >
          {u.activo ? "Activo" : "Inactivo"}
        </span>
        {u.bloqueado && (
          <span className="ml-1 rounded-full bg-red-100 px-2 py-0.5 font-medium text-red-800">
            Bloqueado
          </span>
        )}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center justify-end gap-1">
          {cargando && <Loader2 size={16} className="animate-spin" />}
          {editando ? (
            <>
              <button onClick={guardar} disabled={cargando} className={clsx(btnCls, "text-green-700")} title="Guardar">
                <Save size={16} />
              </button>
              <button onClick={() => setEditando(false)} className={btnCls} title="Cancelar">
                <X size={16} />
              </button>
            </>
          ) : (
            <>
              <button onClick={() => setEditando(true)} disabled={cargando} className={btnCls} title="Editar">
                <Pencil size={16} />
              </button>
              {u.bloqueado && (
                <button
                  onClick={() => ejecutar(() => desbloquearUsuario({ id: u.id }))}
                  disabled={cargando}
                  className={clsx(btnCls, "text-amber-700")}
                  title="Desbloquear"
                >
                  <LockOpen size={16} />
                </button>
              )}
              <button onClick={resetPassword} disabled={cargando} className={btnCls} title="Restablecer contraseña">
                <KeyRound size={16} />
              </button>
              {!esYo && (
                <button
                  onClick={alternarEstado}
                  disabled={cargando}
                  className={clsx(btnCls, u.activo ? "text-red-600" : "text-green-700")}
                  title={u.activo ? "Desactivar" : "Activar"}
                >
                  <Power size={16} />
                </button>
              )}
            </>
          )}
        </div>
      </td>
    </tr>
  );
}
