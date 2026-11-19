/**
 * Tipos y utilidades del registro de asistencia (H19).
 * Se usan tanto en el servidor como en el navegador: no importan nada del
 * servidor de Next.
 */

export const ASISTENCIA_GUARDADA = 'Asistencia guardada';
export const SIN_ACTIVIDADES = 'No tienes clases ni sesiones para registrar asistencia';

export type TipoActividad = 'CLASE' | 'SESION';

/** Lo que el entrenador puede marcar; el backend no acepta SIN_REGISTRAR. */
export type Marca = 'ASISTIO' | 'NO_ASISTIO';

export type Asistencia = Marca | 'SIN_REGISTRAR';

export const ETIQUETA_MARCA: Record<Marca, string> = {
  ASISTIO: 'Asistió',
  NO_ASISTIO: 'No asistió',
};

export const ETIQUETA_TIPO_ACTIVIDAD: Record<TipoActividad, string> = {
  CLASE: 'Clase',
  SESION: 'Sesión personal',
};

export interface MiembroActividad {
  registroId: string;
  nombre: string;
  codigo: string;
  asistencia: Asistencia;
}

/** Actividad tal como la devuelve GET /asistencia/pendientes. */
export interface ActividadPendiente {
  tipo: TipoActividad;
  id: string;
  nombre: string;
  inicio: string;
  fin: string;
  miembros: MiembroActividad[];
}

export interface MarcaAsistencia {
  tipo: TipoActividad;
  registroId: string;
  asistencia: Marca;
}

/** Lo que el entrenador lleva elegido en la pantalla, por registro. */
export type Seleccion = Record<string, Asistencia>;

export function esMarca(valor: Asistencia): valor is Marca {
  return valor === 'ASISTIO' || valor === 'NO_ASISTIO';
}

/** Lo que el servidor ya tiene guardado, para comparar contra lo elegido. */
export function seleccionInicial(actividades: ActividadPendiente[]): Seleccion {
  const inicial: Seleccion = {};
  for (const actividad of actividades) {
    for (const miembro of actividad.miembros) {
      inicial[miembro.registroId] = miembro.asistencia;
    }
  }
  return inicial;
}

/**
 * Marcas de una actividad que cambiaron y hay que guardar. Mandar solo los
 * cambios evita reescribir el registro de quien ya estaba marcado igual.
 */
export function cambiosDe(
  actividad: ActividadPendiente,
  seleccion: Seleccion,
): MarcaAsistencia[] {
  return actividad.miembros
    .filter((miembro) => {
      const elegida = seleccion[miembro.registroId];
      return elegida !== miembro.asistencia && esMarca(elegida);
    })
    .map((miembro) => ({
      tipo: actividad.tipo,
      registroId: miembro.registroId,
      asistencia: seleccion[miembro.registroId] as Marca,
    }));
}

/** "Marcar todos como Asistió": solo toca a los que no tienen marca (criterio 4). */
export function marcarTodosSinRegistrar(
  actividad: ActividadPendiente,
  seleccion: Seleccion,
): Seleccion {
  const siguiente: Seleccion = { ...seleccion };
  for (const miembro of actividad.miembros) {
    if (siguiente[miembro.registroId] === 'SIN_REGISTRAR') {
      siguiente[miembro.registroId] = 'ASISTIO';
    }
  }
  return siguiente;
}

// Fechas

const ZONA_HORARIA = 'America/El_Salvador';

/** "miércoles 18 de noviembre, 08:00 a 09:00" en hora de El Salvador. */
export function etiquetaHorario(inicio: string, fin: string): string {
  const dia = new Intl.DateTimeFormat('es-SV', {
    timeZone: ZONA_HORARIA,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date(inicio));

  return `${dia}, ${hora(inicio)} a ${hora(fin)}`;
}

export function hora(instante: string): string {
  return new Intl.DateTimeFormat('es-SV', {
    timeZone: ZONA_HORARIA,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date(instante));
}

/**
 * Cuánto queda de la ventana de 24 horas después del fin, en texto corto.
 * Sirve para que el entrenador sepa que lo que no marque hoy se le cierra.
 */
export function restanteDeLaVentana(fin: string, ahora: Date = new Date()): string {
  const limite = new Date(fin).getTime() + 24 * 60 * 60 * 1000;
  const minutos = Math.floor((limite - ahora.getTime()) / 60_000);

  if (minutos <= 0) return 'La ventana de registro ya cerró';
  if (minutos < 60) return `Quedan ${minutos} min para registrar`;

  const horas = Math.floor(minutos / 60);
  return horas === 1 ? 'Queda 1 hora para registrar' : `Quedan ${horas} horas para registrar`;
}
