'use server';

import { api, ApiError, SesionInvalidaError } from '@/lib/api';
import type {
    BloquesEntrenador,
    Entrenador,
    Resultado,
    Sesion,
    SesionAgendada,
} from '@/lib/sesiones';

/**
 * Server Actions de "Agendar sesión" (H9). Corren en el servidor de Next,
 * que reenvía el token httpOnly: el backend decide quién es el miembro y
 * valida todas las reglas (membresía, anticipación, límite, traslapes).
 */

function aError(error: unknown, contexto: string): { ok: false; error: string; estado?: number } {
    if (error instanceof SesionInvalidaError) {
        return { ok: false, error: 'Tu sesión expiró. Vuelve a iniciar sesión.', estado: 401 };
    }
    // 403, 404 y 409 traen el mensaje para el miembro (p. ej. "Este horario ya no está disponible").
    if (error instanceof ApiError) {
        return { ok: false, error: error.message, estado: error.estado };
    }
    console.error(contexto, error);
    return { ok: false, error: 'No se pudo conectar con el servidor. Intenta de nuevo.' };
}

export async function listarEntrenadores(): Promise<Resultado<Entrenador[]>> {
    try {
        return { ok: true, datos: await api<Entrenador[]>('entrenadores') };
    } catch (error) {
        return aError(error, 'Error al consultar los entrenadores:');
    }
}

export async function listarBloques(entrenadorId: string): Promise<Resultado<BloquesEntrenador>> {
    try {
        return {
            ok: true,
            datos: await api<BloquesEntrenador>(`entrenadores/${encodeURIComponent(entrenadorId)}/bloques`),
        };
    } catch (error) {
        return aError(error, 'Error al consultar los horarios del entrenador:');
    }
}

export async function agendarSesion(bloqueId: string): Promise<Resultado<SesionAgendada>> {
    try {
        return {
            ok: true,
            datos: await api<SesionAgendada>('sesiones', { method: 'POST', body: { bloqueId } }),
        };
    } catch (error) {
        return aError(error, 'Error al agendar la sesión:');
    }
}

/** "Mis sesiones": las del miembro del token, con el estado de su cobro. */
export async function listarMisSesiones(): Promise<Resultado<Sesion[]>> {
    try {
        return { ok: true, datos: await api<Sesion[]>('sesiones/mias') };
    } catch (error) {
        return aError(error, 'Error al consultar las sesiones:');
    }
}