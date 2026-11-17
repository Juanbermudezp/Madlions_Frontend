/**
 * Tipos y utilidades del control de acceso (H10). Se usan en el servidor y
 * en el navegador: no importan nada del servidor de Next.
 */

import type { EstadoMembresia } from './membresias';

export type EstadoAcceso = 'DENTRO' | 'SALIO' | 'CERRADO_AUTO';

export const ETIQUETA_ESTADO_ACCESO: Record<EstadoAcceso, string> = {
    DENTRO: 'Dentro',
    SALIO: 'Salió',
    CERRADO_AUTO: 'Cerrado automáticamente',
};

export const COLOR_ESTADO_ACCESO: Record<EstadoAcceso, string> = {
    DENTRO: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200',
    SALIO: 'bg-zinc-200 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-100',
    CERRADO_AUTO: 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200',
};

/** Registro tal como lo devuelve GET /accesos/hoy. */
export interface AccesoDelDia {
    id: string;
    miembro: { nombre: string; codigo: string };
    ingresoEn: string;
    salidaEn: string | null;
    estado: EstadoAcceso;
}

/** Resultado de una Server Action. `estado` es el código HTTP del error, si lo hubo. */
export type Resultado<T> = { ok: true; datos: T } | { ok: false; error: string; estado?: number };

/** La lista del día se refresca cada 30 segundos. */
export const REFRESCO_MS = 30_000;

export const MENSAJES_ACCESO = {
    ingreso: 'Ingreso registrado',
    salida: 'Salida registrada',
    vacio: 'Aún no hay ingresos hoy',
    ingresoExcepcion: 'Ingreso registrado con excepción',
} as const;

/** "2026-11-16T15:05:00.000Z" → "09:05" en hora de El Salvador. */
export function horaLocal(instante: string): string {
    return new Intl.DateTimeFormat('en-GB', {
        timeZone: 'America/El_Salvador',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
    }).format(new Date(instante));
}

export const ESTADOS_CON_EXCEPCION: readonly EstadoMembresia[] = [
    'VENCIDA',
    'PENDIENTE_PAGO',
    'SIN_MEMBRESIA',
];

export const MOTIVO_MIN = 10;
export const MOTIVO_MAX = 250;

export type NivelAlerta = 'verde' | 'amarillo' | 'rojo' | 'neutro';

/** Verde Vigente, amarillo Próxima a vencer, rojo los que requieren excepción; Por iniciar queda neutro. */
export function nivelAlerta(estado: EstadoMembresia): NivelAlerta {
    if (estado === 'VIGENTE') return 'verde';
    if (estado === 'PROXIMA_A_VENCER') return 'amarillo';
    if (ESTADOS_CON_EXCEPCION.includes(estado)) return 'rojo';
    return 'neutro';
}

export const COLOR_ALERTA: Record<NivelAlerta, string> = {
    verde: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200',
    amarillo: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-200',
    rojo: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
    neutro: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200',
};

export const ALERTA_ROJA: Partial<Record<EstadoMembresia, string>> = {
    VENCIDA: 'Membresía vencida. Para dejarlo pasar, registra un motivo de excepción.',
    PENDIENTE_PAGO: 'Membresía pendiente de pago. Para dejarlo pasar, registra un motivo de excepción.',
    SIN_MEMBRESIA: 'El miembro no tiene membresía. Para dejarlo pasar, registra un motivo de excepción.',
};

/** Fecha de hoy (AAAA-MM-DD) en El Salvador. */
export function hoyLocal(ahora: Date = new Date()): string {
    return new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/El_Salvador',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).format(ahora);
}

/** Días entre hoy y la fecha de vencimiento (ambas AAAA-MM-DD). */
export function diasHasta(fecha: string, hoy: string): number {
    return Math.round((Date.parse(`${fecha}T00:00:00Z`) - Date.parse(`${hoy}T00:00:00Z`)) / 86_400_000);
}

/** "Vence en 3 días (20/11/2026)", "Vence en 1 día (…)" o "Vence hoy (…)". */
export function textoVencimiento(dias: number, fecha: string): string {
    if (dias <= 0) return `Vence hoy (${fecha})`;
    if (dias === 1) return `Vence en 1 día (${fecha})`;
    return `Vence en ${dias} días (${fecha})`;
}