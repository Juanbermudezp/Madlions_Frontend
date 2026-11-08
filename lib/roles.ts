/**
 * Roles del sistema y permisos de navegación.
 * El menú y las rutas protegidas se construyen a partir de estas tablas, así
 * que agregar una pantalla nueva es agregar una entrada acá.
 * Importante: esto decide lo que se muestra. Quien decide que nivel de autorización
 * tiene es el backend.
 */

export const ROLES = [
  'MIEMBRO',
  'ENTRENADOR',
  'RECEPCION',
  'ADMINISTRADOR',
] as const;

export type Rol = (typeof ROLES)[number];

// Usuario autenticado, tal como lo devuelve GET /auth/me.
export interface Usuario {
  id: string;
  correo: string;
  nombre: string;
  apellido: string;
  rol: Rol;
}

export function esRol(valor: unknown): valor is Rol {
  return typeof valor === 'string' && (ROLES as readonly string[]).includes(valor);
}

export const ETIQUETA_ROL: Record<Rol, string> = {
  MIEMBRO: 'Miembro',
  ENTRENADOR: 'Entrenador',
  RECEPCION: 'Recepción',
  ADMINISTRADOR: 'Administrador',
};

export const AREA_POR_ROL: Record<Rol, string> = {
  MIEMBRO: '/miembro',
  ENTRENADOR: '/entrenador',
  RECEPCION: '/recepcion',
  ADMINISTRADOR: '/admin',
};

export const INICIO_POR_ROL: Record<Rol, string> = {
  MIEMBRO: '/miembro/membresia',
  ENTRENADOR: '/entrenador/horarios',
  RECEPCION: '/recepcion/acceso',
  ADMINISTRADOR: '/admin/planes',
};

export interface OpcionMenu {
  etiqueta: string;
  href: string;
  historia: string;
}

export const MENU_POR_ROL: Record<Rol, OpcionMenu[]> = {
  MIEMBRO: [
    { etiqueta: 'Mi membresía', href: '/miembro/membresia', historia: 'H3' },
    { etiqueta: 'Agenda de clases', href: '/miembro/clases', historia: 'H5' },
    { etiqueta: 'Mis reservas', href: '/miembro/reservas', historia: 'H6' },
    { etiqueta: 'Sesiones personales', href: '/miembro/sesiones', historia: 'H9' },
    { etiqueta: 'Mis rutinas', href: '/miembro/rutinas', historia: 'H15' },
    { etiqueta: 'Mi progreso', href: '/miembro/progreso', historia: 'H16' },
    { etiqueta: 'Mis pagos', href: '/miembro/pagos', historia: 'H12' },
    { etiqueta: 'Estado del equipo', href: '/miembro/equipo', historia: 'H17' },
    { etiqueta: 'Avisos', href: '/miembro/avisos', historia: 'H23' },
  ],
  ENTRENADOR: [
    { etiqueta: 'Mis horarios', href: '/entrenador/horarios', historia: 'H8' },
    { etiqueta: 'Agenda de clases', href: '/entrenador/clases', historia: 'H4' },
    { etiqueta: 'Asistencia', href: '/entrenador/asistencia', historia: 'H19' },
    { etiqueta: 'Rutinas', href: '/entrenador/rutinas', historia: 'H14' },
    { etiqueta: 'Miembros', href: '/entrenador/miembros', historia: 'H14' },
    { etiqueta: 'Estado del equipo', href: '/entrenador/equipo', historia: 'H17' },
    { etiqueta: 'Mi desempeño', href: '/entrenador/desempeno', historia: 'H29' },
  ],
  RECEPCION: [
    { etiqueta: 'Control de acceso', href: '/recepcion/acceso', historia: 'H10' },
    { etiqueta: 'Miembros', href: '/recepcion/miembros', historia: 'H2' },
    { etiqueta: 'Compras y renovaciones', href: '/recepcion/membresias', historia: 'H2' },
    { etiqueta: 'Agenda de clases', href: '/recepcion/clases', historia: 'H4' },
    { etiqueta: 'Estado del equipo', href: '/recepcion/equipo', historia: 'H17' },
  ],
  ADMINISTRADOR: [
    { etiqueta: 'Planes', href: '/admin/planes', historia: 'H1' },
    { etiqueta: 'Clases', href: '/admin/clases', historia: 'H4' },
    { etiqueta: 'Miembros', href: '/admin/miembros', historia: 'H2' },
    { etiqueta: 'Cobros pendientes', href: '/admin/cobros', historia: 'H13' },
    { etiqueta: 'Estado del equipo', href: '/admin/equipo', historia: 'H17' },
    { etiqueta: 'Calificaciones', href: '/admin/calificaciones', historia: 'H21' },
    { etiqueta: 'Reportes', href: '/admin/reportes', historia: 'H26' },
  ],
};

export function rolDelArea(pathname: string): Rol | null {
  const entrada = (Object.entries(AREA_POR_ROL) as [Rol, string][]).find(
    ([, area]) => pathname === area || pathname.startsWith(`${area}/`),
  );
  return entrada ? entrada[0] : null;
}
