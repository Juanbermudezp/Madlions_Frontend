import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cancelarClase } from "@/app/actions/clases";
import { AgendaSemanal, resumenSemana } from "@/components/clases/agenda-semanal";
import { MENSAJES_CANCELACION_CLASE, esCancelable, validarMotivoCancelacion, type ClaseAgenda } from "@/lib/clases";

vi.mock("@/app/actions/clases", () => ({
  cancelarClase: vi.fn(),
  guardarClase: vi.fn(),
  guardarTipoClase: vi.fn(),
}));

// Viernes 20/11/2026, 11:52 en El Salvador.
const AHORA = new Date("2026-11-20T17:52:00.000Z");

const clase = (datos: Partial<ClaseAgenda> & Pick<ClaseAgenda, "id" | "inicio" | "fin">): ClaseAgenda => ({
  tipo: { id: "t-yoga", nombre: "Yoga" },
  entrenador: { id: "e1", nombre: "Ana Hernández" },
  descripcion: null,
  cupoMaximo: 5,
  reservasConfirmadas: 0,
  lugaresDisponibles: 5,
  estado: "PROGRAMADA",
  ...datos,
});

// Viernes 13:00 (programada, 3 de 5), miércoles 06:00 (impartida), lunes 18:00 (cancelada) y sábado 07:00 (llena).
const YOGA = clase({
  id: "11111111-1111-1111-1111-111111111111",
  inicio: "2026-11-20T19:00:00.000Z", fin: "2026-11-20T20:00:00.000Z",
  reservasConfirmadas: 3, lugaresDisponibles: 2,
});
const CROSSFIT = clase({
  id: "22222222-2222-2222-2222-222222222222", tipo: { id: "t-cross", nombre: "Crossfit" },
  inicio: "2026-11-18T12:00:00.000Z", fin: "2026-11-18T13:00:00.000Z",
  cupoMaximo: 12, reservasConfirmadas: 8, lugaresDisponibles: 4, estado: "IMPARTIDA",
});
const BOX = clase({
  id: "33333333-3333-3333-3333-333333333333", tipo: { id: "t-box", nombre: "Box" },
  inicio: "2026-11-17T00:00:00.000Z", fin: "2026-11-17T01:00:00.000Z",
  cupoMaximo: 10, lugaresDisponibles: 10, estado: "CANCELADA_GIMNASIO",
});
const SPINNING = clase({
  id: "44444444-4444-4444-4444-444444444444", tipo: { id: "t-spin", nombre: "Spinning" },
  entrenador: { id: "e2", nombre: "Carlos Martínez" },
  inicio: "2026-11-21T13:00:00.000Z", fin: "2026-11-21T14:00:00.000Z",
  cupoMaximo: 20, reservasConfirmadas: 20, lugaresDisponibles: 0,
});
const SEMANA = [YOGA, CROSSFIT, BOX, SPINNING];

const agenda = (clases: ClaseAgenda[] = SEMANA, editable = true) =>
  render(
    <AgendaSemanal lunes="2026-11-16" hoy="2026-11-20" rutaBase="/admin/clases" clases={clases}
      tipos={[]} entrenadores={[]} editable={editable} />,
  );

/** La cuadrícula y la lista del teléfono están las dos en el DOM: se toma el primer bloque. */
const abrir = (nombre: RegExp) => fireEvent.click(screen.getAllByRole("button", { name: nombre })[0]);
const panel = () => within(screen.getByRole("complementary", { name: "Detalle de la clase" }));

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(AHORA);
});
afterEach(() => {
  vi.useRealTimers();
  cleanup();
  vi.resetAllMocks();
});

describe("lib/clases · reglas de FE-7.1", () => {
  it("el motivo va de 10 a 250 caracteres sin contar los espacios de los extremos", () => {
    expect(validarMotivoCancelacion("123456789")).toBe(MENSAJES_CANCELACION_CLASE.motivoInvalido);
    expect(validarMotivoCancelacion("   123456789   ")).toBe(MENSAJES_CANCELACION_CLASE.motivoInvalido);
    expect(validarMotivoCancelacion("1234567890")).toBeNull();
    expect(validarMotivoCancelacion("a".repeat(250))).toBeNull();
    expect(validarMotivoCancelacion("a".repeat(251))).toBe(MENSAJES_CANCELACION_CLASE.motivoInvalido);
  });

  it("solo se cancelan clases programadas que aún no empiezan", () => {
    expect(esCancelable(YOGA, AHORA)).toBe(true);
    expect(esCancelable(CROSSFIT, AHORA)).toBe(false);
    expect(esCancelable(BOX, AHORA)).toBe(false);
    expect(esCancelable({ ...YOGA, inicio: "2026-11-20T17:30:00.000Z" }, AHORA)).toBe(false);
  });

  it("mensajes de la ficha: reservas afectadas y éxito", () => {
    expect(MENSAJES_CANCELACION_CLASE.reservasAfectadas(3)).toBe("Se cancelarán 3 reservas y se avisará a los miembros.");
    expect(MENSAJES_CANCELACION_CLASE.exito(3)).toBe("Clase cancelada. 3 miembros fueron notificados.");
    expect(MENSAJES_CANCELACION_CLASE.exito(1)).toBe("Clase cancelada. 1 miembro fue notificado.");
  });
});

describe("Agenda de clases (rediseño)", () => {
  it("resumen de la semana: las canceladas no cuentan en la ocupación", () => {
    expect(resumenSemana(SEMANA)).toEqual({ clases: 3, impartidas: 1, reservas: 31, cupo: 37, ocupacion: 84, canceladas: 1 });

    agenda();
    const resumen = within(screen.getByLabelText("Resumen de la semana"));
    expect(resumen.getByText("84 %")).toBeTruthy();
    expect(resumen.getByText("de 37 lugares")).toBeTruthy();
    expect(resumen.getByText("2 por impartir", { exact: false })).toBeTruthy();
  });

  it("el filtro por tipo deja solo las clases de ese tipo", () => {
    agenda();
    fireEvent.click(screen.getByRole("button", { name: "Spinning" }));

    expect(screen.getAllByRole("button", { name: /^Spinning,/ }).length).toBeGreaterThan(0);
    expect(screen.queryAllByRole("button", { name: /^Yoga,/ })).toHaveLength(0);
    fireEvent.click(screen.getByRole("button", { name: "Todas" }));
    expect(screen.getAllByRole("button", { name: /^Yoga,/ }).length).toBeGreaterThan(0);
  });

  it("cada bloque muestra reservas/cupo; la llena y la cancelada lo dicen", () => {
    agenda();
    expect(screen.getAllByText("3/5").length).toBeGreaterThan(0);
    expect(screen.getAllByText("20/20 · llena").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Cancelada").length).toBeGreaterThan(0);
  });

  it("al tocar una clase futura se abre el panel con Modificar y Cancelar clase", () => {
    agenda();
    expect(panel().getByText("Toca una clase de la agenda para ver su detalle.")).toBeTruthy();

    abrir(/^Yoga,/);

    expect(panel().getByRole("heading", { name: "Yoga" })).toBeTruthy();
    expect(panel().getByText("3 / 5")).toBeTruthy();
    expect(panel().getByRole("button", { name: "Modificar clase" })).toBeTruthy();
    expect(panel().getByRole("button", { name: "Cancelar clase" })).toBeTruthy();
  });

  it.each([
    [/^Crossfit,/, "La clase ya se impartió: solo lectura."],
    [/^Box,/, "La clase fue cancelada por el gimnasio y sus reservas quedaron canceladas."],
  ])("una clase impartida o cancelada no tiene el botón (%s)", (nombre, nota) => {
    agenda();
    abrir(nombre);
    expect(panel().getByText(nota)).toBeTruthy();
    expect(panel().queryByRole("button", { name: "Cancelar clase" })).toBeNull();
    expect(panel().queryByRole("button", { name: "Modificar clase" })).toBeNull();
  });

  it("una clase que ya empezó tampoco se puede cancelar", () => {
    agenda([{ ...YOGA, inicio: "2026-11-20T17:30:00.000Z", fin: "2026-11-20T18:30:00.000Z" }]);
    abrir(/^Yoga,/);
    expect(panel().getByText("La clase ya empezó: no se puede modificar ni cancelar.")).toBeTruthy();
    expect(panel().queryByRole("button", { name: "Cancelar clase" })).toBeNull();
  });

  it("entrenador y recepción ven el detalle sin botones (solo lectura)", () => {
    agenda(SEMANA, false);
    abrir(/^Yoga,/);
    expect(panel().getByRole("heading", { name: "Yoga" })).toBeTruthy();
    expect(panel().queryByRole("button", { name: "Cancelar clase" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Nueva clase" })).toBeNull();
  });
});

describe("FE-7.1 · Cancelar clase", () => {
  const abrirCancelacion = () => {
    agenda();
    abrir(/^Yoga,/);
    fireEvent.click(panel().getByRole("button", { name: "Cancelar clase" }));
    return within(screen.getByRole("dialog", { name: "Cancelar clase" }));
  };
  const escribir = (modal: ReturnType<typeof abrirCancelacion>, texto: string) =>
    fireEvent.change(modal.getByLabelText("Motivo de la cancelación"), { target: { value: texto } });

  it("muestra cuántas reservas se cancelarán y el contador del motivo", () => {
    const modal = abrirCancelacion();
    expect(modal.getByText("Se cancelarán 3 reservas y se avisará a los miembros.")).toBeTruthy();
    escribir(modal, "Corto 123");
    expect(modal.getByText("9/250")).toBeTruthy();
  });

  it("un motivo de 9 caracteres muestra el error junto al campo y no llama a la API", () => {
    const modal = abrirCancelacion();
    escribir(modal, "Corto 123");
    fireEvent.click(modal.getByRole("button", { name: "Cancelar clase" }));

    expect(modal.getByText("El motivo debe tener entre 10 y 250 caracteres")).toBeTruthy();
    expect(modal.getByLabelText("Motivo de la cancelación").getAttribute("aria-invalid")).toBe("true");
    expect(cancelarClase).not.toHaveBeenCalled();
  });

  it("al confirmar: aviso con los miembros notificados y la clase queda cancelada en la agenda", async () => {
    vi.mocked(cancelarClase).mockResolvedValue({ ok: true, reservasCanceladas: 3 });
    const modal = abrirCancelacion();
    escribir(modal, "El entrenador no puede asistir");
    fireEvent.click(modal.getByRole("button", { name: "Cancelar clase" }));

    expect((await screen.findByRole("status")).textContent).toContain("Clase cancelada. 3 miembros fueron notificados.");
    expect(cancelarClase).toHaveBeenCalledWith(YOGA.id, "El entrenador no puede asistir");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(panel().getByText("Cancelada por el gimnasio")).toBeTruthy();
    expect(panel().queryByRole("button", { name: "Cancelar clase" })).toBeNull();
    expect(screen.getAllByRole("button", { name: /^Yoga,.*Cancelada por el gimnasio$/ }).length).toBeGreaterThan(0);
  });

  it("los botones se desactivan mientras se envía", async () => {
    let responder!: (r: { ok: true; reservasCanceladas: number }) => void;
    vi.mocked(cancelarClase).mockReturnValue(new Promise((r) => { responder = r; }));
    const modal = abrirCancelacion();
    escribir(modal, "El entrenador no puede asistir");
    fireEvent.click(modal.getByRole("button", { name: "Cancelar clase" }));

    const enviando = await modal.findByRole("button", { name: "Cancelando…" });
    expect((enviando as HTMLButtonElement).disabled).toBe(true);
    expect((modal.getByRole("button", { name: "Volver" }) as HTMLButtonElement).disabled).toBe(true);
    responder({ ok: true, reservasCanceladas: 3 });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("un rechazo del backend se muestra dentro del modal y la clase no cambia", async () => {
    vi.mocked(cancelarClase).mockResolvedValue({ ok: false, error: "La clase ya fue cancelada" });
    const modal = abrirCancelacion();
    escribir(modal, "El entrenador no puede asistir");
    fireEvent.click(modal.getByRole("button", { name: "Cancelar clase" }));

    expect((await modal.findByRole("alert")).textContent).toBe("La clase ya fue cancelada");
    expect(screen.getByRole("dialog", { name: "Cancelar clase" })).toBeTruthy();
    expect(panel().getByText("Programada")).toBeTruthy();
  });

  it("el error del motivo que manda el backend aparece junto al campo", async () => {
    vi.mocked(cancelarClase).mockResolvedValue({ ok: false, error: "El motivo debe tener entre 10 y 250 caracteres", campo: "motivo" });
    const modal = abrirCancelacion();
    escribir(modal, "Motivo válido para el cliente");
    fireEvent.click(modal.getByRole("button", { name: "Cancelar clase" }));

    await waitFor(() => expect(modal.getByLabelText("Motivo de la cancelación").getAttribute("aria-invalid")).toBe("true"));
    expect(modal.queryByRole("alert")).toBeNull();
  });

  it("Volver cierra sin cancelar", () => {
    const modal = abrirCancelacion();
    fireEvent.click(modal.getByRole("button", { name: "Volver" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(cancelarClase).not.toHaveBeenCalled();
  });
});
