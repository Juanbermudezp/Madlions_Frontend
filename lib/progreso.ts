export type TipoProgreso =
  | "PESO"
  | "CINTURA"
  | "CADERA"
  | "PECHO"
  | "BRAZO"
  | "MUSLO"
  | "MARCA";

export type MedicionProgreso = {
  tipo: TipoProgreso;
  valor: number;
  ejercicio?: string;
  repeticiones?: number;
};

export type CrearProgreso = {
  fecha: string;
  mediciones: MedicionProgreso[];
};

export type ResultadoRegistro =
  | { ok: true }
  | { ok: false; error: string; status?: number };
