import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { obtenerReporteOcupacion } from "@/app/actions/reportes";
import { ReporteOcupacion } from "@/components/reportes/reporte-ocupacion";
import { exportarReportePDF, nombreArchivoPdf, textoGeneradoEl } from "@/lib/exportar-pdf";
import {
  ordenarOcupacion,
  rangoPorDefecto,
  resumenOcupacion,
  sumarMeses,
  tablaOcupacionPdf,
  validarRango,
  type FilaOcupacion,
} from "@/lib/reportes";

vi.mock("@/app/actions/reportes", () => ({ obtenerReporteOcupacion: vi.fn() }));
vi.mock("@/lib/exportar-pdf", async (original) => ({
  ...(await original<typeof import("@/lib/exportar-pdf")>()),
  exportarReportePDF: vi.fn(),
}));

afterEach(() => { cleanup(); vi.resetAllMocks(); });

const fila = (tipo: string, entrenador: string, reservas: number, cupo: number, etiqueta: FilaOcupacion["etiqueta"]): FilaOcupacion => ({
  tipoClase: { id: `t-${tipo}`, nombre: tipo }, entrenador: { id: `e-${entrenador}`, nombre: entrenador },
  vecesImpartida: 2, reservasConfirmadas: reservas, cupoTotal: cupo, ocupacion: Math.round((reservas / cupo) * 1000) / 10, etiqueta,
});
const FILAS = [
  fila("Spinning", "Ana Hernández", 19, 20, "ALTA"),
  fila("Yoga", "Carlos Martínez", 10, 20, null),
  fila("Crossfit", "Carlos Martínez", 4, 20, "BAJA"),
];
const RANGO = { desde: "2026-10-21", hasta: "2026-11-19" };
const ok = (filas: FilaOcupacion[]) => ({ ok: true as const, datos: { ...RANGO, filas } });

describe("lib/reportes", () => {
  it("rangoPorDefecto: hoy y los 29 días anteriores en hora de El Salvador", () => {
    expect(rangoPorDefecto(new Date("2026-11-19T22:00:00Z"))).toEqual(RANGO);
  });

  it("validarRango: mismas reglas que el backend", () => {
    expect(validarRango({ desde: "2026-01-01", hasta: "2026-12-31" })).toBeNull();
    expect(validarRango({ desde: "2026-01-01", hasta: "2027-01-01" })).toBe("El rango máximo es de 12 meses");
    expect(validarRango({ desde: "2026-11-10", hasta: "2026-11-09" })).toBe("La fecha de inicio no puede ser posterior a la de fin");
    expect(validarRango({ desde: "", hasta: "2026-11-09" })).toBe("Elige una fecha válida.");
  });

  it("resumenOcupacion suma el período y cuenta las etiquetas", () => {
    expect(resumenOcupacion(FILAS)).toEqual({
      clasesImpartidas: 6, reservasConfirmadas: 33, cupoTotal: 60, ocupacionGeneral: 55, alta: 1, baja: 1,
    });
    expect(resumenOcupacion([]).ocupacionGeneral).toBe(0);
  });

  it("sumarMeses ajusta al último día del mes", () => {
    expect(sumarMeses("2026-01-31", 1)).toBe("2026-02-28");
  });

  it("ordenarOcupacion por texto y por número en ambos sentidos", () => {
    expect(ordenarOcupacion(FILAS, { columna: "tipoClase", direccion: "asc" }).map((f) => f.tipoClase.nombre)).toEqual(["Crossfit", "Spinning", "Yoga"]);
    expect(ordenarOcupacion(FILAS, { columna: "ocupacion", direccion: "asc" }).map((f) => f.ocupacion)).toEqual([20, 50, 95]);
  });

  it("PDF: columnas, filas con etiqueta, nombre del archivo y fecha de generación", () => {
    const { columnas, filas } = tablaOcupacionPdf(FILAS);
    expect(columnas).toEqual(["Clase", "Entrenador", "Veces impartida", "Reservas confirmadas", "Cupo total", "Ocupación", "Etiqueta"]);
    expect(filas[0]).toEqual(["Spinning", "Ana Hernández", "2", "19", "20", "95.0 %", "Alta demanda"]);
    expect(filas[1][6]).toBe("");
    expect(nombreArchivoPdf("ocupacion", RANGO)).toBe("reporte-ocupacion-2026-10-21-2026-11-19.pdf");
    expect(textoGeneradoEl(new Date("2026-11-19T22:05:00Z"))).toBe("Generado el 19/11/2026 16:05");
  });
});

describe("FE-26.1 Reporte de ocupación", () => {
  it("muestra la gráfica y la tabla de mayor a menor con las etiquetas", () => {
    render(<ReporteOcupacion inicial={ok(FILAS)} rangoInicial={RANGO} />);

    expect(screen.getByText("21/10/2026 al 19/11/2026 · Solo clases impartidas y reservas confirmadas")).toBeTruthy();
    expect(screen.getAllByRole("img").map((b) => b.getAttribute("aria-label")?.split(":")[0])).toEqual([
      "Spinning con Ana Hernández", "Yoga con Carlos Martínez", "Crossfit con Carlos Martínez",
    ]);
    const filas = within(screen.getByRole("table")).getAllByRole("row").slice(1);
    expect(filas.map((f) => within(f).getAllByRole("cell")[0].textContent)).toEqual(["Spinning", "Yoga", "Crossfit"]);
    expect(within(filas[0]).getByText("Alta demanda")).toBeTruthy();
    expect(within(filas[2]).getByText("Baja ocupación")).toBeTruthy();
    expect(within(filas[1]).getByText("50.0 %")).toBeTruthy();
    const resumen = screen.getByLabelText("Resumen del período");
    expect(within(resumen).getByText("55.0 %")).toBeTruthy();
    expect(within(resumen).getByText("33 de 60 lugares ocupados")).toBeTruthy();
  });

  it("ordena la tabla al tocar una columna y alterna el sentido", () => {
    render(<ReporteOcupacion inicial={ok(FILAS)} rangoInicial={RANGO} />);
    const primera = () => within(within(screen.getByRole("table")).getAllByRole("row")[1]).getAllByRole("cell")[0].textContent;

    fireEvent.click(screen.getByRole("button", { name: /^Clase/ }));
    expect(primera()).toBe("Crossfit");
    fireEvent.click(screen.getByRole("button", { name: /^Clase/ }));
    expect(primera()).toBe("Yoga");
  });

  it("estado vacío del período", () => {
    render(<ReporteOcupacion inicial={ok([])} rangoInicial={RANGO} />);
    expect(screen.getByText("No hay clases impartidas en este período")).toBeTruthy();
    expect((screen.getByRole("button", { name: "Exportar PDF" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("error con Reintentar vuelve a pedir el mismo rango", async () => {
    vi.mocked(obtenerReporteOcupacion).mockResolvedValue(ok(FILAS));
    render(<ReporteOcupacion inicial={{ ok: false, error: "No se pudo conectar con el servidor." }} rangoInicial={RANGO} />);
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(await screen.findByRole("table")).toBeTruthy();
    expect(obtenerReporteOcupacion).toHaveBeenCalledWith(RANGO);
  });

  it("un rango de más de 12 meses no se envía y muestra el motivo", () => {
    render(<ReporteOcupacion inicial={ok(FILAS)} rangoInicial={RANGO} />);
    const [desde, hasta] = screen.getAllByLabelText(/Desde|Hasta/);
    fireEvent.change(desde, { target: { value: "2025-01-01" } });
    fireEvent.change(hasta, { target: { value: "2026-01-01" } });
    fireEvent.click(screen.getByRole("button", { name: "Aplicar" }));

    expect(screen.getByText("El rango máximo es de 12 meses")).toBeTruthy();
    expect(obtenerReporteOcupacion).not.toHaveBeenCalled();
  });

  it("Aplicar pide el rango elegido", async () => {
    vi.mocked(obtenerReporteOcupacion).mockResolvedValue(ok([]));
    render(<ReporteOcupacion inicial={ok(FILAS)} rangoInicial={RANGO} />);
    fireEvent.change(screen.getByLabelText("Desde"), { target: { value: "2026-11-01" } });
    fireEvent.click(screen.getByRole("button", { name: "Aplicar" }));

    await waitFor(() => expect(obtenerReporteOcupacion).toHaveBeenCalledWith({ desde: "2026-11-01", hasta: "2026-11-19" }));
    expect(await screen.findByText("No hay clases impartidas en este período")).toBeTruthy();
  });
});

describe("FE-26.2 Exportar PDF", () => {
  it("exporta el título, el rango y la tabla en el orden que se ve", async () => {
    render(<ReporteOcupacion inicial={ok(FILAS)} rangoInicial={RANGO} />);
    fireEvent.click(screen.getByRole("button", { name: /^Clase/ }));
    fireEvent.click(screen.getByRole("button", { name: "Exportar PDF" }));

    await waitFor(() => expect(exportarReportePDF).toHaveBeenCalledTimes(1));
    const datos = vi.mocked(exportarReportePDF).mock.calls[0][0];
    expect(datos).toMatchObject({ titulo: "Reporte de ocupación de clases grupales", nombre: "ocupacion", rango: RANGO });
    expect(datos.filas.map((f) => f[0])).toEqual(["Crossfit", "Spinning", "Yoga"]);
  });

  it("si falla la generación muestra un mensaje", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.mocked(exportarReportePDF).mockRejectedValue(new Error("x"));
    render(<ReporteOcupacion inicial={ok(FILAS)} rangoInicial={RANGO} />);
    fireEvent.click(screen.getByRole("button", { name: "Exportar PDF" }));
    expect(await screen.findByText("No se pudo generar el PDF. Intenta de nuevo.")).toBeTruthy();
  });
});
