// Clases Tailwind reutilizables 
export const FOCO =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-[#1f2328]';

export const BTN_PRIMARIO = `inline-flex h-10 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-[#1f2328] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#33393f] disabled:cursor-not-allowed disabled:opacity-60 ${FOCO}`;

export const BTN_SECUNDARIO = `inline-flex h-10 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-[#dcdfe3] bg-white px-4 text-sm font-semibold text-[#1a1d21] transition-colors hover:bg-[#f3f4f6] disabled:cursor-not-allowed disabled:opacity-60 ${FOCO}`;

export const BTN_PELIGRO = `inline-flex h-8 cursor-pointer items-center justify-center whitespace-nowrap rounded-lg border border-[#dcdfe3] bg-white px-3 text-xs font-semibold text-[#b3372f] transition-colors hover:border-red-200 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 ${FOCO}`;

export const INPUT = `h-10 w-full rounded-lg border border-[#dcdfe3] bg-white px-3 text-sm text-[#1a1d21] placeholder:text-[#9aa0a6] ${FOCO}`;

export const ETIQUETA = 'mb-1.5 block text-sm font-medium text-[#1a1d21]';

export const TARJETA = 'rounded-xl border border-[#dcdfe3] bg-white';

export const CHIP =
  'inline-flex items-center rounded-full border border-[#dcdfe3] bg-[#f3f4f6] px-2 py-0.5 text-xs font-medium text-[#666c73]';