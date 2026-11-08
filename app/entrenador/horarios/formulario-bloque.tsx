"use client";

import { useState } from "react";
import type { DatosBloque } from "./tipos";

const DURACIONES = [45, 60, 90];

interface Props {
    inicial: DatosBloque;
    minFecha: string;
    maxFecha: string;
    enviando: boolean;
    error: string | null;
    onGuardar: (datos: DatosBloque) => void;
    onCancelar: () => void;
}

export function FormularioBloque({ inicial, minFecha, maxFecha, enviando, error, onGuardar, onCancelar }: Props) {
    const [datos, setDatos] = useState(inicial);
    const campo =
        "mt-1 w-full rounded-md border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700";

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-bloque"
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
        >
            <form
                noValidate
                onSubmit={(e) => {
                    e.preventDefault();
                    onGuardar(datos);
                }}
                className="w-full max-w-sm space-y-4 rounded-lg bg-white p-5 shadow-lg dark:bg-zinc-900"
            >
                <h2 id="titulo-bloque" className="text-lg font-semibold">
                    Nuevo bloque
                </h2>

                <label className="block text-sm">
                    Fecha
                    <input
                        type="date"
                        min={minFecha}
                        max={maxFecha}
                        value={datos.fecha}
                        onChange={(e) => setDatos({ ...datos, fecha: e.target.value })}
                        className={campo}
                    />
                </label>

                <label className="block text-sm">
                    Hora de inicio
                    <input
                        type="time"
                        min="05:00"
                        max="21:00"
                        step={900}
                        value={datos.horaInicio}
                        onChange={(e) => setDatos({ ...datos, horaInicio: e.target.value })}
                        className={campo}
                    />
                </label>

                <fieldset className="text-sm">
                    <legend>Duración</legend>
                    <div className="mt-1 flex gap-2">
                        {DURACIONES.map((duracion) => (
                            <label
                                key={duracion}
                                className={`flex-1 cursor-pointer rounded-md border px-3 py-2 text-center ${datos.duracionMin === duracion
                                        ? "border-emerald-600 bg-emerald-600 text-white"
                                        : "border-zinc-300 dark:border-zinc-700"
                                    }`}
                            >
                                <input
                                    type="radio"
                                    name="duracion"
                                    value={duracion}
                                    checked={datos.duracionMin === duracion}
                                    onChange={() => setDatos({ ...datos, duracionMin: duracion })}
                                    className="sr-only"
                                />
                                {duracion} min
                            </label>
                        ))}
                    </div>
                </fieldset>

                {error && (
                    <p role="alert" className="text-sm text-red-600 dark:text-red-400">
                        {error}
                    </p>
                )}

                <div className="flex justify-end gap-2">
                    <button
                        type="button"
                        onClick={onCancelar}
                        className="rounded-md border border-zinc-300 px-4 py-2 text-sm dark:border-zinc-700"
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        disabled={enviando}
                        className="rounded-md bg-emerald-600 px-4 py-2 text-sm text-white disabled:opacity-60"
                    >
                        {enviando ? "Guardando…" : "Guardar"}
                    </button>
                </div>
            </form>
        </div>
    );
}