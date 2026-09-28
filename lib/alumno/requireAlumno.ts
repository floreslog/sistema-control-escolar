import { redirect } from 'next/navigation';
import { getSession, type SessionPayload } from '@/lib/auth';

/**
 * Exige una sesión válida de alumno. Si no la hay, redirige a /login.
 * Es la segunda barrera después del middleware: llámala en cada página
 * (los layouts no se re-ejecutan al navegar entre páginas hijas).
 */
export async function requireAlumno(): Promise<SessionPayload> {
  const session = await getSession();

  if (!session || session.rol !== 'alumno' || !Number.isInteger(session.id)) {
    redirect('/login');
  }

  return session;
}