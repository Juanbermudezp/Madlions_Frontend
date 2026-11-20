import Link from 'next/link';
import { botonPrimarioCss, botonSecundarioCss } from '@/components/clases/estilos';
import { etiquetaDiaLarga, fechaLocal, horaLocal, hoyLocal } from '@/lib/clases';
import { colorDeTipo } from '@/lib/estilo-clases';
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
import { partesDeFecha, type MiReserva } from '@/lib/reservas';

const tarjetaCss = 'rounded-2xl border border-zinc-200 bg-white p-5 sm:p-6 dark:border-zinc-800 dark:bg-zinc-900/60';

/** Días entre dos fechas AAAA-MM-DD (b − a). */
function diasEntre(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);
}

/**
 * Avance del período de cobertura: en qué día de cuántos va hoy (S2: la
 * cobertura incluye el día de inicio y el de vencimiento).
 */
export function avancePeriodo(
  inicio: string,
  vencimiento: string,
  hoy: string = hoyLocal(),
): { dia: number; total: number; porcentaje: number } {
  const total = diasEntre(inicio, vencimiento) + 1;
  const dia = Math.min(Math.max(diasEntre(inicio, hoy) + 1, 0), total);
  return { dia, total, porcentaje: Math.round((dia / total) * 100) };
}

/**
 * FE-3.1: estado de la membresía del miembro, sus fechas, créditos y renovación.
 * Rediseño (H7): ocupa todo el ancho, con los días restantes y el período a la
 * vista, los créditos como casillas, los tipos de clase incluidos y las
 * próximas clases reservadas.
 */
export function MiMembresiaVista({
  membresia,
  proximas = [],
  tiposIncluidos = [],
}: {
  membresia: MiMembresia;
  /** Reservas confirmadas que aún no terminan (GET /reservas/mias). */
  proximas?: MiReserva[];
  /** Nombres de los tipos de clase de la membresía. */
  tiposIncluidos?: { id: string; nombre: string }[];
}) {
  const puedeReservar = membresia.estado === 'VIGENTE' || membresia.estado === 'PROXIMA_A_VENCER';

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Mi membresía</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Estado de tu membresía y cuándo debes renovarla.
          </p>
        </div>
        {membresia.estado !== 'SIN_MEMBRESIA' && (
          <div className="flex flex-wrap gap-2">
            <Link href={RUTA_MIS_PAGOS} className={botonSecundarioCss}>
              Mis pagos
            </Link>
            {puedeReservar && (
              <Link href="/miembro/clases" className={botonPrimarioCss}>
                Reservar una clase
              </Link>
            )}
          </div>
        )}
      </div>

      {membresia.estado === 'SIN_MEMBRESIA' ? (
        <p className="rounded-2xl border border-dashed border-zinc-300 p-10 text-center text-sm text-zinc-600 dark:border-zinc-700 dark:text-zinc-400">
          {MENSAJES_MI_MEMBRESIA.sinMembresia}
        </p>
      ) : (
        <>
          <Avisos membresia={membresia} />
          <TarjetaPlan membresia={membresia} />
          <div className="grid gap-4 md:grid-cols-3">
            <TarjetaCreditos membresia={membresia} />
            <TarjetaRenovacion membresia={membresia} />
            <TarjetaIncluye tipos={tiposIncluidos} />
          </div>
          <ProximasClases reservas={proximas} puedeReservar={puedeReservar} />
        </>
      )}
    </div>
  );
}

function TarjetaPlan({ membresia }: { membresia: MiMembresia }) {
  const { estado, fechaInicio, fechaVencimiento, diasRestantes } = membresia;
  const periodo = fechaInicio && fechaVencimiento ? avancePeriodo(fechaInicio, fechaVencimiento) : null;

  return (
    <section aria-labelledby="mi-membresia-plan" className={`${tarjetaCss} grid gap-6 md:grid-cols-3`}>
      <div className="flex min-w-0 flex-col gap-2">
        <span className={`self-start rounded-full px-2.5 py-0.5 text-xs font-medium ${COLOR_ESTADO_MEMBRESIA[estado]}`}>
          {ETIQUETA_ESTADO_MEMBRESIA[estado]}
        </span>
        <h2 id="mi-membresia-plan" className="text-2xl font-semibold tracking-tight">
          {membresia.plan}
        </h2>
        {membresia.tipoPlan && (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">{ETIQUETA_TIPO_PLAN[membresia.tipoPlan]}</p>
        )}
      </div>

      <dl className="flex flex-col justify-center gap-1 border-zinc-200 md:border-l md:pl-6 dark:border-zinc-800">
        <dt className="text-sm text-zinc-500">Días restantes</dt>
        <dd className="text-5xl font-bold tracking-tight tabular-nums">
          {diasRestantes !== null ? diasRestantes : '—'}
        </dd>
        <dd className="text-sm text-zinc-600 dark:text-zinc-400">
          {diasRestantes !== null ? textoDiasRestantes(diasRestantes) : estado === 'POR_INICIAR' ? 'Aún no empieza' : '—'}
        </dd>
      </dl>

      <div className="flex flex-col justify-center gap-3 border-zinc-200 md:border-l md:pl-6 dark:border-zinc-800">
        <p className="text-sm text-zinc-500">Período de cobertura</p>
        {periodo ? (
          <>
            <div
              role="progressbar"
              aria-label="Avance del período de cobertura"
              aria-valuemin={0}
              aria-valuemax={periodo.total}
              aria-valuenow={periodo.dia}
              aria-valuetext={`Día ${periodo.dia} de ${periodo.total}`}
              className="relative h-2.5 rounded-full bg-zinc-200 dark:bg-zinc-800"
            >
              <div className="h-full rounded-full bg-zinc-500 dark:bg-zinc-400" style={{ width: `${periodo.porcentaje}%` }} />
            </div>
            <dl className="flex justify-between gap-2 text-sm">
              <div>
                <dt className="text-xs text-zinc-500">Fecha de inicio</dt>
                <dd>{formatearFecha(fechaInicio!)}</dd>
              </div>
              <div className="text-center">
                <dt className="text-xs text-zinc-500">Hoy</dt>
                <dd className="font-medium">
                  {periodo.dia === 0 ? 'Por iniciar' : `Día ${periodo.dia} de ${periodo.total}`}
                </dd>
              </div>
              <div className="text-right">
                <dt className="text-xs text-zinc-500">Fecha de vencimiento</dt>
                <dd>{formatearFecha(fechaVencimiento!)}</dd>
              </div>
            </dl>
          </>
        ) : (
          <p className="text-sm">Las fechas se definen al pagar.</p>
        )}
      </div>
    </section>
  );
}

function TarjetaCreditos({ membresia }: { membresia: MiMembresia }) {
  const { estado, creditosDisponibles, creditosTotales, tipoPlan } = membresia;
  // Los créditos se reciben al pagar: no se muestran en una compra pendiente ni en una vencida.
  const conCreditos = estado === 'VIGENTE' || estado === 'PROXIMA_A_VENCER' || estado === 'POR_INICIAR';
  const esSet = conCreditos && creditosTotales !== null && creditosDisponibles !== null;

  return (
    <section aria-labelledby="mi-membresia-creditos" className={`${tarjetaCss} flex flex-col gap-4`}>
      <div className="flex items-baseline justify-between gap-2">
        <h3 id="mi-membresia-creditos" className="font-semibold">
          Créditos de clases
        </h3>
        {esSet && (
          <span className="text-sm text-zinc-600 dark:text-zinc-400">
            {MENSAJES_MI_MEMBRESIA.creditos(creditosDisponibles!, creditosTotales!)}
          </span>
        )}
      </div>
      {esSet ? (
        <>
          <div
            role="progressbar"
            aria-label="Créditos de clases disponibles"
            aria-valuemin={0}
            aria-valuemax={creditosTotales!}
            aria-valuenow={creditosDisponibles!}
            aria-valuetext={MENSAJES_MI_MEMBRESIA.creditos(creditosDisponibles!, creditosTotales!)}
            className="grid gap-1.5"
            style={{ gridTemplateColumns: `repeat(${Math.min(creditosTotales!, 10)}, minmax(0, 1fr))` }}
          >
            {Array.from({ length: creditosTotales! }, (_, i) => (
              <span
                key={i}
                className={`h-7 rounded-md ${
                  i < creditosDisponibles!
                    ? 'bg-zinc-900 dark:bg-zinc-100'
                    : 'border border-dashed border-zinc-300 dark:border-zinc-600'
                }`}
              />
            ))}
          </div>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Cada reserva confirmada usa un crédito. Si cancelas con 2 horas de anticipación, vuelve a estar disponible.
          </p>
        </>
      ) : (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {tipoPlan === 'DAYPASS'
            ? 'Tu Daypass da acceso solo el día del pago.'
            : tipoPlan === 'MENSUAL' && conCreditos
              ? 'Tu plan mensual no tiene límite de clases: reserva las que quieras de los tipos incluidos.'
              : 'Los créditos se activan cuando se aprueba el pago.'}
        </p>
      )}
    </section>
  );
}

function TarjetaRenovacion({ membresia }: { membresia: MiMembresia }) {
  const { renovacion, tipoPlan, fechaVencimiento, estado } = membresia;

  return (
    <section aria-labelledby="mi-membresia-renovacion" className={`${tarjetaCss} flex flex-col gap-3`}>
      <h3 id="mi-membresia-renovacion" className="font-semibold">
        Renovación
      </h3>
      {renovacion ? (
        <>
          <p className="font-medium">
            {renovacion.estado === 'PENDIENTE_PAGO'
              ? MENSAJES_MI_MEMBRESIA.renovacionPendiente
              : MENSAJES_MI_MEMBRESIA.renovacionPagada(renovacion.fechaInicio)}
          </p>
          {renovacion.estado === 'PENDIENTE_PAGO' && (
            <Link href={RUTA_MIS_PAGOS} className={`${botonPrimarioCss} self-start`}>
              Ir a Mis pagos
            </Link>
          )}
        </>
      ) : tipoPlan === 'DAYPASS' ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">El Daypass no se renueva: compra uno nuevo en recepción.</p>
      ) : fechaVencimiento && estado !== 'VENCIDA' ? (
        <>
          <p className="font-medium">Podrás pagarla desde el {formatearFecha(fechaVencimiento)}</p>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Cuando falten 3 días te avisaremos. Acércate a recepción para registrarla.
          </p>
        </>
      ) : (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">Acércate a recepción para adquirir un plan.</p>
      )}
    </section>
  );
}

function TarjetaIncluye({ tipos }: { tipos: { id: string; nombre: string }[] }) {
  return (
    <section aria-labelledby="mi-membresia-incluye" className={`${tarjetaCss} flex flex-col gap-3`}>
      <h3 id="mi-membresia-incluye" className="font-semibold">
        Incluye
      </h3>
      {tipos.length > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {tipos.map((tipo) => (
            <li key={tipo.id} className={`rounded-full border px-3 py-1 text-sm ${colorDeTipo(tipo).chip}`}>
              {tipo.nombre}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">Los tipos de clase se muestran cuando la membresía está pagada.</p>
      )}
    </section>
  );
}

function ProximasClases({ reservas, puedeReservar }: { reservas: MiReserva[]; puedeReservar: boolean }) {
  const confirmadas = reservas.filter((r) => r.estado === 'CONFIRMADA').slice(0, 3);
  const hoy = hoyLocal();

  return (
    <section aria-labelledby="mi-membresia-proximas" className={`${tarjetaCss} flex flex-col gap-4`}>
      <div className="flex items-baseline justify-between gap-2">
        <h3 id="mi-membresia-proximas" className="font-semibold">
          Tus próximas clases
        </h3>
        <Link href="/miembro/reservas" className="text-sm underline-offset-2 hover:underline">
          Ver Mis reservas
        </Link>
      </div>
      {confirmadas.length === 0 ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          No tienes clases reservadas.{' '}
          {puedeReservar && (
            <Link href="/miembro/clases" className="font-medium underline underline-offset-2">
              Ver clases de la semana
            </Link>
          )}
        </p>
      ) : (
        <ul className="grid gap-3 lg:grid-cols-3">
          {confirmadas.map((reserva) => {
            const fecha = fechaLocal(reserva.clase.inicio);
            const { diaSemana, dia } = partesDeFecha(fecha);
            return (
              <li key={reserva.id} className="flex items-center gap-4 rounded-xl bg-zinc-100 p-3 dark:bg-zinc-800/60">
                <div aria-hidden className="flex w-14 shrink-0 flex-col items-center rounded-lg bg-white py-1.5 dark:bg-zinc-900">
                  <span className="text-[11px] uppercase text-zinc-500">{fecha === hoy ? 'hoy' : diaSemana}</span>
                  <span className="text-lg font-semibold tabular-nums">{dia}</span>
                </div>
                <div className="min-w-0">
                  <p className="truncate font-semibold">{reserva.clase.tipo.nombre}</p>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    <span className="sr-only">{etiquetaDiaLarga(fecha)} · </span>
                    <span className="font-mono tabular-nums">
                      {horaLocal(reserva.clase.inicio)} – {horaLocal(reserva.clase.fin)}
                    </span>
                  </p>
                  <p className="truncate text-sm text-zinc-500">{reserva.clase.entrenador.nombre}</p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function Avisos({ membresia }: { membresia: MiMembresia }) {
  const { estado, fechaVencimiento } = membresia;

  if (estado === 'PROXIMA_A_VENCER' && fechaVencimiento && !membresia.renovacion) {
    return (
      <p
        role="status"
        className="rounded-xl border border-yellow-300 bg-yellow-50 px-4 py-3 text-sm text-yellow-900 dark:border-yellow-900 dark:bg-yellow-950/40 dark:text-yellow-100"
      >
        {MENSAJES_MI_MEMBRESIA.proximaAVencer(fechaVencimiento)}
      </p>
    );
  }

  if (estado === 'VENCIDA' && fechaVencimiento) {
    return (
      <p
        role="alert"
        className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
      >
        {MENSAJES_MI_MEMBRESIA.vencida(fechaVencimiento)}
      </p>
    );
  }

  if (estado === 'PENDIENTE_PAGO') {
    return (
      <p className="rounded-xl border border-zinc-200 px-4 py-3 text-sm dark:border-zinc-800">
        Tu compra está pendiente de pago.{' '}
        <Link href={RUTA_MIS_PAGOS} className="font-medium underline underline-offset-2">
          Ir a Mis pagos
        </Link>
      </p>
    );
  }

  return null;
}
