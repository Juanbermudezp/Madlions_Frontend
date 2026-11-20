import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { obtenerSemanaHorarios } from '@/app/actions/horarios';
import { AccesoDenegado } from '@/components/acceso-denegado';
import { ErrorCarga } from '@/components/clases/estado-carga';
import { CalendarioHorarios } from '@/components/horarios/calendario-horarios';
import { hoyLocal } from '@/lib/horarios';

export const metadata: Metadata = { title: 'Mis horarios | Madlions' };

/** FE-8.1: calendario semanal del entrenador (el layout ya limita /entrenador al ENTRENADOR). */
export default async function Page() {
    const inicial = await obtenerSemanaHorarios(hoyLocal());
    if (!inicial.ok && inicial.estado === 401) redirect('/login');
    if (!inicial.ok && inicial.estado === 403) return <AccesoDenegado />;

    return (
        <div className="flex w-full flex-col gap-4">
            <header>
                <h1 className="text-2xl font-semibold">Mis horarios</h1>
                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                    Define los bloques en los que los miembros pueden agendar sesiones contigo. Toca un espacio libre para agregar uno.
                </p>
            </header>
            {inicial.ok ? <CalendarioHorarios inicial={inicial} /> : <ErrorCarga mensaje={inicial.error} />}
        </div>
    );
}