import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BandejaAvisos } from "@/components/avisos/bandeja-avisos";
import { InsigniaAvisos } from "@/components/avisos/campana-avisos";
import { ContadorAvisos } from "@/components/avisos/contador-avisos";
import { Menu } from "@/components/menu";
import { MENU_POR_ROL } from "@/lib/roles";
import { abrirAviso, contarAvisosNoLeidos, listarMisAvisos, marcarTodosLeidos } from "@/app/actions/avisos";
import {
  ETIQUETA_MODULO, fechaHoraAviso, INTERVALO_CONTADOR_MS, textoContador, totalPaginas,
  type AvisoResumen, type PaginaAvisos,
} from "@/lib/avisos";
import { useSesion } from "@/stores/sesion";

vi.mock("next/navigation", () => ({ usePathname: () => "/miembro/avisos" }));

vi.mock("@/app/actions/avisos", () => ({
  listarMisAvisos: vi.fn(),
  abrirAviso: vi.fn(),
  contarAvisosNoLeidos: vi.fn(),
  marcarTodosLeidos: vi.fn(),
}));

const MIEMBRO = { id: "u1", correo: "miembro@madlions.com", nombre: "María", apellido: "López", rol: "MIEMBRO" as const };

const CANCELADA: AvisoResumen = {
  id: "11111111-1111-4111-8111-111111111111", titulo: "Clase cancelada: Yoga",
  moduloOrigen: "CLASES", creadoEn: "2026-11-20T21:30:00.000Z", estado: "NO_LEIDO",
};
const VENCE: AvisoResumen = {
  id: "22222222-2222-4222-8222-222222222222", titulo: "Tu membresía vence pronto",
  moduloOrigen: "MEMBRESIAS", creadoEn: "2026-11-20T12:00:00.000Z", estado: "NO_LEIDO",
};
const CONFIRMADA: AvisoResumen = {
  id: "33333333-3333-4333-8333-333333333333", titulo: "Reserva confirmada: Spinning",
  moduloOrigen: "CLASES", creadoEn: "2026-11-18T15:15:00.000Z", estado: "LEIDO",
};

const pagina = (items: AvisoResumen[], total = items.length, numero = 1): { ok: true; datos: PaginaAvisos } => ({
  ok: true, datos: { items, total, pagina: numero },
});
const fila = (titulo: string) => screen.getByRole("button", { name: new RegExp(titulo) }).closest("tr")!;

beforeEach(() => {
  useSesion.setState({ usuario: MIEMBRO, avisosNoLeidos: 2 });
  vi.mocked(contarAvisosNoLeidos).mockResolvedValue({ ok: true, noLeidos: 2 });
});
afterEach(() => { cleanup(); vi.resetAllMocks(); vi.useRealTimers(); });

describe("lib/avisos", () => {
  it("la fecha se muestra dd/mm/aaaa hh:mm en hora de El Salvador", () => {
    expect(fechaHoraAviso("2026-11-20T21:30:00.000Z")).toBe("20/11/2026 15:30");
    // 03:00 UTC del 21 todavía es el 20 en El Salvador.
    expect(fechaHoraAviso("2026-11-21T03:00:00.000Z")).toBe("20/11/2026 21:00");
  });

  it("el contador se oculta en 0 y muestra 99+ desde 100", () => {
    expect(textoContador(0)).toBe("");
    expect(textoContador(5)).toBe("5");
    expect(textoContador(99)).toBe("99");
    expect(textoContador(100)).toBe("99+");
    expect(textoContador(120)).toBe("99+");
  });

  it("páginas de 20 en 20, al menos una", () => {
    expect(totalPaginas(0)).toBe(1);
    expect(totalPaginas(20)).toBe(1);
    expect(totalPaginas(25)).toBe(2);
  });

  it("los módulos se muestran en español", () => {
    expect(Object.values(ETIQUETA_MODULO)).toEqual(["Membresías", "Clases", "Sesiones", "Pagos"]);
  });
});

describe("FE-23.1 Mis avisos", () => {
  it("muestra título, módulo y fecha, con los no leídos en negrita", () => {
    render(<BandejaAvisos inicial={pagina([CANCELADA, VENCE, CONFIRMADA])} />);

    const cancelada = fila("Clase cancelada: Yoga");
    expect(within(cancelada).getByText("Clases")).toBeTruthy();
    expect(within(cancelada).getByText("20/11/2026 15:30")).toBeTruthy();
    expect(cancelada.className).toContain("font-semibold");
    expect(within(cancelada).getByText("(sin leer)")).toBeTruthy();

    // El módulo va con su ícono (FE-23.1).
    expect(cancelada.querySelector('svg[data-modulo="CLASES"]')).not.toBeNull();
    expect(fila("Tu membresía vence pronto").querySelector('svg[data-modulo="MEMBRESIAS"]')).not.toBeNull();

    const confirmada = fila("Reserva confirmada: Spinning");
    expect(confirmada.className).not.toContain("font-semibold");
    expect(within(fila("Tu membresía vence pronto")).getByText("Membresías")).toBeTruthy();
  });

  it("abrir un aviso muestra el mensaje completo, lo deja leído y baja el contador sin recargar", async () => {
    vi.mocked(abrirAviso).mockResolvedValue({
      ok: true,
      datos: { ...CANCELADA, estado: "LEIDO", mensaje: "La clase de Yoga fue cancelada por el gimnasio.", leidoEn: "2026-11-20T22:00:00.000Z" },
    });
    render(<BandejaAvisos inicial={pagina([CANCELADA, VENCE])} />);

    fireEvent.click(screen.getByRole("button", { name: /Clase cancelada: Yoga/ }));

    const dialogo = await screen.findByRole("dialog");
    expect(await within(dialogo).findByText("La clase de Yoga fue cancelada por el gimnasio.")).toBeTruthy();
    expect(abrirAviso).toHaveBeenCalledWith(CANCELADA.id);
    expect(fila("Clase cancelada: Yoga").dataset.estado).toBe("LEIDO");
    expect(useSesion.getState().avisosNoLeidos).toBe(1);
    expect(listarMisAvisos).not.toHaveBeenCalled();
  });

  it("abrir un aviso ya leído no cambia el contador", async () => {
    vi.mocked(abrirAviso).mockResolvedValue({
      ok: true, datos: { ...CONFIRMADA, mensaje: "Tu reserva quedó confirmada.", leidoEn: "2026-11-19T10:00:00.000Z" },
    });
    render(<BandejaAvisos inicial={pagina([CONFIRMADA])} />);

    fireEvent.click(screen.getByRole("button", { name: /Reserva confirmada/ }));

    expect(await screen.findByText("Tu reserva quedó confirmada.")).toBeTruthy();
    expect(useSesion.getState().avisosNoLeidos).toBe(2);
  });

  it("si el backend rechaza el aviso, el panel muestra el motivo", async () => {
    vi.mocked(abrirAviso).mockResolvedValue({ ok: false, error: "No tienes permiso para ver este recurso." });
    render(<BandejaAvisos inicial={pagina([CANCELADA])} />);

    fireEvent.click(screen.getByRole("button", { name: /Clase cancelada/ }));

    expect((await screen.findByRole("alert")).textContent).toBe("No tienes permiso para ver este recurso.");
    expect(fila("Clase cancelada: Yoga").dataset.estado).toBe("NO_LEIDO");
  });

  it("marcar todos como leídos quita las negritas y deja el contador en 0", async () => {
    vi.mocked(marcarTodosLeidos).mockResolvedValue({ ok: true, actualizados: 2 });
    render(<BandejaAvisos inicial={pagina([CANCELADA, VENCE, CONFIRMADA])} />);

    fireEvent.click(screen.getByRole("button", { name: "Marcar todos como leídos" }));

    expect(await screen.findByText("Todos tus avisos quedaron como leídos")).toBeTruthy();
    for (const titulo of ["Clase cancelada: Yoga", "Tu membresía vence pronto", "Reserva confirmada: Spinning"]) {
      expect(fila(titulo).dataset.estado).toBe("LEIDO");
    }
    expect(useSesion.getState().avisosNoLeidos).toBe(0);
  });

  it("bandeja vacía: \"No tienes avisos\"", () => {
    render(<BandejaAvisos inicial={pagina([])} />);
    expect(screen.getByText("No tienes avisos")).toBeTruthy();
  });

  it("el filtro No leídos pide la página 1 solo con avisos sin leer", async () => {
    vi.mocked(listarMisAvisos).mockResolvedValue(pagina([]));
    render(<BandejaAvisos inicial={pagina([CANCELADA, CONFIRMADA])} />);

    fireEvent.click(screen.getByRole("tab", { name: "No leídos" }));

    expect(await screen.findByText("No tienes avisos sin leer")).toBeTruthy();
    expect(listarMisAvisos).toHaveBeenCalledWith(1, "no-leidos");
    expect(screen.getByRole("tab", { name: "No leídos" }).getAttribute("aria-selected")).toBe("true");
  });

  it("pagina de 20 en 20 con Anterior y Siguiente", async () => {
    vi.mocked(listarMisAvisos).mockResolvedValue(pagina([CONFIRMADA], 25, 2));
    render(<BandejaAvisos inicial={pagina([CANCELADA], 25)} />);

    expect(screen.getByText("Página 1 de 2")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Siguiente" }));

    expect(await screen.findByText("Página 2 de 2")).toBeTruthy();
    expect(listarMisAvisos).toHaveBeenCalledWith(2, "todos");
    expect((screen.getByRole("button", { name: "Siguiente" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("error al cargar: mensaje y Reintentar vuelve a pedir la lista", async () => {
    vi.mocked(listarMisAvisos).mockResolvedValue(pagina([VENCE]));
    render(<BandejaAvisos inicial={{ ok: false, error: "No se pudo conectar con el servidor." }} />);

    expect(screen.getByText(/No se pudieron cargar tus avisos/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));

    expect(await screen.findByText("Tu membresía vence pronto")).toBeTruthy();
    expect(listarMisAvisos).toHaveBeenCalledWith(1, "todos");
  });

  it("Actualizar vuelve a pedir la página y sincroniza el contador", async () => {
    vi.mocked(listarMisAvisos).mockResolvedValue(pagina([CANCELADA, VENCE]));
    vi.mocked(contarAvisosNoLeidos).mockResolvedValue({ ok: true, noLeidos: 7 });
    render(<BandejaAvisos inicial={pagina([CONFIRMADA])} />);

    fireEvent.click(screen.getByRole("button", { name: "Actualizar" }));

    expect(await screen.findByText("Clase cancelada: Yoga")).toBeTruthy();
    expect(useSesion.getState().avisosNoLeidos).toBe(7);
  });
});

describe("FE-23.2 Contador de avisos", () => {
  it("el menú del miembro muestra Avisos con la campana y la insignia", () => {
    useSesion.setState({ avisosNoLeidos: 3 });
    render(<Menu opciones={MENU_POR_ROL.MIEMBRO} />);

    const avisos = screen.getByRole("link", { name: /Avisos/ });
    expect(avisos.getAttribute("href")).toBe("/miembro/avisos");
    expect(avisos.querySelector("svg")).not.toBeNull();
    expect(within(avisos).getByText("3")).toBeTruthy();
    expect(avisos.getAttribute("aria-current")).toBe("page");
  });

  it("la insignia se oculta en 0 y muestra 99+ con más de 99", () => {
    useSesion.setState({ avisosNoLeidos: 0 });
    const { container, rerender } = render(<InsigniaAvisos />);
    expect(container.textContent).toBe("");

    act(() => useSesion.setState({ avisosNoLeidos: 120 }));
    rerender(<InsigniaAvisos />);
    expect(container.textContent).toBe("99+ sin leer");
  });

  it("consulta el contador al cargar y cada 30 segundos", async () => {
    vi.useFakeTimers();
    vi.mocked(contarAvisosNoLeidos).mockResolvedValueOnce({ ok: true, noLeidos: 3 }).mockResolvedValue({ ok: true, noLeidos: 4 });
    render(<ContadorAvisos />);

    await act(async () => { await Promise.resolve(); });
    expect(contarAvisosNoLeidos).toHaveBeenCalledTimes(1);
    expect(useSesion.getState().avisosNoLeidos).toBe(3);

    await act(async () => { await vi.advanceTimersByTimeAsync(INTERVALO_CONTADOR_MS); });
    expect(contarAvisosNoLeidos).toHaveBeenCalledTimes(2);
    expect(useSesion.getState().avisosNoLeidos).toBe(4);
  });

  it("se detiene al cerrar sesión", async () => {
    vi.useFakeTimers();
    render(<ContadorAvisos />);
    await act(async () => { await Promise.resolve(); });
    expect(contarAvisosNoLeidos).toHaveBeenCalledTimes(1);

    act(() => useSesion.getState().limpiar());
    await act(async () => { await vi.advanceTimersByTimeAsync(INTERVALO_CONTADOR_MS * 3); });

    expect(contarAvisosNoLeidos).toHaveBeenCalledTimes(1);
  });

  it("si la consulta falla conserva el último valor", async () => {
    vi.mocked(contarAvisosNoLeidos).mockResolvedValue({ ok: false, error: "Tu sesión expiró." });
    render(<ContadorAvisos />);
    await waitFor(() => expect(contarAvisosNoLeidos).toHaveBeenCalled());
    expect(useSesion.getState().avisosNoLeidos).toBe(2);
  });

  it("no consulta nada si el usuario no es miembro", async () => {
    useSesion.setState({ usuario: { ...MIEMBRO, rol: "ENTRENADOR" } });
    render(<ContadorAvisos />);
    await act(async () => { await Promise.resolve(); });
    expect(contarAvisosNoLeidos).not.toHaveBeenCalled();
  });
});
