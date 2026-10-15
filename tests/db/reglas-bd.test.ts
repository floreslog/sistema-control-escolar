import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { Pool } from 'pg';

vi.mock('next/headers', () => ({ cookies: vi.fn() }));

import { verifyPassword } from '@/lib/auth';
import { conRollback, crearPoolPrueba, leerKardex, reiniciarBD } from './helpers';

let pool: Pool;

beforeAll(async () => {
  pool = crearPoolPrueba();
  await reiniciarBD(pool); // esquema + datos de prueba del .sql
});

afterAll(async () => {
  await pool?.end();
});

describe('parámetros', () => {
  it('escala 0-100: mínima aprobatoria 70 y 3 parciales', async () => {
    const { rows } = await pool.query(
      'SELECT CalificacionMinima AS minima, NumParciales AS parciales FROM Parametro',
    );
    expect(rows).toHaveLength(1);
    expect(Number(rows[0].minima)).toBe(70);
    expect(Number(rows[0].parciales)).toBe(3);
  });
});

describe('estado y calificación final (vw_ResultadoAsignatura / vw_Kardex)', () => {
  const casos = [
    {
      nombre: 'Ricardo 70/70/70 aprueba justo en el mínimo',
      matricula: '22021089', ciclo: '2026-2', clave: 'AED-1286',
      estado: 'Aprobado', promedio: 70, final: 70, oportunidad: 1, capturados: 3,
    },
    {
      nombre: 'Luis aprueba en el ordinario',
      matricula: '22022096', ciclo: '2026-2', clave: 'AED-1286',
      estado: 'Aprobado', promedio: 90, final: 90, oportunidad: 1, capturados: 3,
    },
    {
      nombre: 'Luis con solo 2 de 3 parciales sigue en curso',
      matricula: '22022096', ciclo: '2026-2', clave: 'ACA-0909',
      estado: 'En curso', promedio: 92.5, final: 92.5, oportunidad: 1, capturados: 2,
    },
    {
      nombre: 'Karla reprobó el ordinario: pendiente de extraordinario',
      matricula: '22020214', ciclo: '2026-2', clave: 'RED-1015',
      estado: 'Pendiente de extraordinario', promedio: 50, final: 50, oportunidad: 1, capturados: 3,
    },
    {
      nombre: 'Héctor enviado a extraordinario sin calificación',
      matricula: '22021128', ciclo: '2026-2', clave: 'AED-1286',
      estado: 'En extraordinario', promedio: 48.33, final: 48.33, oportunidad: 2, capturados: 3,
    },
    {
      nombre: 'Óscar reprobó la 1ra extra: pendiente la siguiente',
      matricula: '22021163', ciclo: '2026-2', clave: 'AED-1286',
      estado: 'Pendiente siguiente extraordinario', promedio: 50, final: 50, oportunidad: 2, capturados: 3,
    },
    {
      nombre: 'Luis reprobó el ordinario y aprobó la 1ra extra',
      matricula: '22022096', ciclo: '2026-1', clave: 'SCD-1008',
      estado: 'Aprobado', promedio: 50, final: 75, oportunidad: 2, capturados: 3,
    },
    {
      nombre: 'José reprobó las dos extraordinarias: reprobado definitivo',
      matricula: '22021045', ciclo: '2026-1', clave: 'MAT-1010',
      estado: 'Reprobado', promedio: 45, final: 55, oportunidad: 3, capturados: 3,
    },
  ];

  it.each(casos)('$nombre', async (c) => {
    const r = await leerKardex(pool, c.matricula, c.ciclo, c.clave);
    expect(r.estado).toBe(c.estado);
    expect(r.promedio).toBe(c.promedio);
    expect(r.calificacionFinal).toBe(c.final);
    expect(r.oportunidadActual).toBe(c.oportunidad);
    expect(r.capturados).toBe(c.capturados);
  });
});

describe('límite de aprobación (70)', () => {
  it('un promedio de 69.67 NO aprueba', () =>
    conRollback(pool, async (client) => {
      const { inscripcionId } = await leerKardex(client, '22021089', '2026-2', 'AED-1286');
      await client.query(
        'UPDATE CalificacionParcial SET Calificacion = 69 WHERE InscripcionID = $1 AND NumeroParcial = 1',
        [inscripcionId],
      );

      const r = await leerKardex(client, '22021089', '2026-2', 'AED-1286');
      expect(r.promedio).toBe(69.67);
      expect(r.estado).toBe('Pendiente de extraordinario');
    }));

  it('un extraordinario de 70 aprueba', () =>
    conRollback(pool, async (client) => {
      const { inscripcionId } = await leerKardex(client, '22021128', '2026-2', 'AED-1286');
      await client.query('UPDATE Extraordinario SET Calificacion = 70 WHERE InscripcionID = $1', [inscripcionId]);

      const r = await leerKardex(client, '22021128', '2026-2', 'AED-1286');
      expect(r.estado).toBe('Aprobado');
      expect(r.calificacionFinal).toBe(70);
      expect(r.oportunidadActual).toBe(2);
    }));

  it('un extraordinario de 69.99 NO aprueba', () =>
    conRollback(pool, async (client) => {
      const { inscripcionId } = await leerKardex(client, '22021128', '2026-2', 'AED-1286');
      await client.query('UPDATE Extraordinario SET Calificacion = 69.99 WHERE InscripcionID = $1', [inscripcionId]);

      const r = await leerKardex(client, '22021128', '2026-2', 'AED-1286');
      expect(r.estado).toBe('Pendiente siguiente extraordinario');
    }));
});

describe('restricciones de rango en la BD (0 a 100)', () => {
  it('acepta exactamente 100 en un parcial', () =>
    conRollback(pool, async (client) => {
      const { inscripcionId } = await leerKardex(client, '22021089', '2026-2', 'AED-1286');
      await client.query(
        'UPDATE CalificacionParcial SET Calificacion = 100 WHERE InscripcionID = $1 AND NumeroParcial = 1',
        [inscripcionId],
      );
      const { rows } = await client.query(
        'SELECT Calificacion AS c FROM CalificacionParcial WHERE InscripcionID = $1 AND NumeroParcial = 1',
        [inscripcionId],
      );
      expect(Number(rows[0].c)).toBe(100);
    }));

  it.each([101, -1])('rechaza %s en un parcial', (valor) =>
    conRollback(pool, async (client) => {
      const { inscripcionId } = await leerKardex(client, '22021089', '2026-2', 'AED-1286');
      await expect(
        client.query(
          'UPDATE CalificacionParcial SET Calificacion = $2 WHERE InscripcionID = $1 AND NumeroParcial = 1',
          [inscripcionId, valor],
        ),
      ).rejects.toThrow(/check constraint/i);
    }));

  it.each([101, -1])('rechaza %s en un extraordinario', (valor) =>
    conRollback(pool, async (client) => {
      const { inscripcionId } = await leerKardex(client, '22021128', '2026-2', 'AED-1286');
      await expect(
        client.query('UPDATE Extraordinario SET Calificacion = $2 WHERE InscripcionID = $1', [inscripcionId, valor]),
      ).rejects.toThrow(/check constraint/i);
    }));
});

describe('credenciales de prueba documentadas en el README', () => {
  it('docente EMP-0001 / docente123', async () => {
    const { rows } = await pool.query('SELECT PasswordHash AS hash FROM Docente WHERE NumeroEmpleado = $1', ['EMP-0001']);
    expect(await verifyPassword('docente123', rows[0].hash)).toBe(true);
    expect(await verifyPassword('otra-cosa', rows[0].hash)).toBe(false);
  });

  it('alumno 22022096 / alumno123', async () => {
    const { rows } = await pool.query('SELECT PasswordHash AS hash FROM Alumno WHERE Matricula = $1', ['22022096']);
    expect(await verifyPassword('alumno123', rows[0].hash)).toBe(true);
  });

  it('los demás alumnos no tienen contraseña (deben crearla)', async () => {
    const { rows } = await pool.query(
      'SELECT COUNT(*) AS n FROM Alumno WHERE Matricula <> $1 AND PasswordHash IS NOT NULL',
      ['22022096'],
    );
    expect(Number(rows[0].n)).toBe(0);
  });
});
