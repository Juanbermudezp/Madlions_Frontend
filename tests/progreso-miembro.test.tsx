import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { ProgresoMiembro } from "@/components/progreso/progreso-miembro";
import { registrarProgreso } from "@/app/actions/progreso";
import { consultarEvolucion, editarProgreso } from "@/app/actions/evolucion";
import type { Serie } from "@/lib/evolucion";

vi.mock("@/app/actions/progreso", () => ({ registrarProgreso: vi.fn() }));
vi.mock("@/app/actions/evolucion", () => ({ consultarEvolucion: vi.fn(), editarProgreso: vi.fn() }));

function serie(valor: number): Serie {
  return { tipo: "PESO", primero: 80, ultimo: valor, diferencia: valor - 80, porcentaje: (valor - 80) / 80 * 100,
    registros: [{ id: "r2", fecha: "2026-01-02", valor }, { id: "r1", fecha: "2026-01-01", valor: 80 }] };
}
beforeEach(() => {
  vi.mocked(consultarEvolucion).mockResolvedValue({ ok: true, data: [serie(79)] });
  vi.mocked(registrarProgreso).mockResolvedValue({ ok: true });
  vi.mocked(editarProgreso).mockResolvedValue({ ok: true, data: null });
});
afterEach(() => { cleanup(); vi.resetAllMocks(); });

async function filtrar() {
  render(<ProgresoMiembro />);
  await screen.findByRole("table");
  fireEvent.change(screen.getByLabelText("Tipo de medición"), { target: { value: "PESO" } });
  fireEvent.change(screen.getByLabelText("Desde"), { target: { value: "2026-01-01" } });
  fireEvent.change(screen.getByLabelText("Hasta"), { target: { value: "2026-01-31" } });
  fireEvent.click(screen.getByRole("button", { name: "Aplicar filtros" }));
  await screen.findByRole("table");
  await waitFor(() => expect(consultarEvolucion).toHaveBeenLastCalledWith({ tipo: "PESO", desde: "2026-01-01", hasta: "2026-01-31" }));
}
function filtrosConservados() {
  expect((screen.getByLabelText("Tipo de medición") as HTMLSelectElement).value).toBe("PESO");
  expect((screen.getByLabelText("Desde") as HTMLInputElement).value).toBe("2026-01-01");
  expect((screen.getByLabelText("Hasta") as HTMLInputElement).value).toBe("2026-01-31");
}
function nuevoRegistro() {
  fireEvent.click(screen.getByRole("button", { name: "+ Registrar progreso" }));
  const modal = within(screen.getByRole("dialog"));
  fireEvent.change(modal.getByLabelText("Fecha del registro *"), { target: { value: "2026-01-02" } });
  fireEvent.change(modal.getByLabelText("Peso corporal (kg)"), { target: { value: "78" } });
  fireEvent.click(modal.getByRole("button", { name: "Guardar progreso" }));
}
function datosActualizados() {
  expect(within(screen.getByRole("table")).getByText("78.0 kg")).toBeTruthy();
  expect(screen.getByText("Último").parentElement?.textContent).toContain("78.0 kg");
  expect(screen.getByRole("img", { name: "Gráfica de Peso corporal" }).textContent).toContain("78.0 kg");
  filtrosConservados();
}
it("al registrar recarga historial, resumen y grafica conservando los filtros", async () => {
  await filtrar();
  vi.mocked(consultarEvolucion).mockResolvedValue({ ok: true, data: [serie(78)] });
  const llamadas = vi.mocked(consultarEvolucion).mock.calls.length;
  nuevoRegistro();
  await screen.findByText("Progreso registrado");
  await waitFor(() => expect(consultarEvolucion).toHaveBeenCalledTimes(llamadas + 1));
  await waitFor(datosActualizados);
  expect(consultarEvolucion).toHaveBeenLastCalledWith({ tipo: "PESO", desde: "2026-01-01", hasta: "2026-01-31" });
});
it("un registro rechazado no recarga ni pierde los filtros", async () => {
  await filtrar();
  vi.mocked(registrarProgreso).mockResolvedValue({ ok: false, error: "Medicion duplicada", status: 409 });
  const llamadas = vi.mocked(consultarEvolucion).mock.calls.length;
  nuevoRegistro();
  await screen.findByText("Medicion duplicada");
  expect(consultarEvolucion).toHaveBeenCalledTimes(llamadas);
  expect(screen.queryByText("Progreso registrado")).toBeNull();
  filtrosConservados();
});
it("al editar tambien recarga las tres vistas con los filtros activos", async () => {
  await filtrar();
  fireEvent.click(screen.getAllByRole("button", { name: "Editar" })[0]);
  const modal = within(screen.getByRole("dialog"));
  fireEvent.change(modal.getByLabelText("Valor (kg)"), { target: { value: "78" } });
  vi.mocked(consultarEvolucion).mockResolvedValue({ ok: true, data: [serie(78)] });
  fireEvent.click(modal.getByRole("button", { name: "Guardar cambios" }));
  await screen.findByText("Medición actualizada");
  await waitFor(datosActualizados);
  expect(editarProgreso).toHaveBeenCalledWith("r2", { fecha: "2026-01-02", valor: 78 });
});
