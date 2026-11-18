'use client';

import { useState } from 'react';
import Link from 'next/link';
import { listarMisRutinas } from '@/app/actions/rutinas-propias';
import { botonSecundarioCss } from '@/components/clases/estilos';
import { formatearFecha } from '@/lib/membresias';
import { ErrorConsultaRutinas, useConsultaRutinasPropias } from './consulta';

export function MisRutinas() {
  const { estado, actualizar } = useConsultaRutinasPropias(listarMisRutinas);
  const [pagina, setPagina] = useState(1);
  const lista = !estado.cargando && estado.resultado.ok ? estado.resultado.datos : [];
  const paginas = Math.max(1, Math.ceil(lista.length / 20));
  const actual = Math.min(pagina, paginas);

  return <div className="mx-auto w-full min-w-0 max-w-5xl space-y-6">
    <header className="flex flex-wrap items-center justify-between gap-3">
      <div><h1 className="text-2xl font-semibold">Mis rutinas</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">Consulta las rutinas que te asignó tu entrenador.</p></div>
      <button type="button" className={botonSecundarioCss} onClick={actualizar} disabled={estado.cargando}>Actualizar</button>
    </header>
    {estado.cargando ? <p role="status" className="text-sm text-zinc-500">Cargando rutinas…</p>
      : !estado.resultado.ok ? <ErrorConsultaRutinas fallo={estado.resultado} reintentar={actualizar} />
      : !lista.length ? <p className="rounded-lg border border-dashed border-zinc-300 p-6 dark:border-zinc-700">No tienes rutinas asignadas</p>
      : <>
        <ul aria-label="Rutinas asignadas" className="grid min-w-0 gap-4 md:grid-cols-2">
          {lista.slice((actual - 1) * 20, actual * 20).map((rutina) => <li key={rutina.id} className="min-w-0 space-y-3 break-words rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
            <h2 className="text-lg font-semibold">{rutina.nombre}</h2>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">{rutina.objetivo}</p>
            <p className="text-sm">Inicio: <time dateTime={rutina.fechaInicio}>{formatearFecha(rutina.fechaInicio)}</time></p>
            <p className="text-sm">Entrenador: {rutina.entrenador.nombre} {rutina.entrenador.apellido}</p>
            <Link href={`/miembro/rutinas/${encodeURIComponent(rutina.id)}`} prefetch={false} className={`${botonSecundarioCss} inline-block`} aria-label={`Ver detalle de ${rutina.nombre}`}>Ver detalle</Link>
          </li>)}
        </ul>
        {paginas > 1 && <nav aria-label="Páginas de mis rutinas" className="flex flex-wrap items-center gap-2 text-sm">
          <button type="button" className={botonSecundarioCss} disabled={actual === 1} onClick={() => setPagina(actual - 1)}>Anterior</button>
          <span>Página {actual} de {paginas}</span>
          <button type="button" className={botonSecundarioCss} disabled={actual === paginas} onClick={() => setPagina(actual + 1)}>Siguiente</button>
        </nav>}
      </>}
  </div>;
}
