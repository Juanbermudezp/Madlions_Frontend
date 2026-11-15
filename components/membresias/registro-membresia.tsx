'use client';

import { useRef, useState, useTransition, type FormEvent } from 'react';
import { buscarMiembros, obtenerResumen, registrarMembresia } from '@/app/actions/membresias';
import { hoyLocal, sumarDias } from '@/lib/clases';
import {
  COLOR_ESTADO_MEMBRESIA,
  DIAS_MAXIMOS_INICIO,
  ETIQUETA_ESTADO_MEMBRESIA,
  ETIQUETA_OPERACION,
  SIN_RESULTADOS,
  formatearFecha,
  validarBusqueda,
  validarFechaInicio,
  type EstadoMembresia,
  type MiembroEncontrado,
  type ResumenOperacion,
} from '@/lib/membresias';
import { ETIQUETA_TIPO_PLAN, formatearPrecio, type Plan } from '@/lib/planes';
import {
  botonPrimarioCss,
  botonSecundarioCss,
  campoCss,
  errorCampoCss,
} from '@/components/clases/estilos';

/** FE-2.1: registro de compras y renovaciones de membresía (recepción). */
export function RegistroMembresia({ planes }: { planes: Plan[] }) {
  const hoy = hoyLocal();
  const limite = sumarDias(hoy, DIAS_MAXIMOS_INICIO);

  const [miembro, setMiembro] = useState<MiembroEncontrado | null>(null);
  const [planId, setPlanId] = useState<string | null>(null);
  const [fechaInicio, setFechaInicio] = useState(hoy);
  const [resumen, setResumen] = useState<ResumenOperacion | null>(null);
  const [errorResumen, setErrorResumen] = useState('');
  const [errorFecha, setErrorFecha] = useState('');
  const [errorConfirmar, setErrorConfirmar] = useState('');
  const [registrada, setRegistrada] = useState<{ mensaje: string; miembro: MiembroEncontrado; resumen: ResumenOperacion } | null>(null);
  const [cargandoResumen, iniciarResumen] = useTransition();
  const [enviando, iniciarEnvio] = useTransition();
  // Evita aplicar un resumen viejo si el usuario cambió de plan o fecha mientras cargaba.
  const ultimaConsulta = useRef(0);

  function pedirResumen(datos: { miembro: MiembroEncontrado; planId: string; fechaInicio: string }) {
    setResumen(null);
    setErrorResumen('');
    setErrorConfirmar('');
    const consulta = ++ultimaConsulta.current;
    iniciarResumen(async () => {
      const resultado = await obtenerResumen({
        miembroId: datos.miembro.id,
        planId: datos.planId,
        fechaInicio: datos.fechaInicio,
      });
      if (consulta !== ultimaConsulta.current) return;
      if (resultado.ok) {
        setResumen(resultado.datos);
        // En la renovación de una membresía vigente la fecha la fija el servidor.
        if (resultado.datos.fechaInicioFija) setFechaInicio(resultado.datos.fechaInicio);
      } else {
        setErrorResumen(resultado.error);
      }
    });
  }

  function elegirMiembro(elegido: MiembroEncontrado | null) {
    ultimaConsulta.current++;
    setMiembro(elegido);
    setPlanId(null);
    setFechaInicio(hoy);
    setResumen(null);
    setErrorResumen('');
    setErrorFecha('');
    setErrorConfirmar('');
  }

  function elegirPlan(id: string) {
    if (!miembro) return;
    setPlanId(id);
    setFechaInicio(hoy);
    setErrorFecha('');
    pedirResumen({ miembro, planId: id, fechaInicio: hoy });
  }

  function cambiarFecha(fecha: string) {
    setFechaInicio(fecha);
    const invalida = validarFechaInicio(fecha, hoy, limite);
    setErrorFecha(invalida ?? '');
    if (invalida) {
      ultimaConsulta.current++;
      setResumen(null);
      return;
    }
    if (miembro && planId) pedirResumen({ miembro, planId, fechaInicio: fecha });
  }

  function confirmar() {
    if (!miembro || !planId || !resumen || enviando) return;
    setErrorConfirmar('');
    iniciarEnvio(async () => {
      const resultado = await registrarMembresia({ miembroId: miembro.id, planId, fechaInicio: resumen.fechaInicio });
      if (resultado.ok) {
        setRegistrada({ mensaje: resultado.datos, miembro, resumen });
      } else {
        setErrorConfirmar(resultado.error);
      }
    });
  }

  function empezarDeNuevo() {
    setRegistrada(null);
    elegirMiembro(null);
  }

  if (registrada) {
    return (
      <div className="flex flex-col gap-4">
        <Encabezado />
        <section
          role="status"
          className="rounded-lg border border-emerald-200 bg-emerald-50 p-5 dark:border-emerald-900 dark:bg-emerald-950/40"
        >
          <p className="font-medium text-emerald-900 dark:text-emerald-100">{registrada.mensaje}</p>
          <dl className="mt-4 grid gap-x-4 gap-y-1 text-sm sm:grid-cols-[auto_1fr]">
            <dt className="text-zinc-600 dark:text-zinc-400">Miembro</dt>
            <dd>
              {registrada.miembro.nombre} {registrada.miembro.apellido} ({registrada.miembro.codigo})
            </dd>
            <dt className="text-zinc-600 dark:text-zinc-400">Operación</dt>
            <dd>
              {ETIQUETA_OPERACION[registrada.resumen.tipoOperacion]} · {registrada.resumen.plan.nombre} ·{' '}
              {formatearPrecio(registrada.resumen.precio)}
            </dd>
            <dt className="text-zinc-600 dark:text-zinc-400">Estado</dt>
            <dd>
              <EtiquetaEstado estado="PENDIENTE_PAGO" />
            </dd>
          </dl>
          <button type="button" className={`${botonPrimarioCss} mt-5`} onClick={empezarDeNuevo}>
            Registrar otra operación
          </button>
        </section>
      </div>
    );
  }

  const plan = planes.find((p) => p.id === planId);

  return (
    <div className="flex flex-col gap-6">
      <Encabezado />

      <Paso numero={1} titulo="Miembro">
        {miembro ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-zinc-900 p-4 dark:border-zinc-100">
            <DatosMiembro miembro={miembro} />
            <button type="button" className={botonSecundarioCss} onClick={() => elegirMiembro(null)} disabled={enviando}>
              Cambiar miembro
            </button>
          </div>
        ) : (
          <BuscadorMiembros onElegir={elegirMiembro} />
        )}
      </Paso>

      {miembro && (
        <Paso numero={2} titulo="Plan">
          {planes.length === 0 ? (
            <p className="rounded-lg border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500 dark:border-zinc-700">
              No hay planes activos
            </p>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {planes.map((p) => {
                const elegido = p.id === planId;
                return (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => elegirPlan(p.id)}
                      disabled={enviando}
                      aria-pressed={elegido}
                      className={`flex h-full w-full flex-col gap-1 rounded-lg border p-4 text-left transition-colors disabled:opacity-60 ${
                        elegido
                          ? 'border-zinc-900 ring-1 ring-zinc-900 dark:border-zinc-100 dark:ring-zinc-100'
                          : 'border-zinc-200 hover:border-zinc-400 dark:border-zinc-800 dark:hover:border-zinc-600'
                      }`}
                    >
                      <span className="font-medium">{p.nombre}</span>
                      <span className="text-sm text-zinc-600 dark:text-zinc-400">
                        {ETIQUETA_TIPO_PLAN[p.tipo]}
                        {p.cantidadClases !== null ? ` · ${p.cantidadClases} clases` : ''}
                      </span>
                      <span className="mt-1 text-xl font-semibold">{formatearPrecio(p.precio)}</span>
                      <span className="text-xs text-zinc-500">IVA incluido</span>
                      <span className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{p.beneficios}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </Paso>
      )}

      {miembro && plan && (
        <Paso numero={3} titulo="Fecha de inicio y resumen">
          <div className="flex flex-col gap-4 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
            <div className="max-w-xs">
              <label htmlFor="fecha-inicio" className="text-sm font-medium">
                Fecha de inicio
              </label>
              <input
                id="fecha-inicio"
                type="date"
                value={fechaInicio}
                min={hoy}
                max={limite}
                onChange={(e) => cambiarFecha(e.target.value)}
                disabled={Boolean(resumen?.fechaInicioFija) || enviando}
                aria-invalid={Boolean(errorFecha)}
                className={`${campoCss} disabled:opacity-60`}
              />
              <p className="mt-1 text-xs text-zinc-500">
                {resumen?.fechaInicioFija
                  ? 'Renovación de una membresía vigente: empieza el día siguiente a su vencimiento.'
                  : `De hoy al ${formatearFecha(limite)}.`}
              </p>
              {errorFecha && <p className={errorCampoCss}>{errorFecha}</p>}
            </div>

            {cargandoResumen && (
              <p className="text-sm text-zinc-500" aria-live="polite">
                Calculando el resumen…
              </p>
            )}
            {errorResumen && <MensajeError texto={errorResumen} />}

            {resumen && !cargandoResumen && (
              <ResumenOperacionVista resumen={resumen} />
            )}

            {errorConfirmar && <MensajeError texto={errorConfirmar} />}

            <div className="flex justify-end">
              <button
                type="button"
                className={`${botonPrimarioCss} w-full sm:w-auto`}
                onClick={confirmar}
                disabled={!resumen || cargandoResumen || enviando || Boolean(errorFecha)}
              >
                {enviando ? 'Registrando…' : 'Confirmar'}
              </button>
            </div>
          </div>
        </Paso>
      )}
    </div>
  );
}

function Encabezado() {
  return (
    <div>
      <h1 className="text-2xl font-semibold">Compras y renovaciones</h1>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        Registra la compra o renovación de una membresía. El miembro paga desde su cuenta en Mis pagos.
      </p>
    </div>
  );
}

function Paso({ numero, titulo, children }: { numero: number; titulo: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={`paso-${numero}`} className="flex flex-col gap-3">
      <h2 id={`paso-${numero}`} className="flex items-center gap-2 text-sm font-medium">
        <span className="flex size-6 items-center justify-center rounded-full bg-foreground text-xs text-background">
          {numero}
        </span>
        {titulo}
      </h2>
      {children}
    </section>
  );
}

function BuscadorMiembros({ onElegir }: { onElegir: (miembro: MiembroEncontrado) => void }) {
  const [texto, setTexto] = useState('');
  const [miembros, setMiembros] = useState<MiembroEncontrado[] | null>(null);
  const [error, setError] = useState('');
  const [buscando, iniciar] = useTransition();

  function buscar(evento: FormEvent) {
    evento.preventDefault();
    const invalido = validarBusqueda(texto);
    setError(invalido ?? '');
    if (invalido) return;

    iniciar(async () => {
      const resultado = await buscarMiembros(texto);
      if (resultado.ok) {
        setMiembros(resultado.datos);
      } else {
        setMiembros(null);
        setError(resultado.error);
      }
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <form onSubmit={buscar} noValidate role="search" className="flex flex-col gap-2 sm:flex-row sm:items-start">
        <div className="flex-1">
          <label htmlFor="buscar-miembro" className="sr-only">
            Buscar miembro
          </label>
          <input
            id="buscar-miembro"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            maxLength={50}
            placeholder="Nombre, documento o código de miembro"
            aria-invalid={Boolean(error)}
            className={`${campoCss} mt-0`}
          />
          {error && <p className={errorCampoCss}>{error}</p>}
        </div>
        <button type="submit" className={botonPrimarioCss} disabled={buscando}>
          {buscando ? 'Buscando…' : 'Buscar'}
        </button>
      </form>

      {miembros !== null &&
        (miembros.length === 0 ? (
          <p className="rounded-lg border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500 dark:border-zinc-700">
            {SIN_RESULTADOS}
          </p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {miembros.map((m) => (
              <li key={m.id}>
                <button
                  type="button"
                  onClick={() => onElegir(m)}
                  className="h-full w-full rounded-lg border border-zinc-200 p-4 text-left transition-colors hover:border-zinc-400 dark:border-zinc-800 dark:hover:border-zinc-600"
                >
                  <DatosMiembro miembro={m} />
                </button>
              </li>
            ))}
          </ul>
        ))}
    </div>
  );
}

function DatosMiembro({ miembro }: { miembro: MiembroEncontrado }) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <span className="font-medium">
        {miembro.nombre} {miembro.apellido}
      </span>
      <span className="text-sm text-zinc-600 dark:text-zinc-400">
        {miembro.codigo} · {miembro.documento}
      </span>
      <span className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
        <EtiquetaEstado estado={miembro.estadoMembresia} />
        {miembro.fechaVencimiento && <span>Vence el {formatearFecha(miembro.fechaVencimiento)}</span>}
      </span>
    </div>
  );
}

function EtiquetaEstado({ estado }: { estado: EstadoMembresia }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${COLOR_ESTADO_MEMBRESIA[estado]}`}>
      {ETIQUETA_ESTADO_MEMBRESIA[estado]}
    </span>
  );
}

function ResumenOperacionVista({ resumen }: { resumen: ResumenOperacion }) {
  return (
    <div className="flex flex-col gap-3 border-t border-zinc-200 pt-4 dark:border-zinc-800">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="font-medium">Resumen</h3>
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
            resumen.tipoOperacion === 'RENOVACION'
              ? 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-200'
              : 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
          }`}
        >
          {ETIQUETA_OPERACION[resumen.tipoOperacion]}
        </span>
      </div>
      <dl className="grid gap-x-4 gap-y-2 text-sm sm:grid-cols-[auto_1fr]">
        <dt className="text-zinc-500">Miembro</dt>
        <dd>
          {resumen.miembro.nombre} {resumen.miembro.apellido} ({resumen.miembro.codigo})
        </dd>
        <dt className="text-zinc-500">Plan</dt>
        <dd>
          {resumen.plan.nombre} · {ETIQUETA_TIPO_PLAN[resumen.plan.tipo]}
          {resumen.plan.cantidadClases !== null ? ` · ${resumen.plan.cantidadClases} clases` : ''}
        </dd>
        <dt className="text-zinc-500">Precio</dt>
        <dd className="font-semibold">{formatearPrecio(resumen.precio)} (IVA incluido)</dd>
        <dt className="text-zinc-500">Beneficios</dt>
        <dd>{resumen.beneficios}</dd>
        {resumen.plan.tiposClase.length > 0 && (
          <>
            <dt className="text-zinc-500">Tipos de clase</dt>
            <dd>{resumen.plan.tiposClase.map((t) => t.nombre).join(', ')}</dd>
          </>
        )}
        <dt className="text-zinc-500">Duración</dt>
        <dd>{resumen.duracionDias === 1 ? '1 día' : `${resumen.duracionDias} días`}</dd>
        <dt className="text-zinc-500">Fecha de inicio</dt>
        <dd>{formatearFecha(resumen.fechaInicio)}</dd>
        <dt className="text-zinc-500">Vence el</dt>
        <dd className="font-medium">{formatearFecha(resumen.fechaVencimiento)}</dd>
      </dl>
    </div>
  );
}

function MensajeError({ texto }: { texto: string }) {
  return (
    <p
      role="alert"
      className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
    >
      {texto}
    </p>
  );
}
