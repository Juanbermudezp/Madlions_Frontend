import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { Shell } from '@/components/shell';
import { Rutinas } from '@/components/rutinas/rutinas';
import { rutina } from './rutinas-fixtures';

vi.mock('@/app/actions/auth', () => ({ logout: vi.fn() }));
vi.mock('@/lib/dal', () => ({ obtenerUsuario: vi.fn(async () => ({ nombre: 'Entrenador', apellido: 'Prueba', rol: 'ENTRENADOR' })) }));
vi.mock('next/navigation', () => ({ usePathname: () => '/entrenador/rutinas' }));
vi.mock('@/app/actions/rutinas', () => ({ listarRutinas: vi.fn(), crearRutina: vi.fn(), actualizarRutina: vi.fn(), buscarMiembrosRutina: vi.fn() }));
afterEach(cleanup);

it('integra el Shell real y precarga arreglos desordenados según orden', async () => {
  const desordenada = { ...rutina, dias: [
    { ...rutina.dias[0], id: 'd2', orden: 2, nombre: 'Segundo día' },
    { ...rutina.dias[0], id: 'd1', orden: 1, nombre: 'Primer día', ejercicios: [
      { ...rutina.dias[0].ejercicios[0], id: 'e2', orden: 2, nombre: 'Segundo ejercicio' },
      { ...rutina.dias[0].ejercicios[0], id: 'e1', orden: 1, nombre: 'Primer ejercicio' },
    ] },
  ] };
  render(await Shell({ children: <Rutinas inicial={{ ok: true, datos: [desordenada] }} /> }));
  fireEvent.click(screen.getByRole('button', { name: 'Editar' }));
  expect((screen.getByLabelText('Nombre del día 1') as HTMLInputElement).value).toBe('Primer día');
  expect((screen.getAllByLabelText('Nombre del ejercicio')[0] as HTMLInputElement).value).toBe('Primer ejercicio');
  expect(screen.getByRole('link', { name: 'Rutinas' }).getAttribute('aria-current')).toBe('page');

  // Artefacto opcional de QA, solo con datos de prueba y fuera del código de producción.
  if (process.env.H14_PREVIEW === '1') {
    const carpeta = join(process.cwd(), '.next', 'h14-preview');
    mkdirSync(carpeta, { recursive: true });
    const chunks = join(process.cwd(), '.next', 'static', 'chunks');
    const css = readdirSync(chunks, { recursive: true }).filter((p) => typeof p === 'string' && p.endsWith('.css'))
      .map((p) => readFileSync(join(chunks, String(p)), 'utf8')).join('\n');
    for (const elemento of document.querySelectorAll('input')) elemento.setAttribute('value', elemento.value);
    for (const elemento of document.querySelectorAll('textarea')) elemento.textContent = elemento.value;
    writeFileSync(join(carpeta, 'index.html'), `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style></head><body>${document.body.innerHTML}</body></html>`);
  }
});
