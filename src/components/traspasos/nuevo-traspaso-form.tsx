"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Plus, X } from "lucide-react";
import { crearTraspasoAction } from "@/actions/traspasos";

type Opcion = { id: string; nombre: string };

const formSchema = z
  .object({
    origenId: z.string().min(1, "Selecciona la sucursal de origen"),
    destinoId: z.string().min(1, "Selecciona la sucursal destino"),
    codigosTexto: z.string().trim().min(1, "Ingresa al menos un código"),
    notas: z.string().trim().max(300, "Máximo 300 caracteres").optional(),
  })
  .refine((d) => d.origenId !== d.destinoId, {
    message: "El origen y el destino no pueden ser la misma sucursal",
    path: ["destinoId"],
  });

type FormValues = z.infer<typeof formSchema>;

const inputCls =
  "h-12 w-full rounded-lg border border-slate-300 px-3 outline-none focus:border-slate-900";

export function NuevoTraspasoForm({
  sucursalesOrigen,
  sucursalesDestino,
}: {
  sucursalesOrigen: Opcion[];
  sucursalesDestino: Opcion[];
}) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState<string | null>(null);

  const origenInicial = sucursalesOrigen.length === 1 ? sucursalesOrigen[0].id : "";

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { origenId: origenInicial, destinoId: "", codigosTexto: "", notas: "" },
  });

  async function onSubmit(values: FormValues) {
    setError(null);
    setExito(null);
    const codigos = values.codigosTexto.split(/[\s,;]+/).filter(Boolean);

    const res = await crearTraspasoAction({
      origenId: values.origenId,
      destinoId: values.destinoId,
      codigos,
      notas: values.notas || undefined,
    });

    if (!res.ok) {
      setError(res.error);
      return;
    }
    setExito(`Traspaso #${res.data.numero} creado con ${codigos.length} prenda(s)`);
    reset({ origenId: origenInicial, destinoId: "", codigosTexto: "", notas: "" });
    router.refresh();
  }

  if (!abierto) {
    return (
      <button
        onClick={() => setAbierto(true)}
        className="flex h-12 items-center gap-2 rounded-lg bg-slate-900 px-4 font-medium text-white hover:bg-slate-700"
      >
        <Plus size={18} /> Nuevo traspaso
      </button>
    );
  }

  return (
    <div className="rounded-xl bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-900">Nuevo traspaso</h2>
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
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Origen *</label>
            <select className={inputCls} {...register("origenId")}>
              <option value="" disabled>
                Selecciona...
              </option>
              {sucursalesOrigen.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nombre}
                </option>
              ))}
            </select>
            {errors.origenId && <p className="mt-1 text-sm text-red-600">{errors.origenId.message}</p>}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Destino *</label>
            <select className={inputCls} {...register("destinoId")}>
              <option value="" disabled>
                Selecciona...
              </option>
              {sucursalesDestino.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nombre}
                </option>
              ))}
            </select>
            {errors.destinoId && (
              <p className="mt-1 text-sm text-red-600">{errors.destinoId.message}</p>
            )}
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Códigos de las prendas * (separados por espacio, coma o salto de línea)
          </label>
          <textarea
            rows={4}
            placeholder="CEN-0001 CEN-0002 CEN-0003"
            className="w-full rounded-lg border border-slate-300 p-3 font-mono text-sm outline-none focus:border-slate-900"
            {...register("codigosTexto")}
          />
          {errors.codigosTexto && (
            <p className="mt-1 text-sm text-red-600">{errors.codigosTexto.message}</p>
          )}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Notas</label>
          <input className={inputCls} {...register("notas")} />
          {errors.notas && <p className="mt-1 text-sm text-red-600">{errors.notas.message}</p>}
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
          Crear traspaso
        </button>
      </form>
    </div>
  );
}
