'use server';

import { api, AccesoDenegadoError, ApiError, SesionInvalidaError } from '@/lib/api';
import { obtenerUsuario } from '@/lib/dal';
import {
    MENSAJES_COBROS_ADMIN,
    queryCobros,
    type FiltrosCobros,
    type PaginaCobros,
    type Resultado,
} from '@/lib/cobros-admin';

/**
 * Server Action del panel de cobros (H13). Corre en el servidor de Next, que
 * reenvía el token httpOnly. Si la sesión no es de un ADMINISTRADOR no llama
 * a la API: así ningún otro rol recibe información administrativa. Quien
 * autoriza de verdad es el backend (403 "Acceso denegado").
 */
export async function listarCobrosAdmin(filtros: FiltrosCobros): Promise<Resultado<PaginaCobros>> {
    try {
        const usuario = await obtenerUsuario();
        if (!usuario) return { ok: false, error: MENSAJES_COBROS_ADMIN.sesionExpirada, estado: 401 };
        if (usuario.rol !== 'ADMINISTRADOR') {
            return { ok: false, error: MENSAJES_COBROS_ADMIN.accesoDenegado, estado: 403 };
        }

        return { ok: true, datos: await api<PaginaCobros>(`cobros?${queryCobros(filtros)}`) };
    } catch (error) {
        if (error instanceof SesionInvalidaError) {
            return { ok: false, error: MENSAJES_COBROS_ADMIN.sesionExpirada, estado: 401 };
        }
        if (error instanceof AccesoDenegadoError) {
            return { ok: false, error: MENSAJES_COBROS_ADMIN.accesoDenegado, estado: 403 };
        }
        // 400: filtro inválido (trae el mensaje del backend).
        if (error instanceof ApiError) return { ok: false, error: error.message, estado: error.estado };
        console.error('Error al consultar los cobros:', error instanceof Error ? error.name : 'desconocido');
        return { ok: false, error: MENSAJES_COBROS_ADMIN.sinConexion };
    }
}