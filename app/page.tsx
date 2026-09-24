import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function Home() {
  const session = await getSession();

  if (session) {
    redirect(session.rol === 'docente' ? '/docente' : '/alumno');
  }

  redirect('/login');
}