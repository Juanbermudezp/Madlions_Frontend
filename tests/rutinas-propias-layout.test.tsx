import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { Shell } from '@/components/shell';
import { RutaProtegida } from '@/components/ruta-protegida';
import Layout from '@/app/miembro/layout';
import ListadoPage from '@/app/miembro/rutinas/page';
import DetallePage from '@/app/miembro/rutinas/[id]/page';
import { consultarMiRutina, listarMisRutinas } from '@/app/actions/rutinas-propias';
import { MENU_POR_ROL } from '@/lib/roles';
import { obtenerUsuario } from '@/lib/dal';
import { detallePropio, rutinaPropia } from './rutinas-propias-fixtures';

vi.mock('@/app/actions/auth', () => ({ logout: vi.fn() }));
vi.mock('@/lib/dal', () => ({ obtenerUsuario: vi.fn(async () => ({ id: 'miembro', nombre: 'Ana', apellido: 'Paz', correo: '', rol: 'MIEMBRO' })) }));
vi.mock('next/navigation', () => ({ usePathname: () => '/miembro/rutinas', redirect: vi.fn() }));
vi.mock('@/app/actions/rutinas-propias', () => ({ listarMisRutinas: vi.fn(), consultarMiRutina: vi.fn() }));
afterEach(() => { cleanup(); vi.clearAllMocks(); });

function guardarVista(nombre: string) {
  if (process.env.H15_PREVIEW !== '1') return;
  const carpeta = join(process.cwd(), '.next', 'h15-preview');
  mkdirSync(carpeta, { recursive: true });
  const chunks = join(process.cwd(), '.next', 'static', 'chunks');
  const css = readdirSync(chunks, { recursive: true }).filter((p) => typeof p === 'string' && p.endsWith('.css'))
    .map((p) => readFileSync(join(chunks, String(p)), 'utf8')).join('\n');
  // Solo fixture de pruebas; HTML estático para comprobar tamaños con CSS real.
  writeFileSync(join(carpeta, `${nombre}.html`), `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style></head><body>${document.body.innerHTML}</body></html>`);
}

it('monta el listado en Shell y reutiliza una única entrada Mis rutinas', async () => {
  vi.mocked(listarMisRutinas).mockResolvedValue({ ok: true, datos: [rutinaPropia] });
  render(await Shell({ children: ListadoPage() }));
  await screen.findByRole('heading', { name: rutinaPropia.nombre });
  expect(screen.getByRole('link', { name: 'Mis rutinas' }).getAttribute('aria-current')).toBe('page');
  expect(MENU_POR_ROL.MIEMBRO.filter((entrada) => entrada.href === '/miembro/rutinas')).toHaveLength(1);
  guardarVista('listado');
});
it('resuelve params asíncronos y monta detalle de solo lectura con textos largos', async () => {
  const detalle = { ...detallePropio, nombre: 'Rutina de fuerza, estabilidad y movilidad de todo el cuerpo', objetivo: 'Objetivo '.repeat(25).trim(),
    dias: detallePropio.dias.map((dia) => ({ ...dia, nombre: 'Entrenamiento de pecho, tríceps y hombros', ejercicios: dia.ejercicios.map((e) => ({
      ...e, nombre: 'Press de banca con mancuernas, agarre neutro y pausa controlada',
    })) })) };
  vi.mocked(consultarMiRutina).mockResolvedValue({ ok: true, datos: detalle });
  render(await Shell({ children: await DetallePage({ params: Promise.resolve({ id: rutinaPropia.id }) }) }));
  await screen.findByRole('heading', { name: detalle.nombre });
  expect(consultarMiRutina).toHaveBeenCalledWith(rutinaPropia.id);
  expect(screen.getAllByRole('article')).toHaveLength(3);
  expect(screen.queryByRole('button', { name: /editar|guardar|eliminar/i })).toBeNull();
  guardarVista('detalle');
});
it('hereda protección MIEMBRO y el layout no expone la vista a ENTRENADOR', async () => {
  const children = ListadoPage();
  const layout = Layout({ children });
  expect(layout.type).toBe(RutaProtegida);
  expect(layout.props.roles).toEqual(['MIEMBRO']);
  vi.mocked(obtenerUsuario).mockResolvedValueOnce({ id: 'entrenador', nombre: '', apellido: '', correo: '', rol: 'ENTRENADOR' });
  render(await RutaProtegida({ roles: ['MIEMBRO'], children }));
  expect(screen.getByRole('heading', { name: 'Acceso denegado' })).toBeTruthy();
  expect(listarMisRutinas).not.toHaveBeenCalled();
});
