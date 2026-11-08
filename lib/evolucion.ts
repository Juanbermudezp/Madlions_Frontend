import type { TipoProgreso } from "@/lib/progreso";

export type Registro = { id: string; fecha: string; valor: number };
export type Serie = {
  tipo: TipoProgreso;
  ejercicio?: string;
  repeticiones?: number;
  registros: Registro[];
  primero: number | null;
  ultimo: number | null;
  diferencia: number | null;
  porcentaje: number | null;
};
export type Filtro = { tipo?: TipoProgreso; desde?: string; hasta?: string };
export type Resultado<T> = { ok: true; data: T } | { ok: false; error: string; status?: number };
