/**
 * Tipos y utilidades del control de acceso (H10). Se usan en el servidor y
 * en el navegador: no importan nada del servidor de Next.
 */

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