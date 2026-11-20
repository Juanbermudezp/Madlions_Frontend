'use client';

import { useState } from 'react';
import { botonPrimarioCss, botonSecundarioCss, campoCss } from '@/components/clases/estilos';
import { DURACIONES, type DatosBloque } from '@/lib/horarios';

interface Props {
    inicial: DatosBloque;
    minFecha: string;
    maxFecha: string;
    enviando: boolean;
    error: string | null;
    onGuardar: (datos: DatosBloque) => void;
    onCancelar: () => void;
}

/** Formulario de un bloque nuevo. Va dentro del Modal del equipo. */
export function FormularioBloque({ inicial, minFecha, maxFecha, enviando, error, onGuardar, onCancelar }: Props) {
    const [datos, setDatos] = useState(inicial);

    return (
        <form
            noValidate
            onSubmit={(evento) => {
                evento.preventDefault();
                onGuardar(datos);
            }}
            className="space-y-4"
        >
            <label className="block text-sm">
                Fecha
                <input
                    type="date"
                    min={minFecha}
                    max={maxFecha}
                    value={datos.fecha}
                    onChange={(e) => setDatos({ ...datos, fecha: e.target.value })}
                    className={campoCss}
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
                    className={campoCss}
                />
                <span className="mt-1 block text-xs text-zinc-500">Entre 5:00 y 21:00, cada 15 minutos.</span>
            </label>

            <fieldset className="text-sm">
                <legend>Duración</legend>
                <div className="mt-1 flex gap-2">
                    {DURACIONES.map((duracion) => (
                        <label
                            key={duracion}
                            className={`flex-1 cursor-pointer rounded-md border px-3 py-2 text-center ${datos.duracionMin === duracion
                                    ? 'border-emerald-600 bg-emerald-600 text-white'
                                    : 'border-zinc-300 dark:border-zinc-700'
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
                <button type="button" onClick={onCancelar} disabled={enviando} className={botonSecundarioCss}>
                    Cancelar
                </button>
                <button type="submit" disabled={enviando} className={botonPrimarioCss}>
                    {enviando ? 'Guardando…' : 'Guardar'}
                </button>
            </div>
        </form>
    );
}