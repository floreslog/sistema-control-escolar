import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import LogoutButton from '@/components/LogoutButton';

export default async function AlumnoDashboard() {
  const session = await getSession();

  // Defensa extra además del middleware: si por alguna razón
  // se llega aquí sin sesión válida, redirige.
  if (!session || session.rol !== 'alumno') {
    redirect('/login');
  }

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <header className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Bienvenido, {session.nombre}
          </h1>
          <p className="text-sm text-gray-500">Panel del alumno</p>
        </div>
        <LogoutButton />
      </header>

      <section className="bg-white rounded-xl border border-gray-200 p-6">
        <p className="text-gray-600">
          Aquí van tus materias inscritas y tus calificaciones.
        </p>
      </section>
    </main>
  );
}