import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { obtenerUsuario } from '@/lib/dal';
import { obtenerToken } from '@/lib/session';
import { obtenerCalificaciones } from '@/app/actions/calificaciones';
import {
  estrellasLlenas,
  ordenarPorPromedio,
  textoPromedio,
  textoResenas,
  type PromedioCalificacion,
} from '@/lib/calificaciones';

function fila(
  nombre: string,
  promedio: number | null,
  total = promedio === null ? 0 : 5,
): PromedioCalificacion {
  return { id: nombre, nombre, promedio, total };
}

describe('ordenarPorPromedio', () => {
  const filas = [fila('Ana', 3.5), fila('Beto', 4.8), fila('Caro', null, 2), fila('Dani', 4.1)];

  it('de mayor a menor', () => {
    expect(ordenarPorPromedio(filas, 'desc').map((f) => f.nombre)).toEqual([
      'Beto',
      'Dani',
      'Ana',
      'Caro',
    ]);
  });

  it('de menor a mayor', () => {
    expect(ordenarPorPromedio(filas, 'asc').map((f) => f.nombre)).toEqual([
      'Ana',
      'Dani',
      'Beto',
      'Caro',
    ]);
  });

  it('las filas sin promedio van al final en las dos direcciones', () => {
    for (const direccion of ['asc', 'desc'] as const) {
      expect(ordenarPorPromedio(filas, direccion).at(-1)!.nombre).toBe('Caro');
    }
  });

  it('entre empatados ordena por nombre', () => {
    const empate = [fila('Zoe', 4), fila('Ana', 4)];

    expect(ordenarPorPromedio(empate, 'desc').map((f) => f.nombre)).toEqual(['Ana', 'Zoe']);
  });

  it('entre las que no tienen promedio también ordena por nombre', () => {
    const sinDatos = [fila('Zoe', null), fila('Ana', null)];

    expect(ordenarPorPromedio(sinDatos, 'desc').map((f) => f.nombre)).toEqual(['Ana', 'Zoe']);
  });

  it('no modifica el arreglo original', () => {
    const original = [...filas];
    ordenarPorPromedio(filas, 'asc');

    expect(filas).toEqual(original);
  });
});

describe('textoPromedio', () => {
  it('siempre con un decimal', () => {
    expect(textoPromedio(4)).toBe('4.0');
    expect(textoPromedio(3.25)).toBe('3.3');
    expect(textoPromedio(4.5)).toBe('4.5');
  });
});

describe('estrellasLlenas', () => {
  it('redondea el promedio al entero más cercano', () => {
    expect(estrellasLlenas(4.5)).toBe(5);
    expect(estrellasLlenas(4.4)).toBe(4);
    expect(estrellasLlenas(1)).toBe(1);
  });

  it('nunca pasa de 5 ni baja de 0', () => {
    expect(estrellasLlenas(9)).toBe(5);
    expect(estrellasLlenas(-1)).toBe(0);
  });
});

describe('textoResenas', () => {
  it('distingue el singular, el plural y el vacío', () => {
    expect(textoResenas(0)).toBe('Sin reseñas');
    expect(textoResenas(1)).toBe('1 reseña');
    expect(textoResenas(8)).toBe('8 reseñas');
  });
});

describe('obtenerCalificaciones', () => {
  const fetchMock = vi.fn();
  const RANGO = { desde: '2026-10-22', hasta: '2026-11-20' };

  beforeEach(() => {
    vi.stubEnv('API_URL', 'http://api.test/api/v1');
    vi.stubGlobal('fetch', fetchMock);
    vi.mocked(obtenerUsuario).mockResolvedValue({
      id: 'a1',
      correo: 'admin@madlions.com',
      nombre: 'Alberto',
      apellido: 'Ramírez',
      rol: 'ADMINISTRADOR',
    });
    vi.mocked(obtenerToken).mockResolvedValue('token-prueba');
    fetchMock.mockImplementation(
      async () =>
        new Response(
          JSON.stringify({
            ...RANGO,
            entrenadores: [],
            tiposClase: [],
            instalaciones: { promedio: null, total: 0 },
          }),
        ),
    );
  });

  afterEach(() => {
    vi.resetAllMocks();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('pide el panel con el rango en la query', async () => {
    const resultado = await obtenerCalificaciones(RANGO);

    expect(resultado.ok).toBe(true);
    const url = new URL(fetchMock.mock.calls[0][0]);
    expect(url.pathname).toBe('/api/v1/estadisticas/calificaciones');
    expect(url.searchParams.get('desde')).toBe(RANGO.desde);
    expect(url.searchParams.get('hasta')).toBe(RANGO.hasta);
  });

  it('manda el token en el servidor', async () => {
    await obtenerCalificaciones(RANGO);

    expect(fetchMock.mock.calls[0][1].headers.get('Authorization')).toBe('Bearer token-prueba');
  });

  it('los otros roles no llegan a la API', async () => {
    for (const rol of ['MIEMBRO', 'ENTRENADOR', 'RECEPCION'] as const) {
      vi.mocked(obtenerUsuario).mockResolvedValue({
        id: 'u1',
        correo: 'otro@madlions.com',
        nombre: 'Otro',
        apellido: 'Usuario',
        rol,
      });

      const resultado = await obtenerCalificaciones(RANGO);
      expect(resultado).toEqual({ ok: false, error: 'Acceso denegado', estado: 403 });
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('sin sesión devuelve 401 sin llamar a la API', async () => {
    vi.mocked(obtenerUsuario).mockResolvedValue(null);

    expect(await obtenerCalificaciones(RANGO)).toMatchObject({ ok: false, estado: 401 });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

vi.mock('@/lib/dal', () => ({ obtenerUsuario: vi.fn() }));
vi.mock('@/lib/session', () => ({ obtenerToken: vi.fn() }));
