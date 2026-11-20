"use strict";
const tutor = i => `<section class="ai" aria-label="Tutor con inteligencia artificial"><div class="ai-actions"><button class="btn pri" data-a="ai" data-v="${i}">✨ Explícame paso a paso</button><button class="btn" data-a="prac" data-v="${i}">🧪 Practicar uno parecido</button><details class="aimore"><summary aria-label="Más opciones del tutor">⋯ Más</summary><div class="aimore-menu"><button class="btn" data-a="say" data-v="ai|${i}">🔊 Escuchar la explicación</button><button class="btn" data-a="web" data-v="${i}|gemini">↗ Abrir en Gemini</button><button class="btn" data-a="web" data-v="${i}|chatgpt">↗ Abrir en ChatGPT</button></div></details></div><pre id="ai${i}" class="aiout" aria-live="polite" hidden></pre><div id="pr${i}"></div></section>`;
async function askGemini(i){
  const out = $('ai' + i), key = store.get('gkey'); out.hidden = false;
  if (!key){ out.textContent = 'Primero guarda tu clave gratuita de Gemini en ⚙ IA (aistudio.google.com → Get API key).'; return; }
  const ck = 'ai4:' + hash(prompt(i) + (store.get('gmodel') || '')), hit = store.get(ck);
  if (hit){ out.innerHTML = fmt(hit); return; }
  out.innerHTML = '<span class="think" role="status">Pensando</span>';
  try {
    const t = await geminiText(SYS, prompt(i), {think:'low', maxTokens:4096});
    out.innerHTML = fmt(t); store.set(ck, t);
  } catch (e) { out.textContent = geminiErrText(e) + (e && (e.transient || e.daily || e.status === 429) ? ' También puedes usar «Abrir Gemini» o «Abrir ChatGPT».' : ''); }
}
async function openWeb(v){
  const [i, who] = v.split('|'), out = $('ai' + i); out.hidden = false;
  try { await navigator.clipboard.writeText(prompt(+i, true)); out.textContent = 'Copié la pregunta con las instrucciones. Pégala en el chat que se abrió.'; } catch { out.textContent = prompt(+i, true); }
  open(who === 'chatgpt' ? 'https://chatgpt.com/' : 'https://gemini.google.com/app', '_blank', 'noopener');
}
