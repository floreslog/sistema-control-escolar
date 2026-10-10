export type ResultadoParseo = { ok: true; valor: number | null } | { ok: false };

export function parseCalificacion(texto: string): ResultadoParseo {
  const t = texto.trim();
  if (t === '') return { ok: true, valor: null };
  if (!/^\d{1,3}([.,]\d{1,2})?$/.test(t)) return { ok: false };

  const n = Number(t.replace(',', '.'));
  if (!Number.isFinite(n) || n < 0 || n > 100) return { ok: false };
  return { ok: true, valor: n };
}

/** 90 -> "90", 85.5 -> "85.5", 83.333 -> "83.33", null -> "". */
export function formatearCalif(valor: number | null): string {
  if (valor === null) return '';
  return String(Number(valor.toFixed(2)));
}