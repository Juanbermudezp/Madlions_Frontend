import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { Rutinas } from '@/components/rutinas/rutinas';
import { actualizarRutina, buscarMiembrosRutina, crearRutina, listarRutinas } from '@/app/actions/rutinas';
import { validarRutina } from '@/lib/rutinas';
import { datos, miembro, rutina } from './rutinas-fixtures';

vi.mock('@/app/actions/rutinas', () => ({ actualizarRutina: vi.fn(), buscarMiembrosRutina: vi.fn(), crearRutina: vi.fn(), listarRutinas: vi.fn() }));
beforeEach(() => {
  vi.mocked(buscarMiembrosRutina).mockResolvedValue({ ok: true, datos: [miembro] });
  vi.mocked(crearRutina).mockResolvedValue({ ok: true, datos: rutina });
  vi.mocked(actualizarRutina).mockResolvedValue({ ok: true, datos: rutina });
  vi.mocked(listarRutinas).mockResolvedValue({ ok: true, datos: [rutina] });
});
afterEach(() => { cleanup(); vi.resetAllMocks(); });
async function elegir() {
  fireEvent.change(screen.getByLabelText('Nombre o código del miembro'), { target: { value: 'Ana' } });
  fireEvent.click(screen.getByRole('button', { name: 'Buscar' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Ana Paz · MBR-000001' }));
}
function llenar() {
  fireEvent.change(screen.getByLabelText('Nombre de rutina'), { target: { value: datos.nombre } });
  fireEvent.change(screen.getByLabelText('Objetivo'), { target: { value: datos.objetivo } });
  fireEvent.change(screen.getByLabelText('Fecha de inicio'), { target: { value: datos.fechaInicio } });
  screen.getAllByLabelText(/^Nombre del día/).forEach((input, i) => fireEvent.change(input, { target: { value: `Día ${i + 1}` } }));
  screen.getAllByLabelText('Nombre del ejercicio').forEach((input) => fireEvent.change(input, { target: { value: 'Press banca' } }));
}

it('busca y selecciona miembros con el contrato limitado de entrenador', async () => {
  render(<Rutinas inicial={{ ok: true, datos: [] }} />);
  expect((screen.getByRole('button', { name: 'Buscar' }) as HTMLButtonElement).disabled).toBe(true);
  await elegir();
  expect(buscarMiembrosRutina).toHaveBeenCalledWith('Ana');
  expect(screen.getByText(/Miembro seleccionado:/).textContent).toContain('Ana Paz');
  expect(screen.queryByText(/documento|membresía/i)).toBeNull();
});
it('muestra rutinas y precarga días/ejercicios en orden con miembro fijo', () => {
  render(<Rutinas inicial={{ ok: true, datos: [rutina] }} />);
  expect(screen.getByRole('heading', { name: rutina.nombre })).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Editar' }));
  expect((screen.getByLabelText('Nombre de rutina') as HTMLInputElement).value).toBe(rutina.nombre);
  expect((screen.getByLabelText('Nombre del ejercicio') as HTMLInputElement).value).toBe('Press banca');
  expect((screen.getByLabelText('Nombre o código del miembro') as HTMLInputElement).disabled).toBe(true);
  fireEvent.click(screen.getByRole('button', { name: 'Cancelar edición' }));
  expect((screen.getByLabelText('Nombre de rutina') as HTMLInputElement).value).toBe('');
  expect((screen.getByLabelText('Nombre o código del miembro') as HTMLInputElement).disabled).toBe(false);
});
it('crea tres días, muestra éxito y actualiza el listado sin refrescar navegador', async () => {
  render(<Rutinas inicial={{ ok: true, datos: [] }} />); await elegir();
  fireEvent.click(screen.getByRole('button', { name: 'Agregar día' }));
  fireEvent.click(screen.getByRole('button', { name: 'Agregar día' }));
  llenar(); fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
  await screen.findByText('Rutina asignada');
  expect(crearRutina).toHaveBeenCalledOnce();
  const [id, cuerpo] = vi.mocked(crearRutina).mock.calls[0];
  expect(id).toBe(miembro.id); expect(cuerpo.dias).toHaveLength(3);
  expect(cuerpo.dias[0].ejercicios[0].series).toBe(3);
  expect(cuerpo.dias[0]).not.toHaveProperty('localId');
  expect(cuerpo.dias[0]).not.toHaveProperty('orden');
  await waitFor(() => expect(listarRutinas).toHaveBeenCalledOnce());
  expect(await screen.findByRole('heading', { name: rutina.nombre })).toBeTruthy();
});
it('agrega/elimina días y bloquea el máximo de siete', () => {
  render(<Rutinas inicial={{ ok: true, datos: [] }} />);
  for (let i = 1; i < 7; i++) fireEvent.click(screen.getByRole('button', { name: 'Agregar día' }));
  expect((screen.getByRole('button', { name: 'Agregar día' }) as HTMLButtonElement).disabled).toBe(true);
  fireEvent.change(screen.getByLabelText('Nombre del día 2'), { target: { value: 'Conservar' } });
  fireEvent.click(screen.getByRole('button', { name: 'Eliminar día 1' }));
  expect((screen.getByLabelText('Nombre del día 1') as HTMLInputElement).value).toBe('Conservar');
  expect((screen.getByRole('button', { name: 'Agregar día' }) as HTMLButtonElement).disabled).toBe(false);
});
it('agrega/elimina ejercicios y bloquea el máximo de quince', () => {
  render(<Rutinas inicial={{ ok: true, datos: [] }} />);
  for (let i = 1; i < 15; i++) fireEvent.click(screen.getByRole('button', { name: 'Agregar ejercicio' }));
  expect(screen.getAllByLabelText('Nombre del ejercicio')).toHaveLength(15);
  expect((screen.getByRole('button', { name: 'Agregar ejercicio' }) as HTMLButtonElement).disabled).toBe(true);
  fireEvent.click(screen.getByRole('button', { name: 'Eliminar ejercicio 1 del día 1' }));
  expect(screen.getAllByLabelText('Nombre del ejercicio')).toHaveLength(14);
});
it('impide guardar sin días o sin ejercicios y conserva errores accesibles', async () => {
  render(<Rutinas inicial={{ ok: true, datos: [] }} />); await elegir(); llenar();
  fireEvent.click(screen.getByRole('button', { name: 'Eliminar ejercicio 1 del día 1' }));
  fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
  expect(screen.getByText('Agrega entre 1 y 15 ejercicios.')).toBeTruthy();
  expect(crearRutina).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Eliminar día 1' }));
  fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
  expect(screen.getByText('Agrega entre 1 y 7 días.')).toBeTruthy();
});
it.each([['Series', '0'], ['Repeticiones', '0'], ['Descanso (segundos)', '-1'], ['Descanso (segundos)', ''], ['Series', '2.5']])('marca el error junto a %s con valor %s', async (etiqueta, valor) => {
  render(<Rutinas inicial={{ ok: true, datos: [] }} />); await elegir(); llenar();
  const input = screen.getByLabelText(etiqueta);
  fireEvent.change(input, { target: { value: valor } });
  fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
  expect(input.getAttribute('aria-invalid')).toBe('true');
  expect(document.getElementById(input.getAttribute('aria-describedby')!)?.textContent).toContain('entero');
  expect(crearRutina).not.toHaveBeenCalled();
});
it('desactiva guardar y evita doble envío mientras espera', async () => {
  let resolver!: (value: Awaited<ReturnType<typeof crearRutina>>) => void;
  vi.mocked(crearRutina).mockReturnValue(new Promise((r) => { resolver = r; }));
  render(<Rutinas inicial={{ ok: true, datos: [] }} />); await elegir(); llenar();
  const boton = screen.getByRole('button', { name: 'Guardar' });
  fireEvent.click(boton); fireEvent.click(boton);
  expect((boton as HTMLButtonElement).disabled).toBe(true);
  expect(crearRutina).toHaveBeenCalledOnce();
  resolver({ ok: true, datos: rutina }); await screen.findByText('Rutina asignada');
});
it('edita con PUT sin miembro ni entrenador y muestra Rutina actualizada', async () => {
  render(<Rutinas inicial={{ ok: true, datos: [rutina] }} />);
  fireEvent.click(screen.getByRole('button', { name: 'Editar' }));
  fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
  await screen.findByText('Rutina actualizada');
  expect(actualizarRutina).toHaveBeenCalledWith(rutina.id, datos);
  expect(crearRutina).not.toHaveBeenCalled();
  expect(listarRutinas).toHaveBeenCalledOnce();
});
it('conserva fecha pasada al editar y rechaza cambiarla por otra pasada', async () => {
  render(<Rutinas inicial={{ ok: true, datos: [{ ...rutina, fechaInicio: '2020-01-01' }] }} />);
  fireEvent.click(screen.getByRole('button', { name: 'Editar' }));
  fireEvent.change(screen.getByLabelText('Fecha de inicio'), { target: { value: '2020-01-02' } });
  fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
  expect(screen.getByText(/La fecha debe ser hoy/)).toBeTruthy();
  expect(actualizarRutina).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText('Fecha de inicio'), { target: { value: '2020-01-01' } });
  fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
  await screen.findByText('Rutina actualizada');
});
it.each([400, 401, 403, 404])('conserva el formulario ante error HTTP %s', async (status) => {
  vi.mocked(crearRutina).mockResolvedValue({ ok: false, error: `Error HTTP ${status}`, status, campos: { 'dias[0].ejercicios[0].nombre': 'Error de ejercicio' } });
  render(<Rutinas inicial={{ ok: true, datos: [] }} />); await elegir(); llenar();
  fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
  await screen.findByText(`Error HTTP ${status}`);
  expect((screen.getByLabelText('Nombre de rutina') as HTMLInputElement).value).toBe(datos.nombre);
  expect(screen.getByLabelText('Nombre del ejercicio').getAttribute('aria-invalid')).toBe('true');
  expect(listarRutinas).not.toHaveBeenCalled();
});
it('conserva valores cuando la acción falla inesperadamente', async () => {
  vi.mocked(crearRutina).mockRejectedValue(new Error('offline'));
  render(<Rutinas inicial={{ ok: true, datos: [] }} />); await elegir(); llenar();
  fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
  await screen.findByText(/No se pudo conectar/);
  expect((screen.getByLabelText('Objetivo') as HTMLTextAreaElement).value).toBe(datos.objetivo);
});
it('presenta vacío y error de búsqueda y permite reintentar carga del listado', async () => {
  vi.mocked(buscarMiembrosRutina).mockResolvedValue({ ok: true, datos: [] });
  render(<Rutinas inicial={{ ok: false, error: 'Error al listar' }} />);
  fireEvent.change(screen.getByLabelText('Nombre o código del miembro'), { target: { value: 'zz' } });
  fireEvent.click(screen.getByRole('button', { name: 'Buscar' }));
  await screen.findByText('No se encontraron miembros.');
  vi.mocked(buscarMiembrosRutina).mockResolvedValue({ ok: false, error: 'Error al buscar' });
  fireEvent.click(screen.getByRole('button', { name: 'Buscar' })); await screen.findByText('Error al buscar');
  fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
  await screen.findByRole('heading', { name: rutina.nombre });
});
it('cubre máximos, campos vacíos y fechas reales sin desplazar DATE', () => {
  expect(validarRutina(datos)).toEqual({});
  const res = validarRutina({ ...datos, nombre: 'ab', objetivo: '', fechaInicio: '2099-02-30' });
  expect(Object.keys(res).sort()).toEqual(['fechaInicio', 'nombre', 'objetivo']);
  expect(validarRutina({ ...datos, dias: [{ nombre: 'x'.repeat(41), ejercicios: [{ nombre: 'x'.repeat(61), series: 11, repeticiones: 51, descansoSeg: 601 }] }] })).toHaveProperty('dias[0].ejercicios[0].descansoSeg');
});

it('pagina listas largas de veinte en veinte sin modificar el contrato de la API', () => {
  render(<Rutinas inicial={{ ok: true, datos: Array.from({ length: 21 }, (_, i) => ({ ...rutina, id: String(i), nombre: `Rutina ${i + 1}` })) }} />);
  expect(screen.getAllByRole('button', { name: 'Editar' })).toHaveLength(20);
  fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
  expect(screen.getAllByRole('button', { name: 'Editar' })).toHaveLength(1);
  expect(screen.getByRole('heading', { name: 'Rutina 21' })).toBeTruthy();
});
