# Bildformat — bildformat-tool.de

Web alemana para recortar y adaptar imágenes a los formatos de redes sociales.
Toda la interfaz que ve el visitante está en alemán; estas notas son para el propietario.

**En vivo:** https://bildformat-tool.de
**Hosting:** GitHub Pages (gratis) · **Dominio:** netcup (~5 €/año) · **Coste mensual: 0 €**

## Cómo funciona la publicación

Cada cambio que se sube a la rama `main` se publica solo en un par de minutos
(flujo `.github/workflows/pages.yml`). No hay que subir nada por FTP ni tocar el hosting.

## Estado actual: fase de prueba (sin monetizar)

- Sin publicidad: el interruptor `adsEnabled` de `lib/manifest.js` está en `false`,
  así que los tres huecos ANZEIGE quedan ocultos.
- `impressum.html` es una página de contacto de proyecto privado no comercial.
- `datenschutz.html` está completa y al día (procesamiento local, hosting GitHub Pages,
  sin scripts de terceros).
- Medición: Google Search Console (impresiones y clics desde Google), sin rastreadores
  en la web ni cookies de terceros.

## Estructura

- `index.html` — la herramienta + contenido SEO (pasos, tabla de medidas, usos, FAQ).
- `impressum.html` / `datenschutz.html` — páginas legales.
- `lib/manifest.js` — **tabla de datos con todos los formatos por plataforma** y el
  interruptor de publicidad. Para actualizar medidas cada temporada se edita solo
  este archivo (y se sube el número de `?v=` en los HTML para refrescar la caché).
- `lib/vendor/jszip.min.js` — librería para el ZIP (JSZip 3.10.1).
- `main.js` / `styles.css` — lógica y diseño (claro y oscuro automáticos).
- `CNAME` — declara el dominio propio a GitHub Pages. No borrar.
- `robots.txt` / `sitemap.xml` — para buscadores.
- `assets/og-image.png` — imagen al compartir; se regenera con `python tools/generar-og-image.py`.
- `.htaccess` — solo se usaría en un hosting Apache; en GitHub Pages se ignora.

## Para monetizar (fase 2)

1. Dar de alta el Gewerbe (obligatorio para ingresos por publicidad en Alemania).
2. Sustituir `impressum.html` por la versión completa del §5 DDG: la plantilla con los
   huecos está guardada en el repositorio `Moin`, rama `claude/image-resizer-social-media-6clex9`,
   carpeta `bildformat/`. Si no se quiere publicar la dirección privada, se puede alquilar
   una dirección de Impressum-Service.
3. Poner `adsEnabled: true` en `lib/manifest.js` → reaparecen los huecos ANZEIGE.
4. Pegar el código del anunciante dentro del bloque `<script type="text/plain" data-consent>`
   del `<head>` de `index.html`, para que solo cargue tras la aceptación del banner de cookies.
5. Añadir el proveedor de publicidad a `datenschutz.html`.

## Vista previa local

```
python -m http.server 8137
```

y abrir http://localhost:8137/ (no vale abrir los archivos con doble clic).
