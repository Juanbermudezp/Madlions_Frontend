'use client';

import { useRef, useState, useTransition } from 'react';
import { obtenerCalificaciones } from '@/app/actions/calificaciones';
import {
  ETIQUETA_PESTANA,
  estrellasLlenas,
  ordenarPorPromedio,
  PESTANAS,
  SIN_DATOS_SUFICIENTES,
  textoPromedio,
  textoResenas,
  type Calificaciones,
  type Direccion,
  type Pestana,
  type PromedioCalificacion,
} from '@/lib/calificaciones';
import { textoRango, type RangoReporte, type Resultado } from '@/lib/reportes';
import { CargandoReporte, ErrorReporte, VacioReporte } from '@/components/reportes/estados-reporte';
import { SelectorRango } from '@/components/reportes/selector-rango';
import { tarjetaCss } from '@/components/reportes/tarjetas';

/**
 * FE-21.1 · Panel de calificaciones: promedio de las instalaciones, pestañas
 * de entrenadores y clases, rango de fechas y orden por promedio.
 * Reutiliza el selector y los estados de los reportes (FE-26.1).
 */
export function PanelCalificaciones({
  inicial,
  rangoInicial,
}: {
  inicial: Resultado<Calificaciones>;
  rangoInicial: RangoReporte;
}) {
  const [rango, setRango] = useState(rangoInicial);
  const [resultado, setResultado] = useState(inicial);
  const [pestana, setPestana] = useState<Pestana>('entrenadores');
  const [direccion, setDireccion] = useState<Direccion>('desc');
  const [cargando, iniciar] = useTransition();
  const ultima = useRef(0);

  function cargar(nuevo: RangoReporte) {
    setRango(nuevo);
    const consulta = ++ultima.current;
    iniciar(async () => {
      const r = await obtenerCalificaciones(nuevo);
      if (consulta === ultima.current) setResultado(r);
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Calificaciones</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Promedio por entrenador y por clase. {textoRango(rango)}.
        </p>
      </div>

      <SelectorRango rango={rango} onAplicar={cargar} deshabilitado={cargando} />

      {cargando ? (
        <CargandoReporte />
      ) : !resultado.ok ? (
        <ErrorReporte mensaje={resultado.error} onReintentar={() => cargar(rango)} />
      ) : (
        <>
          <Instalaciones datos={resultado.datos.instalaciones} />

          <div className={`${tarjetaCss} overflow-hidden`}>
            <div
              role="tablist"
              aria-label="Qué calificaciones ver"
              className="flex border-b border-zinc-200 dark:border-zinc-800"
            >
              {PESTANAS.map((opcion) => (
                <button
                  key={opcion}
                  type="button"
                  role="tab"
                  aria-selected={pestana === opcion}
                  onClick={() => setPestana(opcion)}
                  className={`px-4 py-3 text-sm transition-colors ${
                    pestana === opcion
                      ? 'border-b-2 border-zinc-900 font-medium dark:border-zinc-100'
                      : 'text-zinc-600 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:bg-zinc-800'
                  }`}
                >
                  {ETIQUETA_PESTANA[opcion]}
                </button>
              ))}
            </div>

            <Tabla
              filas={ordenarPorPromedio(resultado.datos[pestana], direccion)}
              direccion={direccion}
              alOrdenar={() => setDireccion((d) => (d === 'desc' ? 'asc' : 'desc'))}
              vacio={
                pestana === 'entrenadores'
                  ? 'No hay entrenadores registrados'
                  : 'No hay tipos de clase registrados'
              }
            />
          </div>
        </>
      )}
    </div>
  );
}

function Instalaciones({ datos }: { datos: Calificaciones['instalaciones'] }) {
  return (
    <div className={`${tarjetaCss} flex flex-wrap items-center justify-between gap-4 p-5`}>
      <div>
        <p className="text-xs text-zinc-500">Instalaciones</p>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          {textoResenas(datos.total)} en el período
        </p>
      </div>

      {datos.promedio === null ? (
        <p className="text-sm text-zinc-500">{SIN_DATOS_SUFICIENTES}</p>
      ) : (
        <div className="flex items-center gap-3">
          <Estrellas promedio={datos.promedio} />
          <span className="text-2xl font-semibold tabular-nums">
            {textoPromedio(datos.promedio)}
          </span>
        </div>
      )}
    </div>
  );
}

function Tabla({
  filas,
  direccion,
  alOrdenar,
  vacio,
}: {
  filas: PromedioCalificacion[];
  direccion: Direccion;
  alOrdenar: () => void;
  vacio: string;
}) {
  if (filas.length === 0) return <VacioReporte mensaje={vacio} />;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-zinc-200 text-xs text-zinc-500 dark:border-zinc-800">
          <tr>
            <th scope="col" className="w-full px-4 py-2 font-medium">
              Nombre
            </th>
            <th scope="col" className="px-4 py-2 font-medium">
              <button
                type="button"
                onClick={alOrdenar}
                aria-label={`Ordenar por promedio, ${
                  direccion === 'desc' ? 'de mayor a menor' : 'de menor a mayor'
                }`}
                className="flex items-center gap-1 whitespace-nowrap hover:text-zinc-900 dark:hover:text-zinc-100"
              >
                Promedio
                <span aria-hidden="true">{direccion === 'desc' ? '▼' : '▲'}</span>
              </button>
            </th>
            <th scope="col" className="px-4 py-2 font-medium whitespace-nowrap">
              Reseñas
            </th>
          </tr>
        </thead>
        <tbody>
          {filas.map((fila) => (
            <tr
              key={fila.id}
              className="border-b border-zinc-100 last:border-0 dark:border-zinc-900"
            >
              <td className="px-4 py-3 break-words">{fila.nombre}</td>
              <td className="px-4 py-3">
                {fila.promedio === null ? (
                  <span className="text-zinc-500">{SIN_DATOS_SUFICIENTES}</span>
                ) : (
                  <span className="flex items-center gap-2 whitespace-nowrap">
                    <Estrellas promedio={fila.promedio} />
                    <span className="font-medium tabular-nums">
                      {textoPromedio(fila.promedio)}
                    </span>
                  </span>
                )}
              </td>
              <td className="px-4 py-3 text-right tabular-nums">{fila.total}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Estrellas({ promedio }: { promedio: number }) {
  const llenas = estrellasLlenas(promedio);

  return (
    <span aria-hidden="true" className="text-amber-400">
      {'★'.repeat(llenas)}
      <span className="text-zinc-300 dark:text-zinc-700">{'☆'.repeat(5 - llenas)}</span>
    </span>
  );
}
