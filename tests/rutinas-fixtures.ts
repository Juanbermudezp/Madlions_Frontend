import type { DatosRutina, MiembroRutina, Rutina } from '@/lib/rutinas';

export const miembro: MiembroRutina = { id: '11111111-1111-4111-8111-111111111111', nombre: 'Ana', apellido: 'Paz', codigo: 'MBR-000001' };
export const datos: DatosRutina = { nombre: 'Fuerza general', objetivo: 'Mejorar fuerza', fechaInicio: '2099-11-18',
  dias: [{ nombre: 'Pecho', ejercicios: [{ nombre: 'Press banca', series: 4, repeticiones: 8, descansoSeg: 120 }] }] };
export const rutina: Rutina = { ...datos, id: '22222222-2222-4222-8222-222222222222', miembroId: miembro.id,
  entrenadorId: '33333333-3333-4333-8333-333333333333', miembro, creadoEn: '2026-11-17T12:00:00Z', actualizadoEn: '2026-11-17T12:00:00Z',
  dias: [{ ...datos.dias[0], id: 'dia-1', orden: 1, ejercicios: [{ ...datos.dias[0].ejercicios[0], id: 'ej-1', orden: 1 }] }],
};
