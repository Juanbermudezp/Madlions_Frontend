'use server';

import { revalidatePath } from 'next/cache';
import { api, ApiError, SesionInvalidaError } from '@/lib/api';
import { obtenerUsuario } from '@/lib/dal';
import type { ResultadoAccion } from '@/lib/clases';
import { ASISTENCIA_GUARDADA, type MarcaAsistencia } from '@/lib/asistencia';

/**
 * Registro de asistencia (H19, FE-19.1). Corre en el servidor de Next, que
 * reenvía el token httpOnly. El backend vuelve a validar la ventana y el
 * entrenador de cada marca.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function traducirError(error: unknown): ResultadoAccion {
  if (error instanceof SesionInvalidaError) {
    return { ok: false, error: 'Tu sesión expiró. Vuelve a iniciar sesión.' };
  }
  if (error instanceof ApiError) return { ok: false, error: error.message };

  console.error('Error al guardar la asistencia:', error);
  return { ok: false, error: 'No se pudo conectar con el servidor. Intenta de nuevo.' };
}

export async function guardarAsistencia(marcas: MarcaAsistencia[]): Promise<ResultadoAccion> {
  let usuario;
  try {
    usuario = await obtenerUsuario();
  } catch (error) {
    return traducirError(error);
  }

  if (!usuario) return { ok: false, error: 'Tu sesión expiró. Vuelve a iniciar sesión.' };
  if (usuario.rol !== 'ENTRENADOR') return { ok: false, error: 'Acceso denegado' };

  if (!Array.isArray(marcas) || marcas.length === 0) {
    return { ok: false, error: 'No hay cambios que guardar.' };
  }
  const invalida = marcas.some(
    (marca) =>
      !UUID.test(marca.registroId) ||
      (marca.tipo !== 'CLASE' && marca.tipo !== 'SESION') ||
      (marca.asistencia !== 'ASISTIO' && marca.asistencia !== 'NO_ASISTIO'),
  );
  if (invalida) return { ok: false, error: 'Hay una marca de asistencia inválida.' };

  try {
    await api('asistencia', { method: 'PUT', body: { marcas } });
  } catch (error) {
    return traducirError(error);
  }

  revalidatePath('/entrenador/asistencia');
  return { ok: true, mensaje: ASISTENCIA_GUARDADA };
}
