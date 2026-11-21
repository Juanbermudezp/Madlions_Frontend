import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { redirect } from 'next/navigation';
import Page from '@/app/admin/reportes/ingresos/page';
import LayoutReportes from '@/app/admin/reportes/layout';
import LayoutAdmin from '@/app/admin/layout';
import { Shell } from '@/components/shell';
import { RutaProtegida } from '@/components/ruta-protegida';
import { ReporteIngresos } from '@/components/reportes/reporte-ingresos';
import { obtenerDetalleIngresos, obtenerReporteIngresos } from '@/app/actions/reportes';
import { obtenerUsuario } from '@/lib/dal';
import { rangoPorDefecto } from '@/lib/reportes';
import { sumarDias } from '@/lib/clases';
import { INGRESOS, INGRESOS_CERO, paginaIngresos, RANGO_INGRESOS } from './ingresos-fixtures';

vi.mock('@/app/actions/auth', () => ({ logout: vi.fn() }));
vi.mock('@/app/actions/reportes', () => ({ obtenerReporteIngresos: vi.fn(), obtenerDetalleIngresos: vi.fn() }));
vi.mock('@/lib/dal', () => ({ obtenerUsuario: vi.fn() }));
vi.mock('next/navigation', () => ({ usePathname: () => '/admin/reportes/ingresos', redirect: vi.fn(() => { throw new Error('REDIRECT_LOGIN'); }) }));
vi.mock('next/server', () => ({ connection: vi.fn(async () => undefined) }));
HTMLDialogElement.prototype.showModal = function () { this.open = true; };
HTMLDialogElement.prototype.close = function () { this.open = false; };
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date('2026-11-20T16:00:00Z'));
  vi.mocked(obtenerUsuario).mockResolvedValue({ id: 'admin', correo: '', nombre: 'Admin', apellido: 'QA', rol: 'ADMINISTRADOR' });
  vi.mocked(obtenerReporteIngresos).mockImplementation(async (rango) => {
    const porDia = [];
    for (let fecha = rango.desde; fecha <= rango.hasta; fecha = sumarDias(fecha, 1)) {
      porDia.push({ fecha, total: fecha === '2026-11-18' ? 1130 : 0 });
    }
    return { ok: true, datos: { ...INGRESOS, porDia } };
  });
  vi.mocked(obtenerDetalleIngresos).mockResolvedValue(paginaIngresos(1));
});
afterEach(() => { cleanup(); vi.resetAllMocks(); vi.useRealTimers(); });

function guardarVista(nombre: string) {
  if (process.env.H27_PREVIEW !== '1') return;
  const carpeta = join(process.cwd(), '.next', 'h27-preview'); mkdirSync(carpeta, { recursive: true });
  const chunks = join(process.cwd(), '.next', 'static', 'chunks');
  const css = readdirSync(chunks, { recursive: true }).filter((p) => typeof p === 'string' && p.endsWith('.css'))
    .map((p) => readFileSync(join(chunks, String(p)), 'utf8')).join('\n');
  writeFileSync(join(carpeta, `${nombre}.html`), `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style></head><body>${document.body.innerHTML}</body></html>`);
}

it('página inicial usa últimos 30 días y conserva las pestañas/layout reales de H26', async () => {
  const antes = new Date();
  render(await Shell({ children: LayoutReportes({ children: await Page() }) }));
  expect(obtenerReporteIngresos).toHaveBeenCalledWith(rangoPorDefecto(antes));
  expect(screen.getByRole('heading', { name: 'Reporte de ingresos' })).toBeTruthy();
  expect(screen.getByRole('link', { name: 'Ingresos' }).getAttribute('aria-current')).toBe('page');
  expect(screen.getByRole('link', { name: 'Ocupación' }).getAttribute('href')).toBe('/admin/reportes');
  expect(screen.getByRole('link', { name: 'Renovación' }).getAttribute('href')).toBe('/admin/reportes/renovacion');
  expect(screen.getByRole('link', { name: 'Desempeño' }).getAttribute('href')).toBe('/admin/reportes/desempeno');
  guardarVista('reporte');
  fireEvent.click(screen.getByRole('button', { name: 'Ver detalle de membresías' }));
  await screen.findByText('Miembro QA 1'); guardarVista('modal');
});
it('sesión inicial ausente redirige al login sin mostrar finanzas', async () => {
  vi.mocked(obtenerReporteIngresos).mockResolvedValue({ ok: false, estado: 401, error: 'Sesión expirada' });
  await expect(Page()).rejects.toThrow('REDIRECT_LOGIN');
  expect(redirect).toHaveBeenCalledWith('/login');
});
it('403 inicial muestra Acceso denegado sin tarjetas', async () => {
  vi.mocked(obtenerReporteIngresos).mockResolvedValue({ ok: false, estado: 403, error: 'Acceso denegado' });
  render(await Page());
  expect(screen.getByRole('heading', { name: 'Acceso denegado' })).toBeTruthy();
  expect(screen.queryByRole('region', { name: 'Ingresos totales' })).toBeNull();
});
it('error 500 inicial presenta reintento, sin exportar información anterior', async () => {
  vi.mocked(obtenerReporteIngresos).mockResolvedValue({ ok: false, estado: 500, error: 'Fallo del servidor' });
  render(await Page());
  expect(screen.getByRole('button', { name: 'Reintentar' })).toBeTruthy();
  expect((screen.getByRole('button', { name: 'Exportar PDF' }) as HTMLButtonElement).disabled).toBe(true);
});
it('la ruta conserva la protección ADMINISTRADOR sin ampliar permisos', async () => {
  const child = <ReporteIngresos inicial={{ ok: true, datos: INGRESOS }} rangoInicial={RANGO_INGRESOS} />;
  const layout = LayoutAdmin({ children: child });
  expect(layout.type).toBe(RutaProtegida); expect(layout.props.roles).toEqual(['ADMINISTRADOR']);
  vi.mocked(obtenerUsuario).mockResolvedValue({ id: 'otro', correo: '', nombre: '', apellido: '', rol: 'ENTRENADOR' });
  render(await RutaProtegida({ roles: ['ADMINISTRADOR'], children: child }));
  expect(screen.getByRole('heading', { name: 'Acceso denegado' })).toBeTruthy();
});
it('vista de un año con ceros reutiliza Shell y produce alternativa textual completa', async () => {
  const anual = { ...INGRESOS_CERO, porDia: Array.from({ length: 365 }, (_, i) => ({ fecha: sumarDias('2026-01-01', i), total: 0 })) };
  render(await Shell({ children: LayoutReportes({ children: <ReporteIngresos inicial={{ ok: true, datos: anual }} rangoInicial={{ desde: '2026-01-01', hasta: '2026-12-31' }} /> }) }));
  expect(screen.getByRole('img').getAttribute('aria-label')).toContain('365 días');
  guardarVista('cero-anual');
});
