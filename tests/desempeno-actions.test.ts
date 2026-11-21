import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { obtenerMiDesempeno, obtenerReporteDesempeno } from '@/app/actions/desempeno';
import { obtenerUsuario } from '@/lib/dal';
import { obtenerToken } from '@/lib/session';
import type { RangoReporte } from '@/lib/reportes';

vi.mock('@/lib/dal', () => ({ obtenerUsuario: vi.fn() }));
vi.mock('@/lib/session', () => ({ obtenerToken: vi.fn() }));

const RANGO = { desde: '2026-10-22', hasta: '2026-11-20' };
const REPORTE = {
  ...RANGO,
  filas: [
    {
      entrenador: { id: 'e-1', nombre: 'Ana Hernández' },
      clasesImpartidas: 2,
      ocupacionPromedio: 25,
      sesionesRealizadas: 3,
      calificacion: null,
      resenas: 2,
    },
  ],
};
const usuario = (rol: 'ADMINISTRADOR' | 'ENTRENADOR' | 'MIEMBRO' | 'RECEPCION') => ({
  id: 'u-1',
  nombre: 'QA',
  apellido: 'H29',
  correo: '',
  rol,
});
const fetchMock = vi.fn();

beforeEach(() => {
  vi.stubEnv('API_URL', 'http://api.test/api/v1');
  vi.stubGlobal('fetch', fetchMock);
  vi.mocked(obtenerToken).mockResolvedValue('token-qa-h29');
  fetchMock.mockResolvedValue(new Response(JSON.stringify(REPORTE)));
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.resetAllMocks();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

it.each([
  ['administrador', obtenerReporteDesempeno, 'ADMINISTRADOR'],
  ['entrenador', obtenerMiDesempeno, 'ENTRENADOR'],
] as const)('%s: GET /reportes/desempeno solo con el rango (sin entrenadorId)', async (_, accion, rol) => {
  vi.mocked(obtenerUsuario).mockResolvedValue(usuario(rol));

  expect(await accion(RANGO)).toEqual({ ok: true, datos: REPORTE });
  const [url, opciones] = fetchMock.mock.calls[0];
  expect(url.pathname).toBe('/api/v1/reportes/desempeno');
  expect(Object.fromEntries(url.searchParams)).toEqual(RANGO);
  expect(opciones.headers.get('Authorization')).toBe('Bearer token-qa-h29');
});

it.each(['MIEMBRO', 'RECEPCION', 'ENTRENADOR'] as const)('el reporte del administrador da 403 a %s sin llamar a la API', async (rol) => {
  vi.mocked(obtenerUsuario).mockResolvedValue(usuario(rol));

  expect(await obtenerReporteDesempeno(RANGO)).toMatchObject({ ok: false, estado: 403, error: 'Acceso denegado' });
  expect(fetchMock).not.toHaveBeenCalled();
});

it.each(['MIEMBRO', 'RECEPCION', 'ADMINISTRADOR'] as const)('Mi desempeño da 403 a %s sin llamar a la API', async (rol) => {
  vi.mocked(obtenerUsuario).mockResolvedValue(usuario(rol));

  expect(await obtenerMiDesempeno(RANGO)).toMatchObject({ ok: false, estado: 403 });
  expect(fetchMock).not.toHaveBeenCalled();
});

it('sin sesión responde 401 sin llamar a la API', async () => {
  vi.mocked(obtenerUsuario).mockResolvedValue(null);

  expect(await obtenerReporteDesempeno(RANGO)).toMatchObject({ ok: false, estado: 401 });
  expect(fetchMock).not.toHaveBeenCalled();
});

it.each([{ desde: '2026-11-07', hasta: '2026-11-06' }, { desde: '2026-01-01', hasta: '2027-01-01' }, null])(
  'rango inválido %j: 400 sin petición',
  async (rango) => {
    vi.mocked(obtenerUsuario).mockResolvedValue(usuario('ADMINISTRADOR'));

    expect(await obtenerReporteDesempeno(rango as RangoReporte)).toMatchObject({ ok: false, estado: 400 });
    expect(fetchMock).not.toHaveBeenCalled();
  },
);

it('respuesta con forma inválida no se muestra', async () => {
  vi.mocked(obtenerUsuario).mockResolvedValue(usuario('ADMINISTRADOR'));
  fetchMock.mockResolvedValue(new Response(JSON.stringify({ filas: 'x' })));

  expect(await obtenerReporteDesempeno(RANGO)).toMatchObject({ ok: false });
});
