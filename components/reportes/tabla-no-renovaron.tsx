'use client';

import { useState } from 'react';
import { campoCss } from '@/components/clases/estilos';
import { fechaCorta } from '@/lib/reportes';
import { buscarNoRenovaron, type MembresiaNoRenovada } from '@/lib/reportes-renovacion';
import { tarjetaCss } from './tarjetas';

export function TablaNoRenovaron({ filas }: { filas: MembresiaNoRenovada[] }) {
  const [consulta, setConsulta] = useState('');
  const visibles = buscarNoRenovaron(filas, consulta);
  return <section aria-label="Miembros que no renovaron" className={`${tarjetaCss} min-w-0 space-y-5 p-4 sm:p-6`}>
    <header className="flex flex-wrap items-start justify-between gap-4"><div><h3 className="font-semibold">Miembros que no renovaron</h3>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Membresías sin renovación pagada dentro de los siete días posteriores al vencimiento.</p></div>
      <label className="block w-full text-sm sm:w-72">Buscar por nombre o código<input type="search" value={consulta} onChange={(e) => setConsulta(e.target.value)} className={`${campoCss} w-full`} /></label>
    </header>
    {visibles.length === 0 ? <p role="status" className="py-8 text-center text-sm text-zinc-600 dark:text-zinc-400">{filas.length === 0 ? 'No hay miembros que no renovaron en este período.' : 'No hay coincidencias con la búsqueda.'}</p>
      : <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-700" role="region" aria-label="Tabla de miembros que no renovaron" tabIndex={0}>
        <table className="w-full min-w-[600px] text-left text-sm"><caption className="sr-only">Membresías canceladas, ordenadas por vencimiento descendente</caption>
          <thead className="bg-zinc-50 dark:bg-zinc-800"><tr>{['Nombre', 'Código', 'Plan', 'Fecha de vencimiento'].map((c) => <th key={c} scope="col" className="px-4 py-3">{c}</th>)}</tr></thead>
          <tbody>{visibles.map((f, i) => <tr key={`${f.codigo}:${f.fechaVencimiento}:${i}`} className="border-t border-zinc-200 dark:border-zinc-700">
            <td className="px-4 py-4">{f.nombre}</td><td className="whitespace-nowrap px-4 py-4">{f.codigo}</td><td className="px-4 py-4">{f.plan}</td><td className="whitespace-nowrap px-4 py-4">{fechaCorta(f.fechaVencimiento)}</td>
          </tr>)}</tbody>
        </table>
      </div>}
    <p className="text-xs text-zinc-600 dark:text-zinc-400" aria-live="polite">{visibles.length} de {filas.length} membresías</p>
  </section>;
}
