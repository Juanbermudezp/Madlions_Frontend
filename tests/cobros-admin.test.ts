import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { obtenerUsuario } from '@/lib/dal';
import { obtenerToken } from '@/lib/session';
import { listarCobrosAdmin } from '@/app/actions/cobros-admin';
import {
    FILTROS_INICIALES,
    MENSAJES_COBROS_ADMIN,
    esNoHabilitado,
    queryCobros,
    totalPaginas,
} from '@/lib/cobros-admin';

vi.mock('@/lib/dal', () => ({ obtenerUsuario: vi.fn() }));
vi.mock('@/lib/session', () => ({ obtenerToken: vi.fn() }));
const fetchMock = vi.fn();

const pagina = { items: [], total: 0, sumaMontos: 0, pagina: 1 };
const admin = { id: 'a1', correo: 'admin@madlions.com', nombre: 'Alberto', apellido: 'Ramírez', rol: 'ADMINISTRADOR' } as const;

describe('queryCobros', () => {
    it('envía solo los filtros con valor', () => {
        expect(queryCobros(FILTROS_INICIALES)).toBe('estado=PENDIENTE&pagina=1');
    });

    it('agrega concepto y búsqueda (sin espacios en los extremos)', () => {
        const query = new URLSearchParams(
            queryCobros({ estado: 'PAGADO', concepto: 'RENOVACION', q: '  María López ', pagina: 3 }),
        );
        expect(Object.fromEntries(query)).toEqual({
            estado: 'PAGADO', pagina: '3', concepto: 'RENOVACION', q: 'María López',
        });
    });
});

describe('totalPaginas', () => {
    it('20 cobros por página y al menos una página', () => {
        expect(totalPaginas(0)).toBe(1);
        expect(totalPaginas(20)).toBe(1);
        expect(totalPaginas(21)).toBe(2);
        expect(totalPaginas(57)).toBe(3);
    });
});

describe('esNoHabilitado', () => {
    it('solo la renovación pendiente con fecha futura', () => {
        expect(esNoHabilitado({ habilitado: false, habilitadoDesde: '2026-12-01', pagadoEn: null })).toBe(true);
        expect(esNoHabilitado({ habilitado: true, habilitadoDesde: '2026-11-01', pagadoEn: null })).toBe(false);
        expect(esNoHabilitado({ habilitado: true, habilitadoDesde: null, pagadoEn: null })).toBe(false);
        expect(esNoHabilitado({ habilitado: false, habilitadoDesde: '2026-11-01', pagadoEn: '2026-11-02T10:00:00Z' })).toBe(false);
    });
});

describe('listarCobrosAdmin', () => {
    beforeEach(() => {
        vi.stubEnv('API_URL', 'http://api.test/api/v1');
        vi.stubGlobal('fetch', fetchMock);
        vi.mocked(obtenerUsuario).mockResolvedValue(admin);
        vi.mocked(obtenerToken).mockResolvedValue('token-prueba');
        fetchMock.mockImplementation(async () => new Response(JSON.stringify(pagina)));
    });
    afterEach(() => {
        vi.resetAllMocks();
        vi.unstubAllGlobals();
        vi.unstubAllEnvs();
    });

    it('consulta GET /cobros con los filtros y el token del servidor', async () => {
        const res = await listarCobrosAdmin({ estado: 'PENDIENTE', concepto: 'MEMBRESIA', q: 'MBR-000001', pagina: 2 });

        expect(res).toEqual({ ok: true, datos: pagina });
        const [url, opciones] = fetchMock.mock.calls[0];
        expect(new URL(url).pathname).toBe('/api/v1/cobros');
        expect(Object.fromEntries(new URL(url).searchParams)).toEqual({
            estado: 'PENDIENTE', pagina: '2', concepto: 'MEMBRESIA', q: 'MBR-000001',
        });
        expect(opciones.headers.get('Authorization')).toBe('Bearer token-prueba');
    });

    it.each(['MIEMBRO', 'ENTRENADOR', 'RECEPCION'] as const)('con sesión de %s no llama a la API', async (rol) => {
        vi.mocked(obtenerUsuario).mockResolvedValue({ ...admin, rol });
        expect(await listarCobrosAdmin(FILTROS_INICIALES)).toEqual({
            ok: false, error: MENSAJES_COBROS_ADMIN.accesoDenegado, estado: 403,
        });
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('sin sesión devuelve 401 sin llamar a la API', async () => {
        vi.mocked(obtenerUsuario).mockResolvedValue(null);
        expect(await listarCobrosAdmin(FILTROS_INICIALES)).toMatchObject({ ok: false, estado: 401 });
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('403 del backend: "Acceso denegado"', async () => {
        fetchMock.mockImplementation(async () => new Response(JSON.stringify({ message: 'Acceso denegado' }), { status: 403 }));
        expect(await listarCobrosAdmin(FILTROS_INICIALES)).toEqual({
            ok: false, error: MENSAJES_COBROS_ADMIN.accesoDenegado, estado: 403,
        });
    });

    it('400 del backend: devuelve su mensaje', async () => {
        fetchMock.mockImplementation(
            async () => new Response(JSON.stringify({ message: ['El concepto debe ser MEMBRESIA, RENOVACION o SESION_ADICIONAL.'] }), { status: 400 }),
        );
        expect(await listarCobrosAdmin(FILTROS_INICIALES)).toEqual({
            ok: false, error: 'El concepto debe ser MEMBRESIA, RENOVACION o SESION_ADICIONAL.', estado: 400,
        });
    });

    it('sin conexión: mensaje genérico', async () => {
        fetchMock.mockRejectedValue(new TypeError('fetch failed'));
        vi.spyOn(console, 'error').mockImplementation(() => { });
        expect(await listarCobrosAdmin(FILTROS_INICIALES)).toEqual({ ok: false, error: MENSAJES_COBROS_ADMIN.sinConexion });
    });
});