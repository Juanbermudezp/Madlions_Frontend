import Link from 'next/link';
import { INICIO_POR_ROL, type Rol } from '@/lib/roles';

/**
 * Página "Acceso denegado". Es lo que ve un usuario con sesión válida
 * cuyo rol no tiene permiso sobre la pantalla, igual que el 403 del backend.
 */

export function AccesoDenegado({
  rol,
  mensaje = 'No tienes permiso para ver esta página.',
}: {
  rol?: Rol;
  mensaje?: string;
}) {
  return (
    <div className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-md text-center">
        <p className="text-sm font-medium text-red-600">403</p>
        <h1 className="mt-2 text-2xl font-semibold">Acceso denegado</h1>
        <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">{mensaje}</p>

        {rol && (
          <Link
            href={INICIO_POR_ROL[rol]}
            className="mt-6 inline-block rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background"
          >
            Volver a mi inicio
          </Link>
        )}
      </div>
    </div>
  );
}
