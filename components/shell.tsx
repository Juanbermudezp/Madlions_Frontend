import { logout } from '@/app/actions/auth';
import { obtenerUsuario } from '@/lib/dal';
import { ETIQUETA_ROL, MENU_POR_ROL } from '@/lib/roles';
import { Menu } from './menu';

/**
 * Marco de las pantallas con sesión.
 * Va dentro de <RutaProtegida>, así que cuando se renderiza ya hay un usuario
 * con un rol permitido.
 */

export async function Shell({ children }: { children: React.ReactNode }) {
  const usuario = await obtenerUsuario();
  if (!usuario) return null;

  return (
    <div className="flex min-h-full flex-1">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-zinc-200 p-4 sm:flex dark:border-zinc-800">
        <p className="px-3 pb-4 text-lg font-semibold tracking-tight">Madlions</p>
        <Menu opciones={MENU_POR_ROL[usuario.rol]} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-4 border-b border-zinc-200 px-6 py-3 dark:border-zinc-800">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">
              {usuario.nombre} {usuario.apellido}
            </p>
            <p className="text-xs text-zinc-500">{ETIQUETA_ROL[usuario.rol]}</p>
          </div>

          <form action={logout}>
            <button
              type="submit"
              className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
            >
              Cerrar sesión
            </button>
          </form>
        </header>

        <main className="flex flex-1 flex-col p-6">{children}</main>
      </div>
    </div>
  );
}
