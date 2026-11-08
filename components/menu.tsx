'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAvisosNoLeidos } from '@/stores/sesion';
import type { OpcionMenu } from '@/lib/roles';

// Menú de navegación. Recibe ya filtradas las opciones que la tabla de permisos le da al rol.

export function Menu({ opciones }: { opciones: readonly OpcionMenu[] }) {
  const pathname = usePathname();
  const avisosNoLeidos = useAvisosNoLeidos();

  return (
    <nav aria-label="Menú principal" className="flex flex-col gap-1">
      {opciones.map((opcion) => {
        const activa =
          pathname === opcion.href || pathname.startsWith(`${opcion.href}/`);

        return (
          <Link
            key={opcion.href}
            href={opcion.href}
            aria-current={activa ? 'page' : undefined}
            className={`flex items-center justify-between rounded-md px-3 py-2 text-sm transition-colors ${
              activa
                ? 'bg-zinc-900 font-medium text-white dark:bg-zinc-100 dark:text-zinc-900'
                : 'text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800'
            }`}
          >
            <span>{opcion.etiqueta}</span>

            {opcion.historia === 'H23' && avisosNoLeidos > 0 && (
              <span className="ml-2 rounded-full bg-red-600 px-2 py-0.5 text-xs font-medium text-white">
                {avisosNoLeidos}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
