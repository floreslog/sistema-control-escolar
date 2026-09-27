import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Sidebar from '@/components/docente/Sidebar';

export default async function DocenteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  //si alguien llega aqui sin validacion lo redirige al login
  if (!session || session.rol !== 'docente') {
    redirect('/login');
  }

   /*
    @TODO: AQUI ES EL PANEL DEL DOCENTE, ESTO ES EL MODULO PRINCIPAL
  */
  return (
    <div className="min-h-screen bg-orange-50/30 flex">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <header className="flex items-center justify-between px-8 py-6">
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              Bienvenido, {session.nombre}
            </h1>
            <p className="text-sm text-gray-400">Panel del docente</p>
          </div>
          <span className="text-xs text-gray-400">Ago - Dic 2026</span>
        </header>

        <main className="flex-1 px-8 pb-8">{children}</main>
      </div>
    </div>
  );
}