"use strict";
/* Deslizar para cambiar de pregunta (táctil) */
(() => { let x0 = 0, y0 = 0, t0 = 0, ok = false; const ex = $('v-exam');
  ex.addEventListener('touchstart', e => { const t = e.touches[0]; x0 = t.clientX; y0 = t.clientY; t0 = Date.now(); ok = e.touches.length === 1 && !e.target.closest('.fig,.strip,.aieq,.aiout,textarea,input,select,details'); }, {passive:true});
  ex.addEventListener('touchend', e => { if (!ok || ex.hidden) return; const t = e.changedTouches[0], dx = t.clientX - x0, dy = t.clientY - y0; if (Math.abs(dx) > 70 && Math.abs(dy) < 45 && Date.now() - t0 < 600) A.go(String(S.i + (dx < 0 ? 1 : -1))); }, {passive:true}); })();
document.addEventListener('click', e => { const m = e.target.closest('.aimore-menu button'); if (m) m.closest('details').open = false; });
document.addEventListener('input', e => { const {f, i} = e.target.dataset; if (!f) return; const q = S.qs[+i];
  if (f === 'a') q.a = e.target.value === '' ? null : +e.target.value; else if (f[0] === 'o') q.o[+f[1]] = e.target.value; else q[f] = e.target.value; });
