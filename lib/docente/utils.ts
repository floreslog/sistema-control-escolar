export const TAM_PAGINA = 20;

export function parseId(valor: string | number | null | undefined): number | null {
  const n = Number(valor);
  return Number.isInteger(n) && n > 0 && n <= 2147483647 ? n : null;
}
export function patronLike(q: string): string {
  const limpio = q.trim().slice(0, 100);
  if (!limpio) return '';
  return '%' + limpio.replace(/[\\%_]/g, '\\$&') + '%';
}

export function plural(n: number, singular: string, pluralTxt: string): string {
  return `${n} ${n === 1 ? singular : pluralTxt}`;
}