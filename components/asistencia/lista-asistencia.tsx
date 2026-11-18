'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { guardarAsistencia } from '@/app/actions/asistencia';
import {
  cambiosDe,
  ETIQUETA_MARCA,
  ETIQUETA_TIPO_ACTIVIDAD,
  etiquetaHorario,
  marcarTodosSinRegistrar,
  restanteDeLaVentana,
  seleccionInicial,
  SIN_ACTIVIDADES,
  type ActividadPendiente,
  type Marca,
  type MiembroActividad,
  type Seleccion,
} from '@/lib/asistencia';
import { Notificacion } from '@/components/clases/notificacion';
import { botonPrimarioCss, botonSecundarioCss } from '@/components/clases/estilos';

/**
 * FE-19.1: una tarjeta por clase o sesión, con sus miembros y dos botones por
 * miembro. Lo que todavía no se guardó se marca en la fila y en la tarjeta.
 */
export function ListaAsistencia({ actividades }: { actividades: ActividadPendiente[] }) {
  const router = useRouter();
  const [seleccion, setSeleccion] = useState<Seleccion>(() => seleccionInicial(actividades));
  const [aviso, setAviso] = useState<{ texto: string; id: number } | null>(null);
  const [error, setError] = useState('');
  const [guardandoId, setGuardandoId] = useState<string | null>(null);
  const [, iniciar] = useTransition();

  if (actividades.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-600 dark:border-zinc-700 dark:text-zinc-400">
        {SIN_ACTIVIDADES}
      </p>
    );
  }

  function elegir(registroId: string, marca: Marca) {
    setError('');
    setSeleccion((previa) => ({ ...previa, [registroId]: marca }));
  }

  function guardar(actividad: ActividadPendiente) {
    const marcas = cambiosDe(actividad, seleccion);
    if (marcas.length === 0) return;

    setError('');
    setGuardandoId(actividad.id);
    iniciar(async () => {
      const resultado = await guardarAsistencia(marcas);
      setGuardandoId(null);

      if (resultado.ok) {
        setAviso({ texto: resultado.mensaje, id: Date.now() });
        router.refresh();
        return;
      }
      setError(resultado.error);
    });
  }

  return (
    <>
      {error && (
        <p
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
        >
          {error}
        </p>
      )}

      <ul className="flex flex-col gap-4">
        {actividades.map((actividad) => {
          const pendientes = cambiosDe(actividad, seleccion);
          const guardando = guardandoId === actividad.id;

          return (
            <li
              key={actividad.id}
              className={`rounded-lg border p-4 ${
                pendientes.length > 0
                  ? 'border-amber-400 dark:border-amber-700'
                  : 'border-zinc-200 dark:border-zinc-800'
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="font-medium break-words">
                    {actividad.nombre}
                    {/* La sesión personal ya se llama así: la etiqueta sobra. */}
                    {actividad.tipo === 'CLASE' && (
                      <span className="ml-2 rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-normal text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                        {ETIQUETA_TIPO_ACTIVIDAD[actividad.tipo]}
                      </span>
                    )}
                  </h2>
                  <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                    {etiquetaHorario(actividad.inicio, actividad.fin)}
                  </p>
                  <p className="mt-0.5 text-xs text-zinc-500">
                    {restanteDeLaVentana(actividad.fin)}
                  </p>
                </div>

                {pendientes.length > 0 && (
                  <span className="shrink-0 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                    {pendientes.length === 1
                      ? '1 cambio sin guardar'
                      : `${pendientes.length} cambios sin guardar`}
                  </span>
                )}
              </div>

              <ul className="mt-4 flex flex-col divide-y divide-zinc-100 dark:divide-zinc-900">
                {actividad.miembros.map((miembro) => (
                  <FilaMiembro
                    key={miembro.registroId}
                    miembro={miembro}
                    elegida={seleccion[miembro.registroId]}
                    sinGuardar={
                      seleccion[miembro.registroId] !== miembro.asistencia
                    }
                    alElegir={elegir}
                    bloqueado={guardando}
                  />
                ))}
              </ul>

              <div className="mt-4 flex flex-wrap justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setSeleccion(marcarTodosSinRegistrar(actividad, seleccion))}
                  disabled={guardando}
                  className={botonSecundarioCss}
                >
                  Marcar todos como Asistió
                </button>
                <button
                  type="button"
                  onClick={() => guardar(actividad)}
                  disabled={guardando || pendientes.length === 0}
                  className={botonPrimarioCss}
                >
                  {guardando ? 'Guardando…' : 'Guardar'}
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      {aviso && (
        <Notificacion key={aviso.id} mensaje={aviso.texto} onCerrar={() => setAviso(null)} />
      )}
    </>
  );
}

function FilaMiembro({
  miembro,
  elegida,
  sinGuardar,
  alElegir,
  bloqueado,
}: {
  miembro: MiembroActividad;
  elegida: string;
  sinGuardar: boolean;
  alElegir: (registroId: string, marca: Marca) => void;
  bloqueado: boolean;
}) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 py-3">
      <div className="min-w-0">
        <p className="break-words">
          {miembro.nombre}
          {sinGuardar && (
            <span className="ml-2 align-middle text-xs text-amber-600 dark:text-amber-400">
              ● sin guardar
            </span>
          )}
        </p>
        <p className="font-mono text-xs text-zinc-500">{miembro.codigo}</p>
      </div>

      <div role="group" aria-label={`Asistencia de ${miembro.nombre}`} className="flex gap-2">
        {(['ASISTIO', 'NO_ASISTIO'] as const).map((marca) => {
          const activo = elegida === marca;
          const verde = marca === 'ASISTIO';

          return (
            <button
              key={marca}
              type="button"
              onClick={() => alElegir(miembro.registroId, marca)}
              disabled={bloqueado}
              aria-pressed={activo}
              className={`rounded-md border px-3 py-1.5 text-sm transition-colors disabled:opacity-60 ${
                activo
                  ? verde
                    ? 'border-green-500 bg-green-100 font-medium text-green-800 dark:bg-green-950 dark:text-green-300'
                    : 'border-red-500 bg-red-100 font-medium text-red-800 dark:bg-red-950 dark:text-red-300'
                  : 'border-zinc-300 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800'
              }`}
            >
              {ETIQUETA_MARCA[marca]}
            </button>
          );
        })}
      </div>
    </li>
  );
}
