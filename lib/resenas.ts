/**
 * Tipos y utilidades de la calificación de clases y sesiones (H20).
 * Se usan tanto en el servidor como en el navegador: no importan nada del
 * servidor de Next.
 */

export const GRACIAS_POR_TU_RESENA = 'Gracias por tu reseña';
export const SIN_PENDIENTES = 'No tienes clases ni sesiones por calificar';
export const CALIFICA_AL_MENOS_UN_ASPECTO = 'Califica al menos un aspecto.';

export const MAXIMO_COMENTARIO = 500;

export type TipoActividad = 'CLASE' | 'SESION';

/** Los tres aspectos que se califican por separado. */
export const ASPECTOS = ['calActividad', 'calEntrenador', 'calInstalaciones'] as const;

export type Aspecto = (typeof ASPECTOS)[number];

export const ETIQUETA_ASPECTO: Record<Aspecto, string> = {
  calActividad: 'Clase o sesión',
  calEntrenador: 'Entrenador',
  calInstalaciones: 'Instalaciones',
};

/** Clase o sesión tal como la devuelve GET /resenas/pendientes. */
export interface PendientePorCalificar {
  tipo: TipoActividad;
  registroId: string;
  nombre: string;
  entrenador: string;
  fin: string;
  fechaLimite: string;
}

/** Lo que el formulario lleva elegido para una actividad. */
export type Calificaciones = Partial<Record<Aspecto, number>>;

export interface DatosResena extends Calificaciones {
  tipo: TipoActividad;
  registroId: string;
  comentario?: string;
}

/** El botón Enviar se habilita al elegir al menos una calificación. */
export function hayAlgunaCalificacion(calificaciones: Calificaciones): boolean {
  return ASPECTOS.some((aspecto) => calificaciones[aspecto] !== undefined);
}

export function esCalificacionValida(valor: number): boolean {
  return Number.isInteger(valor) && valor >= 1 && valor <= 5;
}

/** Arma el cuerpo de POST /resenas dejando fuera lo que no se eligió. */
export function cuerpoResena(
  pendiente: PendientePorCalificar,
  calificaciones: Calificaciones,
  comentario: string,
): DatosResena {
  const texto = comentario.trim();

  return {
    tipo: pendiente.tipo,
    registroId: pendiente.registroId,
    ...Object.fromEntries(
      ASPECTOS.filter((aspecto) => calificaciones[aspecto] !== undefined).map((aspecto) => [
        aspecto,
        calificaciones[aspecto],
      ]),
    ),
    ...(texto ? { comentario: texto } : {}),
  };
}

// Fechas

const ZONA_HORARIA = 'America/El_Salvador';

/** "lunes 17 de noviembre, 08:00" en hora de El Salvador. */
export function etiquetaActividad(fin: string): string {
  return new Intl.DateTimeFormat('es-SV', {
    timeZone: ZONA_HORARIA,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date(fin));
}

/** "24 de noviembre" para el aviso del plazo. */
export function etiquetaFechaLimite(fechaLimite: string): string {
  return new Intl.DateTimeFormat('es-SV', {
    timeZone: ZONA_HORARIA,
    day: 'numeric',
    month: 'long',
  }).format(new Date(fechaLimite));
}

/**
 * Cuántos días quedan de plazo, para avisar cuando apremia. Cuenta por días
 * calendario en hora de El Salvador, que es como lo lee el miembro.
 */
export function diasRestantes(fechaLimite: string, ahora: Date = new Date()): number {
  const dia = (instante: Date) =>
    new Intl.DateTimeFormat('en-CA', {
      timeZone: ZONA_HORARIA,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(instante);

  const hasta = new Date(`${dia(new Date(fechaLimite))}T00:00:00Z`).getTime();
  const hoy = new Date(`${dia(ahora)}T00:00:00Z`).getTime();

  return Math.round((hasta - hoy) / (24 * 60 * 60 * 1000));
}
