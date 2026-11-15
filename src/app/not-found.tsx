import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3">
      <h1 className="text-3xl font-bold">404</h1>
      <p className="text-slate-500">La página que buscas no existe.</p>
      <Link href="/dashboard" className="rounded-lg bg-slate-900 px-4 py-2 text-white">
        Volver al inicio
      </Link>
    </main>
  );
}
