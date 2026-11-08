/**
 * Nombres de las cookies de sesión y lectura del JWT.
 * El payload se lee sin verificar la firma. Sirve solo para decidir a dónde
 * redirigir. Quien valida de verdad el token es el backend en cada petición.
 */

import { esRol, type Rol } from './roles';

export const COOKIE_TOKEN = 'session';
export const COOKIE_REFRESH = 'refresh';

export interface PayloadToken {
  sub: string;
  email: string;
  rol: Rol;
  exp: number;
}

export function leerPayload(token: string | undefined): PayloadToken | null {
  if (!token) return null;

  const partes = token.split('.');
  if (partes.length !== 3) return null;

  try {
    const json = Buffer.from(partes[1], 'base64url').toString('utf8');
    const datos: unknown = JSON.parse(json);

    if (typeof datos !== 'object' || datos === null) return null;
    const { sub, email, rol, exp } = datos as Record<string, unknown>;

    if (typeof sub !== 'string' || typeof email !== 'string') return null;
    if (!esRol(rol) || typeof exp !== 'number') return null;

    return { sub, email, rol, exp };
  } catch {
    return null;
  }
}

export function tokenVencido(token: string | undefined): boolean {
  const payload = leerPayload(token);
  if (!payload) return true;
  return payload.exp * 1000 <= Date.now();
}

export function rolDelToken(token: string | undefined): Rol | null {
  return leerPayload(token)?.rol ?? null;
}
