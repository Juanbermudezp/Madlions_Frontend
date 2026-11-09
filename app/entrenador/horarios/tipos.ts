export type EstadoBloque = "DISPONIBLE" | "OCUPADO";

export interface Bloque {
    id: string;
    inicio: string;
    fin: string;
    duracionMin: number;
    estado: EstadoBloque;
    miembro: { nombre: string } | null;
}

export interface Clase {
    id: string;
    nombre: string;
    inicio: string;
    fin: string;
}

export interface DatosBloque {
    fecha: string;
    horaInicio: string;
    duracionMin: number;
}

export type Resultado<T = undefined> =
    | { ok: true; data: T }
    | { ok: false; error: string };