import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { obtenerDetalleIngresos, obtenerReporteIngresos, obtenerReporteOcupacion } from '@/app/actions/reportes';
import { obtenerUsuario } from '@/lib/dal';
import { obtenerToken } from '@/lib/session';
import { MENSAJES_REPORTES } from '@/lib/reportes';
import type { RangoReporte } from '@/lib/reportes';
import type { ConceptoCobro } from '@/lib/pagos';
import { INGRESOS, paginaIngresos, RANGO_INGRESOS } from './ingresos-fixtures';

vi.mock('@/lib/dal', () => ({ obtenerUsuario: vi.fn() }));
vi.mock('@/lib/session', () => ({ obtenerToken: vi.fn() }));
const fetchMock = vi.fn();
const operaciones = [() => obtenerReporteIngresos(RANGO_INGRESOS), () => obtenerDetalleIngresos('MEMBRESIA', RANGO_INGRESOS)];
beforeEach(() => {
  vi.stubEnv('API_URL', 'http://api.test/api/v1'); vi.stubGlobal('fetch', fetchMock);
  vi.mocked(obtenerUsuario).mockResolvedValue({ id: 'admin', correo: '', nombre: 'Admin', apellido: 'QA', rol: 'ADMINISTRADOR' });
  vi.mocked(obtenerToken).mockResolvedValue('token-privado-h27');
  fetchMock.mockImplementation(async (url: URL) => new Response(JSON.stringify(
    url.pathname.endsWith('/detalle') ? paginaIngresos(Number(url.searchParams.get('pagina'))).datos : INGRESOS,
  )));
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});
afterEach(() => { vi.restoreAllMocks(); vi.resetAllMocks(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

it.each(['http://api.test/api/v1', 'http://api.test/api/v1/'])('usa API compartida, query exacta y no-store con %s', async (base) => {
  vi.stubEnv('API_URL', base);
  expect(await obtenerReporteIngresos(RANGO_INGRESOS)).toEqual({ ok: true, datos: INGRESOS });
  expect(await obtenerDetalleIngresos('MEMBRESIA', RANGO_INGRESOS, 2)).toEqual(paginaIngresos(2));
  const [resumen, detalle] = fetchMock.mock.calls;
  expect(new URL(resumen[0]).pathname).toBe('/api/v1/reportes/ingresos');
  expect(Object.fromEntries(new URL(resumen[0]).searchParams)).toEqual(RANGO_INGRESOS);
  expect(new URL(detalle[0]).pathname).toBe('/api/v1/reportes/ingresos/detalle');
  expect(Object.fromEntries(new URL(detalle[0]).searchParams)).toEqual({ ...RANGO_INGRESOS, concepto: 'MEMBRESIA', pagina: '2' });
  for (const [, opciones] of fetchMock.mock.calls) {
    expect(opciones.cache).toBe('no-store');
    expect(opciones.headers.get('Authorization')).toBe('Bearer token-privado-h27');
    expect(opciones.body).toBeUndefined();
    expect(opciones.method ?? 'GET').toBe('GET');
  }
});
it('detalle usa página 1 por defecto y no devuelve tokens', async () => {
  const res = await obtenerDetalleIngresos('MEMBRESIA', RANGO_INGRESOS);
  expect(res).toEqual(paginaIngresos(1));
  expect(new URL(fetchMock.mock.calls[0][0]).searchParams.get('pagina')).toBe('1');
  expect(JSON.stringify(res)).not.toContain('token-privado-h27');
});
it.each(['MIEMBRO', 'ENTRENADOR', 'RECEPCION'] as const)('rol %s no consulta la API financiera', async (rol) => {
  vi.mocked(obtenerUsuario).mockResolvedValue({ id: 'otro', correo: '', nombre: '', apellido: '', rol });
  for (const operar of operaciones) expect(await operar()).toEqual({ ok: false, estado: 403, error: 'Acceso denegado' });
  expect(fetchMock).not.toHaveBeenCalled();
});
it('sin sesión devuelve 401 sin consultar', async () => {
  vi.mocked(obtenerUsuario).mockResolvedValue(null);
  for (const operar of operaciones) expect(await operar()).toMatchObject({ ok: false, estado: 401, error: MENSAJES_REPORTES.sesionExpirada });
  expect(fetchMock).not.toHaveBeenCalled();
});
it.each([400, 401, 403, 500])('HTTP %s conserva estado sin datos financieros', async (estado) => {
  fetchMock.mockImplementation(async () => new Response(JSON.stringify({ ...INGRESOS, message: 'Mensaje backend' }), { status: estado }));
  for (const operar of operaciones) {
    const res = await operar();
    expect(res).toMatchObject({ ok: false, estado });
    expect(res).not.toHaveProperty('datos');
    if (estado === 500) expect(JSON.stringify(res)).not.toContain('Mensaje backend');
  }
});
it('error de conexión en datos o DAL devuelve fallo, sin información financiera', async () => {
  fetchMock.mockRejectedValue(new TypeError('offline'));
  for (const operar of operaciones) expect(await operar()).toEqual({ ok: false, error: MENSAJES_REPORTES.sinConexion });
  vi.mocked(obtenerUsuario).mockRejectedValue(new TypeError('offline'));
  expect(await obtenerReporteIngresos(RANGO_INGRESOS)).toEqual({ ok: false, error: MENSAJES_REPORTES.sinConexion });
});
it.each([
  { desde: '2026-11-20', hasta: '2026-11-18' }, { desde: '2026-02-30', hasta: '2026-03-01' },
  { desde: '2026-01-01', hasta: '2027-01-01' }, { desde: '', hasta: '' }, null,
])('rechaza rango inválido %j sin llamar la API', async (rango) => {
  expect(await obtenerReporteIngresos(rango as RangoReporte)).toMatchObject({ ok: false, estado: 400 });
  expect(await obtenerDetalleIngresos('MEMBRESIA', rango as RangoReporte)).toMatchObject({ ok: false, estado: 400 });
  expect(fetchMock).not.toHaveBeenCalled();
});
it.each([0, -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1])('rechaza página inválida %s', async (pagina) => {
  expect(await obtenerDetalleIngresos('MEMBRESIA', RANGO_INGRESOS, pagina)).toMatchObject({ ok: false, estado: 400 });
  expect(fetchMock).not.toHaveBeenCalled();
});
it('rechaza concepto inválido antes de la API', async () => {
  expect(await obtenerDetalleIngresos('OTRO' as ConceptoCobro, RANGO_INGRESOS)).toMatchObject({ ok: false, estado: 400 });
  expect(fetchMock).not.toHaveBeenCalled();
});
it.each([null, {}, { ...INGRESOS, total: '1130' }, { ...INGRESOS, porConcepto: [] }])('rechaza resumen mal formado %j', async (datos) => {
  fetchMock.mockResolvedValue(new Response(JSON.stringify(datos)));
  expect(await obtenerReporteIngresos(RANGO_INGRESOS)).toMatchObject({ ok: false });
});
it.each([null, { items: [], total: -1, pagina: 1 }, { items: [], total: 0, pagina: 2 }, { items: Array(21).fill({}), total: 21, pagina: 1 }])('rechaza detalle mal formado %j', async (datos) => {
  fetchMock.mockResolvedValue(new Response(JSON.stringify(datos)));
  expect(await obtenerDetalleIngresos('MEMBRESIA', RANGO_INGRESOS)).toMatchObject({ ok: false });
});
it('regresión: obtenerReporteOcupacion conserva URL, rango y contrato H26', async () => {
  const ocupacion = { ...RANGO_INGRESOS, filas: [] };
  fetchMock.mockResolvedValue(new Response(JSON.stringify(ocupacion)));
  expect(await obtenerReporteOcupacion(RANGO_INGRESOS)).toEqual({ ok: true, datos: ocupacion });
  const url = new URL(fetchMock.mock.calls[0][0]);
  expect(url.pathname).toBe('/api/v1/reportes/ocupacion');
  expect(Object.fromEntries(url.searchParams)).toEqual(RANGO_INGRESOS);
});
