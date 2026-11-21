'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState, useSyncExternalStore, useTransition } from 'react';
import { crearBloque, eliminarBloque, obtenerSemanaHorarios } from '@/app/actions/horarios';
import { botonSecundarioCss } from '@/components/clases/estilos';
import { Modal } from '@/components/clases/modal';
import { Notificacion } from '@/components/clases/notificacion';
import {
    DIAS_MAXIMOS,
    MENSAJES_HORARIOS,
    PASO,
    PRIMER_MINUTO,
    REFRESCO_MS,
    SEMANAS_ADELANTE,
    ULTIMO_INICIO,
    ULTIMO_MINUTO,
    aEventos,
    aInstante,
    diasDeLaSemana,
    etiquetaDiaCorta,
    etiquetaDiaLarga,
    etiquetaSemana,
    formatoHora,
    hoyLocal,
    lunesDe,
    partesLocales,
    sumarDias,
    type Bloque,
    type DatosBloque,
    type Resultado,
    type SemanaHorarios,
} from '@/lib/horarios';
import { FormularioBloque } from './formulario-bloque';
import { ListaPorDia } from './lista-por-dia';
import { TarjetaEvento } from './tarjeta-evento';

const ALTO_FILA = 12; // px por cada 15 minutos
const FILAS = (ULTIMO_MINUTO - PRIMER_MINUTO) / PASO;
const HORAS = Array.from({ length: 18 }, (_, i) => 5 + i); // 5:00 a 22:00

// Lo que depende de la hora actual solo se pinta en el navegador: así el HTML
// del servidor y el del navegador no difieren (error de hidratación).
const sinSuscripcion = () => () => { };

/** Lunes de la semana `n` contando desde la actual (0 = esta semana). */
const lunesDeSemana = (n: number) => sumarDias(lunesDe(hoyLocal()), n * 7);

/**
 * FE-8.1 · Calendario semanal del entrenador: sus bloques disponibles y
 * ocupados y sus clases grupales. Se agrega un bloque tocando un espacio libre
 * (o "+ Agregar bloque" en el celular) y se elimina un bloque disponible.
 * Se actualiza solo cada 30 segundos y con "Actualizar".
 */
export function CalendarioHorarios({ inicial }: { inicial: Resultado<SemanaHorarios> }) {
    const montado = useSyncExternalStore(sinSuscripcion, () => true, () => false);
    const router = useRouter();

    const [semana, setSemana] = useState(0);
    // null = cargando otra semana.
    const [datos, setDatos] = useState<SemanaHorarios | null>(inicial.ok ? inicial.datos : null);
    const [error, setError] = useState<string | null>(inicial.ok ? null : inicial.error);
    const [aviso, setAviso] = useState<{ texto: string; clave: number } | null>(null);
    const [formulario, setFormulario] = useState<DatosBloque | null>(null);
    const [errorFormulario, setErrorFormulario] = useState<string | null>(null);
    const [porEliminar, setPorEliminar] = useState<Bloque | null>(null);
    const [errorEliminar, setErrorEliminar] = useState<string | null>(null);
    const [cargando, iniciarCarga] = useTransition();
    const [guardando, iniciar] = useTransition();
    const semanaRef = useRef(0);
    // Evita mostrar una respuesta vieja si el entrenador cambió de semana rápido.
    const ultima = useRef(0);

    const cargar = useCallback(
        (n: number, limpiar: boolean) => {
            const consulta = ++ultima.current;
            semanaRef.current = n;
            if (limpiar) setDatos(null);
            iniciarCarga(async () => {
                const resultado = await obtenerSemanaHorarios(lunesDeSemana(n));
                if (consulta !== ultima.current) return;
                if (resultado.ok) {
                    setDatos(resultado.datos);
                    setError(null);
                } else if (resultado.estado === 401) {
                    router.replace('/login');
                } else {
                    setError(resultado.error);
                }
            });
        },
        [router],
    );

    // Las sesiones que agendan los miembros aparecen solas cada 30 segundos.
    useEffect(() => {
        const intervalo = setInterval(() => cargar(semanaRef.current, false), REFRESCO_MS);
        return () => clearInterval(intervalo);
    }, [cargar]);

    const cerrarAviso = useCallback(() => setAviso(null), []);
    const cerrarFormulario = useCallback(() => setFormulario(null), []);
    const cerrarEliminar = useCallback(() => setPorEliminar(null), []);

    if (!montado) {
        return <p className="text-sm text-zinc-500">Cargando calendario…</p>;
    }

    const hoy = hoyLocal();
    const limite = sumarDias(hoy, DIAS_MAXIMOS);
    const lunes = lunesDeSemana(semana);
    const dias = diasDeLaSemana(lunes);
    const eventos = datos ? aEventos(datos) : [];
    const eventosDe = (fecha: string) => eventos.filter((e) => e.fecha === fecha);

    /** Mismas reglas que el backend: hoy a 28 días, 05:00 a 21:00 y todavía no pasa. */
    function puedeIniciar(fecha: string, minutos: number) {
        return (
            fecha >= hoy &&
            fecha <= limite &&
            minutos >= PRIMER_MINUTO &&
            minutos <= ULTIMO_INICIO &&
            aInstante(fecha, formatoHora(minutos)) > new Date()
        );
    }

    /** Hora que propone "+ Agregar bloque" en el celular: 07:00, u hoy el siguiente cuarto de hora. */
    function horaSugerida(fecha: string): number | null {
        let minutos = 7 * 60;
        if (fecha === hoy) {
            const ahora = partesLocales(new Date().toISOString()).minutos;
            minutos = Math.max(PRIMER_MINUTO, Math.ceil((ahora + 1) / PASO) * PASO);
        }
        return puedeIniciar(fecha, minutos) ? minutos : null;
    }

    function cambiarSemana(delta: number) {
        const nueva = semana + delta;
        setSemana(nueva);
        cargar(nueva, true);
    }

    function abrirFormulario(fecha: string, minutos: number) {
        setErrorFormulario(null);
        setFormulario({ fecha, horaInicio: formatoHora(minutos), duracionMin: 60 });
    }

    function guardar(datosBloque: DatosBloque) {
        iniciar(async () => {
            const resultado = await crearBloque(datosBloque);
            if (resultado.ok) {
                setFormulario(null);
                setAviso({ texto: MENSAJES_HORARIOS.registrado, clave: Date.now() });
                cargar(semanaRef.current, false);
            } else if (resultado.estado === 401) {
                router.replace('/login');
            } else {
                setErrorFormulario(resultado.error);
            }
        });
    }

    function pedirEliminar(bloque: Bloque) {
        setErrorEliminar(null);
        setPorEliminar(bloque);
    }

    function confirmarEliminar() {
        if (!porEliminar) return;
        const bloque = porEliminar;
        iniciar(async () => {
            const resultado = await eliminarBloque(bloque.id);
            if (resultado.ok) {
                setPorEliminar(null);
                setDatos((d) => (d ? { ...d, bloques: d.bloques.filter((b) => b.id !== bloque.id) } : d));
                setAviso({ texto: MENSAJES_HORARIOS.eliminado, clave: Date.now() });
            } else if (resultado.estado === 401) {
                router.replace('/login');
            } else {
                // P. ej. 409: un miembro lo agendó mientras tanto. Se recarga para verlo ocupado.
                setErrorEliminar(resultado.error);
                cargar(semanaRef.current, false);
            }
        });
    }

    const descripcionEliminar = porEliminar
        ? (() => {
            const { fecha, minutos } = partesLocales(porEliminar.inicio);
            return `${etiquetaDiaLarga(fecha)} a las ${formatoHora(minutos)} (${porEliminar.duracionMin} min)`;
        })()
        : '';

    return (
        <div className="space-y-4">
            {aviso && <Notificacion key={aviso.clave} mensaje={aviso.texto} onCerrar={cerrarAviso} />}

            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => cambiarSemana(-1)}
                        disabled={semana === 0 || cargando}
                        aria-label="Semana anterior"
                        className={botonSecundarioCss}
                    >
                        ←
                    </button>
                    <span className="min-w-44 text-center text-sm font-medium">{etiquetaSemana(lunes)}</span>
                    <button
                        type="button"
                        onClick={() => cambiarSemana(1)}
                        disabled={semana === SEMANAS_ADELANTE || cargando}
                        aria-label="Semana siguiente"
                        className={botonSecundarioCss}
                    >
                        →
                    </button>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <ul className="flex gap-3 text-xs" aria-label="Leyenda">
                        <li className="flex items-center gap-1">
                            <span className="size-3 rounded-sm bg-emerald-600" /> Disponible
                        </li>
                        <li className="flex items-center gap-1">
                            <span className="size-3 rounded-sm bg-blue-600" /> Ocupado
                        </li>
                        <li className="flex items-center gap-1">
                            <span className="size-3 rounded-sm bg-zinc-500" /> Clase
                        </li>
                    </ul>
                    <button type="button" onClick={() => cargar(semana, false)} disabled={cargando} className={botonSecundarioCss}>
                        {cargando ? 'Actualizando…' : 'Actualizar'}
                    </button>
                </div>
            </div>

            {error && (
                <div role="alert" className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
                    <span>{error}</span>
                    <button type="button" onClick={() => cargar(semana, !datos)} disabled={cargando} className="underline">
                        Reintentar
                    </button>
                </div>
            )}

            {!datos ? (
                !error && (
                    <div className="h-96 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-800" aria-busy="true" aria-label="Cargando semana" />
                )
            ) : (
                <>
                    <div className="hidden overflow-x-auto rounded-lg border border-zinc-200 sm:block dark:border-zinc-800">
                        <div className="grid min-w-[44rem] grid-cols-[3.5rem_repeat(7,minmax(0,1fr))]">
                            <div className="border-b border-zinc-200 dark:border-zinc-800" />
                            {dias.map((fecha) => (
                                <div
                                    key={fecha}
                                    className={`border-b border-l border-zinc-200 px-1 py-2 text-center text-sm first-letter:uppercase dark:border-zinc-800 ${fecha === hoy ? 'font-semibold text-emerald-700 dark:text-emerald-400' : ''
                                        }`}
                                >
                                    {etiquetaDiaCorta(fecha)}
                                </div>
                            ))}

                            <div className="relative" style={{ height: FILAS * ALTO_FILA }}>
                                {HORAS.map((hora) => (
                                    <span
                                        key={hora}
                                        className="absolute right-1 text-[11px] leading-none text-zinc-500"
                                        style={{ top: ((hora * 60 - PRIMER_MINUTO) / PASO) * ALTO_FILA + 2 }}
                                    >
                                        {hora}:00
                                    </span>
                                ))}
                            </div>

                            {dias.map((fecha) => (
                                <div key={fecha} className="relative border-l border-zinc-200 dark:border-zinc-800" style={{ height: FILAS * ALTO_FILA }}>
                                    {Array.from({ length: FILAS }, (_, i) => {
                                        const minutos = PRIMER_MINUTO + i * PASO;
                                        const libre = puedeIniciar(fecha, minutos);
                                        return (
                                            <button
                                                key={minutos}
                                                type="button"
                                                disabled={!libre || guardando}
                                                onClick={() => abrirFormulario(fecha, minutos)}
                                                aria-label={libre ? `Agregar bloque el ${etiquetaDiaLarga(fecha)} a las ${formatoHora(minutos)}` : undefined}
                                                title={libre ? `Agregar bloque a las ${formatoHora(minutos)}` : undefined}
                                                className={`absolute inset-x-0 ${minutos % 60 === 0 ? 'border-t border-zinc-200 dark:border-zinc-800' : ''} ${libre
                                                        ? 'cursor-pointer hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                                                        : 'cursor-default bg-zinc-50 dark:bg-zinc-900/50'
                                                    }`}
                                                style={{ top: i * ALTO_FILA, height: ALTO_FILA }}
                                            />
                                        );
                                    })}

                                    {eventosDe(fecha).map((evento) => {
                                        const inicio = Math.max(evento.inicio, PRIMER_MINUTO);
                                        const fin = Math.min(evento.fin, ULTIMO_MINUTO);
                                        if (fin <= inicio) return null;
                                        return (
                                            <TarjetaEvento
                                                key={evento.id}
                                                evento={evento}
                                                onEliminar={pedirEliminar}
                                                deshabilitado={guardando}
                                                className="absolute inset-x-0.5 z-10 overflow-hidden px-1 py-0.5 text-[11px] leading-tight"
                                                style={{
                                                    top: ((inicio - PRIMER_MINUTO) / PASO) * ALTO_FILA,
                                                    height: ((fin - inicio) / PASO) * ALTO_FILA,
                                                }}
                                            />
                                        );
                                    })}
                                </div>
                            ))}
                        </div>
                    </div>

                    <ListaPorDia
                        dias={dias}
                        hoy={hoy}
                        eventosDe={eventosDe}
                        horaSugerida={horaSugerida}
                        onAgregar={abrirFormulario}
                        onEliminar={pedirEliminar}
                        deshabilitado={guardando}
                    />
                </>
            )}

            <Modal titulo="Nuevo bloque" abierto={formulario !== null} bloqueado={guardando} onCerrar={cerrarFormulario}>
                {formulario && (
                    <FormularioBloque
                        inicial={formulario}
                        minFecha={hoy}
                        maxFecha={limite}
                        enviando={guardando}
                        error={errorFormulario}
                        onGuardar={guardar}
                        onCancelar={cerrarFormulario}
                    />
                )}
            </Modal>

            <Modal titulo="Eliminar bloque" abierto={porEliminar !== null} bloqueado={guardando} onCerrar={cerrarEliminar}>
                <p className="text-sm first-letter:uppercase">¿Eliminar el bloque del {descripcionEliminar}?</p>
                {errorEliminar && (
                    <p role="alert" className="mt-3 text-sm text-red-600 dark:text-red-400">
                        {errorEliminar}
                    </p>
                )}
                <div className="mt-5 flex justify-end gap-2">
                    <button type="button" onClick={cerrarEliminar} disabled={guardando} className={botonSecundarioCss}>
                        Cancelar
                    </button>
                    <button type="button" onClick={confirmarEliminar} disabled={guardando} className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white transition-opacity hover:bg-red-700 disabled:opacity-60">
                        {guardando ? 'Eliminando…' : 'Eliminar'}
                    </button>
                </div>
            </Modal>
        </div>
    );
}