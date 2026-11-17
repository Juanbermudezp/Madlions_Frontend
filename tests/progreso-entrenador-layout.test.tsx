import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { Shell } from '@/components/shell';
import Page from '@/app/entrenador/miembros/[id]/progreso/page';
import { consultarProgresoMiembro } from '@/app/actions/progreso-entrenador';
import { miembroProgresoId, seriesEntrenador } from './progreso-entrenador-fixtures';

vi.mock('@/app/actions/auth', () => ({ logout: vi.fn() }));
vi.mock('@/lib/dal', () => ({ obtenerUsuario: vi.fn(async () => ({ nombre: 'Entrenador', apellido: 'Prueba', rol: 'ENTRENADOR' })) }));
vi.mock('next/navigation', () => ({ usePathname: () => `/entrenador/miembros/${miembroProgresoId}/progreso` }));
vi.mock('@/app/actions/progreso-entrenador', () => ({ consultarProgresoMiembro: vi.fn() }));
vi.mock('@/app/actions/evolucion', () => ({ consultarEvolucion: vi.fn(), editarProgreso: vi.fn() }));
afterEach(cleanup);

it('integra la pantalla de solo lectura con el Shell real', async () => {
  vi.mocked(consultarProgresoMiembro).mockResolvedValue({ ok: true, data: seriesEntrenador });
  render(await Shell({ children: await Page({ params: Promise.resolve({ id: miembroProgresoId }) }) }));
  await screen.findByRole('table');
  expect(screen.getByRole('heading', { name: 'Progreso del miembro' })).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Editar' })).toBeNull();
  if (process.env.H14_PROGRESO_PREVIEW === '1') {
    const carpeta = join(process.cwd(), '.next', 'h14-progreso-preview');
    mkdirSync(carpeta, { recursive: true });
    const chunks = join(process.cwd(), '.next', 'static', 'chunks');
    const css = readdirSync(chunks, { recursive: true }).filter((p) => typeof p === 'string' && p.endsWith('.css'))
      .map((p) => readFileSync(join(chunks, String(p)), 'utf8')).join('\n');
    writeFileSync(join(carpeta, 'index.html'), `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style></head><body>${document.body.innerHTML}</body></html>`);
  }
});
