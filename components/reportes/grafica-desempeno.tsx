'use client';

import { useState } from 'react';
import { textoPorcentaje } from '@/lib/reportes';
import {
  SIN_DATOS_SUFICIENTES,
  calificacionEscalada,
  textoCalificacion,
  textoOcupacion,
  type FilaDesempeno,
} from '@/lib/reportes-desempeno';
import { tarjetaCss } from './tarjetas';

const MARCAS = [0, 25, 50, 75, 100];
const COLUMNAS =
  'grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-5 sm:grid-cols-[minmax(9rem,14rem)_minmax(0,1fr)_7rem]';

// Paleta validada (categórica, slots 1 y 2) en claro y en oscuro.
const SERIES = [
  { clave: 'ocupacion', nombre: 'Ocupación promedio', css: 'bg-[#2a78d6] dark:bg-[#3987e5]' },
  { clave: 'calificacion', nombre: 'Calificación × 20', css: 'bg-[#eb6834] dark:bg-[#d95926]' },
] as const;

function Leyenda() {
  return (
    <ul className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-zinc-600 dark:text-zinc-400">
      {SERIES.map((s) => (
        <li key={s.clave} className="flex items-center gap-2">
          <span aria-hidden className={`h-2.5 w-5 rounded-full ${s.css}`} />
          {s.nombre}
        </li>
      ))}
    </ul>
  );
}

/** Una barra sobre su riel; sin valor (null) deja el riel vacío y rayado. */
function Barra({ valor, css, atenuada }: { valor: number | null; css: string; atenuada: boolean }) {
  return (
    <div
      aria-hidden
      className={`relative h-2.5 w-full rounded-full ${
        valor === null
          ? 'bg-[repeating-linear-gradient(135deg,theme(colors.zinc.200)_0_4px,transparent_4px_8px)] dark:bg-[repeating-linear-gradient(135deg,theme(colors.zinc.700)_0_4px,transparent_4px_8px)]'
          : 'bg-zinc-200/80 dark:bg-zinc-700/60'
      }`}
    >
      {valor !== null && (
        <div
          className={`h-full rounded-full transition-opacity ${css} ${atenuada ? 'opacity-40' : ''}`}
          style={{ width: `${Math.min(valor, 100)}%`, minWidth: valor > 0 ? 6 : 0 }}
        />
      )}
    </div>
  );
}

/**
 * FE-29.1 · Barras agrupadas por entrenador: ocupación promedio (%) y
 * calificación × 20, en un solo eje de 0 a 100. Un riel rayado indica que no
 * hay dato (sin clases o "Sin datos suficientes"). La tabla es la vista de
 * datos completa.
 */
export function GraficaDesempeno({ filas }: { filas: FilaDesempeno[] }) {
  const [activa, setActiva] = useState<string | null>(null);

  return (
    <figure className={`${tarjetaCss} p-6`}>
      <figcaption className="mb-5 flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
        <div>
          <p className="text-base font-semibold text-zinc-900 dark:text-white">Ocupación y calificación por entrenador</p>
          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
            La calificación (1 a 5) se multiplica por 20 para compartir la escala de 0 a 100
          </p>
        </div>
        <Leyenda />
      </figcaption>

      <div className="divide-y divide-zinc-100 border-y border-zinc-100 dark:divide-zinc-800 dark:border-zinc-800">
        {filas.map((f) => {
          const id = f.entrenador.id;
          const resaltada = activa === id;
          const escalada = calificacionEscalada(f.calificacion);
          return (
            <div
              key={id}
              className={`${COLUMNAS} transition-colors ${resaltada ? 'bg-zinc-50 dark:bg-zinc-800/40' : ''}`}
              onMouseEnter={() => setActiva(id)}
              onMouseLeave={() => setActiva((a) => (a === id ? null : a))}
            >
              <div className="order-1 flex min-w-0 flex-col pt-3 sm:py-3 sm:text-right">
                <span className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">{f.entrenador.nombre}</span>
                <span className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                  {f.clasesImpartidas} {f.clasesImpartidas === 1 ? 'clase' : 'clases'} · {f.resenas}{' '}
                  {f.resenas === 1 ? 'reseña' : 'reseñas'}
                </span>
              </div>

              <div
                className="relative order-3 col-span-2 flex min-h-12 flex-col justify-center gap-1 self-stretch outline-none sm:order-2 sm:col-span-1 sm:min-h-16 max-sm:mb-3 focus-visible:ring-2 focus-visible:ring-[#3987e5]"
                tabIndex={0}
                role="img"
                aria-label={`${f.entrenador.nombre}: ocupación ${textoOcupacion(f.ocupacionPromedio)}, calificación ${textoCalificacion(f.calificacion)}`}
                onFocus={() => setActiva(id)}
                onBlur={() => setActiva((a) => (a === id ? null : a))}
              >
                {[25, 50, 75].map((m) => (
                  <span key={m} aria-hidden className="absolute inset-y-0 w-px bg-zinc-200/70 dark:bg-zinc-800" style={{ left: `${m}%` }} />
                ))}
                <Barra valor={f.ocupacionPromedio} css={SERIES[0].css} atenuada={!!activa && !resaltada} />
                <Barra valor={escalada} css={SERIES[1].css} atenuada={!!activa && !resaltada} />
                {resaltada && (
                  <div
                    role="tooltip"
                    className="pointer-events-none absolute left-0 top-full z-10 -mt-1 w-64 rounded-lg border border-zinc-200 bg-white p-3 text-xs shadow-lg dark:border-zinc-700 dark:bg-zinc-800"
                  >
                    <p className="font-semibold">{f.entrenador.nombre}</p>
                    <p className="mt-1 text-zinc-600 dark:text-zinc-300">
                      Ocupación promedio:{' '}
                      {f.ocupacionPromedio === null ? 'sin clases impartidas' : textoPorcentaje(f.ocupacionPromedio)}
                    </p>
                    <p className="text-zinc-600 dark:text-zinc-300">
                      Calificación:{' '}
                      {f.calificacion === null ? `${SIN_DATOS_SUFICIENTES} (${f.resenas} de 3 reseñas)` : `${textoCalificacion(f.calificacion)} de 5`}
                    </p>
                    <p className="text-zinc-600 dark:text-zinc-300">Sesiones realizadas: {f.sesionesRealizadas}</p>
                  </div>
                )}
              </div>

              <div aria-hidden className="order-2 flex flex-col pt-3 text-right sm:order-3 sm:py-3">
                <span className="text-sm font-semibold tabular-nums text-zinc-900 dark:text-white">{textoOcupacion(f.ocupacionPromedio)}</span>
                <span className="text-xs tabular-nums text-zinc-500 dark:text-zinc-400">
                  {f.calificacion === null ? 'Sin datos' : `★ ${textoCalificacion(f.calificacion)}`}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className={`${COLUMNAS} mt-2`} aria-hidden>
        <div className="hidden sm:block" />
        <div className="relative col-span-2 h-4 text-[11px] text-zinc-500 sm:col-span-1 dark:text-zinc-400">
          {MARCAS.map((m) => (
            <span
              key={m}
              className={`absolute whitespace-nowrap tabular-nums ${m === 0 ? '' : m === 100 ? '-translate-x-full' : '-translate-x-1/2'}`}
              style={{ left: `${m}%` }}
            >
              {m}
            </span>
          ))}
        </div>
        <div className="hidden sm:block" />
      </div>
    </figure>
  );
}
