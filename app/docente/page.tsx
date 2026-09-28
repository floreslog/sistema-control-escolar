import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import LogoutButton from '@/components/LogoutButton';

export default async function DocenteDashboard() {
  const session = await getSession();

  //si alguien llega aqui sin validacion lo redirige al login
  if (!session || session.rol !== 'docente') {
    redirect('/login');
  }

  /*
    @TODO: AQUI ES EL PANEL DEL DOCENTE, ESTO ES EL MODULO PRINCIPAL
  */
  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <header className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Bienvenido, {session.nombre}
          </h1>
          <p className="text-sm text-gray-500">Panel del docente</p>
        </div>
        <LogoutButton />
      </header>

      <section className="bg-white rounded-xl border border-gray-200 p-6">
        <p className="text-gray-600">
          Aquí van tus grupos, materias y captura de calificaciones.
        </p>
      </section>
    </main>
  );
}