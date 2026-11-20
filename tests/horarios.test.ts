import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { obtenerToken } from '@/lib/session';
import { crearBloque, eliminarBloque, obtenerSemanaHorarios } from '@/app/actions/horarios';
import { MENSAJES_HORARIOS, aEventos, formatoHora, partesLocales, type Bloque } from '@/lib/horarios';

vi.mock('@/lib/session', () => ({ obtenerToken: vi.fn() }));
const fetchMock = vi.fn();

const bloque = (extra: Partial<Bloque> = {}): Bloque => ({
    id: 'b1',
    inicio: '2026-11-24T13:00:00.000Z', // martes 07:00 en El Salvador
    fin: '2026-11-24T14:00:00.000Z',
    duracionMin: 60,
    estado: 'DISPONIBLE',
    miembro: null,
    ...extra,
});

const responder = (cuerpo: unknown, status = 200) =>
    new Response(status === 204 ? null : JSON.stringify(cuerpo), { status });

describe('utilidades de horarios', () => {
    it('partesLocales: fecha y minutos en hora de El Salvador', () => {
        expect(partesLocales('2026-11-24T13:15:00.000Z')).toEqual({ fecha: '2026-11-24', minutos: 7 * 60 + 15 });
        // 02:00 UTC del 25 = 20:00 del 24 en El Salvador.
        expect(partesLocales('2026-11-25T02:00:00.000Z')).toEqual({ fecha: '2026-11-24', minutos: 20 * 60 });
    });

    it('formatoHora', () => {
        expect(formatoHora(5 * 60)).toBe('05:00');
        expect(formatoHora(21 * 60 + 45)).toBe('21:45');
    });

    it('aEventos une bloques y clases ordenados por hora', () => {
        const eventos = aEventos({
            bloques: [bloque({ id: 'b2', inicio: '2026-11-24T16:00:00.000Z', duracionMin: 45 }), bloque()],
            clases: [{ id: 'c1', nombre: 'Yoga', inicio: '2026-11-24T14:00:00.000Z', fin: '2026-11-24T15:00:00.000Z' }],
        });
        expect(eventos.map((e) => [e.tipo, e.id, e.fecha, e.inicio, e.fin])).toEqual([
            ['bloque', 'b1', '2026-11-24', 420, 480],
            ['clase', 'c1', '2026-11-24', 480, 540],
            ['bloque', 'b2', '2026-11-24', 600, 645],
        ]);
    });

    it('una clase que pasa de medianoche se corta al final del día', () => {
        const [clase] = aEventos({
            bloques: [],
            clases: [{ id: 'c1', nombre: 'Yoga', inicio: '2026-11-25T05:30:00.000Z', fin: '2026-11-25T06:30:00.000Z' }],
        });
        expect([clase.fecha, clase.inicio, clase.fin]).toEqual(['2026-11-24', 23 * 60 + 30, 24 * 60]);
    });
});

describe('acciones de horarios', () => {
    beforeEach(() => {
        vi.stubEnv('API_URL', 'http://api.test/api/v1');
        vi.stubGlobal('fetch', fetchMock);
        vi.mocked(obtenerToken).mockResolvedValue('token-entrenador');
    });
    afterEach(() => {
        vi.resetAllMocks();
        vi.unstubAllGlobals();
        vi.unstubAllEnvs();
    });

    it('obtenerSemanaHorarios pide bloques y clases de la misma semana', async () => {
        const ocupado = bloque({ estado: 'OCUPADO', miembro: { nombre: 'María López' } });
        fetchMock.mockImplementation(async (url: URL) =>
            responder(url.pathname.endsWith('bloques/mios') ? [ocupado] : []),
        );

        const res = await obtenerSemanaHorarios('2026-11-24');

        expect(res).toEqual({ ok: true, datos: { bloques: [ocupado], clases: [] } });
        const urls = fetchMock.mock.calls.map(([url]) => `${url.pathname}${url.search}`).sort();
        expect(urls).toEqual(['/api/v1/bloques/mios?semana=2026-11-24', '/api/v1/clases/mias?semana=2026-11-24']);
        expect(fetchMock.mock.calls[0][1].headers.get('Authorization')).toBe('Bearer token-entrenador');
    });

    it('crearBloque hace POST /bloques con los datos', async () => {
        fetchMock.mockResolvedValue(responder(bloque(), 201));
        const datos = { fecha: '2026-11-24', horaInicio: '07:00', duracionMin: 60 };

        expect(await crearBloque(datos)).toEqual({ ok: true, datos: undefined });
        const [url, opciones] = fetchMock.mock.calls[0];
        expect(url.pathname).toBe('/api/v1/bloques');
        expect(opciones.method).toBe('POST');
        expect(JSON.parse(opciones.body)).toEqual(datos);
    });

    it('crearBloque con traslape: devuelve el mensaje del backend', async () => {
        fetchMock.mockResolvedValue(responder({ message: 'Ya tienes una actividad en ese horario' }, 409));
        expect(await crearBloque({ fecha: '2026-11-24', horaInicio: '07:00', duracionMin: 60 })).toEqual({
            ok: false, error: 'Ya tienes una actividad en ese horario', estado: 409,
        });
    });

    it('eliminarBloque hace DELETE /bloques/:id (204)', async () => {
        fetchMock.mockResolvedValue(responder(null, 204));
        expect(await eliminarBloque('b1')).toEqual({ ok: true, datos: undefined });
        const [url, opciones] = fetchMock.mock.calls[0];
        expect(url.pathname).toBe('/api/v1/bloques/b1');
        expect(opciones.method).toBe('DELETE');
    });

    it('eliminarBloque de un bloque ocupado: 409 con el mensaje del backend', async () => {
        fetchMock.mockResolvedValue(responder({ message: 'No puedes eliminar un bloque con una sesión agendada' }, 409));
        expect(await eliminarBloque('b1')).toMatchObject({ ok: false, estado: 409 });
    });

    it('sesión vencida (401) y rol sin permiso (403)', async () => {
        // Se crea una respuesta por llamada: la acción pide bloques y clases a la vez.
        fetchMock.mockImplementation(async () => responder({ message: 'Unauthorized' }, 401));
        expect(await obtenerSemanaHorarios('2026-11-24')).toEqual({
            ok: false, error: MENSAJES_HORARIOS.sesionExpirada, estado: 401,
        });
        fetchMock.mockImplementation(async () => responder({ message: 'Forbidden' }, 403));
        expect(await obtenerSemanaHorarios('2026-11-24')).toEqual({
            ok: false, error: MENSAJES_HORARIOS.accesoDenegado, estado: 403,
        });
    });

    it('sin conexión: mensaje genérico', async () => {
        fetchMock.mockRejectedValue(new TypeError('fetch failed'));
        vi.spyOn(console, 'error').mockImplementation(() => { });
        expect(await eliminarBloque('b1')).toEqual({ ok: false, error: MENSAJES_HORARIOS.sinConexion });
    });
});