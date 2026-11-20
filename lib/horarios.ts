/**
 * Tipos y utilidades de "Mis horarios" del entrenador (H8). Se usan en el
 * servidor y en el navegador: no importan nada del servidor de Next. Las
 * fechas se muestran siempre en hora de El Salvador.
 */

import { fechaLocal, horaLocal, minutosDelDia } from './clases';

export {
    aInstante,
    diasDeLaSemana,
    etiquetaDiaCorta,
    etiquetaDiaLarga,
    etiquetaSemana,
    hoyLocal,
    lunesDe,
    sumarDias,
} from './clases';

/** Resultado de una Server Action. `estado` es el código HTTP del error, si lo hubo. */
export type Resultado<T = undefined> = { ok: true; datos: T } | { ok: false; error: string; estado?: number };

export type EstadoBloque = 'DISPONIBLE' | 'OCUPADO';

/** Bloque tal como lo devuelve GET /bloques/mios. */
export interface Bloque {
    id: string;
    inicio: string;
    fin: string;
    duracionMin: number;
    estado: EstadoBloque;
    /** Miembro que agendó la sesión (solo si está OCUPADO). */
    miembro: { nombre: string } | null;
}

/** Clase grupal del entrenador (GET /clases/mias). `nombre` es el tipo de clase. */
export interface ClaseEntrenador {
    id: string;
    nombre: string;
    inicio: string;
    fin: string;
}

/** Cuerpo de POST /bloques. */
export interface DatosBloque {
    fecha: string;
    horaInicio: string;
    duracionMin: number;
}

export interface SemanaHorarios {
    bloques: Bloque[];
    clases: ClaseEntrenador[];
}

/** Las mismas reglas que valida el backend (BE-8.1). */
export const DURACIONES = [45, 60, 90] as const;
export const DIAS_MAXIMOS = 28;
export const PRIMER_MINUTO = 5 * 60; // 05:00, primera hora visible y de inicio
export const ULTIMO_INICIO = 21 * 60; // 21:00, último inicio permitido
export const ULTIMO_MINUTO = 22 * 60 + 30; // 22:30, fin de la grilla (21:00 + 90 min)
export const PASO = 15;
/** Semanas hacia adelante que se pueden ver (28 días caben en 4 semanas más la actual). */
export const SEMANAS_ADELANTE = 4;
export const REFRESCO_MS = 30_000;

export const MENSAJES_HORARIOS = {
    registrado: 'Bloque registrado',
    eliminado: 'Bloque eliminado',
    sesionExpirada: 'Tu sesión expiró. Vuelve a iniciar sesión.',
    accesoDenegado: 'Acceso denegado',
    sinConexion: 'No se pudo conectar con el servidor. Intenta de nuevo.',
} as const;

/** Fecha (AAAA-MM-DD) y minutos desde las 00:00 de un instante, en El Salvador. */
export function partesLocales(instante: string): { fecha: string; minutos: number } {
    return { fecha: fechaLocal(instante), minutos: minutosDelDia(horaLocal(instante)) };
}

/** 435 -> "07:15". */
export function formatoHora(minutos: number): string {
    const h = String(Math.floor(minutos / 60)).padStart(2, '0');
    const m = String(minutos % 60).padStart(2, '0');
    return `${h}:${m}`;
}

interface EventoBase {
    id: string;
    fecha: string;
    /** Minutos desde las 00:00. */
    inicio: number;
    fin: number;
}

/** Lo que se pinta en el calendario: un bloque propio o una clase grupal. */
export type Evento =
    | (EventoBase & { tipo: 'bloque'; bloque: Bloque })
    | (EventoBase & { tipo: 'clase'; clase: ClaseEntrenador });

/** Une bloques y clases y los ordena por hora de inicio. */
export function aEventos({ bloques, clases }: SemanaHorarios): Evento[] {
    const eventos: Evento[] = [
        ...bloques.map((bloque): Evento => {
            const { fecha, minutos } = partesLocales(bloque.inicio);
            return { tipo: 'bloque', id: bloque.id, fecha, inicio: minutos, fin: minutos + bloque.duracionMin, bloque };
        }),
        ...clases.map((clase): Evento => {
            const inicio = partesLocales(clase.inicio);
            const fin = partesLocales(clase.fin);
            return {
                tipo: 'clase',
                id: clase.id,
                fecha: inicio.fecha,
                inicio: inicio.minutos,
                // Una clase que termina después de medianoche se corta al final del día.
                fin: fin.fecha === inicio.fecha ? fin.minutos : 24 * 60,
                clase,
            };
        }),
    ];
    return eventos.sort((a, b) => a.inicio - b.inicio);
}