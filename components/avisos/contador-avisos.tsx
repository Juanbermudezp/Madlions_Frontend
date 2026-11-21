'use client';

import { useEffect } from 'react';
import { contarAvisosNoLeidos } from '@/app/actions/avisos';
import { INTERVALO_CONTADOR_MS } from '@/lib/avisos';
import { useSesion } from '@/stores/sesion';

/**
 * FE-23.2 · Mantiene al día el contador de avisos sin leer del store: lo pide al
 * montarse y luego cada 30 segundos. No renderiza nada; la insignia la dibujan
 * el menú y la campana del encabezado.
 *
 * Solo consulta mientras hay un miembro con sesión: al cerrar sesión el store
 * queda sin usuario y el intervalo se detiene.
 */
export function ContadorAvisos() {
  const esMiembro = useSesion((estado) => estado.usuario?.rol === 'MIEMBRO');
  const establecerAvisos = useSesion((estado) => estado.establecerAvisos);

  useEffect(() => {
    if (!esMiembro) return;
    let activo = true;

    async function actualizar() {
      const resultado = await contarAvisosNoLeidos();
      // Si falla (p. ej. la sesión venció), se conserva el último valor.
      if (activo && resultado.ok) establecerAvisos(resultado.noLeidos);
    }

    void actualizar();
    const intervalo = setInterval(() => void actualizar(), INTERVALO_CONTADOR_MS);
    return () => {
      activo = false;
      clearInterval(intervalo);
    };
  }, [esMiembro, establecerAvisos]);

  return null;
}
