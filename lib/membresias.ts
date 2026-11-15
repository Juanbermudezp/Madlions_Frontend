/**
 * Tipos y utilidades del registro de compras y renovaciones (H2).
 * Se usan tanto en el servidor como en el navegador: no importan nada del
 * servidor de Next.
 */

import type { TipoPlan } from './planes';

export const ESTADOS_MEMBRESIA = [
  'PENDIENTE_PAGO',
  'POR_INICIAR',
  'VIGENTE',
  'PROXIMA_A_VENCER',
  'VENCIDA',
  'SIN_MEMBRESIA',
] as const;

export type EstadoMembresia = (typeof ESTADOS_MEMBRESIA)[number];

export const ETIQUETA_ESTADO_MEMBRESIA: Record<EstadoMembresia, string> = {
  PENDIENTE_PAGO: 'Pendiente de pago',
  POR_INICIAR: 'Por iniciar',
  VIGENTE: 'Vigente',
  PROXIMA_A_VENCER: 'Próxima a vencer',
  VENCIDA: 'Vencida',
  SIN_MEMBRESIA: 'Sin membresía',
};

/** Clases de color de la etiqueta de cada estado (claro y oscuro). */
export const COLOR_ESTADO_MEMBRESIA: Record<EstadoMembresia, string> = {
  VIGENTE: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200',
  PROXIMA_A_VENCER: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200',
  POR_INICIAR: 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-200',
  PENDIENTE_PAGO: 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-200',
  VENCIDA: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
  SIN_MEMBRESIA: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',
};

export type TipoOperacion = 'COMPRA' | 'RENOVACION';

export const ETIQUETA_OPERACION: Record<TipoOperacion, string> = {
  COMPRA: 'Compra',
  RENOVACION: 'Renovación',
};

/** Miembro tal como lo devuelve GET /miembros/buscar para recepción. */
export interface MiembroEncontrado {
  id: string;
  nombre: string;
  apellido: string;
  codigo: string;
  documento: string;
  estadoMembresia: EstadoMembresia;
  fechaVencimiento: string | null;
}

/** Respuesta de GET /membresias/resumen. */
export interface ResumenOperacion {
  miembro: { id: string; nombre: string; apellido: string; codigo: string };
  plan: {
    id: string;
    nombre: string;
    tipo: TipoPlan;
    cantidadClases: number | null;
    tiposClase: { id: string; nombre: string }[];
  };
  precio: number;
  beneficios: string;
  duracionDias: number;
  tipoOperacion: TipoOperacion;
  fechaInicio: string;
  fechaVencimiento: string;
  /** true en la renovación de una membresía vigente: la fecha no se puede cambiar. */
  fechaInicioFija: boolean;
}

/** Resultado de las Server Actions de este módulo. */
export type Resultado<T> = { ok: true; datos: T } | { ok: false; error: string };

export const MENSAJE_REGISTRADA =
  'Operación registrada. Estado: Pendiente de pago. El miembro paga desde su cuenta en Mis pagos.';

export const SIN_RESULTADOS = 'No se encontraron miembros';

/** Días hacia adelante que recepción puede elegir como inicio (igual que el backend). */
export const DIAS_MAXIMOS_INICIO = 30;

// ---------------------------------------------------------------------------
// Validaciones (las mismas reglas que el backend)
// ---------------------------------------------------------------------------

export const BUSQUEDA_INVALIDA = 'La búsqueda debe tener entre 2 y 50 caracteres.';
export const FECHA_INICIO_INVALIDA = 'La fecha de inicio debe estar entre hoy y los próximos 30 días';

export function validarBusqueda(texto: string): string | null {
  const n = texto.trim().length;
  return n >= 2 && n <= 50 ? null : BUSQUEDA_INVALIDA;
}

/** `hoy` y `fecha` en AAAA-MM-DD; `limite` es hoy + 30 días. */
export function validarFechaInicio(fecha: string, hoy: string, limite: string): string | null {
  return /^\d{4}-\d{2}-\d{2}$/.test(fecha) && fecha >= hoy && fecha <= limite
    ? null
    : FECHA_INICIO_INVALIDA;
}

/** "2026-12-19" -> "19/12/2026" */
export function formatearFecha(fecha: string): string {
  const [a, m, d] = fecha.split('-');
  return `${d}/${m}/${a}`;
}
