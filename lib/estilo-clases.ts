/**
 * Colores compartidos de las clases (rediseño de H7): uno por tipo de clase y
 * uno por nivel de disponibilidad. Los tonos de los tipos (fucsia, celeste,
 * índigo, violeta…) nunca son los de la disponibilidad (verde, amarillo, rojo,
 * gris), para que no se confundan.
 *
 * Las clases de Tailwind van escritas completas: el compilador no ve las que
 * se arman por partes.
 */

export interface ColorTipo {
  /** Etiqueta del tipo (píldora). */
  chip: string;
  /** Bloque de la agenda semanal. */
  bloque: string;
  /** Barra de reservas del panel de detalle. */
  barra: string;
}

const PALETA: ColorTipo[] = [
  {
    chip: 'border-fuchsia-300 bg-fuchsia-50 text-fuchsia-800 dark:border-fuchsia-700 dark:bg-fuchsia-950 dark:text-fuchsia-200',
    bloque: 'border-fuchsia-400 bg-fuchsia-50 text-fuchsia-950 hover:bg-fuchsia-100 dark:border-fuchsia-500 dark:bg-fuchsia-950 dark:text-fuchsia-50 dark:hover:bg-fuchsia-900',
    barra: 'bg-fuchsia-500',
  },
  {
    chip: 'border-sky-300 bg-sky-50 text-sky-800 dark:border-sky-700 dark:bg-sky-950 dark:text-sky-200',
    bloque: 'border-sky-400 bg-sky-50 text-sky-950 hover:bg-sky-100 dark:border-sky-500 dark:bg-sky-950 dark:text-sky-50 dark:hover:bg-sky-900',
    barra: 'bg-sky-500',
  },
  {
    chip: 'border-indigo-300 bg-indigo-50 text-indigo-800 dark:border-indigo-700 dark:bg-indigo-950 dark:text-indigo-200',
    bloque: 'border-indigo-400 bg-indigo-50 text-indigo-950 hover:bg-indigo-100 dark:border-indigo-500 dark:bg-indigo-950 dark:text-indigo-50 dark:hover:bg-indigo-900',
    barra: 'bg-indigo-500',
  },
  {
    chip: 'border-violet-300 bg-violet-50 text-violet-800 dark:border-violet-700 dark:bg-violet-950 dark:text-violet-200',
    bloque: 'border-violet-400 bg-violet-50 text-violet-950 hover:bg-violet-100 dark:border-violet-500 dark:bg-violet-950 dark:text-violet-50 dark:hover:bg-violet-900',
    barra: 'bg-violet-500',
  },
  {
    chip: 'border-blue-300 bg-blue-50 text-blue-800 dark:border-blue-700 dark:bg-blue-950 dark:text-blue-200',
    bloque: 'border-blue-400 bg-blue-50 text-blue-950 hover:bg-blue-100 dark:border-blue-500 dark:bg-blue-950 dark:text-blue-50 dark:hover:bg-blue-900',
    barra: 'bg-blue-500',
  },
  {
    chip: 'border-purple-300 bg-purple-50 text-purple-800 dark:border-purple-700 dark:bg-purple-950 dark:text-purple-200',
    bloque: 'border-purple-400 bg-purple-50 text-purple-950 hover:bg-purple-100 dark:border-purple-500 dark:bg-purple-950 dark:text-purple-50 dark:hover:bg-purple-900',
    barra: 'bg-purple-500',
  },
];

/** Los tipos del seed tienen color fijo; los demás toman uno de la paleta según su id. */
const POR_NOMBRE: Record<string, number> = { yoga: 0, spinning: 1, crossfit: 2, box: 3 };

function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase();
}

/** Color de un tipo de clase. El mismo tipo tiene el mismo color en todas las pantallas. */
export function colorDeTipo(tipo: { id: string; nombre: string }): ColorTipo {
  const fijo = POR_NOMBRE[normalizar(tipo.nombre)];
  if (fijo !== undefined) return PALETA[fijo];
  let suma = 0;
  for (const letra of tipo.id) suma = (suma * 31 + letra.charCodeAt(0)) >>> 0;
  return PALETA[suma % PALETA.length];
}

// ---------------------------------------------------------------------------
// Disponibilidad por cupo
// ---------------------------------------------------------------------------

export type NivelDisponibilidad = 'verde' | 'amarillo' | 'rojo' | 'gris';

/** Desde qué fracción del cupo libre empieza cada color. */
export const UMBRAL_VERDE = 0.6;
export const UMBRAL_AMARILLO = 0.25;

/**
 * Nivel de disponibilidad de una clase según sus lugares libres:
 * - verde: 60 % o más del cupo libre;
 * - amarillo: entre 25 % y 60 %;
 * - rojo: menos del 25 % (quedan pocos);
 * - gris: ningún lugar libre.
 *
 * Sin el cupo máximo (una API anterior al rediseño) se usan cantidades fijas:
 * rojo con 3 o menos, amarillo con 6 o menos y verde con más.
 */
export function nivelDisponibilidad(lugaresLibres: number, cupoMaximo?: number | null): NivelDisponibilidad {
  if (lugaresLibres <= 0) return 'gris';
  if (!cupoMaximo || cupoMaximo <= 0) {
    if (lugaresLibres <= 3) return 'rojo';
    return lugaresLibres <= 6 ? 'amarillo' : 'verde';
  }
  const libre = lugaresLibres / cupoMaximo;
  if (libre >= UMBRAL_VERDE) return 'verde';
  if (libre >= UMBRAL_AMARILLO) return 'amarillo';
  return 'rojo';
}

export const ESTILO_DISPONIBILIDAD: Record<
  NivelDisponibilidad,
  { texto: string; pildora: string; punto: string; barra: string }
> = {
  verde: {
    texto: 'Disponible',
    pildora: 'border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
    punto: 'bg-emerald-500 dark:bg-emerald-400',
    barra: 'bg-emerald-500 dark:bg-emerald-400',
  },
  amarillo: {
    texto: 'Se está llenando',
    pildora: 'border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300',
    punto: 'bg-amber-500 dark:bg-amber-400',
    barra: 'bg-amber-500 dark:bg-amber-400',
  },
  rojo: {
    texto: 'Quedan pocos',
    pildora: 'border-red-300 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-300',
    punto: 'bg-red-500 dark:bg-red-400',
    barra: 'bg-red-500 dark:bg-red-400',
  },
  gris: {
    texto: 'Llena',
    pildora: 'border-zinc-300 bg-zinc-100 text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
    punto: 'bg-zinc-400 dark:bg-zinc-500',
    barra: 'bg-zinc-400 dark:bg-zinc-500',
  },
};
