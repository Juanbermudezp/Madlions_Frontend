import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { revalidatePath } from 'next/cache';
import { obtenerUsuario } from '@/lib/dal';
import { obtenerToken } from '@/lib/session';
import { guardarResena } from '@/app/actions/resenas';
import {
  cuerpoResena,
  diasRestantes,
  esCalificacionValida,
  etiquetaActividad,
  etiquetaFechaLimite,
  hayAlgunaCalificacion,
  type DatosResena,
  type PendientePorCalificar,
} from '@/lib/resenas';

const REGISTRO = '11111111-1111-4111-8111-111111111111';

function pendiente(datos: Partial<PendientePorCalificar> = {}): PendientePorCalificar {
  return {
    tipo: 'CLASE',
    registroId: REGISTRO,
    nombre: 'Spinning',
    entrenador: 'Carlos Martínez',
    fin: '2026-11-17T14:00:00.000Z',
    fechaLimite: '2026-11-24T14:00:00.000Z',
    ...datos,
  };
}

describe('hayAlgunaCalificacion', () => {
  it('con cualquiera de los tres aspectos alcanza', () => {
    expect(hayAlgunaCalificacion({ calActividad: 5 })).toBe(true);
    expect(hayAlgunaCalificacion({ calEntrenador: 1 })).toBe(true);
    expect(hayAlgunaCalificacion({ calInstalaciones: 3 })).toBe(true);
  });

  it('sin ninguna, no: el botón Enviar queda deshabilitado', () => {
    expect(hayAlgunaCalificacion({})).toBe(false);
  });
});

describe('esCalificacionValida', () => {
  it('acepta los enteros de 1 a 5', () => {
    for (const valor of [1, 2, 3, 4, 5]) expect(esCalificacionValida(valor)).toBe(true);
  });

  it('rechaza 0, 6 y los decimales', () => {
    for (const valor of [0, 6, 2.5, -1]) expect(esCalificacionValida(valor)).toBe(false);
  });
});

describe('cuerpoResena', () => {
  it('manda solo los aspectos elegidos', () => {
    const cuerpo = cuerpoResena(pendiente(), { calActividad: 5, calInstalaciones: 3 }, '');

    expect(cuerpo).toEqual({
      tipo: 'CLASE',
      registroId: REGISTRO,
      calActividad: 5,
      calInstalaciones: 3,
    });
    expect(cuerpo).not.toHaveProperty('calEntrenador');
    expect(cuerpo).not.toHaveProperty('comentario');
  });

  it('recorta el comentario y lo incluye solo si quedó texto', () => {
    expect(cuerpoResena(pendiente(), { calActividad: 5 }, '   ')).not.toHaveProperty(
      'comentario',
    );
    expect(
      cuerpoResena(pendiente(), { calActividad: 5 }, '  Muy buena.  ').comentario,
    ).toBe('Muy buena.');
  });

  it('respeta el tipo de la actividad', () => {
    expect(cuerpoResena(pendiente({ tipo: 'SESION' }), { calEntrenador: 4 }, '').tipo).toBe(
      'SESION',
    );
  });
});

describe('fechas en hora de El Salvador', () => {
  it('la actividad se muestra con día y hora local (UTC-6)', () => {
    const etiqueta = etiquetaActividad('2026-11-17T14:00:00.000Z');

    expect(etiqueta).toContain('08:00');
    expect(etiqueta).toContain('17');
  });

  it('la fecha límite va sin hora', () => {
    const etiqueta = etiquetaFechaLimite('2026-11-24T14:00:00.000Z');

    expect(etiqueta).toContain('24');
    expect(etiqueta).not.toContain(':');
  });
});

describe('diasRestantes', () => {
  const LIMITE = '2026-11-24T14:00:00.000Z';

  it('cuenta los días que faltan', () => {
    expect(diasRestantes(LIMITE, new Date('2026-11-20T14:00:00.000Z'))).toBe(4);
  });

  it('el último día devuelve 0', () => {
    expect(diasRestantes(LIMITE, new Date('2026-11-24T20:00:00.000Z'))).toBe(0);
  });

  it('pasado el plazo da negativo', () => {
    expect(diasRestantes(LIMITE, new Date('2026-11-26T14:00:00.000Z'))).toBe(-2);
  });
});

describe('guardarResena', () => {
  const fetchMock = vi.fn();
  const DATOS: DatosResena = { tipo: 'CLASE', registroId: REGISTRO, calActividad: 5 };

  beforeEach(() => {
    vi.stubEnv('API_URL', 'http://api.test/api/v1');
    vi.stubGlobal('fetch', fetchMock);
    vi.mocked(obtenerUsuario).mockResolvedValue({
      id: 'm1',
      correo: 'miembro@madlions.com',
      nombre: 'María',
      apellido: 'López',
      rol: 'MIEMBRO',
    });
    vi.mocked(obtenerToken).mockResolvedValue('token-prueba');
    fetchMock.mockImplementation(async () => new Response(JSON.stringify({ id: 'res1' })));
  });

  afterEach(() => {
    vi.resetAllMocks();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('manda la reseña con POST a la ruta de reseñas', async () => {
    const resultado = await guardarResena(DATOS);

    expect(resultado).toEqual({ ok: true, mensaje: 'Gracias por tu reseña' });
    const [url, opciones] = fetchMock.mock.calls[0];
    expect(new URL(url).pathname).toBe('/api/v1/resenas');
    expect(opciones.method).toBe('POST');
    expect(JSON.parse(opciones.body)).toEqual(DATOS);
    expect(revalidatePath).toHaveBeenCalledWith('/miembro/calificar');
  });

  it('sin ninguna calificación no llama a la API', async () => {
    const resultado = await guardarResena({ tipo: 'CLASE', registroId: REGISTRO });

    expect(resultado).toEqual({ ok: false, error: 'Califica al menos un aspecto.' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rechaza una calificación fuera de 1 a 5', async () => {
    expect((await guardarResena({ ...DATOS, calEntrenador: 6 })).ok).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rechaza un comentario de más de 500 caracteres', async () => {
    expect((await guardarResena({ ...DATOS, comentario: 'a'.repeat(501) })).ok).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rechaza un registro que no es UUID', async () => {
    expect((await guardarResena({ ...DATOS, registroId: 'r1' })).ok).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('los otros roles reciben acceso denegado', async () => {
    for (const rol of ['ENTRENADOR', 'RECEPCION', 'ADMINISTRADOR'] as const) {
      vi.mocked(obtenerUsuario).mockResolvedValue({
        id: 'u1',
        correo: 'otro@madlions.com',
        nombre: 'Otro',
        apellido: 'Usuario',
        rol,
      });

      expect(await guardarResena(DATOS)).toEqual({ ok: false, error: 'Acceso denegado' });
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/dal', () => ({ obtenerUsuario: vi.fn() }));
vi.mock('@/lib/session', () => ({ obtenerToken: vi.fn() }));
