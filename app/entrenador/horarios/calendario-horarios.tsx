"use client";

import { useEffect, useState, useSyncExternalStore, useTransition } from "react";
import {
    aInstante,
    formatoHora,
    hoyLocal,
    lunesDe,
    nombreDiaCorto,
    nombreDiaLargo,
    partesLocales,
    rangoCorto,
    sumarDias,
} from "@/lib/fechas";
import { crearBloque, eliminarBloque, obtenerSemana } from "./actions";
import { FormularioBloque } from "./formulario-bloque";
import { ListaPorDia } from "./lista-por-dia";
import { TarjetaEvento, aEventos } from "./tarjeta-evento";
import type { Bloque, Clase, DatosBloque } from "./tipos";

const PRIMER_MINUTO = 5 * 60; 
const ULTIMO_MINUTO = 22 * 60 + 30;
const ULTIMO_INICIO = 21 * 60;
const PASO = 15;
const ALTO_FILA = 12;
const FILAS = (ULTIMO_MINUTO - PRIMER_MINUTO) / PASO;
const HORAS = Array.from({ length: 18 }, (_, i) => 5 + i); // 5:00 a 22:00
const SEMANAS_ADELANTE = 4;
const DIAS_MAXIMOS = 28;
const REFRESCO_MS = 30_000;

const botonSecundario =
    "rounded-md border border-zinc-300 px-3 py-1.5 text-sm disabled:opacity-40 dark:border-zinc-700";

type Mensaje = { tipo: "exito" | "error"; texto: string };

const sinSuscripcion = () => () => { };

export function CalendarioHorarios() {
    const montado = useSyncExternalStore(sinSuscripcion, () => true, () => false);

    const [semana, setSemana] = useState(0);
    const [version, setVersion] = useState(0);
    const [datos, setDatos] = useState<{ bloques: Bloque[]; clases: Clase[] }>({ bloques: [], clases: [] });
    const [cargando, setCargando] = useState(true);
    const [mensaje, setMensaje] = useState<Mensaje | null>(null);
    const [formulario, setFormulario] = useState<DatosBloque | null>(null);
    const [errorFormulario, setErrorFormulario] = useState<string | null>(null);
    const [pendiente, iniciar] = useTransition();

    const hoy = hoyLocal();
    const limite = sumarDias(hoy, DIAS_MAXIMOS);
    const lunes = sumarDias(lunesDe(hoy), semana * 7);
    const dias = Array.from({ length: 7 }, (_, i) => sumarDias(lunes, i));
    const eventos = aEventos(datos.bloques, datos.clases);
    const eventosDe = (fecha: string) => eventos.filter((e) => e.fecha === fecha);

    useEffect(() => {
        let vigente = true;
        async function traer() {
            const resultado = await obtenerSemana(lunes);
            if (!vigente) return; 
            setCargando(false);
            if (resultado.ok) setDatos(resultado.data);
            else setMensaje({ tipo: "error", texto: resultado.error });
        }
        void traer();
        const intervalo = setInterval(() => void traer(), REFRESCO_MS);
        return () => {
            vigente = false;
            clearInterval(intervalo);
        };
    }, [lunes, version]);

    useEffect(() => {
        if (!mensaje) return;
        const temporizador = setTimeout(() => setMensaje(null), 4000);
        return () => clearTimeout(temporizador);
    }, [mensaje]);

    function recargar() {
        setCargando(true);
        setVersion((v) => v + 1);
    }

    function cambiarSemana(delta: number) {
        setCargando(true);
        setSemana((s) => s + delta);
    }

    function puedeIniciar(fecha: string, minutos: number) {
        return (
            fecha >= hoy &&
            fecha <= limite &&
            minutos >= PRIMER_MINUTO &&
            minutos <= ULTIMO_INICIO &&
            aInstante(fecha, formatoHora(minutos)) > new Date()
        );
    }

    function horaSugerida(fecha: string): number | null {
        let minutos = 7 * 60;
        if (fecha === hoy) {
            const ahora = partesLocales(new Date().toISOString()).minutos;
            minutos = Math.max(PRIMER_MINUTO, Math.ceil((ahora + 1) / PASO) * PASO);
        }
        return puedeIniciar(fecha, minutos) ? minutos : null;
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
                setMensaje({ tipo: "exito", texto: "Bloque registrado" });
                recargar();
            } else {
                setErrorFormulario(resultado.error);
            }
        });
    }

    function eliminar(bloque: Bloque) {
        const { fecha, minutos } = partesLocales(bloque.inicio);
        const confirmado = window.confirm(
            `¿Eliminar el bloque del ${nombreDiaLargo(fecha)} a las ${formatoHora(minutos)}?`,
        );
        if (!confirmado) return;

        iniciar(async () => {
            const resultado = await eliminarBloque(bloque.id);
            if (resultado.ok) {
                setDatos((d) => ({ ...d, bloques: d.bloques.filter((b) => b.id !== bloque.id) }));
                setMensaje({ tipo: "exito", texto: "Bloque eliminado" });
            } else {
                setMensaje({ tipo: "error", texto: resultado.error });
                recargar();
            }
        });
    }

    if (!montado) {
        return <p className="text-sm text-zinc-500">Cargando calendario…</p>;
    }

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => cambiarSemana(-1)}
                        disabled={semana === 0}
                        aria-label="Semana anterior"
                        className={botonSecundario}
                    >
                        ←
                    </button>
                    <span className="min-w-36 text-center text-sm font-medium">{rangoCorto(lunes)}</span>
                    <button
                        type="button"
                        onClick={() => cambiarSemana(1)}
                        disabled={semana === SEMANAS_ADELANTE}
                        aria-label="Semana siguiente"
                        className={botonSecundario}
                    >
                        →
                    </button>
                </div>

                <div className="flex items-center gap-3">
                    <ul className="flex gap-3 text-xs">
                        <li className="flex items-center gap-1">
                            <span className="size-3 rounded-sm bg-emerald-600" /> Disponible
                        </li>
                        <li className="flex items-center gap-1">
                            <span className="size-3 rounded-sm bg-blue-600" /> Ocupado
                        </li>
                        <li className="flex items-center gap-1">
                            <span className="size-3 rounded-sm bg-zinc-400" /> Clase
                        </li>
                    </ul>
                    <button type="button" onClick={recargar} disabled={cargando} className={botonSecundario}>
                        {cargando ? "Actualizando…" : "Actualizar"}
                    </button>
                </div>
            </div>

            {mensaje && (
                <p
                    role="status"
                    className={`rounded-md px-3 py-2 text-sm ${mensaje.tipo === "exito"
                            ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
                            : "bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-200"
                        }`}
                >
                    {mensaje.texto}
                </p>
            )}

            <div className="hidden overflow-x-auto rounded-lg border border-zinc-200 sm:block dark:border-zinc-800">
                <div className="grid min-w-[44rem] grid-cols-[3.5rem_repeat(7,minmax(0,1fr))]">
                    <div className="border-b border-zinc-200 dark:border-zinc-800" />
                    {dias.map((fecha) => (
                        <div
                            key={fecha}
                            className={`border-b border-l border-zinc-200 px-1 py-2 text-center text-sm first-letter:uppercase dark:border-zinc-800 ${fecha === hoy ? "font-semibold text-emerald-700 dark:text-emerald-400" : ""
                                }`}
                        >
                            {nombreDiaCorto(fecha)}
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
                        <div
                            key={fecha}
                            className="relative border-l border-zinc-200 dark:border-zinc-800"
                            style={{ height: FILAS * ALTO_FILA }}
                        >
                            {Array.from({ length: FILAS }, (_, i) => {
                                const minutos = PRIMER_MINUTO + i * PASO;
                                const libre = puedeIniciar(fecha, minutos);
                                return (
                                    <button
                                        key={minutos}
                                        type="button"
                                        disabled={!libre || pendiente}
                                        onClick={() => abrirFormulario(fecha, minutos)}
                                        aria-label={libre ? `Agregar bloque el ${nombreDiaLargo(fecha)} a las ${formatoHora(minutos)}` : undefined}
                                        title={libre ? `Agregar bloque a las ${formatoHora(minutos)}` : undefined}
                                        className={`absolute inset-x-0 ${minutos % 60 === 0 ? "border-t border-zinc-200 dark:border-zinc-800" : ""
                                            } ${libre
                                                ? "cursor-pointer hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                                                : "cursor-default bg-zinc-50 dark:bg-zinc-900/50"
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
                                        onEliminar={eliminar}
                                        deshabilitado={pendiente}
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
                onEliminar={eliminar}
                deshabilitado={pendiente}
            />

            {formulario && (
                <FormularioBloque
                    inicial={formulario}
                    minFecha={hoy}
                    maxFecha={limite}
                    enviando={pendiente}
                    error={errorFormulario}
                    onGuardar={guardar}
                    onCancelar={() => setFormulario(null)}
                />
            )}
        </div>
    );
}