'use client';

import Link from 'next/link';
import { useState } from 'react';
import {
  diasDeLaSemana,
  esModificable,
  etiquetaDiaCorta,
  etiquetaDiaLarga,
  etiquetaSemana,
  ETIQUETA_ESTADO,
  fechaLocal,
  horaLocal,
  minutosDelDia,
  sumarDias,
  type ClaseAgenda,
  type EntrenadorResumen,
  type TipoClase,
} from '@/lib/clases';
import { FormularioClase } from './formulario-clase';
import { Modal } from './modal';
import { botonPrimarioCss, botonSecundarioCss } from './estilos';

const PRIMERA_HORA = 5;
const ULTIMA_HORA = 22;
const PX_POR_HORA = 48;
const ALTO_DIA = (ULTIMA_HORA - PRIMERA_HORA) * PX_POR_HORA;

type Seleccion = { modo: 'nueva' } | { modo: 'ver'; clase: ClaseAgenda };

/**
 * FE-4.2: agenda semanal de lunes a domingo. En pantallas grandes es una
 * cuadrícula de 5:00 a 22:00; en el teléfono, una lista por día.
 * Con `editable` (administrador) permite programar y modificar clases;
 * entrenador y recepción la ven en modo de solo lectura.
 */
export function AgendaSemanal({
  lunes,
  hoy,
  rutaBase,
  clases,
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
  const [seleccion, setSeleccion] = useState<Seleccion | null>(null);
  const [aviso, setAviso] = useState('');

  const dias = diasDeLaSemana(lunes);
  const porDia = new Map(dias.map((dia) => [dia, [] as ClaseAgenda[]]));
  for (const clase of clases) porDia.get(fechaLocal(clase.inicio))?.push(clase);

  const semanaDeHoy = dias.includes(hoy);
  const fechaSugerida = semanaDeHoy ? hoy : lunes;

  function abrir(clase: ClaseAgenda) {
    setAviso('');
    setSeleccion({ modo: 'ver', clase });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Agenda de clases</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Semana del {etiquetaSemana(lunes)}
          </p>
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
                setAviso('');
                setSeleccion({ modo: 'nueva' });
              }}
            >
              Nueva clase
            </button>
          )}
        </div>
      </div>

      <p aria-live="polite" className="min-h-5 text-sm text-green-700 dark:text-green-400">
        {aviso}
      </p>

      {clases.length === 0 && (
        <p className="rounded-lg border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500 dark:border-zinc-700">
          No hay clases programadas para esta semana
        </p>
      )}

      {/* Cuadrícula semanal (pantallas medianas y grandes). */}
      <div className="hidden overflow-x-auto rounded-lg border border-zinc-200 md:block dark:border-zinc-800">
        <div className="grid min-w-[900px] grid-cols-[3.5rem_repeat(7,minmax(0,1fr))]">
          <div className="border-b border-zinc-200 dark:border-zinc-800" />
          {dias.map((dia) => (
            <div
              key={dia}
              className={`border-b border-l border-zinc-200 px-2 py-2 text-center text-sm capitalize dark:border-zinc-800 ${
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
                className="absolute right-2 -translate-y-1/2 text-xs text-zinc-500"
                style={{ top: i * PX_POR_HORA }}
              >
                {i === 0 ? '' : `${String(PRIMERA_HORA + i).padStart(2, '0')}:00`}
              </span>
            ))}
          </div>

          {dias.map((dia) => (
            <ColumnaDia key={dia} clases={porDia.get(dia) ?? []} onAbrir={abrir} />
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
                      <TarjetaClase clase={clase} onAbrir={abrir} />
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>

      {seleccion?.modo === 'nueva' && (
        <FormularioClase
          clase={null}
          fechaSugerida={fechaSugerida}
          tipos={tipos}
          entrenadores={entrenadores}
          onCerrar={() => setSeleccion(null)}
          onGuardado={(mensaje) => {
            setSeleccion(null);
            setAviso(mensaje);
          }}
        />
      )}

      {seleccion?.modo === 'ver' &&
        (editable && esModificable(seleccion.clase) ? (
          <FormularioClase
            key={seleccion.clase.id}
            clase={seleccion.clase}
            fechaSugerida={fechaSugerida}
            tipos={tipos}
            entrenadores={entrenadores}
            onCerrar={() => setSeleccion(null)}
            onGuardado={(mensaje) => {
              setSeleccion(null);
              setAviso(mensaje);
            }}
          />
        ) : (
          <DetalleClase clase={seleccion.clase} onCerrar={() => setSeleccion(null)} />
        ))}
    </div>
  );
}

/** Columna de un día: las clases se ubican según su hora y las que se cruzan van lado a lado. */
function ColumnaDia({
  clases,
  onAbrir,
}: {
  clases: ClaseAgenda[];
  onAbrir: (clase: ClaseAgenda) => void;
}) {
  const carriles = asignarCarriles(clases);
  const totalCarriles = Math.max(1, ...carriles.map((c) => c.carril + 1));

  return (
    <div
      className="relative border-l border-zinc-200 dark:border-zinc-800"
      style={{
        height: ALTO_DIA,
        backgroundImage: `repeating-linear-gradient(to bottom, transparent 0, transparent ${PX_POR_HORA - 1}px, rgb(161 161 170 / 0.25) ${PX_POR_HORA - 1}px, rgb(161 161 170 / 0.25) ${PX_POR_HORA}px)`,
      }}
    >
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
            onClick={() => onAbrir(clase)}
            title={`${clase.tipo.nombre} · ${horaLocal(clase.inicio)}–${horaLocal(clase.fin)} · ${clase.entrenador.nombre}`}
            className={`absolute overflow-hidden rounded-md border px-1.5 py-1 text-left text-xs leading-tight ${estiloEstado(clase)}`}
            style={{ top, height: alto, left: `calc(${carril * ancho}% + 2px)`, width: `calc(${ancho}% - 4px)` }}
          >
            <span className="block truncate font-medium">{clase.tipo.nombre}</span>
            <span className="block truncate">
              {horaLocal(clase.inicio)}–{horaLocal(clase.fin)}
            </span>
            <span className="block truncate">{clase.entrenador.nombre}</span>
            <span className="block truncate">
              {clase.reservasConfirmadas}/{clase.cupoMaximo}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function TarjetaClase({
  clase,
  onAbrir,
}: {
  clase: ClaseAgenda;
  onAbrir: (clase: ClaseAgenda) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onAbrir(clase)}
      className={`flex w-full items-center justify-between gap-3 rounded-md border px-3 py-2 text-left text-sm ${estiloEstado(clase)}`}
    >
      <span className="min-w-0">
        <span className="block truncate font-medium">{clase.tipo.nombre}</span>
        <span className="block truncate text-xs">
          {horaLocal(clase.inicio)}–{horaLocal(clase.fin)} · {clase.entrenador.nombre}
        </span>
      </span>
      <span className="shrink-0 text-xs">
        {clase.estado === 'CANCELADA_GIMNASIO'
          ? 'Cancelada'
          : `${clase.reservasConfirmadas}/${clase.cupoMaximo}`}
      </span>
    </button>
  );
}

function DetalleClase({ clase, onCerrar }: { clase: ClaseAgenda; onCerrar: () => void }) {
  const fila = 'flex justify-between gap-4 py-2 text-sm';
  return (
    <Modal abierto titulo={clase.tipo.nombre} onCerrar={onCerrar}>
      <dl className="divide-y divide-zinc-200 dark:divide-zinc-800">
        <div className={fila}>
          <dt className="text-zinc-500">Fecha</dt>
          <dd className="capitalize">{etiquetaDiaLarga(fechaLocal(clase.inicio))}</dd>
        </div>
        <div className={fila}>
          <dt className="text-zinc-500">Horario</dt>
          <dd>
            {horaLocal(clase.inicio)} a {horaLocal(clase.fin)}
          </dd>
        </div>
        <div className={fila}>
          <dt className="text-zinc-500">Entrenador</dt>
          <dd>{clase.entrenador.nombre}</dd>
        </div>
        <div className={fila}>
          <dt className="text-zinc-500">Reservas / cupo</dt>
          <dd>
            {clase.reservasConfirmadas} / {clase.cupoMaximo} ({clase.lugaresDisponibles} lugares)
          </dd>
        </div>
        <div className={fila}>
          <dt className="text-zinc-500">Estado</dt>
          <dd>{ETIQUETA_ESTADO[clase.estado]}</dd>
        </div>
        {clase.descripcion && (
          <div className={fila}>
            <dt className="text-zinc-500">Descripción</dt>
            <dd className="text-right">{clase.descripcion}</dd>
          </div>
        )}
      </dl>
      <div className="mt-4 flex justify-end">
        <button type="button" className={botonSecundarioCss} onClick={onCerrar}>
          Cerrar
        </button>
      </div>
    </Modal>
  );
}

function estiloEstado(clase: ClaseAgenda): string {
  switch (clase.estado) {
    case 'CANCELADA_GIMNASIO':
      return 'border-zinc-300 bg-zinc-100 text-zinc-400 line-through dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-500';
    case 'IMPARTIDA':
      return 'border-zinc-300 bg-zinc-50 text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400';
    default:
      return 'border-sky-300 bg-sky-50 text-sky-950 hover:bg-sky-100 dark:border-sky-800 dark:bg-sky-950 dark:text-sky-100 dark:hover:bg-sky-900';
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
