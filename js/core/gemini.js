"use strict";
/* ============ CAPA COMÚN DE GEMINI ============
   Todas las funciones de IA pasan por aquí. Resuelve los fallos más comunes:
   - Gemini 3.x ignora (y en el futuro rechaza) `temperature`: ya no se envía.
   - En Gemini 3.x los tokens de razonamiento cuentan dentro de maxOutputTokens: se sube el tope
     y se elige el nivel de razonamiento (bajo para redactar, medio para verificar respuestas).
   - Una respuesta cortada o JSON inválido se trata como error recuperable (se reintenta).
   - Las peticiones tienen tiempo límite: antes una conexión colgada dejaba la generación detenida para siempre.
   - Los errores llevan clasificación: status, transient, daily (cuota diaria), fatal (clave inválida), kind. */
const GEMINI_DEFAULT_MODEL = 'gemini-3.5-flash-lite';
const modelId = () => (store.get('gmodel') || '').trim() || GEMINI_DEFAULT_MODEL;
const geminiURL = () => `https://generativelanguage.googleapis.com/v1beta/models/${modelId()}:generateContent`;
const supportsThinkingLevel = () => /gemini-(3|4)/i.test(modelId());
const _noThink = new Set();   // modelos que rechazaron thinkingConfig en esta sesión

function _retryMs(r, j, detail){
  const h = Number(r.headers && r.headers.get && r.headers.get('Retry-After'));
  if (h > 0) return Math.min(h * 1000, 120000);
  const det = (j && j.error && j.error.details || []).find(d => d && d.retryDelay);
  const s = det ? parseFloat(det.retryDelay) : parseFloat((String(detail).match(/retry in ([\d.]+)s/i) || [])[1]);
  return s > 0 ? Math.min(Math.ceil(s * 1000) + 1000, 120000) : 0;
}

/* Llamada cruda. Devuelve {text, finish}. opts: {schema, think:'minimal'|'low'|'medium'|'high', maxTokens, timeout} */
async function geminiRaw(sys, user, opts = {}){
  const key = store.get('gkey');
  if (!key){ const e = new Error('GEMINI_KEY: Falta tu clave de Gemini (⚙ IA).'); e.fatal = true; throw e; }
  const gc = {maxOutputTokens: opts.maxTokens || 8192};
  if (opts.schema){ gc.responseMimeType = 'application/json'; gc.responseSchema = opts.schema; }
  const mdl = modelId(), useThink = opts.think && supportsThinkingLevel() && !_noThink.has(mdl);
  if (useThink) gc.thinkingConfig = {thinkingLevel: opts.think};
  const body = () => JSON.stringify({system_instruction:{parts:[{text:sys}]}, contents:[{role:'user', parts:[{text:user}]}], generationConfig:gc});
  let r, j = {};
  for (let pass = 0; pass < 2; pass++){
    const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), opts.timeout || 120000);
    try {
      r = await fetch(geminiURL(), {method:'POST', signal:ctl.signal, headers:{'Content-Type':'application/json', 'x-goog-api-key':key}, body:body()});
    } catch (e) {
      const err = new Error(e && e.name === 'AbortError' ? 'GEMINI_TIMEOUT: Gemini tardó demasiado en responder.' : 'GEMINI_NETWORK: No se pudo conectar con Gemini. Revisa tu conexión.');
      err.transient = true; err.kind = 'network'; throw err;
    } finally { clearTimeout(timer); }
    j = {}; try { j = await r.json(); } catch {}
    const detail = (j.error && j.error.message) || '';
    // El modelo no admite thinkingConfig: reintenta una vez sin él y recuérdalo.
    if (r.status === 400 && gc.thinkingConfig && /think/i.test(detail)){ delete gc.thinkingConfig; _noThink.add(mdl); continue; }
    break;
  }
  if (!r.ok){
    const detail = (j.error && j.error.message) || ('Gemini HTTP ' + r.status), err = new Error('GEMINI_HTTP_' + r.status + ': ' + detail);
    err.status = r.status;
    err.daily = r.status === 429 && /per ?day|daily|PerDay/i.test(detail + JSON.stringify((j.error && j.error.details) || ''));
    err.fatal = (r.status === 400 && /api key|API_KEY/i.test(detail)) || r.status === 401 || r.status === 403 || r.status === 404;
    err.transient = !err.fatal && !err.daily && ([408, 500, 502, 503, 504].includes(r.status) || r.status === 429);
    const ra = _retryMs(r, j, detail); if (ra) err.retryAfterMs = ra;
    throw err;
  }
  const cand = j.candidates && j.candidates[0], finish = cand && cand.finishReason;
  const text = ((cand && cand.content && cand.content.parts) || []).filter(p => !p.thought).map(p => p.text || '').join('');
  if (!text.trim()){
    const err = new Error(j.promptFeedback && j.promptFeedback.blockReason ? 'GEMINI_BLOCKED: Gemini bloqueó la petición (' + j.promptFeedback.blockReason + ').' : 'GEMINI_EMPTY: Gemini devolvió una respuesta vacía' + (finish ? ' (' + finish + ')' : '') + '.');
    err.transient = true; err.kind = 'format'; err.finish = finish; throw err;
  }
  return {text, finish};
}

/* Respuesta estructurada. `temp` se conserva por compatibilidad pero ya no se envía. opts: {think, maxTokens} */
async function geminiJSON(sys, user, schema, temp, opts = {}){
  const {text, finish} = await geminiRaw(sys, user, {schema, think:opts.think, maxTokens:opts.maxTokens || 16384, timeout:opts.timeout});
  try { return JSON.parse(text.replace(/^\s*```(?:json)?\s*|\s*```\s*$/g, '').trim()); }
  catch {
    const err = new Error(finish === 'MAX_TOKENS' ? 'GEMINI_TRUNCATED: La respuesta de Gemini se cortó antes de terminar.' : 'GEMINI_JSON: Gemini devolvió JSON no válido.');
    err.transient = true; err.kind = 'format'; err.finish = finish; throw err;
  }
}

/* Texto libre (tutor, pistas, plan, lecciones). Reintenta una vez ante fallos temporales. */
async function geminiText(sys, user, opts = {}){
  let last;
  for (let k = 0; k < 2; k++){
    try { return (await geminiRaw(sys, user, {think:opts.think, maxTokens:opts.maxTokens || 4096, timeout:opts.timeout || 90000})).text; }
    catch (e){ last = e; if (!e.transient || k) break; await new Promise(r => setTimeout(r, e.retryAfterMs && e.retryAfterMs < 15000 ? e.retryAfterMs : 2500)); }
  }
  throw last;
}

/* Mensaje claro para el estudiante a partir de un error de Gemini */
function geminiErrText(e){
  const m = (e && e.message) || '';
  if (e && e.fatal){
    if (e.status === 404) return 'Gemini no encuentra el modelo «' + modelId() + '». Abre ⚙ IA y deja vacío el campo «Modelo» (se usa ' + GEMINI_DEFAULT_MODEL + ') o escribe uno válido.';
    if (e.status === 400 || e.status === 401 || e.status === 403) return 'Gemini rechazó tu clave. Revisa en ⚙ IA que esté bien copiada (aistudio.google.com → Get API key).';
    return 'Falta tu clave de Gemini: guárdala en ⚙ IA.';
  }
  if (e && e.daily) return 'Se agotó la cuota diaria gratuita de Gemini. Se renueva cada día; mientras tanto puedes usar «Abrir Gemini» o «Abrir ChatGPT».';
  if (e && e.status === 429) return 'Gemini alcanzó su límite por minuto. Espera un momento e inténtalo otra vez.';
  if (e && (e.status === 503 || /high demand|overload/i.test(m))) return 'Gemini tiene alta demanda en este momento. Inténtalo de nuevo en unos minutos.';
  if (e && e.kind === 'network') return 'No se pudo conectar con Gemini. Revisa tu internet.';
  if (e && e.kind === 'format') return 'Gemini devolvió una respuesta incompleta. Inténtalo otra vez.';
  return m.replace(/^GEMINI_[A-Z0-9_]+:\s*/, '') || 'No se pudo obtener respuesta de Gemini.';
}

/* geminiJSON con reintentos cortos (interactivo: ejercicio parecido, refuerzo). El examen largo usa gem() con esperas más largas. */
async function geminiJSONRetry(sys, user, schema, temp, opts = {}){
  let last;
  for (let k = 0; k < 3; k++){
    try { return await geminiJSON(sys, user, schema, temp, opts); }
    catch (e){ last = e; if (!e.transient || e.daily) throw e; await new Promise(r => setTimeout(r, e.retryAfterMs && e.retryAfterMs <= 30000 ? e.retryAfterMs : 2500 * (k + 1))); }
  }
  throw last;
}
