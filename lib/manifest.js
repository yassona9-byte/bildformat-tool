(function () {
  "use strict";

  /* =========================================================================
     Bildformat — zentrale Datentabelle
     =========================================================================
     Alle Plattformen und Bildgrößen leben HIER, nicht im Code.
     Saisonale Updates: Zahlen ändern, ?v= in den HTML-Dateien hochzählen,
     fertig. Das Auswahl-Menü im Tool UND die SEO-Referenztabelle auf der
     Seite werden beide aus dieser Liste erzeugt.

     Felder pro Format:
       id     – stabiler Slug (wird Teil des Dateinamens beim Download)
       label  – sichtbarer Name (Deutsch)
       w, h   – Zielgröße in Pixeln
       note   – optionaler Hinweis für die Referenztabelle
  ========================================================================= */

  window.__BRAND__ = {
    name: "Bildformat",
    tagline: "Bilder für Social Media zuschneiden – direkt im Browser",
    dataYear: 2026,

    // INTERRUPTOR DE PUBLICIDAD (fase de prueba).
    // false = los huecos ANZEIGE (banner, in-content y aviso de esquina)
    //         quedan completamente ocultos. La web se comporta como un
    //         proyecto personal sin monetizar.
    // true  = los huecos vuelven a mostrarse (fase 2: Gewerbe + Impressum
    //         completo + código del anunciante dentro del bloque bloqueado
    //         por el banner de cookies).
    adsEnabled: false,

    platforms: [
      {
        id: "youtube",
        label: "YouTube",
        formats: [
          { id: "thumbnail",  label: "Thumbnail",        w: 1280, h: 720,  note: "16:9 · als JPG unter 2 MB hochladen" },
          { id: "shorts",     label: "Shorts",           w: 1080, h: 1920, note: "9:16 Hochformat" },
          { id: "kanalbanner", label: "Kanalbanner",     w: 2560, h: 1440, note: "sicherer Bereich in der Mitte: 1546 × 423 px" },
          { id: "profilbild", label: "Profilbild",       w: 800,  h: 800,  note: "wird rund angezeigt" }
        ]
      },
      {
        id: "instagram",
        label: "Instagram",
        formats: [
          { id: "post-quadrat", label: "Post (quadratisch)", w: 1080, h: 1080, note: "1:1 – der Klassiker" },
          { id: "post-hoch",    label: "Post (Hochformat)",  w: 1080, h: 1350, note: "4:5 – nimmt mehr Platz im Feed ein" },
          { id: "story-reel",   label: "Story / Reel",       w: 1080, h: 1920, note: "9:16 Vollbild" }
        ]
      },
      {
        id: "tiktok",
        label: "TikTok",
        formats: [
          { id: "video",      label: "Video / Titelbild", w: 1080, h: 1920, note: "9:16 Vollbild" },
          { id: "profilbild", label: "Profilbild",        w: 200,  h: 200,  note: "wird rund angezeigt" }
        ]
      },
      {
        id: "facebook",
        label: "Facebook",
        formats: [
          { id: "post",       label: "Post (Link/Bild)",    w: 1200, h: 630,  note: "1.91:1 – auch für geteilte Links" },
          { id: "story",      label: "Story",               w: 1080, h: 1920, note: "9:16 Vollbild" },
          { id: "titelbild",  label: "Titelbild (Seite)",   w: 820,  h: 312,  note: "wird am Handy seitlich beschnitten" },
          { id: "event",      label: "Veranstaltung",       w: 1920, h: 1005, note: "ca. 1.91:1" }
        ]
      },
      {
        id: "x",
        label: "X (Twitter)",
        formats: [
          { id: "post",   label: "Post",           w: 1600, h: 900, note: "16:9 wird ohne Beschnitt angezeigt" },
          { id: "header", label: "Profil-Header",  w: 1500, h: 500, note: "3:1 – Ränder können verdeckt werden" }
        ]
      },
      {
        id: "linkedin",
        label: "LinkedIn",
        formats: [
          { id: "post",               label: "Post",                    w: 1200, h: 627, note: "1.91:1" },
          { id: "header-personal",    label: "Header (Profil)",         w: 1584, h: 396, note: "4:1 – links unten liegt das Profilfoto" },
          { id: "header-unternehmen", label: "Header (Unternehmen)",    w: 1128, h: 191, note: "sehr flaches Banner" }
        ]
      },
      {
        id: "twitch",
        label: "Twitch",
        formats: [
          { id: "banner",  label: "Profil-Banner",  w: 1200, h: 480,  note: "5:2" },
          { id: "panel",   label: "Panel",          w: 320,  h: 160,  note: "Breite fix 320 px, Höhe flexibel" },
          { id: "offline", label: "Offline-Screen", w: 1920, h: 1080, note: "16:9 Vollbild" }
        ]
      },
      {
        id: "pinterest",
        label: "Pinterest",
        formats: [
          { id: "pin", label: "Pin (Hochformat)", w: 1000, h: 1500, note: "2:3 – das empfohlene Pin-Format" }
        ]
      },
      {
        id: "whatsapp",
        label: "WhatsApp",
        formats: [
          { id: "status", label: "Status", w: 1080, h: 1920, note: "9:16 Vollbild" }
        ]
      }
    ]
  };
})();
