'use client';

import Link from 'next/link';
import { textoContador } from '@/lib/avisos';
import { useAvisosNoLeidos } from '@/stores/sesion';
import { IconoCampana } from './iconos';

/** Insignia roja con la cantidad de avisos sin leer. No se dibuja en 0 (FE-23.2). */
export function InsigniaAvisos({ className = '' }: { className?: string }) {
  const texto = textoContador(useAvisosNoLeidos());
  if (!texto) return null;
  return (
    <span
      className={`rounded-full bg-red-600 px-2 py-0.5 text-xs font-medium text-white tabular-nums ${className}`}
    >
      {texto}
      <span className="sr-only"> sin leer</span>
    </span>
  );
}

/**
 * FE-23.2 · Campana del encabezado para pantallas angostas, donde el menú
 * lateral no se muestra. Lleva a la bandeja.
 */
export function CampanaAvisos() {
  return (
    <Link
      href="/miembro/avisos"
      aria-label="Avisos"
      className="relative inline-flex size-9 items-center justify-center rounded-md text-zinc-600 hover:bg-zinc-100 sm:hidden dark:text-zinc-300 dark:hover:bg-zinc-800"
    >
      <IconoCampana className="size-5" />
      <InsigniaAvisos className="absolute -top-1 -right-1 px-1.5" />
    </Link>
  );
}
