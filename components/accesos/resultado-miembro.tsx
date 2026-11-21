'use client';

import { useState } from 'react';
import { botonPrimarioCss, botonSecundarioCss, campoCss } from '@/components/clases/estilos';
import {
    ALERTA_ROJA,
    COLOR_ALERTA,
    MOTIVO_MAX,
    MOTIVO_MIN,
    diasHasta,
    nivelAlerta,
    textoVencimiento,
} from '@/lib/accesos';
import { ETIQUETA_ESTADO_MEMBRESIA, formatearFecha, type MiembroEncontrado } from '@/lib/membresias';

interface Props {
    miembro: MiembroEncontrado;
    /** Id del registro DENTRO de hoy, si el miembro ya está dentro. */
    registroDentro?: string;
    hoy: string;
    /** Id que se está enviando (miembro o registro); desactiva los botones. */
    enviando: string | null;
    onIngreso: (miembroId: string, motivoExcepcion?: string) => void;
    onSalida: (registroId: string) => void;
}

/**
 * FE-11.1 · Un resultado de la búsqueda con el estado de su membresía:
 * verde Vigente, amarillo Próxima a vencer ("Vence en n días") y rojo Vencida,
 * Pendiente de pago o Sin membresía. En rojo, el ingreso normal queda
 * bloqueado y solo se puede entrar con un motivo de excepción de 10 a 250
 * caracteres.
 */
export function ResultadoMiembro({ miembro, registroDentro, hoy, enviando, onIngreso, onSalida }: Props) {
    const [abierto, setAbierto] = useState(false);
    const [motivo, setMotivo] = useState('');

    const nivel = nivelAlerta(miembro.estadoMembresia);
    const ocupado = enviando !== null;
    const largo = motivo.trim().length;
    const motivoListo = largo >= MOTIVO_MIN && largo <= MOTIVO_MAX;
    const vence = miembro.fechaVencimiento;
    const idMotivo = `motivo-${miembro.id}`;

    function cancelar() {
        setAbierto(false);
        setMotivo('');
    }

    function confirmar(evento: React.FormEvent) {
        evento.preventDefault();
        if (motivoListo) onIngreso(miembro.id, motivo.trim());
    }

    let boton: React.ReactNode;
    if (registroDentro) {
        boton = (
            <button type="button" onClick={() => onSalida(registroDentro)} disabled={ocupado} className={botonSecundarioCss}>
                {enviando === registroDentro ? 'Registrando…' : 'Registrar salida'}
            </button>
        );
    } else if (nivel === 'rojo') {
        boton = (
            <button type="button" onClick={() => setAbierto(true)} disabled={ocupado || abierto} className={botonPrimarioCss}>
                Registrar ingreso con excepción
            </button>
        );
    } else {
        boton = (
            <button type="button" onClick={() => onIngreso(miembro.id)} disabled={ocupado} className={botonPrimarioCss}>
                {enviando === miembro.id ? 'Registrando…' : 'Registrar ingreso'}
            </button>
        );
    }

    return (
        <li className="flex flex-col gap-3 rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                    <p className="font-medium">
                        {miembro.nombre} {miembro.apellido}
                    </p>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                        {miembro.codigo} · {miembro.documento}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${COLOR_ALERTA[nivel]}`}>
                            {ETIQUETA_ESTADO_MEMBRESIA[miembro.estadoMembresia]}
                        </span>
                        {vence && (
                            <span className="text-xs text-zinc-600 dark:text-zinc-400">Vence el {formatearFecha(vence)}</span>
                        )}
                    </div>
                </div>
                {boton}
            </div>

            {nivel === 'amarillo' && vence && (
                <p className="rounded-md bg-yellow-50 px-3 py-2 text-sm text-yellow-900 dark:bg-yellow-950/40 dark:text-yellow-200">
                    {textoVencimiento(diasHasta(vence, hoy), formatearFecha(vence))}
                </p>
            )}

            {nivel === 'rojo' && !registroDentro && (
                <p
                    role="alert"
                    className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
                >
                    {ALERTA_ROJA[miembro.estadoMembresia]}
                </p>
            )}

            {abierto && !registroDentro && (
                <form onSubmit={confirmar} className="flex flex-col gap-2">
                    <label htmlFor={idMotivo} className="text-sm font-medium">
                        Motivo de excepción
                    </label>
                    <textarea
                        id={idMotivo}
                        value={motivo}
                        onChange={(e) => setMotivo(e.target.value)}
                        maxLength={MOTIVO_MAX}
                        rows={3}
                        autoFocus
                        aria-describedby={`${idMotivo}-contador`}
                        className={`${campoCss} mt-0`}
                        placeholder="Ej.: Pagará la renovación mañana en recepción"
                    />
                    <p
                        id={`${idMotivo}-contador`}
                        className={`text-xs ${largo > 0 && largo < MOTIVO_MIN ? 'text-red-600 dark:text-red-400' : 'text-zinc-500'}`}
                    >
                        {largo}/{MOTIVO_MAX} · mínimo {MOTIVO_MIN} caracteres
                    </p>
                    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                        <button type="button" onClick={cancelar} disabled={ocupado} className={botonSecundarioCss}>
                            Cancelar
                        </button>
                        <button type="submit" disabled={!motivoListo || ocupado} className={botonPrimarioCss}>
                            {enviando === miembro.id ? 'Registrando…' : 'Confirmar ingreso con excepción'}
                        </button>
                    </div>
                </form>
            )}
        </li>
    );
}