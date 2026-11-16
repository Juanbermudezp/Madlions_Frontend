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

/** Pantalla del comprobante de un pago aprobado. */
export const rutaComprobante = (numero: string) => `/miembro/comprobantes/${numero}`;

export const MENSAJES_PAGOS = {
  sinPendientes: 'No tienes pagos pendientes',
  sinPagados: 'Aún no tienes pagos realizados',
  noHabilitado: (fecha: string) => `No habilitado: podrás pagar desde el ${formatearFecha(fecha)}`,
  procesando: 'Procesando pago…',
  aprobado: 'Pago aprobado',
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

/** "2026-11-15T22:30:00.000Z" → "15/11/2026 16:30" en hora de El Salvador. */
export function fechaHoraDePago(instante: string): string {
  const hora = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'America/El_Salvador',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date(instante));
  return `${fechaDePago(instante)} ${hora}`;
}

// ---------------------------------------------------------------------------
// Pago con la pasarela simulada (FE-12.2)
// ---------------------------------------------------------------------------

/**
 * Datos de la tarjeta. Solo viven en el estado del formulario de pago: nunca
 * se guardan en Zustand, localStorage ni ningún almacenamiento persistente.
 */
export interface DatosTarjeta {
  titular: string;
  numero: string;
  vencimiento: string;
  cvv: string;
}

export type ResultadoPago = 'APROBADO' | 'RECHAZADO' | 'ERROR';

/** Respuesta de la Server Action de pago. */
export type RespuestaPago =
  | { ok: true; resultado: 'APROBADO'; referencia: string; comprobanteNumero: string }
  | { ok: true; resultado: 'RECHAZADO' | 'ERROR'; mensaje: string }
  | { ok: false; error: string };

/** Comprobante tal como lo devuelve GET /comprobantes/:numero. */
export interface Comprobante {
  numero: string;
  emitidoEn: string;
  miembro: { nombre: string; codigo: string };
  concepto: ConceptoCobro;
  detalle: string;
  subtotal: number;
  iva: number;
  total: number;
  referencia: string;
  ultimos4: string;
}

/** "4242424242424242" (o con espacios) → "4242 4242 4242 4242". */
export function formatearNumeroTarjeta(valor: string): string {
  return valor.replace(/\D/g, '').slice(0, 16).replace(/(\d{4})(?=\d)/g, '$1 ');
}

/** "1230" → "12/30" mientras se escribe. */
export function formatearVencimiento(valor: string): string {
  const digitos = valor.replace(/\D/g, '').slice(0, 4);
  return digitos.length > 2 ? `${digitos.slice(0, 2)}/${digitos.slice(2)}` : digitos;
}

function pasaLuhn(numero: string): boolean {
  let suma = 0;
  for (let i = 0; i < numero.length; i++) {
    let digito = Number(numero[numero.length - 1 - i]);
    if (i % 2 === 1) {
      digito *= 2;
      if (digito > 9) digito -= 9;
    }
    suma += digito;
  }
  return suma % 10 === 0;
}

/** Las mismas reglas que valida el backend. `hoy` en AAAA-MM-DD (hora de El Salvador). */
export function validarTarjeta(datos: DatosTarjeta, hoy: string): Partial<Record<keyof DatosTarjeta, string>> {
  const errores: Partial<Record<keyof DatosTarjeta, string>> = {};
  if (!/^[\p{L} .'-]{2,100}$/u.test(datos.titular.trim())) {
    errores.titular = 'El titular debe tener entre 2 y 100 letras.';
  }
  const numero = datos.numero.replace(/\s/g, '');
  if (!/^\d{16}$/.test(numero) || !pasaLuhn(numero)) {
    errores.numero = 'El número de tarjeta no es válido.';
  }
  const vence = /^(0[1-9]|1[0-2])\/(\d{2})$/.exec(datos.vencimiento);
  if (!vence || `20${vence[2]}-${vence[1]}` < hoy.slice(0, 7)) {
    errores.vencimiento = 'El vencimiento debe tener el formato MM/AA y no estar vencido.';
  }
  if (!/^\d{3,4}$/.test(datos.cvv)) {
    errores.cvv = 'El código de seguridad debe tener 3 o 4 dígitos.';
  }
  return errores;
}
