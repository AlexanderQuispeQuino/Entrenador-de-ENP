# Entrenador ENP · Beca 18

App web para practicar el examen ENP de Beca 18. Funciona 100 % en el navegador (sin servidor) y sin conexión después de la primera visita.

## Estructura
```
index.html            Estructura de la página (carga css/ y js/ en orden)
css/                  Estilos en capas, en el orden en que se cargan (00 → 18)
js/data/              Banco 2024 y 2025, textos de lectura, consejos y teoría (solo datos)
js/core/              Estado, almacenamiento, utilidades y diálogos
js/render/            Markdown y fórmulas (KaTeX)
js/features/          Examen, tutor IA, resultados, historial, lecciones, generador de exámenes, soluciones, perfiles
js/ui/                Eventos, pestañas, hoja inferior móvil, atajos
js/main.js            Arranque
img/                  Figuras de los exámenes (WebP)
sw.js, manifest.webmanifest, icon-*.png   PWA: uso sin conexión e instalación
tools/check-load-order.js   Verifica el orden de carga de los scripts
```

## Importante sobre el orden de los scripts
Los archivos de `js/` son scripts clásicos que comparten el ámbito global y **se cargan en el orden de `index.html`**.
Si agregas un archivo, colócalo en ese orden y ejecuta `node tools/check-load-order.js` (requiere `npm i acorn`).

## Probar en local
Doble clic en `index.html`, o con servidor: `python3 -m http.server 8000` → http://localhost:8000

## Publicar en GitHub Pages
1. Sube la carpeta a un repositorio (`.nojekyll` ya está incluido).
2. Settings → Pages → Source: *Deploy from a branch* → `main` / `(root)`.
3. Abre `https://TU-USUARIO.github.io/TU-REPO/`.

## Seguridad y datos
- **Nunca subas tu clave de Gemini.** Se guarda solo en el navegador de cada persona (⚙ IA).
- El progreso, el historial y las soluciones viven en el `localStorage` de cada navegador.
- El contenido de los exámenes pertenece a Pronabec; el repositorio es público.
