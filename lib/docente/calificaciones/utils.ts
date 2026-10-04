export type ResultadoParseo = { ok: true; valor: number | null } | { ok: false };

/**
 * Convierte el texto de una celda: '' => null (pendiente, NO es 0).
 * Acepta 0-10 con hasta 2 decimales, con punto o coma.
 */
export function parseCalificacion(texto: string): ResultadoParseo {
  const t = texto.trim();
  if (t === '') return { ok: true, valor: null };
  if (!/^\d{1,2}([.,]\d{1,2})?$/.test(t)) return { ok: false };

  const n = Number(t.replace(',', '.'));
  if (!Number.isFinite(n) || n < 0 || n > 10) return { ok: false };
  return { ok: true, valor: n };
}

/** 8 -> "8", 8.5 -> "8.5", 8.333 -> "8.33", null -> "". */
export function formatearCalif(valor: number | null): string {
  if (valor === null) return '';
  return String(Number(valor.toFixed(2)));
}