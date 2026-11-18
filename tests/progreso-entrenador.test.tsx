import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { VistaEvolucion } from '@/components/progreso/vista-evolucion';
import { consultarProgresoMiembro } from '@/app/actions/progreso-entrenador';
import { consultarEvolucion, editarProgreso } from '@/app/actions/evolucion';
import { registrarProgreso } from '@/app/actions/progreso';
import Page from '@/app/entrenador/miembros/[id]/progreso/page';
import MiProgresoPage from '@/app/miembro/progreso/page';
import EntrenadorLayout from '@/app/entrenador/layout';
import { RutaProtegida } from '@/components/ruta-protegida';
import { miembroProgresoId, otroMiembroId, seriesEntrenador } from './progreso-entrenador-fixtures';
import type { Resultado, Serie } from '@/lib/evolucion';

vi.mock('@/app/actions/progreso-entrenador', () => ({ consultarProgresoMiembro: vi.fn() }));
vi.mock('@/app/actions/evolucion', () => ({ consultarEvolucion: vi.fn(), editarProgreso: vi.fn() }));
vi.mock('@/app/actions/progreso', () => ({ registrarProgreso: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

const vista = (id = miembroProgresoId) => <VistaEvolucion consulta={{ modo: 'entrenador', miembroId: id }} />;
function sinDatosPrivados() {
  expect(screen.queryByRole('table')).toBeNull();
  expect(screen.queryByRole('img')).toBeNull();
  expect(screen.queryByText('Primero')).toBeNull();
  expect(screen.queryByText('78.5 kg')).toBeNull();
}
beforeEach(() => {
  vi.mocked(consultarProgresoMiembro).mockResolvedValue({ ok: true, data: seriesEntrenador });
  vi.mocked(consultarEvolucion).mockResolvedValue({ ok: true, data: seriesEntrenador });
  vi.mocked(editarProgreso).mockResolvedValue({ ok: true, data: null });
});
afterEach(() => { cleanup(); vi.resetAllMocks(); });

it('prepara la ruta bajo el layout exclusivo ENTRENADOR y ofrece volver a rutinas', async () => {
  const layout = EntrenadorLayout({ children: null });
  expect(layout.type).toBe(RutaProtegida); expect(layout.props.roles).toEqual(['ENTRENADOR']);
  render(await Page({ params: Promise.resolve({ id: miembroProgresoId }) }));
  await screen.findByRole('table');
  expect(screen.getByRole('heading', { name: 'Progreso del miembro' })).toBeTruthy();
  expect(screen.getByRole('link', { name: 'Volver a rutinas' }).getAttribute('href')).toBe('/entrenador/rutinas');
});
it('usa H16 para tarjetas, gráfica, fechas, historial y marcas separadas', async () => {
  render(vista()); await screen.findByRole('table');
  for (const [etiqueta, valor] of [['Primero', '80.0 kg'], ['Último', '78.5 kg'], ['Diferencia', '-1.5 kg'], ['Cambio', '-1.9 %']]) {
    expect(screen.getByText(etiqueta).parentElement?.textContent).toContain(valor);
  }
  expect(screen.getByRole('img', { name: 'Gráfica de Peso corporal' })).toBeTruthy();
  expect(within(screen.getByRole('table')).getAllByText('17/11/2026')).toHaveLength(2);
  expect(screen.getByRole('option', { name: 'Press banca (8 rep.)' })).toBeTruthy();
  expect(screen.getByRole('option', { name: 'Press banca (5 rep.)' })).toBeTruthy();
  fireEvent.change(screen.getByLabelText('Medición para comparar'), { target: { value: 'MARCA|Press banca|5' } });
  expect(screen.getByText('Datos insuficientes para comparar')).toBeTruthy();
  expect(consultarEvolucion).not.toHaveBeenCalled();
});
it('aplica filtros solo al endpoint del entrenador', async () => {
  render(vista()); await screen.findByRole('table');
  fireEvent.change(screen.getByLabelText('Tipo de medición'), { target: { value: 'MARCA' } });
  fireEvent.change(screen.getByLabelText('Desde'), { target: { value: '2026-11-01' } });
  fireEvent.change(screen.getByLabelText('Hasta'), { target: { value: '2026-11-17' } });
  fireEvent.click(screen.getByRole('button', { name: 'Aplicar filtros' }));
  await waitFor(() => expect(consultarProgresoMiembro).toHaveBeenLastCalledWith(miembroProgresoId, { tipo: 'MARCA', desde: '2026-11-01', hasta: '2026-11-17' }));
  expect(consultarEvolucion).not.toHaveBeenCalled();
});
it('el modo entrenador fuerza solo lectura y no renderiza ninguna escritura', async () => {
  render(<VistaEvolucion consulta={{ modo: 'entrenador', miembroId: miembroProgresoId }} soloLectura={false} />);
  await screen.findByRole('table');
  expect(screen.queryByRole('button', { name: /Editar|Registrar|Agregar|Guardar/ })).toBeNull();
  expect(screen.queryByRole('columnheader', { name: 'Acción' })).toBeNull();
  expect(screen.queryByRole('dialog')).toBeNull();
  expect(editarProgreso).not.toHaveBeenCalled(); expect(registrarProgreso).not.toHaveBeenCalled();
});
it('no acepta series externas que eludan la autorización del entrenador', async () => {
  vi.mocked(consultarProgresoMiembro).mockResolvedValue({ ok: false, status: 403, error: 'Mensaje del backend' });
  render(<VistaEvolucion consulta={{ modo: 'entrenador', miembroId: miembroProgresoId }} seriesExternas={seriesEntrenador} />);
  expect(await screen.findByText('No tienes permiso para ver este recurso')).toBeTruthy(); sinDatosPrivados();
});
it('purga datos previos si una recarga responde 403', async () => {
  render(vista()); await screen.findByRole('table');
  vi.mocked(consultarProgresoMiembro).mockResolvedValue({ ok: false, status: 403, error: 'Mensaje del backend' });
  fireEvent.click(screen.getByRole('button', { name: 'Actualizar' }));
  expect(await screen.findByText('No tienes permiso para ver este recurso')).toBeTruthy(); sinDatosPrivados();
});
it('cambiar de miembro oculta datos de inmediato e ignora una respuesta tardía anterior', async () => {
  let resolver!: (res: Resultado<Serie[]>) => void;
  const { rerender } = render(vista()); await screen.findByRole('table');
  vi.mocked(consultarProgresoMiembro).mockReturnValueOnce(new Promise((r) => { resolver = r; }));
  fireEvent.click(screen.getByRole('button', { name: 'Actualizar' }));
  vi.mocked(consultarProgresoMiembro).mockResolvedValue({ ok: false, status: 403, error: 'denegado' });
  rerender(vista(otroMiembroId)); sinDatosPrivados();
  await screen.findByText('No tienes permiso para ver este recurso');
  await act(async () => { resolver({ ok: true, data: seriesEntrenador }); });
  await waitFor(() => { sinDatosPrivados(); expect(consultarProgresoMiembro).toHaveBeenLastCalledWith(otroMiembroId, {}); });
});
it('muestra vacío en tercera persona', async () => {
  vi.mocked(consultarProgresoMiembro).mockResolvedValue({ ok: true, data: [] });
  render(vista());
  expect(await screen.findByText('El miembro no tiene registros de progreso para los filtros seleccionados.')).toBeTruthy();
  sinDatosPrivados();
});
it('ofrece iniciar sesión ante 401 y no muestra datos', async () => {
  vi.mocked(consultarProgresoMiembro).mockResolvedValue({ ok: false, status: 401, error: 'Tu sesión expiró. Vuelve a iniciar sesión.' });
  render(vista());
  expect(await screen.findByRole('link', { name: 'Iniciar sesión' })).toBeTruthy(); sinDatosPrivados();
});
it('un fallo de conexión permite reintentar sin usar progreso/mio', async () => {
  vi.mocked(consultarProgresoMiembro).mockRejectedValueOnce(new TypeError('offline'));
  render(vista());
  await screen.findByText('No se pudo conectar con el servidor. Intenta de nuevo.');
  fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
  await screen.findByRole('table'); expect(consultarProgresoMiembro).toHaveBeenCalledTimes(2);
  expect(consultarEvolucion).not.toHaveBeenCalled();
});
it('H16 mantiene registro, marcas y edición del miembro', async () => {
  render(<MiProgresoPage />); await screen.findByRole('table');
  expect(consultarProgresoMiembro).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: '+ Registrar progreso' }));
  expect(screen.getByRole('button', { name: '+ Agregar marca' })).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
  fireEvent.click(screen.getAllByRole('button', { name: 'Editar' })[0]);
  const modal = within(screen.getByRole('dialog'));
  fireEvent.change(modal.getByLabelText('Valor (kg)'), { target: { value: '77' } });
  fireEvent.click(modal.getByRole('button', { name: 'Guardar cambios' }));
  await screen.findByText('Medición actualizada');
  expect(editarProgreso).toHaveBeenCalledWith('p2', expect.objectContaining({ valor: 77 }));
});

it('H16 conserva la consulta propia y los filtros sin confundirla con el entrenador', async () => {
  render(<VistaEvolucion />); await screen.findByRole('table');
  fireEvent.change(screen.getByLabelText('Tipo de medición'), { target: { value: 'PESO' } });
  fireEvent.click(screen.getByRole('button', { name: 'Aplicar filtros' }));
  await waitFor(() => expect(consultarEvolucion).toHaveBeenLastCalledWith({ tipo: 'PESO' }));
  expect(consultarProgresoMiembro).not.toHaveBeenCalled();
});

it('mantiene compatibilidad con series externas estáticas de H16', async () => {
  render(<VistaEvolucion seriesExternas={seriesEntrenador} soloLectura />);
  expect(screen.getByRole('table')).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Aplicar filtros' })).toBeNull();
  expect(consultarEvolucion).not.toHaveBeenCalled();
  expect(consultarProgresoMiembro).not.toHaveBeenCalled();
});

it('incrementar revisionRegistro recarga progreso/mio conservando filtros sin consultar al entrenador', async () => {
  const { rerender } = render(<VistaEvolucion revisionRegistro={0} />);
  await screen.findByRole('table');
  fireEvent.change(screen.getByLabelText('Tipo de medición'), { target: { value: 'PESO' } });
  fireEvent.click(screen.getByRole('button', { name: 'Aplicar filtros' }));
  await waitFor(() => expect(consultarEvolucion).toHaveBeenLastCalledWith({ tipo: 'PESO' }));
  await screen.findByRole('table');
  const consultasPrevias = vi.mocked(consultarEvolucion).mock.calls.length;
  rerender(<VistaEvolucion revisionRegistro={1} />);
  await waitFor(() => expect(consultarEvolucion).toHaveBeenCalledTimes(consultasPrevias + 1));
  expect(consultarEvolucion).toHaveBeenLastCalledWith({ tipo: 'PESO' });
  expect((screen.getByLabelText('Tipo de medición') as HTMLSelectElement).value).toBe('PESO');
  expect(consultarProgresoMiembro).not.toHaveBeenCalled();
});
