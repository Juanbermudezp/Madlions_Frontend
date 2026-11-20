'use client';

import { useState } from 'react';
import {
  ETIQUETA_OCUPACION,
  UMBRAL_ALTA,
  UMBRAL_BAJA,
  textoPorcentaje,
  type FilaOcupacion,
} from '@/lib/reportes';
import { tarjetaCss } from './tarjetas';

const MARCAS = [0, 25, 50, 75, 100];
// Móvil: nombre y valor arriba, barra debajo a todo el ancho. Desde sm: nombre | barra | valor.
const COLUMNAS = 'grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-5 sm:grid-cols-[minmax(9rem,15rem)_minmax(0,1fr)_6rem]';
const clave = (f: FilaOcupacion) => `${f.tipoClase.id}-${f.entrenador.id}`;

/** Zonas de las etiquetas detrás de las barras (no compiten con la serie). */
function Zonas() {
  return (
    <>
      <span
        aria-hidden
        className="absolute inset-y-0 left-0 border-r border-dashed border-amber-500/50 bg-amber-500/[0.07] dark:bg-amber-500/[0.08]"
        style={{ width: `${UMBRAL_BAJA}%` }}
      />
      <span
        aria-hidden
        className="absolute inset-y-0 right-0 border-l border-dashed border-emerald-500/50 bg-emerald-500/[0.08] dark:bg-emerald-500/[0.08]"
        style={{ width: `${100 - UMBRAL_ALTA}%` }}
      />
      {[25, 50, 75].map((m) => (
        <span key={m} aria-hidden className="absolute inset-y-0 w-px bg-zinc-200/70 dark:bg-zinc-800" style={{ left: `${m}%` }} />
      ))}
    </>
  );
}

function Leyenda() {
  return (
    <ul className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-zinc-600 dark:text-zinc-400">
      <li className="flex items-center gap-2">
        <span aria-hidden className="h-2.5 w-5 rounded-full bg-[#2a78d6] dark:bg-[#3987e5]" />
        Ocupación
      </li>
      <li className="flex items-center gap-2">
        <span aria-hidden className="h-3 w-5 rounded-sm border border-dashed border-amber-500/70 bg-amber-500/15" />
        {ETIQUETA_OCUPACION.BAJA} (&lt; {UMBRAL_BAJA} %)
      </li>
      <li className="flex items-center gap-2">
        <span aria-hidden className="h-3 w-5 rounded-sm border border-dashed border-emerald-500/70 bg-emerald-500/15" />
        {ETIQUETA_OCUPACION.ALTA} (≥ {UMBRAL_ALTA} %)
      </li>
    </ul>
  );
}

/**
 * FE-26.1 · Barras horizontales de ocupación por clase y entrenador, de mayor a
 * menor. Una sola serie; cada barra va sobre un riel para que el 0 % también se
 * vea, y las zonas marcan los umbrales de las etiquetas. La tabla es la vista de
 * datos completa.
 */
export function GraficaOcupacion({ filas }: { filas: FilaOcupacion[] }) {
  const [activa, setActiva] = useState<string | null>(null);
  const ordenadas = [...filas].sort((a, b) => b.ocupacion - a.ocupacion);

  return (
    <figure className={`${tarjetaCss} p-6`}>
      <figcaption className="mb-5 flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
        <div>
          <p className="text-base font-semibold text-zinc-900 dark:text-white">Ocupación por clase y entrenador</p>
          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">Reservas confirmadas ÷ cupo total, de mayor a menor</p>
        </div>
        <Leyenda />
      </figcaption>

      <div className="divide-y divide-zinc-100 border-y border-zinc-100 dark:divide-zinc-800 dark:border-zinc-800">
        {ordenadas.map((f) => {
          const id = clave(f);
          const resaltada = activa === id;
          return (
            <div
              key={id}
              className={`${COLUMNAS} transition-colors ${resaltada ? 'bg-zinc-50 dark:bg-zinc-800/40' : ''}`}
              onMouseEnter={() => setActiva(id)}
              onMouseLeave={() => setActiva((a) => (a === id ? null : a))}
            >
              <div className="order-1 flex min-w-0 flex-col pt-3 sm:py-3 sm:text-right">
                <span className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">{f.tipoClase.nombre}</span>
                <span className="truncate text-xs text-zinc-500 dark:text-zinc-400">{f.entrenador.nombre}</span>
              </div>

              <div
                className="relative order-3 col-span-2 flex h-full min-h-8 items-center self-stretch outline-none sm:order-2 sm:col-span-1 sm:min-h-14 max-sm:mb-3 focus-visible:ring-2 focus-visible:ring-[#3987e5]"
                tabIndex={0}
                role="img"
                aria-label={`${f.tipoClase.nombre} con ${f.entrenador.nombre}: ${textoPorcentaje(f.ocupacion)}, ${f.reservasConfirmadas} de ${f.cupoTotal} lugares en ${f.vecesImpartida} clases`}
                onFocus={() => setActiva(id)}
                onBlur={() => setActiva((a) => (a === id ? null : a))}
              >
                <Zonas />
                <div aria-hidden className="relative h-3.5 w-full rounded-full bg-zinc-200/80 dark:bg-zinc-700/60">
                  <div
                    className={`h-full rounded-full bg-[#2a78d6] transition-opacity dark:bg-[#3987e5] ${
                      activa && !resaltada ? 'opacity-40' : ''
                    }`}
                    style={{ width: `${Math.min(f.ocupacion, 100)}%`, minWidth: f.ocupacion > 0 ? 6 : 0 }}
                  />
                </div>
                {resaltada && (
                  <div
                    role="tooltip"
                    className="pointer-events-none absolute left-0 top-full z-10 -mt-1 w-64 rounded-lg border border-zinc-200 bg-white p-3 text-xs shadow-lg dark:border-zinc-700 dark:bg-zinc-800"
                  >
                    <p className="font-semibold">
                      {f.tipoClase.nombre} · {f.entrenador.nombre}
                    </p>
                    <p className="mt-1 text-zinc-600 dark:text-zinc-300">
                      {textoPorcentaje(f.ocupacion)} de ocupación
                      {f.etiqueta ? ` · ${ETIQUETA_OCUPACION[f.etiqueta]}` : ''}
                    </p>
                    <p className="text-zinc-600 dark:text-zinc-300">
                      {f.reservasConfirmadas} de {f.cupoTotal} lugares · {f.vecesImpartida}{' '}
                      {f.vecesImpartida === 1 ? 'clase' : 'clases'}
                    </p>
                  </div>
                )}
              </div>

              <div aria-hidden className="order-2 flex flex-col pt-3 text-right sm:order-3 sm:py-3">
                <span className="text-sm font-semibold tabular-nums text-zinc-900 dark:text-white">{textoPorcentaje(f.ocupacion)}</span>
                <span className="text-xs tabular-nums text-zinc-500 dark:text-zinc-400">
                  {f.reservasConfirmadas} de {f.cupoTotal}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Eje */}
      <div className={`${COLUMNAS} mt-2`} aria-hidden>
        <div className="hidden sm:block" />
        <div className="relative col-span-2 h-4 text-[11px] text-zinc-500 sm:col-span-1 dark:text-zinc-400">
          {MARCAS.map((m) => (
            <span
              key={m}
              className={`absolute whitespace-nowrap tabular-nums ${m === 0 ? '' : m === 100 ? '-translate-x-full' : '-translate-x-1/2'}`}
              style={{ left: `${m}%` }}
            >
              {m} %
            </span>
          ))}
        </div>
        <div className="hidden sm:block" />
      </div>
    </figure>
  );
}
