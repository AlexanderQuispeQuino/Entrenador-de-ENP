"use strict";
const drop = $('drop');
['dragenter','dragover'].forEach(n => drop.addEventListener(n, e => { e.preventDefault(); drop.classList.add('over'); }));
['dragleave','drop'].forEach(n => drop.addEventListener(n, e => { e.preventDefault(); drop.classList.remove('over'); }));
drop.addEventListener('drop', e => handleFiles([...e.dataTransfer.files].filter(f => /\.pdf$/i.test(f.name))));
$('file').addEventListener('change', e => handleFiles([...e.target.files]));
document.querySelectorAll('label.btn,label.drop').forEach(l => { l.tabIndex = 0; l.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' '){ e.preventDefault(); l.querySelector('input')?.click(); } }); });
if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
document.body.classList.add('hasnav');
function autoResumeGen(){ const j = getGenJob(); if (!j || j.auto === false || GEN.running || !store.get('gkey')) return; reanudarGeneracion(true); }
document.addEventListener('visibilitychange', () => { if (document.visibilityState !== 'visible') return; if (GEN.running) wake(true); else if (ACTIVE) autoResumeGen(); });
addEventListener('pageshow', e => { if (e.persisted && ACTIVE) autoResumeGen(); });
addEventListener('beforeunload', e => { if (GEN.running){ e.preventDefault(); e.returnValue = ''; } });
bootWho() || (homeExtras(), autoResumeGen());
$('pimport').addEventListener('change', e => e.target.files[0] && importar(e.target.files[0]));
$('pfollow').addEventListener('change', e => e.target.files.length && followLoad([...e.target.files]));
