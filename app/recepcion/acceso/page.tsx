import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { listarAccesosHoy } from '@/app/actions/accesos';
import { ControlAcceso } from '@/components/accesos/control-acceso';
import { ErrorCarga } from '@/components/clases/estado-carga';

export const metadata: Metadata = { title: 'Control de acceso | Madlions' };

/** FE-10.1: registro de ingresos y salidas de los miembros (recepción). */
export default async function Page() {
    const inicial = await listarAccesosHoy();
    if (!inicial.ok && inicial.estado === 401) redirect('/login');

    return (
        <div className="flex flex-col gap-6">
            <header>
                <h1 className="text-2xl font-semibold">Control de acceso</h1>
                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                    Busca al miembro y registra su ingreso o su salida.
                </p>
            </header>

            {inicial.ok ? <ControlAcceso inicial={inicial.datos} /> : <ErrorCarga mensaje={inicial.error} />}
        </div>
    );
}