import { redirect } from 'next/navigation';
import { obtenerUsuario } from '@/lib/dal';
import { AREA_POR_ROL } from '@/lib/roles';
import { consultaMaquinas, filtrosDesdeParams, type ParametrosFiltro } from '@/lib/maquinas';

// FE-17.1: /equipo es la ruta de la ficha y la que conviene compartir, porque sirve para cualquier rol. 
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<ParametrosFiltro>;
}) {
  const filtros = filtrosDesdeParams(await searchParams);
  const usuario = await obtenerUsuario();

  if (!usuario) redirect('/login');
  redirect(`${AREA_POR_ROL[usuario.rol]}/equipo${consultaMaquinas(filtros)}`);
}
