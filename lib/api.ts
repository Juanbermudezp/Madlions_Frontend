import { obtenerToken } from './session';

/**
 * Cliente HTTP contra la API.
 * Corre siempre en el servidor de Next, que es quien tiene acceso a la cookie
 * httpOnly con el token.
 */

function urlBase(): string {
  const base = process.env.API_URL;
  if (!base) {
    throw new Error(
      'Falta la variable de entorno API_URL. Copiá .env.example a .env.',
    );
  }
  return base.replace(/\/?$/, '/');
}

export class ApiError extends Error {
  constructor(
    readonly estado: number,
    readonly datos: unknown,
    mensaje: string,
  ) {
    super(mensaje);
    this.name = 'ApiError';
  }
}

// 401: token ausente, inválido o expirado.
export class SesionInvalidaError extends ApiError {
  constructor(datos: unknown, mensaje: string) {
    super(401, datos, mensaje);
    this.name = 'SesionInvalidaError';
  }
}

// 403: el rol no tiene permiso, o el recurso es de otro usuario.
export class AccesoDenegadoError extends ApiError {
  constructor(datos: unknown, mensaje: string) {
    super(403, datos, mensaje);
    this.name = 'AccesoDenegadoError';
  }
}

interface OpcionesApi extends Omit<RequestInit, 'body'> {
  body?: unknown;
  conToken?: boolean;
}

// Mensaje de error del backend.
function mensajeDe(datos: unknown, respaldo: string): string {
  if (typeof datos === 'object' && datos !== null && 'message' in datos) {
    const { message } = datos as { message: unknown };
    if (typeof message === 'string') return message;
    if (Array.isArray(message) && typeof message[0] === 'string') return message[0];
  }
  return respaldo;
}

export async function api<T>(ruta: string, opciones: OpcionesApi = {}): Promise<T> {
  const { body, conToken = true, headers, ...resto } = opciones;

  const cabeceras = new Headers(headers);
  if (body !== undefined) cabeceras.set('Content-Type', 'application/json');

  if (conToken) {
    const token = await obtenerToken();
    if (token) cabeceras.set('Authorization', `Bearer ${token}`);
  }

  const respuesta = await fetch(new URL(ruta, urlBase()), {
    ...resto,
    headers: cabeceras,
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: 'no-store',
  });

  // 204 No Content.
  if (respuesta.status === 204) return undefined as T;

  const texto = await respuesta.text();
  const datos: unknown = texto ? JSON.parse(texto) : null;

  if (respuesta.ok) return datos as T;

  if (respuesta.status === 401) {
    throw new SesionInvalidaError(datos, mensajeDe(datos, 'Sesión inválida.'));
  }
  if (respuesta.status === 403) {
    throw new AccesoDenegadoError(
      datos,
      mensajeDe(datos, 'No tienes permiso para ver este recurso.'),
    );
  }

  throw new ApiError(
    respuesta.status,
    datos,
    mensajeDe(datos, `La API respondió ${respuesta.status}.`),
  );
}
