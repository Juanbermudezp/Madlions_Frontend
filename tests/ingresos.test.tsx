import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { obtenerDetalleIngresos, obtenerReporteIngresos } from '@/app/actions/reportes';
import { ReporteIngresos } from '@/components/reportes/reporte-ingresos';
import { GraficaIngresos } from '@/components/reportes/grafica-ingresos';
import { exportarReportePDF } from '@/lib/exportar-pdf';
import type { Resultado } from '@/lib/reportes';
import type { DetalleIngresos, ReporteIngresos as Reporte } from '@/lib/reportes-ingresos';
import { sumarDias } from '@/lib/clases';
import { INGRESOS, INGRESOS_A, INGRESOS_CERO, paginaIngresos, pagoIngreso, RANGO_INGRESOS } from './ingresos-fixtures';

vi.mock('@/app/actions/reportes', () => ({ obtenerReporteIngresos: vi.fn(), obtenerDetalleIngresos: vi.fn() }));
vi.mock('@/lib/exportar-pdf', async (original) => ({ ...(await original<typeof import('@/lib/exportar-pdf')>()), exportarReportePDF: vi.fn() }));
// jsdom no implementa el top layer nativo. La emulación solo permite probar
// estado/foco explícito; el atrapado de foco nativo se comprueba en Chrome.
HTMLDialogElement.prototype.showModal = function () { this.open = true; };
HTMLDialogElement.prototype.close = function () { this.open = false; };
beforeEach(() => {
  vi.mocked(obtenerReporteIngresos).mockResolvedValue({ ok: true, datos: INGRESOS });
  vi.mocked(obtenerDetalleIngresos).mockImplementation(async (_concepto, _rango, pagina = 1) => paginaIngresos(pagina));
  vi.mocked(exportarReportePDF).mockResolvedValue(undefined);
});
afterEach(() => { cleanup(); vi.resetAllMocks(); });

const mostrar = (datos: Reporte = INGRESOS) => render(<ReporteIngresos inicial={{ ok: true, datos }} rangoInicial={RANGO_INGRESOS} />);
const abrir = async () => {
  fireEvent.click(screen.getByRole('button', { name: 'Ver detalle de membresías' }));
  return within(await screen.findByRole('dialog'));
};

it('QA-27.1 A presenta los importes conocidos del contrato en tarjetas, gráfica, tablas y PDF', async () => {
  render(<ReporteIngresos inicial={{ ok: true, datos: INGRESOS_A }} rangoInicial={{ desde: '2026-11-01', hasta: '2026-11-02' }} />);
  for (const [region, importe] of [['Ingresos totales', '$192.10'], ['Subtotal', '$170.00'], ['IVA (13 %)', '$22.10']]) {
    expect(within(screen.getByRole('region', { name: region })).getByText(importe)).toBeTruthy();
  }
  const comparacion = within(screen.getByRole('region', { name: 'Comparación con período anterior' }));
  expect(comparacion.getByText('+$79.10')).toBeTruthy(); expect(comparacion.getByText('+70.0 %')).toBeTruthy();
  expect([...screen.getByRole('img').querySelectorAll('title')].map((t) => t.textContent))
    .toEqual(['01/11/2026: $169.50', '02/11/2026: $22.60']);
  const conceptos = within(screen.getByRole('region', { name: 'Ingresos por concepto' }));
  for (const importe of ['$113.00', '$56.50', '$22.60']) expect(conceptos.getByText(importe)).toBeTruthy();
  const planes = within(screen.getByRole('region', { name: 'Ingresos por tipo de plan' }));
  for (const importe of ['$113.00', '$56.50', '$0.00']) expect(planes.getByText(importe)).toBeTruthy();
  fireEvent.click(screen.getByText('Ver ingresos diarios en tabla'));
  expect(within(screen.getByRole('table', { name: 'Ingresos diarios en dólares' })).getByText('$169.50')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Exportar PDF' }));
  await waitFor(() => expect(exportarReportePDF).toHaveBeenCalledOnce());
  expect(vi.mocked(exportarReportePDF).mock.calls[0][0]).toMatchObject({
    rango: { desde: '2026-11-01', hasta: '2026-11-02' },
    filas: expect.arrayContaining([['Totales', 'Subtotal', '$170.00'], ['Comparación', 'Variación', '+70.0 %']]),
  });
});

it('presenta período, cuatro tarjetas y valores del servidor con dos decimales', () => {
  mostrar({ ...INGRESOS, subtotal: 987.65, iva: 142.35 }); // No recalcular el IVA en UI.
  expect(screen.getByRole('heading', { name: 'Reporte de ingresos' })).toBeTruthy();
  expect(screen.getByText('18/11/2026 al 20/11/2026 · Pagos aprobados, IVA incluido')).toBeTruthy();
  expect(within(screen.getByRole('region', { name: 'Ingresos totales' })).getByText('$1,130.00')).toBeTruthy();
  expect(within(screen.getByRole('region', { name: 'Subtotal' })).getByText('$987.65')).toBeTruthy();
  expect(within(screen.getByRole('region', { name: 'IVA (13 %)' })).getByText('$142.35')).toBeTruthy();
  expect(screen.getByRole('region', { name: 'Comparación con período anterior' })).toBeTruthy();
});
it.each([
  [230, 25.6, '+$230.00', 'Aumento', '+25.6 %', '↑'],
  [-4.5, -11.3, '-$4.50', 'Disminución', '-11.3 %', '↓'],
  [0, 0, '$0.00', 'Sin cambios', '0.0 %', '→'],
  [1130, null, '+$1,130.00', 'Aumento', 'Sin período de comparación', '↑'],
] as const)('comparación %s: signo, texto y porcentaje %s sin depender solo del color', (diferencia, porcentaje, monto, descripcion, variacion, flecha) => {
  mostrar({ ...INGRESOS, anterior: { total: 900, diferencia, porcentaje } });
  const tarjeta = screen.getByRole('region', { name: 'Comparación con período anterior' });
  expect(tarjeta.textContent).toContain(monto); expect(tarjeta.textContent).toContain(flecha);
  expect(within(tarjeta).getByText(descripcion)).toBeTruthy();
  expect(within(tarjeta).getByText(variacion, { exact: true })).toBeTruthy();
});
it('conserva tres conceptos, tres planes y aclara la exclusión de sesiones', () => {
  mostrar();
  const conceptos = within(screen.getByRole('region', { name: 'Ingresos por concepto' }));
  expect(conceptos.getAllByRole('button', { name: /Ver detalle/ })).toHaveLength(3);
  for (const texto of ['Membresías', 'Renovaciones', 'Sesiones adicionales', '$500.00', '$400.00', '$230.00']) expect(conceptos.getByText(texto)).toBeTruthy();
  const planes = within(screen.getByRole('region', { name: 'Ingresos por tipo de plan' }));
  for (const texto of ['Daypass', 'Mensual', 'Set de clases mensual']) expect(planes.getByText(texto)).toBeTruthy();
  expect(planes.getByText('Solo membresías y renovaciones. No incluye las sesiones adicionales.')).toBeTruthy();
});
it('reporte totalmente cero conserva tarjetas, conceptos, gráfica y exportación', () => {
  mostrar(INGRESOS_CERO);
  expect(screen.getByText('No hay ingresos en este período')).toBeTruthy();
  expect(within(screen.getByRole('region', { name: 'Ingresos totales' })).getByText('$0.00')).toBeTruthy();
  expect(screen.getByText('Sin período de comparación', { exact: true })).toBeTruthy();
  expect(screen.getByRole('img', { name: /Gráfica de ingresos por día/ })).toBeTruthy();
  expect((screen.getByRole('button', { name: 'Exportar PDF' }) as HTMLButtonElement).disabled).toBe(false);
  expect(screen.getAllByRole('button', { name: /Ver detalle/ })).toHaveLength(3);
});
it('la gráfica ordena días, conserva ceros y ofrece alternativa textual', () => {
  render(<GraficaIngresos dias={[...INGRESOS.porDia].reverse()} />);
  const svg = screen.getByRole('img');
  expect([...svg.querySelectorAll('title')].map((t) => t.textContent)).toEqual(['18/11/2026: $1,130.00', '19/11/2026: $0.00', '20/11/2026: $0.00']);
  fireEvent.click(screen.getByText('Ver ingresos diarios en tabla'));
  expect(screen.getByRole('table', { name: 'Ingresos diarios en dólares' })).toBeTruthy();
});
it('gráfica de 12 meses no superpone cientos de etiquetas', () => {
  render(<GraficaIngresos dias={Array.from({ length: 365 }, (_, i) => ({ fecha: sumarDias('2026-01-01', i), total: 0 }))} />);
  const svg = screen.getByRole('img');
  expect(svg.querySelectorAll('circle')).toHaveLength(365);
  expect(svg.querySelectorAll('text')).toHaveLength(0);
  expect(svg.getAttribute('aria-label')).toContain('365 días');
});
it('rango inválido no consulta ni sustituye el reporte actual', () => {
  mostrar();
  fireEvent.change(screen.getByLabelText('Desde'), { target: { value: '2025-01-01' } });
  fireEvent.click(screen.getByRole('button', { name: 'Aplicar' }));
  expect(screen.getByRole('alert').textContent).toBe('El rango máximo es de 12 meses');
  expect(obtenerReporteIngresos).not.toHaveBeenCalled();
});
it('aplica un rango, muestra carga y deshabilita PDF antes de recibir datos nuevos', async () => {
  let resolver!: (r: Resultado<Reporte>) => void;
  vi.mocked(obtenerReporteIngresos).mockReturnValueOnce(new Promise((r) => { resolver = r; }));
  mostrar();
  fireEvent.change(screen.getByLabelText('Desde'), { target: { value: '2026-11-01' } });
  fireEvent.click(screen.getByRole('button', { name: 'Aplicar' }));
  expect(screen.getByText('Cargando el reporte…')).toBeTruthy();
  expect(screen.queryByRole('region', { name: 'Ingresos totales' })).toBeNull();
  expect((screen.getByRole('button', { name: 'Exportar PDF' }) as HTMLButtonElement).disabled).toBe(true);
  expect(obtenerReporteIngresos).toHaveBeenCalledWith({ desde: '2026-11-01', hasta: '2026-11-20' });
  await act(async () => resolver({ ok: true, datos: INGRESOS_CERO }));
  expect(screen.getByText('No hay ingresos en este período')).toBeTruthy();
});
it('una respuesta de rango antigua no sobrescribe la consulta más reciente ni su PDF', async () => {
  let primera!: (r: Resultado<Reporte>) => void, segunda!: (r: Resultado<Reporte>) => void;
  vi.mocked(obtenerReporteIngresos).mockReturnValueOnce(new Promise((r) => { primera = r; })).mockReturnValueOnce(new Promise((r) => { segunda = r; }));
  mostrar();
  fireEvent.change(screen.getByLabelText('Desde'), { target: { value: '2026-11-01' } });
  fireEvent.submit(screen.getByRole('form', { name: 'Rango de fechas' }));
  fireEvent.change(screen.getByLabelText('Desde'), { target: { value: '2026-11-10' } });
  fireEvent.submit(screen.getByRole('form', { name: 'Rango de fechas' }));
  await act(async () => segunda({ ok: true, datos: INGRESOS_CERO }));
  await act(async () => primera({ ok: true, datos: INGRESOS }));
  expect(screen.getByText('No hay ingresos en este período')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Exportar PDF' }));
  await waitFor(() => expect(exportarReportePDF).toHaveBeenCalledOnce());
  const pdf = vi.mocked(exportarReportePDF).mock.calls[0][0];
  expect(pdf.rango).toEqual({ desde: '2026-11-10', hasta: '2026-11-20' });
  expect(pdf.filas).toContainEqual(['Totales', 'Ingresos totales (IVA incluido)', '$0.00']);
});
it.each([400, 401, 403, 500])('error HTTP %s purga ingresos y bloquea exportación', async (estado) => {
  vi.mocked(obtenerReporteIngresos).mockResolvedValue({ ok: false, estado, error: `HTTP ${estado}` });
  mostrar(); fireEvent.click(screen.getByRole('button', { name: 'Actualizar' }));
  if (estado === 403) await screen.findByRole('heading', { name: 'Acceso denegado' });
  else await screen.findByText(`No se pudo cargar el reporte. HTTP ${estado}`);
  expect(screen.queryByRole('region', { name: 'Ingresos totales' })).toBeNull();
  expect((screen.getByRole('button', { name: 'Exportar PDF' }) as HTMLButtonElement).disabled).toBe(true);
  if (estado === 401) expect(screen.getByRole('link', { name: 'Iniciar sesión' }).getAttribute('href')).toBe('/login');
});
it('fallo inesperado de conexión permite reintentar sin restaurar importes antiguos', async () => {
  vi.mocked(obtenerReporteIngresos).mockRejectedValueOnce(new TypeError('offline')).mockResolvedValueOnce({ ok: true, datos: INGRESOS_CERO });
  mostrar(); fireEvent.click(screen.getByRole('button', { name: 'Actualizar' }));
  await screen.findByText(/No se pudo cargar el reporte. No se pudo conectar/);
  fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
  await screen.findByText('No hay ingresos en este período');
  expect(obtenerReporteIngresos).toHaveBeenLastCalledWith(RANGO_INGRESOS);
});
it('exporta título, período, totales, comparación, desgloses y días actuales', async () => {
  mostrar(); fireEvent.click(screen.getByRole('button', { name: 'Exportar PDF' }));
  await waitFor(() => expect(exportarReportePDF).toHaveBeenCalledOnce());
  expect(vi.mocked(exportarReportePDF).mock.calls[0][0]).toMatchObject({ titulo: 'Reporte de ingresos', nombre: 'ingresos', rango: RANGO_INGRESOS });
});
it('modal accesible abre con foco en Cerrar, carga y restaura foco al cerrarse', async () => {
  mostrar();
  const boton = screen.getByRole('button', { name: 'Ver detalle de membresías' }); boton.focus(); fireEvent.click(boton);
  const dialogo = await screen.findByRole('dialog');
  expect(document.activeElement).toBe(within(dialogo).getByRole('button', { name: 'Cerrar' }));
  expect(document.body.style.overflow).toBe('hidden');
  await within(dialogo).findByText('Miembro QA 1');
  expect(within(dialogo).getByRole('heading', { name: 'Pagos de membresías' })).toBeTruthy();
  fireEvent(within(dialogo).getByRole('button', { name: 'Cerrar' }), new MouseEvent('click', { bubbles: true }));
  expect(screen.queryByRole('dialog')).toBeNull(); expect(document.activeElement).toBe(boton);
  expect(document.body.style.overflow).toBe('');
});
it('Escape (evento cancel nativo) cierra el modal y reabrir vuelve a consultar', async () => {
  mostrar();
  const disparador = screen.getByRole('button', { name: 'Ver detalle de membresías' });
  disparador.focus();
  await abrir(); await screen.findByText('Miembro QA 1');
  // Escape produce cancel en un dialog nativo; jsdom no ejecuta ese comportamiento del navegador.
  fireEvent(screen.getByRole('dialog'), new Event('cancel', { bubbles: true, cancelable: true }));
  expect(screen.queryByRole('dialog')).toBeNull();
  expect(document.activeElement).toBe(disparador);
  await abrir(); await screen.findByText('Miembro QA 1');
  expect(obtenerDetalleIngresos).toHaveBeenCalledTimes(2);
});
it('Tab y Shift+Tab ciclan el foco sin entrar en el selector de fechas cerrado ni salir del modal', async () => {
  mostrar(); const modal = await abrir(); await modal.findByText('Miembro QA 1');
  const primero = modal.getByRole('button', { name: 'Cerrar' });
  const ultimo = modal.getByRole('button', { name: 'Siguiente' });
  primero.focus();
  fireEvent.keyDown(primero, { key: 'Tab', shiftKey: true });
  expect(document.activeElement).toBe(ultimo);
  fireEvent.keyDown(ultimo, { key: 'Tab' });
  expect(document.activeElement).toBe(primero);
});
it('modal pagina 25 pagos en 20/5, usa API y bloquea los límites', async () => {
  mostrar(); const modal = await abrir(); await modal.findByText('Miembro QA 1');
  expect(modal.getAllByRole('row')).toHaveLength(21);
  expect(modal.getByText('Miembro QA 20')).toBeTruthy();
  expect(modal.queryByText('Miembro QA 21')).toBeNull();
  expect(obtenerDetalleIngresos).toHaveBeenLastCalledWith('MEMBRESIA', RANGO_INGRESOS, 1);
  expect((modal.getByRole('button', { name: 'Anterior' }) as HTMLButtonElement).disabled).toBe(true);
  fireEvent.click(modal.getByRole('button', { name: 'Siguiente' }));
  expect(modal.queryByText('Miembro QA 1')).toBeNull();
  await modal.findByText('Miembro QA 21');
  expect(modal.getAllByRole('row')).toHaveLength(6);
  expect(modal.getByText('Miembro QA 25')).toBeTruthy();
  expect(modal.getByText('Página 2 · 25 pagos')).toBeTruthy();
  expect((modal.getByRole('button', { name: 'Siguiente' }) as HTMLButtonElement).disabled).toBe(true);
  expect(obtenerDetalleIngresos).toHaveBeenLastCalledWith('MEMBRESIA', RANGO_INGRESOS, 2);
  fireEvent.click(modal.getByRole('button', { name: 'Anterior' }));
  await modal.findByText('Miembro QA 1');
  expect(obtenerDetalleIngresos).toHaveBeenLastCalledWith('MEMBRESIA', RANGO_INGRESOS, 1);
  expect(vi.mocked(obtenerDetalleIngresos).mock.calls.map((llamada) => llamada[2])).toEqual([1, 2, 1]);
  for (const campo of ['MBR-000001', '18/11/2026', '$35.00', 'PAY-20261118-000001']) expect(modal.getAllByText(campo).length).toBeGreaterThan(0);
});
it('concepto sin pagos muestra vacío con total cero y botones limitados', async () => {
  vi.mocked(obtenerDetalleIngresos).mockResolvedValue({ ok: true, datos: { items: [], total: 0, pagina: 1 } });
  mostrar(); const modal = await abrir();
  await modal.findByText('No hay pagos para este concepto en esta página');
  expect(modal.queryByRole('table')).toBeNull();
  expect(modal.getByText('Página 1 · 0 pagos')).toBeTruthy();
  expect((modal.getByRole('button', { name: 'Siguiente' }) as HTMLButtonElement).disabled).toBe(true);
});
it('error de detalle y reintento vuelven a pedir la misma página', async () => {
  vi.mocked(obtenerDetalleIngresos).mockResolvedValueOnce({ ok: false, estado: 500, error: 'HTTP 500' });
  mostrar(); const modal = await abrir(); await modal.findByText('No se pudo cargar el reporte. HTTP 500');
  fireEvent.click(modal.getByRole('button', { name: 'Reintentar' }));
  await modal.findByText('Miembro QA 1');
  expect(obtenerDetalleIngresos).toHaveBeenCalledTimes(2);
  expect(obtenerDetalleIngresos).toHaveBeenLastCalledWith('MEMBRESIA', RANGO_INGRESOS, 1);
});
it('error de conexión del detalle se recupera con Reintentar', async () => {
  vi.mocked(obtenerDetalleIngresos).mockRejectedValueOnce(new TypeError('offline'));
  mostrar(); const modal = await abrir(); await modal.findByText(/No se pudo conectar/);
  fireEvent.click(modal.getByRole('button', { name: 'Reintentar' })); await modal.findByText('Miembro QA 1');
});
it('cambio de concepto descarta la respuesta anterior y reinicia página sin pagos residuales', async () => {
  let anterior!: (r: Resultado<DetalleIngresos>) => void;
  let actual!: (r: Resultado<DetalleIngresos>) => void;
  vi.mocked(obtenerDetalleIngresos).mockReturnValueOnce(new Promise((r) => { anterior = r; }));
  mostrar(); const modal = await abrir();
  vi.mocked(obtenerDetalleIngresos).mockReturnValueOnce(new Promise((r) => { actual = r; }));
  fireEvent.change(modal.getByLabelText('Concepto'), { target: { value: 'RENOVACION' } });
  await act(async () => anterior(paginaIngresos(1)));
  expect(modal.queryByText('Miembro QA 1')).toBeNull();
  expect(modal.getByText('Cargando el reporte…')).toBeTruthy();
  expect(modal.queryByRole('table')).toBeNull();
  await act(async () => actual({ ok: true, datos: { items: [{ ...pagoIngreso(99), miembro: 'Pago de renovación' }], total: 1, pagina: 1 } }));
  expect(modal.getByText('Pago de renovación')).toBeTruthy();
  expect(modal.queryByText('Miembro QA 1')).toBeNull();
  expect(obtenerDetalleIngresos).toHaveBeenLastCalledWith('RENOVACION', RANGO_INGRESOS, 1);
});
it('cambiar rango dentro del modal abierto consulta página 1 con el período nuevo', async () => {
  mostrar(); const modal = await abrir(); await modal.findByText('Miembro QA 1');
  fireEvent.click(modal.getByRole('button', { name: 'Siguiente' })); await modal.findByText('Miembro QA 21');
  fireEvent.click(modal.getByText('Cambiar período'));
  fireEvent.change(modal.getByLabelText('Desde'), { target: { value: '2026-11-01' } });
  fireEvent.submit(modal.getByRole('form', { name: 'Rango de fechas' }));
  expect(modal.queryByText('Miembro QA 21')).toBeNull();
  await modal.findByText('Miembro QA 1');
  expect(obtenerDetalleIngresos).toHaveBeenLastCalledWith('MEMBRESIA', { desde: '2026-11-01', hasta: '2026-11-20' }, 1);
  expect(obtenerReporteIngresos).toHaveBeenLastCalledWith({ desde: '2026-11-01', hasta: '2026-11-20' });
});
it('al cambiar ambas fechas desde el modal y cerrar, el selector principal muestra el período aplicado', async () => {
  mostrar(); const modal = await abrir(); await modal.findByText('Miembro QA 1');
  fireEvent.click(modal.getByText('Cambiar período'));
  fireEvent.change(modal.getByLabelText('Desde'), { target: { value: '2026-11-01' } });
  fireEvent.change(modal.getByLabelText('Hasta'), { target: { value: '2026-11-15' } });
  fireEvent.submit(modal.getByRole('form', { name: 'Rango de fechas' }));
  await modal.findByText('Miembro QA 1');
  fireEvent.click(modal.getByRole('button', { name: 'Cerrar' }));
  expect(screen.queryByRole('dialog')).toBeNull();
  const principal = within(screen.getByRole('form', { name: 'Rango de fechas' }));
  expect((principal.getByLabelText('Desde') as HTMLInputElement).value).toBe('2026-11-01');
  expect((principal.getByLabelText('Hasta') as HTMLInputElement).value).toBe('2026-11-15');
  expect((principal.getByRole('button', { name: 'Aplicar' }) as HTMLButtonElement).disabled).toBe(true);
  expect(obtenerReporteIngresos).toHaveBeenLastCalledWith({ desde: '2026-11-01', hasta: '2026-11-15' });
  expect(obtenerDetalleIngresos).toHaveBeenLastCalledWith('MEMBRESIA', { desde: '2026-11-01', hasta: '2026-11-15' }, 1);
});
it.each([401, 403])('detalle HTTP %s cierra modal y purga también el resumen protegido', async (estado) => {
  vi.mocked(obtenerDetalleIngresos).mockResolvedValue({ ok: false, estado, error: `HTTP ${estado}` });
  mostrar(); await abrir();
  if (estado === 403) await screen.findByRole('heading', { name: 'Acceso denegado' }); else await screen.findByRole('link', { name: 'Iniciar sesión' });
  expect(screen.queryByRole('dialog')).toBeNull();
  expect(screen.queryByRole('region', { name: 'Ingresos totales' })).toBeNull();
  expect((screen.getByRole('button', { name: 'Exportar PDF' }) as HTMLButtonElement).disabled).toBe(true);
});
it('una página atrasada no restaura pagos después de cambiar período dentro del modal', async () => {
  let vieja!: (r: Resultado<DetalleIngresos>) => void;
  let actual!: (r: Resultado<DetalleIngresos>) => void;
  mostrar(); const modal = await abrir(); await modal.findByText('Miembro QA 1');
  vi.mocked(obtenerDetalleIngresos).mockReturnValueOnce(new Promise((r) => { vieja = r; }))
    .mockReturnValueOnce(new Promise((r) => { actual = r; }));
  fireEvent.click(modal.getByRole('button', { name: 'Siguiente' }));
  expect(modal.queryByText('Miembro QA 1')).toBeNull();
  fireEvent.click(modal.getByText('Cambiar período'));
  fireEvent.change(modal.getByLabelText('Desde'), { target: { value: '2026-11-01' } });
  fireEvent.submit(modal.getByRole('form', { name: 'Rango de fechas' }));
  await act(async () => vieja(paginaIngresos(2)));
  expect(modal.queryByText('Miembro QA 21')).toBeNull();
  expect(modal.queryByRole('table')).toBeNull();
  expect(modal.getByText('Cargando el reporte…')).toBeTruthy();
  await act(async () => actual({ ok: true, datos: { items: [{ ...pagoIngreso(88), miembro: 'Pago del período nuevo' }], total: 1, pagina: 1 } }));
  expect(modal.getByText('Pago del período nuevo')).toBeTruthy();
  expect(modal.queryByText('Miembro QA 21')).toBeNull();
  expect(modal.getByText('Página 1 · 1 pago')).toBeTruthy();
});
it('cerrar y reabrir ignora una consulta pendiente de la apertura anterior', async () => {
  let vieja!: (r: Resultado<DetalleIngresos>) => void;
  vi.mocked(obtenerDetalleIngresos).mockReturnValueOnce(new Promise((r) => { vieja = r; }))
    .mockResolvedValueOnce({ ok: true, datos: { items: [{ ...pagoIngreso(77), miembro: 'Pago de reapertura' }], total: 1, pagina: 1 } });
  mostrar(); const primera = await abrir(); fireEvent.click(primera.getByRole('button', { name: 'Cerrar' }));
  const segunda = await abrir(); await segunda.findByText('Pago de reapertura');
  await act(async () => vieja(paginaIngresos(1)));
  expect(segunda.queryByText('Miembro QA 1')).toBeNull();
  expect(segunda.getByText('Pago de reapertura')).toBeTruthy();
});
it('un resumen pendiente no restaura finanzas tras un 403 más reciente en el detalle', async () => {
  let resumenViejo!: (r: Resultado<Reporte>) => void;
  mostrar(); const modal = await abrir(); await modal.findByText('Miembro QA 1');
  vi.mocked(obtenerReporteIngresos).mockReturnValueOnce(new Promise((r) => { resumenViejo = r; }));
  vi.mocked(obtenerDetalleIngresos).mockResolvedValueOnce({ ok: false, estado: 403, error: 'Acceso denegado' });
  fireEvent.click(modal.getByText('Cambiar período'));
  fireEvent.change(modal.getByLabelText('Desde'), { target: { value: '2026-11-01' } });
  fireEvent.submit(modal.getByRole('form', { name: 'Rango de fechas' }));
  await screen.findByRole('heading', { name: 'Acceso denegado' });
  await act(async () => resumenViejo({ ok: true, datos: INGRESOS }));
  expect(screen.queryByRole('region', { name: 'Ingresos totales' })).toBeNull();
  expect(screen.queryByRole('dialog')).toBeNull();
  expect((screen.getByRole('button', { name: 'Exportar PDF' }) as HTMLButtonElement).disabled).toBe(true);
});
