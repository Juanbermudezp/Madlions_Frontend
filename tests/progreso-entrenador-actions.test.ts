import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { consultarProgresoMiembro } from '@/app/actions/progreso-entrenador';
import { obtenerUsuario } from '@/lib/dal';
import { obtenerToken } from '@/lib/session';
import type { Filtro } from '@/lib/evolucion';
import { miembroProgresoId, seriesEntrenador } from './progreso-entrenador-fixtures';

vi.mock('@/lib/dal', () => ({ obtenerUsuario: vi.fn() }));
vi.mock('@/lib/session', () => ({ obtenerToken: vi.fn() }));
const fetchMock = vi.fn();
beforeEach(() => {
  vi.stubEnv('API_URL', 'http://api.test/api/v1'); vi.stubGlobal('fetch', fetchMock);
  vi.mocked(obtenerUsuario).mockResolvedValue({ id: 'entrenador', nombre: 'Entrenador', apellido: 'Prueba', correo: '', rol: 'ENTRENADOR' });
  vi.mocked(obtenerToken).mockResolvedValue('token-secreto-prueba');
  fetchMock.mockImplementation(async () => new Response(JSON.stringify({ series: seriesEntrenador })));
});
afterEach(() => { vi.resetAllMocks(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

it('consulta el endpoint correcto con filtros y devuelve exactamente las series de BE-14.2', async () => {
  const respuesta = await consultarProgresoMiembro(miembroProgresoId, { tipo: 'MARCA', desde: '2026-11-01', hasta: '2026-11-17' });
  expect(respuesta).toEqual({ ok: true, data: seriesEntrenador });
  const [url, opciones] = fetchMock.mock.calls[0];
  expect(new URL(url).pathname).toBe(`/api/v1/miembros/${miembroProgresoId}/progreso`);
  expect(Object.fromEntries(new URL(url).searchParams)).toEqual({ tipo: 'MARCA', desde: '2026-11-01', hasta: '2026-11-17' });
  expect(opciones.cache).toBe('no-store');
  expect(opciones.headers.get('Authorization')).toBe('Bearer token-secreto-prueba');
  expect(JSON.stringify(respuesta)).not.toContain('token-secreto-prueba');
});
it('rechaza UUID inválido antes de consultar incluso la sesión', async () => {
  expect(await consultarProgresoMiembro('invalido')).toMatchObject({ ok: false, status: 400 });
  expect(fetchMock).not.toHaveBeenCalled(); expect(obtenerUsuario).not.toHaveBeenCalled();
});
it.each([null, { tipo: 'OTRO' }, { desde: 'ayer' }, { hasta: '2026-02-30' }, { desde: '2026-11-18', hasta: '2026-11-17' }])('valida filtros %j sin consultar backend', async (filtro) => {
  expect(await consultarProgresoMiembro(miembroProgresoId, filtro as Filtro)).toMatchObject({ ok: false, status: 400 });
  expect(fetchMock).not.toHaveBeenCalled();
});
it.each(['MIEMBRO', 'RECEPCION', 'ADMINISTRADOR'] as const)('rechaza rol %s antes de progreso', async (rol) => {
  vi.mocked(obtenerUsuario).mockResolvedValue({ id: 'otro', nombre: '', apellido: '', correo: '', rol });
  expect(await consultarProgresoMiembro(miembroProgresoId)).toEqual({ ok: false, status: 403, error: 'No tienes permiso para ver este recurso' });
  expect(fetchMock).not.toHaveBeenCalled();
});
it('gestiona sesión ausente o expirada sin retornar datos', async () => {
  vi.mocked(obtenerUsuario).mockResolvedValue(null);
  expect(await consultarProgresoMiembro(miembroProgresoId)).toMatchObject({ ok: false, status: 401 });
  expect(fetchMock).not.toHaveBeenCalled();
});
it.each([400, 401, 403])('distingue el error HTTP %s y no retorna datos', async (status) => {
  fetchMock.mockResolvedValue(new Response(JSON.stringify({ message: 'Mensaje backend', series: seriesEntrenador }), { status }));
  const resultado = await consultarProgresoMiembro(miembroProgresoId);
  expect(resultado).toMatchObject({ ok: false, status });
  expect(resultado).not.toHaveProperty('data');
  if (status === 403) expect(resultado).toEqual({ ok: false, status: 403, error: 'No tienes permiso para ver este recurso' });
});
it('devuelve vacío, rechaza formato inválido y maneja fallo de conexión', async () => {
  fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ series: [] })));
  expect(await consultarProgresoMiembro(miembroProgresoId)).toEqual({ ok: true, data: [] });
  fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ registros: [] })));
  expect(await consultarProgresoMiembro(miembroProgresoId)).toMatchObject({ ok: false });
  fetchMock.mockRejectedValueOnce(new TypeError('offline'));
  expect(await consultarProgresoMiembro(miembroProgresoId)).toEqual({ ok: false, error: 'No se pudo conectar con el servidor. Intenta de nuevo.' });
});
