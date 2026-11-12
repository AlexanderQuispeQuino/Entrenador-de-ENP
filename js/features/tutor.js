"use strict";
const tutor = i => `<section class="ai" aria-label="Tutor con inteligencia artificial"><div class="ai-actions"><button class="btn pri" data-a="ai" data-v="${i}">✨ Explícame paso a paso</button><button class="btn" data-a="prac" data-v="${i}">🧪 Practicar uno parecido</button><details class="aimore"><summary aria-label="Más opciones del tutor">⋯ Más</summary><div class="aimore-menu"><button class="btn" data-a="say" data-v="ai|${i}">🔊 Escuchar la explicación</button><button class="btn" data-a="web" data-v="${i}|gemini">↗ Abrir en Gemini</button><button class="btn" data-a="web" data-v="${i}|chatgpt">↗ Abrir en ChatGPT</button></div></details></div><pre id="ai${i}" class="aiout" aria-live="polite" hidden></pre><div id="pr${i}"></div></section>`;
async function askGemini(i){
  const out = $('ai' + i), key = store.get('gkey'); out.hidden = false;
  if (!key){ out.textContent = 'Primero guarda tu clave gratuita de Gemini en ⚙ IA (aistudio.google.com → Get API key).'; return; }
  const ck = 'ai4:' + hash(prompt(i) + (store.get('gmodel') || '')), hit = store.get(ck);
  if (hit){ out.innerHTML = fmt(hit); return; }
  out.innerHTML = '<span class="think" role="status">Pensando</span>';
  try {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${store.get('gmodel') || 'gemini-3.5-flash-lite'}:generateContent`, {
      method:'POST', headers:{'Content-Type':'application/json','x-goog-api-key':key},
      body:JSON.stringify({system_instruction:{parts:[{text:SYS}]}, contents:[{role:'user', parts:[{text:prompt(i)}]}], generationConfig:{temperature:0.3, maxOutputTokens:1400}})});
    if (r.status === 429){ out.textContent = 'Llegaste al límite gratuito de Gemini (por minuto o por día). Espera un momento o usa «Abrir Gemini» / «Abrir ChatGPT».'; return; }
    const j = await r.json(), txt2 = j.candidates?.[0]?.content?.parts?.map(p => p.text).join('');
    if (txt2){ out.innerHTML = fmt(txt2); store.set(ck, txt2); } else out.textContent = j.error?.message || 'Sin respuesta.';
  } catch { out.textContent = 'No se pudo conectar. Revisa tu internet o usa "Abrir Gemini".'; }
}
async function openWeb(v){
  const [i, who] = v.split('|'), out = $('ai' + i); out.hidden = false;
  try { await navigator.clipboard.writeText(prompt(+i, true)); out.textContent = 'Copié la pregunta con las instrucciones. Pégala en el chat que se abrió.'; } catch { out.textContent = prompt(+i, true); }
  open(who === 'chatgpt' ? 'https://chatgpt.com/' : 'https://gemini.google.com/app', '_blank', 'noopener');
}
