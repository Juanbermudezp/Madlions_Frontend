'use client';

import Link from 'next/link';
import { useCallback, useRef, useState, useTransition } from 'react';
import { agendarSesion, listarBloques } from '@/app/actions/sesiones';
import { botonPrimarioCss, botonSecundarioCss } from '@/components/clases/estilos';
import { Modal } from '@/components/clases/modal';
import { Notificacion } from '@/components/clases/notificacion';
import {
    MENSAJES_SESIONES,
    RUTA_MIS_PAGOS,
    agruparPorDia,
    diaLocal,
    horaLocal,
    nombreDia,
    type BloqueLibre,
    type BloquesEntrenador,
    type Entrenador,
} from '@/lib/sesiones';

/**
 * FE-9.1 · El miembro elige entrenador, ve sus bloques libres de los próximos
 * 14 días agrupados por día, revisa el resumen con el precio y confirma.
 */
export function AgendarSesion({ entrenadores }: { entrenadores: Entrenador[] }) {
    const [entrenadorId, setEntrenadorId] = useState<string | null>(null);
    const [datos, setDatos] = useState<BloquesEntrenador | null>(null);
    const [bloque, setBloque] = useState<BloqueLibre | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [errorResumen, setErrorResumen] = useState<string | null>(null);
    const [exito, setExito] = useState<number | null>(null);
    const [cargando, iniciarCarga] = useTransition();
    const [enviando, iniciarEnvio] = useTransition();
    // Entrenador elegido en este momento: descarta respuestas de uno anterior.
    const entrenadorActual = useRef<string | null>(null);

    const entrenador = entrenadores.find((e) => e.id === entrenadorId) ?? null;
    const cerrarExito = useCallback(() => setExito(null), []);

    function cargarBloques(id: string) {
        iniciarCarga(async () => {
            const resultado = await listarBloques(id);
            if (entrenadorActual.current !== id) return;
            if (resultado.ok) {
                setDatos(resultado.datos);
            } else {
                setDatos(null);
                setError(resultado.error);
            }
        });
    }

    function elegirEntrenador(id: string) {
        entrenadorActual.current = id;
        setEntrenadorId(id);
        setDatos(null);
        setBloque(null);
        setError(null);
        cargarBloques(id);
    }

    function elegirBloque(elegido: BloqueLibre) {
        setErrorResumen(null);
        setBloque(elegido);
    }

    function confirmar() {
        if (!bloque || !entrenadorId) return;
        const id = entrenadorId;
        iniciarEnvio(async () => {
            const resultado = await agendarSesion(bloque.id);
            if (resultado.ok) {
                setBloque(null);
                setError(null);
                setExito(Date.now());
                cargarBloques(id);
                return;
            }
            if (resultado.estado === 409) {
                // El bloque se ocupó o no cumple una regla: se cierra el resumen,
                // se muestra el motivo y se recargan los bloques.
                setBloque(null);
                setError(resultado.error);
                cargarBloques(id);
                return;
            }
            setErrorResumen(resultado.error);
        });
    }

    if (entrenadores.length === 0) {
        return <p className="text-sm text-zinc-600 dark:text-zinc-400">{MENSAJES_SESIONES.sinEntrenadores}</p>;
    }

    const grupos = datos ? agruparPorDia(datos.bloques) : [];

    return (
        <div className="grid gap-6 md:grid-cols-[16rem_1fr]">
            {exito !== null && (
                <Notificacion key={exito} mensaje={MENSAJES_SESIONES.exito} onCerrar={cerrarExito} />
            )}

            <section aria-labelledby="titulo-entrenadores">
                <h2 id="titulo-entrenadores" className="mb-2 text-sm font-medium text-zinc-600 dark:text-zinc-400">
                    Entrenadores
                </h2>
                <ul className="flex flex-col gap-2">
                    {entrenadores.map((e) => {
                        const activo = e.id === entrenadorId;
                        return (
                            <li key={e.id}>
                                <button
                                    type="button"
                                    onClick={() => elegirEntrenador(e.id)}
                                    aria-pressed={activo}
                                    className={`w-full rounded-md border px-3 py-2 text-left text-sm transition-colors ${activo
                                            ? 'border-zinc-900 bg-zinc-900 font-medium text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900'
                                            : 'border-zinc-300 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800'
                                        }`}
                                >
                                    {e.nombre}
                                </button>
                            </li>
                        );
                    })}
                </ul>
            </section>

            <section aria-labelledby="titulo-horarios" aria-busy={cargando} className="min-w-0">
                <h2 id="titulo-horarios" className="mb-2 text-sm font-medium text-zinc-600 dark:text-zinc-400">
                    {entrenador ? `Horarios de ${entrenador.nombre}` : 'Horarios disponibles'}
                </h2>

                {error && (
                    <p
                        role="alert"
                        className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
                    >
                        {error}
                    </p>
                )}

                {!entrenador && (
                    <p className="text-sm text-zinc-500">Elige un entrenador para ver sus horarios.</p>
                )}

                {entrenador && cargando && !datos && (
                    <div className="flex flex-col gap-2" aria-live="polite">
                        <p className="text-sm text-zinc-500">Cargando horarios…</p>
                        <div className="h-24 animate-pulse rounded-md bg-zinc-100 dark:bg-zinc-800" />
                    </div>
                )}

                {datos && grupos.length === 0 && (
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">{MENSAJES_SESIONES.sinBloques}</p>
                )}

                {grupos.length > 0 && (
                    <div className="flex flex-col gap-5">
                        {grupos.map((grupo) => (
                            <div key={grupo.dia}>
                                <h3 className="mb-2 font-medium first-letter:uppercase">{nombreDia(grupo.dia)}</h3>
                                <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                                    {grupo.bloques.map((b) => (
                                        <li key={b.id}>
                                            <button
                                                type="button"
                                                onClick={() => elegirBloque(b)}
                                                disabled={enviando}
                                                className="w-full rounded-md border border-emerald-600 px-3 py-2 text-left text-sm transition-colors hover:bg-emerald-50 disabled:opacity-60 dark:hover:bg-emerald-950/40"
                                            >
                                                <span className="block font-medium">{horaLocal(b.inicio)}</span>
                                                <span className="block text-xs text-zinc-600 dark:text-zinc-400">{b.duracionMin} min</span>
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            <Modal
                titulo="Confirmar sesión"
                abierto={bloque !== null && entrenador !== null && datos !== null}
                bloqueado={enviando}
                onCerrar={() => setBloque(null)}
            >
                {bloque && entrenador && datos && (
                    <div className="flex flex-col gap-4">
                        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
                            <dt className="text-zinc-500">Entrenador</dt>
                            <dd className="font-medium">{entrenador.nombre}</dd>
                            <dt className="text-zinc-500">Fecha</dt>
                            <dd className="font-medium first-letter:uppercase">{nombreDia(diaLocal(bloque.inicio))}</dd>
                            <dt className="text-zinc-500">Hora</dt>
                            <dd className="font-medium">
                                {horaLocal(bloque.inicio)} – {horaLocal(bloque.fin)}
                            </dd>
                            <dt className="text-zinc-500">Duración</dt>
                            <dd className="font-medium">{bloque.duracionMin} minutos</dd>
                            <dt className="text-zinc-500">Precio</dt>
                            <dd className="font-medium">${datos.precioClasePuntual}</dd>
                        </dl>

                        <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                            {MENSAJES_SESIONES.aviso(datos.precioClasePuntual)}{' '}
                            <Link href={RUTA_MIS_PAGOS} className="underline">
                                Ver Mis pagos
                            </Link>
                        </p>

                        {errorResumen && (
                            <p role="alert" className="text-sm text-red-600 dark:text-red-400">
                                {errorResumen}
                            </p>
                        )}

                        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                            <button type="button" onClick={() => setBloque(null)} disabled={enviando} className={botonSecundarioCss}>
                                Cancelar
                            </button>
                            <button type="button" onClick={confirmar} disabled={enviando} className={botonPrimarioCss}>
                                {enviando ? 'Agendando…' : 'Confirmar'}
                            </button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}