import { redirect } from 'next/navigation';
import { api, SesionInvalidaError } from '@/lib/api';
import {
  esFecha,
  hoyLocal,
  lunesDe,
  type ClaseAgenda,
  type EntrenadorResumen,
  type TipoClase,
} from '@/lib/clases';
import { AgendaSemanal } from './agenda-semanal';
import { ErrorCarga } from './estado-carga';

/**
 * Carga la agenda de una semana en el servidor (con el token de la cookie) y
 * la entrega a la vista. El administrador además recibe los tipos de clase y
 * los entrenadores para el formulario.
 */
export async function PaginaAgenda({
  semana,
  rutaBase,
  editable,
}: {
  semana?: string;
  rutaBase: string;
  editable: boolean;
}) {
  const hoy = hoyLocal();
  const lunes = lunesDe(semana && esFecha(semana) ? semana : hoy);

  let datos: { clases: ClaseAgenda[]; tipos: TipoClase[]; entrenadores: EntrenadorResumen[] } | null =
    null;
  let error = '';
  let sesionVencida = false;

  try {
    const [clases, tipos, entrenadores] = await Promise.all([
      api<ClaseAgenda[]>(`clases?semana=${lunes}`),
      editable ? api<TipoClase[]>('tipos-clase') : Promise.resolve([]),
      editable ? api<EntrenadorResumen[]>('clases/entrenadores') : Promise.resolve([]),
    ]);
    datos = { clases, tipos, entrenadores };
  } catch (e) {
    if (e instanceof SesionInvalidaError) sesionVencida = true;
    else error = e instanceof Error ? e.message : 'No se pudo cargar la agenda.';
  }

  // redirect() lanza una excepción de control: va fuera del try.
  if (sesionVencida) redirect('/login');
  if (!datos) return <ErrorCarga mensaje={`No se pudo cargar la agenda. ${error}`} />;

  return (
    <AgendaSemanal
      lunes={lunes}
      hoy={hoy}
      rutaBase={rutaBase}
      editable={editable}
      {...datos}
    />
  );
}
