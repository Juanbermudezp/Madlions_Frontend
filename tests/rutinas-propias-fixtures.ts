import type { RutinaPropiaDetalle, RutinaPropiaResumen } from '@/lib/rutinas-propias';

export const rutinaPropia: RutinaPropiaResumen = {
  id: '11111111-1111-4111-8111-111111111111', nombre: 'Fuerza general', objetivo: 'Mejorar fuerza y técnica', fechaInicio: '2026-11-18',
  entrenador: { id: '22222222-2222-4222-8222-222222222222', nombre: 'Carlos', apellido: 'Martínez' },
};
export const otraRutinaPropia: RutinaPropiaResumen = {
  ...rutinaPropia, id: '33333333-3333-4333-8333-333333333333', nombre: 'Movilidad inicial', fechaInicio: '2026-11-10',
};
export const detallePropio: RutinaPropiaDetalle = {
  ...rutinaPropia,
  // Desorden intencional para verificar la presentación sin mutar la respuesta.
  dias: [
    { id: '44444444-4444-4444-8444-444444444444', orden: 2, nombre: 'Piernas', ejercicios: [
      { id: '55555555-5555-4555-8555-555555555555', orden: 1, nombre: 'Sentadilla', series: 5, repeticiones: 6, descansoSeg: 180 },
    ] },
    { id: '66666666-6666-4666-8666-666666666666', orden: 1, nombre: 'Pecho y tríceps', ejercicios: [
      { id: '77777777-7777-4777-8777-777777777777', orden: 2, nombre: 'Extensión de tríceps', series: 3, repeticiones: 12, descansoSeg: 0 },
      { id: '88888888-8888-4888-8888-888888888888', orden: 1, nombre: 'Press banca', series: 4, repeticiones: 8, descansoSeg: 120 },
    ] },
  ],
};
