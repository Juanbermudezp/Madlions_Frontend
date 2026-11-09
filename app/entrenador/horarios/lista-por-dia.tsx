import { nombreDiaLargo } from "@/lib/fechas";
import { TarjetaEvento, type Evento } from "./tarjeta-evento";
import type { Bloque } from "./tipos";

interface Props {
    dias: string[];
    hoy: string;
    eventosDe: (fecha: string) => Evento[];
    horaSugerida: (fecha: string) => number | null;
    onAgregar: (fecha: string, minutos: number) => void;
    onEliminar: (bloque: Bloque) => void;
    deshabilitado: boolean;
}

export function ListaPorDia({ dias, hoy, eventosDe, horaSugerida, onAgregar, onEliminar, deshabilitado }: Props) {
    return (
        <div className="space-y-5 sm:hidden">
            {dias.map((fecha) => {
                const eventos = eventosDe(fecha);
                const sugerida = horaSugerida(fecha);
                return (
                    <section key={fecha}>
                        <div className="mb-2 flex items-center justify-between gap-2">
                            <h3
                                className={`font-medium first-letter:uppercase ${fecha === hoy ? "text-emerald-700 dark:text-emerald-400" : ""
                                    }`}
                            >
                                {nombreDiaLargo(fecha)}
                            </h3>
                            {sugerida !== null && (
                                <button
                                    type="button"
                                    onClick={() => onAgregar(fecha, sugerida)}
                                    disabled={deshabilitado}
                                    className="rounded-md border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700"
                                >
                                    + Agregar bloque
                                </button>
                            )}
                        </div>
                        {eventos.length === 0 ? (
                            <p className="text-sm text-zinc-500">Sin actividades</p>
                        ) : (
                            <ul className="space-y-2">
                                {eventos.map((evento) => (
                                    <li key={evento.id}>
                                        <TarjetaEvento
                                            evento={evento}
                                            onEliminar={onEliminar}
                                            deshabilitado={deshabilitado}
                                            className="p-3 text-sm"
                                        />
                                    </li>
                                ))}
                            </ul>
                        )}
                    </section>
                );
            })}
        </div>
    );
}