"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus, X } from "lucide-react";
import {
  CONDICIONES,
  prendaSchema,
  type PrendaData,
  type PrendaInput,
} from "@/schemas/prenda";
import { crearPrenda } from "@/actions/prendas";

type Opcion = { id: string; nombre: string };

const inputCls =
  "h-12 w-full rounded-lg border border-slate-300 px-3 outline-none focus:border-slate-900";

function Campo({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700">{label}</label>
      {children}
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}

export function NuevaPrendaForm({
  categorias,
  sucursales,
  esAdmin,
}: {
  categorias: Opcion[];
  sucursales: Opcion[];
  esAdmin: boolean;
}) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PrendaInput, unknown, PrendaData>({
    resolver: zodResolver(prendaSchema),
    defaultValues: { condicion: "BUENA" },
  });

  async function onSubmit(values: PrendaData) {
    setError(null);
    setExito(null);
    const res = await crearPrenda(values);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setExito(`Prenda ${values.codigo.toUpperCase()} registrada`);
    reset({ condicion: "BUENA" });
    router.refresh();
  }

  if (!abierto) {
    return (
      <button
        onClick={() => setAbierto(true)}
        className="flex h-12 items-center gap-2 rounded-lg bg-slate-900 px-4 font-medium text-white hover:bg-slate-700"
      >
        <Plus size={18} /> Nueva prenda
      </button>
    );
  }

  return (
    <div className="rounded-xl bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-900">Registrar prenda</h2>
        <button
          onClick={() => setAbierto(false)}
          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
          aria-label="Cerrar"
        >
          <X size={18} />
        </button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Campo label="Código *" error={errors.codigo?.message}>
            <input className={inputCls} placeholder="CEN-0100" {...register("codigo")} />
          </Campo>
          <Campo label="Descripción *" error={errors.descripcion?.message}>
            <input className={inputCls} placeholder="Camisa de lino" {...register("descripcion")} />
          </Campo>
          <Campo label="Talla *" error={errors.talla?.message}>
            <input className={inputCls} placeholder="M, L, 38..." {...register("talla")} />
          </Campo>
          <Campo label="Marca" error={errors.marca?.message}>
            <input className={inputCls} {...register("marca")} />
          </Campo>
          <Campo label="Color" error={errors.color?.message}>
            <input className={inputCls} {...register("color")} />
          </Campo>
          <Campo label="Condición *" error={errors.condicion?.message}>
            <select className={inputCls} {...register("condicion")}>
              {CONDICIONES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Campo>
          <Campo label="Costo *" error={errors.precioCosto?.message}>
            <input
              type="number"
              step="0.01"
              min="0"
              inputMode="decimal"
              className={inputCls}
              {...register("precioCosto", { valueAsNumber: true })}
            />
          </Campo>
          <Campo label="Precio de venta *" error={errors.precioVenta?.message}>
            <input
              type="number"
              step="0.01"
              min="0"
              inputMode="decimal"
              className={inputCls}
              {...register("precioVenta", { valueAsNumber: true })}
            />
          </Campo>
          <Campo label="Categoría *" error={errors.categoriaId?.message}>
            <select className={inputCls} defaultValue="" {...register("categoriaId")}>
              <option value="" disabled>
                Selecciona...
              </option>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </Campo>
          {esAdmin && (
            <Campo label="Sucursal *" error={errors.sucursalId?.message}>
              <select className={inputCls} defaultValue="" {...register("sucursalId")}>
                <option value="" disabled>
                  Selecciona...
                </option>
                {sucursales.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nombre}
                  </option>
                ))}
              </select>
            </Campo>
          )}
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
          Guardar prenda
        </button>
      </form>
    </div>
  );
}
