'use client';

import { create } from 'zustand';
import type { Usuario } from '@/lib/roles';

/**
 * Store de sesión con Zustand.
 * Qué guarda el usuario autenticado y el contador de avisos no leídos. 
 * Lo llena `SesionProvider` con lo que el servidor verificó contra GET /auth/me.
 * No guarda el token, este vive en una cookie httpOnly que
 * el JavaScript del navegador no puede leer..
 */
interface EstadoSesion {
  usuario: Usuario | null;
  avisosNoLeidos: number;

  establecerUsuario: (usuario: Usuario | null) => void;
  establecerAvisos: (cantidad: number) => void;
  limpiar: () => void;
}

export const useSesion = create<EstadoSesion>()((set) => ({
  usuario: null,
  avisosNoLeidos: 0,

  establecerUsuario: (usuario) => set({ usuario }),
  establecerAvisos: (avisosNoLeidos) => set({ avisosNoLeidos }),
  limpiar: () => set({ usuario: null, avisosNoLeidos: 0 }),
}));

export const useUsuario = () => useSesion((estado) => estado.usuario);
export const useAvisosNoLeidos = () => useSesion((estado) => estado.avisosNoLeidos);
