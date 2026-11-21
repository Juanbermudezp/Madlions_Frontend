import { redirect } from 'next/navigation';
import { obtenerUsuario } from '@/lib/dal';
import { AccesoDenegado } from './acceso-denegado';
import type { Rol } from '@/lib/roles';

/**
 * Envuelve una ruta y la limita a una lista de roles.
 * Es un Server Component, el rol se compara contra lo que devolvió
 * GET /auth/me. Quien autoriza de verdad cada operación es el
 * backend con @Roles y assertOwnership.
 */

export async function RutaProtegida({
  roles,
  children,
}: {
  roles: readonly Rol[];
  children: React.ReactNode;
}) {
  const usuario = await obtenerUsuario();

  if (!usuario) redirect('/login');

  if (!roles.includes(usuario.rol)) {
    return <AccesoDenegado rol={usuario.rol} />;
  }

  return children;
}
