import { cookies } from 'next/headers';
import { COOKIE_REFRESH, COOKIE_TOKEN } from './token';

/**
 * Los tokens viven en cookies **httpOnly**, el navegador nunca los puede leer, así que un
 * XSS no se lleva la sesión. El token se agrega a cada petición desde el
 * servidor de Next, no desde el cliente.
 * Se guardan dos cookies: la de sesión y la de refresh.
 */

const OPCIONES_BASE = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
};

const DIAS_REFRESH = 7;

export async function crearSesion(
  accessToken: string,
  refreshToken: string,
  expiraEnSegundos: number,
) {
  const almacen = await cookies();

  almacen.set(COOKIE_TOKEN, accessToken, {
    ...OPCIONES_BASE,
    maxAge: expiraEnSegundos,
  });

  almacen.set(COOKIE_REFRESH, refreshToken, {
    ...OPCIONES_BASE,
    maxAge: DIAS_REFRESH * 24 * 60 * 60,
  });
}

export async function obtenerToken() {
  return (await cookies()).get(COOKIE_TOKEN)?.value;
}

export async function obtenerRefreshToken() {
  return (await cookies()).get(COOKIE_REFRESH)?.value;
}

// Borra las cookies de sesión.
export async function borrarSesion() {
  const almacen = await cookies();
  almacen.delete(COOKIE_TOKEN);
  almacen.delete(COOKIE_REFRESH);
}
