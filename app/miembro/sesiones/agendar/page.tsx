import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { listarEntrenadores } from '@/app/actions/sesiones';
import { ErrorCarga } from '@/components/clases/estado-carga';
import { AgendarSesion } from '@/components/sesiones/agendar-sesion';

export const metadata: Metadata = { title: 'Agendar sesión | Madlions' };

/** FE-9.1: el miembro elige entrenador y bloque, y confirma la sesión. */
export default async function Page() {
    const entrenadores = await listarEntrenadores();
    if (!entrenadores.ok && entrenadores.estado === 401) redirect('/login');

    return (
        <div className="flex flex-col gap-6">
            <header>
                <h1 className="text-2xl font-semibold">Agendar sesión</h1>
                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                    Elige un entrenador y uno de sus horarios disponibles de los próximos 14 días.
                </p>
            </header>

            {entrenadores.ok ? (
                <AgendarSesion entrenadores={entrenadores.datos} />
            ) : (
                <ErrorCarga mensaje={entrenadores.error} />
            )}
        </div>
    );
}