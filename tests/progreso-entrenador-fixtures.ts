import type { Serie } from '@/lib/evolucion';

export const miembroProgresoId = '11111111-1111-4111-8111-111111111111';
export const otroMiembroId = '22222222-2222-4222-8222-222222222222';
export const seriesEntrenador: Serie[] = [
  { tipo: 'PESO', registros: [{ id: 'p2', fecha: '2026-11-17', valor: 78.5 }, { id: 'p1', fecha: '2026-11-16', valor: 80 }],
    primero: 80, ultimo: 78.5, diferencia: -1.5, porcentaje: -1.9 },
  { tipo: 'MARCA', ejercicio: 'Press banca', repeticiones: 8, registros: [{ id: 'm2', fecha: '2026-11-17', valor: 70 }, { id: 'm1', fecha: '2026-11-16', valor: 65 }],
    primero: 65, ultimo: 70, diferencia: 5, porcentaje: 7.7 },
  { tipo: 'MARCA', ejercicio: 'Press banca', repeticiones: 5, registros: [{ id: 'm0', fecha: '2026-11-15', valor: 60 }],
    primero: 60, ultimo: 60, diferencia: null, porcentaje: null },
];
