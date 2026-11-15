"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import { darDeBajaPrenda } from "@/actions/inventario";
import { useDialogos } from "@/components/ui/dialogos";

export function BajaPrendaButton({ prendaId, codigo }: { prendaId: string; codigo: string }) {
  const router = useRouter();
  const { preguntar, avisar } = useDialogos();
  const [cargando, setCargando] = useState(false);

  async function onClick() {
    const motivo = await preguntar({
      titulo: `Dar de baja ${codigo}`,
      mensaje: "Indica el motivo de la baja.",
      etiqueta: "Motivo",
      textoOk: "Dar de baja",
    });
    if (motivo === null) return;

    setCargando(true);
    const res = await darDeBajaPrenda({ prendaId, motivo });
    setCargando(false);

    if (!res.ok) {
      await avisar(res.error, "No se pudo dar de baja");
      return;
    }
    router.refresh();
  }

  return (
    <button
      onClick={onClick}
      disabled={cargando}
      title="Dar de baja"
      className="rounded-lg p-2 text-red-600 hover:bg-red-50 disabled:opacity-50"
    >
      {cargando ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
    </button>
  );
}
