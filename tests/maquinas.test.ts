import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { revalidatePath } from 'next/cache';
import { obtenerUsuario } from '@/lib/dal';
import { obtenerToken } from '@/lib/session';
import { cambiarEstadoMaquina } from '@/app/actions/maquinas';
import {
  campoDelMensajeCambio,
  estadosDisponibles,
  etiquetaCambiadoEn,
  pideFechaEstimada,
  puedeGestionarMaquinas,
  validarCambioEstado,
  type DatosCambioEstado,
} from '@/lib/maquinas';

const HOY = '2026-11-18';
const MOTIVO = 'Banda desgastada, se espera el repuesto del proveedor.';
const ID = '03ad7341-2026-4eeb-8078-cc2ab2331f05';

function cambio(datos: Partial<DatosCambioEstado> = {}): DatosCambioEstado {
  return { estado: 'EN_MANTENIMIENTO', motivo: MOTIVO, fechaEstimadaRetorno: '', ...datos };
}

describe('estadosDisponibles', () => {
  it('no ofrece el estado en el que la máquina ya está', () => {
    expect(estadosDisponibles('OPERATIVA')).toEqual(['EN_MANTENIMIENTO', 'FUERA_DE_SERVICIO']);
    expect(estadosDisponibles('EN_MANTENIMIENTO')).toEqual(['OPERATIVA', 'FUERA_DE_SERVICIO']);
    expect(estadosDisponibles('FUERA_DE_SERVICIO')).toEqual(['OPERATIVA', 'EN_MANTENIMIENTO']);
  });
});

describe('pideFechaEstimada', () => {
  it('oculta la fecha al volver a operativa y mientras no hay estado elegido', () => {
    expect(pideFechaEstimada('OPERATIVA')).toBe(false);
    expect(pideFechaEstimada('')).toBe(false);
  });

  it('la pide en los otros dos estados', () => {
    expect(pideFechaEstimada('EN_MANTENIMIENTO')).toBe(true);
    expect(pideFechaEstimada('FUERA_DE_SERVICIO')).toBe(true);
  });
});

describe('puedeGestionarMaquinas', () => {
  it('solo el administrador y el entrenador (supuesto S13)', () => {
    expect(puedeGestionarMaquinas('ADMINISTRADOR')).toBe(true);
    expect(puedeGestionarMaquinas('ENTRENADOR')).toBe(true);
    expect(puedeGestionarMaquinas('MIEMBRO')).toBe(false);
    expect(puedeGestionarMaquinas('RECEPCION')).toBe(false);
  });
});

describe('validarCambioEstado', () => {
  it('acepta un cambio con motivo y sin fecha', () => {
    expect(validarCambioEstado(cambio(), HOY)).toEqual({});
  });

  it('acepta la fecha de hoy y las posteriores', () => {
    expect(validarCambioEstado(cambio({ fechaEstimadaRetorno: HOY }), HOY)).toEqual({});
    expect(validarCambioEstado(cambio({ fechaEstimadaRetorno: '2027-01-01' }), HOY)).toEqual({});
  });

  it('pide elegir el estado', () => {
    expect(validarCambioEstado(cambio({ estado: '' }), HOY)).toHaveProperty('estado');
  });

  it('acepta motivos de 5 y 250 caracteres y rechaza 4 y 251', () => {
    expect(validarCambioEstado(cambio({ motivo: 'a'.repeat(5) }), HOY)).toEqual({});
    expect(validarCambioEstado(cambio({ motivo: 'a'.repeat(250) }), HOY)).toEqual({});
    expect(validarCambioEstado(cambio({ motivo: 'a'.repeat(4) }), HOY)).toHaveProperty('motivo');
    expect(validarCambioEstado(cambio({ motivo: 'a'.repeat(251) }), HOY)).toHaveProperty('motivo');
  });

  it('rechaza el motivo de solo espacios', () => {
    expect(validarCambioEstado(cambio({ motivo: '          ' }), HOY)).toHaveProperty('motivo');
  });

  it('rechaza la fecha de ayer', () => {
    expect(
      validarCambioEstado(cambio({ fechaEstimadaRetorno: '2026-11-17' }), HOY),
    ).toHaveProperty('fechaEstimadaRetorno');
  });

  it('rechaza una fecha que no es AAAA-MM-DD', () => {
    expect(
      validarCambioEstado(cambio({ fechaEstimadaRetorno: '01/12/2026' }), HOY),
    ).toHaveProperty('fechaEstimadaRetorno');
  });

  it('al volver a operativa no revisa la fecha: el formulario ni la muestra', () => {
    expect(
      validarCambioEstado(
        cambio({ estado: 'OPERATIVA', fechaEstimadaRetorno: '2026-11-17' }),
        HOY,
      ),
    ).toEqual({});
  });
});

describe('campoDelMensajeCambio', () => {
  it('lleva cada error del backend a su campo', () => {
    expect(campoDelMensajeCambio('El motivo es obligatorio y debe tener entre 5 y 250 caracteres.')).toBe('motivo');
    expect(campoDelMensajeCambio('La fecha estimada de retorno no puede ser anterior a hoy.')).toBe('fechaEstimadaRetorno');
    expect(campoDelMensajeCambio('Una máquina que vuelve a estar operativa no lleva fecha estimada de retorno.')).toBe('fechaEstimadaRetorno');
    expect(campoDelMensajeCambio('La máquina ya está en ese estado.')).toBeUndefined();
  });
});

describe('etiquetaCambiadoEn', () => {
  it('muestra la fecha y la hora en hora de El Salvador', () => {
    // 15:42 UTC son las 09:42 en El Salvador (UTC-6, sin horario de verano).
    expect(etiquetaCambiadoEn('2026-11-18T15:42:00.000Z')).toContain('09:42');
    expect(etiquetaCambiadoEn('2026-11-18T15:42:00.000Z')).toContain('18');
  });
});

describe('cambiarEstadoMaquina', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubEnv('API_URL', 'http://api.test/api/v1');
    vi.stubGlobal('fetch', fetchMock);
    vi.mocked(obtenerUsuario).mockResolvedValue({
      id: 'u1',
      correo: 'admin@madlions.com',
      nombre: 'Alberto',
      apellido: 'Ramírez',
      rol: 'ADMINISTRADOR',
    });
    vi.mocked(obtenerToken).mockResolvedValue('token-prueba');
    fetchMock.mockImplementation(async () => new Response(JSON.stringify({ id: ID })));
  });

  afterEach(() => {
    vi.resetAllMocks();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('llama al endpoint de la máquina con el motivo recortado', async () => {
    const resultado = await cambiarEstadoMaquina(ID, cambio({ motivo: `  ${MOTIVO}  ` }));

    expect(resultado).toEqual({ ok: true, mensaje: 'Estado actualizado' });
    const [url, opciones] = fetchMock.mock.calls[0];
    expect(new URL(url).pathname).toBe(`/api/v1/maquinas/${ID}/estado`);
    expect(opciones.method).toBe('POST');
    expect(JSON.parse(opciones.body)).toEqual({ estado: 'EN_MANTENIMIENTO', motivo: MOTIVO });
    expect(revalidatePath).toHaveBeenCalledWith('/admin/equipo');
  });

  it('manda la fecha estimada cuando se eligió', async () => {
    await cambiarEstadoMaquina(ID, cambio({ fechaEstimadaRetorno: '2099-01-01' }));

    expect(JSON.parse(fetchMock.mock.calls[0][1].body).fechaEstimadaRetorno).toBe('2099-01-01');
  });

  it('no manda fecha al volver a operativa', async () => {
    await cambiarEstadoMaquina(
      ID,
      cambio({ estado: 'OPERATIVA', fechaEstimadaRetorno: '2099-01-01' }),
    );

    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).not.toHaveProperty(
      'fechaEstimadaRetorno',
    );
  });

  it('el entrenador también puede (supuesto S13)', async () => {
    vi.mocked(obtenerUsuario).mockResolvedValue({
      id: 'u2',
      correo: 'entrenador@madlions.com',
      nombre: 'Carlos',
      apellido: 'Martínez',
      rol: 'ENTRENADOR',
    });

    expect((await cambiarEstadoMaquina(ID, cambio())).ok).toBe(true);
    expect(revalidatePath).toHaveBeenCalledWith('/entrenador/equipo');
  });

  it('el miembro y recepción reciben acceso denegado y no se llama a la API', async () => {
    for (const rol of ['MIEMBRO', 'RECEPCION'] as const) {
      vi.mocked(obtenerUsuario).mockResolvedValue({
        id: 'u3',
        correo: 'otro@madlions.com',
        nombre: 'Otro',
        apellido: 'Usuario',
        rol,
      });

      expect(await cambiarEstadoMaquina(ID, cambio())).toEqual({
        ok: false,
        error: 'Acceso denegado',
      });
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('no llama a la API si los datos no pasan la validación', async () => {
    const resultado = await cambiarEstadoMaquina(ID, cambio({ motivo: 'abcd' }));

    expect(resultado.ok).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rechaza un id que no es UUID sin llamar a la API', async () => {
    expect(await cambiarEstadoMaquina('no-es-uuid', cambio())).toEqual({
      ok: false,
      error: 'La máquina no existe.',
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/dal', () => ({ obtenerUsuario: vi.fn() }));
vi.mock('@/lib/session', () => ({ obtenerToken: vi.fn() }));
