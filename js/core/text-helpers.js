"use strict";
const qText = q => TEXTS[q.tx] || q.txh || '';
const txt = (q, fold) => { const t = qText(q); return !t ? '' : fold ? `<details class="fig"><summary>Ver el texto</summary><div class="txt">${t}</div></details>` : `<details class="fig txtd" ${S.txtClosed ? '' : 'open'}><summary>Texto de lectura</summary><div class="txt">${t}</div></details>`; };
