'use server';

import { revalidatePath } from 'next/cache';
import { api, ApiError } from '@/lib/api';
import { obtenerUsuario } from '@/lib/dal';
import { camposErrorRutina, cuerpoRutina, UUID_RUTINA, validarRutina, type DatosRutina, type MiembroRutina, type ResultadoRutina, type Rutina } from '@/lib/rutinas';

function fallo(error: unknown): Extract<ResultadoRutina<never>, { ok: false }> {
  if (error instanceof ApiError) {
    const mensaje = error.estado === 401 ? 'Tu sesión expiró. Vuelve a iniciar sesión.'
      : error.estado === 403 ? 'No tienes permiso para realizar esta operación.' : error.message;
    return { ok: false, error: mensaje, status: error.estado, campos: camposErrorRutina(error.datos) };
  }
  return { ok: false, error: 'No se pudo conectar con el servidor. Intenta de nuevo.' };
}

async function autorizar(): Promise<Extract<ResultadoRutina<never>, { ok: false }> | null> {
  try {
    const usuario = await obtenerUsuario();
    if (!usuario) return { ok: false, status: 401, error: 'Tu sesión expiró. Vuelve a iniciar sesión.' };
    if (usuario.rol !== 'ENTRENADOR') return { ok: false, status: 403, error: 'Acceso denegado.' };
    return null;
  } catch (error) { return fallo(error); }
}

export async function buscarMiembrosRutina(texto: string): Promise<ResultadoRutina<MiembroRutina[]>> {
  const denegado = await autorizar();
  if (denegado) return denegado;
  if (typeof texto !== 'string' || texto.trim().length < 2 || texto.trim().length > 50) return { ok: false, error: 'Escribe entre 2 y 50 caracteres.' };
  try { return { ok: true, datos: await api<MiembroRutina[]>(`miembros/buscar?q=${encodeURIComponent(texto.trim())}`) }; }
  catch (error) { return fallo(error); }
}

export async function listarRutinas(): Promise<ResultadoRutina<Rutina[]>> {
  const denegado = await autorizar();
  if (denegado) return denegado;
  try { return { ok: true, datos: await api<Rutina[]>('rutinas/creadas-por-mi') }; }
  catch (error) { return fallo(error); }
}

export async function crearRutina(miembroId: string, datos: DatosRutina): Promise<ResultadoRutina<Rutina>> {
  const denegado = await autorizar();
  if (denegado) return denegado;
  const campos = validarRutina(datos);
  if (!UUID_RUTINA.test(miembroId)) campos.miembroId = 'Selecciona un miembro válido.';
  if (Object.keys(campos).length) return { ok: false, status: 400, error: 'Revisa los campos indicados.', campos };
  let rutina: Rutina;
  try { rutina = await api<Rutina>('rutinas', { method: 'POST', body: { miembroId, ...cuerpoRutina(datos) } }); }
  catch (error) { return fallo(error); }
  revalidatePath('/entrenador/rutinas');
  return { ok: true, datos: rutina };
}

export async function actualizarRutina(id: string, datos: DatosRutina): Promise<ResultadoRutina<Rutina>> {
  const denegado = await autorizar();
  if (denegado) return denegado;
  if (!UUID_RUTINA.test(id)) return { ok: false, status: 400, error: 'Identificador de rutina inválido.' };
  // Solo el backend conoce la fecha almacenada; valida allí si puede conservarla.
  const campos = validarRutina(datos, { permitirPasada: true });
  if (Object.keys(campos).length) return { ok: false, status: 400, error: 'Revisa los campos indicados.', campos };
  let rutina: Rutina;
  try { rutina = await api<Rutina>(`rutinas/${encodeURIComponent(id)}`, { method: 'PUT', body: cuerpoRutina(datos) }); }
  catch (error) { return fallo(error); }
  revalidatePath('/entrenador/rutinas');
  return { ok: true, datos: rutina };
}
