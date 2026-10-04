import Link from 'next/link';
import { notFound } from 'next/navigation';
import BotonAccion from '@/components/BotonAccion';
import EstadoBadge from '@/components/EstadoBadge';
import PageHeader from '@/components/PageHeader';
import { CHIP, TARJETA } from '@/components/estilos';
import { requireDocente } from '@/lib/docente/requireDocente';
import { getAlumnoDetalle } from '@/lib/docente/alumnos/queries';
import { formatearCalif } from '@/lib/docente/calificaciones/utils';
import { parseId, plural } from '@/lib/docente/utils';
import { restablecerContrasenaAction } from '@/app/docente/alumnos/actions';
import type { MateriaKardex } from '@/lib/docente/alumnos/types';
import type { Estado } from '@/lib/alumno/types';

function Celda({ valor, minima }: { valor: number | null; minima: number }) {
  if (valor === null) return <span className="text-gray-400">—</span>;
  return (
    <span className={`font-semibold ${valor < minima ? 'text-red-600' : 'text-gray-900'}`}>
      {formatearCalif(valor)}
    </span>
  );
}

export default async function AlumnoDetallePage({
  params,
}: {
  params: Promise<{ alumnoId: string }>;
}) {
  await requireDocente();

  const { alumnoId: raw } = await params;
  const alumnoId = parseId(raw);
  if (!alumnoId) notFound();

  // Devuelve null si el alumno no es del docente en sesión.
  const data = await getAlumnoDetalle(alumnoId);
  if (!data) notFound();

  const { perfil, kardex, numParciales, calificacionMinima } = data;

  const porCiclo = new Map<string, MateriaKardex[]>();
  for (const m of kardex) {
    const lista = porCiclo.get(m.nombreCiclo) ?? [];
    lista.push(m);
    porCiclo.set(m.nombreCiclo, lista);
  }

  const aprobadas = kardex.filter((m) => m.estado === 'Aprobado').length;
  const parciales = Array.from({ length: numParciales }, (_, i) => i + 1);

  return (
    <div>
      <Link href="/docente/alumnos" className="text-sm font-medium text-[#666c73] hover:text-[#1a1d21]">
        ← Alumnos
      </Link>

      <PageHeader
        titulo={perfil.nombreCompleto}
        descripcion={[perfil.matricula, perfil.correo].filter(Boolean).join(' · ')}
      />

      <div className="mb-8 flex flex-wrap items-center gap-2">
        {!perfil.activo && <span className={CHIP}>Inactivo</span>}
        {perfil.grupos.map((g) => (
          <span key={g} className={CHIP}>
            {g}
          </span>
        ))}
      </div>

      {/* Kardex */}
      <section className="mb-10">
        <h2 className="text-base font-semibold text-gray-900">Kardex en tus materias</h2>
        <p className="mb-4 mt-1 text-sm text-gray-600">
          Solo se muestran las materias que tú impartes
          {kardex.length > 0 && ` · ${plural(kardex.length, 'materia', 'materias')}, ${aprobadas} aprobada${aprobadas === 1 ? '' : 's'}`}
          .
        </p>

        {kardex.length === 0 ? (
          <p className={`${TARJETA} p-5 text-sm text-gray-600`}>
            Este alumno todavía no está inscrito en ninguna materia tuya.
          </p>
        ) : (
          Array.from(porCiclo.entries()).map(([ciclo, lista]) => (
            <div key={ciclo} className="mb-6">
              <h3 className="mb-3 text-sm font-semibold text-gray-900">Ciclo {ciclo}</h3>
              <div className={`${TARJETA} overflow-x-auto`}>
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead className="border-b border-[#dcdfe3] bg-[#f9fafb] text-xs font-semibold text-[#666c73]">
                    <tr>
                      <th className="px-4 py-3">Materia</th>
                      <th className="px-4 py-3">Grupo</th>
                      {parciales.map((p) => (
                        <th key={p} className="px-2 py-3 text-center">
                          P{p}
                        </th>
                      ))}
                      <th className="px-3 py-3 text-center">Promedio</th>
                      <th className="px-3 py-3 text-center">Final</th>
                      <th className="px-4 py-3">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {lista.map((m) => (
                      <tr key={m.inscripcionId}>
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-900">{m.nombre}</p>
                          <p className="text-xs text-gray-500">
                            {m.clave}
                            {m.creditos !== null ? ` · ${plural(m.creditos, 'crédito', 'créditos')}` : ''}
                          </p>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-gray-700">{m.nombreGrupo}</td>
                        {parciales.map((p) => (
                          <td key={p} className="px-2 py-3 text-center">
                            <Celda valor={m.parciales[p - 1] ?? null} minima={calificacionMinima} />
                          </td>
                        ))}
                        <td className="px-3 py-3 text-center">
                          <Celda valor={m.promedio} minima={calificacionMinima} />
                        </td>
                        <td className="px-3 py-3 text-center">
                          <Celda valor={m.calificacionFinal} minima={calificacionMinima} />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col items-start gap-1">
                            <EstadoBadge estado={m.estado as Estado} />
                            {m.oportunidadActual > 1 && (
                              <span className="text-xs text-gray-500">{m.oportunidad}</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))
        )}
      </section>

      {/* Acceso */}
      <section>
        <h2 className="mb-3 text-base font-semibold text-gray-900">Acceso del alumno</h2>
        <div className={`${TARJETA} flex flex-wrap items-center justify-between gap-4 p-5`}>
          <div className="max-w-xl">
            <p className="text-sm font-medium text-gray-900">
              {!perfil.activo
                ? 'Cuenta inactiva'
                : perfil.sinContrasena
                  ? 'Pendiente de crear contraseña'
                  : 'Contraseña establecida'}
            </p>
            <p className="mt-1 text-sm text-gray-600">
              {perfil.sinContrasena
                ? 'El alumno creará su contraseña la próxima vez que inicie sesión.'
                : 'Si el alumno la olvidó, puedes restablecerla: quedará sin contraseña y deberá crear una nueva al iniciar sesión.'}
            </p>
          </div>

          {perfil.activo && !perfil.sinContrasena && (
            <BotonAccion
              accion={restablecerContrasenaAction.bind(null, perfil.alumnoId)}
              etiqueta="Restablecer contraseña"
              enCurso="Restableciendo…"
              confirmar={`¿Restablecer la contraseña de ${perfil.nombreCompleto}? Tendrá que crear una nueva al iniciar sesión.`}
            />
          )}
        </div>
      </section>
    </div>
  );
}