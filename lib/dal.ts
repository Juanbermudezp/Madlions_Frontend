import { cache } from 'react';
import { api, SesionInvalidaError } from './api';
import { obtenerToken } from './session';
import type { Usuario } from './roles';

/**
 * Capa de acceso a la sesión.
 * Es el único lugar del frontend que decide quién es el usuario ya que llama a GET /auth/me.
 * Va envuelto en `cache()` de React, así que aunque el layout, el menú y la
 * página lo pidan por separado, la API se consulta una sola vez por render.
 */

export const obtenerUsuario = cache(async (): Promise<Usuario | null> => {
  if (!(await obtenerToken())) return null;

  try {
    return await api<Usuario>('auth/me');
  } catch (error) {
    // Token vencido o revocado: se trata como que no hay sesión. Las cookies no
    // se pueden borrar durante el render, de eso se encarga proxy.ts al
    // detectar el vencimiento, o la Server Action de cierre de sesión.
    if (error instanceof SesionInvalidaError) return null;
    throw error;
  }
});
