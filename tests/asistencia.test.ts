import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { revalidatePath } from 'next/cache';
import { obtenerUsuario } from '@/lib/dal';
import { obtenerToken } from '@/lib/session';
import { guardarAsistencia } from '@/app/actions/asistencia';
import {
  cambiosDe,
  etiquetaHorario,
  hora,
  marcarTodosSinRegistrar,
  restanteDeLaVentana,
  seleccionInicial,
  type ActividadPendiente,
  type MarcaAsistencia,
} from '@/lib/asistencia';

const R1 = '11111111-1111-4111-8111-111111111111';
const R2 = '22222222-2222-4222-8222-222222222222';
const R3 = '33333333-3333-4333-8333-333333333333';

function actividad(): ActividadPendiente {
  return {
    tipo: 'CLASE',
    id: 'c1',
    nombre: 'Spinning',
    inicio: '2026-11-18T14:00:00.000Z',
    fin: '2026-11-18T15:00:00.000Z',
    miembros: [
      { registroId: R1, nombre: 'María López', codigo: 'MBR-000002', asistencia: 'SIN_REGISTRAR' },
      { registroId: R2, nombre: 'Juan Pérez', codigo: 'MBR-000004', asistencia: 'ASISTIO' },
      { registroId: R3, nombre: 'Ana Gómez', codigo: 'MBR-000005', asistencia: 'SIN_REGISTRAR' },
    ],
  };
}

describe('seleccionInicial', () => {
  it('arranca con lo que el servidor ya tiene guardado', () => {
    expect(seleccionInicial([actividad()])).toEqual({
      [R1]: 'SIN_REGISTRAR',
      [R2]: 'ASISTIO',
      [R3]: 'SIN_REGISTRAR',
    });
  });
});

describe('cambiosDe', () => {
  it('sin tocar nada no hay cambios que guardar', () => {
    const act = actividad();

    expect(cambiosDe(act, seleccionInicial([act]))).toEqual([]);
  });

  it('solo manda los registros que cambiaron', () => {
    const act = actividad();
    const seleccion = { ...seleccionInicial([act]), [R1]: 'ASISTIO' as const };

    expect(cambiosDe(act, seleccion)).toEqual([
      { tipo: 'CLASE', registroId: R1, asistencia: 'ASISTIO' },
    ]);
  });

  it('no manda a quien se dejó igual que en el servidor', () => {
    const act = actividad();
    const seleccion = { ...seleccionInicial([act]), [R2]: 'ASISTIO' as const };

    expect(cambiosDe(act, seleccion)).toEqual([]);
  });

  it('una corrección sí se manda', () => {
    const act = actividad();
    const seleccion = { ...seleccionInicial([act]), [R2]: 'NO_ASISTIO' as const };

    expect(cambiosDe(act, seleccion)).toEqual([
      { tipo: 'CLASE', registroId: R2, asistencia: 'NO_ASISTIO' },
    ]);
  });

  it('nunca manda "sin registrar": el backend no lo acepta', () => {
    const act = actividad();
    const seleccion = { ...seleccionInicial([act]), [R2]: 'SIN_REGISTRAR' as const };

    expect(cambiosDe(act, seleccion)).toEqual([]);
  });
});

describe('marcarTodosSinRegistrar', () => {
  it('pone "Asistió" solo a quienes no tenían marca (criterio 4)', () => {
    const act = actividad();

    expect(marcarTodosSinRegistrar(act, seleccionInicial([act]))).toEqual({
      [R1]: 'ASISTIO',
      [R2]: 'ASISTIO',
      [R3]: 'ASISTIO',
    });
  });

  it('no pisa una marca de "No asistió" ya elegida', () => {
    const act = actividad();
    const seleccion = { ...seleccionInicial([act]), [R1]: 'NO_ASISTIO' as const };

    expect(marcarTodosSinRegistrar(act, seleccion)[R1]).toBe('NO_ASISTIO');
  });

  it('deja listos para guardar solo los que cambió', () => {
    const act = actividad();
    const seleccion = marcarTodosSinRegistrar(act, seleccionInicial([act]));

    expect(cambiosDe(act, seleccion).map((m) => m.registroId)).toEqual([R1, R3]);
  });
});

describe('fechas en hora de El Salvador', () => {
  it('la hora se muestra en hora local (UTC-6)', () => {
    expect(hora('2026-11-18T14:00:00.000Z')).toBe('08:00');
  });

  it('el horario junta el día con las dos horas', () => {
    const etiqueta = etiquetaHorario('2026-11-18T14:00:00.000Z', '2026-11-18T15:00:00.000Z');

    expect(etiqueta).toContain('08:00');
    expect(etiqueta).toContain('09:00');
    expect(etiqueta).toContain('18');
  });
});

describe('restanteDeLaVentana', () => {
  const FIN = '2026-11-18T15:00:00.000Z';

  it('avisa las horas que quedan', () => {
    expect(restanteDeLaVentana(FIN, new Date('2026-11-18T16:00:00.000Z'))).toBe(
      'Quedan 23 horas para registrar',
    );
  });

  it('en la última hora cuenta los minutos', () => {
    expect(restanteDeLaVentana(FIN, new Date('2026-11-19T14:30:00.000Z'))).toBe(
      'Quedan 30 min para registrar',
    );
  });

  it('pasadas las 24 horas avisa que ya cerró', () => {
    expect(restanteDeLaVentana(FIN, new Date('2026-11-19T15:00:01.000Z'))).toBe(
      'La ventana de registro ya cerró',
    );
  });
});

describe('guardarAsistencia', () => {
  const fetchMock = vi.fn();
  const MARCAS: MarcaAsistencia[] = [{ tipo: 'CLASE', registroId: R1, asistencia: 'ASISTIO' }];

  beforeEach(() => {
    vi.stubEnv('API_URL', 'http://api.test/api/v1');
    vi.stubGlobal('fetch', fetchMock);
    vi.mocked(obtenerUsuario).mockResolvedValue({
      id: 'e1',
      correo: 'entrenador@madlions.com',
      nombre: 'Carlos',
      apellido: 'Martínez',
      rol: 'ENTRENADOR',
    });
    vi.mocked(obtenerToken).mockResolvedValue('token-prueba');
    fetchMock.mockImplementation(async () => new Response(JSON.stringify([])));
  });

  afterEach(() => {
    vi.resetAllMocks();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('manda las marcas con PUT a la ruta de asistencia', async () => {
    const resultado = await guardarAsistencia(MARCAS);

    expect(resultado).toEqual({ ok: true, mensaje: 'Asistencia guardada' });
    const [url, opciones] = fetchMock.mock.calls[0];
    expect(new URL(url).pathname).toBe('/api/v1/asistencia');
    expect(opciones.method).toBe('PUT');
    expect(JSON.parse(opciones.body)).toEqual({ marcas: MARCAS });
    expect(revalidatePath).toHaveBeenCalledWith('/entrenador/asistencia');
  });

  it('sin cambios no llama a la API', async () => {
    const resultado = await guardarAsistencia([]);

    expect(resultado.ok).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rechaza una marca con un registro que no es UUID', async () => {
    const resultado = await guardarAsistencia([
      { tipo: 'CLASE', registroId: 'r1', asistencia: 'ASISTIO' },
    ]);

    expect(resultado.ok).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('los demás roles reciben acceso denegado', async () => {
    for (const rol of ['ADMINISTRADOR', 'RECEPCION', 'MIEMBRO'] as const) {
      vi.mocked(obtenerUsuario).mockResolvedValue({
        id: 'u1',
        correo: 'otro@madlions.com',
        nombre: 'Otro',
        apellido: 'Usuario',
        rol,
      });

      expect(await guardarAsistencia(MARCAS)).toEqual({ ok: false, error: 'Acceso denegado' });
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/dal', () => ({ obtenerUsuario: vi.fn() }));
vi.mock('@/lib/session', () => ({ obtenerToken: vi.fn() }));
