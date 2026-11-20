import type { CSSProperties } from 'react';
import { formatoHora, type Bloque, type Evento } from '@/lib/horarios';

interface Props {
    evento: Evento;
    onEliminar: (bloque: Bloque) => void;
    deshabilitado: boolean;
    className?: string;
    style?: CSSProperties;
}

/**
 * Un evento del calendario: bloque disponible (verde, se puede eliminar),
 * bloque ocupado por una sesión (azul, con el miembro) o clase grupal (gris).
 */
export function TarjetaEvento({ evento, onEliminar, deshabilitado, className = '', style }: Props) {
    const horario = `${formatoHora(evento.inicio)}–${formatoHora(evento.fin)}`;
    const base = `rounded-md text-white ${className}`;

    if (evento.tipo === 'clase') {
        return (
            <div className={`${base} bg-zinc-500 dark:bg-zinc-600`} style={style} title={`Clase: ${evento.clase.nombre}`}>
                <p className="font-medium">Clase: {evento.clase.nombre}</p>
                <p>{horario}</p>
            </div>
        );
    }

    const { bloque } = evento;
    if (bloque.estado === 'OCUPADO') {
        const texto = `Ocupado${bloque.miembro ? ` · ${bloque.miembro.nombre}` : ''}`;
        return (
            <div className={`${base} bg-blue-600`} style={style} title={texto}>
                <p className="font-medium">{texto}</p>
                <p>{horario}</p>
            </div>
        );
    }

    return (
        <div className={`${base} flex items-start justify-between gap-1 bg-emerald-600`} style={style}>
            <div>
                <p className="font-medium">Disponible</p>
                <p>{horario}</p>
            </div>
            <button
                type="button"
                onClick={() => onEliminar(bloque)}
                disabled={deshabilitado}
                aria-label={`Eliminar el bloque de ${horario}`}
                className="shrink-0 rounded bg-white/20 px-1.5 py-0.5 hover:bg-white/30 disabled:opacity-50"
            >
                Eliminar
            </button>
        </div>
    );
}