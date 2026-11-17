'use client';

import { useRef, useState, useTransition, type FormEvent } from 'react';
import { buscarMiembrosRutina } from '@/app/actions/rutinas';
import type { MiembroRutina } from '@/lib/rutinas';
import { botonSecundarioCss, campoCss } from '@/components/clases/estilos';

export function BuscadorMiembrosRutina({ onElegir, bloqueado }: { onElegir: (miembro: MiembroRutina) => void; bloqueado: boolean }) {
  const [texto, setTexto] = useState('');
  const [resultados, setResultados] = useState<MiembroRutina[] | null>(null);
  const [error, setError] = useState('');
  const [cargando, iniciar] = useTransition();
  const consulta = useRef(0);

  function buscar(evento: FormEvent) {
    evento.preventDefault();
    if (cargando || bloqueado) return;
    if (texto.trim().length < 2 || texto.trim().length > 50) { setError('Escribe entre 2 y 50 caracteres.'); return; }
    const numero = ++consulta.current;
    setError(''); setResultados(null);
    iniciar(async () => {
      try {
        const res = await buscarMiembrosRutina(texto);
        if (consulta.current !== numero) return;
        if (res.ok) setResultados(res.datos); else setError(res.error);
      } catch { if (consulta.current === numero) setError('No se pudo conectar con el servidor. Intenta de nuevo.'); }
    });
  }

  return <section aria-label="Buscador de miembros" className="min-w-0 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
    <form onSubmit={buscar} className="flex flex-wrap items-end gap-3">
      <label className="min-w-0 flex-1 text-sm" htmlFor="buscar-miembro-rutina">Nombre o código del miembro
        <input id="buscar-miembro-rutina" className={campoCss} value={texto} maxLength={50} disabled={bloqueado}
          aria-invalid={!!error} aria-describedby={error ? 'buscar-error' : undefined}
          onChange={(e) => { consulta.current++; setTexto(e.target.value); setResultados(null); setError(''); }} />
      </label>
      <button type="submit" className={botonSecundarioCss} disabled={bloqueado || cargando || texto.trim().length < 2}>Buscar</button>
    </form>
    {cargando && <p role="status" className="mt-3 text-sm">Buscando miembros…</p>}
    {error && <p id="buscar-error" role="alert" className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>}
    {resultados?.length === 0 && <p role="status" className="mt-3 text-sm text-zinc-500">No se encontraron miembros.</p>}
    {!!resultados?.length && <ul className="mt-3 grid gap-2 sm:grid-cols-2">{resultados.map((m) => <li key={m.id} className="min-w-0">
      <button type="button" disabled={bloqueado} onClick={() => onElegir(m)} className={`${botonSecundarioCss} w-full break-words text-left`}>
        {m.nombre} {m.apellido} · {m.codigo}
      </button>
    </li>)}</ul>}
  </section>;
}
