import Link from 'next/link';
import {
  COLOR_ESTADO_MAQUINA,
  ETIQUETA_ESTADO_MAQUINA,
  ETIQUETA_TIPO_MAQUINA,
  ETIQUETA_ZONA_MAQUINA,
  SIN_HISTORIAL,
  etiquetaCambiadoEn,
  etiquetaFechaRetorno,
  type CambioDeEstado,
  type Maquina,
} from '@/lib/maquinas';
import { CambiarEstado } from './cambiar-estado';

/**
 * FE-18.1: detalle de una máquina con su historial de cambios de estado.
 * Solo lo ven el administrador y el entrenador (supuesto S13).
 */
export function DetalleMaquina({
  maquina,
  historial,
  rutaBase,
}: {
  maquina: Maquina;
  historial: CambioDeEstado[];
  rutaBase: string;
}) {
  const color = COLOR_ESTADO_MAQUINA[maquina.estado];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href={rutaBase}
          className="text-sm text-zinc-600 hover:underline dark:text-zinc-400"
        >
          ← Estado del equipo
        </Link>
      </div>

      <div className={`rounded-lg border border-l-4 border-zinc-200 p-5 dark:border-zinc-800 ${color.borde}`}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold break-words">{maquina.nombre}</h1>
            <p className="mt-1 font-mono text-sm text-zinc-500">{maquina.codigo}</p>
          </div>

          <span className={`shrink-0 rounded-full px-3 py-1 text-sm font-medium ${color.etiqueta}`}>
            {ETIQUETA_ESTADO_MAQUINA[maquina.estado]}
          </span>
        </div>

        <dl className="mt-5 grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2">
          <Dato etiqueta="Tipo" valor={ETIQUETA_TIPO_MAQUINA[maquina.tipo]} />
          <Dato etiqueta="Zona" valor={ETIQUETA_ZONA_MAQUINA[maquina.zona]} />
          {maquina.estado !== 'OPERATIVA' && (
            <Dato
              etiqueta="Retorno estimado"
              valor={etiquetaFechaRetorno(maquina.fechaEstimadaRetorno)}
            />
          )}
          {maquina.ultimoMotivo && <Dato etiqueta="Último motivo" valor={maquina.ultimoMotivo} />}
          {maquina.ultimoCambioPor && (
            <Dato
              etiqueta="Último cambio"
              valor={`${maquina.ultimoCambioPor.nombre} ${maquina.ultimoCambioPor.apellido}`}
            />
          )}
        </dl>

        <div className="mt-6">
          <CambiarEstado maquina={maquina} />
        </div>
      </div>

      <section>
        <h2 className="text-lg font-semibold">Historial de cambios</h2>

        {historial.length === 0 ? (
          <p className="mt-3 rounded-lg border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-600 dark:border-zinc-700 dark:text-zinc-400">
            {SIN_HISTORIAL}
          </p>
        ) : (
          <>
            {/* Tabla en pantallas grandes; en el teléfono, una tarjeta por cambio. */}
            <div className="mt-3 hidden overflow-x-auto rounded-lg border border-zinc-200 md:block dark:border-zinc-800">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-zinc-200 text-xs text-zinc-500 dark:border-zinc-800">
                  <tr>
                    <th scope="col" className="px-4 py-2 font-medium">Fecha</th>
                    <th scope="col" className="px-4 py-2 font-medium">Anterior</th>
                    <th scope="col" className="px-4 py-2 font-medium">Nuevo</th>
                    <th scope="col" className="w-full px-4 py-2 font-medium">Motivo</th>
                    <th scope="col" className="px-4 py-2 font-medium">Usuario</th>
                  </tr>
                </thead>
                <tbody>
                  {historial.map((cambio) => (
                    <tr
                      key={cambio.id}
                      className="border-b border-zinc-100 last:border-0 dark:border-zinc-900"
                    >
                      <td className="px-4 py-3 whitespace-nowrap">
                        {etiquetaCambiadoEn(cambio.cambiadoEn)}
                      </td>
                      <td className="px-4 py-3">
                        <Insignia estado={cambio.estadoAnterior} />
                      </td>
                      <td className="px-4 py-3">
                        <Insignia estado={cambio.estadoNuevo} />
                      </td>
                      <td className="px-4 py-3">{cambio.motivo}</td>
                      <td className="px-4 py-3">
                        {cambio.usuario.nombre} {cambio.usuario.apellido}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <ul className="mt-3 flex flex-col gap-3 md:hidden">
              {historial.map((cambio) => (
                <li
                  key={cambio.id}
                  className="rounded-lg border border-zinc-200 p-4 text-sm dark:border-zinc-800"
                >
                  <p className="text-xs text-zinc-500">{etiquetaCambiadoEn(cambio.cambiadoEn)}</p>
                  <p className="mt-2 flex flex-wrap items-center gap-2">
                    <Insignia estado={cambio.estadoAnterior} />
                    <span aria-hidden="true" className="text-zinc-500">→</span>
                    <Insignia estado={cambio.estadoNuevo} />
                  </p>
                  <p className="mt-2 break-words">{cambio.motivo}</p>
                  <p className="mt-1 text-xs text-zinc-500">
                    {cambio.usuario.nombre} {cambio.usuario.apellido}
                  </p>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </div>
  );
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div>
      <dt className="text-xs text-zinc-500">{etiqueta}</dt>
      <dd className="mt-0.5 break-words">{valor}</dd>
    </div>
  );
}

function Insignia({ estado }: { estado: Maquina['estado'] }) {
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap ${COLOR_ESTADO_MAQUINA[estado].etiqueta}`}
    >
      {ETIQUETA_ESTADO_MAQUINA[estado]}
    </span>
  );
}
