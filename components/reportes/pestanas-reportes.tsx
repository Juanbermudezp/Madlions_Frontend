'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

/** Pestañas de /admin/reportes (FE-26.1). Cada reporte es su propia ruta. */
const PESTANAS = [
  { href: '/admin/reportes', etiqueta: 'Ocupación', historia: 'H26' },
  { href: '/admin/reportes/ingresos', etiqueta: 'Ingresos', historia: 'H27' },
  { href: '/admin/reportes/renovacion', etiqueta: 'Renovación', historia: 'H28' },
  { href: '/admin/reportes/desempeno', etiqueta: 'Desempeño', historia: 'H29' },
] as const;

export function PestanasReportes() {
  const ruta = usePathname();
  return (
    <nav
      aria-label="Reportes"
      className="flex w-fit max-w-full flex-wrap gap-1 rounded-xl border border-zinc-200 bg-zinc-100 p-1 dark:border-zinc-800 dark:bg-zinc-900"
    >
      {PESTANAS.map(({ href, etiqueta }) => {
        const activa = ruta === href;
        return (
          <Link
            key={href}
            href={href}
            aria-current={activa ? 'page' : undefined}
            className={`whitespace-nowrap rounded-lg px-4 py-1.5 text-sm transition-colors ${
              activa
                ? 'bg-white font-medium text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-white'
                : 'text-zinc-600 hover:bg-white/60 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100'
            }`}
          >
            {etiqueta}
          </Link>
        );
      })}
    </nav>
  );
}
