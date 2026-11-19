'use client';

import { useCallback } from 'react';
import Link from 'next/link';
import { consultarMiRutina } from '@/app/actions/rutinas-propias';
import { botonSecundarioCss } from '@/components/clases/estilos';
import { formatearFecha } from '@/lib/membresias';
import { ErrorConsultaRutinas, useConsultaRutinasPropias } from './consulta';

export function DetalleRutina({ id }: { id: string }) {
  // Cambiar de UUID desmonta la consulta anterior antes de mostrar otra rutina.
  return <ContenidoDetalle key={id} id={id} />;
}

function ContenidoDetalle({ id }: { id: string }) {
  const consultar = useCallback(() => consultarMiRutina(id), [id]);
  const { estado, actualizar } = useConsultaRutinasPropias(consultar);
  const rutina = !estado.cargando && estado.resultado.ok ? estado.resultado.datos : null;

  return <div className="mx-auto w-full min-w-0 max-w-5xl space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <Link href="/miembro/rutinas" prefetch={false} className="text-sm underline">Volver a mis rutinas</Link>
      <button type="button" className={botonSecundarioCss} disabled={estado.cargando} onClick={actualizar}>Actualizar</button>
    </div>
    {estado.cargando ? <><h1 className="text-2xl font-semibold">Detalle de rutina</h1><p role="status" className="text-sm text-zinc-500">Cargando rutina…</p></>
      : !estado.resultado.ok ? <><h1 className="text-2xl font-semibold">Detalle de rutina</h1><ErrorConsultaRutinas fallo={estado.resultado} reintentar={actualizar} /></>
      : rutina && <>
        <header className="space-y-3 break-words">
          <h1 className="text-2xl font-semibold">{rutina.nombre}</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">{rutina.objetivo}</p>
          <p className="text-sm">Inicio: <time dateTime={rutina.fechaInicio}>{formatearFecha(rutina.fechaInicio)}</time></p>
          <p className="text-sm">Entrenador: {rutina.entrenador.nombre} {rutina.entrenador.apellido}</p>
        </header>
        <ol aria-label="Días de entrenamiento" className="min-w-0 space-y-6">
          {[...rutina.dias].sort((a, b) => a.orden - b.orden).map((dia) => <li key={dia.id} className="min-w-0">
            <section aria-labelledby={`dia-${dia.id}`} className="min-w-0 space-y-3">
              <h2 id={`dia-${dia.id}`} className="break-words text-lg font-semibold">Día {dia.orden} · {dia.nombre}</h2>
              <ol aria-label={`Ejercicios de ${dia.nombre}`} className="grid min-w-0 gap-3 lg:grid-cols-2">
                {[...dia.ejercicios].sort((a, b) => a.orden - b.orden).map((ejercicio) => <li key={ejercicio.id} className="min-w-0">
                  <article aria-labelledby={`ejercicio-${ejercicio.id}`} className="min-w-0 space-y-4 break-words rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
                    <h3 id={`ejercicio-${ejercicio.id}`} className="font-medium">{ejercicio.nombre}</h3>
                    <dl className="grid grid-cols-3 gap-2 text-sm">
                      <div><dt className="text-xs text-zinc-600 dark:text-zinc-400">Series</dt><dd className="mt-1 font-semibold">{ejercicio.series}</dd></div>
                      <div><dt className="text-xs text-zinc-600 dark:text-zinc-400">Repeticiones</dt><dd className="mt-1 font-semibold">{ejercicio.repeticiones}</dd></div>
                      <div><dt className="text-xs text-zinc-600 dark:text-zinc-400">Descanso</dt><dd className="mt-1 font-semibold">{ejercicio.descansoSeg} s</dd></div>
                    </dl>
                  </article>
                </li>)}
              </ol>
            </section>
          </li>)}
        </ol>
      </>}
  </div>;
}
