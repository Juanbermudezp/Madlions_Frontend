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

/**
 * Clases de color de la etiqueta de cada estado (claro y oscuro). Los fija H3:
 * verde Vigente, amarillo Próxima a vencer, azul Por iniciar, gris Pendiente
 * de pago y rojo Vencida. Las usan "Mi membresía" (H3) y recepción (H2).
 */
export const COLOR_ESTADO_MEMBRESIA: Record<EstadoMembresia, string> = {
  VIGENTE: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200',
  PROXIMA_A_VENCER: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-200',
  POR_INICIAR: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200',
  PENDIENTE_PAGO: 'bg-zinc-200 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-100',
  VENCIDA: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
  SIN_MEMBRESIA: 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400',
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

// ---------------------------------------------------------------------------
// Mi membresía (H3)
// ---------------------------------------------------------------------------

/** Respuesta de GET /membresias/mia (objeto de BE-2.4). Fechas AAAA-MM-DD. */
export interface MiMembresia {
  estado: EstadoMembresia;
  membresiaId: string | null;
  plan: string | null;
  tipoPlan: TipoPlan | null;
  fechaInicio: string | null;
  fechaVencimiento: string | null;
  /** 0 = vence hoy. Solo en VIGENTE y PROXIMA_A_VENCER. */
  diasRestantes: number | null;
  creditosTotales: number | null;
  creditosDisponibles: number | null;
  tiposClaseIds: string[] | null;
  renovacion: { estado: 'PENDIENTE_PAGO' | 'POR_INICIAR'; fechaInicio: string } | null;
}

/** Ruta de "Mis pagos" (H12), donde el miembro paga sus cobros. */
export const RUTA_MIS_PAGOS = '/miembro/pagos';

/** Mensajes de los criterios de aceptación de H3. */
export const MENSAJES_MI_MEMBRESIA = {
  proximaAVencer: (fecha: string) =>
    `Tu membresía vence el ${formatearFecha(fecha)}. Acércate a recepción para registrar tu renovación.`,
  renovacionPendiente: 'Renovación pendiente de pago',
  renovacionPagada: (fecha: string) => `Renovación pagada: inicia el ${formatearFecha(fecha)}`,
  vencida: (fecha: string) => `Tu membresía venció el ${formatearFecha(fecha)}`,
  sinMembresia: 'No tienes una membresía. Acércate a recepción para adquirir un plan.',
  creditos: (disponibles: number, totales: number) =>
    `${disponibles} de ${totales} ${totales === 1 ? 'clase disponible' : 'clases disponibles'}`,
} as const;

/** "Vence hoy", "1 día restante", "20 días restantes". */
export function textoDiasRestantes(dias: number): string {
  if (dias <= 0) return 'Vence hoy';
  return dias === 1 ? '1 día restante' : `${dias} días restantes`;
}
