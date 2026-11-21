'use server';

import { api, ApiError, SesionInvalidaError } from '@/lib/api';
import type { AccesoDelDia, Resultado } from '@/lib/accesos';

/**
 * Server Actions del control de acceso (H10). Corren en el servidor de Next,
 * que reenvía el token httpOnly: el backend toma el usuario de recepción del
 * token y responde 403 "Acceso denegado" a los demás roles.
 */

function aError(error: unknown, contexto: string): { ok: false; error: string; estado?: number } {
    if (error instanceof SesionInvalidaError) {
        return { ok: false, error: 'Tu sesión expiró. Vuelve a iniciar sesión.', estado: 401 };
    }
    // 400, 403, 404 y 409 traen el mensaje para recepción.
    if (error instanceof ApiError) return { ok: false, error: error.message, estado: error.estado };
    console.error(contexto, error);
    return { ok: false, error: 'No se pudo conectar con el servidor. Intenta de nuevo.' };
}

export async function listarAccesosHoy(): Promise<Resultado<AccesoDelDia[]>> {
    try {
        return { ok: true, datos: await api<AccesoDelDia[]>('accesos/hoy') };
    } catch (error) {
        return aError(error, 'Error al consultar los ingresos del día:');
    }
}

export async function registrarIngreso(
    miembroId: string,
    motivoExcepcion?: string,
): Promise<Resultado<{ id: string }>> {
    try {
        return {
            ok: true,
            datos: await api<{ id: string }>('accesos/ingreso', {
                method: 'POST',
                body: motivoExcepcion ? { miembroId, motivoExcepcion } : { miembroId },
            }),
        };
    } catch (error) {
        return aError(error, 'Error al registrar el ingreso:');
    }
}

export async function registrarSalida(registroId: string): Promise<Resultado<{ id: string }>> {
    try {
        return {
            ok: true,
            datos: await api<{ id: string }>(`accesos/${encodeURIComponent(registroId)}/salida`, { method: 'POST' }),
        };
    } catch (error) {
        return aError(error, 'Error al registrar la salida:');
    }
}