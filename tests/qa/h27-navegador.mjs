/** QA-27.1: Next real + Chrome + descarga jsPDF real, API local CONTROLADA.
 * No importa Prisma, no usa PostgreSQL, no modifica .env ni valida JWT reales.
 * Tras npm.cmd run build: node tests/qa/h27-navegador.mjs
 * Evidencias ignoradas: .next/qa-h27/. Requiere Chrome instalado localmente.
 */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';

const carpeta = resolve('.next', 'qa-h27', String(Date.now()));
mkdirSync(carpeta, { recursive: true });
const chrome = process.env.H27_CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
assert(existsSync(chrome), 'Falta Chrome: configure H27_CHROME');
assert(existsSync('.next/BUILD_ID'), 'Ejecute primero npm.cmd run build');
const A = {
  total: 192.1, subtotal: 170, iva: 22.1,
  porConcepto: [{ concepto: 'MEMBRESIA', total: 113 }, { concepto: 'RENOVACION', total: 56.5 }, { concepto: 'SESION_ADICIONAL', total: 22.6 }],
  porTipoPlan: [{ tipoPlan: 'DAYPASS', total: 113 }, { tipoPlan: 'MENSUAL', total: 56.5 }, { tipoPlan: 'SET_CLASES', total: 0 }],
  porDia: [{ fecha: '2026-11-01', total: 169.5 }, { fecha: '2026-11-02', total: 22.6 }],
  anterior: { total: 113, diferencia: 79.1, porcentaje: 70 },
};
const consultas = [];
const evidencias = { tipo: 'Next/Chrome reales; API controlada sin PostgreSQL', vistas: [], verificaciones: [], pdf: {} };
const pausita = (ms) => new Promise((r) => setTimeout(r, ms));
async function esperar(fn, mensaje, limite = 20000) {
  const fin = Date.now() + limite;
  while (Date.now() < fin) { const valor = await fn(); if (valor) return valor; await pausita(100); }
  throw new Error(`Tiempo agotado: ${mensaje}`);
}
const diasCero = (desde, hasta) => {
  const dias = [];
  for (let d = new Date(`${desde}T12:00:00Z`); d.toISOString().slice(0, 10) <= hasta; d.setUTCDate(d.getUTCDate() + 1)) {
    dias.push({ fecha: d.toISOString().slice(0, 10), total: 0 });
  }
  return dias;
};
const api = createServer((req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1');
  consultas.push(url.pathname + url.search);
  res.setHeader('Content-Type', 'application/json');
  if (!req.headers.authorization) { res.writeHead(401).end('{"message":"Sin sesión QA"}'); return; }
  if (url.pathname === '/api/v1/auth/me') {
    res.end(JSON.stringify({ id: 'admin-qa', correo: 'qa@example.invalid', nombre: 'Administrador', apellido: 'QA', rol: 'ADMINISTRADOR' })); return;
  }
  const desde = url.searchParams.get('desde'); const hasta = url.searchParams.get('hasta');
  if (url.pathname === '/api/v1/reportes/ingresos') {
    const esA = desde === '2026-11-01' && hasta === '2026-11-02';
    res.end(JSON.stringify(esA ? A : { total: 0, subtotal: 0, iva: 0,
      porConcepto: A.porConcepto.map((c) => ({ ...c, total: 0 })), porTipoPlan: A.porTipoPlan.map((p) => ({ ...p, total: 0 })),
      porDia: diasCero(desde, hasta), anterior: { total: 0, diferencia: 0, porcentaje: null } })); return;
  }
  if (url.pathname === '/api/v1/reportes/ingresos/detalle') {
    const pagina = Number(url.searchParams.get('pagina') || 1);
    const concepto = url.searchParams.get('concepto');
    const c = concepto === 'MEMBRESIA' ? 0 : concepto === 'RENOVACION' ? 1 : 2;
    const esC = desde === '2026-11-04' && hasta === '2026-11-04';
    const total = esC ? 25 : 1;
    const items = Array.from({ length: total }, (_, i) => ({ miembro: `Miembro QA ${i + 1}`, codigo: `MBR-${String(i + 1).padStart(6, '0')}`,
      fecha: esC ? '2026-11-04' : c === 2 ? '2026-11-02' : '2026-11-01', monto: esC ? 1.13 : A.porConcepto[c].total,
      referencia: `PAY-20261101-${String(i + 1).padStart(6, '0')}` })).slice((pagina - 1) * 20, pagina * 20);
    res.end(JSON.stringify({ total, pagina, items })); return;
  }
  res.writeHead(404).end('{"message":"Ruta fuera del alcance QA H27"}');
});
const escuchar = (servidor) => new Promise((r) => servidor.listen(0, '127.0.0.1', () => r(servidor.address().port)));
let next; let navegador; let ws; let salida = ''; let diagnostico = async () => ({ consultas });
try {
  const apiPuerto = await escuchar(api);
  const reserva = createServer(); const puerto = await escuchar(reserva); await new Promise((r) => reserva.close(r));
  next = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', String(puerto)], {
    windowsHide: true, env: { ...process.env, API_URL: `http://127.0.0.1:${apiPuerto}/api/v1/` }, stdio: ['ignore', 'pipe', 'pipe'],
  });
  next.stdout.on('data', (d) => { salida += d; }); next.stderr.on('data', (d) => { salida += d; });
  next.on('error', (e) => { salida += e.message; });
  const origen = `http://127.0.0.1:${puerto}`;
  await esperar(async () => { try { return (await fetch(`${origen}/login`)).ok; } catch { return false; } }, 'arranque Next', 45000);
  const perfil = join(carpeta, 'perfil');
  navegador = spawn(chrome, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--disable-background-networking',
    '--remote-debugging-address=127.0.0.1', '--remote-debugging-port=0', `--user-data-dir=${perfil}`, 'about:blank'], { windowsHide: true, stdio: 'ignore' });
  navegador.on('error', (e) => { salida += e.message; });
  await esperar(() => existsSync(join(perfil, 'DevToolsActivePort')), 'Chrome');
  const [cdpPuerto, cdpRuta] = readFileSync(join(perfil, 'DevToolsActivePort'), 'utf8').trim().split(/\r?\n/);
  ws = new WebSocket(`ws://127.0.0.1:${cdpPuerto}${cdpRuta}`);
  await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
  let secuencia = 0; const pendientes = new Map();
  ws.onmessage = ({ data }) => {
    const mensaje = JSON.parse(String(data));
    if (!mensaje.id) return;
    const pendiente = pendientes.get(mensaje.id); if (!pendiente) return;
    clearTimeout(pendiente.timer); pendientes.delete(mensaje.id);
    if (mensaje.error) pendiente.reject(new Error(JSON.stringify(mensaje.error))); else pendiente.resolve(mensaje.result);
  };
  function rpc(method, params = {}, sessionId) {
    return new Promise((resolve, reject) => {
      const id = ++secuencia;
      const timer = setTimeout(() => { pendientes.delete(id); reject(new Error(`CDP sin respuesta: ${method}`)); }, 20000);
      pendientes.set(id, { resolve, reject, timer }); ws.send(JSON.stringify({ id, method, params, sessionId }));
    });
  }
  const { targetId } = await rpc('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await rpc('Target.attachToTarget', { targetId, flatten: true });
  const cdp = (method, params) => rpc(method, params, sessionId);
  await cdp('Page.enable'); await cdp('Runtime.enable'); await cdp('Network.enable');
  async function evaluar(expression) {
    const r = await cdp('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails));
    return r.result.value;
  }
  diagnostico = async () => {
    const estado = await evaluar(`({texto:document.body.innerText,html:document.body.innerHTML,fechas:[...document.querySelectorAll('input[type="date"]')].map(e=>e.value),url:location.href})`);
    return { ...estado, consultas };
  };
  const jwt = `qa.${Buffer.from(JSON.stringify({ sub: 'admin-qa', email: 'qa@example.invalid', rol: 'ADMINISTRADOR', exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url')}.simulado`;
  await cdp('Network.setCookie', { name: 'session', value: jwt, url: origen, httpOnly: true, sameSite: 'Lax' });
  await cdp('Page.navigate', { url: `${origen}/admin/reportes/ingresos` });
  const esperaUI = (expr, nombre) => esperar(() => evaluar(expr), nombre);
  await esperaUI(`!!document.querySelector('[aria-label="Ver detalle de membresías"]')`, 'ruta admin real');
  // El HTML del servidor puede estar visible antes de que React conecte onChange.
  await esperaUI(`Object.keys(document.querySelector('input[type="date"]')).some(k=>k.startsWith('__reactProps$'))`, 'hidratación del formulario');
  await click(`[...document.querySelectorAll('button')].find(e=>e.textContent==='Actualizar')`);
  await esperar(() => consultas.filter(u => u.startsWith('/api/v1/reportes/ingresos?')).length >= 2, 'Server Action tras hidratación');
  await esperaUI(`!!document.querySelector('[aria-label="Ingresos totales"]')`, 'actualización inicial');
  evidencias.verificaciones.push('Ruta /admin/reportes/ingresos con cookie QA y DAL/auth/me por HTTP controlado');
  async function rango(desde, hasta, modal = false) {
    for (const [indice, valor] of [desde, hasta].entries()) {
      await evaluar(`(() => { const root=${modal ? "document.querySelector('dialog')" : 'document'};
      const f=root.querySelector('form[aria-label="Rango de fechas"]');
      const inputs=f.querySelectorAll('input[type="date"]');
      const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;
      setter.call(inputs[${indice}],${JSON.stringify(valor)});inputs[${indice}].dispatchEvent(new Event('input',{bubbles:true}));inputs[${indice}].dispatchEvent(new Event('change',{bubbles:true})); })()`);
      // Cada edición es un evento de usuario distinto: React confirma el estado.
      await evaluar(`new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))`);
    }
    await evaluar(`(${modal ? "document.querySelector('dialog')" : 'document'}).querySelector('form[aria-label="Rango de fechas"]').requestSubmit()`);
  }
  await rango('2026-11-01', '2026-11-02');
  await esperaUI(`document.querySelector('[aria-label="Ingresos totales"]')?.textContent.includes('$192.10') || [...document.querySelectorAll('section')].some(e=>e.getAttribute('aria-labelledby') && e.textContent.startsWith('Ingresos totales') && e.textContent.includes('$192.10'))`, 'total A');
  assert(await evaluar(`document.body.innerText.includes('$170.00') && document.body.innerText.includes('$22.10') && document.body.innerText.includes('+70.0 %')`));
  assert.deepEqual(await evaluar(`[...document.querySelectorAll('svg[role="img"] title')].map(e=>e.textContent)`), ['01/11/2026: $169.50', '02/11/2026: $22.60']);
  evidencias.verificaciones.push('Escenario A: tarjetas/planes/conceptos/gráfica a partir de Server Actions y API controlada');
  async function captura(nombre) {
    await evaluar('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))');
    const { data } = await cdp('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    writeFileSync(join(carpeta, `${nombre}.png`), Buffer.from(data, 'base64'));
  }
  async function click(expression) {
    const { x, y } = await evaluar(`(()=>{const e=${expression};e.scrollIntoView({block:'center'});const r=e.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`);
    await cdp('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
    await cdp('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
  }
  for (const width of [375, 1280]) for (const tema of ['light', 'dark']) {
    await cdp('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: false });
    await cdp('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: tema }] });
    await evaluar('window.scrollTo(0,0)'); await captura(`reporte-${width}-${tema}`);
    const medida = await evaluar(`({ancho:innerWidth,scroll:document.documentElement.scrollWidth,tema:getComputedStyle(document.body).backgroundColor})`);
    assert(medida.scroll <= width, `Overflow global ${width}/${tema}`);
    await click(`document.querySelector('[aria-label="Ver detalle de membresías"]')`);
    await esperaUI(`!!document.querySelector('dialog tbody tr')`, 'detalle A');
    await captura(`modal-${width}-${tema}`);
    const modal = await evaluar(`(()=>{const d=document.querySelector('dialog');return {ancho:d.getBoundingClientRect().width,client:d.clientWidth,scroll:d.scrollWidth,filas:d.querySelectorAll('tbody tr').length}})()`);
    assert(modal.scroll <= modal.client, 'Overflow global del modal');
    for (let i = 0; i < 12; i++) {
      await cdp('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
      await cdp('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
      assert(await evaluar(`document.querySelector('dialog').contains(document.activeElement)`), 'Tab fuera del modal');
    }
    await cdp('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
    await cdp('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
    await esperaUI(`!document.querySelector('dialog')`, 'Escape cierra modal');
    assert.equal(await evaluar(`document.activeElement.getAttribute('aria-label')`), 'Ver detalle de membresías');
    evidencias.vistas.push({ width, tema, medida, modal, teclado: '12 Tab + Escape + foco restaurado' });
  }
  await rpc('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: carpeta });
  const generadoDesde = new Date();
  await click(`[...document.querySelectorAll('button')].find(e=>e.textContent==='Exportar PDF')`);
  const pdf = join(carpeta, 'reporte-ingresos-2026-11-01-2026-11-02.pdf');
  await esperar(() => existsSync(pdf), 'PDF descargado');
  const bytes = readFileSync(pdf); const contenido = bytes.toString('latin1');
  for (const texto of ['%PDF-', '%%EOF', 'Reporte de ingresos', '01/11/2026 al 02/11/2026', 'Generado el', '$192.10', '$170.00', '$22.10', '$113.00', '+$79.10', '+70.0 %', 'Membresías', 'Renovaciones', 'Sesiones adicionales', 'Daypass', 'Mensual', 'Set de clases mensual', '$169.50', '$22.60', '02/11/2026']) {
    assert(contenido.includes(texto), `Falta en PDF real: ${texto}`);
  }
  // Fecha local de generación, independiente del helper del producto.
  const partes = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: 'America/El_Salvador', day: '2-digit', month: '2-digit', year: 'numeric' }).formatToParts(generadoDesde).map(p => [p.type, p.value]));
  assert(contenido.includes(`Generado el ${partes.day}/${partes.month}/${partes.year}`));
  const { targetId: pdfId } = await rpc('Target.createTarget', { url: pathToFileURL(pdf).href });
  const { sessionId: pdfSession } = await rpc('Target.attachToTarget', { targetId: pdfId, flatten: true });
  await rpc('Target.activateTarget', { targetId: pdfId });
  await rpc('Page.enable', {}, pdfSession);
  await rpc('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false }, pdfSession);
  let visor = false;
  try {
    await esperar(async () => {
      const r = await rpc('Runtime.evaluate', { expression: `!!document.querySelector('embed[type="application/pdf"],pdf-viewer')`, returnByValue: true }, pdfSession);
      return r.result.value;
    }, 'abrir PDF en visor Chrome', 5000);
    visor = true;
    await pausita(1500);
    const imagenPdf = await rpc('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false }, pdfSession);
    writeFileSync(join(carpeta, 'pdf-abierto.png'), Buffer.from(imagenPdf.data, 'base64'));
  } catch (error) {
    evidencias.verificaciones.push(`Limitación visor PDF: ${error.message}`);
    const diagnosticoVisor = await rpc('Runtime.evaluate', { expression: `({url:location.href,html:document.documentElement.outerHTML})`, returnByValue: true }, pdfSession);
    writeFileSync(join(carpeta, 'visor-pdf.json'), JSON.stringify(diagnosticoVisor.result.value, null, 2));
  }
  evidencias.pdf = { archivo: pdf, bytes: bytes.length, descarga: 'Browser real, save() sin mocks', apertura: visor ? 'Visor PDF Chrome detectado' : 'BLOQUEADO: visor no detectado en headless', valores: 'A verificado en bytes', generadoDesde: generadoDesde.toISOString() };
  await rpc('Target.closeTarget', { targetId: pdfId });
  await rpc('Target.activateTarget', { targetId });
  // Interacciones contra Server Actions reales: 25 registros, período y concepto.
  await click(`document.querySelector('[aria-label="Ver detalle de membresías"]')`);
  await evaluar(`document.querySelector('dialog details').open=true`);
  await rango('2026-11-04', '2026-11-04', true);
  await esperaUI(`document.querySelector('dialog')?.innerText.includes('Página 1 · 25 pagos')`, 'C página1');
  assert.equal(await evaluar(`document.querySelectorAll('dialog tbody tr').length`), 20);
  await evaluar(`[...document.querySelectorAll('dialog button')].find(e=>e.textContent==='Siguiente').click()`);
  await esperaUI(`document.querySelector('dialog')?.innerText.includes('Página 2 · 25 pagos')`, 'C página2');
  assert.equal(await evaluar(`document.querySelectorAll('dialog tbody tr').length`), 5);
  await evaluar(`(()=>{const s=document.querySelector('dialog select');s.value='RENOVACION';s.dispatchEvent(new Event('change',{bubbles:true}));})()`);
  await esperaUI(`document.querySelector('dialog')?.innerText.includes('Pagos de renovaciones') && document.querySelector('dialog')?.innerText.includes('Página 1 · 25 pagos')`, 'concepto reinicia página');
  for (const width of [375, 1280]) for (const tema of ['light', 'dark']) {
    await cdp('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: false });
    await cdp('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: tema }] });
    await evaluar(`document.querySelector('dialog').scrollTop=0`);
    await captura(`modal25-${width}-${tema}`);
    const medida = await evaluar(`(()=>{const d=document.querySelector('dialog');return {clientWidth:d.clientWidth,scrollWidth:d.scrollWidth,clientHeight:d.clientHeight,scrollHeight:d.scrollHeight,filas:d.querySelectorAll('tbody tr').length}})()`);
    assert(medida.scrollWidth <= medida.clientWidth, 'Overflow del modal con20filas');
    assert(medida.clientHeight <= 810, 'Modal excede90dvh');
    assert.equal(medida.filas, 20);
    evidencias.vistas.push({ width, tema, escenario: '25pagos/página1', medida });
  }
  await evaluar(`[...document.querySelectorAll('dialog button')].find(e=>e.textContent==='Cerrar').click()`);
  assert.deepEqual(await evaluar(`[...document.querySelectorAll('form[aria-label="Rango de fechas"] input[type="date"]')].map(e=>e.value)`), ['2026-11-04', '2026-11-04']);
  await esperaUI(`document.body.innerText.includes('No hay ingresos en este período') && document.body.innerText.includes('Sin período de comparación')`, 'reporte cero');
  evidencias.verificaciones.push('C 25 pagos 20/5; concepto reinicia página; rango modal sincroniza selector principal; reporte cero');
  evidencias.consultas = consultas;
  writeFileSync(join(carpeta, 'resultado.json'), JSON.stringify(evidencias, null, 2));
  writeFileSync(join(carpeta, 'next.log'), salida);
  console.log(JSON.stringify({ resultado: visor ? 'APROBADO con API controlada' : 'Interacción y descarga APROBADAS; apertura PDF BLOQUEADA', carpeta, ...evidencias }, null, 2));
} catch (error) {
  writeFileSync(join(carpeta, 'fallo.json'), JSON.stringify({ error: String(error), ...await diagnostico() }, null, 2));
  writeFileSync(join(carpeta, 'next.log'), salida);
  console.error(`Diagnóstico: ${carpeta}`);
  throw error;
} finally {
  ws?.close(); navegador?.kill(); next?.kill(); api.closeAllConnections(); api.close();
}
