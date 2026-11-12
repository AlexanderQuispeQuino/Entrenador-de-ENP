/* Comprueba que ningún archivo use al cargar una función definida en un archivo posterior.
   Uso (necesita acorn): node tools/check-load-order.js  — lee el orden de <script> de index.html */
const acorn = require('acorn'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..'), html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const order = [...html.matchAll(/<script src="(js\/[^"]+)"/g)].map(m => m[1]);
const defs = {}, ast = {}, out = new Set();
order.forEach((f, i) => { const a = acorn.parse(fs.readFileSync(path.join(root, f), 'utf8'), {ecmaVersion:'latest', sourceType:'script', locations:true}); ast[f] = a; a.body.forEach(n => { if (n.type === 'FunctionDeclaration') defs[n.id.name] = i; }); });
function visit(n, f, i){ if (!n || typeof n.type !== 'string') return;
  if (['FunctionDeclaration', 'FunctionExpression', 'ArrowFunctionExpression'].includes(n.type)) return;
  if (n.type === 'Identifier'){ if (defs[n.name] !== undefined && defs[n.name] > i) out.add(`${f}:${n.loc.start.line} usa «${n.name}» definida en ${order[defs[n.name]]}`); return; }
  if (n.type === 'MemberExpression'){ visit(n.object, f, i); if (n.computed) visit(n.property, f, i); return; }
  if (n.type === 'Property'){ if (n.computed) visit(n.key, f, i); visit(n.value, f, i); return; }
  for (const k of Object.keys(n)){ if (k === 'loc' || k === 'type') continue; const v = n[k]; Array.isArray(v) ? v.forEach(x => visit(x, f, i)) : visit(v, f, i); } }
order.forEach((f, i) => ast[f].body.forEach(n => visit(n, f, i)));
out.forEach(m => console.log('✗', m)); console.log(out.size ? 'Hay referencias a funciones de archivos posteriores.' : '✓ Orden de carga correcto (' + order.length + ' archivos).');
process.exit(out.size ? 1 : 0);
