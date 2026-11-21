/** QA-28.1: Next/Chrome/Server Actions/PDF reales, API HTTP CONTROLADA.
 * No usa PostgreSQL ni credenciales reales, no escribe .env.
 * Tras npm.cmd run build: node tests/qa/h28-navegador.mjs
 * Requiere Node con soporte TS nativo y Chrome; evidencias en .next/qa-h28/.
 */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { RENOVACION, RENOVACION_VACIA, RANGO_RENOVACION } from '../renovacion-fixtures.ts';

assert(existsSync('.next/BUILD_ID'), 'Primero ejecutar npm.cmd run build');
const chrome = process.env.H28_CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
assert(existsSync(chrome), 'Configurar H28_CHROME con Chrome instalado');
const carpeta = resolve('.next', 'qa-h28', String(Date.now())); mkdirSync(carpeta, { recursive: true });
const archivoPdf = join(carpeta, 'reporte-renovacion-2026-10-07-2026-11-06.pdf');
const consultas = [];
const resultado = { alcance: 'Next y Chrome reales; API controlada, sin Nest/PostgreSQL real', fechaSimulada: '2026-11-06T16:00:00Z', vistas: [], pdf: {} };
const pausa = (ms) => new Promise(r => setTimeout(r, ms));
async function esperar(fn, nombre, limite = 20000) {
  const fin = Date.now() + limite;
  while (Date.now() < fin) { if (await fn()) return; await pausa(100); }
  throw new Error(`Tiempo agotado: ${nombre}`);
}
const api = createServer((req, res) => {
  const u = new URL(req.url, 'http://127.0.0.1'); consultas.push(u.pathname + u.search);
  if (u.pathname === '/qa/archivo.pdf' && existsSync(archivoPdf)) {
    res.writeHead(200, { 'Content-Type': 'application/pdf', 'Content-Disposition': 'inline', 'Content-Length': readFileSync(archivoPdf).length });
    res.end(readFileSync(archivoPdf)); return;
  }
  res.setHeader('Content-Type', 'application/json');
  if (!req.headers.authorization) { res.writeHead(401).end('{"message":"Sin sesión QA"}'); return; }
  if (u.pathname === '/api/v1/auth/me') {
    res.end(JSON.stringify({ id: 'admin-qa', nombre: 'Administrador', apellido: 'QA', correo: 'qa@example.invalid', rol: 'ADMINISTRADOR' })); return;
  }
  if (u.pathname === '/api/v1/reportes/renovacion') {
    const oficial = u.searchParams.get('desde') === RANGO_RENOVACION.desde && u.searchParams.get('hasta') === RANGO_RENOVACION.hasta;
    res.end(JSON.stringify(oficial ? RENOVACION : { ...RENOVACION_VACIA, enPeriodo: 1 })); return;
  }
  res.writeHead(404).end('{"message":"Fuera del alcance QA H28"}');
});
const escuchar = s => new Promise(r => s.listen(0, '127.0.0.1', () => r(s.address().port)));
let next; let navegador; let ws; let salida = ''; let diagnostico = async () => ({ consultas });
try {
  const puertoApi = await escuchar(api);
  const reserva = createServer(); const puerto = await escuchar(reserva); await new Promise(r => reserva.close(r));
  next = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', String(puerto)], {
    windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, API_URL: `http://127.0.0.1:${puertoApi}/api/v1/` },
  });
  next.stdout.on('data', d => { salida += d; }); next.stderr.on('data', d => { salida += d; });
  const origen = `http://127.0.0.1:${puerto}`;
  await esperar(async () => { try { return (await fetch(`${origen}/login`)).ok; } catch { return false; } }, 'arranque Next', 45000);
  const perfil = join(carpeta, 'perfil');
  navegador = spawn(chrome, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--disable-background-networking',
    '--disable-features=PdfOopif', '--remote-debugging-address=127.0.0.1', '--remote-debugging-port=0', `--user-data-dir=${perfil}`, 'about:blank'], { windowsHide: true, stdio: 'ignore' });
  await esperar(() => existsSync(join(perfil, 'DevToolsActivePort')), 'Chrome');
  const [p, ruta] = readFileSync(join(perfil, 'DevToolsActivePort'), 'utf8').trim().split(/\r?\n/);
  ws = new WebSocket(`ws://127.0.0.1:${p}${ruta}`); await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
  let secuencia = 0; const pendientes = new Map();
  ws.onmessage = ({ data }) => {
    const m = JSON.parse(String(data)); const promesa = pendientes.get(m.id); if (!promesa) return;
    clearTimeout(promesa.timer); pendientes.delete(m.id);
    if (m.error) promesa.reject(new Error(JSON.stringify(m.error))); else promesa.resolve(m.result);
  };
  function rpc(method, params = {}, sessionId) {
    return new Promise((resolve, reject) => {
      const id = ++secuencia; const timer = setTimeout(() => { pendientes.delete(id); reject(new Error(`CDP:${method}`)); }, 15000);
      pendientes.set(id, { resolve, reject, timer }); ws.send(JSON.stringify({ id, method, params, sessionId }));
    });
  }
  const { targetId } = await rpc('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await rpc('Target.attachToTarget', { targetId, flatten: true });
  const cdp = (method, params) => rpc(method, params, sessionId);
  const evaluar = async expression => {
    const r = await cdp('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails)); return r.result.value;
  };
  const ui = (expr, nombre) => esperar(() => evaluar(expr), nombre);
  diagnostico = async () => ({ consultas, pagina: await evaluar('document.body.innerText') });
  await cdp('Page.enable'); await cdp('Network.enable');
  // Solo se controla la fecha del navegador. El escenario de la API controlada
  // ya está fijado al06/11; el backend real se prueba con reloj inyectable enVitest.
  await cdp('Page.addScriptToEvaluateOnNewDocument', { source: `const FechaReal=Date;globalThis.Date=class extends FechaReal{constructor(...a){super(...(a.length?a:['2026-11-06T16:00:00Z']))}static now(){return new FechaReal('2026-11-06T16:00:00Z').getTime()}};` });
  const jwt = `qa.${Buffer.from(JSON.stringify({ sub: 'admin-qa', email: 'qa@example.invalid', rol: 'ADMINISTRADOR', exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url')}.simulado`;
  await cdp('Network.setCookie', { name: 'session', value: jwt, url: origen, httpOnly: true, sameSite: 'Lax' });
  await cdp('Page.navigate', { url: `${origen}/admin/reportes/renovacion` });
  await ui(`!!document.querySelector('input[type="date"]') && Object.keys(document.querySelector('input[type="date"]')).some(k=>k.startsWith('__reactProps$'))`, 'hidratación');
  async function click(expression) {
    const { x, y } = await evaluar(`(()=>{const e=${expression};e.scrollIntoView({block:'center'});const r=e.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`);
    await cdp('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
    await cdp('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
  }
  await click(`[...document.querySelectorAll('button')].find(e=>e.textContent==='Actualizar')`);
  await esperar(() => consultas.filter(q => q.startsWith('/api/v1/reportes/renovacion?')).length >= 2, 'Server Action inicial');
  await ui(`!!document.querySelector('[aria-label="Tasa de renovación"]')`, 'reporte cargado');
  async function cambiarRango(desde, hasta) {
    for (const [i, valor] of [desde, hasta].entries()) {
      await evaluar(`(()=>{const e=document.querySelectorAll('input[type="date"]')[${i}];Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(e,${JSON.stringify(valor)});e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));})()`);
      await evaluar('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))');
    }
    await click(`[...document.querySelectorAll('button')].find(e=>e.textContent==='Aplicar')`);
  }
  await cambiarRango(RANGO_RENOVACION.desde, RANGO_RENOVACION.hasta);
  await ui(`document.querySelector('[aria-label="Tasa de renovación"]')?.innerText.includes('57.1 %')`, 'escenario oficial');
  assert(await evaluar(`document.querySelector('[aria-label="Tasa de cancelación"]').innerText.includes('42.9 %')`));
  assert(await evaluar(`document.querySelector('svg[role="img"]').getAttribute('aria-label').includes('Total: 7.')`));
  assert.deepEqual(await evaluar(`[...document.querySelectorAll('tbody tr td:first-child')].map(e=>e.textContent)`), ['Sofía Castillo', 'Diego Flores', 'Laura Hernández']);
  async function capturas(escenario) {
    for (const width of [375, 1280]) for (const tema of ['light', 'dark']) {
      await cdp('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: false });
      await cdp('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: tema }] });
      await evaluar('window.scrollTo(0,0);new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))');
      const medida = await evaluar('({width:innerWidth,scroll:document.documentElement.scrollWidth,tema:getComputedStyle(document.body).backgroundColor})');
      assert(medida.scroll <= width, 'Overflow global');
      const metricas = await cdp('Page.getLayoutMetrics');
      const captura = await cdp('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: { x: 0, y: 0, width, height: metricas.cssContentSize.height, scale: 1 } });
      writeFileSync(join(carpeta, `${escenario}-${width}-${tema}.png`), Buffer.from(captura.data, 'base64'));
      resultado.vistas.push({ escenario, width, tema, medida });
    }
  }
  await capturas('oficial');
  await evaluar(`(()=>{const e=document.querySelector('input[type="search"]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(e,'SOFIA');e.dispatchEvent(new Event('input',{bubbles:true}));})()`);
  await ui(`document.querySelectorAll('tbody tr').length===1`, 'búsqueda ignorando tildes');
  await rpc('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: carpeta });
  await click(`[...document.querySelectorAll('button')].find(e=>e.textContent==='Exportar PDF')`);
  await esperar(() => existsSync(archivoPdf), 'descarga PDF real');
  const bytes = readFileSync(archivoPdf); const texto = bytes.toString('latin1');
  for (const valor of ['%PDF-', '%%EOF', 'Reporte de renovación y cancelación', '07/10/2026 al 06/11/2026', 'Generado el 06/11/2026 10:00',
    'Renovadas', 'Canceladas', 'En período de renovación', '57.1 %', '42.9 %', 'Sofía Castillo', 'Diego Flores', 'Laura Hernández', 'MBR-000021', '25/10/2026']) assert(texto.includes(valor), `PDF sin${valor}`);
  resultado.pdf = { archivo: archivoPdf, bytes: bytes.length, descarga: 'REAL sin mock save()', contenido: '3miembros completos aunque búsqueda muestre1; tasas/conteos/rango/fecha correctos', apertura: 'NO EJECUTADA' };
  await cambiarRango('2026-11-01', '2026-11-06');
  await ui(`!document.querySelector('svg[role="img"]') && document.body.innerText.includes('Sin datos suficientes')`, 'solo gracia');
  assert(await evaluar(`document.querySelector('[aria-label="En período de renovación"]').innerText.includes('1')`));
  await capturas('solo-gracia');
  // Intentar abrir los bytes descargados en el visor nativo, por HTTP inline.
  const { targetId: pdfId } = await rpc('Target.createTarget', { url: `http://127.0.0.1:${puertoApi}/qa/archivo.pdf` });
  const { sessionId: pdfSession } = await rpc('Target.attachToTarget', { targetId: pdfId, flatten: true });
  await rpc('Target.activateTarget', { targetId: pdfId }); await rpc('Page.enable', {}, pdfSession);
  await rpc('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false }, pdfSession);
  try {
    await esperar(async () => {
      const r = await rpc('Runtime.evaluate', { expression: `!!document.querySelector('embed[type="application/pdf"],pdf-viewer')`, returnByValue: true }, pdfSession); return r.result.value;
    }, 'visorPDF', 5000);
    await pausa(1500);
    const foto = await rpc('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false }, pdfSession);
    writeFileSync(join(carpeta, 'pdf-abierto.png'), Buffer.from(foto.data, 'base64'));
    resultado.pdf.apertura = 'Visor detectado; revisar captura pdf-abierto.png';
  } catch (error) {
    resultado.pdf.apertura = `BLOQUEADA: ${error.message}`;
    const r = await rpc('Runtime.evaluate', { expression: 'document.documentElement.outerHTML', returnByValue: true }, pdfSession);
    writeFileSync(join(carpeta, 'visor-pdf.json'), JSON.stringify(r.result.value));
  }
  resultado.consultas = consultas;
  writeFileSync(join(carpeta, 'resultado.json'), JSON.stringify(resultado, null, 2)); writeFileSync(join(carpeta, 'next.log'), salida);
  console.log(JSON.stringify({ carpeta, ...resultado }, null, 2));
} catch (error) {
  writeFileSync(join(carpeta, 'fallo.json'), JSON.stringify({ error: String(error), ...await diagnostico() }, null, 2));
  writeFileSync(join(carpeta, 'next.log'), salida); console.error(`Diagnóstico:${carpeta}`); throw error;
} finally {
  ws?.close(); navegador?.kill(); next?.kill(); api.closeAllConnections(); api.close();
}
