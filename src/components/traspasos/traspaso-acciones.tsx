"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import {
  cancelarTraspasoAction,
  enviarTraspasoAction,
  recibirTraspasoAction,
} from "@/actions/traspasos";
import { useDialogos } from "@/components/ui/dialogos";

type Props = {
  traspasoId: string;
  puedeEnviar: boolean;
  puedeRecibir: boolean;
  puedeCancelar: boolean;
};

type Confirmacion = { titulo: string; mensaje: string; textoOk: string; peligro?: boolean };

export function TraspasoAcciones({ traspasoId, puedeEnviar, puedeRecibir, puedeCancelar }: Props) {
  const router = useRouter();
  const { confirmar, avisar } = useDialogos();
  const [cargando, setCargando] = useState<string | null>(null);

  async function ejecutar(
    nombre: string,
    fn: (input: unknown) => Promise<{ ok: boolean; error?: string }>,
    confirmacion: Confirmacion
  ) {
    if (!(await confirmar(confirmacion))) return;

    setCargando(nombre);
    const res = await fn({ traspasoId });
    setCargando(null);

    if (!res.ok) {
      await avisar(res.error ?? "No se pudo completar la acción", "No se pudo completar");
      return;
    }
    router.refresh();
  }

  const base = "flex h-10 items-center gap-2 rounded-lg px-4 text-sm font-medium disabled:opacity-50";

  return (
    <div className="flex flex-wrap gap-2">
      {puedeEnviar && (
        <button
          disabled={cargando !== null}
          onClick={() =>
            ejecutar("enviar", enviarTraspasoAction, {
              titulo: "Marcar como enviado",
              mensaje: "¿Confirmas que las prendas ya salieron hacia la sucursal destino?",
              textoOk: "Marcar enviado",
            })
          }
          className={`${base} bg-blue-600 text-white`}
        >
          {cargando === "enviar" && <Loader2 size={14} className="animate-spin" />}
          Marcar enviado
        </button>
      )}
      {puedeRecibir && (
        <button
          disabled={cargando !== null}
          onClick={() =>
            ejecutar("recibir", recibirTraspasoAction, {
              titulo: "Confirmar recepción",
              mensaje: "¿Recibiste todas las prendas? Pasarán a tu inventario.",
              textoOk: "Confirmar recepción",
            })
          }
          className={`${base} bg-green-600 text-white`}
        >
          {cargando === "recibir" && <Loader2 size={14} className="animate-spin" />}
          Confirmar recepción
        </button>
      )}
      {puedeCancelar && (
        <button
          disabled={cargando !== null}
          onClick={() =>
            ejecutar("cancelar", cancelarTraspasoAction, {
              titulo: "Cancelar traspaso",
              mensaje: "Las prendas volverán a estar disponibles en la sucursal de origen.",
              textoOk: "Cancelar traspaso",
              peligro: true,
            })
          }
          className={`${base} bg-red-50 text-red-700`}
        >
          {cargando === "cancelar" && <Loader2 size={14} className="animate-spin" />}
          Cancelar
        </button>
      )}
    </div>
  );
}
