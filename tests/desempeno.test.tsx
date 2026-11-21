import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { obtenerMiDesempeno, obtenerReporteDesempeno } from '@/app/actions/desempeno';
import { MiDesempeno } from '@/components/reportes/mi-desempeno';
import { ReporteDesempeno } from '@/components/reportes/reporte-desempeno';
import { exportarReportePDF } from '@/lib/exportar-pdf';
import {
  calificacionEscalada,
  esReporteDesempeno,
  ordenarDesempeno,
  tablaDesempenoPdf,
  textoCalificacion,
  type FilaDesempeno,
} from '@/lib/reportes-desempeno';

vi.mock('@/app/actions/desempeno', () => ({ obtenerReporteDesempeno: vi.fn(), obtenerMiDesempeno: vi.fn() }));
vi.mock('@/lib/exportar-pdf', async (original) => ({
  ...(await original<typeof import('@/lib/exportar-pdf')>()),
  exportarReportePDF: vi.fn(),
}));

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

const fila = (
  nombre: string,
  clases: number,
  ocupacion: number | null,
  sesiones: number,
  calificacion: number | null,
  resenas: number,
): FilaDesempeno => ({
  entrenador: { id: `e-${nombre}`, nombre },
  clasesImpartidas: clases,
  ocupacionPromedio: ocupacion,
  sesionesRealizadas: sesiones,
  calificacion,
  resenas,
});
const ANA = fila('Ana Hernández', 8, 92.5, 3, 4.8, 6);
const CARLOS = fila('Carlos Martínez', 12, 40, 5, 3.9, 4);
const LUIS = fila('Luis Pérez', 0, null, 2, null, 2);
const FILAS = [ANA, CARLOS, LUIS];
const RANGO = { desde: '2026-10-22', hasta: '2026-11-20' };
const ok = (filas: FilaDesempeno[]) => ({ ok: true as const, datos: { ...RANGO, filas } });
const nombres = () =>
  within(screen.getByRole('table'))
    .getAllByRole('row')
    .slice(1)
    .map((r) => within(r).getAllByRole('cell')[0].textContent);

describe('lib/reportes-desempeno', () => {
  it('"Sin datos suficientes" con menos de 3 reseñas (calificación null)', () => {
    expect(textoCalificacion(null)).toBe('Sin datos suficientes');
    expect(textoCalificacion(4)).toBe('4.0');
  });

  it('ordena por calificación, ocupación o clases en ambos sentidos; los nulos siempre al final', () => {
    const orden = (columna: 'calificacion' | 'ocupacionPromedio' | 'clasesImpartidas', direccion: 'asc' | 'desc') =>
      ordenarDesempeno(FILAS, { columna, direccion }).map((f) => f.entrenador.nombre);

    expect(orden('calificacion', 'desc')).toEqual(['Ana Hernández', 'Carlos Martínez', 'Luis Pérez']);
    expect(orden('calificacion', 'asc')).toEqual(['Carlos Martínez', 'Ana Hernández', 'Luis Pérez']);
    expect(orden('ocupacionPromedio', 'asc')).toEqual(['Carlos Martínez', 'Ana Hernández', 'Luis Pérez']);
    expect(orden('clasesImpartidas', 'desc')).toEqual(['Carlos Martínez', 'Ana Hernández', 'Luis Pérez']);
    expect(orden('clasesImpartidas', 'asc')).toEqual(['Luis Pérez', 'Ana Hernández', 'Carlos Martínez']);
  });

  it('la gráfica lleva la calificación a la escala de 0 a 100 (× 20)', () => {
    expect(calificacionEscalada(4.3)).toBe(86);
    expect(calificacionEscalada(null)).toBeNull();
  });

  it('el PDF lleva las columnas y los textos de la tabla', () => {
    expect(tablaDesempenoPdf([LUIS])).toEqual({
      columnas: ['Entrenador', 'Clases impartidas', 'Ocupación promedio', 'Sesiones realizadas', 'Calificación', 'Reseñas'],
      filas: [['Luis Pérez', '0', '—', '2', 'Sin datos suficientes', '2']],
    });
  });

  it('valida la forma de la respuesta', () => {
    expect(esReporteDesempeno(ok(FILAS).datos)).toBe(true);
    expect(esReporteDesempeno({ ...RANGO, filas: [{ ...ANA, calificacion: '4.8' }] })).toBe(false);
    expect(esReporteDesempeno(null)).toBe(false);
  });
});

describe('FE-29.1 · pantalla del administrador', () => {
  it('muestra por entrenador clases, ocupación, sesiones, calificación y reseñas', () => {
    render(<ReporteDesempeno inicial={ok(FILAS)} rangoInicial={RANGO} />);

    const luis = within(screen.getByRole('table')).getByText('Luis Pérez').closest('tr')!;
    expect(within(luis).getAllByRole('cell').map((c) => c.textContent)).toEqual([
      'Luis Pérez',
      '0',
      '—',
      '2',
      'Sin datos suficientes',
      '2',
    ]);
    expect(nombres()).toEqual(['Ana Hernández', 'Carlos Martínez', 'Luis Pérez']);
    expect(screen.getByText('Ocupación y calificación por entrenador')).toBeTruthy();
  });

  it('reordena la tabla al tocar un encabezado', () => {
    render(<ReporteDesempeno inicial={ok(FILAS)} rangoInicial={RANGO} />);

    fireEvent.click(screen.getByRole('button', { name: /Clases impartidas/ }));
    expect(nombres()).toEqual(['Carlos Martínez', 'Ana Hernández', 'Luis Pérez']);
    fireEvent.click(screen.getByRole('button', { name: /Clases impartidas/ }));
    expect(nombres()).toEqual(['Luis Pérez', 'Ana Hernández', 'Carlos Martínez']);
  });

  it('aplica un rango nuevo con la acción del reporte', async () => {
    vi.mocked(obtenerReporteDesempeno).mockResolvedValue(ok([CARLOS]));
    render(<ReporteDesempeno inicial={ok(FILAS)} rangoInicial={RANGO} />);

    fireEvent.change(screen.getByLabelText(/Desde/), { target: { value: '2026-11-01' } });
    fireEvent.click(screen.getByRole('button', { name: 'Aplicar' }));

    await waitFor(() => expect(nombres()).toEqual(['Carlos Martínez']));
    expect(obtenerReporteDesempeno).toHaveBeenCalledWith({ desde: '2026-11-01', hasta: RANGO.hasta });
  });

  it('exporta el PDF con el orden de la tabla', async () => {
    render(<ReporteDesempeno inicial={ok(FILAS)} rangoInicial={RANGO} />);

    fireEvent.click(screen.getByRole('button', { name: /Exportar PDF/ }));

    await waitFor(() => expect(exportarReportePDF).toHaveBeenCalled());
    expect(vi.mocked(exportarReportePDF).mock.calls[0][0]).toMatchObject({
      titulo: 'Reporte de desempeño de entrenadores',
      nombre: 'desempeno',
      rango: RANGO,
      filas: [
        ['Ana Hernández', '8', '92.5 %', '3', '4.8', '6'],
        ['Carlos Martínez', '12', '40.0 %', '5', '3.9', '4'],
        ['Luis Pérez', '0', '—', '2', 'Sin datos suficientes', '2'],
      ],
    });
  });

  it('muestra el error con Reintentar', () => {
    render(<ReporteDesempeno inicial={{ ok: false, error: 'Acceso denegado', estado: 403 }} rangoInicial={RANGO} />);

    expect(screen.getByText(/Acceso denegado/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeTruthy();
  });
});

describe('FE-29.2 · Mi desempeño del entrenador', () => {
  beforeEach(() => vi.mocked(obtenerMiDesempeno).mockResolvedValue(ok([ANA])));

  it('muestra las cuatro tarjetas con sus métricas', () => {
    render(<MiDesempeno inicial={ok([ANA])} rangoInicial={RANGO} />);

    for (const [titulo, valor] of [
      ['Clases impartidas', '8'],
      ['Ocupación promedio', '92.5 %'],
      ['Sesiones realizadas', '3'],
      ['Calificación', '4.8'],
    ]) {
      const tarjeta = screen.getByText(titulo).parentElement!;
      expect(within(tarjeta).getByText(valor)).toBeTruthy();
    }
  });

  it('con menos de 3 reseñas muestra "Sin datos suficientes"', () => {
    render(<MiDesempeno inicial={ok([LUIS])} rangoInicial={RANGO} />);

    expect(screen.getByText('Sin datos suficientes')).toBeTruthy();
    expect(screen.getByText('2 de 3 reseñas necesarias')).toBeTruthy();
  });

  it('al cambiar el rango solo envía las fechas (nunca entrenadorId)', async () => {
    render(<MiDesempeno inicial={ok([ANA])} rangoInicial={RANGO} />);

    fireEvent.change(screen.getByLabelText(/Desde/), { target: { value: '2026-11-01' } });
    fireEvent.click(screen.getByRole('button', { name: 'Aplicar' }));

    await waitFor(() => expect(obtenerMiDesempeno).toHaveBeenCalled());
    expect(obtenerMiDesempeno).toHaveBeenLastCalledWith({ desde: '2026-11-01', hasta: RANGO.hasta });
    expect(JSON.stringify(vi.mocked(obtenerMiDesempeno).mock.calls)).not.toContain('entrenadorId');
  });
});
