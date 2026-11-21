import { redirect } from 'next/navigation';
import { api, SesionInvalidaError } from '@/lib/api';
import type { ActividadPendiente } from '@/lib/asistencia';
import { ErrorCarga } from '@/components/clases/estado-carga';
import { ListaAsistencia } from './lista-asistencia';

// Carga las actividades del entrenador en el servidor (con el token de la cookie).
export async function PaginaAsistencia() {
  let actividades: ActividadPendiente[] | null = null;
  let error = '';
  let sesionVencida = false;

  try {
    actividades = await api<ActividadPendiente[]>('asistencia/pendientes');
  } catch (e) {
    if (e instanceof SesionInvalidaError) sesionVencida = true;
    else error = e instanceof Error ? e.message : '';
  }

  // redirect() lanza una excepción de control: va fuera del try.
  if (sesionVencida) redirect('/login');
  if (!actividades) {
    return <ErrorCarga mensaje={`No se pudo cargar la asistencia. ${error}`} />;
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Asistencia</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Tus clases y sesiones que ya empezaron y terminaron hace 24 horas o menos.
        </p>
      </div>

      <ListaAsistencia actividades={actividades} />
    </div>
  );
}
