import type { CSSProperties } from "react";
import { formatoHora, partesLocales } from "@/lib/fechas";
import type { Bloque, Clase } from "./tipos";

interface EventoBase {
    id: string;
    fecha: string;
    inicio: number;
    fin: number;
}

export type Evento =
    | (EventoBase & { tipo: "bloque"; bloque: Bloque })
    | (EventoBase & { tipo: "clase"; clase: Clase });

export function aEventos(bloques: Bloque[], clases: Clase[]): Evento[] {
    const eventos: Evento[] = [
        ...bloques.map((bloque): Evento => {
            const { fecha, minutos } = partesLocales(bloque.inicio);
            return { tipo: "bloque", id: bloque.id, fecha, inicio: minutos, fin: minutos + bloque.duracionMin, bloque };
        }),
        ...clases.map((clase): Evento => {
            const inicio = partesLocales(clase.inicio);
            const fin = partesLocales(clase.fin);
            return {
                tipo: "clase",
                id: clase.id,
                fecha: inicio.fecha,
                inicio: inicio.minutos,
                fin: fin.fecha === inicio.fecha ? fin.minutos : 24 * 60,
                clase,
            };
        }),
    ];
    return eventos.sort((a, b) => a.inicio - b.inicio);
}

interface Props {
    evento: Evento;
    onEliminar: (bloque: Bloque) => void;
    deshabilitado: boolean;
    className?: string;
    style?: CSSProperties;
}

export function TarjetaEvento({ evento, onEliminar, deshabilitado, className = "", style }: Props) {
    const horario = `${formatoHora(evento.inicio)}–${formatoHora(evento.fin)}`;
    const base = `rounded-md text-white ${className}`;

    if (evento.tipo === "clase") {
        return (
            <div className={`${base} bg-zinc-400 dark:bg-zinc-600`} style={style}>
                <p className="font-medium">Clase: {evento.clase.nombre}</p>
                <p>{horario}</p>
            </div>
        );
    }

    const { bloque } = evento;
    if (bloque.estado === "OCUPADO") {
        return (
            <div className={`${base} bg-blue-600`} style={style}>
                <p className="font-medium">Ocupado{bloque.miembro ? ` · ${bloque.miembro.nombre}` : ""}</p>
                <p>{horario}</p>
            </div>
        );
    }

    return (
        <div className={`${base} flex items-start justify-between gap-1 bg-emerald-600`} style={style}>
            <div>
                <p className="font-medium">Disponible</p>
                <p>{horario}</p>
            </div>
            <button
                type="button"
                onClick={() => onEliminar(bloque)}
                disabled={deshabilitado}
                className="shrink-0 rounded bg-white/20 px-1.5 py-0.5 hover:bg-white/30 disabled:opacity-50"
            >
                Eliminar
            </button>
        </div>
    );
}