"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, UserPlus, X } from "lucide-react";
import { Campo, inputCls } from "@/components/ui/campo";
import { crearUsuario } from "@/actions/usuarios";
import { ROLES, crearUsuarioSchema, type CrearUsuarioInput } from "@/schemas/usuarios";

export function NuevoUsuarioForm({ sucursales }: { sucursales: { id: string; nombre: string }[] }) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState<string | null>(null);

  const vacio: CrearUsuarioInput = { nombre: "", email: "", rol: "CAJERO", sucursalId: "", password: "" };

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CrearUsuarioInput>({
    resolver: zodResolver(crearUsuarioSchema),
    defaultValues: vacio,
  });

  async function onSubmit(values: CrearUsuarioInput) {
    setError(null);
    setExito(null);
    const res = await crearUsuario(values);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setExito(`Usuario ${values.email} creado`);
    reset(vacio);
    router.refresh();
  }

  if (!abierto) {
    return (
      <button
        onClick={() => setAbierto(true)}
        className="flex h-12 items-center gap-2 rounded-lg bg-slate-900 px-4 font-medium text-white hover:bg-slate-700"
      >
        <UserPlus size={18} /> Nuevo usuario
      </button>
    );
  }

  return (
    <div className="rounded-xl bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-900">Nuevo usuario</h2>
        <button
          onClick={() => setAbierto(false)}
          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
          aria-label="Cerrar"
        >
          <X size={18} />
        </button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo label="Nombre *" error={errors.nombre?.message}>
            <input className={inputCls} {...register("nombre")} />
          </Campo>
          <Campo label="Correo *" error={errors.email?.message}>
            <input type="email" autoComplete="off" className={inputCls} {...register("email")} />
          </Campo>
          <Campo label="Rol *" error={errors.rol?.message}>
            <select className={inputCls} {...register("rol")}>
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </Campo>
          <Campo label="Sucursal" error={errors.sucursalId?.message}>
            <select className={inputCls} {...register("sucursalId")}>
              <option value="">— Ninguna (solo admin) —</option>
              {sucursales.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nombre}
                </option>
              ))}
            </select>
          </Campo>
          <Campo label="Contraseña temporal *" error={errors.password?.message}>
            <input
              type="password"
              autoComplete="new-password"
              className={inputCls}
              {...register("password")}
            />
          </Campo>
        </div>

        {error && (
          <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {error}
          </p>
        )}
        {exito && <p className="rounded-lg bg-green-50 p-3 text-sm text-green-700">{exito}</p>}

        <button
          type="submit"
          disabled={isSubmitting}
          className="flex h-12 items-center gap-2 rounded-lg bg-slate-900 px-6 font-medium text-white hover:bg-slate-700 disabled:opacity-60"
        >
          {isSubmitting && <Loader2 size={18} className="animate-spin" />}
          Crear usuario
        </button>
      </form>
    </div>
  );
}
