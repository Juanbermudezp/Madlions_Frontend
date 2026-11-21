/**
 * QA-26.1 · Lo que el administrador ve en pantalla en el reporte de ocupación
 * (H26) y el PDF que descarga, con los mismos datos de resultado conocido de
 * la hoja del documento docs/qa/H26-pruebas-reporte-ocupacion.md del backend.
 *
 * El PDF se genera de verdad con jsPDF y jspdf-autotable (dependencias del
 * package.json); solo se intercepta la descarga para leer el archivo y revisar
 * su contenido.
 *
 * Ejecutar: npm test -- tests/qa-reportes.test.tsx
 */
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { obtenerReporteOcupacion } from '@/app/actions/reportes';
import AdminLayout from '@/app/admin/layout';
import PaginaOcupacion from '@/app/admin/reportes/page';
import { RutaProtegida } from '@/components/ruta-protegida';
import { ReporteOcupacion } from '@/components/reportes/reporte-ocupacion';
import { obtenerUsuario } from '@/lib/dal';
import { rangoPorDefecto, sumarMeses, type FilaOcupacion, type ReporteOcupacion as Reporte } from '@/lib/reportes';
import type { Rol, Usuario } from '@/lib/roles';

vi.mock('@/app/actions/reportes', () => ({ obtenerReporteOcupacion: vi.fn() }));
vi.mock('@/lib/dal', () => ({ obtenerUsuario: vi.fn() }));
vi.mock('next/navigation', () => ({
  usePathname: () => '/admin/reportes',
  redirect: vi.fn((ruta: string) => {
    throw new Error(`redirect:${ruta}`);
  }),
}));

// Descargas interceptadas: nombre del archivo y contenido del PDF real.
const descargas: { nombre: string; pdf: string }[] = [];
vi.mock('jspdf', async (original) => {
  const real = await original<typeof import('jspdf')>();
  function JsPdfEspia(...args: ConstructorParameters<typeof real.jsPDF>) {
    const doc = new real.jsPDF(...args);
    doc.save = ((nombre: string) => {
      descargas.push({ nombre, pdf: doc.output() });
      return doc;
    }) as typeof doc.save;
    return doc;
  }
  return { ...real, jsPDF: JsPdfEspia, default: JsPdfEspia };
});

/** Textos escritos en el PDF, en orden. */
const textosPdf = (pdf: string) => [...pdf.matchAll(/\(((?:[^()\\]|\\.)*)\) Tj/g)].map((m) => m[1]);

beforeEach(() => {
  descargas.length = 0;
});
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

// Hoja de resultados esperados (últimos 30 días), calculada a mano.
const CARLOS = { id: 'e1', nombre: 'Carlos Martínez' };
const ANA = { id: 'e2', nombre: 'Ana Hernández' };
const fila = (
  tipo: string,
  entrenador: typeof CARLOS,
  veces: number,
  reservas: number,
  cupo: number,
  ocupacion: number,
  etiqueta: FilaOcupacion['etiqueta'],
): FilaOcupacion => ({
  tipoClase: { id: `t-${tipo}`, nombre: tipo },
  entrenador,
  vecesImpartida: veces,
  reservasConfirmadas: reservas,
  cupoTotal: cupo,
  ocupacion,
  etiqueta,
});
const HOJA = [
  fila('Spinning', CARLOS, 1, 19, 20, 95, 'ALTA'),
  fila('Crossfit', CARLOS, 1, 9, 10, 90, 'ALTA'),
  fila('Yoga', CARLOS, 2, 10, 20, 50, null),
  fila('Spinning', ANA, 1, 3, 10, 30, null),
  fila('Crossfit', ANA, 1, 2, 10, 20, 'BAJA'),
  fila('Box', CARLOS, 1, 1, 10, 10, 'BAJA'),
];
const RANGO = { desde: '2026-10-22', hasta: '2026-11-20' };
const ok = (filas: FilaOcupacion[], rango = RANGO) => ({ ok: true as const, datos: { ...rango, filas } as Reporte });

const filasTabla = () => within(screen.getByRole('table')).getAllByRole('row').slice(1);
const celdas = (tr: HTMLElement) => within(tr).getAllByRole('cell').map((c) => c.textContent);
const aplicar = (desde: string, hasta: string) => {
  fireEvent.change(screen.getByLabelText('Desde'), { target: { value: desde } });
  fireEvent.change(screen.getByLabelText('Hasta'), { target: { value: hasta } });
  fireEvent.click(screen.getByRole('button', { name: 'Aplicar' }));
};

describe('Criterios 1 y 4 · Tabla y gráfica de mayor a menor con las etiquetas', () => {
  it('QA-F1 · la tabla muestra los valores de la hoja, de mayor a menor, con las etiquetas en los bordes', () => {
    render(<ReporteOcupacion inicial={ok(HOJA)} rangoInicial={RANGO} />);

    expect(filasTabla().map(celdas)).toEqual([
      ['Spinning', 'Carlos Martínez', '1', '19', '20', '95.0 %', 'Alta demanda'],
      ['Crossfit', 'Carlos Martínez', '1', '9', '10', '90.0 %', 'Alta demanda'],
      ['Yoga', 'Carlos Martínez', '2', '10', '20', '50.0 %', '—'],
      ['Spinning', 'Ana Hernández', '1', '3', '10', '30.0 %', '—'],
      ['Crossfit', 'Ana Hernández', '1', '2', '10', '20.0 %', 'Baja ocupación'],
      ['Box', 'Carlos Martínez', '1', '1', '10', '10.0 %', 'Baja ocupación'],
    ]);
  });

  it('QA-F2 · la gráfica de barras tiene una barra por fila en el mismo orden', () => {
    render(<ReporteOcupacion inicial={ok(HOJA)} rangoInicial={RANGO} />);

    expect(screen.getAllByRole('img').map((b) => b.getAttribute('aria-label'))).toEqual([
      'Spinning con Carlos Martínez: 95.0 %, 19 de 20 lugares en 1 clases',
      'Crossfit con Carlos Martínez: 90.0 %, 9 de 10 lugares en 1 clases',
      'Yoga con Carlos Martínez: 50.0 %, 10 de 20 lugares en 2 clases',
      'Spinning con Ana Hernández: 30.0 %, 3 de 10 lugares en 1 clases',
      'Crossfit con Ana Hernández: 20.0 %, 2 de 10 lugares en 1 clases',
      'Box con Carlos Martínez: 10.0 %, 1 de 10 lugares en 1 clases',
    ]);
  });
});

describe('Criterio 3 · Rango por defecto, recálculo y rechazo', () => {
  it('QA-F3 · al abrir la pantalla se piden los últimos 30 días', async () => {
    vi.mocked(obtenerReporteOcupacion).mockResolvedValue(ok(HOJA, rangoPorDefecto()));

    render(await PaginaOcupacion());

    expect(obtenerReporteOcupacion).toHaveBeenCalledWith(rangoPorDefecto());
    expect((screen.getByLabelText('Desde') as HTMLInputElement).value).toBe(rangoPorDefecto().desde);
    expect((screen.getByLabelText('Hasta') as HTMLInputElement).value).toBe(rangoPorDefecto().hasta);
  });

  it('QA-F4 · otro rango se aplica y la tabla se recalcula', async () => {
    vi.mocked(obtenerReporteOcupacion).mockResolvedValue(
      ok([fila('Yoga', CARLOS, 1, 4, 10, 40, null)], { desde: '2026-11-15', hasta: '2026-11-20' }),
    );
    render(<ReporteOcupacion inicial={ok(HOJA)} rangoInicial={RANGO} />);

    aplicar('2026-11-15', '2026-11-20');

    await waitFor(() => expect(filasTabla()).toHaveLength(1));
    expect(obtenerReporteOcupacion).toHaveBeenCalledWith({ desde: '2026-11-15', hasta: '2026-11-20' });
    expect(celdas(filasTabla()[0])).toEqual(['Yoga', 'Carlos Martínez', '1', '4', '10', '40.0 %', '—']);
  });

  it('QA-F5 · un rango de exactamente 12 meses se acepta', async () => {
    vi.mocked(obtenerReporteOcupacion).mockResolvedValue(ok(HOJA));
    render(<ReporteOcupacion inicial={ok(HOJA)} rangoInicial={RANGO} />);

    aplicar('2025-11-21', '2026-11-20');

    await waitFor(() => expect(obtenerReporteOcupacion).toHaveBeenCalledWith({ desde: '2025-11-21', hasta: '2026-11-20' }));
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it.each([
    ['QA-F6', '12 meses y un día', sumarMeses('2026-11-20', -12), '2026-11-20', 'El rango máximo es de 12 meses'],
    ['QA-F7', 'inicio posterior al fin', '2026-11-20', '2026-11-19', 'La fecha de inicio no puede ser posterior a la de fin'],
  ])('%s · %s se rechaza sin consultar la API', (_id, _caso, desde, hasta, mensaje) => {
    render(<ReporteOcupacion inicial={ok(HOJA)} rangoInicial={RANGO} />);

    aplicar(desde, hasta);

    expect(screen.getByRole('alert').textContent).toBe(mensaje);
    expect(obtenerReporteOcupacion).not.toHaveBeenCalled();
    expect(filasTabla()).toHaveLength(HOJA.length);
  });
});

describe('Criterio 5 · Período sin clases impartidas', () => {
  it('QA-F8 · muestra "No hay clases impartidas en este período" y no deja exportar', () => {
    render(<ReporteOcupacion inicial={ok([])} rangoInicial={RANGO} />);

    expect(screen.getByText('No hay clases impartidas en este período')).toBeTruthy();
    expect(screen.queryByRole('table')).toBeNull();
    expect((screen.getByRole('button', { name: 'Exportar PDF' }) as HTMLButtonElement).disabled).toBe(true);
  });
});

describe('Criterio 6 · Exportar PDF', () => {
  it('QA-F9 · descarga un PDF con el título, el rango, la fecha de generación y la tabla en el orden visible', async () => {
    render(<ReporteOcupacion inicial={ok(HOJA)} rangoInicial={RANGO} />);
    fireEvent.click(screen.getByRole('button', { name: /^Clase/ })); // ordenar por clase (A-Z)
    fireEvent.click(screen.getByRole('button', { name: 'Exportar PDF' }));

    await waitFor(() => expect(descargas).toHaveLength(1));
    const { nombre, pdf } = descargas[0];
    expect(nombre).toBe('reporte-ocupacion-2026-10-22-2026-11-20.pdf');
    expect(pdf.startsWith('%PDF-')).toBe(true);
    const [ancho, alto] = pdf.match(/\/MediaBox \[0 0 ([\d.]+) ([\d.]+)\]/)!.slice(1).map(Number);
    expect(ancho).toBeGreaterThan(alto); // horizontal: 7 columnas

    const textos = textosPdf(pdf);
    expect(textos.slice(0, 3)).toEqual([
      'Reporte de ocupación de clases grupales',
      'Período: 22/10/2026 al 20/11/2026',
      expect.stringMatching(/^Generado el \d{2}\/\d{2}\/\d{4} \d{2}:\d{2}$/),
    ]);
    expect(textos.slice(3, 10)).toEqual([
      'Clase', 'Entrenador', 'Veces impartida', 'Reservas confirmadas', 'Cupo total', 'Ocupación', 'Etiqueta',
    ]);
    // Cada celda, en el orden visible: Clase de A a Z; los empates conservan el orden de la API.
    expect(textos.slice(10)).toEqual([
      'Box', 'Carlos Martínez', '1', '1', '10', '10.0 %', 'Baja ocupación',
      'Crossfit', 'Carlos Martínez', '1', '9', '10', '90.0 %', 'Alta demanda',
      'Crossfit', 'Ana Hernández', '1', '2', '10', '20.0 %', 'Baja ocupación',
      'Spinning', 'Carlos Martínez', '1', '19', '20', '95.0 %', 'Alta demanda',
      'Spinning', 'Ana Hernández', '1', '3', '10', '30.0 %', '',
      'Yoga', 'Carlos Martínez', '2', '10', '20', '50.0 %', '',
    ]);
  });
});

describe('Criterio 7 · Acceso solo para el administrador', () => {
  const usuario = (rol: Rol): Usuario => ({ id: 'u', correo: 'qa@test.com', nombre: 'Prueba', apellido: 'QA', rol });

  it('QA-F10 · la sección /admin (que incluye /admin/reportes) solo admite ADMINISTRADOR', () => {
    const contenido = <p>Reportes</p>;
    expect(AdminLayout({ children: contenido }).props.roles).toEqual(['ADMINISTRADOR']);
  });

  it.each(['MIEMBRO', 'ENTRENADOR', 'RECEPCION'] as const)('QA-F11 · %s ve "Acceso denegado"', async (rol) => {
    vi.mocked(obtenerUsuario).mockResolvedValue(usuario(rol));

    render(await RutaProtegida({ roles: ['ADMINISTRADOR'], children: <p>Reportes</p> }));

    expect(screen.getByRole('heading', { name: 'Acceso denegado' })).toBeTruthy();
    expect(screen.queryByText('Reportes')).toBeNull();
  });

  it('QA-F12 · el administrador sí ve el reporte', async () => {
    vi.mocked(obtenerUsuario).mockResolvedValue(usuario('ADMINISTRADOR'));

    render(await RutaProtegida({ roles: ['ADMINISTRADOR'], children: <p>Reportes</p> }));

    expect(screen.getByText('Reportes')).toBeTruthy();
  });

  it('QA-F13 · si la API responde 403, la página muestra "Acceso denegado"', async () => {
    vi.mocked(obtenerReporteOcupacion).mockResolvedValue({ ok: false, error: 'Acceso denegado', estado: 403 });

    render(await PaginaOcupacion());

    expect(screen.getByRole('heading', { name: 'Acceso denegado' })).toBeTruthy();
  });
});
