/** Estado vacío de las pantallas de reservas: caja alta con ícono, mensaje y una acción opcional. */
export function EstadoVacio({
  mensaje,
  detalle,
  children,
}: {
  mensaje: string;
  detalle?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-80 flex-1 flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-zinc-300 px-6 py-16 text-center dark:border-zinc-700">
      <div className="flex size-14 items-center justify-center rounded-full bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
        <svg aria-hidden viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="size-7">
          <rect x="3.5" y="5" width="17" height="15" rx="2" />
          <path d="M3.5 9.5h17M8 3v4M16 3v4" strokeLinecap="round" />
        </svg>
      </div>
      <div className="flex flex-col gap-1">
        <p className="text-base font-medium text-zinc-700 dark:text-zinc-200">{mensaje}</p>
        {detalle && <p className="text-sm text-zinc-500">{detalle}</p>}
      </div>
      {children}
    </div>
  );
}
