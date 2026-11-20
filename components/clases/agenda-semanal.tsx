'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import {
  diasDeLaSemana,
  esCancelable,
  esModificable,
  etiquetaDiaCorta,
  etiquetaDiaLarga,
  etiquetaSemana,
  ETIQUETA_ESTADO,
  fechaLocal,
  horaLocal,
  MENSAJES_CANCELACION_CLASE,
  minutosDelDia,
  sumarDias,
  type ClaseAgenda,
  type EntrenadorResumen,
  type TipoClase,
} from '@/lib/clases';
import { colorDeTipo } from '@/lib/estilo-clases';
import { CancelarClase } from './cancelar-clase';
import { FormularioClase } from './formulario-clase';
import { Notificacion } from './notificacion';
import { botonPrimarioCss, botonSecundarioCss } from './estilos';

const PRIMERA_HORA = 5;
const ULTIMA_HORA = 22;
const PX_POR_HORA = 48;
const ALTO_DIA = (ULTIMA_HORA - PRIMERA_HORA) * PX_POR_HORA;

const tarjetaCss = 'rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900/60';

type Ventana = 'nueva' | 'editar' | 'cancelar' | null;

/** Resumen de la semana para las tarjetas de arriba. Las clases canceladas no cuentan en la ocupación. */
export function resumenSemana(clases: ClaseAgenda[]) {
  const activas = clases.filter((c) => c.estado !== 'CANCELADA_GIMNASIO');
  const reservas = activas.reduce((suma, c) => suma + c.reservasConfirmadas, 0);
  const cupo = activas.reduce((suma, c) => suma + c.cupoMaximo, 0);
  return {
    clases: activas.length,
    impartidas: activas.filter((c) => c.estado === 'IMPARTIDA').length,
    reservas,
    cupo,
    ocupacion: cupo > 0 ? Math.round((reservas / cupo) * 100) : 0,
    canceladas: clases.length - activas.length,
  };
}

/**
 * FE-4.2: agenda semanal de lunes a domingo. En pantallas grandes es una
 * cuadrícula de 5:00 a 22:00; en el teléfono, una lista por día.
 * Con `editable` (administrador) permite programar, modificar y cancelar
 * clases (FE-7.1); entrenador y recepción la ven en modo de solo lectura.
 *
 * Rediseño (H7): resumen de la semana, filtro por tipo, un color por tipo de
 * clase con reservas/cupo en cada bloque, la línea de la hora actual y un
 * panel lateral con el detalle de la clase elegida.
 */
export function AgendaSemanal({
  lunes,
  hoy,
  rutaBase,
  clases: clasesServidor,
  tipos,
  entrenadores,
  editable,
}: {
  lunes: string;
  hoy: string;
  rutaBase: string;
  clases: ClaseAgenda[];
  tipos: TipoClase[];
  entrenadores: EntrenadorResumen[];
  editable: boolean;
}) {
  const [seleccionId, setSeleccionId] = useState<string | null>(null);
  const [ventana, setVentana] = useState<Ventana>(null);
  const [filtro, setFiltro] = useState<string>('todas');
  // Clases canceladas en esta pantalla: se ven así de inmediato, antes de que llegue la agenda nueva del servidor.
  const [canceladas, setCanceladas] = useState<Set<string>>(() => new Set());
  const [aviso, setAviso] = useState<{ texto: string; id: number } | null>(null);
  const cerrarAviso = useCallback(() => setAviso(null), []);
  const cerrarVentana = useCallback(() => setVentana(null), []);
  // Minuto actual para la línea de "ahora". Se calcula en el navegador (no en el servidor) y se renueva cada minuto.
  const [minutoActual, setMinutoActual] = useState<number | null>(null);
  useEffect(() => {
    const actualizar = () => setMinutoActual(minutosDelDia(horaLocal(new Date())));
    const primero = setTimeout(actualizar, 0);
    const cada = setInterval(actualizar, 60_000);
    return () => {
      clearTimeout(primero);
      clearInterval(cada);
    };
  }, []);

  const clases = clasesServidor.map((c) =>
    canceladas.has(c.id) && c.estado !== 'CANCELADA_GIMNASIO'
      ? { ...c, estado: 'CANCELADA_GIMNASIO' as const, reservasConfirmadas: 0, lugaresDisponibles: c.cupoMaximo }
      : c,
  );
  const seleccion = clases.find((c) => c.id === seleccionId) ?? null;

  const dias = diasDeLaSemana(lunes);
  const tiposDeLaSemana = [...new Map(clases.map((c) => [c.tipo.id, c.tipo])).values()].sort((a, b) =>
    a.nombre.localeCompare(b.nombre, 'es'),
  );
  const visibles = filtro === 'todas' ? clases : clases.filter((c) => c.tipo.id === filtro);
  const porDia = new Map(dias.map((dia) => [dia, [] as ClaseAgenda[]]));
  for (const clase of visibles) porDia.get(fechaLocal(clase.inicio))?.push(clase);

  const semanaDeHoy = dias.includes(hoy);
  const fechaSugerida = semanaDeHoy ? hoy : lunes;
  const resumen = resumenSemana(clases);

  function elegir(clase: ClaseAgenda) {
    setAviso(null);
    setSeleccionId(clase.id);
    // En el teléfono el panel queda debajo de la lista: se lleva la vista hasta él.
    document.getElementById('detalle-clase')?.scrollIntoView?.({ behavior: 'smooth', block: 'nearest' });
  }

  function alGuardar(mensaje: string) {
    setVentana(null);
    setAviso({ texto: mensaje, id: Date.now() });
  }

  function alCancelar(claseId: string, reservasCanceladas: number) {
    setCanceladas((previas) => new Set(previas).add(claseId));
    setVentana(null);
    setAviso({ texto: MENSAJES_CANCELACION_CLASE.exito(reservasCanceladas), id: Date.now() });
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Agenda de clases</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Semana del {etiquetaSemana(lunes)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`${rutaBase}?semana=${sumarDias(lunes, -7)}`} className={botonSecundarioCss}>
            ← Semana anterior
          </Link>
          <Link
            href={rutaBase}
            aria-disabled={semanaDeHoy}
            className={`${botonSecundarioCss} ${semanaDeHoy ? 'pointer-events-none opacity-50' : ''}`}
          >
            Hoy
          </Link>
          <Link href={`${rutaBase}?semana=${sumarDias(lunes, 7)}`} className={botonSecundarioCss}>
            Semana siguiente →
          </Link>
          {editable && (
            <button
              type="button"
              className={botonPrimarioCss}
              onClick={() => {
                setAviso(null);
                setVentana('nueva');
              }}
            >
              Nueva clase
            </button>
          )}
        </div>
      </div>
      {aviso && <Notificacion key={aviso.id} mensaje={aviso.texto} onCerrar={cerrarAviso} />}

      <dl aria-label="Resumen de la semana" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Indicador
          etiqueta="Clases de la semana"
          valor={String(resumen.clases)}
          detalle={`${resumen.impartidas} impartidas · ${resumen.clases - resumen.impartidas} por impartir`}
        />
        <Indicador etiqueta="Reservas confirmadas" valor={String(resumen.reservas)} detalle={`de ${resumen.cupo} lugares`} />
        <Indicador etiqueta="Ocupación" valor={`${resumen.ocupacion} %`} detalle="reservas ÷ cupo de la semana" />
        <Indicador etiqueta="Canceladas" valor={String(resumen.canceladas)} detalle="por el gimnasio" />
      </dl>

      {tiposDeLaSemana.length > 1 && (
        <div role="group" aria-label="Filtrar por tipo de clase" className="flex flex-wrap gap-2">
          {[{ id: 'todas', nombre: 'Todas' }, ...tiposDeLaSemana].map((tipo) => {
            const activo = filtro === tipo.id;
            return (
              <button
                key={tipo.id}
                type="button"
                aria-pressed={activo}
                onClick={() => setFiltro(tipo.id)}
                className={`rounded-full border px-3.5 py-1.5 text-sm transition-colors ${
                  activo
                    ? 'border-zinc-900 bg-zinc-900 font-medium text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900'
                    : 'border-zinc-300 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800'
                }`}
              >
                {tipo.nombre}
              </button>
            );
          })}
        </div>
      )}

      {clases.length === 0 && (
        <p className="rounded-2xl border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500 dark:border-zinc-700">
          No hay clases programadas para esta semana
        </p>
      )}

      <div className="flex flex-wrap items-start gap-4">
        <div className="min-w-0 flex-[999_1_40rem]">
          {/* Cuadrícula semanal (pantallas medianas y grandes). */}
          <div className={`${tarjetaCss} hidden overflow-x-auto md:block`}>
            <div className="grid min-w-[900px] grid-cols-[3.5rem_repeat(7,minmax(0,1fr))]">
              <div className="border-b border-zinc-200 dark:border-zinc-800" />
              {dias.map((dia) => (
                <div
                  key={dia}
                  className={`border-b border-l border-zinc-200 px-2 py-2.5 text-center text-sm capitalize dark:border-zinc-800 ${
                    dia === hoy ? 'bg-zinc-900 font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900' : ''
                  }`}
                >
                  {etiquetaDiaCorta(dia)}
                </div>
              ))}

              <div className="relative" style={{ height: ALTO_DIA }}>
                {Array.from({ length: ULTIMA_HORA - PRIMERA_HORA }, (_, i) => (
                  <span
                    key={i}
                    className="absolute right-2 -translate-y-1/2 font-mono text-xs text-zinc-500"
                    style={{ top: i * PX_POR_HORA }}
                  >
                    {i === 0 ? '' : `${String(PRIMERA_HORA + i).padStart(2, '0')}:00`}
                  </span>
                ))}
              </div>

              {dias.map((dia) => (
                <ColumnaDia
                  key={dia}
                  esHoy={dia === hoy}
                  minutoActual={minutoActual}
                  clases={porDia.get(dia) ?? []}
                  seleccionId={seleccionId}
                  onElegir={elegir}
                />
              ))}
            </div>
          </div>

          {/* Lista por día (teléfono). */}
          <div className="flex flex-col gap-4 md:hidden">
            {dias.map((dia) => {
              const delDia = porDia.get(dia) ?? [];
              return (
                <section key={dia}>
                  <h2
                    className={`mb-2 text-sm font-semibold capitalize ${dia === hoy ? 'text-foreground' : 'text-zinc-500'}`}
                  >
                    {etiquetaDiaLarga(dia)}
                    {dia === hoy && ' · hoy'}
                  </h2>
                  {delDia.length === 0 ? (
                    <p className="text-xs text-zinc-400">Sin clases</p>
                  ) : (
                    <ul className="flex flex-col gap-2">
                      {delDia.map((clase) => (
                        <li key={clase.id}>
                          <TarjetaClase clase={clase} elegida={clase.id === seleccionId} onElegir={elegir} />
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              );
            })}
          </div>
        </div>

        <PanelDetalle
          clase={seleccion}
          editable={editable}
          onModificar={() => setVentana('editar')}
          onCancelar={() => setVentana('cancelar')}
        />
      </div>

      {ventana === 'nueva' && (
        <FormularioClase
          clase={null}
          fechaSugerida={fechaSugerida}
          tipos={tipos}
          entrenadores={entrenadores}
          onCerrar={cerrarVentana}
          onGuardado={alGuardar}
        />
      )}
      {ventana === 'editar' && seleccion && (
        <FormularioClase
          key={seleccion.id}
          clase={seleccion}
          fechaSugerida={fechaSugerida}
          tipos={tipos}
          entrenadores={entrenadores}
          onCerrar={cerrarVentana}
          onGuardado={alGuardar}
        />
      )}
      {ventana === 'cancelar' && seleccion && (
        <CancelarClase key={seleccion.id} clase={seleccion} onCerrar={cerrarVentana} onCancelada={alCancelar} />
      )}
    </div>
  );
}

function Indicador({ etiqueta, valor, detalle }: { etiqueta: string; valor: string; detalle: string }) {
  return (
    <div className={`${tarjetaCss} px-4 py-3.5`}>
      <dt className="text-sm text-zinc-500">{etiqueta}</dt>
      <dd className="mt-1 text-2xl font-bold tracking-tight tabular-nums">{valor}</dd>
      <dd className="text-xs text-zinc-500">{detalle}</dd>
    </div>
  );
}

/** Columna de un día: las clases se ubican según su hora y las que se cruzan van lado a lado. */
function ColumnaDia({
  esHoy,
  minutoActual,
  clases,
  seleccionId,
  onElegir,
}: {
  esHoy: boolean;
  minutoActual: number | null;
  clases: ClaseAgenda[];
  seleccionId: string | null;
  onElegir: (clase: ClaseAgenda) => void;
}) {
  const carriles = asignarCarriles(clases);
  const totalCarriles = Math.max(1, ...carriles.map((c) => c.carril + 1));
  const lineaAhora =
    esHoy && minutoActual !== null && minutoActual >= PRIMERA_HORA * 60 && minutoActual <= ULTIMA_HORA * 60
      ? ((minutoActual - PRIMERA_HORA * 60) / 60) * PX_POR_HORA
      : null;

  return (
    <div
      className={`relative border-l border-zinc-200 dark:border-zinc-800 ${esHoy ? 'bg-zinc-50 dark:bg-zinc-900' : ''}`}
      style={{
        height: ALTO_DIA,
        backgroundImage: `repeating-linear-gradient(to bottom, transparent 0, transparent ${PX_POR_HORA - 1}px, rgb(161 161 170 / 0.2) ${PX_POR_HORA - 1}px, rgb(161 161 170 / 0.2) ${PX_POR_HORA}px)`,
      }}
    >
      {lineaAhora !== null && (
        <div aria-hidden className="pointer-events-none absolute inset-x-0 z-10 flex items-center" style={{ top: lineaAhora }}>
          <span className="-ml-1 size-2 rounded-full bg-orange-500" />
          <span className="h-0.5 flex-1 bg-orange-500" />
        </div>
      )}
      {carriles.map(({ clase, carril }) => {
        const inicio = Math.max(minutosDelDia(horaLocal(clase.inicio)), PRIMERA_HORA * 60);
        const fin = Math.min(minutosDelDia(horaLocal(clase.fin)), ULTIMA_HORA * 60);
        const top = ((inicio - PRIMERA_HORA * 60) / 60) * PX_POR_HORA;
        const alto = Math.max(((fin - inicio) / 60) * PX_POR_HORA, 22);
        const ancho = 100 / totalCarriles;

        return (
          <button
            key={clase.id}
            type="button"
            onClick={() => onElegir(clase)}
            aria-pressed={clase.id === seleccionId}
            aria-label={`${clase.tipo.nombre}, ${etiquetaDiaLarga(fechaLocal(clase.inicio))}, ${horaLocal(clase.inicio)} a ${horaLocal(clase.fin)}, ${clase.entrenador.nombre}, ${ETIQUETA_ESTADO[clase.estado]}`}
            title={`${clase.tipo.nombre} · ${horaLocal(clase.inicio)}–${horaLocal(clase.fin)} · ${clase.entrenador.nombre}`}
            className={`absolute overflow-hidden rounded-lg border px-1.5 py-1 text-left text-xs leading-tight transition ${estiloBloque(clase)} ${
              clase.id === seleccionId ? 'z-20 ring-2 ring-zinc-900 dark:ring-white' : ''
            }`}
            style={{ top: top + 2, height: alto - 4, left: `calc(${carril * ancho}% + 3px)`, width: `calc(${ancho}% - 6px)` }}
          >
            <span className={`block truncate font-semibold ${clase.estado === 'CANCELADA_GIMNASIO' ? 'line-through' : ''}`}>
              {clase.tipo.nombre}
            </span>
            <span className="block truncate font-mono text-[11px] opacity-85">
              {horaLocal(clase.inicio)}–{horaLocal(clase.fin)}
            </span>
            <span className="block truncate text-[11px] opacity-85">{textoOcupacion(clase)}</span>
          </button>
        );
      })}
    </div>
  );
}

function TarjetaClase({
  clase,
  elegida,
  onElegir,
}: {
  clase: ClaseAgenda;
  elegida: boolean;
  onElegir: (clase: ClaseAgenda) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onElegir(clase)}
      aria-pressed={elegida}
      className={`flex w-full items-center justify-between gap-3 rounded-lg border px-3 py-2.5 text-left text-sm ${estiloBloque(clase)} ${
        elegida ? 'ring-2 ring-zinc-900 dark:ring-white' : ''
      }`}
    >
      <span className="min-w-0">
        <span className={`block truncate font-semibold ${clase.estado === 'CANCELADA_GIMNASIO' ? 'line-through' : ''}`}>
          {clase.tipo.nombre}
        </span>
        <span className="block truncate text-xs">
          {horaLocal(clase.inicio)}–{horaLocal(clase.fin)} · {clase.entrenador.nombre}
        </span>
      </span>
      <span className="shrink-0 text-xs">{textoOcupacion(clase)}</span>
    </button>
  );
}

/** Panel con el detalle de la clase elegida. El administrador modifica o cancela desde aquí. */
function PanelDetalle({
  clase,
  editable,
  onModificar,
  onCancelar,
}: {
  clase: ClaseAgenda | null;
  editable: boolean;
  onModificar: () => void;
  onCancelar: () => void;
}) {
  if (!clase) {
    return (
      <aside
        id="detalle-clase"
        aria-label="Detalle de la clase"
        className={`${tarjetaCss} flex min-h-40 flex-[1_1_18rem] items-center justify-center p-6 text-center text-sm text-zinc-500 lg:max-w-sm`}
      >
        Toca una clase de la agenda para ver su detalle.
      </aside>
    );
  }

  const color = colorDeTipo(clase.tipo);
  const porcentaje = clase.cupoMaximo > 0 ? Math.round((clase.reservasConfirmadas / clase.cupoMaximo) * 100) : 0;
  const acciones = editable && esModificable(clase);
  const nota =
    clase.estado === 'CANCELADA_GIMNASIO'
      ? 'La clase fue cancelada por el gimnasio y sus reservas quedaron canceladas.'
      : clase.estado === 'IMPARTIDA'
        ? 'La clase ya se impartió: solo lectura.'
        : esModificable(clase)
          ? 'Aún no empieza.'
          : 'La clase ya empezó: no se puede modificar ni cancelar.';

  return (
    <aside
      id="detalle-clase"
      aria-label="Detalle de la clase"
      className={`${tarjetaCss} flex flex-[1_1_18rem] scroll-mt-6 flex-col gap-4 p-5 lg:max-w-sm`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-zinc-500 first-letter:uppercase">{etiquetaDiaLarga(fechaLocal(clase.inicio))}</p>
          <h2 className="mt-1 truncate text-xl font-semibold">{clase.tipo.nombre}</h2>
        </div>
        <span className={`whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${estiloEstado(clase)}`}>
          {ETIQUETA_ESTADO[clase.estado]}
        </span>
      </div>

      <dl className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-xs text-zinc-500">Horario</dt>
          <dd className="mt-0.5 font-mono">
            {horaLocal(clase.inicio)} – {horaLocal(clase.fin)}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-zinc-500">Entrenador</dt>
          <dd className="mt-0.5">{clase.entrenador.nombre}</dd>
        </div>
        <div>
          <dt className="text-xs text-zinc-500">Reservas / cupo</dt>
          <dd className="mt-0.5">
            {clase.reservasConfirmadas} / {clase.cupoMaximo}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-zinc-500">Lugares libres</dt>
          <dd className="mt-0.5">{clase.lugaresDisponibles}</dd>
        </div>
      </dl>

      <div className="h-2 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
        <div className={`h-full rounded-full ${color.barra}`} style={{ width: `${porcentaje}%` }} />
      </div>

      {clase.descripcion && <p className="text-sm text-zinc-700 dark:text-zinc-300">{clase.descripcion}</p>}
      <p className="text-sm text-zinc-500">{nota}</p>

      {acciones && (
        <div className="flex flex-col gap-2">
          <button type="button" onClick={onModificar} className={botonPrimarioCss}>
            Modificar clase
          </button>
          {esCancelable(clase) && (
            <>
              <button
                type="button"
                onClick={onCancelar}
                className="rounded-md border border-red-300 px-4 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/40"
              >
                Cancelar clase
              </button>
              <p className="text-xs text-zinc-500">
                Pide un motivo de 10 a 250 caracteres, cancela las reservas y avisa a los miembros.
              </p>
            </>
          )}
        </div>
      )}
    </aside>
  );
}

function textoOcupacion(clase: ClaseAgenda): string {
  if (clase.estado === 'CANCELADA_GIMNASIO') return 'Cancelada';
  const llena = clase.reservasConfirmadas >= clase.cupoMaximo;
  return `${clase.reservasConfirmadas}/${clase.cupoMaximo}${llena ? ' · llena' : ''}`;
}

/** Color del bloque: el de su tipo; las impartidas se ven apagadas y las canceladas, grises y tachadas. */
function estiloBloque(clase: ClaseAgenda): string {
  if (clase.estado === 'CANCELADA_GIMNASIO') {
    return 'border-dashed border-zinc-300 bg-zinc-100 text-zinc-500 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-400';
  }
  return `${colorDeTipo(clase.tipo).bloque} ${clase.estado === 'IMPARTIDA' ? 'opacity-60' : ''}`;
}

function estiloEstado(clase: ClaseAgenda): string {
  switch (clase.estado) {
    case 'CANCELADA_GIMNASIO':
      return 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300';
    case 'IMPARTIDA':
      return 'bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300';
    default:
      return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300';
  }
}

/** Reparte en carriles las clases de un día que se cruzan en horario. */
function asignarCarriles(clases: ClaseAgenda[]): { clase: ClaseAgenda; carril: number }[] {
  const ordenadas = [...clases].sort((a, b) => a.inicio.localeCompare(b.inicio));
  const finPorCarril: string[] = [];
  return ordenadas.map((clase) => {
    let carril = finPorCarril.findIndex((fin) => fin <= clase.inicio);
    if (carril === -1) carril = finPorCarril.length;
    finPorCarril[carril] = clase.fin;
    return { clase, carril };
  });
}
