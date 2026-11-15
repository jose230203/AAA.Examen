import { requirePage } from "@/lib/permisos";

export default async function Page() {
  await requirePage(["ADMIN","ENCARGADO"]);
  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Traspasos</h1>
      <p className="mt-2 text-slate-500">Módulo en construcción.</p>
    </div>
  );
}
