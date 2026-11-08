import { redirect } from 'next/navigation';
import { obtenerUsuario } from '@/lib/dal';
import { INICIO_POR_ROL } from '@/lib/roles';

export default async function Inicio() {
  const usuario = await obtenerUsuario();

  if (!usuario) redirect('/login');
  redirect(INICIO_POR_ROL[usuario.rol]);
}
