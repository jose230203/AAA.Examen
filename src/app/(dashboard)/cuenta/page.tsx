import { requirePage } from "@/lib/permisos";
import { CambiarPasswordForm } from "@/components/cuenta/cambiar-password-form";

export default async function CuentaPage() {
  const user = await requirePage();

  return (
    <div className="max-w-md space-y-4">
      <h1 className="text-2xl font-bold text-slate-900">Mi cuenta</h1>

      <div className="rounded-xl bg-white p-5 shadow-sm">
        <p className="font-semibold text-slate-900">{user.name}</p>
        <p className="text-sm text-slate-500">{user.email}</p>
        <p className="mt-1 text-xs text-slate-500">
          {user.rol} · {user.sucursalNombre ?? "Todas las sucursales"}
        </p>
      </div>

      <div className="rounded-xl bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-lg font-bold text-slate-900">Cambiar contraseña</h2>
        <CambiarPasswordForm />
      </div>
    </div>
  );
}
