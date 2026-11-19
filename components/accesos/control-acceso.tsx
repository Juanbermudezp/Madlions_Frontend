'use client';

import { useCallback, useEffect, useState, useTransition } from 'react';
import { listarAccesosHoy, registrarIngreso, registrarSalida } from '@/app/actions/accesos';
import { buscarMiembros } from '@/app/actions/membresias';
import { botonPrimarioCss, botonSecundarioCss, campoCss } from '@/components/clases/estilos';
import { Notificacion } from '@/components/clases/notificacion';
import {
    COLOR_ESTADO_ACCESO,
    ETIQUETA_ESTADO_ACCESO,
    MENSAJES_ACCESO,
    REFRESCO_MS,
    horaLocal,
    type AccesoDelDia,
    type EstadoAcceso,
} from '@/lib/accesos';
import {
    COLOR_ESTADO_MEMBRESIA,
    ETIQUETA_ESTADO_MEMBRESIA,
    SIN_RESULTADOS,
    type MiembroEncontrado,
} from '@/lib/membresias';

/**
 * FE-10.1 · Control de acceso de recepción: buscador de miembros con su
 * estado de membresía (H11), botones de ingreso y salida, y la lista del día
 * que se refresca cada 30 segundos o con "Actualizar".
 */
export function ControlAcceso({ inicial }: { inicial: AccesoDelDia[] }) {
    const [accesos, setAccesos] = useState(inicial);
    const [texto, setTexto] = useState('');
    const [resultados, setResultados] = useState<MiembroEncontrado[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [exito, setExito] = useState<{ clave: number; mensaje: string } | null>(null);
    // Id del miembro o del registro que se está enviando: desactiva los botones.
    const [enviando, setEnviando] = useState<string | null>(null);
    const [buscando, iniciarBusqueda] = useTransition();
    const [actualizando, iniciarActualizacion] = useTransition();
    const [, iniciarEnvio] = useTransition();

    const cerrarExito = useCallback(() => setExito(null), []);

    const recargar = useCallback(() => {
        iniciarActualizacion(async () => {
            const resultado = await listarAccesosHoy();
            if (resultado.ok) setAccesos(resultado.datos);
            else setError(resultado.error);
        });
    }, []);

    // Los registros hechos por otro usuario de recepción aparecen cada 30 s.
    useEffect(() => {
        const intervalo = setInterval(recargar, REFRESCO_MS);
        return () => clearInterval(intervalo);
    }, [recargar]);

    // Código de miembro → registro DENTRO de hoy (para mostrar "Registrar salida").
    const dentroPorCodigo = new Map(
        accesos.filter((a) => a.estado === 'DENTRO').map((a) => [a.miembro.codigo, a.id]),
    );

    function buscar(evento: React.FormEvent) {
        evento.preventDefault();
        setError(null);
        iniciarBusqueda(async () => {
            const resultado = await buscarMiembros(texto);
            if (resultado.ok) {
                setResultados(resultado.datos);
            } else {
                setResultados(null);
                setError(resultado.error);
            }
        });
    }

    function enviar(id: string, accion: () => Promise<{ ok: boolean; error?: string }>, mensaje: string) {
        setEnviando(id);
        setError(null);
        iniciarEnvio(async () => {
            const resultado = await accion();
            setEnviando(null);
            if (resultado.ok) setExito({ clave: Date.now(), mensaje });
            else setError(resultado.error ?? 'Ocurrió un error.');
            recargar();
        });
    }

    const ingreso = (miembroId: string) =>
        enviar(miembroId, () => registrarIngreso(miembroId), MENSAJES_ACCESO.ingreso);
    const salida = (registroId: string) =>
        enviar(registroId, () => registrarSalida(registroId), MENSAJES_ACCESO.salida);

    const ocupado = enviando !== null;

    return (
        <div className="flex flex-col gap-8">
            {exito && <Notificacion key={exito.clave} mensaje={exito.mensaje} onCerrar={cerrarExito} />}

            <section aria-labelledby="titulo-busqueda" className="flex flex-col gap-3">
                <h2 id="titulo-busqueda" className="text-lg font-semibold">
                    Buscar miembro
                </h2>
                <form onSubmit={buscar} className="flex flex-col gap-2 sm:flex-row">
                    <label className="sr-only" htmlFor="busqueda-miembro">
                        Nombre, documento o código de miembro
                    </label>
                    <input
                        id="busqueda-miembro"
                        value={texto}
                        onChange={(e) => setTexto(e.target.value)}
                        placeholder="Nombre, documento o código (MBR-000001)"
                        className={`${campoCss} mt-0 sm:flex-1`}
                        autoComplete="off"
                    />
                    <button type="submit" disabled={buscando} className={botonPrimarioCss}>
                        {buscando ? 'Buscando…' : 'Buscar'}
                    </button>
                </form>

                {error && (
                    <p
                        role="alert"
                        className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
                    >
                        {error}
                    </p>
                )}

                {resultados?.length === 0 && <p className="text-sm text-zinc-500">{SIN_RESULTADOS}</p>}

                {resultados && resultados.length > 0 && (
                    <ul className="flex flex-col gap-2">
                        {resultados.map((miembro) => {
                            const registroDentro = dentroPorCodigo.get(miembro.codigo);
                            return (
                                <li
                                    key={miembro.id}
                                    className="flex flex-col gap-3 rounded-lg border border-zinc-200 p-3 sm:flex-row sm:items-center sm:justify-between dark:border-zinc-800"
                                >
                                    <div className="min-w-0">
                                        <p className="font-medium">
                                            {miembro.nombre} {miembro.apellido}
                                        </p>
                                        <p className="text-sm text-zinc-600 dark:text-zinc-400">
                                            {miembro.codigo} · {miembro.documento}
                                        </p>
                                        <span
                                            className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${COLOR_ESTADO_MEMBRESIA[miembro.estadoMembresia]}`}
                                        >
                                            {ETIQUETA_ESTADO_MEMBRESIA[miembro.estadoMembresia]}
                                        </span>
                                    </div>
                                    {registroDentro ? (
                                        <button
                                            type="button"
                                            onClick={() => salida(registroDentro)}
                                            disabled={ocupado}
                                            className={botonSecundarioCss}
                                        >
                                            {enviando === registroDentro ? 'Registrando…' : 'Registrar salida'}
                                        </button>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => ingreso(miembro.id)}
                                            disabled={ocupado}
                                            className={botonPrimarioCss}
                                        >
                                            {enviando === miembro.id ? 'Registrando…' : 'Registrar ingreso'}
                                        </button>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                )}
            </section>

            <section aria-labelledby="titulo-dia" aria-busy={actualizando} className="flex flex-col gap-3">
                <div className="flex items-center justify-between gap-3">
                    <h2 id="titulo-dia" className="text-lg font-semibold">
                        Ingresos de hoy
                    </h2>
                    <button type="button" onClick={recargar} disabled={actualizando} className={botonSecundarioCss}>
                        {actualizando ? 'Actualizando…' : 'Actualizar'}
                    </button>
                </div>

                {accesos.length === 0 ? (
                    <p className="text-sm text-zinc-500">{MENSAJES_ACCESO.vacio}</p>
                ) : (
                    <>
                        {/* Tablet y escritorio: tabla */}
                        <div className="hidden overflow-x-auto rounded-lg border border-zinc-200 sm:block dark:border-zinc-800">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-zinc-50 text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
                                    <tr>
                                        <th className="px-3 py-2 font-medium">Nombre</th>
                                        <th className="px-3 py-2 font-medium">Código</th>
                                        <th className="px-3 py-2 font-medium">Ingreso</th>
                                        <th className="px-3 py-2 font-medium">Salida</th>
                                        <th className="px-3 py-2 font-medium">Estado</th>
                                        <th className="px-3 py-2 font-medium">
                                            <span className="sr-only">Acción</span>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {accesos.map((a) => (
                                        <tr key={a.id} className="border-t border-zinc-200 dark:border-zinc-800">
                                            <td className="px-3 py-2">{a.miembro.nombre}</td>
                                            <td className="px-3 py-2">{a.miembro.codigo}</td>
                                            <td className="px-3 py-2">{horaLocal(a.ingresoEn)}</td>
                                            <td className="px-3 py-2">{a.salidaEn ? horaLocal(a.salidaEn) : '—'}</td>
                                            <td className="px-3 py-2">
                                                <EtiquetaAcceso estado={a.estado} />
                                            </td>
                                            <td className="px-3 py-2 text-right">
                                                {a.estado === 'DENTRO' && (
                                                    <button
                                                        type="button"
                                                        onClick={() => salida(a.id)}
                                                        disabled={ocupado}
                                                        className={botonSecundarioCss}
                                                    >
                                                        {enviando === a.id ? 'Registrando…' : 'Registrar salida'}
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Móvil: tarjetas */}
                        <ul className="flex flex-col gap-2 sm:hidden">
                            {accesos.map((a) => (
                                <li key={a.id} className="flex flex-col gap-2 rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
                                    <div className="flex items-start justify-between gap-2">
                                        <div>
                                            <p className="font-medium">{a.miembro.nombre}</p>
                                            <p className="text-sm text-zinc-600 dark:text-zinc-400">{a.miembro.codigo}</p>
                                        </div>
                                        <EtiquetaAcceso estado={a.estado} />
                                    </div>
                                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                                        Ingreso {horaLocal(a.ingresoEn)} · Salida {a.salidaEn ? horaLocal(a.salidaEn) : '—'}
                                    </p>
                                    {a.estado === 'DENTRO' && (
                                        <button
                                            type="button"
                                            onClick={() => salida(a.id)}
                                            disabled={ocupado}
                                            className={botonSecundarioCss}
                                        >
                                            {enviando === a.id ? 'Registrando…' : 'Registrar salida'}
                                        </button>
                                    )}
                                </li>
                            ))}
                        </ul>
                    </>
                )}
            </section>
        </div>
    );
}

function EtiquetaAcceso({ estado }: { estado: EstadoAcceso }) {
    return (
        <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${COLOR_ESTADO_ACCESO[estado]}`}>
            {ETIQUETA_ESTADO_ACCESO[estado]}
        </span>
    );
}