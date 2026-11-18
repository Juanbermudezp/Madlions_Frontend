import { redirect } from 'next/navigation';
import { obtenerUsuario } from '@/lib/dal';
import { AREA_POR_ROL } from '@/lib/roles';
import { puedeGestionarMaquinas } from '@/lib/maquinas';

/**
 * FE-18.1: /equipo/:id es la ruta de la ficha. Lleva al detalle del área del
 * rol; al miembro y a recepción, que no tienen detalle, los deja en el
 * listado.
 */
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const usuario = await obtenerUsuario();

  if (!usuario) redirect('/login');

  const area = AREA_POR_ROL[usuario.rol];
  redirect(puedeGestionarMaquinas(usuario.rol) ? `${area}/equipo/${id}` : `${area}/equipo`);
}
