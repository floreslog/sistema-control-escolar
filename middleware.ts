import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET);
const COOKIE_NAME = 'session';

// Prefijos de ruta y que rol puede acceder a donde
const RUTAS_DOCENTE = '/docente';
const RUTAS_ALUMNO = '/alumno';

async function getSessionFromRequest(request: NextRequest) {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as { id: number; rol: 'docente' | 'alumno'; nombre: string };
  } catch {
    //el token es invalido oya expiro
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = await getSessionFromRequest(request);

  const esRutaDocente = pathname.startsWith(RUTAS_DOCENTE);
  const esRutaAlumno = pathname.startsWith(RUTAS_ALUMNO);
  const esRutaProtegida = esRutaDocente || esRutaAlumno;

  // Caso 1: ruta protegida sin sesión -> mandar a login
  if (esRutaProtegida && !session) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname); // para regresarlo después de loguear
    return NextResponse.redirect(loginUrl);
  }

  // Caso 2: sesión existe pero el rol no coincide con la sección -> 403 (o redirigir a su propia área)
  if (session && esRutaDocente && session.rol !== 'docente') {
    return NextResponse.redirect(new URL('/alumno', request.url));
  }
  if (session && esRutaAlumno && session.rol !== 'alumno') {
    return NextResponse.redirect(new URL('/docente', request.url));
  }

  // Caso 3: ya logueado e intenta ir a /login o /registro -> mandarlo a su dashboard
  if (session && (pathname === '/login' || pathname === '/registro')) {
    const destino = session.rol === 'docente' ? '/docente' : '/alumno';
    return NextResponse.redirect(new URL(destino, request.url));
  }

  return NextResponse.next();
}

// decirle a next en que rutas debe correr el middleware
// se van a excluir archivos estáticos, imágenes y las API routes de Next internas
export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};