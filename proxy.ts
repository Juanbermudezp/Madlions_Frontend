import { NextResponse, type NextRequest } from 'next/server';
import { COOKIE_REFRESH, COOKIE_TOKEN, leerPayload } from '@/lib/token';
import { INICIO_POR_ROL } from '@/lib/roles';

const RUTAS_PUBLICAS = ['/login'];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const esPublica = RUTAS_PUBLICAS.includes(pathname);

  const token = request.cookies.get(COOKIE_TOKEN)?.value;
  const payload = leerPayload(token);
  const vencido = !payload || payload.exp * 1000 <= Date.now();

  if (vencido) {
    if (esPublica) return NextResponse.next();

    const respuesta = NextResponse.redirect(new URL('/login', request.nextUrl));
    respuesta.cookies.delete(COOKIE_TOKEN);
    respuesta.cookies.delete(COOKIE_REFRESH);
    return respuesta;
  }

  if (esPublica || pathname === '/') {
    return NextResponse.redirect(
      new URL(INICIO_POR_ROL[payload.rol], request.nextUrl),
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
