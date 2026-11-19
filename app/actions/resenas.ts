'use server';

import { revalidatePath } from 'next/cache';
import { api, ApiError, SesionInvalidaError } from '@/lib/api';
import { obtenerUsuario } from '@/lib/dal';
import type { ResultadoAccion } from '@/lib/clases';
import {
  ASPECTOS,
  CALIFICA_AL_MENOS_UN_ASPECTO,
  esCalificacionValida,
  GRACIAS_POR_TU_RESENA,
  hayAlgunaCalificacion,
  MAXIMO_COMENTARIO,
  type DatosResena,
} from '@/lib/resenas';

/**
 * Guarda la reseña de una clase o sesión (H20, FE-20.1). Corre en el servidor
 * de Next, que reenvía el token httpOnly. El backend vuelve a validar la
 * asistencia, el plazo y que no exista una reseña previa.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function traducirError(error: unknown): ResultadoAccion {
  if (error instanceof SesionInvalidaError) {
    return { ok: false, error: 'Tu sesión expiró. Vuelve a iniciar sesión.' };
  }
  if (error instanceof ApiError) return { ok: false, error: error.message };

  console.error('Error al guardar la reseña:', error);
  return { ok: false, error: 'No se pudo conectar con el servidor. Intenta de nuevo.' };
}

export async function guardarResena(datos: DatosResena): Promise<ResultadoAccion> {
  let usuario;
  try {
    usuario = await obtenerUsuario();
  } catch (error) {
    return traducirError(error);
  }

  if (!usuario) return { ok: false, error: 'Tu sesión expiró. Vuelve a iniciar sesión.' };
  if (usuario.rol !== 'MIEMBRO') return { ok: false, error: 'Acceso denegado' };

  if (!UUID.test(datos.registroId)) {
    return { ok: false, error: 'La clase o sesión no existe.' };
  }
  if (datos.tipo !== 'CLASE' && datos.tipo !== 'SESION') {
    return { ok: false, error: 'El tipo debe ser CLASE o SESION.' };
  }
  if (!hayAlgunaCalificacion(datos)) {
    return { ok: false, error: CALIFICA_AL_MENOS_UN_ASPECTO };
  }
  const fueraDeRango = ASPECTOS.some((aspecto) => {
    const valor = datos[aspecto];
    return valor !== undefined && !esCalificacionValida(valor);
  });
  if (fueraDeRango) {
    return { ok: false, error: 'Cada calificación debe ser un entero de 1 a 5.' };
  }
  if (datos.comentario !== undefined && datos.comentario.length > MAXIMO_COMENTARIO) {
    return { ok: false, error: `El comentario puede tener hasta ${MAXIMO_COMENTARIO} caracteres.` };
  }

  try {
    await api('resenas', { method: 'POST', body: datos });
  } catch (error) {
    return traducirError(error);
  }

  revalidatePath('/miembro/calificar');
  return { ok: true, mensaje: GRACIAS_POR_TU_RESENA };
}
