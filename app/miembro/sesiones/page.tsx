import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { listarMisSesiones } from '@/app/actions/sesiones';
import { ErrorCarga } from '@/components/clases/estado-carga';
import { botonPrimarioCss } from '@/components/clases/estilos';
import { MisSesiones } from '@/components/sesiones/mis-sesiones';
import { RUTA_AGENDAR } from '@/lib/sesiones';

export const metadata: Metadata = { title: 'Mis sesiones | Madlions' };

/** FE-9.2: sesiones personales próximas y pasadas del miembro autenticado. */
export default async function Page() {
    const resultado = await listarMisSesiones();
    if (!resultado.ok && resultado.estado === 401) redirect('/login');

    const hayAlguna = resultado.ok && resultado.datos.length > 0;

    return (
        <div className="flex flex-col gap-6">
            <header className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-semibold">Mis sesiones</h1>
                    <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                        Tus sesiones personales con entrenador. Las sesiones no se pueden cancelar.
                    </p>
                </div>
                {hayAlguna && (
                    <Link href={RUTA_AGENDAR} className={botonPrimarioCss}>
                        Agendar sesión
                    </Link>
                )}
            </header>

            {resultado.ok ? (
                <MisSesiones sesiones={resultado.datos} />
            ) : (
                <ErrorCarga mensaje={resultado.error} />
            )}
        </div>
    );
}