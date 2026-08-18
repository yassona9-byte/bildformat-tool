# Bildformat — Redimensionador de imágenes para redes sociales

Web 100 % en alemán. Toda la interfaz que ve el visitante está en alemán; esta nota es para el propietario.

## Qué es

Herramienta que corre por completo en el navegador del visitante (las imágenes **no se suben a ningún servidor**): recorte visual con arrastre y zoom, modo «Einpassen» (encajar con relleno de color o fondo difuminado), exportación multiformato en ZIP, salida PNG/JPG/WebP con control de calidad y peso en vivo.

## Estructura

- `index.html` — la herramienta + contenido SEO (pasos, tabla de medidas 2026, ideas de uso, FAQ).
- `impressum.html` / `datenschutz.html` — páginas legales alemanas (§5 DDG y RGPD).
- `lib/manifest.js` — **tabla de datos con todos los formatos por plataforma**. Para actualizar medidas cada temporada se edita solo este archivo (y se sube el `?v=` de los HTML).
- `lib/vendor/jszip.min.js` — librería del ZIP (JSZip 3.10.1, versión fijada).
- `main.js` / `styles.css` — lógica y diseño.
- `.htaccess` — caché y tipos MIME para hosting Apache/LiteSpeed.
- `assets/og-image.png` — imagen para compartir en redes; se regenera con `python tools/generar-og-image.py` (necesita Pillow).
- `tools/` — scripts de desarrollo; no hace falta subirlos al hosting.

## Antes de publicar (obligatorio)

1. **Rellenar los huecos amarillos** de `impressum.html` y `datenschutz.html` (nombre, dirección, email, teléfono, hosting…). Están marcados como `[HIER … EINTRAGEN]`.
2. Añadir la URL canónica en `index.html` (hay un comentario `TODO` en el `<head>`).
3. Los huecos de publicidad (marcados ANZEIGE) están **ocultos** en la fase de prueba: el interruptor `adsEnabled` en `lib/manifest.js` está en `false`. Para la fase de monetización: poner `adsEnabled: true`, completar el Impressum con datos reales (y Gewerbe hecho), y pegar el código del anunciante dentro del bloque bloqueado por el banner de cookies (comentario en el `<head>` de `index.html`), para que solo cargue tras la aceptación del visitante.

## Vista previa local

```
python -m http.server 8137
```

y abrir http://localhost:8137/ (no abrir los archivos con doble clic: la vista previa necesita un servidor).
