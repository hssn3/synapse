/* ============================================================================
   bg-theme.js — سیستم پس‌زمینهٔ ویدیویی، تم محیطی و حالت‌های نمایش
   سامانهٔ جامع مدیریت و اعتباربخشی بیمارستان
   ----------------------------------------------------------------------------
   - بدون وابستگی خارجی، بدون build step، سازگار با ES5+/مرورگرهای داخل شبکه.
   - فقط یک المان <video> در کل اپ ساخته می‌شود.
   - همهٔ متن‌های فارسی با textContent نوشته می‌شوند (بدون innerHTML)؛
     تابع BgTheme.esc برای جاهایی که ناچار به ساخت رشتهٔ HTML هستید.
   - افزودن ویدیوی جدید در آینده: فایل را در public/bg بگذارید و یک شیء
     به آرایهٔ SCENES اضافه کنید (یا BgTheme.registerScene صدا بزنید).
   ============================================================================ */

(function (global) {
  "use strict";

  /* ------------------------------------------------------------ پیکربندی */

  var ASSET_BASE = {
    /* ترتیب مهم است: نسخهٔ لوکال اول، CDN به‌عنوان پشتیبان */
    video: [
      "/bg/heritage-teal.mp4",
      "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260901_122529_931c22c8-8d2d-47c0-ad51-b97f56a91e42.mp4"
    ],
    poster: [
      "/bg/heritage-teal-poster.png",
      "https://d2ol7oe51mr4n9.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/4f690bd1-881a-4192-82f2-d714d34c8fb9.png"
    ],
    type: "video/mp4"
  };

  /* آرایهٔ داده‌محورِ صحنه‌ها.
     هر صحنه می‌تواند فایل مخصوص خودش را داشته باشد (video/poster)؛
     اگر نداشته باشد، از ASSET_BASE استفاده می‌شود و فقط فیلتر GPU عوض می‌شود. */
  var SCENES = [
    { id: "ink", label: "منظرهٔ جوهر", swatch: "ink", video: true },
    /* ویدیوهای اختصاصی scene-1..4 حذف شدند (هرکدام ۹ تا ۱۴ مگابایت)؛ همهٔ صحنه‌ها از
       ویدیوی پایهٔ heritage-teal استفاده می‌کنند و فقط فیلتر رنگی‌شان در CSS فرق دارد. */
    { id: "night", label: "شب تیره", swatch: "night", video: true },
    { id: "mist", label: "مه آبی", swatch: "mist", video: true },
    { id: "sky", label: "آسمان آبی", swatch: "sky", video: true },
    { id: "grove", label: "سبز تیره", swatch: "grove", video: true },
    { id: "sunset", label: "غروب طلایی", swatch: "sunset", video: true },
    { id: "frost", label: "یخی", swatch: "frost", video: true },
    { id: "noir", label: "تیرهٔ کلاسیک", swatch: "noir", video: false }
  ];

  var MODES = [
    { id: "cinema", label: "سینمایی" },
    { id: "work", label: "کاری" }
  ];

  var STORE = {
    scene: "hms:bg:scene",
    mode: "hms:bg:mode",
    calm: "hms:bg:calm"
  };

  var DEFAULTS = { scene: "sky", mode: "cinema", calm: false };
  var MOBILE_QUERY = "(max-width: 767.98px)";
  var MOTION_QUERY = "(prefers-reduced-motion: reduce)";
  var MOTE_COUNT = 14;

  /* ------------------------------------------------------------- کمکی‌ها */

  var doc = global.document;
  var root = doc.documentElement;

  function esc(value) {
    return String(value == null ? "" : value).replace(
      /[&<>"']/g,
      function (ch) {
        return {
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;"
        }[ch];
      }
    );
  }

  function read(key, fallback) {
    try {
      var v = global.localStorage.getItem(key);
      return v === null ? fallback : v;
    } catch (e) {
      return fallback;
    }
  }

  function write(key, value) {
    try {
      global.localStorage.setItem(key, value);
    } catch (e) {
      /* حالت خصوصی مرورگر یا سیاست سازمانی — بی‌صدا رد می‌شویم */
    }
  }

  function mql(query) {
    return global.matchMedia ? global.matchMedia(query) : null;
  }

  function onMql(m, fn) {
    if (!m) return;
    if (m.addEventListener) m.addEventListener("change", fn);
    else if (m.addListener) m.addListener(fn);
  }

  function el(tag, className, attrs) {
    var node = doc.createElement(tag);
    if (className) node.className = className;
    if (attrs) {
      for (var k in attrs) {
        if (Object.prototype.hasOwnProperty.call(attrs, k)) {
          node.setAttribute(k, attrs[k]);
        }
      }
    }
    return node;
  }

  function sceneById(id) {
    for (var i = 0; i < SCENES.length; i++) {
      if (SCENES[i].id === id) return SCENES[i];
    }
    return SCENES[0];
  }

  /* --------------------------------------------------------- وضعیت داخلی */

  var state = {
    scene: DEFAULTS.scene,
    mode: DEFAULTS.mode,
    calm: DEFAULTS.calm,
    booted: false
  };

  var dom = {
    stage: null,
    video: null,
    poster: null,
    currentSrc: null
  };

  var mqMobile = mql(MOBILE_QUERY);
  var mqMotion = mql(MOTION_QUERY);
  var switchers = []; /* برای همگام‌سازی همهٔ سوییچرهای روی صفحه */

  /* --------------------------------------------------------- ساخت صحنه */

  function buildStage() {
    if (dom.stage) return;

    var stage = el("div", "bgx-stage", { "aria-hidden": "true" });

    var poster = el("img", "bgx-poster", { alt: "", decoding: "async" });
    poster.src = ASSET_BASE.poster[0];
    poster.addEventListener("error", function onErr() {
      if (ASSET_BASE.poster[1] && poster.src.indexOf(ASSET_BASE.poster[1]) < 0) {
        poster.src = ASSET_BASE.poster[1];
      }
    });

    var video = el("video", "bgx-video", {
      muted: "",
      playsinline: "",
      loop: "",
      preload: "none",
      tabindex: "-1"
    });
    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;
    video.loop = true;
    video.setAttribute("disablepictureinpicture", "");
    video.setAttribute("disableremoteplayback", "");

    video.addEventListener("playing", function () {
      stage.setAttribute("data-bgx-ready", "1");
    });

    var scrim = el("div", "bgx-scrim");
    var haloA = el("div", "bgx-halo bgx-halo--a");
    var haloB = el("div", "bgx-halo bgx-halo--b");
    var motes = el("div", "bgx-motes");
    var grain = el("div", "bgx-grain");
    var vignette = el("div", "bgx-vignette");

    for (var i = 0; i < MOTE_COUNT; i++) {
      var m = el("span", "bgx-mote");
      var size = 3 + ((i * 7) % 6);
      m.style.insetInlineStart = ((i * 71) % 97) + "%";
      m.style.width = size + "px";
      m.style.height = size + 1 + "px";
      m.style.animationDuration = 22 + ((i * 5) % 26) + "s";
      m.style.animationDelay = "-" + ((i * 3) % 24) + "s";
      motes.appendChild(m);
    }

    stage.appendChild(poster);
    stage.appendChild(video);
    stage.appendChild(scrim);
    stage.appendChild(haloA);
    stage.appendChild(haloB);
    stage.appendChild(motes);
    stage.appendChild(grain);
    stage.appendChild(vignette);

    if (doc.body.firstChild) doc.body.insertBefore(stage, doc.body.firstChild);
    else doc.body.appendChild(stage);

    dom.stage = stage;
    dom.video = video;
    dom.poster = poster;
  }

  /* ------------------------------------------------- منطق فعال‌بودن ویدیو */

  function videoShouldRun() {
    var scene = sceneById(state.scene);
    if (!scene.video) return false;
    if (state.calm) return false;
    if (mqMotion && mqMotion.matches) return false;
    if (mqMobile && mqMobile.matches) return false;
    if (doc.hidden) return false;
    return true;
  }

  function attachSources(scene) {
    var list = scene.videoSrc || ASSET_BASE.video;
    var key = list.join("|");
    if (dom.currentSrc === key) return;
    dom.currentSrc = key;

    while (dom.video.firstChild) dom.video.removeChild(dom.video.firstChild);
    for (var i = 0; i < list.length; i++) {
      var s = el("source", null, { src: list[i], type: ASSET_BASE.type });
      dom.video.appendChild(s);
    }
    dom.video.load();
  }

  function applyVideoState() {
    if (!dom.stage) return;
    var scene = sceneById(state.scene);

    if (scene.posterSrc) dom.poster.src = scene.posterSrc[0];

    if (videoShouldRun()) {
      dom.stage.setAttribute("data-bgx-video", "on");
      dom.video.preload = "auto";
      attachSources(scene);
      var p = dom.video.play();
      if (p && typeof p.catch === "function") {
        p.catch(function () {
          /* اگر مرورگر پخش خودکار را رد کرد، پوستر می‌ماند — بدون خطا در کنسول */
          dom.stage.removeAttribute("data-bgx-ready");
        });
      }
    } else {
      dom.stage.removeAttribute("data-bgx-video");
      dom.stage.removeAttribute("data-bgx-ready");
      if (!dom.video.paused) dom.video.pause();
    }
  }

  /* ------------------------------------------------------ اعمال روی ریشه */

  function applyAll(silent) {
    root.setAttribute("data-bgx-scene", state.scene);
    root.setAttribute("data-bgx-mode", state.mode);
    root.setAttribute("data-bgx-calm", state.calm ? "on" : "off");
    applyVideoState();
    syncSwitchers();
    if (!silent) emit();
  }

  function emit() {
    var detail = { scene: state.scene, mode: state.mode, calm: state.calm };
    var ev;
    try {
      ev = new CustomEvent("bgx:change", { detail: detail });
    } catch (e) {
      ev = doc.createEvent("CustomEvent");
      ev.initCustomEvent("bgx:change", false, false, detail);
    }
    doc.dispatchEvent(ev);
  }

  /* ------------------------------------------------------------ سوییچرها */

  function buildSwitcher(container, options) {
    if (!container) return null;
    var opts = options || {};
    var variant = opts.variant === "mini" ? "mini" : "drawer";
    var refs = { container: container, variant: variant, sceneBtns: [] };

    while (container.firstChild) container.removeChild(container.firstChild);

    if (variant === "mini") {
      var mini = el("div", "bgx-mini", {
        role: "group",
        "aria-label": "تم محیطی"
      });
      SCENES.forEach(function (scene) {
        var dot = el("button", "bgx-mini__dot bgx-swatch--" + scene.swatch, {
          type: "button",
          title: scene.label,
          "aria-label": scene.label,
          "aria-pressed": "false"
        });
        dot.addEventListener("click", function () {
          setScene(scene.id);
        });
        refs.sceneBtns.push({ id: scene.id, node: dot });
        mini.appendChild(dot);
      });
      container.appendChild(mini);
      switchers.push(refs);
      syncSwitchers();
      return refs;
    }

    var wrap = el("div", "bgx-switcher");

    var title = el("p", "bgx-switcher__title");
    title.textContent = "تم محیطی";
    wrap.appendChild(title);

    var grid = el("div", "bgx-scenes", {
      role: "group",
      "aria-label": "انتخاب تم محیطی"
    });
    SCENES.forEach(function (scene) {
      var btn = el("button", "bgx-scene-btn", {
        type: "button",
        "aria-pressed": "false"
      });
      var sw = el("span", "bgx-swatch bgx-swatch--" + scene.swatch);
      var lbl = el("span");
      lbl.textContent = scene.label;
      btn.appendChild(sw);
      btn.appendChild(lbl);
      btn.addEventListener("click", function () {
        setScene(scene.id);
      });
      refs.sceneBtns.push({ id: scene.id, node: btn });
      grid.appendChild(btn);
    });
    wrap.appendChild(grid);

    var rows = el("div", "bgx-toggle-row");

    /* حالت کاری */
    var workLabel = el("label", "bgx-toggle");
    var workInput = el("input", null, { type: "checkbox" });
    var workText = el("span");
    workText.textContent = "حالت کاری (ویدیو کم‌رنگ)";
    var workHint = el("span", "bgx-toggle__hint");
    workHint.textContent = "تمرکز روی داده";
    workInput.addEventListener("change", function () {
      setMode(workInput.checked ? "work" : "cinema");
    });
    workLabel.appendChild(workInput);
    workLabel.appendChild(workText);
    workLabel.appendChild(workHint);
    rows.appendChild(workLabel);
    refs.workInput = workInput;

    /* حالت آرام */
    var calmLabel = el("label", "bgx-toggle");
    var calmInput = el("input", null, { type: "checkbox" });
    var calmText = el("span");
    calmText.textContent = "حالت آرام (بدون حرکت)";
    var calmHint = el("span", "bgx-toggle__hint");
    calmHint.textContent = "تصویر ثابت";
    calmInput.addEventListener("change", function () {
      setCalm(calmInput.checked);
    });
    calmLabel.appendChild(calmInput);
    calmLabel.appendChild(calmText);
    calmLabel.appendChild(calmHint);
    rows.appendChild(calmLabel);
    refs.calmInput = calmInput;

    wrap.appendChild(rows);
    container.appendChild(wrap);

    switchers.push(refs);
    syncSwitchers();
    return refs;
  }

  function syncSwitchers() {
    for (var i = 0; i < switchers.length; i++) {
      var s = switchers[i];
      for (var j = 0; j < s.sceneBtns.length; j++) {
        s.sceneBtns[j].node.setAttribute(
          "aria-pressed",
          s.sceneBtns[j].id === state.scene ? "true" : "false"
        );
      }
      if (s.workInput) s.workInput.checked = state.mode === "work";
      if (s.calmInput) s.calmInput.checked = !!state.calm;
    }
  }

  /* --------------------------------------------------------------- API */

  function setScene(id) {
    state.scene = sceneById(id).id;
    write(STORE.scene, state.scene);
    applyAll();
  }

  function setMode(id) {
    state.mode = id === "work" ? "work" : "cinema";
    write(STORE.mode, state.mode);
    applyAll();
  }

  function setCalm(on) {
    state.calm = !!on;
    write(STORE.calm, state.calm ? "1" : "0");
    applyAll();
  }

  function registerScene(scene) {
    /* scene: { id, label, swatch, video, videoSrc:[], posterSrc:[] }
       فیلتر رنگ آن را در bg-theme.css زیر :root[data-bgx-scene="<id>"] بنویسید. */
    if (!scene || !scene.id) return;
    for (var i = 0; i < SCENES.length; i++) {
      if (SCENES[i].id === scene.id) {
        SCENES[i] = scene;
        return;
      }
    }
    SCENES.push(scene);
  }

  function init(options) {
    if (state.booted) return API;
    var opts = options || {};

    state.scene = read(STORE.scene, opts.scene || DEFAULTS.scene);
    state.mode = read(STORE.mode, opts.mode || DEFAULTS.mode);
    state.calm = read(STORE.calm, DEFAULTS.calm ? "1" : "0") === "1";

    buildStage();

    /* ریشهٔ اپ باید بالای صحنه بنشیند */
    var appRoot = opts.appRoot
      ? typeof opts.appRoot === "string"
        ? doc.querySelector(opts.appRoot)
        : opts.appRoot
      : null;
    if (appRoot) appRoot.classList.add("bgx-above");

    doc.addEventListener("visibilitychange", applyVideoState);
    onMql(mqMobile, applyVideoState);
    onMql(mqMotion, applyVideoState);

    state.booted = true;
    applyAll(true);
    return API;
  }

  var API = {
    init: init,
    setScene: setScene,
    setMode: setMode,
    setCalm: setCalm,
    registerScene: registerScene,
    mountSwitcher: buildSwitcher,
    scenes: function () {
      return SCENES.slice();
    },
    modes: function () {
      return MODES.slice();
    },
    state: function () {
      return { scene: state.scene, mode: state.mode, calm: state.calm };
    },
    esc: esc
  };

  global.BgTheme = API;

  /* راه‌اندازی خودکار وقتی اسکریپت با data-auto لود شود */
  if (doc.currentScript && doc.currentScript.hasAttribute("data-auto")) {
    if (doc.readyState === "loading") {
      doc.addEventListener("DOMContentLoaded", function () {
        init({ appRoot: doc.currentScript && doc.currentScript.dataset.root });
      });
    } else {
      init({});
    }
  }
})(window);
