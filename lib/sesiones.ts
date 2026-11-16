/**
 * Tipos y utilidades de las sesiones personales (H9). Se usan en el servidor
 * y en el navegador: no importan nada del servidor de Next.
 */

const ZONA_HORARIA = 'America/El_Salvador';

/** Entrenador tal como lo devuelve GET /entrenadores. */
export interface Entrenador {
    id: string;
    nombre: string;
}

/** Bloque libre tal como lo devuelve GET /entrenadores/:id/bloques. */
export interface BloqueLibre {
    id: string;
    inicio: string;
    fin: string;
    duracionMin: number;
}

export interface BloquesEntrenador {
    bloques: BloqueLibre[];
    /** Precio vigente de la clase puntual, con 2 decimales ("10.00"). */
    precioClasePuntual: string;
}

/** Respuesta 201 de POST /sesiones. */
export interface SesionAgendada {
    id: string;
    inicio: string;
    fin: string;
    entrenador: string;
    precio: string;
    cobroId: string;
}

/** Resultado de una Server Action. `estado` es el código HTTP del error, si lo hubo. */
export type Resultado<T> =
    | { ok: true; datos: T }
    | { ok: false; error: string; estado?: number };

export const RUTA_MIS_PAGOS = '/miembro/pagos';

export const MENSAJES_SESIONES = {
    exito: 'Sesión agendada',
    sinBloques: 'Este entrenador no tiene horarios disponibles en los próximos 14 días',
    sinEntrenadores: 'Por ahora no hay entrenadores disponibles',
    aviso: (precio: string) =>
        `Se generará un cobro de $${precio} que puedes pagar en Mis pagos. Las sesiones no se pueden cancelar.`,
} as const;

/** "2026-11-17T13:00:00.000Z" → "2026-11-17" en hora de El Salvador. */
export function diaLocal(instante: string): string {
    return new Intl.DateTimeFormat('en-CA', {
        timeZone: ZONA_HORARIA,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).format(new Date(instante));
}

/** "2026-11-17T13:00:00.000Z" → "07:00" en hora de El Salvador. */
export function horaLocal(instante: string): string {
    return new Intl.DateTimeFormat('en-GB', {
        timeZone: ZONA_HORARIA,
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
    }).format(new Date(instante));
}

/** "2026-11-17" → "martes, 17 de noviembre". */
export function nombreDia(dia: string): string {
    return new Intl.DateTimeFormat('es-SV', {
        timeZone: 'UTC',
        weekday: 'long',
        day: 'numeric',
        month: 'long',
    }).format(new Date(`${dia}T00:00:00Z`));
}

export interface GrupoDia {
    dia: string;
    bloques: BloqueLibre[];
}

/** Agrupa por día los bloques (ya vienen ordenados por inicio desde la API). */
export function agruparPorDia(bloques: BloqueLibre[]): GrupoDia[] {
    const grupos: GrupoDia[] = [];
    for (const bloque of bloques) {
        const dia = diaLocal(bloque.inicio);
        const ultimo = grupos[grupos.length - 1];
        if (ultimo?.dia === dia) ultimo.bloques.push(bloque);
        else grupos.push({ dia, bloques: [bloque] });
    }
    return grupos;
}