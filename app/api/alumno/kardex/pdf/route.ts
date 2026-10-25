import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/auth';
import { obtenerDatosKardex } from '@/lib/alumno/kardex';
import { ZONA_HORARIA, generarKardexPdf } from '@/lib/alumno/kardexPdf';
import { nombreArchivoKardex } from '@/lib/alumno/kardexNombre';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const querySchema = z.object({
  ciclos: z
    .string()
    .regex(/^(todo|\d{1,9}(,\d{1,9}){0,49})$/)
    .default('todo'),
  materias: z.enum(['todas', 'aprobadas']).default('todas'),
});

function error(mensaje: string, status: number) {
  return NextResponse.json({ error: mensaje }, { status });
}

export async function GET(req: NextRequest) {
  // Esta ruta vive en /api, que el middleware no protege por rol:
  // la verificación de sesión y de rol se hace aquí.
  const session = await getSession();
  if (!session || session.rol !== 'alumno' || !Number.isInteger(session.id)) {
    return error('Tu sesión no es válida. Vuelve a iniciar sesión.', 401);
  }

  const parsed = querySchema.safeParse(
    Object.fromEntries(req.nextUrl.searchParams),
  );
  if (!parsed.success) {
    return error('Los filtros elegidos no son válidos.', 400);
  }

  const { ciclos, materias } = parsed.data;
  const idsCiclo =
    ciclos === 'todo'
      ? 'todo'
      : Array.from(new Set(ciclos.split(',').map(Number)));

  try {
    const datos = await obtenerDatosKardex({
      ciclos: idsCiclo,
      soloAprobadas: materias === 'aprobadas',
    });

    if (!datos) {
      return error('No se encontró tu cuenta de alumno.', 404);
    }
    if (datos.ciclos.length === 0) {
      return error('Ninguna materia coincide con los filtros elegidos.', 422);
    }

    const ahora = new Date();
    const pdf = await generarKardexPdf(datos, {
      emitidoEn: ahora,
      zonaHoraria: ZONA_HORARIA,
    });
    const nombre = nombreArchivoKardex(
      datos.alumno.nombreCompleto,
      ahora,
      ZONA_HORARIA,
    );

    return new NextResponse(new Uint8Array(pdf), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="kardex.pdf"; filename*=UTF-8''${encodeURIComponent(nombre)}`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (e) {
    console.error('Error al generar el kardex en PDF:', e);
    return error('No se pudo generar el PDF. Inténtalo de nuevo.', 500);
  }
}
