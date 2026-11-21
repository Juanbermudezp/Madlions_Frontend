import type { ModuloOrigen } from '@/lib/avisos';

/** Íconos de la bandeja de avisos (H23). Son decorativos: el texto va al lado. */

export function IconoCampana({ className }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className={className}>
      <path d="M6 9a6 6 0 1 1 12 0c0 5 2 6.5 2 6.5H4S6 14 6 9Z" strokeLinejoin="round" />
      <path d="M10 19a2 2 0 0 0 4 0" strokeLinecap="round" />
    </svg>
  );
}

/** FE-23.1 · Ícono de cada módulo de origen en la columna Módulo. */
export function IconoModulo({ modulo, className = 'size-4' }: { modulo: ModuloOrigen; className?: string }) {
  return (
    <svg
      aria-hidden
      data-modulo={modulo}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`shrink-0 ${className}`}
    >
      {modulo === 'MEMBRESIAS' && (
        // Credencial
        <>
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <circle cx="9" cy="11" r="2" />
          <path d="M6 16c.6-1.4 1.7-2 3-2s2.4.6 3 2M14 10h4M14 13h3" />
        </>
      )}
      {modulo === 'CLASES' && (
        // Calendario
        <>
          <rect x="3.5" y="5" width="17" height="15" rx="2" />
          <path d="M3.5 9.5h17M8 3v4M16 3v4" />
        </>
      )}
      {modulo === 'SESIONES' && (
        // Mancuerna
        <path d="M4 9v6M7 7v10M17 7v10M20 9v6M7 12h10" />
      )}
      {modulo === 'PAGOS' && (
        // Tarjeta
        <>
          <rect x="3" y="6" width="18" height="12" rx="2" />
          <path d="M3 10h18M7 15h4" />
        </>
      )}
    </svg>
  );
}
