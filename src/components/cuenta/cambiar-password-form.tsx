"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { Campo, inputCls } from "@/components/ui/campo";
import { cambiarMiPassword } from "@/actions/cuenta";
import { cambiarPasswordSchema, type CambiarPasswordInput } from "@/schemas/usuarios";

export function CambiarPasswordForm() {
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CambiarPasswordInput>({ resolver: zodResolver(cambiarPasswordSchema) });

  async function onSubmit(values: CambiarPasswordInput) {
    setError(null);
    setExito(null);
    const res = await cambiarMiPassword(values);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setExito("Contraseña actualizada correctamente");
    reset({ actual: "", nueva: "", confirmar: "" });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      <Campo label="Contraseña actual" error={errors.actual?.message}>
        <input type="password" autoComplete="current-password" className={inputCls} {...register("actual")} />
      </Campo>
      <Campo label="Nueva contraseña" error={errors.nueva?.message}>
        <input type="password" autoComplete="new-password" className={inputCls} {...register("nueva")} />
      </Campo>
      <Campo label="Confirmar nueva contraseña" error={errors.confirmar?.message}>
        <input type="password" autoComplete="new-password" className={inputCls} {...register("confirmar")} />
      </Campo>

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
        Cambiar contraseña
      </button>
    </form>
  );
}
