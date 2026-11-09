export const ZONA_HORARIA = "America/El_Salvador";

const DESFASE = "-06:00";

const fechaUtc = (fecha: string) => new Date(`${fecha}T00:00:00Z`);
const formatoUtc = (opciones: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat("es-SV", { ...opciones, timeZone: "UTC" });

export function hoyLocal(ahora: Date = new Date()): string {
    return new Intl.DateTimeFormat("en-CA", {
        timeZone: ZONA_HORARIA,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).format(ahora);
}

export function sumarDias(fecha: string, dias: number): string {
    const f = fechaUtc(fecha);
    f.setUTCDate(f.getUTCDate() + dias);
    return f.toISOString().slice(0, 10);
}

export function lunesDe(fecha: string): string {
    const diaSemana = fechaUtc(fecha).getUTCDay(); // 0 = domingo
    return sumarDias(fecha, -((diaSemana + 6) % 7));
}

export function aInstante(fecha: string, hora: string): Date {
    return new Date(`${fecha}T${hora}:00${DESFASE}`);
}
export function partesLocales(iso: string): { fecha: string; minutos: number } {
    const partes = new Intl.DateTimeFormat("en-CA", {
        timeZone: ZONA_HORARIA,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
    }).formatToParts(new Date(iso));
    const valor = (tipo: string) => partes.find((p) => p.type === tipo)?.value ?? "00";
    return {
        fecha: `${valor("year")}-${valor("month")}-${valor("day")}`,
        minutos: Number(valor("hour")) * 60 + Number(valor("minute")),
    };
}

export function formatoHora(minutos: number): string {
    const h = String(Math.floor(minutos / 60)).padStart(2, "0");
    const m = String(minutos % 60).padStart(2, "0");
    return `${h}:${m}`;
}

export function nombreDiaCorto(fecha: string): string {
    return formatoUtc({ weekday: "short", day: "numeric" }).format(fechaUtc(fecha));
}

export function nombreDiaLargo(fecha: string): string {
    return formatoUtc({ weekday: "long", day: "numeric", month: "long" }).format(fechaUtc(fecha));
}

export function rangoCorto(lunes: string): string {
    const f = formatoUtc({ day: "numeric", month: "short" });
    return `${f.format(fechaUtc(lunes))} – ${f.format(fechaUtc(sumarDias(lunes, 6)))}`;
}