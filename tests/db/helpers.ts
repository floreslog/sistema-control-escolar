import fs from 'node:fs';
import path from 'node:path';
import { Pool, type PoolClient } from 'pg';

//se niega a conectar si la BD no termina en _test
export function crearPoolPrueba(): Pool {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) {
    throw new Error(
      'Falta TEST_DATABASE_URL. Créala en .env.test.local (ver instrucciones de tests en el README).',
    );
  }

  const nombreBD = decodeURIComponent(new URL(url).pathname.replace(/^\//, ''));
  if (!nombreBD.endsWith('_test')) {
    throw new Error(
      `TEST_DATABASE_URL apunta a "${nombreBD}". Por seguridad el nombre debe terminar en "_test" ` +
        'porque los tests borran y recrean todo el esquema.',
    );
  }

  return new Pool({ connectionString: url });
}

export async function reiniciarBD(pool: Pool): Promise<void> {
  const archivo = path.resolve(process.cwd(), 'estructura_completa_postgresql.sql');
  const sql = fs.readFileSync(archivo, 'utf8');

  await pool.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
  await pool.query(sql);
}

export async function conRollback(
  pool: Pool,
  fn: (client: PoolClient) => Promise<void>,
): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await fn(client);
  } finally {
    await client.query('ROLLBACK').catch(() => undefined);
    client.release();
  }
}

export interface FilaKardex {
  inscripcionId: number;
  estado: string;
  promedio: number | null;
  calificacionFinal: number | null;
  oportunidadActual: number;
  capturados: number;
}


export async function leerKardex(
  db: Pool | PoolClient,
  matricula: string,
  ciclo: string,
  clave: string,
): Promise<FilaKardex> {
  const { rows } = await db.query(
    `SELECT inscripcionid, estado, promedio, calificacionfinal, oportunidadactual, parcialescapturados
       FROM vw_Kardex
      WHERE matricula = $1 AND nombreciclo = $2 AND clave = $3`,
    [matricula, ciclo, clave],
  );
  if (rows.length !== 1) {
    throw new Error(`Se esperaba 1 fila en vw_Kardex para ${matricula}/${ciclo}/${clave}, hay ${rows.length}`);
  }

  const r = rows[0];
  return {
    inscripcionId: Number(r.inscripcionid),
    estado: r.estado as string,
    promedio: r.promedio === null ? null : Number(r.promedio), // NUMERIC llega como string
    calificacionFinal: r.calificacionfinal === null ? null : Number(r.calificacionfinal),
    oportunidadActual: Number(r.oportunidadactual),
    capturados: Number(r.parcialescapturados),
  };
}
