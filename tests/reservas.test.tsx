import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ClasesDeLaSemana } from "@/components/reservas/clases-semana";
import { MisReservas } from "@/components/reservas/mis-reservas";
import { cancelarReserva, listarClasesReservables, listarMisReservas, reservarClase } from "@/app/actions/reservas";
import {
  agruparPorDia, lunesDeSemana, preguntaCancelacion, puedeCancelar, textoLugares, type ClaseReservable, type MiReserva,
} from "@/lib/reservas";

vi.mock("@/app/actions/reservas", () => ({
  listarClasesReservables: vi.fn(),
  reservarClase: vi.fn(),
  listarMisReservas: vi.fn(),
  cancelarReserva: vi.fn(),
}));

afterEach(() => { cleanup(); vi.resetAllMocks(); });

// Miércoles 18/11/2026: Yoga 07:00 y Spinning 18:00; jueves 19/11: Crossfit 06:00 (llena).
const YOGA: ClaseReservable = {
  id: "11111111-1111-1111-1111-111111111111", tipo: { id: "t1", nombre: "Yoga" },
  entrenador: { id: "e1", nombre: "Carlos Martínez" },
  inicio: "2026-11-18T13:00:00.000Z", fin: "2026-11-18T14:00:00.000Z", lugaresDisponibles: 5, yaReservada: false,
};
const SPINNING: ClaseReservable = {
  ...YOGA, id: "22222222-2222-2222-2222-222222222222", tipo: { id: "t2", nombre: "Spinning" },
  inicio: "2026-11-19T00:00:00.000Z", fin: "2026-11-19T01:00:00.000Z", lugaresDisponibles: 1, yaReservada: true,
};
const CROSSFIT: ClaseReservable = {
  ...YOGA, id: "33333333-3333-3333-3333-333333333333", tipo: { id: "t3", nombre: "Crossfit" },
  inicio: "2026-11-19T12:00:00.000Z", fin: "2026-11-19T13:00:00.000Z", lugaresDisponibles: 0,
};
const lista = (...datos: ClaseReservable[]) => ({ ok: true as const, datos });

describe("lib/reservas", () => {
  it("agrupa por día en hora de El Salvador y ordena por hora", () => {
    // Spinning es el 19 a las 00:00 UTC, pero el 18 a las 18:00 en El Salvador.
    const dias = agruparPorDia([CROSSFIT, SPINNING, YOGA]);
    expect(dias.map((d) => [d.fecha, d.clases.map((c) => c.tipo.nombre)])).toEqual([
      ["2026-11-18", ["Yoga", "Spinning"]],
      ["2026-11-19", ["Crossfit"]],
    ]);
  });

  it("textoLugares usa singular y plural", () => {
    expect(textoLugares(1)).toBe("1 lugar disponible");
    expect(textoLugares(5)).toBe("5 lugares disponibles");
  });

  it("lunesDeSemana: la actual y la siguiente", () => {
    const martes = new Date("2026-11-17T15:00:00Z");
    expect(lunesDeSemana("actual", martes)).toBe("2026-11-16");
    expect(lunesDeSemana("siguiente", martes)).toBe("2026-11-23");
  });
});

describe("FE-5.1 Clases de la semana", () => {
  it("muestra las clases agrupadas por día con lugares y las etiquetas Reservada y Llena", () => {
    render(<ClasesDeLaSemana inicial={lista(YOGA, SPINNING, CROSSFIT)} />);

    const miercoles = screen.getByRole("region", { name: /18 de noviembre/i });
    expect(within(miercoles).getByText("Yoga")).toBeTruthy();
    expect(within(miercoles).getByText("5 lugares disponibles")).toBeTruthy();
    expect(within(miercoles).getByText("Reservada")).toBeTruthy();
    const jueves = screen.getByRole("region", { name: /19 de noviembre/i });
    expect(within(jueves).getByText("Llena")).toBeTruthy();
  });

  it("estado vacío", () => {
    render(<ClasesDeLaSemana inicial={lista()} />);
    expect(screen.getByText("No hay clases programadas para esta semana")).toBeTruthy();
  });

  it("error con Reintentar vuelve a pedir la semana", async () => {
    vi.mocked(listarClasesReservables).mockResolvedValue(lista(YOGA));
    render(<ClasesDeLaSemana inicial={{ ok: false, error: "No se pudo conectar con el servidor." }} />);
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(await screen.findByText("Yoga")).toBeTruthy();
    expect(listarClasesReservables).toHaveBeenCalledWith("actual");
  });

  it("la pestaña Semana siguiente consulta esa semana", async () => {
    vi.mocked(listarClasesReservables).mockResolvedValue(lista(CROSSFIT));
    render(<ClasesDeLaSemana inicial={lista(YOGA)} />);
    fireEvent.click(screen.getByRole("tab", { name: "Semana siguiente" }));
    expect(await screen.findByText("Crossfit")).toBeTruthy();
    expect(listarClasesReservables).toHaveBeenCalledWith("siguiente");
  });

  it("detalle y reserva: confirma, muestra el aviso y la tarjeta pasa a Reservada", async () => {
    vi.mocked(reservarClase).mockResolvedValue({ ok: true, id: "r1", lugaresDisponibles: 4 });
    render(<ClasesDeLaSemana inicial={lista(YOGA)} />);

    fireEvent.click(screen.getByRole("button", { name: /Yoga/ }));
    const modal = within(screen.getByRole("dialog"));
    expect(modal.getByText("Carlos Martínez")).toBeTruthy();
    expect(modal.getByText("07:00 – 08:00")).toBeTruthy();
    fireEvent.click(modal.getByRole("button", { name: "Reservar" }));

    expect(await screen.findByText("Reserva confirmada")).toBeTruthy();
    expect(reservarClase).toHaveBeenCalledWith(YOGA.id);
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByText("Reservada")).toBeTruthy();
    expect(screen.getByText("4 lugares disponibles")).toBeTruthy();
  });

  it("muestra el motivo de rechazo del backend dentro del detalle", async () => {
    vi.mocked(reservarClase).mockResolvedValue({ ok: false, error: "Tu plan no incluye este tipo de clase" });
    render(<ClasesDeLaSemana inicial={lista(YOGA)} />);
    fireEvent.click(screen.getByRole("button", { name: /Yoga/ }));
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Reservar" }));
    expect((await screen.findByRole("alert")).textContent).toBe("Tu plan no incluye este tipo de clase");
    expect(listarClasesReservables).not.toHaveBeenCalled();
  });

  it('si otro miembro tomó el último lugar ("La clase está llena") recarga la lista', async () => {
    vi.mocked(reservarClase).mockResolvedValue({ ok: false, error: "La clase está llena" });
    vi.mocked(listarClasesReservables).mockResolvedValue(lista({ ...YOGA, lugaresDisponibles: 0 }));
    render(<ClasesDeLaSemana inicial={lista(YOGA)} />);
    fireEvent.click(screen.getByRole("button", { name: /Yoga/ }));
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Reservar" }));
    await waitFor(() => expect(listarClasesReservables).toHaveBeenCalledWith("actual"));
  });

  it("una clase llena no se puede reservar y una ya reservada no muestra el botón", () => {
    render(<ClasesDeLaSemana inicial={lista(CROSSFIT, SPINNING)} />);
    fireEvent.click(screen.getByRole("button", { name: /Crossfit/ }));
    expect((within(screen.getByRole("dialog")).getByRole("button", { name: "Llena" }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(within(screen.getByRole("dialog")).getAllByRole("button", { name: "Cerrar" })[0]);

    fireEvent.click(screen.getByRole("button", { name: /Spinning/ }));
    const modal = within(screen.getByRole("dialog"));
    expect(modal.getByText("Ya reservaste esta clase")).toBeTruthy();
    expect(modal.queryByRole("button", { name: "Reservar" })).toBeNull();
  });
});

describe("FE-5.2 Mis reservas", () => {
  const reserva = (estado: MiReserva["estado"], nombre: string): MiReserva => ({
    id: `r-${nombre}`, estado, creadaEn: "2026-11-17T15:00:00.000Z",
    clase: { id: "c", tipo: { id: "t", nombre }, entrenador: { id: "e", nombre: "Ana Hernández" },
      inicio: "2026-11-18T13:00:00.000Z", fin: "2026-11-18T14:00:00.000Z", estado: "PROGRAMADA" },
  });

  it("muestra tipo, fecha, horario, entrenador y la etiqueta de cada estado", () => {
    render(<MisReservas inicial={{ ok: true, datos: [
      reserva("CONFIRMADA", "Yoga"), reserva("CANCELADA_MIEMBRO", "Pilates"), reserva("CANCELADA_GIMNASIO", "Box"),
    ] }} />);
    expect(screen.getByText("Confirmada")).toBeTruthy();
    expect(screen.getByText("Cancelada por el miembro")).toBeTruthy();
    expect(screen.getByText("Cancelada por el gimnasio")).toBeTruthy();
    expect(screen.getAllByText(/07:00 – 08:00/)).toHaveLength(3);
    expect(screen.getAllByText("Ana Hernández")).toHaveLength(3);
  });

  it("la pestaña Pasadas consulta la API y muestra el vacío", async () => {
    vi.mocked(listarMisReservas).mockResolvedValue({ ok: true, datos: [] });
    render(<MisReservas inicial={{ ok: true, datos: [reserva("CONFIRMADA", "Yoga")] }} />);
    fireEvent.click(screen.getByRole("tab", { name: "Pasadas" }));
    expect(await screen.findByText("No tienes reservas")).toBeTruthy();
    expect(listarMisReservas).toHaveBeenCalledWith("pasadas");
  });
});

describe("FE-6.1 Cancelación desde Mis reservas", () => {
  // Miércoles 18/11/2026, 04:00 en El Salvador. Yoga empieza a las 07:00 (3 horas después).
  const AHORA = new Date("2026-11-18T10:00:00.000Z");
  const reserva = ({
    id = "44444444-4444-4444-4444-444444444444",
    nombre = "Yoga",
    inicio = "2026-11-18T13:00:00.000Z",
    estado = "CONFIRMADA",
  }: { id?: string; nombre?: string; inicio?: string; estado?: MiReserva["estado"] } = {}): MiReserva => ({
    id, estado, creadaEn: "2026-11-17T15:00:00.000Z",
    clase: { id: "c", tipo: { id: "t", nombre }, entrenador: { id: "e", nombre: "Ana Hernández" },
      inicio, fin: new Date(new Date(inicio).getTime() + 3_600_000).toISOString(), estado: "PROGRAMADA" },
  });
  const conMinutos = (minutos: number) => new Date(AHORA.getTime() + minutos * 60_000).toISOString();

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(AHORA);
  });
  afterEach(() => vi.useRealTimers());

  it("puedeCancelar: 3 horas y 2 horas exactas sí; 1 hora 59 minutos, ya iniciada o cancelada no", () => {
    expect(puedeCancelar(reserva({ inicio: conMinutos(180) }), AHORA)).toBe(true);
    expect(puedeCancelar(reserva({ inicio: conMinutos(120) }), AHORA)).toBe(true);
    expect(puedeCancelar(reserva({ inicio: conMinutos(119) }), AHORA)).toBe(false);
    expect(puedeCancelar(reserva({ inicio: conMinutos(-10) }), AHORA)).toBe(false);
    expect(puedeCancelar(reserva({ estado: "CANCELADA_MIEMBRO" }), AHORA)).toBe(false);
    expect(puedeCancelar(reserva({ estado: "CANCELADA_GIMNASIO" }), AHORA)).toBe(false);
  });

  it("la pregunta usa la fecha y la hora de El Salvador", () => {
    expect(preguntaCancelacion(reserva())).toBe("¿Cancelar tu reserva de Yoga del 18/11/2026 a las 07:00?");
  });

  it("el botón Cancelar solo aparece en las confirmadas que empiezan en 2 horas o más", () => {
    render(<MisReservas inicial={{ ok: true, datos: [
      reserva({ id: "a", nombre: "Yoga" }),
      reserva({ id: "b", nombre: "Spinning", inicio: conMinutos(119) }),
      reserva({ id: "c", nombre: "Pilates", estado: "CANCELADA_MIEMBRO" }),
    ] }} />);

    expect(screen.getByRole("button", { name: "Cancelar la reserva de Yoga" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Cancelar la reserva de Spinning" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Cancelar la reserva de Pilates" })).toBeNull();
  });

  it("confirma, muestra \"Reserva cancelada\" y la etiqueta cambia sin recargar la lista", async () => {
    vi.mocked(cancelarReserva).mockResolvedValue({ ok: true, lugaresDisponibles: 4 });
    render(<MisReservas inicial={{ ok: true, datos: [reserva()] }} />);

    fireEvent.click(screen.getByRole("button", { name: "Cancelar la reserva de Yoga" }));
    const modal = within(screen.getByRole("dialog", { name: "Cancelar reserva" }));
    expect(modal.getByText("¿Cancelar tu reserva de Yoga del 18/11/2026 a las 07:00?")).toBeTruthy();
    fireEvent.click(modal.getByRole("button", { name: "Cancelar reserva" }));

    expect((await screen.findByRole("status")).textContent).toContain("Reserva cancelada");
    expect(cancelarReserva).toHaveBeenCalledWith("44444444-4444-4444-4444-444444444444");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByText("Cancelada por el miembro")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Cancelar la reserva de Yoga" })).toBeNull();
    expect(listarMisReservas).not.toHaveBeenCalled();
  });

  it("el botón se desactiva mientras se envía", async () => {
    let responder!: (r: { ok: true; lugaresDisponibles: number }) => void;
    vi.mocked(cancelarReserva).mockReturnValue(new Promise((r) => { responder = r; }));
    render(<MisReservas inicial={{ ok: true, datos: [reserva()] }} />);

    fireEvent.click(screen.getByRole("button", { name: "Cancelar la reserva de Yoga" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancelar reserva" }));

    const enviando = await screen.findByRole("button", { name: "Cancelando…" });
    expect((enviando as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole("button", { name: "Volver" }) as HTMLButtonElement).disabled).toBe(true);
    responder({ ok: true, lugaresDisponibles: 4 });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("muestra el mensaje del backend y recarga la lista si ya no está en plazo", async () => {
    const motivo = "Solo puedes cancelar hasta 2 horas antes del inicio de la clase";
    vi.mocked(cancelarReserva).mockResolvedValue({ ok: false, error: motivo });
    vi.mocked(listarMisReservas).mockResolvedValue({ ok: true, datos: [reserva()] });
    render(<MisReservas inicial={{ ok: true, datos: [reserva()] }} />);

    fireEvent.click(screen.getByRole("button", { name: "Cancelar la reserva de Yoga" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancelar reserva" }));

    const modal = within(screen.getByRole("dialog", { name: "Cancelar reserva" }));
    expect((await modal.findByRole("alert")).textContent).toBe(motivo);
    await waitFor(() => expect(listarMisReservas).toHaveBeenCalledWith("proximas"));
  });

  it("Volver cierra la confirmación sin cancelar", () => {
    render(<MisReservas inicial={{ ok: true, datos: [reserva()] }} />);
    fireEvent.click(screen.getByRole("button", { name: "Cancelar la reserva de Yoga" }));
    fireEvent.click(screen.getByRole("button", { name: "Volver" }));

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(cancelarReserva).not.toHaveBeenCalled();
    expect(screen.getByText("Confirmada")).toBeTruthy();
  });
});
