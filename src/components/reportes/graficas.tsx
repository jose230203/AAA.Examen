import { formatMoney } from "@/lib/format";

export function ColumnasDias({ items }: { items: { etiqueta: string; valor: number }[] }) {
  const max = Math.max(...items.map((i) => i.valor), 1);
  return (
    <div className="overflow-x-auto">
      <div className="flex h-48 items-stretch gap-1" style={{ minWidth: items.length * 36 }}>
        {items.map((i) => (
          <div
            key={i.etiqueta}
            title={`${i.etiqueta}: ${formatMoney(i.valor)}`}
            className="flex flex-1 flex-col"
          >
            <div className="flex flex-1 items-end">
              <div
                className="w-full rounded-t bg-slate-800"
                style={{ height: `${(i.valor / max) * 100}%`, minHeight: i.valor > 0 ? 3 : 0 }}
              />
            </div>
            <span className="mt-1 text-center text-[10px] text-slate-500">{i.etiqueta}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ListaBarras({
  titulo,
  items,
}: {
  titulo: string;
  items: { etiqueta: string; valor: number; detalle?: string }[];
}) {
  const max = Math.max(...items.map((i) => i.valor), 1);
  return (
    <section className="rounded-xl bg-white p-4 shadow-sm">
      <h3 className="mb-3 font-semibold text-slate-900">{titulo}</h3>
      {items.length === 0 ? (
        <p className="text-sm text-slate-500">Sin datos en el período</p>
      ) : (
        <ul className="space-y-2">
          {items.map((i) => (
            <li key={i.etiqueta}>
              <div className="flex justify-between text-sm">
                <span>
                  {i.etiqueta}
                  {i.detalle && <span className="text-slate-400"> · {i.detalle}</span>}
                </span>
                <span className="font-medium">{formatMoney(i.valor)}</span>
              </div>
              <div className="mt-1 h-2 rounded bg-slate-100">
                <div
                  className="h-2 rounded bg-slate-800"
                  style={{ width: `${(i.valor / max) * 100}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
