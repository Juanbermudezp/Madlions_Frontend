import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { redirect } from 'next/navigation';
import Page from '@/app/admin/reportes/renovacion/page';
import Layout from '@/app/admin/reportes/layout';
import { obtenerReporteRenovacion } from '@/app/actions/reportes';
import { RENOVACION } from './renovacion-fixtures';
vi.mock('@/app/actions/reportes', () => ({ obtenerReporteRenovacion: vi.fn() }));
vi.mock('next/server', () => ({ connection: vi.fn(async () => undefined) }));
vi.mock('next/navigation', () => ({ usePathname: () => '/admin/reportes/renovacion', useRouter: () => ({ replace: vi.fn() }), redirect: vi.fn(() => { throw new Error('LOGIN'); }) }));
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date('2026-11-06T16:00:00Z'));
  vi.mocked(obtenerReporteRenovacion).mockResolvedValue({ ok: true, datos: RENOVACION });
});
afterEach(() => { cleanup(); vi.resetAllMocks(); vi.useRealTimers(); });
it('Server Component usa30d por defecto y pestaña/layoutH26 existentes', async () => {
  render(Layout({ children: await Page() }));
  expect(obtenerReporteRenovacion).toHaveBeenCalledWith({ desde: '2026-10-08', hasta: '2026-11-06' });
  expect(screen.getByRole('link', { name: 'Renovación' }).getAttribute('aria-current')).toBe('page');
  expect(screen.getByRole('link', { name: 'Ocupación' }).getAttribute('href')).toBe('/admin/reportes');
  expect(screen.getByRole('link', { name: 'Ingresos' }).getAttribute('href')).toBe('/admin/reportes/ingresos');
});
it('401 inicial redirige al login', async () => {
  vi.mocked(obtenerReporteRenovacion).mockResolvedValue({ ok: false, estado: 401, error: 'Sin sesión' });
  await expect(Page()).rejects.toThrow('LOGIN'); expect(redirect).toHaveBeenCalledWith('/login');
});
it('403 inicial muestra acceso denegado sin indicadores', async () => {
  vi.mocked(obtenerReporteRenovacion).mockResolvedValue({ ok: false, estado: 403, error: 'Acceso denegado' });
  render(await Page()); expect(screen.getByRole('heading', { name: 'Acceso denegado' })).toBeTruthy();
  expect(screen.queryByRole('img')).toBeNull();
});
it('error500 inicial permite reintentar y no exporta', async () => {
  vi.mocked(obtenerReporteRenovacion).mockResolvedValue({ ok: false, estado: 500, error: 'Fallo QA' });
  render(await Page()); expect(screen.getByRole('button', { name: 'Reintentar' })).toBeTruthy();
  expect((screen.getByRole('button', { name: 'Exportar PDF' }) as HTMLButtonElement).disabled).toBe(true);
});
