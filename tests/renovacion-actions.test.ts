import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { obtenerReporteRenovacion } from '@/app/actions/reportes';
import { obtenerUsuario } from '@/lib/dal';
import { obtenerToken } from '@/lib/session';
import type { RangoReporte } from '@/lib/reportes';
import { RENOVACION, RANGO_RENOVACION } from './renovacion-fixtures';

vi.mock('@/lib/dal', () => ({ obtenerUsuario: vi.fn() }));
vi.mock('@/lib/session', () => ({ obtenerToken: vi.fn() }));
const fetchMock = vi.fn();
beforeEach(() => {
  vi.stubEnv('API_URL', 'http://api.test/api/v1'); vi.stubGlobal('fetch', fetchMock);
  vi.mocked(obtenerUsuario).mockResolvedValue({ id: 'admin', nombre: 'Admin', apellido: 'QA', correo: '', rol: 'ADMINISTRADOR' });
  vi.mocked(obtenerToken).mockResolvedValue('token-qa-h28');
  fetchMock.mockResolvedValue(new Response(JSON.stringify(RENOVACION)));
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});
afterEach(() => { vi.restoreAllMocks(); vi.resetAllMocks(); vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

it.each(['http://api.test/api/v1', 'http://api.test/api/v1/'])('API compartida sin duplicar versión, contrato exacto y no-store:%s', async (base) => {
  vi.stubEnv('API_URL', base);
  expect(await obtenerReporteRenovacion(RANGO_RENOVACION)).toEqual({ ok: true, datos: RENOVACION });
  const [url, opciones] = fetchMock.mock.calls[0];
  expect(url.pathname).toBe('/api/v1/reportes/renovacion');
  expect(Object.fromEntries(url.searchParams)).toEqual(RANGO_RENOVACION);
  expect(opciones.cache).toBe('no-store'); expect(opciones.headers.get('Authorization')).toBe('Bearer token-qa-h28');
});
it.each(['MIEMBRO', 'ENTRENADOR', 'RECEPCION'] as const)('403 para%s antes de API', async (rol) => {
  vi.mocked(obtenerUsuario).mockResolvedValue({ id: 'otro', nombre: '', apellido: '', correo: '', rol });
  expect(await obtenerReporteRenovacion(RANGO_RENOVACION)).toMatchObject({ ok: false, estado: 403 });
  expect(fetchMock).not.toHaveBeenCalled();
});
it('401 sin sesión antes de API', async () => {
  vi.mocked(obtenerUsuario).mockResolvedValue(null);
  expect(await obtenerReporteRenovacion(RANGO_RENOVACION)).toMatchObject({ ok: false, estado: 401 });
  expect(fetchMock).not.toHaveBeenCalled();
});
it.each([null, {}, { desde: '2026-11-07', hasta: '2026-11-06' }, { desde: '2026-02-30', hasta: '2026-03-01' }, { desde: '2026-01-01', hasta: '2027-01-01' }])('400 por rango%j sin petición', async (rango) => {
  expect(await obtenerReporteRenovacion(rango as RangoReporte)).toMatchObject({ ok: false, estado: 400 });
  expect(fetchMock).not.toHaveBeenCalled();
});
it.each([400, 401, 403, 500])('maneja HTTP%s sin filtrar detalles del servidor', async (estado) => {
  fetchMock.mockResolvedValue(new Response(JSON.stringify({ message: estado === 400 ? 'Rango inválido' : 'detalle-interno-privado' }), { status: estado }));
  const res = await obtenerReporteRenovacion(RANGO_RENOVACION);
  expect(res).toMatchObject({ ok: false, estado });
  expect(JSON.stringify(res)).not.toContain('detalle-interno-privado');
});
it('conexión fallida tiene mensaje claro', async () => {
  fetchMock.mockRejectedValue(new TypeError('no publicar URL interna'));
  expect(await obtenerReporteRenovacion(RANGO_RENOVACION)).toEqual({ ok: false, error: 'No se pudo conectar con el servidor. Intenta de nuevo.' });
});
it.each([{}, { ...RENOVACION, tasaRenovacion: undefined }, { ...RENOVACION, enPeriodo: -1 }, { ...RENOVACION, tasaCancelacion: 101 }, { ...RENOVACION, noRenovaron: [{ nombre: 'incompleto' }] }])('rechaza contrato inválido%j', async (datos) => {
  fetchMock.mockResolvedValue(new Response(JSON.stringify(datos)));
  expect(await obtenerReporteRenovacion(RANGO_RENOVACION)).toEqual({ ok: false, error: 'La respuesta del reporte de renovación no es válida.' });
});
