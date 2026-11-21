import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { MisRutinas } from '@/components/rutinas-propias/mis-rutinas';
import { DetalleRutina } from '@/components/rutinas-propias/detalle-rutina';
import { consultarMiRutina, listarMisRutinas } from '@/app/actions/rutinas-propias';
import type { ResultadoRutinaPropia, RutinaPropiaDetalle } from '@/lib/rutinas-propias';
import { detallePropio, otraRutinaPropia, rutinaPropia } from './rutinas-propias-fixtures';

vi.mock('@/app/actions/rutinas-propias', () => ({ listarMisRutinas: vi.fn(), consultarMiRutina: vi.fn() }));
beforeEach(() => {
  vi.mocked(listarMisRutinas).mockResolvedValue({ ok: true, datos: [rutinaPropia] });
  vi.mocked(consultarMiRutina).mockResolvedValue({ ok: true, datos: detallePropio });
});
afterEach(() => { cleanup(); vi.resetAllMocks(); });

it('muestra carga inicial y una tarjeta con nombre, objetivo, fecha y entrenador', async () => {
  render(<MisRutinas />);
  expect(screen.getByRole('heading', { name: 'Mis rutinas' })).toBeTruthy();
  expect(screen.getByRole('status').textContent).toBe('Cargando rutinas…');
  expect((screen.getByRole('button', { name: 'Actualizar' }) as HTMLButtonElement).disabled).toBe(true);
  const tarjeta = await screen.findByRole('heading', { name: rutinaPropia.nombre });
  const contenido = within(tarjeta.parentElement!);
  expect(contenido.getByText(rutinaPropia.objetivo)).toBeTruthy();
  expect(contenido.getByText('18/11/2026').getAttribute('dateTime')).toBe('2026-11-18');
  expect(contenido.getByText('Entrenador: Carlos Martínez')).toBeTruthy();
  expect(contenido.getByRole('link', { name: `Ver detalle de ${rutinaPropia.nombre}` }).getAttribute('href')).toBe(`/miembro/rutinas/${rutinaPropia.id}`);
});
it('conserva exactamente el orden del backend, también cuando coinciden las fechas', async () => {
  vi.mocked(listarMisRutinas).mockResolvedValue({ ok: true, datos: [
    rutinaPropia, { ...otraRutinaPropia, fechaInicio: rutinaPropia.fechaInicio }, { ...otraRutinaPropia, id: 'tercera', nombre: 'Rutina anterior' },
  ] });
  render(<MisRutinas />);
  const lista = await screen.findByRole('list', { name: 'Rutinas asignadas' });
  expect(within(lista).getAllByRole('heading').map((h) => h.textContent)).toEqual([rutinaPropia.nombre, otraRutinaPropia.nombre, 'Rutina anterior']);
});
it('sin asignaciones muestra el texto exacto, sin error', async () => {
  vi.mocked(listarMisRutinas).mockResolvedValue({ ok: true, datos: [] });
  render(<MisRutinas />);
  expect(await screen.findByText('No tienes rutinas asignadas', { exact: true })).toBeTruthy();
  expect(screen.queryByRole('alert')).toBeNull();
});
it('detalle presenta días y ejercicios ordenados sin mutar los arrays recibidos', async () => {
  render(<DetalleRutina id={rutinaPropia.id} />);
  expect(screen.getByRole('status').textContent).toBe('Cargando rutina…');
  await screen.findByRole('heading', { name: rutinaPropia.nombre });
  expect(screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)).toEqual(['Día 1 · Pecho y tríceps', 'Día 2 · Piernas']);
  expect(screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)).toEqual(['Press banca', 'Extensión de tríceps', 'Sentadilla']);
  expect(detallePropio.dias.map((d) => d.orden)).toEqual([2, 1]);
  expect(detallePropio.dias[1].ejercicios.map((e) => e.orden)).toEqual([2, 1]);
  const ejercicio = within(screen.getByRole('article', { name: 'Press banca' }));
  for (const [campo, valor] of [['Series', '4'], ['Repeticiones', '8'], ['Descanso', '120 s']]) {
    expect(ejercicio.getByText(campo).nextElementSibling?.textContent).toBe(valor);
  }
  expect(within(screen.getByRole('article', { name: 'Extensión de tríceps' })).getByText('0 s')).toBeTruthy();
  expect(screen.getByText(rutinaPropia.objetivo)).toBeTruthy();
  expect(screen.getByText('18/11/2026')).toBeTruthy();
  expect(screen.getByText('Entrenador: Carlos Martínez')).toBeTruthy();
  expect(screen.getByRole('link', { name: 'Volver a mis rutinas' }).getAttribute('href')).toBe('/miembro/rutinas');
});
it.each(['lista', 'detalle'])('%s es solo lectura', async (vista) => {
  render(vista === 'lista' ? <MisRutinas /> : <DetalleRutina id={rutinaPropia.id} />);
  await screen.findByRole('heading', { name: rutinaPropia.nombre });
  expect(screen.queryByRole('button', { name: /crear|nueva|guardar|eliminar|editar|modificar/i })).toBeNull();
  expect(screen.queryByRole('textbox')).toBeNull();
  expect(screen.queryByRole('spinbutton')).toBeNull();
});
it.each([401, 403, 404])('detalle purga datos anteriores después de HTTP %i', async (status) => {
  render(<DetalleRutina id={rutinaPropia.id} />);
  await screen.findByRole('article', { name: 'Press banca' });
  vi.mocked(consultarMiRutina).mockResolvedValue({ ok: false, status, error: `Error HTTP ${status}` });
  fireEvent.click(screen.getByRole('button', { name: 'Actualizar' }));
  expect(screen.queryByText(rutinaPropia.nombre)).toBeNull();
  expect(screen.queryByText('Press banca')).toBeNull();
  expect(await screen.findByRole('alert')).toHaveProperty('textContent', expect.stringContaining(`Error HTTP ${status}`));
  expect(screen.queryByText(rutinaPropia.nombre)).toBeNull();
  expect(screen.queryByRole('article')).toBeNull();
  if (status === 401) expect(screen.getByRole('link', { name: 'Iniciar sesión' }).getAttribute('href')).toBe('/login');
});
it.each([401, 403, 404])('lista purga tarjetas después de HTTP %i sin mostrar vacío', async (status) => {
  render(<MisRutinas />);
  await screen.findByRole('heading', { name: rutinaPropia.nombre });
  vi.mocked(listarMisRutinas).mockResolvedValue({ ok: false, status, error: `Error HTTP ${status}` });
  fireEvent.click(screen.getByRole('button', { name: 'Actualizar' }));
  await screen.findByRole('alert');
  expect(screen.queryByText(rutinaPropia.nombre)).toBeNull();
  expect(screen.queryByRole('link', { name: /Ver detalle/ })).toBeNull();
  expect(screen.queryByText('No tienes rutinas asignadas')).toBeNull();
  if (status === 401) expect(screen.getByRole('link', { name: 'Iniciar sesión' })).toBeTruthy();
});
it('UUID inválido muestra el error 400 y permite regresar', async () => {
  vi.mocked(consultarMiRutina).mockResolvedValue({ ok: false, status: 400, error: 'Identificador de rutina inválido.' });
  render(<DetalleRutina id="invalido" />);
  expect(await screen.findByText('Identificador de rutina inválido.')).toBeTruthy();
  expect(consultarMiRutina).toHaveBeenCalledWith('invalido');
  expect(screen.getByRole('link', { name: 'Volver a mis rutinas' })).toBeTruthy();
  expect(screen.queryByRole('article')).toBeNull();
});
it.each(['lista', 'detalle'])('%s gestiona error de conexión y reintento', async (vista) => {
  const consultar = vista === 'lista' ? vi.mocked(listarMisRutinas) : vi.mocked(consultarMiRutina);
  consultar.mockRejectedValueOnce(new TypeError('offline'));
  render(vista === 'lista' ? <MisRutinas /> : <DetalleRutina id={rutinaPropia.id} />);
  await screen.findByText('No se pudo conectar con el servidor. Intenta de nuevo.');
  expect(screen.queryByText('No tienes rutinas asignadas')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
  await screen.findByRole('heading', { name: rutinaPropia.nombre });
  expect(consultar).toHaveBeenCalledTimes(2);
  expect(screen.queryByRole('alert')).toBeNull();
});
it('Actualizar obtiene el listado actual y elimina asignaciones retiradas', async () => {
  render(<MisRutinas />);
  await screen.findByRole('heading', { name: rutinaPropia.nombre });
  vi.mocked(listarMisRutinas).mockResolvedValue({ ok: true, datos: [otraRutinaPropia] });
  fireEvent.click(screen.getByRole('button', { name: 'Actualizar' }));
  await screen.findByRole('heading', { name: otraRutinaPropia.nombre });
  expect(screen.queryByText(rutinaPropia.nombre)).toBeNull();
  expect(listarMisRutinas).toHaveBeenCalledTimes(2);
});
it('Actualizar trae nombre, fecha y ejercicios nuevos tras una edición', async () => {
  render(<DetalleRutina id={rutinaPropia.id} />);
  await screen.findByRole('heading', { name: rutinaPropia.nombre });
  vi.mocked(consultarMiRutina).mockResolvedValue({ ok: true, datos: { ...detallePropio, nombre: 'Plan revisado', fechaInicio: '2026-12-01',
    dias: [{ ...detallePropio.dias[0], ejercicios: [{ ...detallePropio.dias[0].ejercicios[0], nombre: 'Peso muerto', series: 6 }] }] } });
  fireEvent.click(screen.getByRole('button', { name: 'Actualizar' }));
  await screen.findByRole('heading', { name: 'Plan revisado' });
  expect(screen.getByText('01/12/2026')).toBeTruthy();
  expect(screen.getByRole('article', { name: 'Peso muerto' })).toBeTruthy();
  expect(screen.queryByRole('article', { name: 'Press banca' })).toBeNull();
  expect(consultarMiRutina).toHaveBeenCalledTimes(2);
});
it('cambiar de UUID elimina el detalle anterior y descarta su respuesta tardía', async () => {
  let resolver!: (r: ResultadoRutinaPropia<RutinaPropiaDetalle>) => void;
  vi.mocked(consultarMiRutina).mockReturnValueOnce(new Promise((r) => { resolver = r; }));
  const vista = render(<DetalleRutina id={rutinaPropia.id} />);
  vi.mocked(consultarMiRutina).mockResolvedValue({ ok: false, status: 403, error: 'Acceso denegado.' });
  vista.rerender(<DetalleRutina id={otraRutinaPropia.id} />);
  await screen.findByText('Acceso denegado.');
  await act(async () => resolver({ ok: true, datos: detallePropio }));
  expect(screen.queryByText(rutinaPropia.nombre)).toBeNull();
  expect(screen.queryByRole('article')).toBeNull();
  expect(consultarMiRutina).toHaveBeenLastCalledWith(otraRutinaPropia.id);
});
it('QA-H15-02/05: navegar entre dos detalles cargados retira A antes de consultar y mostrar B', async () => {
  const vista = render(<DetalleRutina id={rutinaPropia.id} />);
  await screen.findByRole('article', { name: 'Press banca' });
  let resolver!: (r: ResultadoRutinaPropia<RutinaPropiaDetalle>) => void;
  vi.mocked(consultarMiRutina).mockReturnValueOnce(new Promise((r) => { resolver = r; }));
  vista.rerender(<DetalleRutina id={otraRutinaPropia.id} />);
  expect(screen.queryByText(rutinaPropia.nombre)).toBeNull();
  expect(screen.queryByRole('article')).toBeNull();
  expect(screen.getByRole('status').textContent).toBe('Cargando rutina…');
  const segunda = { ...detallePropio, ...otraRutinaPropia, dias: [{ ...detallePropio.dias[0],
    ejercicios: [{ ...detallePropio.dias[0].ejercicios[0], nombre: 'Movilidad de cadera' }] }] };
  await act(async () => resolver({ ok: true, datos: segunda }));
  expect(screen.getByRole('heading', { name: otraRutinaPropia.nombre })).toBeTruthy();
  expect(screen.getByRole('article', { name: 'Movilidad de cadera' })).toBeTruthy();
  expect(screen.queryByText('Press banca')).toBeNull();
  expect(screen.queryByText(rutinaPropia.nombre)).toBeNull();
  expect(consultarMiRutina).toHaveBeenLastCalledWith(otraRutinaPropia.id);
});
it('QA-H15-05: respuesta tardía de una actualización no restaura datos después de un 403 más reciente', async () => {
  render(<DetalleRutina id={rutinaPropia.id} />);
  await screen.findByRole('article', { name: 'Press banca' });
  let resolver!: (r: ResultadoRutinaPropia<RutinaPropiaDetalle>) => void;
  vi.mocked(consultarMiRutina).mockReturnValueOnce(new Promise((r) => { resolver = r; }))
    .mockResolvedValueOnce({ ok: false, status: 403, error: 'Acceso denegado.' });
  fireEvent.click(screen.getByRole('button', { name: 'Actualizar' }));
  fireEvent.focus(window);
  await screen.findByText('Acceso denegado.');
  await act(async () => resolver({ ok: true, datos: detallePropio }));
  expect(screen.getByRole('alert').textContent).toContain('Acceso denegado.');
  expect(screen.queryByRole('article')).toBeNull();
  expect(screen.queryByText(rutinaPropia.nombre)).toBeNull();
  expect(consultarMiRutina).toHaveBeenCalledTimes(3);
});
it('al volver a montar la lista consulta de nuevo y no restaura tarjetas anteriores', async () => {
  const vista = render(<MisRutinas />);
  await screen.findByRole('heading', { name: rutinaPropia.nombre });
  vista.unmount();
  vi.mocked(listarMisRutinas).mockResolvedValue({ ok: true, datos: [] });
  render(<MisRutinas />);
  expect(screen.queryByText(rutinaPropia.nombre)).toBeNull();
  await screen.findByText('No tienes rutinas asignadas');
  expect(listarMisRutinas).toHaveBeenCalledTimes(2);
});
it('volver a la pestaña y restaurar desde bfcache vuelven a consultar', async () => {
  render(<DetalleRutina id={rutinaPropia.id} />);
  await screen.findByRole('article', { name: 'Press banca' });
  vi.mocked(consultarMiRutina).mockResolvedValue({ ok: false, status: 404, error: 'La rutina no existe.' });
  fireEvent.focus(window);
  await screen.findByText('La rutina no existe.');
  expect(screen.queryByRole('article')).toBeNull();
  vi.mocked(consultarMiRutina).mockResolvedValue({ ok: true, datos: detallePropio });
  const evento = new Event('pageshow');
  Object.defineProperty(evento, 'persisted', { value: true });
  fireEvent(window, evento);
  await screen.findByRole('article', { name: 'Press banca' });
  expect(consultarMiRutina).toHaveBeenCalledTimes(3);
});
it('pagina de veinte en veinte conservando el orden recibido', async () => {
  vi.mocked(listarMisRutinas).mockResolvedValue({ ok: true, datos: Array.from({ length: 21 }, (_, i) => ({
    ...rutinaPropia, id: String(i), nombre: `Rutina ${i + 1}`,
  })) });
  render(<MisRutinas />);
  await screen.findByRole('heading', { name: 'Rutina 1' });
  expect(screen.getAllByRole('link', { name: /Ver detalle/ })).toHaveLength(20);
  fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
  expect(screen.getByRole('heading', { name: 'Rutina 21' })).toBeTruthy();
  expect(screen.getAllByRole('link', { name: /Ver detalle/ })).toHaveLength(1);
});
