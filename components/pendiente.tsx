import { MENU_POR_ROL, type OpcionMenu } from '@/lib/roles';

/**
 * Marcador de una pantalla que todavía no existe.
 */

function buscarOpcion(href: string): OpcionMenu | undefined {
  return Object.values(MENU_POR_ROL)
    .flat()
    .find((opcion) => opcion.href === href);
}

export function Pendiente({ href }: { href: string }) {
  const opcion = buscarOpcion(href);

  return (
    <div className="flex flex-1 items-center justify-center">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-semibold">
          {opcion?.etiqueta ?? 'Pantalla no encontrada'}
        </h1>

        {opcion ? (
          <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
            Esta pantalla la construye la historia{' '}
            <span className="font-medium">{opcion.historia}</span>. El Módulo 0
            (H31) ya dejó lista la sesión, la protección por rol y el menú.
          </p>
        ) : (
          <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
            La ruta <code className="font-mono">{href}</code> no corresponde a
            ninguna opción del menú.
          </p>
        )}
      </div>
    </div>
  );
}
