"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Undo2 } from "lucide-react";
import { anularVentaAction } from "@/actions/anulaciones";
import { useDialogos } from "@/components/ui/dialogos";

export function AnularVentaButton({ ventaId, numero }: { ventaId: string; numero: number }) {
  const router = useRouter();
  const { preguntar, avisar } = useDialogos();
  const [cargando, setCargando] = useState(false);

  async function onClick() {
    const motivo = await preguntar({
      titulo: `Anular la venta #${numero}`,
      mensaje: "Las prendas volverán al inventario. Indica el motivo.",
      etiqueta: "Motivo",
      textoOk: "Anular venta",
    });
    if (motivo === null) return;

    setCargando(true);
    const res = await anularVentaAction({ ventaId, motivo });
    setCargando(false);

    if (!res.ok) {
      await avisar(res.error, "No se pudo anular");
      return;
    }
    router.refresh();
  }

  return (
    <button
      onClick={onClick}
      disabled={cargando}
      className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
    >
      {cargando ? <Loader2 size={14} className="animate-spin" /> : <Undo2 size={14} />}
      Anular
    </button>
  );
}
