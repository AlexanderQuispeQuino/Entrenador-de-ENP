"use strict";
/* ============ 2. ESTADO Y UTILIDADES ============ */
const S = {qs:[], i:0, ans:[], flag:[], mode:'train', end:0, timer:0, name:'', txtClosed:false, conf:[], cause:[], prac:{}};
const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const L = 'ABCDE';
/* Cada persona tiene su propio espacio: las claves 'enp-*' se guardan como u:<perfil>:enp-*; las globales (perfiles, tema, clave y modelo de Gemini, velocidad de voz, seguimiento) no. */
const GLOBALK = new Set(['enp-rate', 'enp-profiles', 'enp-active', 'enp-follow', 'theme', 'gkey', 'gmodel']);
let ACTIVE = ''; try { ACTIVE = localStorage.getItem('enp-active') || ''; } catch {}
const kmap = k => (k.startsWith('enp-') && !GLOBALK.has(k) && ACTIVE) ? 'u:' + ACTIVE + ':' + k : k;
const store = {get:k => { try { return localStorage.getItem(kmap(k)) } catch { return null } }, set:(k,v) => { try { localStorage.setItem(kmap(k),v) } catch {} }};
const show = id => { for (const v of ['v-home','v-prev','v-who','v-view','v-gen','v-learn','v-exam','v-ficha','v-res']) $(v).hidden = v !== id; scrollTo({top:0}); $('nav').hidden = id !== 'v-home'; document.body.classList.toggle('hasnav', id === 'v-home'); };

/* Tema claro/oscuro: respeta la preferencia del sistema y la guarda */
function setTheme(t){ document.documentElement.dataset.theme = t; $('themeBtn').textContent = t === 'dark' ? '☀️' : '🌙'; store.set('theme', t); }
setTheme(store.get('theme') || (matchMedia('(prefers-color-scheme:dark)').matches ? 'dark' : 'light'));

/* Diálogo propio (reemplaza confirm/alert nativos): devuelve una promesa con true/false */
function ask(msg, o = {}){
  return new Promise(res => {
    const d = $('ask'), danger = o.danger ?? /eliminar|descartar|reemplaza|quitar|se detendr/i.test(msg), ok = $('ask-ok'), no = $('ask-no');
    $('ask-t').textContent = o.title || (danger ? 'Confirma esta acción' : 'Confirmar'); $('ask-m').textContent = msg;
    ok.textContent = o.ok || (danger ? 'Sí, continuar' : 'Aceptar'); ok.classList.toggle('danger', danger); ok.classList.toggle('pri', !danger); no.hidden = !!o.only;
    const done = () => { d.removeEventListener('close', done); res(!!o.only || d.returnValue === 'ok'); };
    d.addEventListener('close', done); d.returnValue = ''; d.showModal(); (danger ? no : ok).focus();
  });
}
