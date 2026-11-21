'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { InsigniaAvisos } from '@/components/avisos/campana-avisos';
import { IconoCampana } from '@/components/avisos/iconos';
import type { OpcionMenu } from '@/lib/roles';

// Menú de navegación. Recibe ya filtradas las opciones que la tabla de permisos le da al rol.

export function Menu({ opciones }: { opciones: readonly OpcionMenu[] }) {
  const pathname = usePathname();

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
            <span className="flex items-center gap-2">
              {/* FE-23.2: ícono de avisos con su contador en el menú del miembro. */}
              {opcion.historia === 'H23' && <IconoCampana className="size-4" />}
              <span>{opcion.etiqueta}</span>
            </span>

            {/* FE-23.2: contador de avisos sin leer ("99+" desde 100, oculto en 0). */}
            {opcion.historia === 'H23' && <InsigniaAvisos className="ml-2" />}
          </Link>
        );
      })}
    </nav>
  );
}
