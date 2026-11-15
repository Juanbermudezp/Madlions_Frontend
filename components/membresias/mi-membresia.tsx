import Link from 'next/link';
import {
  COLOR_ESTADO_MEMBRESIA,
  ETIQUETA_ESTADO_MEMBRESIA,
  MENSAJES_MI_MEMBRESIA,
  RUTA_MIS_PAGOS,
  formatearFecha,
  textoDiasRestantes,
  type MiMembresia,
} from '@/lib/membresias';
import { ETIQUETA_TIPO_PLAN } from '@/lib/planes';

/** FE-3.1: tarjeta con el estado de la membresía del miembro y su renovación. */
export function MiMembresiaVista({ membresia }: { membresia: MiMembresia }) {
  return (
    <div className="flex w-full max-w-2xl flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold">Mi membresía</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Estado de tu membresía y cuándo debes renovarla.
        </p>
      </div>

      {membresia.estado === 'SIN_MEMBRESIA' ? (
        <p className="rounded-lg border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-600 dark:border-zinc-700 dark:text-zinc-400">
          {MENSAJES_MI_MEMBRESIA.sinMembresia}
        </p>
      ) : (
        <>
          <TarjetaMembresia membresia={membresia} />
          <Avisos membresia={membresia} />
          {membresia.renovacion && <BloqueRenovacion renovacion={membresia.renovacion} />}
        </>
      )}
    </div>
  );
}

function TarjetaMembresia({ membresia }: { membresia: MiMembresia }) {
  const { estado, fechaInicio, fechaVencimiento, diasRestantes } = membresia;
  // Los créditos se reciben al pagar: no se muestran en una compra pendiente ni en una vencida.
  const conCreditos = estado === 'VIGENTE' || estado === 'PROXIMA_A_VENCER' || estado === 'POR_INICIAR';
  const esSet = conCreditos && membresia.creditosTotales !== null && membresia.creditosDisponibles !== null;

  return (
    <section
      aria-labelledby="mi-membresia-plan"
      className="rounded-lg border border-zinc-200 p-5 dark:border-zinc-800"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id="mi-membresia-plan" className="text-lg font-semibold">
            {membresia.plan}
          </h2>
          {membresia.tipoPlan && (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">{ETIQUETA_TIPO_PLAN[membresia.tipoPlan]}</p>
          )}
        </div>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${COLOR_ESTADO_MEMBRESIA[estado]}`}>
          {ETIQUETA_ESTADO_MEMBRESIA[estado]}
        </span>
      </div>

      <dl className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Dato etiqueta="Fecha de inicio" valor={fechaInicio ? formatearFecha(fechaInicio) : '—'} />
        <Dato
          etiqueta="Fecha de vencimiento"
          valor={fechaVencimiento ? formatearFecha(fechaVencimiento) : 'Se define al pagar'}
        />
        <Dato
          etiqueta="Días restantes"
          valor={diasRestantes !== null ? textoDiasRestantes(diasRestantes) : '—'}
          destacado={diasRestantes !== null}
        />
      </dl>

      {esSet && (
        <Creditos disponibles={membresia.creditosDisponibles!} totales={membresia.creditosTotales!} />
      )}
    </section>
  );
}

function Dato({ etiqueta, valor, destacado = false }: { etiqueta: string; valor: string; destacado?: boolean }) {
  return (
    <div>
      <dt className="text-xs text-zinc-500">{etiqueta}</dt>
      <dd className={`mt-0.5 ${destacado ? 'font-semibold' : 'font-medium'}`}>{valor}</dd>
    </div>
  );
}

function Creditos({ disponibles, totales }: { disponibles: number; totales: number }) {
  const porcentaje = totales > 0 ? Math.round((disponibles / totales) * 100) : 0;
  const texto = MENSAJES_MI_MEMBRESIA.creditos(disponibles, totales);

  return (
    <div className="mt-5 border-t border-zinc-200 pt-4 dark:border-zinc-800">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-sm font-medium">Créditos de clases</p>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">{texto}</p>
      </div>
      <div
        role="progressbar"
        aria-label="Créditos de clases disponibles"
        aria-valuemin={0}
        aria-valuemax={totales}
        aria-valuenow={disponibles}
        aria-valuetext={texto}
        className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800"
      >
        <div className="h-full rounded-full bg-foreground" style={{ width: `${porcentaje}%` }} />
      </div>
    </div>
  );
}

function Avisos({ membresia }: { membresia: MiMembresia }) {
  const { estado, fechaVencimiento } = membresia;

  if (estado === 'PROXIMA_A_VENCER' && fechaVencimiento && !membresia.renovacion) {
    return (
      <p
        role="status"
        className="rounded-lg border border-yellow-300 bg-yellow-50 px-4 py-3 text-sm text-yellow-900 dark:border-yellow-900 dark:bg-yellow-950/40 dark:text-yellow-100"
      >
        {MENSAJES_MI_MEMBRESIA.proximaAVencer(fechaVencimiento)}
      </p>
    );
  }

  if (estado === 'VENCIDA' && fechaVencimiento) {
    return (
      <p role="alert" className="text-sm font-medium text-red-600 dark:text-red-400">
        {MENSAJES_MI_MEMBRESIA.vencida(fechaVencimiento)}
      </p>
    );
  }

  if (estado === 'PENDIENTE_PAGO') {
    return (
      <p className="rounded-lg border border-zinc-200 px-4 py-3 text-sm dark:border-zinc-800">
        Tu compra está pendiente de pago.{' '}
        <Link href={RUTA_MIS_PAGOS} className="font-medium underline underline-offset-2">
          Ir a Mis pagos
        </Link>
      </p>
    );
  }

  return null;
}

function BloqueRenovacion({ renovacion }: { renovacion: NonNullable<MiMembresia['renovacion']> }) {
  const pendiente = renovacion.estado === 'PENDIENTE_PAGO';

  return (
    <section
      aria-labelledby="mi-membresia-renovacion"
      className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-zinc-200 px-4 py-3 dark:border-zinc-800"
    >
      <div className="min-w-0">
        <h2 id="mi-membresia-renovacion" className="text-xs text-zinc-500">
          Renovación
        </h2>
        <p className="mt-0.5 text-sm font-medium">
          {pendiente
            ? MENSAJES_MI_MEMBRESIA.renovacionPendiente
            : MENSAJES_MI_MEMBRESIA.renovacionPagada(renovacion.fechaInicio)}
        </p>
      </div>
      {pendiente && (
        <Link
          href={RUTA_MIS_PAGOS}
          className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background"
        >
          Ir a Mis pagos
        </Link>
      )}
    </section>
  );
}
