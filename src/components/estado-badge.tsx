import clsx from "clsx";

const colores: Record<string, string> = {
  DISPONIBLE: "bg-green-100 text-green-800",
  VENDIDA: "bg-slate-200 text-slate-700",
  EN_TRASPASO: "bg-amber-100 text-amber-800",
  BAJA: "bg-red-100 text-red-800",
  COMPLETADA: "bg-green-100 text-green-800",
  ANULADA: "bg-red-100 text-red-800",
  PENDIENTE: "bg-amber-100 text-amber-800",
  EN_TRANSITO: "bg-blue-100 text-blue-800",
  RECIBIDO: "bg-green-100 text-green-800",
  CANCELADO: "bg-red-100 text-red-800",
};

export function EstadoBadge({ estado }: { estado: string }) {
  return (
    <span
      className={clsx(
        "rounded-full px-2 py-0.5 text-xs font-medium",
        colores[estado] ?? "bg-slate-100 text-slate-700"
      )}
    >
      {estado.replace("_", " ")}
    </span>
  );
}
