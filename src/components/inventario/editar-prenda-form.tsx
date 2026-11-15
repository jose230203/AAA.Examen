"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { Campo, inputCls } from "@/components/ui/campo";
import {
  CONDICIONES,
  editarPrendaSchema,
  type EditarPrendaData,
  type EditarPrendaInput,
} from "@/schemas/prenda";
import { actualizarPrenda } from "@/actions/prendas-edicion";

export function EditarPrendaForm({
  prenda,
  categorias,
}: {
  prenda: EditarPrendaInput;
  categorias: { id: string; nombre: string }[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<EditarPrendaInput, unknown, EditarPrendaData>({
    resolver: zodResolver(editarPrendaSchema),
    defaultValues: prenda,
  });

  async function onSubmit(values: EditarPrendaData) {
    setError(null);
    setExito(null);
    const res = await actualizarPrenda({ ...values, id: prenda.id });
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setExito("Cambios guardados");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Campo label="Descripción *" error={errors.descripcion?.message}>
          <input className={inputCls} {...register("descripcion")} />
        </Campo>
        <Campo label="Talla *" error={errors.talla?.message}>
          <input className={inputCls} {...register("talla")} />
        </Campo>
        <Campo label="Categoría *" error={errors.categoriaId?.message}>
          <select className={inputCls} {...register("categoriaId")}>
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>
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
        Guardar cambios
      </button>
    </form>
  );
}
