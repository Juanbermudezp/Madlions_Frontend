'use client';

import { useRef, useState, useTransition } from 'react';
import { obtenerReporteDesempeno } from '@/app/actions/desempeno';
import { textoRango, type Orden, type RangoReporte, type Resultado } from '@/lib/reportes';
import {
  MENSAJE_SIN_ENTRENADORES,
  SIN_DATOS_SUFICIENTES,
  ordenarDesempeno,
  tablaDesempenoPdf,
  textoCalificacion,
  textoOcupacion,
  type ColumnaDesempeno,
  type ReporteDesempeno as Reporte,
} from '@/lib/reportes-desempeno';
import { BotonExportarPdf } from './boton-exportar-pdf';
import { CargandoReporte, ErrorReporte, VacioReporte } from './estados-reporte';
import { GraficaDesempeno } from './grafica-desempeno';
import { SelectorRango } from './selector-rango';
import { tarjetaCss } from './tarjetas';

const COLUMNAS: { columna: ColumnaDesempeno; titulo: string; numerica?: boolean }[] = [
  { columna: 'entrenador', titulo: 'Entrenador' },
  { columna: 'clasesImpartidas', titulo: 'Clases impartidas', numerica: true },
  { columna: 'ocupacionPromedio', titulo: 'Ocupación promedio', numerica: true },
  { columna: 'sesionesRealizadas', titulo: 'Sesiones realizadas', numerica: true },
  { columna: 'calificacion', titulo: 'Calificación', numerica: true },
];

/** FE-29.1 · Desempeño de entrenadores: rango, gráfica, tabla ordenable y PDF. */
export function ReporteDesempeno({ inicial, rangoInicial }: { inicial: Resultado<Reporte>; rangoInicial: RangoReporte }) {
  const [rango, setRango] = useState(rangoInicial);
  const [resultado, setResultado] = useState<Resultado<Reporte> | null>(inicial);
  const [orden, setOrden] = useState<Orden<ColumnaDesempeno>>({ columna: 'calificacion', direccion: 'desc' });
  const [cargando, iniciar] = useTransition();
  const ultima = useRef(0);

  function cargar(nuevo: RangoReporte) {
    setRango(nuevo);
    const consulta = ++ultima.current;
    iniciar(async () => {
      const r = await obtenerReporteDesempeno(nuevo);
      if (consulta === ultima.current) setResultado(r);
    });
  }

  function ordenarPor(columna: ColumnaDesempeno) {
    setOrden((o) =>
      o.columna === columna
        ? { columna, direccion: o.direccion === 'asc' ? 'desc' : 'asc' }
        : { columna, direccion: COLUMNAS.find((c) => c.columna === columna)?.numerica ? 'desc' : 'asc' },
    );
  }

  const datos = resultado?.ok ? resultado.datos : null;
  const filas = datos ? ordenarDesempeno(datos.filas, orden) : [];

  return (
    <section aria-labelledby="titulo-desempeno" className="flex flex-1 flex-col gap-6">
      <div className={`${tarjetaCss} flex flex-col gap-5 p-5 sm:p-6`}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 id="titulo-desempeno" className="text-lg font-semibold text-zinc-900 dark:text-white">
              Desempeño de entrenadores
            </h2>
            <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
              {textoRango(rango)} · Clases impartidas, sesiones con asistencia y reseñas del período
            </p>
          </div>
          <BotonExportarPdf
            deshabilitado={!datos || datos.filas.length === 0 || cargando}
            obtenerDatos={() => ({
              titulo: 'Reporte de desempeño de entrenadores',
              nombre: 'desempeno',
              rango: { desde: datos!.desde, hasta: datos!.hasta },
              ...tablaDesempenoPdf(filas),
            })}
          />
        </div>
        <div className="border-t border-zinc-200 pt-5 dark:border-zinc-800">
          <SelectorRango rango={rango} onAplicar={cargar} deshabilitado={cargando} />
        </div>
      </div>

      {cargando || !resultado ? (
        <CargandoReporte />
      ) : !resultado.ok ? (
        <ErrorReporte mensaje={resultado.error} onReintentar={() => cargar(rango)} />
      ) : resultado.datos.filas.length === 0 ? (
        <VacioReporte mensaje={MENSAJE_SIN_ENTRENADORES} />
      ) : (
        <div className="flex flex-col gap-6">
          <GraficaDesempeno filas={filas} />

          <div className={`${tarjetaCss} overflow-hidden`}>
            <div className="flex flex-wrap items-baseline justify-between gap-2 px-6 py-4">
              <h3 className="text-base font-semibold text-zinc-900 dark:text-white">Detalle por entrenador</h3>
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                Toca un encabezado para ordenar · {SIN_DATOS_SUFICIENTES} = menos de 3 reseñas
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <caption className="sr-only">Desempeño por entrenador, {textoRango(rango)}</caption>
                <thead className="border-y border-zinc-200 bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:bg-zinc-800/50 dark:text-zinc-400">
                  <tr>
                    {COLUMNAS.map(({ columna, titulo, numerica }) => {
                      const activa = orden.columna === columna;
                      return (
                        <th
                          key={columna}
                          scope="col"
                          aria-sort={activa ? (orden.direccion === 'asc' ? 'ascending' : 'descending') : 'none'}
                          className={`px-4 py-3 font-medium first:pl-6 ${numerica ? 'text-right' : ''}`}
                        >
                          <button
                            type="button"
                            onClick={() => ordenarPor(columna)}
                            className={`inline-flex items-center gap-1 whitespace-nowrap uppercase hover:text-zinc-900 dark:hover:text-white ${
                              activa ? 'text-zinc-900 dark:text-white' : ''
                            }`}
                          >
                            {titulo}
                            <span aria-hidden className={`text-[10px] ${activa ? '' : 'opacity-50'}`}>
                              {activa ? (orden.direccion === 'asc' ? '▲' : '▼') : '↕'}
                            </span>
                          </button>
                        </th>
                      );
                    })}
                    <th scope="col" className="py-3 pl-4 pr-6 text-right font-medium">
                      Reseñas
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {filas.map((f) => (
                    <tr key={f.entrenador.id} className="transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
                      <td className="whitespace-nowrap py-3.5 pl-6 pr-4 font-medium text-zinc-900 dark:text-white">{f.entrenador.nombre}</td>
                      <td className="px-4 py-3.5 text-right tabular-nums text-zinc-700 dark:text-zinc-300">{f.clasesImpartidas}</td>
                      <td className="px-4 py-3.5 text-right tabular-nums text-zinc-700 dark:text-zinc-300">
                        {textoOcupacion(f.ocupacionPromedio)}
                      </td>
                      <td className="px-4 py-3.5 text-right tabular-nums text-zinc-700 dark:text-zinc-300">{f.sesionesRealizadas}</td>
                      <td
                        className={`whitespace-nowrap px-4 py-3.5 text-right tabular-nums ${
                          f.calificacion === null
                            ? 'text-xs text-zinc-500 dark:text-zinc-400'
                            : 'font-semibold text-zinc-900 dark:text-white'
                        }`}
                      >
                        {textoCalificacion(f.calificacion)}
                      </td>
                      <td className="py-3.5 pl-4 pr-6 text-right tabular-nums text-zinc-700 dark:text-zinc-300">{f.resenas}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
