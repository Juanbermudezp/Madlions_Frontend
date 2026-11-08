'use server';

import { redirect } from 'next/navigation';
import { api, ApiError, SesionInvalidaError } from '@/lib/api';
import {
  borrarSesion,
  crearSesion,
  obtenerRefreshToken,
} from '@/lib/session';
import { INICIO_POR_ROL, type Usuario } from '@/lib/roles';

export type LoginState = {
  error?: string;
  email?: string;
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface RespuestaLogin {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: Usuario;
}

export async function login(
  _prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');

  if (!email || !password) {
    return { error: 'Ingresa tu correo y contraseña.', email };
  }
  if (!EMAIL_REGEX.test(email)) {
    return { error: 'Ingresa un correo válido.', email };
  }

  let datos: RespuestaLogin;
  try {
    datos = await api<RespuestaLogin>('auth/login', {
      method: 'POST',
      body: { email, password },
      conToken: false,
    });
  } catch (error) {
    if (error instanceof SesionInvalidaError) {
      return { error: 'Correo o contraseña incorrectos.', email };
    }
    if (error instanceof ApiError) {
      console.error('Error al iniciar sesión:', error.estado, error.message);
    } else {
      console.error('Error al iniciar sesión:', error);
    }
    return { error: 'No se pudo iniciar sesión. Intenta más tarde.', email };
  }

  await crearSesion(datos.accessToken, datos.refreshToken, datos.expiresIn);

  redirect(INICIO_POR_ROL[datos.user.rol]);
}

export async function logout() {
  const refreshToken = await obtenerRefreshToken();

  if (refreshToken) {
    try {
      await api<void>('auth/logout', {
        method: 'POST',
        body: { refreshToken },
        conToken: false,
      });
    } catch (error) {
      console.error('Error al cerrar sesión en el backend:', error);
    }
  }

  await borrarSesion();
  redirect('/login');
}
