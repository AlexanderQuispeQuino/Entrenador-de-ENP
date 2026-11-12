"use strict";
/* Limpia lo que Gemini devuelva (LaTeX, ### y **) y oculta la respuesta del ejercicio hasta que el alumno la pida */
const SUP = {'0':'⁰','1':'¹','2':'²','3':'³','4':'⁴','5':'⁵','6':'⁶','7':'⁷','8':'⁸','9':'⁹','-':'⁻','+':'⁺'};
const SUBS = {'0':'₀','1':'₁','2':'₂','3':'₃','4':'₄','5':'₅','6':'₆','7':'₇','8':'₈','9':'₉','+':'₊','-':'₋','n':'ₙ','i':'ᵢ'};
/* Sin KaTeX (p. ej. primera vez sin internet): convierte LaTeX básico a símbolos Unicode */
function texPlain(s){
  const sup = e => [...e].map(c => SUP[c] ?? c).join(''), sub = e => [...e].map(c => SUBS[c] ?? c).join('');
  return s.replace(/\\left|\\right/g,'').replace(/\\(?:text|mathrm|mathbf|operatorname)\{([^}]*)\}/g,'$1').replace(/\\frac\{([^{}]*)\}\{([^{}]*)\}/g,'($1)/($2)').replace(/\\sqrt\{([^{}]*)\}/g,'√($1)')
    .replace(/\\times/g,'×').replace(/\\cdot/g,'·').replace(/\\div/g,'÷').replace(/\\leq?(?![a-zA-Z])/g,'≤').replace(/\\geq?(?![a-zA-Z])/g,'≥').replace(/\\neq/g,'≠').replace(/\\approx/g,'≈').replace(/\\pm/g,'±').replace(/\\pi/g,'π')
    .replace(/\^\{([^{}]*)\}/g,(_, e) => sup(e)).replace(/\^(-?\w)/g,(_, e) => sup(e)).replace(/_\{([^{}]*)\}/g,(_, e) => sub(e)).replace(/_(\w)/g,(_, e) => sub(e))
    .replace(/\\[,;!: ]/g,' ').replace(/\\([a-zA-Z]+)/g,'$1').replace(/[{}]/g,'');
}
function mathHTML(tex, disp){
  try { if (window.katex) return katex.renderToString(tex, {displayMode:disp, throwOnError:false, output:'html', strict:'ignore'}); } catch {}
  return `<span class="mfb" data-tex="${esc(tex)}" data-d="${disp ? 1 : 0}">${esc(texPlain(tex))}</span>`;
}
/* Si KaTeX llegó tarde, convierte lo que se pintó como respaldo */
function upgradeMath(){
  if (!window.katex) return;
  document.querySelectorAll('.mfb[data-tex]').forEach(el => { try { el.outerHTML = katex.renderToString(el.dataset.tex, {displayMode:el.dataset.d === '1', throwOnError:false, output:'html', strict:'ignore'}); } catch {} });
}
addEventListener('load', upgradeMath);
/* Texto plano con símbolos Unicode (2⁴, 5/7, √13, ½…) → fórmulas KaTeX. Se aplica al mostrar; los datos y la voz no cambian */
const SUPD = '⁰¹²³⁴⁵⁶⁷⁸⁹', SUBD = '₀₁₂₃₄₅₆₇₈₉', VULG = {'½':'\\frac{1}{2}','¼':'\\frac{1}{4}','¾':'\\frac{3}{4}','⅓':'\\frac{1}{3}'};
function inTex(s){
  return s.replace(/[⁻⁺]?[⁰¹²³⁴⁵⁶⁷⁸⁹ˣⁿ]+/g, m => '^{' + [...m].map(c => c === '⁻' ? '-' : c === '⁺' ? '+' : c === 'ˣ' ? 'x' : c === 'ⁿ' ? 'n' : SUPD.indexOf(c)).join('') + '}')
    .replace(/[ₙᵢ₀₁₂₃₄₅₆₇₈₉₊₋]+/g, m => '_{' + [...m].map(c => c === 'ₙ' ? 'n' : c === 'ᵢ' ? 'i' : c === '₊' ? '+' : c === '₋' ? '-' : SUBD.indexOf(c)).join('') + '}')
    .replace(/×/g,'\\times ').replace(/·/g,'\\cdot ').replace(/÷/g,'\\div ').replace(/−/g,'-').replace(/≤/g,'\\le ').replace(/≥/g,'\\ge ').replace(/≠/g,'\\ne ').replace(/≈/g,'\\approx ').replace(/π/g,'\\pi ')
    .replace(/√(\d+|[a-zA-Z])/g,'\\sqrt{$1}').replace(/[½¼¾⅓]/g, c => VULG[c]);
}
function autoTex(t, hold){
  const H = tex => hold(tex, false);
  return String(t)
    .replace(/√\(([^()]+)\)/g, (_, a) => H('\\sqrt{' + inTex(a) + '}'))
    .replace(/√(\d+(?:,\d+)?|[a-zA-Z])/g, (_, a) => H('\\sqrt{' + a.replace(',', '{,}') + '}'))
    .replace(/(?<![\dA-Za-zπ,])(π?[A-Za-z]|\d+)([⁻⁺]?[⁰¹²³⁴⁵⁶⁷⁸⁹ˣⁿ]+)/g, (_, b, e) => H(inTex(b + e)))
    .replace(/(?<![A-Za-z])([A-Za-z])([ₙᵢ₀₁₂₃₄₅₆₇₈₉]+)/g, (_, b, e) => H(b + inTex(e)))
    .replace(/(−)?(?<![\d/,.])(\d+)\/(\d+)(?![\d/])/g, (_, m, a, b) => H((m ? '-' : '') + '\\frac{' + a + '}{' + b + '}'))
    .replace(/[½¼¾⅓]/g, c => H(VULG[c]));
}
/* Texto → HTML seguro con fórmulas: acepta $…$ / $$…$$ y detecta símbolos Unicode */
function rich(s){
  const M = [], hold = (tex, d) => '\u0000' + (M.push([tex.trim(), d]) - 1) + '\u0000';
  const t = autoTex(String(s ?? '').replace(/\$\$([\s\S]+?)\$\$/g, (_, a) => hold(a, true)).replace(/\$([^$\n]+?)\$/g, (_, a) => hold(a, false)), hold);
  return esc(t).replace(/\u0000(\d+)\u0000/g, (_, k) => mathHTML(M[k][0], M[k][1]));
}
/* Markdown → HTML (listas numeradas y anidadas, viñetas, títulos, tablas, citas, negrita/cursiva/código y matemáticas) */
/* Si la IA escribe comandos LaTeX sin $…$ (p. ej. \frac{1}{2}), los envuelve para que se dibujen como fórmula */
const BARE = /\\(?:frac|cup|cap|times|div|cdot|sqrt|leq?|geq?|neq|approx|pi|left|right|text|in|subset|pm|infty)(?![a-zA-Z])/;
function wrapBare(t, hold){
  return t.split('\n').map(l => {
    if (!BARE.test(l.replace(/\u0000\d+\u0000/g, ''))) return l;
    const i = l.search(BARE), left = l.slice(0, i), cut = Math.max(left.lastIndexOf(': '), left.lastIndexOf('. '));
    const words = (left.slice(cut + 1).match(/[A-Za-záéíóúñÁÉÍÓÚ]{4,}/g) || []).length, start = words <= 1 ? cut + 1 : i;
    const tail = l.slice(start).replace(/[.\s|]+$/, '');
    return tail.trim() ? l.slice(0, start) + hold(tail.trim(), false) + l.slice(start + tail.length).replace(/\|/g, '') : l;
  }).join('\n');
}
const KIND = t => { t = t.toLowerCase();
  return /conclusi|comprobaci|^respuesta/.test(t) ? ['ok','✅'] : /error|enga[ñn]|trampa|otras alternativas/.test(t) ? ['bad','⚠️'] : /truco|recordar|mnemo/.test(t) ? ['tip','🎁']
    : /atajo|r[aá]pid/.test(t) ? ['fast','⚡'] : /idea|clave|concepto/.test(t) ? ['idea','💡'] : /qu[eé] te piden|datos|enunciado/.test(t) ? ['ask','🎯']
    : /ponte a prueba|reto/.test(t) ? ['try','🧪'] : /paso a paso|pasos/.test(t) ? ['steps','🪜'] : ['plain','']; };
function md(src){
  const M = [], hold = (tex, disp) => '\u0000' + (M.push([tex.trim(), disp]) - 1) + '\u0000';
  const t = wrapBare(autoTex(String(src).replace(/\r/g,'')
    .replace(/\$\$([^$]+?)\$\$|\\\[([\s\S]+?)\\\]/g, (_, a, b) => '\n' + hold(a ?? b, true) + '\n')
    .replace(/\\\((.+?)\\\)|\$([^$\n]+?)\$/g, (_, a, b) => hold(a ?? b, false)).replace(/\$/g, '').replace(/(\u0000\d+\u0000)\|+$/gm, '$1'), hold), hold);
  const inline = x => esc(x.trim()).replace(/\*\*(.+?)\*\*/g,'<b>$1</b>').replace(/(^|[\s(])\*(?!\s)([^*]+?)\*(?=[\s).,;:!?]|$)/g,'$1<i>$2</i>').replace(/`([^`]+)`/g,'<code>$1</code>').replace(/\u0000(\d+)\u0000/g,(_, k) => mathHTML(M[k][0], false));
  const out = [], st = []; let sec = false;
  const endTo = ind => { while (st.length && st[st.length - 1].ind > ind) out.push('</li></' + st.pop().tag + '>'); };
  const lines = t.split('\n');
  for (let k = 0; k < lines.length; k++){
    const raw = lines[k]; if (!raw.trim()) continue;
    const ind = raw.match(/^\s*/)[0].replace(/\t/g,'    ').length, s = raw.trim(); let m;
    if (/^\u0000\d+\u0000$/.test(s)){ out.push(`<div class="mdeq">${mathHTML(M[s.slice(1, -1)][0], true)}</div>`); continue; }
    if ((m = s.match(/^(#{1,4})\s+(.*)$/))){ endTo(-1); if (sec){ out.push('</section>'); sec = false; }
      const title = m[2].replace(/^[\p{Extended_Pictographic}\uFE0F\s]+/u, '').replace(/\*\*/g, ''), k = KIND(title);
      if (k[0] === 'plain') out.push(`<h4 class="mdh">${inline(title)}</h4>`); else { out.push(`<section class="cal k-${k[0]}"><h4 class="calh"><span class="cico" aria-hidden="true">${k[1]}</span>${inline(title)}</h4>`); sec = true; } continue; }
    if (/^(-{3,}|\*{3,})$/.test(s)){ endTo(-1); out.push('<hr>'); continue; }
    if (s.startsWith('|') && k + 1 < lines.length && /^\s*\|?\s*:?-{2,}/.test(lines[k + 1])){
      endTo(-1); const rows = []; let j = k; while (j < lines.length && lines[j].trim().startsWith('|')){ rows.push(lines[j].trim()); j++; } k = j - 1;
      const cells = r => r.replace(/^\||\|$/g,'').split('|').map(inline);
      out.push(`<div class="mdt"><table><thead><tr>${cells(rows[0]).map(c => `<th>${c}</th>`).join('')}</tr></thead><tbody>${rows.slice(2).map(r => `<tr>${cells(r).map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`); continue;
    }
    const om = s.match(/^(\d{1,3})[.)]\s+(.*)$/), bm = !om && s.match(/^[-*•+]\s+(.*)$/);
    if (om || bm){
      const tag = om ? 'ol' : 'ul'; endTo(ind); const top = st[st.length - 1];
      if (top && top.ind === ind && top.tag === tag) out.push('</li>');
      else if (top && top.ind === ind){ out.push('</li></' + st.pop().tag + '>'); st.push({ind, tag}); out.push(`<${tag}>`); }
      else { st.push({ind, tag}); out.push(`<${tag}>`); }
      out.push(`<li${om ? ` value="${om[1]}"` : ''}>${inline(om ? om[2] : bm[1])}`); continue;
    }
    if (ind > 0) endTo(ind - 1); else endTo(-1);
    const lb = s.match(/^\*\*([^*]{2,40}?)\s*:?\*\*\s*:?\s*(.*)$/), lk = lb && KIND(lb[1]);
    if (lk && lk[0] !== 'plain' && lk[0] !== 'steps'){ if (sec){ out.push('</section>'); sec = false; } out.push(`<div class="cal k-${lk[0]}"><h4 class="calh"><span class="cico" aria-hidden="true">${lk[1]}</span>${esc(lb[1])}</h4>${lb[2] ? `<p>${inline(lb[2])}</p>` : ''}</div>`); continue; }
    out.push((m = s.match(/^>\s?(.*)$/)) ? `<blockquote>${inline(m[1])}</blockquote>` : `<p>${inline(s)}</p>`);
  }
  endTo(-1); if (sec) out.push('</section>'); return out.join('');
}
function fmt(t){
  let [main, ans] = String(t).split('@@RESPUESTA@@');
  if ((main.match(/Paso\s*\d+\s*[:.)]/g) || []).length >= 2 && !/^\s*\d+[.)]\s/m.test(main))   // textos antiguos en un solo párrafo
    main = main.replace(/\s+(?=Paso\s*\d+\s*[:.)]\s)/g,'\n').replace(/^Paso\s*(\d+)\s*[:.)]\s*/gm,'$1. ').replace(/\s+(?=(?:Respuesta|Comprobaci[oó]n)\s*:)/g,'\n').replace(/^(Respuesta|Comprobaci[oó]n)\s*:/gm,'**$1:**');
  return md(main) + (ans ? `<details class="aians"><summary>Ver la respuesta del ejercicio</summary><div>${md(ans)}</div></details>` : '');
}
