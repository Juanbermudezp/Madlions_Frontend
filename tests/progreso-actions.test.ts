import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { registrarProgreso } from "@/app/actions/progreso";
import { consultarEvolucion, editarProgreso } from "@/app/actions/evolucion";
import { obtenerToken } from "@/lib/session";

vi.mock("@/lib/session", () => ({ obtenerToken: vi.fn() }));
const datos = { fecha: "2026-01-01", mediciones: [{ tipo: "PESO" as const, valor: 80 }] };
const cambios = { fecha: datos.fecha, valor: 79 };
const operaciones = [
  () => registrarProgreso(datos),
  () => consultarEvolucion({ tipo: "PESO", desde: datos.fecha, hasta: "2026-01-31" }),
  () => editarProgreso("registro-1", cambios),
];
const fetchMock = vi.fn();

beforeEach(() => {
  vi.stubEnv("API_URL", "http://api.test/api/v1");
  vi.stubGlobal("fetch", fetchMock);
  vi.mocked(obtenerToken).mockResolvedValue("token-prueba");
  fetchMock.mockImplementation(async () => new Response(JSON.stringify({ series: [] }), { status: 200 }));
});
afterEach(() => { vi.resetAllMocks(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe("contrato HTTP de H16 con el cliente compartido", () => {
  it.each(["http://api.test/api/v1", "http://api.test/api/v1/"])("usa un solo prefijo con base %s", async (base) => {
    vi.stubEnv("API_URL", base);
    await operaciones[0]();
    await operaciones[1]();
    await operaciones[2]();
    const rutas = fetchMock.mock.calls.map(([url]) => new URL(url).pathname);
    expect(rutas).toEqual(["/api/v1/progreso", "/api/v1/progreso/mio", "/api/v1/progreso/registro-1"]);
    const [url, consulta] = fetchMock.mock.calls[1];
    expect(new URL(url).searchParams.get("desde")).toBe(datos.fecha);
    expect(new URL(url).searchParams.get("hasta")).toBe("2026-01-31");
    expect(new URL(url).searchParams.get("tipo")).toBe("PESO");
    expect(consulta.cache).toBe("no-store");
    for (const [, opciones] of fetchMock.mock.calls) {
      expect(opciones.headers.get("Authorization")).toBe("Bearer token-prueba");
    }
    expect(fetchMock.mock.calls[0][1].method).toBe("POST");
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual(datos);
    expect(fetchMock.mock.calls[2][1].method).toBe("PATCH");
    expect(JSON.parse(fetchMock.mock.calls[2][1].body)).toEqual(cambios);
  });
  it.each([401, 403, 409])("conserva el error HTTP %s en las tres acciones", async (status) => {
    fetchMock.mockImplementation(async () => new Response(JSON.stringify({ message: "Error del servidor" }), { status }));
    for (const operar of operaciones) {
      expect(await operar()).toEqual({ ok: false, error: "Error del servidor", status });
    }
  });
  it("no envia peticiones sin token", async () => {
    vi.mocked(obtenerToken).mockResolvedValue(undefined);
    for (const operar of operaciones) expect(await operar()).toMatchObject({ ok: false, status: 401 });
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("no presenta un fallo de red como exito", async () => {
    fetchMock.mockRejectedValue(new TypeError("offline"));
    for (const operar of operaciones) expect(await operar()).toMatchObject({ ok: false });
  });
  it("rechaza una respuesta de series invalida", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ registros: [] })));
    expect(await consultarEvolucion()).toMatchObject({ ok: false });
  });
});
