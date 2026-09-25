import pool from './db';

// Primera capa - Rate limiting en memoria SOLO POR IP 

interface IntentoIP {
  conteo: number;
  primerIntento: number;
}

const intentosPorIP = new Map<string, IntentoIP>();

const VENTANA_MS = 60 * 1000; // vale 1 minuto
const MAX_INTENTOS_IP = 10;   // 10 intentos de inicio por IP cada minuto

export function checarRateLimitIP(ip: string): { permitido: boolean; segundosEspera?: number } {
  const ahora = Date.now();
  const registro = intentosPorIP.get(ip);

  if (!registro || ahora - registro.primerIntento > VENTANA_MS) {
    intentosPorIP.set(ip, { conteo: 1, primerIntento: ahora });
    return { permitido: true };
  }

  if (registro.conteo >= MAX_INTENTOS_IP) {
    const segundosEspera = Math.ceil((VENTANA_MS - (ahora - registro.primerIntento)) / 1000);
    return { permitido: false, segundosEspera };
  }

  registro.conteo++;
  return { permitido: true };
}

// Limpieza cada 10 minutos para que el map no crezca
setInterval(() => {
  const ahora = Date.now();
  for (const [ip, registro] of intentosPorIP.entries()) {
    if (ahora - registro.primerIntento > VENTANA_MS) {
      intentosPorIP.delete(ip);
    }
  }
}, 10 * 60 * 1000);

// Segunda capa - Bloquear la cuenta en la base de datos

const MAX_INTENTOS_CUENTA = 5;
const MINUTOS_BLOQUEO = 15;

type Tabla = 'Docente' | 'Alumno';

export async function verificarBloqueoCuenta(
  tabla: Tabla,
  columnaId: string,
  id: number
): Promise<{ bloqueado: boolean; minutosRestantes?: number }> {
  const result = await pool.query(
    `SELECT BloqueadoHasta FROM ${tabla} WHERE ${columnaId} = $1`,
    [id]
  );

  const bloqueadoHasta = result.rows[0]?.bloqueadohasta;
  if (!bloqueadoHasta) return { bloqueado: false };

  const ahora = new Date();
  const fechaBloqueo = new Date(bloqueadoHasta);

  if (fechaBloqueo > ahora) {
    const minutosRestantes = Math.ceil((fechaBloqueo.getTime() - ahora.getTime()) / 60000);
    return { bloqueado: true, minutosRestantes };
  }

  return { bloqueado: false };
}

export async function registrarIntentoFallido(
  tabla: Tabla,
  columnaId: string,
  id: number
): Promise<void> {
  const result = await pool.query(
    `UPDATE ${tabla}
     SET IntentosFallidos = IntentosFallidos + 1
     WHERE ${columnaId} = $1
     RETURNING IntentosFallidos`,
    [id]
  );

  const intentos = result.rows[0]?.intentosfallidos;

  if (intentos >= MAX_INTENTOS_CUENTA) {
    const bloqueadoHasta = new Date(Date.now() + MINUTOS_BLOQUEO * 60 * 1000);
    await pool.query(
      `UPDATE ${tabla} SET BloqueadoHasta = $1 WHERE ${columnaId} = $2`,
      [bloqueadoHasta, id]
    );
  }
}

export async function reiniciarIntentosFallidos(
  tabla: Tabla,
  columnaId: string,
  id: number
): Promise<void> {
  await pool.query(
    `UPDATE ${tabla} SET IntentosFallidos = 0, BloqueadoHasta = NULL WHERE ${columnaId} = $1`,
    [id]
  );
}