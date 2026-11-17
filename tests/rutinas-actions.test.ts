import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { revalidatePath } from 'next/cache';
import { obtenerUsuario } from '@/lib/dal';
import { obtenerToken } from '@/lib/session';
import { actualizarRutina, buscarMiembrosRutina, crearRutina, listarRutinas } from '@/app/actions/rutinas';
import { datos, miembro, rutina } from './rutinas-fixtures';

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/dal', () => ({ obtenerUsuario: vi.fn() }));
vi.mock('@/lib/session', () => ({ obtenerToken: vi.fn() }));
const fetchMock = vi.fn();
const operaciones = [() => buscarMiembrosRutina('Ana'), () => listarRutinas(), () => crearRutina(miembro.id, datos), () => actualizarRutina(rutina.id, datos)];
beforeEach(() => {
  vi.stubEnv('API_URL', 'http://api.test/api/v1'); vi.stubGlobal('fetch', fetchMock);
  vi.mocked(obtenerUsuario).mockResolvedValue({ id: rutina.entrenadorId, correo: 'test@example.test', nombre: 'Entrenador', apellido: 'Prueba', rol: 'ENTRENADOR' });
  vi.mocked(obtenerToken).mockResolvedValue('token-prueba');
  fetchMock.mockImplementation(async () => new Response(JSON.stringify(rutina)));
});
afterEach(() => { vi.resetAllMocks(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

it('usa el cliente real, rutas versionadas una sola vez y el token en servidor', async () => {
  for (const operar of operaciones) expect((await operar()).ok).toBe(true);
  expect(fetchMock.mock.calls.map(([url]) => new URL(url).pathname)).toEqual(['/api/v1/miembros/buscar', '/api/v1/rutinas/creadas-por-mi', '/api/v1/rutinas', `/api/v1/rutinas/${rutina.id}`]);
  expect(new URL(fetchMock.mock.calls[0][0]).searchParams.get('q')).toBe('Ana');
  for (const [, opciones] of fetchMock.mock.calls) expect(opciones.headers.get('Authorization')).toBe('Bearer token-prueba');
  expect(fetchMock.mock.calls[2][1].method).toBe('POST');
  expect(JSON.parse(fetchMock.mock.calls[2][1].body)).toEqual({ miembroId: miembro.id, ...datos });
  expect(fetchMock.mock.calls[3][1].method).toBe('PUT');
  expect(JSON.parse(fetchMock.mock.calls[3][1].body)).toEqual(datos);
  expect(revalidatePath).toHaveBeenCalledWith('/entrenador/rutinas');
});
it('elimina propietarios, IDs, orden y auditoría incluso si llegan en el objeto del PUT', async () => {
  await actualizarRutina(rutina.id, rutina);
  expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual(datos);
});
it.each([400, 401, 403, 404])('propaga errores HTTP %s sin revalidar', async (status) => {
  fetchMock.mockImplementation(async () => new Response(JSON.stringify({ message: ['dias.0.ejercicios.0.series must not be less than 1'] }), { status }));
  for (const operar of operaciones) expect(await operar()).toMatchObject({ ok: false, status });
  expect(revalidatePath).not.toHaveBeenCalled();
  const res = await crearRutina(miembro.id, datos);
  if (!res.ok) expect(res.campos).toHaveProperty('dias[0].ejercicios[0].series');
});
it.each(['MIEMBRO', 'RECEPCION', 'ADMINISTRADOR'] as const)('rechaza sesión de %s antes de la API', async (rol) => {
  vi.mocked(obtenerUsuario).mockResolvedValue({ id: 'otro', correo: '', nombre: '', apellido: '', rol });
  for (const operar of operaciones) expect(await operar()).toMatchObject({ ok: false, status: 403 });
  expect(fetchMock).not.toHaveBeenCalled();
});
it('rechaza falta de sesión y falla de conexión sin filtrar tokens', async () => {
  vi.mocked(obtenerUsuario).mockResolvedValue(null);
  expect(await listarRutinas()).toMatchObject({ ok: false, status: 401 });
  expect(fetchMock).not.toHaveBeenCalled();
  vi.mocked(obtenerUsuario).mockRejectedValue(new TypeError('offline'));
  expect(await listarRutinas()).toMatchObject({ ok: false });
});
it('bloquea búsqueda corta, UUID y datos inválidos sin enviar', async () => {
  expect((await buscarMiembrosRutina('a')).ok).toBe(false);
  expect((await crearRutina('', datos)).ok).toBe(false);
  expect((await actualizarRutina('id-invalido', datos)).ok).toBe(false);
  expect((await crearRutina(miembro.id, { ...datos, dias: [] })).ok).toBe(false);
  expect(fetchMock).not.toHaveBeenCalled();
});
it('deja la comprobación de fecha pasada previa del PUT al backend', async () => {
  const pasada = { ...datos, fechaInicio: '2020-01-01' };
  expect((await crearRutina(miembro.id, pasada)).ok).toBe(false);
  expect((await actualizarRutina(rutina.id, pasada)).ok).toBe(true);
});
it('no convierte un fallo de red en éxito', async () => {
  fetchMock.mockRejectedValue(new TypeError('offline'));
  for (const operar of operaciones) expect((await operar()).ok).toBe(false);
  expect(revalidatePath).not.toHaveBeenCalled();
});
