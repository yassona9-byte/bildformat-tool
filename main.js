(function () {
  "use strict";

  /* ==========================================================
     Helpers
     ========================================================== */
  const $ = (sel, scope) => (scope || document).querySelector(sel);
  const $$ = (sel, scope) => Array.from((scope || document).querySelectorAll(sel));
  const escHTML = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, c =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  function safe(fn, name) { try { fn(); } catch (e) { console.warn("[" + name + "]", e); } }

  const DATA = window.__BRAND__ || { platforms: [] };

  function loadScript(src) {
    return new Promise((ok, err) => {
      if (document.querySelector('script[src="' + src + '"]')) return ok();
      const s = document.createElement("script");
      s.src = src; s.onload = ok; s.onerror = () => err(new Error("Laden fehlgeschlagen: " + src));
      document.body.appendChild(s);
    });
  }

  function saveBlob(blob, name) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }

  function fmtBytes(b) {
    if (b >= 900 * 1024) return (b / (1024 * 1024)).toLocaleString("de-DE", { maximumFractionDigits: 1 }) + " MB";
    return Math.max(1, Math.round(b / 1024)).toLocaleString("de-DE") + " KB";
  }

  /* Feature detection */
  const WEBP_OK = (function () {
    try { return document.createElement("canvas").toDataURL("image/webp").indexOf("data:image/webp") === 0; }
    catch (_) { return false; }
  })();
  const FILTER_OK = (function () {
    try { return typeof document.createElement("canvas").getContext("2d").filter === "string"; }
    catch (_) { return false; }
  })();

  /* ==========================================================
     Format lookup (built from the data table in lib/manifest.js)
     ========================================================== */
  const FORMATS = new Map(); // key "platform/format" -> {pid, plabel, id, label, w, h, note}
  DATA.platforms.forEach(p => p.formats.forEach(f => {
    FORMATS.set(p.id + "/" + f.id, {
      pid: p.id, plabel: p.label, id: f.id, label: f.label, w: f.w, h: f.h, note: f.note || ""
    });
  }));

  /* ==========================================================
     Tool state
     ========================================================== */
  const S = {
    img: null, imgW: 0, imgH: 0,
    fileName: "", fileSize: 0,
    selected: new Map(),      // key -> { cx, cy, zoom }
    activeKey: null,
    mode: "cover",            // "cover" (zuschneiden) | "contain" (einpassen)
    bg: "blur",               // "blur" | "white" | "black" | "custom"
    bgColor: "#3b3b66",
    outType: "image/jpeg",
    quality: 0.9,
    results: [],
    _blurCache: new Map(),
    _sizeToken: 0
  };

  const tool = $("#tool");

  /* ==========================================================
     Rendering — the ONE draw function used by preview AND export
     (guarantees WYSIWYG: the preview is the export, scaled down)
     ========================================================== */
  function drawBlurredCover(ctx, W, H) {
    const key = W + "x" + H;
    let c = S._blurCache.get(key);
    if (!c) {
      c = document.createElement("canvas"); c.width = W; c.height = H;
      const bctx = c.getContext("2d");
      const s = Math.max(W / S.imgW, H / S.imgH) * 1.12;
      const dw = S.imgW * s, dh = S.imgH * s;
      const x = (W - dw) / 2, y = (H - dh) / 2;
      if (FILTER_OK) {
        bctx.filter = "blur(" + Math.max(12, Math.round(Math.max(W, H) / 45)) + "px)";
        bctx.drawImage(S.img, x, y, dw, dh);
        bctx.filter = "none";
      } else {
        // Fallback ohne ctx.filter: stark verkleinern und wieder vergrößern
        const t = document.createElement("canvas");
        t.width = Math.max(2, Math.round(W / 24));
        t.height = Math.max(2, Math.round(H / 24));
        const tctx = t.getContext("2d");
        const s2 = Math.max(t.width / S.imgW, t.height / S.imgH) * 1.12;
        tctx.drawImage(S.img, (t.width - S.imgW * s2) / 2, (t.height - S.imgH * s2) / 2, S.imgW * s2, S.imgH * s2);
        bctx.imageSmoothingEnabled = true;
        bctx.drawImage(t, 0, 0, W, H);
      }
      bctx.fillStyle = "rgba(0,0,0,0.18)";
      bctx.fillRect(0, 0, W, H);
      S._blurCache.set(key, c);
    }
    ctx.drawImage(c, 0, 0, W, H);
  }

  function renderFormat(ctx, W, H, fstate) {
    ctx.clearRect(0, 0, W, H);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    if (S.mode === "cover") {
      if (S.outType === "image/jpeg") { ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, W, H); }
      const base = Math.max(W / S.imgW, H / S.imgH) * fstate.zoom;
      const dw = S.imgW * base, dh = S.imgH * base;
      let x = W / 2 - fstate.cx * dw;
      let y = H / 2 - fstate.cy * dh;
      x = clamp(x, W - dw, 0);
      y = clamp(y, H - dh, 0);
      ctx.drawImage(S.img, x, y, dw, dh);
    } else {
      if (S.bg === "blur") drawBlurredCover(ctx, W, H);
      else {
        ctx.fillStyle = S.bg === "white" ? "#ffffff" : S.bg === "black" ? "#000000" : S.bgColor;
        ctx.fillRect(0, 0, W, H);
      }
      const s = Math.min(W / S.imgW, H / S.imgH);
      const dw = S.imgW * s, dh = S.imgH * s;
      ctx.drawImage(S.img, (W - dw) / 2, (H - dh) / 2, dw, dh);
    }
  }

  function exportFormat(key) {
    const def = FORMATS.get(key);
    const fstate = S.selected.get(key);
    const canvas = document.createElement("canvas");
    canvas.width = def.w; canvas.height = def.h;
    renderFormat(canvas.getContext("2d"), def.w, def.h, fstate);
    return new Promise((ok, err) => {
      canvas.toBlob(b => b ? ok(b) : err(new Error("Export fehlgeschlagen")), S.outType, S.quality);
    });
  }

  function extFor(blob) {
    if (blob.type.indexOf("png") >= 0) return "png";
    if (blob.type.indexOf("webp") >= 0) return "webp";
    return "jpg";
  }

  function fileNameFor(key, blob) {
    const def = FORMATS.get(key);
    return def.pid + "-" + def.id + "-" + def.w + "x" + def.h + "." + extFor(blob);
  }

  /* ==========================================================
     Stage (preview canvas + drag/zoom)
     ========================================================== */
  const stage = $("#stage");
  const frame = $("#stage-frame");
  const preview = $("#preview");
  const dragHint = $("#drag-hint");

  function activeState() { return S.activeKey ? S.selected.get(S.activeKey) : null; }
  function activeDef() { return S.activeKey ? FORMATS.get(S.activeKey) : null; }

  function layoutStage() {
    const def = activeDef();
    if (!def || !frame) return;
    const stageBox = stage.getBoundingClientRect();
    const pad = 8;
    const maxW = Math.max(120, stageBox.width - pad * 2);
    const maxH = Math.min(440, Math.max(200, window.innerHeight * 0.52));
    const ar = def.w / def.h;
    let w = maxW, h = w / ar;
    if (h > maxH) { h = maxH; w = h * ar; }
    frame.style.width = Math.round(w) + "px";
    frame.style.height = Math.round(h) + "px";
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    preview.width = Math.round(w * dpr);
    preview.height = Math.round(h * dpr);
    redraw();
  }

  function redraw() {
    const fstate = activeState();
    if (!fstate || !S.img) return;
    renderFormat(preview.getContext("2d"), preview.width, preview.height, fstate);
  }

  function clampCenter(fstate) {
    const def = activeDef();
    if (!def) return;
    const W = def.w, H = def.h;
    const base = Math.max(W / S.imgW, H / S.imgH) * fstate.zoom;
    const dw = S.imgW * base, dh = S.imgH * base;
    fstate.cx = clamp(fstate.cx, (W / 2) / dw, 1 - (W / 2) / dw);
    fstate.cy = clamp(fstate.cy, (H / 2) / dh, 1 - (H / 2) / dh);
    if (dw <= W) fstate.cx = 0.5;
    if (dh <= H) fstate.cy = 0.5;
  }

  function afterChange(invalidateBlur) {
    if (invalidateBlur) S._blurCache.clear();
    redraw();
    scheduleSizeEstimate();
  }

  function setZoom(z, silentSlider) {
    const fstate = activeState();
    if (!fstate) return;
    fstate.zoom = clamp(z, 1, 4);
    clampCenter(fstate);
    if (!silentSlider) $("#zoom-range").value = fstate.zoom;
    $("#zoom-val").textContent = Math.round(fstate.zoom * 100) + " %";
    afterChange(false);
  }

  function initPointer() {
    if (!frame) return;
    const pointers = new Map();
    let pinchStart = null;

    frame.addEventListener("pointerdown", e => {
      if (S.mode !== "cover") return;
      frame.setPointerCapture(e.pointerId);
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        pinchStart = { dist: Math.hypot(a.x - b.x, a.y - b.y), zoom: activeState().zoom };
      }
      frame.classList.add("is-dragging");
      if (dragHint) dragHint.classList.add("is-hidden");
    });

    frame.addEventListener("pointermove", e => {
      if (!pointers.has(e.pointerId) || S.mode !== "cover") return;
      const prev = pointers.get(e.pointerId);
      const cur = { x: e.clientX, y: e.clientY };
      pointers.set(e.pointerId, cur);
      const fstate = activeState();
      const def = activeDef();
      if (!fstate || !def) return;

      if (pointers.size === 2 && pinchStart) {
        const [a, b] = [...pointers.values()];
        const dist = Math.hypot(a.x - b.x, a.y - b.y);
        if (pinchStart.dist > 0) setZoom(pinchStart.zoom * (dist / pinchStart.dist));
        return;
      }

      const frameW = frame.clientWidth, frameH = frame.clientHeight;
      const base = Math.max(frameW / S.imgW, frameH / S.imgH) * fstate.zoom;
      const dw = S.imgW * base, dh = S.imgH * base;
      fstate.cx -= (cur.x - prev.x) / dw;
      fstate.cy -= (cur.y - prev.y) / dh;
      clampCenter(fstate);
      afterChange(false);
    });

    const up = e => {
      pointers.delete(e.pointerId);
      if (pointers.size < 2) pinchStart = null;
      if (pointers.size === 0) frame.classList.remove("is-dragging");
    };
    frame.addEventListener("pointerup", up);
    frame.addEventListener("pointercancel", up);

    frame.addEventListener("wheel", e => {
      if (S.mode !== "cover") return;
      e.preventDefault();
      const fstate = activeState();
      if (!fstate) return;
      setZoom(fstate.zoom * (e.deltaY < 0 ? 1.08 : 1 / 1.08));
    }, { passive: false });

    window.addEventListener("resize", () => { if (tool.dataset.state === "edit") layoutStage(); });
  }

  /* ==========================================================
     Format picker
     ========================================================== */
  function mountPicker() {
    const box = $("#fmt-groups");
    if (!box || box.children.length > 0) return;
    box.innerHTML = DATA.platforms.map(p => `
      <div class="fmt-group">
        <h3>${escHTML(p.label)}</h3>
        <div class="fmt-list">
          ${p.formats.map(f => `
            <button type="button" class="fmt-chip" aria-pressed="false"
                    data-key="${escHTML(p.id + "/" + f.id)}">
              <span class="tick" aria-hidden="true"><svg viewBox="0 0 12 12" fill="none"><path d="M2 6.5 4.7 9 10 3.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></span>
              <span>${escHTML(f.label)}</span>
              <span class="dims">${f.w}×${f.h}</span>
            </button>`).join("")}
        </div>
      </div>`).join("");

    box.addEventListener("click", e => {
      const chip = e.target.closest(".fmt-chip");
      if (!chip) return;
      const key = chip.dataset.key;
      if (S.selected.has(key)) {
        if (S.activeKey === key) {
          if (S.selected.size === 1) return; // letztes Format bleibt gewählt
          S.selected.delete(key);
          S.activeKey = S.selected.keys().next().value;
        } else {
          S.activeKey = key;
        }
      } else {
        S.selected.set(key, { cx: 0.5, cy: 0.5, zoom: 1 });
        S.activeKey = key;
      }
      syncPickerUI();
      syncActiveUI();
    });
  }

  function syncPickerUI() {
    $$(".fmt-chip").forEach(chip => {
      const key = chip.dataset.key;
      chip.setAttribute("aria-pressed", S.selected.has(key) ? "true" : "false");
      chip.classList.toggle("is-active", key === S.activeKey);
    });
    const n = S.selected.size;
    const el = $("#selected-count");
    if (el) el.textContent = n === 1 ? "1 Format ausgewählt" : n + " Formate ausgewählt";
    const btn = $("#export-btn");
    if (btn) btn.textContent = n > 1
      ? "Alle " + n + " Bilder als ZIP herunterladen"
      : "Bild herunterladen";
  }

  function syncActiveUI() {
    const def = activeDef();
    if (!def) return;
    $("#active-label").textContent = def.plabel + " · " + def.label;
    $("#active-dims").textContent = def.w + " × " + def.h + " Pixel";
    const fstate = activeState();
    $("#zoom-range").value = fstate.zoom;
    $("#zoom-val").textContent = Math.round(fstate.zoom * 100) + " %";
    layoutStage();
    scheduleSizeEstimate();
  }

  /* ==========================================================
     Controls (mode, background, zoom, output)
     ========================================================== */
  function syncModeUI() {
    $("#mode-cover").setAttribute("aria-pressed", S.mode === "cover" ? "true" : "false");
    $("#mode-contain").setAttribute("aria-pressed", S.mode === "contain" ? "true" : "false");
    $("#zoom-row").style.display = S.mode === "cover" ? "" : "none";
    $("#bg-row").style.display = S.mode === "contain" ? "" : "none";
    if (dragHint) dragHint.style.display = S.mode === "cover" ? "" : "none";
  }

  function syncBgUI() {
    $$(".bg-chip").forEach(c => c.setAttribute("aria-pressed", c.dataset.bg === S.bg ? "true" : "false"));
  }

  function syncOutputUI() {
    const isPng = S.outType === "image/png";
    $("#quality-row").style.display = isPng ? "none" : "";
    $("#quality-val").textContent = Math.round(S.quality * 100) + " %";
  }

  function initControls() {
    $("#mode-cover").addEventListener("click", () => { S.mode = "cover"; syncModeUI(); afterChange(false); });
    $("#mode-contain").addEventListener("click", () => { S.mode = "contain"; syncModeUI(); afterChange(false); });

    $$(".bg-chip").forEach(chip => {
      chip.addEventListener("click", () => {
        S.bg = chip.dataset.bg;
        syncBgUI();
        afterChange(false);
      });
    });
    $("#bg-color-input").addEventListener("input", e => {
      S.bgColor = e.target.value;
      S.bg = "custom";
      syncBgUI();
      afterChange(false);
    });

    $("#zoom-range").addEventListener("input", e => setZoom(parseFloat(e.target.value), true));
    $("#center-btn").addEventListener("click", () => {
      const fstate = activeState();
      if (!fstate) return;
      fstate.cx = 0.5; fstate.cy = 0.5; fstate.zoom = 1;
      $("#zoom-range").value = 1;
      $("#zoom-val").textContent = "100 %";
      afterChange(false);
    });

    const sel = $("#out-type");
    if (!WEBP_OK) {
      const opt = sel.querySelector('option[value="image/webp"]');
      if (opt) opt.disabled = true;
      const note = $("#webp-note");
      if (note) note.hidden = false;
    }
    sel.addEventListener("change", e => {
      S.outType = e.target.value;
      syncOutputUI();
      afterChange(false);
    });
    $("#quality-range").addEventListener("input", e => {
      S.quality = parseFloat(e.target.value);
      syncOutputUI();
      scheduleSizeEstimate();
    });

    $("#reset-btn").addEventListener("click", resetTool);
    $("#error-retry").addEventListener("click", () => { tool.dataset.state = "idle"; });
    $("#export-btn").addEventListener("click", () => { exportAll().catch(e => console.warn("[export]", e)); });
  }

  /* ==========================================================
     Live size estimate (debounced full-size export of active fmt)
     ========================================================== */
  let sizeTimer = null;
  function scheduleSizeEstimate() {
    const el = $("#size-estimate");
    if (!el || !S.img || !S.activeKey) return;
    el.innerHTML = "Dateigröße: <strong>wird berechnet …</strong>";
    clearTimeout(sizeTimer);
    sizeTimer = setTimeout(async () => {
      const token = ++S._sizeToken;
      try {
        const blob = await exportFormat(S.activeKey);
        if (token !== S._sizeToken) return;
        el.innerHTML = "Dateigröße: <strong>≈ " + fmtBytes(blob.size) + "</strong>";
      } catch (_) { el.textContent = ""; }
    }, 500);
  }

  /* ==========================================================
     File loading (click, drag & drop, paste)
     ========================================================== */
  function showError(msg) {
    $("#error-msg").textContent = msg;
    tool.dataset.state = "error";
  }

  function loadFile(file) {
    if (!file) return;
    if (!/^image\//.test(file.type) && !/\.(png|jpe?g|webp|gif|bmp|avif)$/i.test(file.name)) {
      return showError("Diese Datei ist kein unterstütztes Bild. Bitte nutze PNG, JPG oder WebP. HEIC-Fotos vom iPhone bitte vorher als JPG exportieren.");
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      if (img.naturalWidth * img.naturalHeight > 60e6) {
        URL.revokeObjectURL(url);
        return showError("Das Bild ist sehr groß (über ca. 60 Megapixel). Bitte verwende eine kleinere Version.");
      }
      S.img = img;
      S.imgW = img.naturalWidth;
      S.imgH = img.naturalHeight;
      S.fileName = file.name;
      S.fileSize = file.size;
      S.selected = new Map();
      S.results = [];
      S._blurCache.clear();
      // Startauswahl: YouTube-Thumbnail (meistgesuchtes Format)
      const first = FORMATS.keys().next().value;
      S.selected.set(first, { cx: 0.5, cy: 0.5, zoom: 1 });
      S.activeKey = first;
      $("#file-meta-name").textContent = S.fileName;
      $("#file-meta-dims").textContent = S.imgW + " × " + S.imgH + " px · " + fmtBytes(S.fileSize);
      $("#results").classList.remove("is-on");
      tool.dataset.state = "edit";
      syncPickerUI();
      syncModeUI();
      syncBgUI();
      syncOutputUI();
      syncActiveUI();
      if (dragHint) dragHint.classList.remove("is-hidden");
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      showError("Dieses Bild konnte nicht geladen werden. HEIC-Fotos vom iPhone bitte vorher als JPG exportieren.");
    };
    img.src = url;
  }

  function resetTool() {
    S.img = null;
    S.results.forEach(r => URL.revokeObjectURL(r.url));
    S.results = [];
    $("#file-input").value = "";
    $("#results").classList.remove("is-on");
    tool.dataset.state = "idle";
  }

  function initDropzone() {
    const dz = $("#dropzone");
    const input = $("#file-input");
    if (!dz || !input) return;

    input.addEventListener("change", () => loadFile(input.files[0]));

    ["dragover", "dragenter"].forEach(ev => dz.addEventListener(ev, e => {
      e.preventDefault();
      dz.classList.add("is-over");
    }));
    ["dragleave", "drop"].forEach(ev => dz.addEventListener(ev, () => dz.classList.remove("is-over")));

    // Drop überall auf der Seite fangen (sonst öffnet der Browser die Datei)
    window.addEventListener("dragover", e => e.preventDefault());
    window.addEventListener("drop", e => {
      e.preventDefault();
      const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      if (f) loadFile(f);
    });

    document.addEventListener("paste", e => {
      const items = e.clipboardData && e.clipboardData.items;
      if (!items) return;
      for (const it of items) {
        if (it.kind === "file" && /^image\//.test(it.type)) {
          loadFile(it.getAsFile());
          break;
        }
      }
    });
  }

  /* ==========================================================
     Export (single download or ZIP)
     ========================================================== */
  function setProgress(p) {
    const bar = $("#export-progress");
    bar.classList.toggle("is-on", p != null);
    if (p != null) bar.querySelector("i").style.width = Math.round(p * 100) + "%";
  }

  async function exportAll() {
    if (!S.img || S.selected.size === 0) return;
    const btn = $("#export-btn");
    btn.disabled = true;
    setProgress(0);
    try {
      S.results.forEach(r => URL.revokeObjectURL(r.url));
      S.results = [];
      const keys = [...S.selected.keys()];
      for (let i = 0; i < keys.length; i++) {
        const blob = await exportFormat(keys[i]);
        const def = FORMATS.get(keys[i]);
        S.results.push({
          key: keys[i], blob,
          name: fileNameFor(keys[i], blob),
          label: def.plabel + " · " + def.label,
          w: def.w, h: def.h,
          url: URL.createObjectURL(blob)
        });
        setProgress((i + 1) / (keys.length + (keys.length > 1 ? 1 : 0)));
      }

      if (S.results.length === 1) {
        saveBlob(S.results[0].blob, S.results[0].name);
      } else {
        await loadScript("lib/vendor/jszip.min.js");
        const zip = new JSZip();
        S.results.forEach(r => zip.file(r.name, r.blob));
        const out = await zip.generateAsync({ type: "blob" }, meta => {
          setProgress((S.results.length + meta.percent / 100) / (S.results.length + 1));
        });
        saveBlob(out, "social-media-bilder.zip");
      }
      renderResults();
    } catch (e) {
      console.warn("[exportAll]", e);
      showError("Beim Erstellen der Bilder ist etwas schiefgegangen. Bitte versuche es erneut.");
    } finally {
      btn.disabled = false;
      setTimeout(() => setProgress(null), 600);
    }
  }

  function renderResults() {
    const box = $("#results");
    const grid = $("#results-grid");
    $("#results-compare").textContent =
      "Original: " + S.imgW + " × " + S.imgH + " px · " + fmtBytes(S.fileSize);
    grid.innerHTML = S.results.map((r, i) => `
      <div class="result-card">
        <div class="thumbwrap"><img src="${r.url}" alt="Vorschau: ${escHTML(r.label)}"></div>
        <div class="r-name">${escHTML(r.label)}</div>
        <div class="r-meta">${r.w} × ${r.h} px · ${escHTML(fmtBytes(r.blob.size))}</div>
        <a class="btn" href="${r.url}" download="${escHTML(r.name)}">Herunterladen</a>
      </div>`).join("");
    box.classList.add("is-on");
    box.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  /* ==========================================================
     SEO reference table (from the same data table)
     ========================================================== */
  function mountSizeTable() {
    const tbody = $("#size-table-body");
    if (!tbody || tbody.children.length > 0) return;
    tbody.innerHTML = DATA.platforms.map(p =>
      p.formats.map((f, i) => `
        <tr>
          ${i === 0 ? `<td class="pf" rowspan="${p.formats.length}">${escHTML(p.label)}</td>` : ""}
          <td>${escHTML(f.label)}</td>
          <td class="px">${f.w} × ${f.h} px</td>
          <td class="px">${ratioLabel(f.w, f.h)}</td>
          <td class="note">${escHTML(f.note || "")}</td>
        </tr>`).join("")
    ).join("");
  }

  function ratioLabel(w, h) {
    const g = (function gcd(a, b) { return b ? gcd(b, a % b) : a; })(w, h);
    let rw = w / g, rh = h / g;
    if (rw > 40 || rh > 40) return (w / h).toLocaleString("de-DE", { maximumFractionDigits: 2 }) + ":1";
    return rw + ":" + rh;
  }

  /* ==========================================================
     Cookie consent — blocks third-party scripts until accepted
     ========================================================== */
  const CONSENT_KEY = "bildformat-consent";

  function activateBlockedScripts() {
    $$('script[type="text/plain"][data-consent]').forEach(s => {
      const n = document.createElement("script");
      for (const a of s.attributes) {
        if (a.name !== "type" && a.name !== "data-consent") n.setAttribute(a.name, a.value);
      }
      n.text = s.text;
      s.replaceWith(n);
    });
  }

  function initConsent() {
    const banner = $("#cookie-banner");
    if (!banner) return;
    let stored = null;
    try { stored = localStorage.getItem(CONSENT_KEY); } catch (_) {}

    if (stored === "all") activateBlockedScripts();
    if (!stored) banner.classList.add("is-on");

    function choose(val) {
      try { localStorage.setItem(CONSENT_KEY, val); } catch (_) {}
      banner.classList.remove("is-on");
      if (val === "all") activateBlockedScripts();
    }
    $("#consent-accept").addEventListener("click", () => choose("all"));
    $("#consent-essential").addEventListener("click", () => choose("essential"));

    const reopen = $("#cookie-settings");
    if (reopen) reopen.addEventListener("click", () => {
      try { localStorage.removeItem(CONSENT_KEY); } catch (_) {}
      banner.classList.add("is-on");
    });
  }

  /* ==========================================================
     Corner ad toast (placeholder, dismissible, session-remembered)
     ========================================================== */
  function initAdToast() {
    if (!DATA.adsEnabled) return;
    const toast = $("#ad-toast");
    if (!toast) return;
    let closed = null;
    try { closed = sessionStorage.getItem("bildformat-toast"); } catch (_) {}
    if (closed) return;
    setTimeout(() => toast.classList.add("is-on"), 8000);
    $("#close-toast").addEventListener("click", () => {
      toast.classList.remove("is-on");
      try { sessionStorage.setItem("bildformat-toast", "1"); } catch (_) {}
    });
  }

  /* ==========================================================
     Boot
     ========================================================== */
  function boot() {
    if (DATA.adsEnabled) document.documentElement.classList.add("ads-on");
    safe(initConsent, "initConsent");
    safe(initAdToast, "initAdToast");
    if (tool) {
      safe(mountPicker, "mountPicker");
      safe(initDropzone, "initDropzone");
      safe(initControls, "initControls");
      safe(initPointer, "initPointer");
    }
    safe(mountSizeTable, "mountSizeTable");
    document.documentElement.classList.add("is-ready");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
