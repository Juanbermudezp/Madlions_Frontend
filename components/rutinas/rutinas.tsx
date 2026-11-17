'use client';

import { useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import { listarRutinas } from '@/app/actions/rutinas';
import { formatearFecha } from '@/lib/membresias';
import type { MiembroRutina, ResultadoRutina, Rutina } from '@/lib/rutinas';
import { botonPrimarioCss, botonSecundarioCss } from '@/components/clases/estilos';
import { BuscadorMiembrosRutina } from './buscador-miembros';
import { EditorRutina } from './editor-rutina';

export function Rutinas({ inicial }: { inicial: ResultadoRutina<Rutina[]> }) {
  const [lista, setLista] = useState(inicial.ok ? inicial.datos : []);
  const [error, setError] = useState(inicial.ok ? '' : inicial.error);
  const [miembro, setMiembro] = useState<MiembroRutina | null>(null);
  const [editando, setEditando] = useState<Rutina | null>(null);
  const [sesionEditor, setSesionEditor] = useState(0);
  const [mensaje, setMensaje] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [pagina, setPagina] = useState(1);
  const [cargando, iniciar] = useTransition();
  const consulta = useRef(0);

  function recargar() {
    const actual = ++consulta.current;
    iniciar(async () => {
      try {
        const res = await listarRutinas();
        if (actual !== consulta.current) return;
        if (res.ok) { setLista(res.datos); setPagina((p) => Math.min(p, Math.max(1, Math.ceil(res.datos.length / 20)))); setError(''); } else setError(res.error);
      } catch { if (actual === consulta.current) setError('No se pudo conectar con el servidor. Intenta de nuevo.'); }
    });
  }
  function nueva() { setEditando(null); setMiembro(null); setMensaje(''); setSesionEditor((s) => s + 1); }
  function guardada(rutina: Rutina, texto: string) {
    consulta.current++; // Descarta una consulta iniciada antes de la escritura.
    setLista((previa) => [rutina, ...previa.filter((r) => r.id !== rutina.id)]);
    setPagina(1);
    setEditando(rutina); setMiembro(rutina.miembro); setMensaje(texto); setSesionEditor((s) => s + 1);
    recargar();
  }

  return <div className="flex min-w-0 flex-col gap-6">
    <header className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-2xl font-semibold">Rutinas</h1>
      <p className="mt-1 text-sm text-zinc-500">Crea y asigna rutinas a tus miembros.</p></div>
      <button type="button" disabled={ocupado} className={botonPrimarioCss} onClick={nueva}>Nueva rutina</button></header>
    {mensaje && <p role="status" className="rounded-lg bg-emerald-50 p-4 text-sm text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">{mensaje}</p>}
    <BuscadorMiembrosRutina key={`busqueda-${sesionEditor}`} onElegir={setMiembro} bloqueado={ocupado || !!editando} />
    {miembro && <p className="break-words text-sm" role="status">Miembro seleccionado: <strong>{miembro.nombre} {miembro.apellido}</strong> · {miembro.codigo}</p>}
    <div className="grid min-w-0 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
      <section aria-label="Rutinas creadas" className="min-w-0 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-lg font-semibold">Creadas por mí</h2>
          <button type="button" disabled={ocupado || cargando} className={botonSecundarioCss} onClick={recargar}>Actualizar</button></div>
        {cargando && <p role="status" className="text-sm text-zinc-500">Cargando rutinas…</p>}
        {error && <div role="alert" className="break-words rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">{error}
          <button type="button" className="ml-2 underline" disabled={ocupado || cargando} onClick={recargar}>Reintentar</button></div>}
        {!error && !cargando && !lista.length && <p className="rounded-lg border border-dashed border-zinc-300 p-4 text-sm text-zinc-500 dark:border-zinc-700">Aún no has creado rutinas.</p>}
        <ul className="space-y-3">{lista.slice((pagina - 1) * 20, pagina * 20).map((rutina) => <li key={rutina.id} className="min-w-0 space-y-2 break-words rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
          <h3 className="font-semibold">{rutina.nombre}</h3><p className="text-sm text-zinc-600 dark:text-zinc-400">{rutina.objetivo}</p>
          <p className="text-sm">{rutina.miembro.nombre} {rutina.miembro.apellido} · {rutina.miembro.codigo}</p>
          <p className="text-xs text-zinc-500">Inicio: {formatearFecha(rutina.fechaInicio)}</p>
          <button type="button" disabled={ocupado} className={botonSecundarioCss} onClick={() => { setEditando(rutina); setMiembro(rutina.miembro); setMensaje(''); setSesionEditor((s) => s + 1); }}>Editar</button>
          <Link href={`/entrenador/miembros/${rutina.miembroId}/progreso`} className="ml-3 inline-block text-sm underline">Ver progreso</Link>
        </li>)}</ul>
        {lista.length > 20 && <nav aria-label="Páginas de rutinas" className="flex flex-wrap items-center gap-2 text-sm">
          <button type="button" className={botonSecundarioCss} disabled={ocupado || pagina === 1} onClick={() => setPagina((p) => p - 1)}>Anterior</button>
          <span>Página {pagina} de {Math.ceil(lista.length / 20)}</span>
          <button type="button" className={botonSecundarioCss} disabled={ocupado || pagina * 20 >= lista.length} onClick={() => setPagina((p) => p + 1)}>Siguiente</button>
        </nav>}
      </section>
      <EditorRutina key={sesionEditor} rutina={editando} miembro={miembro} onGuardado={guardada} onCancelar={nueva} onOcupado={setOcupado} />
    </div>
  </div>;
}
