"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { Loader2, Printer, ScanBarcode, Trash2 } from "lucide-react";
import { buscarPrendaPorCodigo, type PrendaPOS } from "@/actions/inventario";
import { crearVenta } from "@/actions/ventas";
import { formatMoney } from "@/lib/format";
import { METODOS_PAGO } from "@/schemas/venta";

type Metodo = (typeof METODOS_PAGO)[number];

type Ticket = {
  numero: number;
  fecha: string;
  items: PrendaPOS[];
  subtotal: number;
  descuento: number;
  total: number;
  metodoPago: Metodo;
  recibido: number | null;
};

const ETIQUETAS: Record<Metodo, string> = {
  EFECTIVO: "Efectivo",
  TARJETA: "Tarjeta",
  TRANSFERENCIA: "Transferencia",
};

const ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ESCAPES[c]);
const redondear = (n: number) => Math.round(n * 100) / 100;

function imprimirTicket(t: Ticket, sucursal: string, cajero: string) {
  const filas = t.items
    .map(
      (p) =>
        `<tr><td>${esc(p.codigo)}<br><small>${esc(p.descripcion)} (${esc(p.talla)})</small></td><td style="text-align:right">${formatMoney(p.precioVenta)}</td></tr>`
    )
    .join("");

  const html = `<html><head><title>Ticket #${t.numero}</title>
<style>
  body{font-family:monospace;font-size:12px;width:280px;margin:8px auto}
  table{width:100%;border-collapse:collapse}
  td{padding:2px 0;vertical-align:top}
  hr{border:0;border-top:1px dashed #000}
  .c{text-align:center}
  .r{text-align:right}
</style></head><body>
<p class="c"><b>TIENDAS DE ROPA USADA</b><br>${esc(sucursal)}</p>
<p>Ticket #${t.numero}<br>${esc(t.fecha)}<br>Cajero: ${esc(cajero)}</p>
<hr><table>${filas}</table><hr>
<table>
  <tr><td>Subtotal</td><td class="r">${formatMoney(t.subtotal)}</td></tr>
  <tr><td>Descuento</td><td class="r">-${formatMoney(t.descuento)}</td></tr>
  <tr><td><b>TOTAL</b></td><td class="r"><b>${formatMoney(t.total)}</b></td></tr>
  <tr><td>Pago</td><td class="r">${ETIQUETAS[t.metodoPago]}</td></tr>
  ${
    t.recibido !== null
      ? `<tr><td>Recibido</td><td class="r">${formatMoney(t.recibido)}</td></tr>
         <tr><td>Cambio</td><td class="r">${formatMoney(redondear(t.recibido - t.total))}</td></tr>`
      : ""
  }
</table>
<hr><p class="c">¡Gracias por su compra!</p>
</body></html>`;

  const iframe = document.createElement("iframe");
  iframe.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0";
  document.body.appendChild(iframe);

  const ventana = iframe.contentWindow;
  if (!ventana) {
    iframe.remove();
    return;
  }
  ventana.document.open();
  ventana.document.write(html);
  ventana.document.close();
  ventana.addEventListener("afterprint", () => iframe.remove());
  setTimeout(() => iframe.remove(), 60_000);
  ventana.focus();
  ventana.print();
}

export function PosCaja({ sucursal, cajero }: { sucursal: string; cajero: string }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const [codigo, setCodigo] = useState("");
  const [carrito, setCarrito] = useState<PrendaPOS[]>([]);
  const [descuento, setDescuento] = useState("0");
  const [metodoPago, setMetodoPago] = useState<Metodo>("EFECTIVO");
  const [recibido, setRecibido] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [buscando, setBuscando] = useState(false);
  const [cobrando, setCobrando] = useState(false);
  const [ticket, setTicket] = useState<Ticket | null>(null);

  const subtotal = redondear(carrito.reduce((a, p) => a + p.precioVenta, 0));
  const desc = Number(descuento) || 0;
  const total = redondear(Math.max(subtotal - desc, 0));
  const recibidoNum = Number(recibido) || 0;
  const cambio = redondear(recibidoNum - total);

  async function agregar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const cod = codigo.trim().toUpperCase();
    if (!cod) return;

    if (carrito.some((p) => p.codigo === cod)) {
      setError(`La prenda ${cod} ya está en el carrito`);
      setCodigo("");
      return;
    }

    setBuscando(true);
    const res = await buscarPrendaPorCodigo(cod);
    setBuscando(false);

    if (!res.ok) {
      setError(res.error);
      return;
    }
    setCarrito((c) => [...c, res.data]);
    setCodigo("");
    inputRef.current?.focus();
  }

  function quitar(id: string) {
    setCarrito((c) => c.filter((p) => p.id !== id));
  }

  async function cobrar() {
    setError(null);
    if (carrito.length === 0) return setError("Agrega al menos una prenda");
    if (desc < 0) return setError("El descuento no puede ser negativo");
    if (desc > subtotal) return setError("El descuento no puede ser mayor al subtotal");
    if (total <= 0) return setError("El total debe ser mayor a 0");
    if (metodoPago === "EFECTIVO" && recibido !== "" && recibidoNum < total) {
      return setError("El monto recibido es menor al total");
    }

    setCobrando(true);
    const res = await crearVenta({
      prendaIds: carrito.map((p) => p.id),
      descuento: desc,
      metodoPago,
    });
    setCobrando(false);

    if (!res.ok) {
      setError(res.error);
      return;
    }

    setTicket({
      numero: res.data.numero,
      fecha: new Date().toLocaleString("es-NI", { timeZone: "America/Managua" }),
      items: carrito,
      subtotal,
      descuento: desc,
      total: Number(res.data.total),
      metodoPago,
      recibido: metodoPago === "EFECTIVO" && recibido !== "" ? recibidoNum : null,
    });
    setCarrito([]);
    setDescuento("0");
    setRecibido("");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {ticket && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-4">
          <p className="font-semibold text-green-900">
            Venta #{ticket.numero} registrada · {formatMoney(ticket.total)}
          </p>
          {ticket.recibido !== null && (
            <p className="text-sm text-green-800">
              Recibido {formatMoney(ticket.recibido)} · Cambio{" "}
              {formatMoney(redondear(ticket.recibido - ticket.total))}
            </p>
          )}
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => imprimirTicket(ticket, sucursal, cajero)}
              className="flex h-11 items-center gap-2 rounded-lg bg-green-700 px-4 text-sm font-medium text-white"
            >
              <Printer size={16} /> Imprimir ticket
            </button>
            <button
              onClick={() => setTicket(null)}
              className="h-11 rounded-lg bg-white px-4 text-sm font-medium text-slate-700"
            >
              Nueva venta
            </button>
          </div>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="space-y-3 lg:col-span-2">
          <form onSubmit={agregar} className="flex gap-2">
            <input
              ref={inputRef}
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
              placeholder="Escanea o escribe el código de la prenda"
              autoFocus
              autoComplete="off"
              className="h-12 flex-1 rounded-lg border border-slate-300 px-3 outline-none focus:border-slate-900"
            />
            <button
              type="submit"
              disabled={buscando}
              className="flex h-12 items-center gap-2 rounded-lg bg-slate-900 px-5 font-medium text-white disabled:opacity-60"
            >
              {buscando ? <Loader2 size={18} className="animate-spin" /> : <ScanBarcode size={18} />}
              Agregar
            </button>
          </form>

          {carrito.length === 0 ? (
            <p className="rounded-xl bg-white p-8 text-center text-slate-500 shadow-sm">
              El carrito está vacío
            </p>
          ) : (
            <ul className="divide-y divide-slate-100 rounded-xl bg-white shadow-sm">
              {carrito.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div>
                    <p className="font-mono text-sm font-semibold">{p.codigo}</p>
                    <p className="text-sm text-slate-500">
                      {p.descripcion} · Talla {p.talla}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-medium">{formatMoney(p.precioVenta)}</span>
                    <button
                      onClick={() => quitar(p.id)}
                      className="rounded-lg p-2 text-red-600 hover:bg-red-50"
                      aria-label={`Quitar ${p.codigo}`}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <aside className="space-y-3 rounded-xl bg-white p-4 shadow-sm">
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Subtotal</span>
            <span>{formatMoney(subtotal)}</span>
          </div>

          <div>
            <label className="mb-1 block text-sm text-slate-500">Descuento</label>
            <input
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              value={descuento}
              onChange={(e) => setDescuento(e.target.value)}
              className="h-12 w-full rounded-lg border border-slate-300 px-3"
            />
          </div>

          <div className="flex justify-between border-t border-slate-100 pt-3 text-xl font-bold">
            <span>Total</span>
            <span>{formatMoney(total)}</span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {METODOS_PAGO.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMetodoPago(m)}
                className={clsx(
                  "h-12 rounded-lg text-xs font-medium",
                  metodoPago === m ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700"
                )}
              >
                {ETIQUETAS[m]}
              </button>
            ))}
          </div>

          {metodoPago === "EFECTIVO" && (
            <div>
              <label className="mb-1 block text-sm text-slate-500">Monto recibido</label>
              <input
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                value={recibido}
                onChange={(e) => setRecibido(e.target.value)}
                className="h-12 w-full rounded-lg border border-slate-300 px-3"
              />
              {recibido !== "" && (
                <p
                  className={clsx(
                    "mt-1 text-sm font-medium",
                    cambio >= 0 ? "text-green-700" : "text-red-600"
                  )}
                >
                  {cambio >= 0 ? `Cambio: ${formatMoney(cambio)}` : `Falta: ${formatMoney(-cambio)}`}
                </p>
              )}
            </div>
          )}

          {error && (
            <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {error}
            </p>
          )}

          <button
            onClick={cobrar}
            disabled={cobrando || carrito.length === 0}
            className="flex h-14 w-full items-center justify-center gap-2 rounded-lg bg-green-600 text-lg font-bold text-white hover:bg-green-700 disabled:opacity-50"
          >
            {cobrando && <Loader2 size={20} className="animate-spin" />}
            Cobrar {formatMoney(total)}
          </button>
        </aside>
      </div>
    </div>
  );
}
