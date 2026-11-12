"use strict";
/* ============ 15. VOZ (fase 9): lectura en voz alta con la síntesis de voz del navegador (gratis, sin cuota de Gemini) ============ */
const tts = {ok: 'speechSynthesis' in window, rate: +(store.get('enp-rate') || 1)};
const SUPN = {'⁰':'0','¹':'1','²':'2','³':'3','⁴':'4','⁵':'5','⁶':'6','⁷':'7','⁸':'8','⁹':'9','⁻':'menos '};
/* Convierte símbolos matemáticos a palabras para que la voz los lea bien */
function texSpeak(t){ return t.replace(/\$/g, '').replace(/\\[dt]?frac\{([^{}]*)\}\{([^{}]*)\}/g, '$1 sobre $2').replace(/\\sqrt\{([^{}]*)\}/g, 'raíz de $1').replace(/\\(?:times|cdot)/g, ' por ').replace(/\\le(?![a-z])/g, ' menor o igual que ').replace(/\^\{?(-?\w+)\}?/g, ' elevado a $1 ').replace(/\\(?:left|right|text|quad|,)/g, ' ').replace(/\\[a-zA-Z]+/g, ' ').replace(/[{}]/g, ''); }
function sayable(t){ t = texSpeak(String(t));
  return String(t).replace(/<[^>]+>/g, ' ').replace(/([⁻]?[⁰¹²³⁴⁵⁶⁷⁸⁹]+)/g, m => { const n = [...m].map(c => SUPN[c] ?? c).join(''); return n === '2' ? ' al cuadrado ' : n === '3' ? ' al cubo ' : ' elevado a ' + n + ' '; })
    .replace(/[×·]/g, ' por ').replace(/÷/g, ' entre ').replace(/√/g, ' raíz de ').replace(/[−–]/g, ' menos ').replace(/≤/g, ' menor o igual que ').replace(/≥/g, ' mayor o igual que ')
    .replace(/=/g, ' igual a ').replace(/π/g, ' pi ').replace(/(\d+)\s*%/g, '$1 por ciento').replace(/S\/\s*/g, ' soles ').replace(/(\d)\/(\d)/g, '$1 sobre $2').replace(/\s+/g, ' ').trim();
}
function stopSpeech(){ if (tts.ok) speechSynthesis.cancel(); }
function speak(text){
  if (!tts.ok || !text) return; stopSpeech();
  const u = new SpeechSynthesisUtterance(sayable(text)), vs = speechSynthesis.getVoices();
  u.lang = 'es-PE'; u.rate = tts.rate;
  const v = vs.find(x => /^es[-_](PE|419|MX|US)/i.test(x.lang)) || vs.find(x => /^es/i.test(x.lang)); if (v) u.voice = v;
  speechSynthesis.speak(u);
}
const sayUI = q => !tts.ok ? '' : `<div class="row say"><button class="chip-b" data-a="say" data-v="q">🔊 Escuchar pregunta</button><button class="chip-b" data-a="say" data-v="all">🔊 Con alternativas</button>${q.tx ? '<button class="chip-b" data-a="say" data-v="text">🔊 Leer el texto</button>' : ''}<button class="chip-b" data-a="stopsay" aria-label="Detener la lectura">⏹</button><button class="chip-b" data-a="rate" aria-label="Velocidad de lectura">⏩ ${tts.rate}×</button></div>`;
