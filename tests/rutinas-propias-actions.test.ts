import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { consultarMiRutina, listarMisRutinas } from '@/app/actions/rutinas-propias';
import { obtenerUsuario } from '@/lib/dal';
import { obtenerToken } from '@/lib/session';
import { SesionInvalidaError } from '@/lib/api';
import { detallePropio, otraRutinaPropia, rutinaPropia } from './rutinas-propias-fixtures';

vi.mock('@/lib/dal', () => ({ obtenerUsuario: vi.fn() }));
vi.mock('@/lib/session', () => ({ obtenerToken: vi.fn() }));
const fetchMock = vi.fn();
const operaciones = [() => listarMisRutinas(), () => consultarMiRutina(rutinaPropia.id)];

beforeEach(() => {
  vi.stubEnv('API_URL', 'http://api.test/api/v1');
  vi.stubGlobal('fetch', fetchMock);
  vi.mocked(obtenerUsuario).mockResolvedValue({ id: 'miembro-autenticado', correo: '', nombre: 'Ana', apellido: 'Paz', rol: 'MIEMBRO' });
  vi.mocked(obtenerToken).mockResolvedValue('token-privado-prueba');
  fetchMock.mockImplementation(async (url: URL) => new Response(JSON.stringify(
    url.pathname.endsWith('/mias') ? [rutinaPropia, otraRutinaPropia] : detallePropio,
  )));
});
afterEach(() => { vi.resetAllMocks(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

it.each(['http://api.test/api/v1', 'http://api.test/api/v1/'])('usa cliente real, token de servidor y no-store con API_URL %s', async (base) => {
  vi.stubEnv('API_URL', base);
  const lista = await listarMisRutinas();
  const detalle = await consultarMiRutina(rutinaPropia.id);
  expect(lista).toEqual({ ok: true, datos: [rutinaPropia, otraRutinaPropia] });
  expect(detalle).toEqual({ ok: true, datos: detallePropio });
  expect(fetchMock.mock.calls.map(([url]) => new URL(url).pathname)).toEqual(['/api/v1/rutinas/mias', `/api/v1/rutinas/${rutinaPropia.id}`]);
  for (const [url, opciones] of fetchMock.mock.calls) {
    expect(new URL(url).search).toBe('');
    expect(opciones.cache).toBe('no-store');
    expect(opciones.body).toBeUndefined();
    expect(opciones.method ?? 'GET').toBe('GET');
    expect(opciones.headers.get('Authorization')).toBe('Bearer token-privado-prueba');
  }
  expect(JSON.stringify([lista, detalle])).not.toContain('token-privado-prueba');
});
it('vacío es éxito, no un error', async () => {
  fetchMock.mockResolvedValueOnce(new Response('[]'));
  expect(await listarMisRutinas()).toEqual({ ok: true, datos: [] });
});
it.each(['ENTRENADOR', 'RECEPCION', 'ADMINISTRADOR'] as const)('rechaza %s antes de consultar rutinas', async (rol) => {
  vi.mocked(obtenerUsuario).mockResolvedValue({ id: 'otro', correo: '', nombre: '', apellido: '', rol });
  for (const operar of operaciones) expect(await operar()).toMatchObject({ ok: false, status: 403 });
  expect(fetchMock).not.toHaveBeenCalled();
});
it('sin usuario autenticado devuelve 401 sin consultar rutinas', async () => {
  vi.mocked(obtenerUsuario).mockResolvedValue(null);
  for (const operar of operaciones) expect(await operar()).toMatchObject({ ok: false, status: 401 });
  expect(fetchMock).not.toHaveBeenCalled();
});
it.each([400, 401, 403, 404, 500])('distingue HTTP %s sin retornar datos del cuerpo de error', async (status) => {
  fetchMock.mockImplementation(async () => new Response(JSON.stringify({ ...detallePropio, message: 'Información privada' }), { status }));
  for (const operar of operaciones) {
    const res = await operar();
    expect(res).toMatchObject({ ok: false, status });
    expect(res).not.toHaveProperty('datos');
    expect(JSON.stringify(res)).not.toContain('Información privada');
    expect(JSON.stringify(res)).not.toContain(rutinaPropia.nombre);
  }
});
it.each(['no-uuid', '', '../creadas-por-mi', `${rutinaPropia.id}?miembroId=otro`, null, 42])('rechaza identificador inválido %j sin consultar sesión ni API', async (id) => {
  expect(await consultarMiRutina(id as string)).toEqual({ ok: false, status: 400, error: 'Identificador de rutina inválido.' });
  expect(obtenerUsuario).not.toHaveBeenCalled();
  expect(fetchMock).not.toHaveBeenCalled();
});
it('otros argumentos no sustituyen la identidad ni generan filtros de miembro', async () => {
  await Reflect.apply(listarMisRutinas, undefined, ['miembro-ajeno']);
  await Reflect.apply(consultarMiRutina, undefined, [rutinaPropia.id, 'miembro-ajeno']);
  for (const [url] of fetchMock.mock.calls) expect(new URL(url).search).toBe('');
  expect(obtenerUsuario).toHaveBeenCalledTimes(2);
});
it('maneja 401 y conexión fallida durante resolución del usuario', async () => {
  vi.mocked(obtenerUsuario).mockRejectedValueOnce(new SesionInvalidaError(null, 'expirada'));
  expect(await listarMisRutinas()).toMatchObject({ ok: false, status: 401 });
  vi.mocked(obtenerUsuario).mockRejectedValueOnce(new TypeError('offline'));
  expect(await consultarMiRutina(rutinaPropia.id)).toEqual({ ok: false, error: 'No se pudo conectar con el servidor. Intenta de nuevo.' });
  expect(fetchMock).not.toHaveBeenCalled();
});
it('no presenta un fallo de red como lista vacía', async () => {
  fetchMock.mockRejectedValue(new TypeError('offline'));
  for (const operar of operaciones) expect(await operar()).toEqual({ ok: false, error: 'No se pudo conectar con el servidor. Intenta de nuevo.' });
});
it.each([null, {}, { rutinas: [] }, [{ ...rutinaPropia, entrenador: null }]])('rechaza listado de formato inválido %j', async (datos) => {
  fetchMock.mockResolvedValueOnce(new Response(JSON.stringify(datos)));
  expect(await listarMisRutinas()).toMatchObject({ ok: false });
});
it.each([null, rutinaPropia, { ...detallePropio, dias: [{}] }, { ...detallePropio, dias: [{ ...detallePropio.dias[0], ejercicios: [{}] }] }])('rechaza detalle inválido %j', async (datos) => {
  fetchMock.mockResolvedValueOnce(new Response(JSON.stringify(datos)));
  expect(await consultarMiRutina(rutinaPropia.id)).toMatchObject({ ok: false });
});
it('vuelve a leer y devuelve la versión actual tras edición del entrenador', async () => {
  expect(await consultarMiRutina(rutinaPropia.id)).toEqual({ ok: true, datos: detallePropio });
  const actual = { ...detallePropio, nombre: 'Fuerza revisada', fechaInicio: '2026-12-01' };
  fetchMock.mockResolvedValueOnce(new Response(JSON.stringify(actual)));
  expect(await consultarMiRutina(rutinaPropia.id)).toEqual({ ok: true, datos: actual });
  expect(fetchMock).toHaveBeenCalledTimes(2);
});
