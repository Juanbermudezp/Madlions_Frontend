import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { obtenerReporteRenovacion } from '@/app/actions/reportes';
import { exportarReportePDF } from '@/lib/exportar-pdf';
import { ReporteRenovacion } from '@/components/reportes/reporte-renovacion';
import type { Resultado } from '@/lib/reportes';
import type { ReporteRenovacion as Reporte } from '@/lib/reportes-renovacion';
import { RENOVACION, RENOVACION_VACIA, RANGO_RENOVACION } from './renovacion-fixtures';

const navegar = vi.hoisted(() => ({ replace: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => navegar }));
vi.mock('@/app/actions/reportes', () => ({ obtenerReporteRenovacion: vi.fn() }));
vi.mock('@/lib/exportar-pdf', async (original) => ({ ...await original<typeof import('@/lib/exportar-pdf')>(), exportarReportePDF: vi.fn() }));
beforeEach(() => {
  vi.mocked(obtenerReporteRenovacion).mockResolvedValue({ ok: true, datos: RENOVACION });
  vi.mocked(exportarReportePDF).mockResolvedValue(undefined);
});
afterEach(() => { cleanup(); vi.resetAllMocks(); });
const mostrar = (datos: Reporte = RENOVACION) => render(<ReporteRenovacion inicial={{ ok: true, datos }} rangoInicial={RANGO_RENOVACION} />);
const aplicar = (desde: string) => {
  fireEvent.change(screen.getByLabelText('Desde'), { target: { value: desde } });
  fireEvent.submit(screen.getByRole('form', { name: 'Rango de fechas' }));
};

it('C5:4/3/1, tasas57.1/42.9, dona7 sin gracia y lista oficial en orden', () => {
  mostrar();
  expect(within(screen.getByRole('region', { name: 'Tasa de renovación' })).getByText('57.1 %')).toBeTruthy();
  expect(within(screen.getByRole('region', { name: 'Tasa de cancelación' })).getByText('42.9 %')).toBeTruthy();
  expect(within(screen.getByRole('region', { name: 'En período de renovación' })).getByText('1')).toBeTruthy();
  expect(screen.getByRole('img').getAttribute('aria-label')).toBe('Renovadas: 4 (57.1 %). Canceladas: 3 (42.9 %). Total: 7.');
  expect(screen.getByRole('img').querySelectorAll('circle')[1].getAttribute('stroke-dasharray')).toBe('57.1 100');
  const filas = screen.getAllByRole('row').slice(1);
  expect(filas.map((f) => f.textContent)).toEqual([
    'Sofía CastilloMBR-000045Set de clases mensual25/10/2026', 'Diego FloresMBR-000033Mensual20/10/2026', 'Laura HernándezMBR-000021Mensual15/10/2026',
  ]);
  expect(screen.queryByText('Javier Ortiz')).toBeNull();
  expect(screen.getByText(/Los Daypass no se incluyen/)).toBeTruthy();
  expect(screen.queryByText(/WhatsApp|enviado|email/i)).toBeNull();
});
it('presenta tasas del servidor sin calcularlas de nuevo ni inventar variaciones', () => {
  mostrar({ ...RENOVACION, tasaRenovacion: 61.2, tasaCancelacion: 38.8 });
  expect(screen.getByRole('img').getAttribute('aria-label')).toContain('61.2 %');
  expect(within(screen.getByRole('region', { name: 'Tasa de renovación' })).getByText('61.2 %')).toBeTruthy();
  expect(screen.queryByText(/\+4\.2/)).toBeNull();
});
it.each(['SOFIA', 'sofía', 'mbr-000045', '  SOFÍA  '])('búsqueda normalizada por nombre/código:%s', (consulta) => {
  mostrar(); fireEvent.change(screen.getByRole('searchbox'), { target: { value: consulta } });
  expect(screen.getByText('Sofía Castillo')).toBeTruthy(); expect(screen.queryByText('Diego Flores')).toBeNull();
  expect(screen.getByText('1 de 3 membresías')).toBeTruthy();
});
it('búsqueda sin coincidencias, borrar restaura orden y3miembros', () => {
  mostrar(); fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'inexistente' } });
  expect(screen.getByText('No hay coincidencias con la búsqueda.')).toBeTruthy();
  fireEvent.change(screen.getByRole('searchbox'), { target: { value: '' } });
  expect(screen.getAllByRole('row')).toHaveLength(4);
});
it('PDF exporta3miembros aunque la búsqueda muestre solo1', async () => {
  mostrar(); fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'SOFIA' } });
  fireEvent.click(screen.getByRole('button', { name: 'Exportar PDF' }));
  await waitFor(() => expect(exportarReportePDF).toHaveBeenCalledOnce());
  const pdf = vi.mocked(exportarReportePDF).mock.calls[0][0];
  expect(pdf).toMatchObject({ titulo: 'Reporte de renovación y cancelación', nombre: 'renovacion', rango: RANGO_RENOVACION });
  expect(pdf.filas).toContainEqual(['Laura Hernández', 'MBR-000021', 'Mensual', '15/10/2026']);
  expect(pdf.filas).toContainEqual(['Resumen', 'Tasa de renovación', '57.1 %', '']);
  expect(pdf.filas).toHaveLength(8);
});
it.each([0, 1])('C6:vacío/solo gracia%s, tasasnull sin dona ni cancelados', (enPeriodo) => {
  mostrar({ ...RENOVACION_VACIA, enPeriodo });
  expect(screen.queryByRole('img')).toBeNull(); expect(screen.getAllByText('Sin datos suficientes').length).toBeGreaterThan(0);
  expect(screen.getByText('No hay miembros que no renovaron en este período.')).toBeTruthy();
  expect((screen.getByRole('button', { name: 'Exportar PDF' }) as HTMLButtonElement).disabled).toBe(false);
});
it('carga purga indicadores/lista y bloquea PDF hasta datos recientes', async () => {
  let resolver!: (r: Resultado<Reporte>) => void;
  vi.mocked(obtenerReporteRenovacion).mockReturnValueOnce(new Promise((r) => { resolver = r; }));
  mostrar(); aplicar('2026-10-08');
  expect(screen.getByText('Cargando el reporte…')).toBeTruthy(); expect(screen.queryByText('Sofía Castillo')).toBeNull();
  expect((screen.getByRole('button', { name: 'Exportar PDF' }) as HTMLButtonElement).disabled).toBe(true);
  await act(async () => resolver({ ok: true, datos: RENOVACION_VACIA }));
  expect(screen.queryByRole('img')).toBeNull();
});
it('respuesta antigua no sobrescribe datos ni PDF del período reciente', async () => {
  let antigua!: (r: Resultado<Reporte>) => void, reciente!: (r: Resultado<Reporte>) => void;
  vi.mocked(obtenerReporteRenovacion).mockReturnValueOnce(new Promise((r) => { antigua = r; })).mockReturnValueOnce(new Promise((r) => { reciente = r; }));
  mostrar(); aplicar('2026-10-08'); aplicar('2026-10-09');
  await act(async () => reciente({ ok: true, datos: RENOVACION_VACIA }));
  await act(async () => antigua({ ok: true, datos: RENOVACION }));
  expect(screen.queryByText('Sofía Castillo')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Exportar PDF' }));
  await waitFor(() => expect(exportarReportePDF).toHaveBeenCalledOnce());
  expect(vi.mocked(exportarReportePDF).mock.calls[0][0]).toMatchObject({ rango: { desde: '2026-10-09', hasta: '2026-11-06' }, filas: expect.arrayContaining([['Resumen', 'Renovadas', '0', '']]) });
});
it('error de rango local no consulta', () => {
  mostrar(); fireEvent.change(screen.getByLabelText('Desde'), { target: { value: '2027-01-01' } });
  fireEvent.submit(screen.getByRole('form', { name: 'Rango de fechas' }));
  expect(screen.getByRole('alert').textContent).toContain('La fecha de inicio no puede ser posterior');
  expect(obtenerReporteRenovacion).not.toHaveBeenCalled();
});
it.each([400, 403, 500])('HTTP%s purga datos protegidos y deshabilita PDF', async (estado) => {
  vi.mocked(obtenerReporteRenovacion).mockResolvedValue({ ok: false, estado, error: `HTTP${estado}` });
  mostrar(); fireEvent.click(screen.getByRole('button', { name: 'Actualizar' }));
  if (estado === 403) await screen.findByRole('heading', { name: 'Acceso denegado' }); else await screen.findByText(`No se pudo cargar el reporte. HTTP${estado}`);
  expect(screen.queryByText('Sofía Castillo')).toBeNull(); expect(screen.queryByRole('img')).toBeNull();
  expect((screen.getByRole('button', { name: 'Exportar PDF' }) as HTMLButtonElement).disabled).toBe(true);
});
it('401 redirige a login y purga el reporte', async () => {
  vi.mocked(obtenerReporteRenovacion).mockResolvedValue({ ok: false, estado: 401, error: 'Sesión expirada' });
  mostrar(); fireEvent.click(screen.getByRole('button', { name: 'Actualizar' }));
  await waitFor(() => expect(navegar.replace).toHaveBeenCalledWith('/login'));
  expect(screen.queryByText('Sofía Castillo')).toBeNull();
});
it('fallo de red, reintento con el rango actual y recuperación', async () => {
  vi.mocked(obtenerReporteRenovacion).mockRejectedValueOnce(new TypeError('offline')).mockResolvedValueOnce({ ok: true, datos: RENOVACION });
  mostrar(); aplicar('2026-10-08');
  fireEvent.click(await screen.findByRole('button', { name: 'Reintentar' }));
  await screen.findByText('Sofía Castillo');
  expect(obtenerReporteRenovacion).toHaveBeenLastCalledWith({ desde: '2026-10-08', hasta: '2026-11-06' });
});
it('respuesta200 antigua no restaura información tras403 reciente', async () => {
  let resolver!: (r: Resultado<Reporte>) => void;
  vi.mocked(obtenerReporteRenovacion).mockReturnValueOnce(new Promise((r) => { resolver = r; })).mockResolvedValueOnce({ ok: false, estado: 403, error: 'Acceso denegado' });
  mostrar(); aplicar('2026-10-08'); aplicar('2026-10-09');
  await screen.findByRole('heading', { name: 'Acceso denegado' }); await act(async () => resolver({ ok: true, datos: RENOVACION }));
  expect(screen.queryByText('Sofía Castillo')).toBeNull();
});
