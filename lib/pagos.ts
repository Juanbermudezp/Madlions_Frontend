/**
 * Tipos y utilidades de "Mis pagos" (H12). Se usan en el servidor y en el
 * navegador: no importan nada del servidor de Next.
 */

import { formatearFecha } from './membresias';

export type EstadoCobro = 'PENDIENTE' | 'PAGADO';
export type ConceptoCobro = 'MEMBRESIA' | 'RENOVACION' | 'SESION_ADICIONAL';

export const ETIQUETA_CONCEPTO: Record<ConceptoCobro, string> = {
  MEMBRESIA: 'Membresía',
  RENOVACION: 'Renovación',
  SESION_ADICIONAL: 'Sesión adicional',
};

/** Cobro tal como lo devuelve GET /cobros/mios. */
export interface Cobro {
  id: string;
  concepto: ConceptoCobro;
  /** Plan, o fecha y entrenador de la sesión. */
  detalle: string;
  /** USD, IVA incluido. */
  monto: number;
  estado: EstadoCobro;
  /** Lo calcula el backend con la fecha de El Salvador. */
  habilitado: boolean;
  /** AAAA-MM-DD; null = se puede pagar desde que se generó. */
  habilitadoDesde: string | null;
  /** ISO; null si está pendiente. */
  pagadoEn: string | null;
  comprobanteNumero: string | null;
}

export type ResultadoCobros = { ok: true; cobros: Cobro[] } | { ok: false; error: string };

/** Destinos de los botones. Las pantallas las construyen las actividades del checkout y del comprobante. */
export const rutaPagar = (cobroId: string) => `/miembro/pagos/${cobroId}`;
export const rutaComprobante = (numero: string) => `/miembro/pagos/comprobantes/${numero}`;

export const MENSAJES_PAGOS = {
  sinPendientes: 'No tienes pagos pendientes',
  sinPagados: 'Aún no tienes pagos realizados',
  noHabilitado: (fecha: string) => `No habilitado: podrás pagar desde el ${formatearFecha(fecha)}`,
} as const;

/** "2026-11-15T22:30:00.000Z" → "15/11/2026" en hora de El Salvador. */
export function fechaDePago(instante: string): string {
  const dia = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/El_Salvador',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(instante));
  return formatearFecha(dia);
}
