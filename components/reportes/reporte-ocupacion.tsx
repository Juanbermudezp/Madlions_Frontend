'use client';

import { useRef, useState, useTransition } from 'react';
import { obtenerReporteOcupacion } from '@/app/actions/reportes';
import {
  COLOR_ETIQUETA_OCUPACION,
  ETIQUETA_OCUPACION,
  MENSAJES_REPORTES,
  ordenarOcupacion,
  tablaOcupacionPdf,
  textoPorcentaje,
  textoRango,
  type ColumnaOcupacion,
  type Orden,
  type RangoReporte,
  type ReporteOcupacion as Reporte,
  type Resultado,
} from '@/lib/reportes';
import { BotonExportarPdf } from './boton-exportar-pdf';
import { CargandoReporte, ErrorReporte, VacioReporte } from './estados-reporte';
import { GraficaOcupacion } from './grafica-ocupacion';
import { ResumenOcupacion } from './resumen-ocupacion';
import { SelectorRango } from './selector-rango';
import { tarjetaCss } from './tarjetas';

const COLUMNAS: { columna: ColumnaOcupacion; titulo: string; numerica?: boolean }[] = [
  { columna: 'tipoClase', titulo: 'Clase' },
  { columna: 'entrenador', titulo: 'Entrenador' },
  { columna: 'vecesImpartida', titulo: 'Veces impartida', numerica: true },
  { columna: 'reservasConfirmadas', titulo: 'Reservas confirmadas', numerica: true },
  { columna: 'cupoTotal', titulo: 'Cupo total', numerica: true },
  { columna: 'ocupacion', titulo: 'Ocupación', numerica: true },
];

/** FE-26.1 · Reporte de ocupación: rango, gráfica, tabla ordenable, etiquetas y exportación a PDF (FE-26.2). */
export function ReporteOcupacion({ inicial, rangoInicial }: { inicial: Resultado<Reporte>; rangoInicial: RangoReporte }) {
  const [rango, setRango] = useState(rangoInicial);
  const [resultado, setResultado] = useState<Resultado<Reporte> | null>(inicial);
  const [orden, setOrden] = useState<Orden<ColumnaOcupacion>>({ columna: 'ocupacion', direccion: 'desc' });
  const [cargando, iniciar] = useTransition();
  const ultima = useRef(0);

  function cargar(nuevo: RangoReporte) {
    setRango(nuevo);
    const consulta = ++ultima.current;
    iniciar(async () => {
      const r = await obtenerReporteOcupacion(nuevo);
      if (consulta === ultima.current) setResultado(r);
    });
  }

  function ordenarPor(columna: ColumnaOcupacion) {
    setOrden((o) =>
      o.columna === columna
        ? { columna, direccion: o.direccion === 'asc' ? 'desc' : 'asc' }
        : { columna, direccion: COLUMNAS.find((c) => c.columna === columna)?.numerica ? 'desc' : 'asc' },
    );
  }

  const datos = resultado?.ok ? resultado.datos : null;
  const filas = datos ? ordenarOcupacion(datos.filas, orden) : [];

  return (
    <section aria-labelledby="titulo-ocupacion" className="flex flex-1 flex-col gap-6">
      <div className={`${tarjetaCss} flex flex-col gap-5 p-5 sm:p-6`}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 id="titulo-ocupacion" className="text-lg font-semibold text-zinc-900 dark:text-white">
              Ocupación de clases grupales
            </h2>
            <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
              {textoRango(rango)} · Solo clases impartidas y reservas confirmadas
            </p>
          </div>
          <BotonExportarPdf
            deshabilitado={!datos || datos.filas.length === 0 || cargando}
            obtenerDatos={() => ({
              titulo: 'Reporte de ocupación de clases grupales',
              nombre: 'ocupacion',
              rango: { desde: datos!.desde, hasta: datos!.hasta },
              ...tablaOcupacionPdf(filas),
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
        <VacioReporte mensaje={MENSAJES_REPORTES.sinOcupacion} detalle="Prueba con otro rango de fechas." />
      ) : (
        <div className="flex flex-col gap-6">
          <ResumenOcupacion filas={resultado.datos.filas} />
          <GraficaOcupacion filas={resultado.datos.filas} />

          <div className={`${tarjetaCss} overflow-hidden`}>
            <div className="flex flex-wrap items-baseline justify-between gap-2 px-6 py-4">
              <h3 className="text-base font-semibold text-zinc-900 dark:text-white">Detalle por clase y entrenador</h3>
              <span className="text-xs text-zinc-500 dark:text-zinc-400">Toca un encabezado para ordenar</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <caption className="sr-only">Ocupación por clase y entrenador, {textoRango(rango)}</caption>
                <thead className="border-y border-zinc-200 bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:bg-zinc-800/50 dark:text-zinc-400">
                  <tr>
                    {COLUMNAS.map(({ columna, titulo, numerica }) => {
                      const activa = orden.columna === columna;
                      return (
                        <th
                          key={columna}
                          scope="col"
                          aria-sort={activa ? (orden.direccion === 'asc' ? 'ascending' : 'descending') : 'none'}
                          className={`px-6 py-3 font-medium ${numerica ? 'text-right' : ''}`}
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
                    <th scope="col" className="px-6 py-3 font-medium">
                      Etiqueta
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {filas.map((f) => (
                    <tr
                      key={`${f.tipoClase.id}-${f.entrenador.id}`}
                      className="transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
                    >
                      <td className="px-6 py-3.5 font-medium text-zinc-900 dark:text-white">{f.tipoClase.nombre}</td>
                      <td className="px-6 py-3.5 text-zinc-700 dark:text-zinc-300">{f.entrenador.nombre}</td>
                      <td className="px-6 py-3.5 text-right tabular-nums text-zinc-700 dark:text-zinc-300">{f.vecesImpartida}</td>
                      <td className="px-6 py-3.5 text-right tabular-nums text-zinc-700 dark:text-zinc-300">{f.reservasConfirmadas}</td>
                      <td className="px-6 py-3.5 text-right tabular-nums text-zinc-700 dark:text-zinc-300">{f.cupoTotal}</td>
                      <td className="px-6 py-3.5 text-right font-semibold tabular-nums text-zinc-900 dark:text-white">
                        {textoPorcentaje(f.ocupacion)}
                      </td>
                      <td className="px-6 py-3.5">
                        {f.etiqueta ? (
                          <span
                            className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${COLOR_ETIQUETA_OCUPACION[f.etiqueta]}`}
                          >
                            <span aria-hidden className="size-1.5 rounded-full bg-current" />
                            {ETIQUETA_OCUPACION[f.etiqueta]}
                          </span>
                        ) : (
                          <span className="text-zinc-400 dark:text-zinc-600">—</span>
                        )}
                      </td>
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
