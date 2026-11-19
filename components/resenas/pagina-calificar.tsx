import { redirect } from 'next/navigation';
import { api, SesionInvalidaError } from '@/lib/api';
import type { PendientePorCalificar } from '@/lib/resenas';
import { ErrorCarga } from '@/components/clases/estado-carga';
import { ListaCalificar } from './lista-calificar';

// Carga los pendientes del miembro en el servidor (con el token de la cookie).
export async function PaginaCalificar() {
  let pendientes: PendientePorCalificar[] | null = null;
  let error = '';
  let sesionVencida = false;

  try {
    pendientes = await api<PendientePorCalificar[]>('resenas/pendientes');
  } catch (e) {
    if (e instanceof SesionInvalidaError) sesionVencida = true;
    else error = e instanceof Error ? e.message : '';
  }

  // redirect() lanza una excepción de control: va fuera del try.
  if (sesionVencida) redirect('/login');
  if (!pendientes) {
    return <ErrorCarga mensaje={`No se pudieron cargar tus pendientes. ${error}`} />;
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Pendientes de calificar</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Las clases y sesiones a las que asististe en los últimos 7 días.
        </p>
      </div>

      <ListaCalificar pendientes={pendientes} />
    </div>
  );
}
