import { redirect } from 'next/navigation';
import { getSession, type SessionPayload } from '@/lib/auth';

//verificar que la sesion es valida de docente, si no mandar al /login
export async function requireDocente(): Promise<SessionPayload> {
  const session = await getSession();

  if (!session || session.rol !== 'docente' || !Number.isInteger(session.id)) {
    redirect('/login');
  }

  return session;
}