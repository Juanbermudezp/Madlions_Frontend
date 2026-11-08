'use client';

import { useEffect } from 'react';
import { useSesion } from '@/stores/sesion';
import type { Usuario } from '@/lib/roles';

/**
 * Sincroniza el store de Zustand con el usuario que el servidor verificó
 * contra GET /auth/me. Va en el layout raíz. No renderiza nada, solo mantiene el store al día para
 * los componentes de cliente.
 */

export function SesionProvider({
  usuario,
  children,
}: {
  usuario: Usuario | null;
  children: React.ReactNode;
}) {
  const establecerUsuario = useSesion((estado) => estado.establecerUsuario);
  const limpiar = useSesion((estado) => estado.limpiar);

  useEffect(() => {
    if (usuario) {
      establecerUsuario(usuario);
    } else {
      // Se cerró la sesión o venció el token: también se va el contador de avisos.
      limpiar();
    }
  }, [usuario, establecerUsuario, limpiar]);

  return children;
}
