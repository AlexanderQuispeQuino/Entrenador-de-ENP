"use strict";
/* Móvil: la explicación de IA y el ejercicio parecido se abren como hoja inferior.
   Arrastra hacia abajo para cerrar; la pestaña «Ver» (o deslizar hacia arriba) la vuelve a abrir. */
(() => {
  const mq = matchMedia('(max-width:700px)'), wrap = $('sheetwrap'), peek = $('sheetpeek'); let peekFor = null, dy = 0, drag = false, y0 = 0, t0 = 0;
  const find = () => (!mq.matches || $('v-exam').hidden) ? [] : [...document.querySelectorAll('#v-exam pre.aiout:not([hidden]), #v-exam [id^=pr]')].filter(n => (/^ai\d+$/.test(n.id) && n.textContent.trim()) || (/^pr\d+$/.test(n.id) && n.innerHTML.trim()));
  const kind = id => id.startsWith('pr') ? 'pr' : 'ai', idx = id => id.replace(/^\D+/, '');
  function setDy(v, anim){
    dy = v; [document.querySelector('.is-sheet'), wrap.querySelector('.sheet-bar')].forEach(n => { if (!n) return; n.style.transition = anim ? 'transform .22s cubic-bezier(.2,.7,.2,1)' : 'none'; n.style.transform = v ? `translateY(${v}px)` : ''; });
    wrap.querySelector('.sheet-backdrop').style.opacity = v ? String(Math.max(0, 1 - v / 450)) : '';
  }
  function peekable(){
    if (!mq.matches || !peekFor || $('v-exam').hidden) return false; const n = document.getElementById(peekFor); if (!n) return false;
    return kind(peekFor) === 'ai' ? !!n.textContent.trim() : !!S.prac?.[idx(peekFor)]?.cur;
  }
  function sync(){
    const top = find().pop(), was = !wrap.hidden;
    document.querySelectorAll('.is-sheet').forEach(n => { if (n !== top){ n.classList.remove('is-sheet'); n.style.transform = ''; n.style.transition = ''; } });
    if (top) top.classList.add('is-sheet');
    wrap.hidden = !top; document.body.classList.toggle('sheet-open', !!top);
    if (top){ peekFor = null; $('sheet-t').textContent = kind(top.id) === 'pr' ? '🧪 Ejercicio parecido' : '✨ Explicación paso a paso'; if (!was) $('sheet-x').focus({preventScroll:true}); }
    peek.hidden = !!top || !peekable();
    if (!peek.hidden) peek.textContent = kind(peekFor) === 'pr' ? '↑ Ver el ejercicio' : '↑ Ver la explicación';
  }
  const close = () => { const t = document.querySelector('.is-sheet'); if (!t) return; peekFor = t.id; if (kind(t.id) === 'pr') A.pracclose(idx(t.id)); else t.hidden = true; sync(); };
  const reopen = () => { if (!peekFor) return; const id = peekFor; if (kind(id) === 'pr') renderPrac(+idx(id)); else A.ai(idx(id)); setTimeout(sync, 0); };
  new MutationObserver(sync).observe($('v-exam'), {childList:true, subtree:true, attributes:true, attributeFilter:['hidden']});
  mq.addEventListener('change', sync);
  wrap.addEventListener('click', e => { if (e.target.closest('[data-sheet=close]')) close(); });
  peek.addEventListener('click', reopen);
  let py = 0; peek.addEventListener('touchstart', e => { py = e.touches[0].clientY; }, {passive:true});
  peek.addEventListener('touchend', e => { if (py - e.changedTouches[0].clientY > 24) reopen(); }, {passive:true});
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !wrap.hidden && !document.querySelector('dialog[open]')) close(); });
  document.addEventListener('touchstart', e => {
    const t = document.querySelector('.is-sheet'); if (!t || wrap.hidden) return;
    if (!(e.target.closest('.sheet-bar') || (t.contains(e.target) && t.scrollTop <= 0))) return;
    y0 = e.touches[0].clientY; t0 = Date.now(); drag = 'maybe';
  }, {passive:true});
  document.addEventListener('touchmove', e => {
    if (!drag) return; const d = e.touches[0].clientY - y0;
    if (drag === 'maybe'){ if (d > 8) drag = true; else if (d < -8){ drag = false; return; } else return; }
    if (e.cancelable) e.preventDefault(); setDy(Math.max(0, d), false);
  }, {passive:false});
  document.addEventListener('touchend', () => {
    if (drag !== true){ drag = false; return; } drag = false;
    const v = dy / Math.max(1, Date.now() - t0);
    if (dy > 110 || v > .6){ setDy(innerHeight, true); setTimeout(() => { close(); setDy(0, false); }, 210); } else setDy(0, true);
  });
})();
