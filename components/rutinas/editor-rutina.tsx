'use client';

import { useId, useRef, useState, useTransition, type FormEvent } from 'react';
import { actualizarRutina, crearRutina } from '@/app/actions/rutinas';
import { hoyLocal } from '@/lib/clases';
import { validarRutina, type DatosRutina, type ErroresRutina, type MiembroRutina, type Rutina } from '@/lib/rutinas';
import { botonPrimarioCss, botonSecundarioCss, campoCss, errorCampoCss } from '@/components/clases/estilos';

type EjercicioEditor = { localId: string; nombre: string; series: string; repeticiones: string; descansoSeg: string };
type DiaEditor = { localId: string; nombre: string; ejercicios: EjercicioEditor[] };
const ejercicioVacio = (localId: string): EjercicioEditor => ({ localId, nombre: '', series: '3', repeticiones: '10', descansoSeg: '60' });
const diaVacio = (localId: string): DiaEditor => ({ localId, nombre: '', ejercicios: [ejercicioVacio(`${localId}-e`)] });
const entero = (valor: string) => /^\d+$/.test(valor.trim()) ? Number(valor) : Number.NaN;

export function EditorRutina({ rutina, miembro, onGuardado, onCancelar, onOcupado }: {
  rutina: Rutina | null; miembro: MiembroRutina | null;
  onGuardado: (rutina: Rutina, mensaje: string) => void; onCancelar: () => void; onOcupado: (ocupado: boolean) => void;
}) {
  const prefijo = useId();
  const candado = useRef(false);
  const [nombre, setNombre] = useState(rutina?.nombre ?? '');
  const [objetivo, setObjetivo] = useState(rutina?.objetivo ?? '');
  const [fechaInicio, setFechaInicio] = useState(rutina?.fechaInicio ?? hoyLocal());
  const [dias, setDias] = useState<DiaEditor[]>(() => rutina ? [...rutina.dias].sort((a, b) => a.orden - b.orden).map((d) => ({
    localId: d.id, nombre: d.nombre, ejercicios: [...d.ejercicios].sort((a, b) => a.orden - b.orden).map((e) => ({
      localId: e.id, nombre: e.nombre, series: String(e.series), repeticiones: String(e.repeticiones), descansoSeg: String(e.descansoSeg),
    })),
  })) : [diaVacio('inicial')]);
  const [errores, setErrores] = useState<ErroresRutina>({});
  const [error, setError] = useState('');
  const [guardando, iniciar] = useTransition();

  function campo(ruta: string) {
    return { id: `${prefijo}-${ruta}`, 'aria-invalid': !!errores[ruta], 'aria-describedby': errores[ruta] ? `${prefijo}-${ruta}-error` : undefined };
  }
  function aviso(ruta: string) {
    return errores[ruta] ? <p id={`${prefijo}-${ruta}-error`} role="alert" className={errorCampoCss}>{errores[ruta]}</p> : null;
  }
  function estructura(nuevos: DiaEditor[]) { setDias(nuevos); setErrores({}); }
  function cambiarEjercicio(i: number, j: number, propiedad: keyof Omit<EjercicioEditor, 'localId'>, valor: string) {
    setDias((previos) => previos.map((d, di) => di === i ? { ...d, ejercicios: d.ejercicios.map((e, ei) => ei === j ? { ...e, [propiedad]: valor } : e) } : d));
  }
  function guardar(evento: FormEvent) {
    evento.preventDefault();
    if (candado.current) return;
    const datos: DatosRutina = { nombre, objetivo, fechaInicio, dias: dias.map((d) => ({ nombre: d.nombre,
      ejercicios: d.ejercicios.map((e) => ({ nombre: e.nombre, series: entero(e.series), repeticiones: entero(e.repeticiones), descansoSeg: entero(e.descansoSeg) })),
    })) };
    const campos = validarRutina(datos, { fechaAnterior: rutina?.fechaInicio });
    if (!miembro) campos.miembroId = 'Selecciona un miembro antes de guardar.';
    setErrores(campos); setError('');
    if (Object.keys(campos).length || !miembro) return;
    candado.current = true; onOcupado(true);
    iniciar(async () => {
      try {
        const res = rutina ? await actualizarRutina(rutina.id, datos) : await crearRutina(miembro.id, datos);
        if (!res.ok) { setError(res.error); setErrores(res.campos ?? {}); return; }
        onGuardado(res.datos, rutina ? 'Rutina actualizada' : 'Rutina asignada');
      } catch { setError('No se pudo conectar con el servidor. Intenta de nuevo.'); }
      finally { candado.current = false; onOcupado(false); }
    });
  }

  return <section aria-labelledby={`${prefijo}-titulo`} className="min-w-0 rounded-lg border border-zinc-200 p-4 sm:p-6 dark:border-zinc-800">
    <h2 id={`${prefijo}-titulo`} className="text-xl font-semibold">{rutina ? 'Editar rutina' : 'Nueva rutina'}</h2>
    <p className="mt-1 break-words text-sm text-zinc-500">{miembro ? `${miembro.nombre} ${miembro.apellido} · ${miembro.codigo}` : 'Selecciona un miembro en el buscador.'}</p>
    {rutina && <p className="mt-1 text-xs text-zinc-500">El miembro no se puede cambiar durante la edición.</p>}
    {aviso('miembroId')}
    <form onSubmit={guardar} noValidate className="mt-5 space-y-5">
      <fieldset disabled={guardando} className="min-w-0 space-y-5">
        <legend className="sr-only">Datos de la rutina</legend>
        <div className="grid min-w-0 gap-4 md:grid-cols-2">
          <div className="min-w-0"><label htmlFor={campo('nombre').id} className="text-sm">Nombre de rutina</label>
            <input {...campo('nombre')} className={campoCss} maxLength={60} value={nombre} onChange={(e) => setNombre(e.target.value)} />{aviso('nombre')}</div>
          <div className="min-w-0"><label htmlFor={campo('fechaInicio').id} className="text-sm">Fecha de inicio</label>
            <input {...campo('fechaInicio')} type="date" className={`${campoCss} min-w-0`} value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} />{aviso('fechaInicio')}</div>
          <div className="min-w-0 md:col-span-2"><label htmlFor={campo('objetivo').id} className="text-sm">Objetivo</label>
            <textarea {...campo('objetivo')} className={campoCss} maxLength={200} rows={2} value={objetivo} onChange={(e) => setObjetivo(e.target.value)} />{aviso('objetivo')}</div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="font-semibold">Días ({dias.length}/7)</h3>
          <button type="button" className={botonSecundarioCss} disabled={dias.length >= 7} onClick={() => estructura([...dias, diaVacio(crypto.randomUUID())])}>Agregar día</button></div>
        {aviso('dias')}
        {dias.map((dia, i) => <fieldset key={dia.localId} className="min-w-0 space-y-4 rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
          <legend className="px-1 text-sm font-semibold">Día {i + 1}</legend>
          <div className="flex flex-wrap items-start gap-3">
            <div className="min-w-0 flex-1"><label htmlFor={campo(`dias[${i}].nombre`).id} className="text-sm">Nombre del día {i + 1}</label>
              <input {...campo(`dias[${i}].nombre`)} className={campoCss} value={dia.nombre} maxLength={40} onChange={(e) => setDias(dias.map((d, di) => di === i ? { ...d, nombre: e.target.value } : d))} />{aviso(`dias[${i}].nombre`)}</div>
            <button type="button" className={`${botonSecundarioCss} mt-6`} aria-label={`Eliminar día ${i + 1}`} onClick={() => estructura(dias.filter((_, di) => di !== i))}>Eliminar día</button>
          </div>
          {dia.ejercicios.map((ejercicio, j) => <fieldset key={ejercicio.localId} className="min-w-0 rounded-md border border-zinc-200 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-950">
            <legend className="px-1 text-xs font-medium">Ejercicio {j + 1} del día {i + 1}</legend>
            <div className="grid min-w-0 grid-cols-1 gap-3 md:grid-cols-3">
              <div className="min-w-0 md:col-span-3"><label htmlFor={campo(`dias[${i}].ejercicios[${j}].nombre`).id} className="text-sm">Nombre del ejercicio</label>
                <input {...campo(`dias[${i}].ejercicios[${j}].nombre`)} className={campoCss} maxLength={60} value={ejercicio.nombre} onChange={(e) => cambiarEjercicio(i, j, 'nombre', e.target.value)} />{aviso(`dias[${i}].ejercicios[${j}].nombre`)}</div>
              {([['series', 'Series', 1, 10], ['repeticiones', 'Repeticiones', 1, 50], ['descansoSeg', 'Descanso (segundos)', 0, 600]] as const).map(([propiedad, etiqueta, min, max]) => {
                const ruta = `dias[${i}].ejercicios[${j}].${propiedad}`;
                return <div key={propiedad} className="min-w-0"><label htmlFor={campo(ruta).id} className="text-sm">{etiqueta}</label>
                  <input {...campo(ruta)} className={`${campoCss} min-w-0`} type="number" inputMode="numeric" step={1} min={min} max={max} value={ejercicio[propiedad]} onChange={(e) => cambiarEjercicio(i, j, propiedad, e.target.value)} />{aviso(ruta)}</div>;
              })}
            </div>
            <button type="button" className={`${botonSecundarioCss} mt-3`} aria-label={`Eliminar ejercicio ${j + 1} del día ${i + 1}`} onClick={() => estructura(dias.map((d, di) => di === i ? { ...d, ejercicios: d.ejercicios.filter((_, ei) => ei !== j) } : d))}>Eliminar ejercicio</button>
          </fieldset>)}
          {aviso(`dias[${i}].ejercicios`)}
          <button type="button" className={botonSecundarioCss} disabled={dia.ejercicios.length >= 15} onClick={() => estructura(dias.map((d, di) => di === i ? { ...d, ejercicios: [...d.ejercicios, ejercicioVacio(crypto.randomUUID())] } : d))}>Agregar ejercicio</button>
        </fieldset>)}
        {error && <p role="alert" className="break-words rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">{error}</p>}
        <div className="flex flex-wrap justify-end gap-3">
          <button type="button" className={botonSecundarioCss} onClick={onCancelar}>{rutina ? 'Cancelar edición' : 'Limpiar formulario'}</button>
          <button type="submit" disabled={guardando} aria-busy={guardando} className={botonPrimarioCss}>{guardando ? 'Guardando…' : 'Guardar'}</button>
        </div>
      </fieldset>
    </form>
  </section>;
}
