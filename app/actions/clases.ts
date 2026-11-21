'use server';

import { revalidatePath } from 'next/cache';
import { api, ApiError, SesionInvalidaError } from '@/lib/api';
import { obtenerUsuario } from '@/lib/dal';
import {
  campoDelMensaje,
  validarClase,
  validarMotivoCancelacion,
  validarTipoClase,
  type DatosClase,
  type DatosTipoClase,
  type ResultadoAccion,
  type ResultadoCancelacionClase,
} from '@/lib/clases';

/**
 * Server Actions de la programación de clases (H4).
 * Corren en el servidor de Next, que reenvía el token httpOnly al backend.
 * El backend vuelve a validar todo y decide los permisos con @Roles; aquí se
 * revisa la sesión y los datos para responder rápido y con el campo exacto.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function verificarAdministrador(): Promise<ResultadoAccion | null> {
  let usuario;
  try {
    usuario = await obtenerUsuario();
  } catch (error) {
    // Backend apagado o inalcanzable: se informa en el formulario, sin error 500.
    return traducirError(error);
  }
  if (!usuario) return { ok: false, error: 'Tu sesión expiró. Vuelve a iniciar sesión.' };
  if (usuario.rol !== 'ADMINISTRADOR') return { ok: false, error: 'Acceso denegado' };
  return null;
}

function primerError(errores: Partial<Record<string, string>>): ResultadoAccion | null {
  const [campo, error] = Object.entries(errores)[0] ?? [];
  return campo && error ? { ok: false, error, campo } : null;
}

function traducirError(error: unknown): ResultadoAccion {
  if (error instanceof SesionInvalidaError) {
    return { ok: false, error: 'Tu sesión expiró. Vuelve a iniciar sesión.' };
  }
  if (error instanceof ApiError) {
    return { ok: false, error: error.message, campo: campoDelMensaje(error.message) };
  }
  console.error('Error al guardar en la API:', error);
  return { ok: false, error: 'No se pudo conectar con el servidor. Intenta de nuevo.' };
}

/** FE-4.1: crea (id = null) o edita un tipo de clase. */
export async function guardarTipoClase(
  id: string | null,
  datos: DatosTipoClase,
): Promise<ResultadoAccion> {
  const denegado = await verificarAdministrador();
  if (denegado) return denegado;
  if (id !== null && !UUID.test(id)) return { ok: false, error: 'El tipo de clase no existe.' };

  const cuerpo = { nombre: datos.nombre.trim(), descripcion: datos.descripcion.trim() };
  const invalido = primerError(validarTipoClase(cuerpo));
  if (invalido) return invalido;

  try {
    await api(id ? `tipos-clase/${id}` : 'tipos-clase', {
      method: id ? 'PATCH' : 'POST',
      body: cuerpo,
    });
  } catch (error) {
    return traducirError(error);
  }

  revalidatePath('/admin/tipos-clase');
  return { ok: true, mensaje: 'Tipo de clase guardado' };
}

/** FE-4.2: programa (id = null) o modifica una clase. */
export async function guardarClase(
  id: string | null,
  datos: DatosClase,
  reservasConfirmadas = 0,
): Promise<ResultadoAccion> {
  const denegado = await verificarAdministrador();
  if (denegado) return denegado;
  if (id !== null && !UUID.test(id)) return { ok: false, error: 'La clase no existe.' };

  const cuerpo: DatosClase = { ...datos, descripcion: datos.descripcion.trim() };
  const invalido = primerError(validarClase(cuerpo, { reservasConfirmadas }));
  if (invalido) return invalido;

  try {
    await api(id ? `clases/${id}` : 'clases', {
      method: id ? 'PATCH' : 'POST',
      body: cuerpo,
    });
  } catch (error) {
    return traducirError(error);
  }

  revalidatePath('/admin/clases');
  return { ok: true, mensaje: id ? 'Clase actualizada' : 'Clase programada' };
}

/**
 * FE-7.1 · Cancela una clase futura con su motivo (BE-7.1:
 * POST /clases/:id/cancelar). El backend cancela las reservas confirmadas y
 * avisa a los miembros; aquí solo se valida el motivo para responder rápido.
 */
export async function cancelarClase(id: string, motivo: string): Promise<ResultadoCancelacionClase> {
  const denegado = await verificarAdministrador();
  if (denegado) return { ok: false, error: denegado.ok ? 'Acceso denegado' : denegado.error };
  if (!UUID.test(id)) return { ok: false, error: 'La clase no existe.' };

  const invalido = validarMotivoCancelacion(motivo);
  if (invalido) return { ok: false, error: invalido, campo: 'motivo' };

  try {
    const { reservasCanceladas } = await api<{ id: string; estado: string; reservasCanceladas: number }>(
      `clases/${id}/cancelar`,
      { method: 'POST', body: { motivo: motivo.trim() } },
    );
    revalidatePath('/admin/clases');
    return { ok: true, reservasCanceladas };
  } catch (error) {
    if (error instanceof ApiError) {
      // 409: la clase ya empezó o ya estaba cancelada; la agenda se vuelve a pedir para mostrarlo.
      if (error.estado === 409) revalidatePath('/admin/clases');
      return { ok: false, error: error.message, campo: /motivo/i.test(error.message) ? 'motivo' : undefined };
    }
    const traducido = traducirError(error);
    return { ok: false, error: traducido.ok ? 'No se pudo cancelar la clase.' : traducido.error };
  }
}
