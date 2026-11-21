'use server';

import { api, AccesoDenegadoError, ApiError, SesionInvalidaError } from '@/lib/api';
import {
    MENSAJES_HORARIOS,
    type Bloque,
    type ClaseEntrenador,
    type DatosBloque,
    type Resultado,
    type SemanaHorarios,
} from '@/lib/horarios';

/**
 * Server Actions de "Mis horarios" (H8). Corren en el servidor de Next, que
 * reenvía el token httpOnly. El backend saca el entrenador del token.
 */

function comoError(error: unknown, accion: string): Resultado<never> {
    if (error instanceof SesionInvalidaError) {
        return { ok: false, error: MENSAJES_HORARIOS.sesionExpirada, estado: 401 };
    }
    if (error instanceof AccesoDenegadoError) {
        return { ok: false, error: MENSAJES_HORARIOS.accesoDenegado, estado: 403 };
    }
    // 400 (datos inválidos), 404 (no existe) y 409 (traslape o bloque ocupado) traen el mensaje del backend.
    if (error instanceof ApiError) return { ok: false, error: error.message, estado: error.estado };
    console.error(`Error al ${accion}:`, error instanceof Error ? error.name : 'desconocido');
    return { ok: false, error: MENSAJES_HORARIOS.sinConexion };
}

/** Bloques y clases del entrenador en la semana de `semana` (cualquier día, AAAA-MM-DD). */
export async function obtenerSemanaHorarios(semana: string): Promise<Resultado<SemanaHorarios>> {
    try {
        const query = `?semana=${encodeURIComponent(semana)}`;
        const [bloques, clases] = await Promise.all([
            api<Bloque[]>(`bloques/mios${query}`),
            api<ClaseEntrenador[]>(`clases/mias${query}`),
        ]);
        return { ok: true, datos: { bloques, clases } };
    } catch (error) {
        return comoError(error, 'consultar los horarios');
    }
}

export async function crearBloque(datos: DatosBloque): Promise<Resultado> {
    try {
        await api<Bloque>('bloques', { method: 'POST', body: datos });
        return { ok: true, datos: undefined };
    } catch (error) {
        return comoError(error, 'crear el bloque');
    }
}

export async function eliminarBloque(id: string): Promise<Resultado> {
    try {
        await api<void>(`bloques/${encodeURIComponent(id)}`, { method: 'DELETE' });
        return { ok: true, datos: undefined };
    } catch (error) {
        return comoError(error, 'eliminar el bloque');
    }
}