"use strict";
/* Atajos: A–D responden, ←/→ navegan, M marca */
document.addEventListener('keydown', e => {
  if ($('v-exam').hidden || e.ctrlKey || e.metaKey || /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
  const k = e.key.toLowerCase(), j = 'abcde'.indexOf(k);
  if (k.length === 1 && j >= 0 && S.qs[S.i]?.o[j]?.trim()) A.pick(String(j));
  else if (e.key === 'ArrowRight') A.go(S.i + 1); else if (e.key === 'ArrowLeft') A.go(S.i - 1); else if (k === 'm') A.flag(); else if (k.length === 1 && '123'.includes(k)) A.conf('sda'[+k - 1]);
});
document.addEventListener('toggle', e => { if (e.target.classList?.contains('txtd')) S.txtClosed = !e.target.open; }, true);
