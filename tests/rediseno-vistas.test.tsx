import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ClasesDeLaSemana } from "@/components/reservas/clases-semana";
import { MiMembresiaVista, avancePeriodo } from "@/components/membresias/mi-membresia";
import { ESTILO_DISPONIBILIDAD, colorDeTipo, nivelDisponibilidad } from "@/lib/estilo-clases";
import type { MiMembresia } from "@/lib/membresias";
import type { ClaseReservable, MiReserva } from "@/lib/reservas";

vi.mock("@/app/actions/reservas", () => ({
  listarClasesReservables: vi.fn(),
  reservarClase: vi.fn(),
  listarMisReservas: vi.fn(),
  cancelarReserva: vi.fn(),
}));

afterEach(() => {
  vi.useRealTimers();
  cleanup();
  vi.resetAllMocks();
});

describe("lib/estilo-clases", () => {
  it("disponibilidad por cupo: verde ≥ 60 % libre, amarillo ≥ 25 %, rojo con menos y gris sin lugares", () => {
    expect(nivelDisponibilidad(10, 10)).toBe("verde");
    expect(nivelDisponibilidad(6, 10)).toBe("verde");
    expect(nivelDisponibilidad(5, 10)).toBe("amarillo");
    expect(nivelDisponibilidad(5, 20)).toBe("amarillo");
    expect(nivelDisponibilidad(4, 20)).toBe("rojo");
    expect(nivelDisponibilidad(1, 5)).toBe("rojo");
    expect(nivelDisponibilidad(0, 12)).toBe("gris");
  });

  it("sin el cupo máximo usa cantidades fijas", () => {
    expect(nivelDisponibilidad(0)).toBe("gris");
    expect(nivelDisponibilidad(3)).toBe("rojo");
    expect(nivelDisponibilidad(6)).toBe("amarillo");
    expect(nivelDisponibilidad(7)).toBe("verde");
  });

  it("los colores de los tipos nunca usan los tonos de la disponibilidad", () => {
    const tonosDisponibilidad = /emerald|amber|red-|zinc/;
    for (const nombre of ["Yoga", "Spinning", "Crossfit", "Box", "Pilates", "Zumba", "Funcional"]) {
      const color = colorDeTipo({ id: `id-${nombre}`, nombre });
      expect(color.chip).not.toMatch(tonosDisponibilidad);
      expect(color.bloque).not.toMatch(tonosDisponibilidad);
    }
    expect(Object.values(ESTILO_DISPONIBILIDAD).map((e) => e.texto)).toEqual(["Disponible", "Se está llenando", "Quedan pocos", "Llena"]);
  });

  it("cada tipo del seed tiene su color fijo y otro tipo siempre recibe el mismo", () => {
    expect(colorDeTipo({ id: "x", nombre: "Yoga" }).chip).toContain("fuchsia");
    expect(colorDeTipo({ id: "y", nombre: "Crossfit" }).chip).toContain("indigo");
    expect(colorDeTipo({ id: "abc", nombre: "Pilates" })).toBe(colorDeTipo({ id: "abc", nombre: "Pilates" }));
  });
});

describe("Clases de la semana (rediseño)", () => {
  // Miércoles 18/11/2026, 04:00 en El Salvador.
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-18T10:00:00.000Z"));
  });

  const clase = (id: string, nombre: string, inicio: string, libres: number, cupo: number, yaReservada = false): ClaseReservable => ({
    id, tipo: { id: `t-${nombre}`, nombre }, entrenador: { id: "e1", nombre: "Carlos Martínez" },
    inicio, fin: new Date(new Date(inicio).getTime() + 3_600_000).toISOString(),
    cupoMaximo: cupo, lugaresDisponibles: libres, yaReservada,
  });
  // Miércoles 18: Yoga 07:00 (10 de 10 libres) y Spinning 18:00 (2 de 20). Jueves 19: Crossfit 06:00 (llena).
  const DATOS = [
    clase("a", "Yoga", "2026-11-18T13:00:00.000Z", 10, 10),
    clase("b", "Spinning", "2026-11-19T00:00:00.000Z", 2, 20, true),
    clase("c", "Crossfit", "2026-11-19T12:00:00.000Z", 0, 12),
  ];
  const pantalla = (creditos: { disponibles: number; totales: number } | null = null) =>
    render(<ClasesDeLaSemana inicial={{ ok: true, datos: DATOS }} creditos={creditos} />);

  it("la tira de días marca hoy, desactiva los días pasados y cuenta las clases de cada día", () => {
    pantalla();
    const dias = within(screen.getByRole("group", { name: "Días de la semana" }));
    const hoy = dias.getByRole("button", { name: /18 de noviembre, 2 clases/ });
    expect(hoy.getAttribute("aria-pressed")).toBe("true");
    expect((dias.getByRole("button", { name: /16 de noviembre, pasado/ }) as HTMLButtonElement).disabled).toBe(true);
    expect(dias.getByRole("button", { name: /19 de noviembre, 1 clase/ })).toBeTruthy();
    expect(dias.getByRole("button", { name: /22 de noviembre, sin clases/ })).toBeTruthy();
  });

  it("el día elegido se destaca y las clases de los demás días siguen a la vista", () => {
    pantalla();
    const miercoles = screen.getByRole("region", { name: /18 de noviembre/ });
    expect(miercoles.getAttribute("aria-current")).toBe("date");
    expect(within(miercoles).getByText("Día seleccionado")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /19 de noviembre, 1 clase/ }));

    const jueves = screen.getByRole("region", { name: /19 de noviembre/ });
    expect(jueves.getAttribute("aria-current")).toBe("date");
    expect(within(jueves).getByText("Día seleccionado")).toBeTruthy();
    expect(screen.getByRole("region", { name: /18 de noviembre/ }).getAttribute("aria-current")).toBeNull();
    expect(screen.getAllByText("Día seleccionado")).toHaveLength(1);
    expect(screen.getByRole("button", { name: /^Yoga/ })).toBeTruthy();
  });

  it("cada tarjeta dice qué tan disponible está según su cupo", () => {
    pantalla();
    expect(within(screen.getByRole("button", { name: /^Yoga/ })).getByText("Disponible")).toBeTruthy();
    const spinning = within(screen.getByRole("button", { name: /^Spinning/ }));
    expect(spinning.getByText("Quedan pocos")).toBeTruthy();
    expect(spinning.getByText("Reservada")).toBeTruthy();
    const crossfit = within(screen.getByRole("button", { name: /^Crossfit/ }));
    expect(crossfit.getByText("Llena")).toBeTruthy();
    expect(crossfit.getByText("12 de 12 ocupados")).toBeTruthy();
  });

  it("muestra los créditos del set cuando el plan los tiene", () => {
    pantalla({ disponibles: 6, totales: 8 });
    expect(screen.getByText("Te quedan").parentElement?.textContent).toContain("6de 8 clases");
  });
});

describe("Mi membresía (rediseño)", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-20T17:00:00.000Z"));
  });

  const SET: MiMembresia = {
    estado: "VIGENTE", membresiaId: "m1", plan: "Set 8 clases (prueba)", tipoPlan: "SET_CLASES",
    fechaInicio: "2026-11-11", fechaVencimiento: "2026-12-10", diasRestantes: 20,
    creditosTotales: 8, creditosDisponibles: 6, tiposClaseIds: ["t1", "t2"], renovacion: null,
  };
  const reserva = (id: string, nombre: string, estado: MiReserva["estado"]): MiReserva => ({
    id, estado, creadaEn: "2026-11-19T15:00:00.000Z",
    clase: { id: `c-${id}`, tipo: { id: "t1", nombre }, entrenador: { id: "e", nombre: "Ana Hernández" },
      inicio: "2026-11-20T19:00:00.000Z", fin: "2026-11-20T20:00:00.000Z", estado: "PROGRAMADA" },
  });
  const TIPOS = [{ id: "t1", nombre: "Yoga" }, { id: "t2", nombre: "Spinning" }];

  it("avancePeriodo: día de hoy dentro de la cobertura, con inicio y vencimiento incluidos", () => {
    expect(avancePeriodo("2026-11-11", "2026-12-10", "2026-11-20")).toEqual({ dia: 10, total: 30, porcentaje: 33 });
    expect(avancePeriodo("2026-11-25", "2026-12-24", "2026-11-20").dia).toBe(0);
    expect(avancePeriodo("2026-10-01", "2026-10-30", "2026-11-20").dia).toBe(30);
  });

  it("plan, estado, días restantes, período, créditos, renovación, tipos incluidos y próximas clases", () => {
    render(<MiMembresiaVista membresia={SET} tiposIncluidos={TIPOS}
      proximas={[reserva("r1", "Yoga", "CONFIRMADA"), reserva("r2", "Pilates", "CANCELADA_MIEMBRO")]} />);

    expect(screen.getByRole("heading", { name: "Set 8 clases (prueba)" })).toBeTruthy();
    expect(screen.getByText("Vigente")).toBeTruthy();
    expect(screen.getByText("20 días restantes")).toBeTruthy();
    expect(screen.getByText("Día 10 de 30")).toBeTruthy();
    expect(screen.getByText("11/11/2026")).toBeTruthy();
    expect(screen.getByText("10/12/2026")).toBeTruthy();

    const creditos = screen.getByRole("progressbar", { name: "Créditos de clases disponibles" });
    expect(creditos.getAttribute("aria-valuenow")).toBe("6");
    expect(creditos.children).toHaveLength(8);
    expect(screen.getByText("6 de 8 clases disponibles")).toBeTruthy();

    expect(screen.getByText("Podrás pagarla desde el 10/12/2026")).toBeTruthy();
    const incluye = within(screen.getByRole("region", { name: "Incluye" }));
    expect(incluye.getByText("Yoga")).toBeTruthy();
    expect(incluye.getByText("Spinning")).toBeTruthy();

    const proximas = within(screen.getByRole("region", { name: "Tus próximas clases" }));
    expect(proximas.getByText("Yoga")).toBeTruthy();
    expect(proximas.queryByText("Pilates")).toBeNull();
    expect(screen.getByRole("link", { name: "Reservar una clase" })).toBeTruthy();
  });

  it("sin membresía muestra el mensaje de H3 y nada más", () => {
    render(<MiMembresiaVista membresia={{ ...SET, estado: "SIN_MEMBRESIA", plan: null, tipoPlan: null }} />);
    expect(screen.getByText("No tienes una membresía. Acércate a recepción para adquirir un plan.")).toBeTruthy();
    expect(screen.queryByRole("link", { name: "Mis pagos" })).toBeNull();
  });

  it("vencida: aviso en rojo y sin botón para reservar", () => {
    render(<MiMembresiaVista membresia={{ ...SET, estado: "VENCIDA", fechaVencimiento: "2026-11-15", diasRestantes: null }} />);
    expect(screen.getByRole("alert").textContent).toBe("Tu membresía venció el 15/11/2026");
    expect(screen.queryByRole("link", { name: "Reservar una clase" })).toBeNull();
  });

  it("pendiente de pago: enlace a Mis pagos y fechas que se definen al pagar", () => {
    render(<MiMembresiaVista membresia={{ ...SET, estado: "PENDIENTE_PAGO", fechaInicio: null, fechaVencimiento: null, diasRestantes: null }} />);
    expect(screen.getByText("Tu compra está pendiente de pago.", { exact: false })).toBeTruthy();
    expect(screen.getByText("Las fechas se definen al pagar.")).toBeTruthy();
  });

  it("próxima a vencer con renovación pendiente: bloque de renovación con enlace a Mis pagos", () => {
    render(<MiMembresiaVista membresia={{ ...SET, estado: "PROXIMA_A_VENCER", diasRestantes: 2,
      renovacion: { estado: "PENDIENTE_PAGO", fechaInicio: "2026-12-11" } }} />);
    const renovacion = within(screen.getByRole("region", { name: "Renovación" }));
    expect(renovacion.getByText("Renovación pendiente de pago")).toBeTruthy();
    expect(renovacion.getByRole("link", { name: "Ir a Mis pagos" })).toBeTruthy();
  });
});
