/* ==========================================================================
   shrivatsan.games — core runtime
   Exposes a single global: window.SG
   Loaded on every page. No dependencies.
   ========================================================================== */
(function (win, doc) {
  "use strict";

  var SG = (win.SG = {});

  /* ---------------------------------------------------------------- utils */
  SG.$ = function (sel, root) { return (root || doc).querySelector(sel); };
  SG.$$ = function (sel, root) {
    return Array.prototype.slice.call((root || doc).querySelectorAll(sel));
  };
  SG.clamp = function (v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; };
  SG.rand = function (lo, hi) { return lo + Math.random() * (hi - lo); };
  SG.randInt = function (lo, hi) { return Math.floor(SG.rand(lo, hi + 1)); };
  SG.pick = function (arr) { return arr[Math.floor(Math.random() * arr.length)]; };
  SG.shuffle = function (arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i];
      a[i] = a[j];
      a[j] = t;
    }
    return a;
  };
  SG.debounce = function (fn, wait) {
    var t;
    return function () {
      var ctx = this, args = arguments;
      clearTimeout(t);
      t = setTimeout(function () { fn.apply(ctx, args); }, wait || 120);
    };
  };
  SG.fmt = function (n) {
    if (n === Infinity) return "∞";
    return Number(n).toLocaleString("en-US");
  };
  SG.reduceMotion = function () {
    return win.matchMedia && win.matchMedia("(prefers-reduced-motion: reduce)").matches;
  };

  /* ------------------------------------------------------------- storage */
  var PREFIX = "sg:";
  var memoryFallback = {};

  SG.store = {
    get: function (key, fallback) {
      try {
        var raw = win.localStorage.getItem(PREFIX + key);
        if (raw === null) return typeof fallback === "undefined" ? null : fallback;
        return JSON.parse(raw);
      } catch (e) {
        return Object.prototype.hasOwnProperty.call(memoryFallback, key)
          ? memoryFallback[key]
          : fallback;
      }
    },
    set: function (key, value) {
      try {
        win.localStorage.setItem(PREFIX + key, JSON.stringify(value));
      } catch (e) {
        memoryFallback[key] = value;
      }
      return value;
    },
    del: function (key) {
      try { win.localStorage.removeItem(PREFIX + key); } catch (e) {}
      delete memoryFallback[key];
    }
  };

  /* -------------------------------------------------------------- scores */
  /* bests[gameId] = { value, label, at }  — value is compared numerically   */
  SG.scores = {
    all: function () { return SG.store.get("bests", {}); },
    get: function (game) {
      var b = SG.scores.all()[game];
      return b || null;
    },
    /* higher is better */
    submit: function (game, value, label) {
      var bests = SG.scores.all();
      var prev = bests[game];
      var isBest = !prev || value > prev.value;
      if (isBest) {
        bests[game] = { value: value, label: label || String(value), at: Date.now() };
        SG.store.set("bests", bests);
      }
      return { isBest: isBest, best: bests[game] };
    },
    /* lower is better (times, moves) */
    submitLow: function (game, value, label) {
      var bests = SG.scores.all();
      var prev = bests[game];
      var isBest = !prev || value < prev.value;
      if (isBest) {
        bests[game] = { value: value, label: label || String(value), at: Date.now() };
        SG.store.set("bests", bests);
      }
      return { isBest: isBest, best: bests[game] };
    }
  };

  /* --------------------------------------------------------------- stats */
  SG.stats = {
    data: function () { return SG.store.get("stats", { plays: 0, wins: 0, perGame: {} }); },
    play: function (game) {
      var s = SG.stats.data();
      s.plays += 1;
      s.perGame[game] = (s.perGame[game] || 0) + 1;
      SG.store.set("stats", s);
      return s;
    },
    win: function (game) {
      var s = SG.stats.data();
      s.wins += 1;
      s.perGame[game + ":wins"] = (s.perGame[game + ":wins"] || 0) + 1;
      SG.store.set("stats", s);
      return s;
    },
    reset: function () {
      SG.store.set("stats", { plays: 0, wins: 0, perGame: {} });
      SG.store.set("bests", {});
    }
  };

  /* ---------------------------------------------------------------- theme */
  var THEME_KEY = "theme";
  SG.theme = {
    get: function () {
      var saved = SG.store.get(THEME_KEY, null);
      if (saved === "light" || saved === "dark") return saved;
      return win.matchMedia && win.matchMedia("(prefers-color-scheme: light)").matches
        ? "light"
        : "dark";
    },
    set: function (mode) {
      doc.documentElement.setAttribute("data-theme", mode);
      SG.store.set(THEME_KEY, mode);
      var meta = doc.querySelector('meta[name="theme-color"]');
      if (meta) meta.setAttribute("content", mode === "light" ? "#f4f6fd" : "#05070f");
      try {
        var lb = win.localStorage.getItem("sg:theme");
        if (!lb) {
          win.addEventListener("storage", function (e) {
            if (e.key === "sg:theme" && e.newValue) {
              var next = JSON.parse(e.newValue);
              doc.documentElement.setAttribute("data-theme", next);
            }
          });
        }
      } catch (e) {}
    },
    toggle: function () {
      var next = SG.theme.get() === "light" ? "dark" : "light";
      SG.theme.set(next);
      return next;
    }
  };

  /* ---------------------------------------------------------------- sound */
  /* Tiny WebAudio synth — zero assets, zero latency. */
  var audioCtx = null;
  var masterGain = null;

  function ensureCtx() {
    if (audioCtx) {
      if (audioCtx.state === "suspended") audioCtx.resume();
      return audioCtx;
    }
    var Ctor = win.AudioContext || win.webkitAudioContext;
    if (!Ctor) return null;
    try {
      audioCtx = new Ctor();
      masterGain = audioCtx.createGain();
      masterGain.gain.value = 0.18;
      masterGain.connect(audioCtx.destination);
    } catch (e) {
      audioCtx = null;
    }
    return audioCtx;
  }

  var VOICES = {
    tap: { type: "triangle", f: 520, to: 640, dur: 0.07, gain: 0.5 },
    click: { type: "sine", f: 380, to: 520, dur: 0.06, gain: 0.5 },
    flip: { type: "triangle", f: 420, to: 760, dur: 0.1, gain: 0.45 },
    match: { type: "sine", f: 660, to: 990, dur: 0.18, gain: 0.5 },
    wrong: { type: "sawtooth", f: 220, to: 110, dur: 0.22, gain: 0.4 },
    tick: { type: "square", f: 880, to: 880, dur: 0.035, gain: 0.3 },
    roll: { type: "square", f: 240, to: 900, dur: 0.16, gain: 0.35 },
    reel: { type: "square", f: 1200, to: 300, dur: 0.05, gain: 0.22 },
    win: { type: "triangle", f: 523, to: 1046, dur: 0.42, gain: 0.5 },
    bigwin: { type: "triangle", f: 659, to: 1318, dur: 0.7, gain: 0.55 },
    lose: { type: "sawtooth", f: 300, to: 90, dur: 0.5, gain: 0.4 },
    bounce: { type: "square", f: 340, to: 340, dur: 0.045, gain: 0.35 },
    eat: { type: "sine", f: 700, to: 1100, dur: 0.1, gain: 0.45 },
    bonk: { type: "square", f: 180, to: 90, dur: 0.12, gain: 0.5 },
    pop: { type: "sine", f: 300, to: 620, dur: 0.12, gain: 0.4 }
  };

  SG.sound = {
    enabled: function () { return SG.store.get("sound", true) !== false; },
    toggle: function (on) {
      SG.store.set("sound", on === undefined ? !SG.sound.enabled() : !!on);
      return SG.sound.enabled();
    },
    play: function (name, detune) {
      if (!SG.sound.enabled()) return;
      var v = VOICES[name];
      if (!v) return;
      var ctx = ensureCtx();
      if (!ctx) return;
      var t = ctx.currentTime;
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      var d = (detune || 0);

      osc.type = v.type;
      osc.frequency.setValueAtTime(Math.max(30, v.f + d), t);
      osc.frequency.exponentialRampToValueAtTime(Math.max(30, v.to + d), t + v.dur);

      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(v.gain, t + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + v.dur);

      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(t);
      osc.stop(t + v.dur + 0.02);
    },
    chord: function (name, semis) {
      (semis || [0, 4, 7]).forEach(function (s, i) {
        win.setTimeout(function () { SG.sound.play(name, s * 100); }, i * 70);
      });
    }
  };

  /* ---------------------------------------------------------------- toasts */
  SG.toast = function (opts) {
    var host = SG.$(".toasts");
    if (!host) {
      host = doc.createElement("div");
      host.className = "toasts";
      host.setAttribute("role", "status");
      host.setAttribute("aria-live", "polite");
      doc.body.appendChild(host);
    }
    var o = typeof opts === "string" ? { text: opts } : opts || {};
    var el = doc.createElement("div");
    el.className = "toast";
    el.innerHTML =
      '<span class="toast__ic">' + (o.icon || "✨") + "</span>" +
      '<span><b>' + (o.title || o.text || "") + "</b>" +
      (o.sub ? "<small>" + o.sub + "</small>" : "") + "</span>";
    host.appendChild(el);
    var life = o.duration || 3200;
    win.setTimeout(function () {
      el.classList.add("is-out");
      win.setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 300);
    }, life);
    return el;
  };

  /* -------------------------------------------------------------- confetti */
  SG.confetti = (function () {
    var cv = null, cx = null, parts = [], raf = null;

    function ensure() {
      if (cv) return cv;
      cv = doc.createElement("canvas");
      cv.id = "confetti";
      cv.setAttribute("aria-hidden", "true");
      doc.body.appendChild(cv);
      cx = cv.getContext("2d");
      return cv;
    }

    function resize() {
      if (!cv) return;
      var dpr = Math.min(win.devicePixelRatio || 1, 2);
      cv.width = win.innerWidth * dpr;
      cv.height = win.innerHeight * dpr;
      cx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function frame() {
      cx.clearRect(0, 0, cv.width, cv.height);
      var alive = 0;
      for (var i = 0; i < parts.length; i++) {
        var p = parts[i];
        p.vy += 0.22;
        p.vx *= 0.995;
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 1;
        p.rot += p.vr;
        if (p.life > 0 && p.y < win.innerHeight + 60) alive++;
        cx.save();
        cx.translate(p.x, p.y);
        cx.rotate(p.rot);
        cx.globalAlpha = SG.clamp(p.life / 60, 0, 1);
        cx.fillStyle = p.c;
        cx.fillRect(-p.s / 2, -p.s / 2, p.s, p.s * 0.62);
        cx.restore();
      }
      if (alive > 0) {
        raf = win.requestAnimationFrame(frame);
      } else {
        cx.clearRect(0, 0, cv.width, cv.height);
        cv.classList.remove("is-on");
        raf = null;
      }
    }

    return {
      burst: function (count) {
        if (SG.reduceMotion()) return;
        ensure();
        resize();
        cv.classList.add("is-on");
        var colors = ["#7c5cff", "#00cdf0", "#ff4d9d", "#ffc94d", "#8bff6a", "#ff8a3d"];
        var n = count || 90;
        for (var i = 0; i < n; i++) {
          parts.push({
            x: win.innerWidth / 2 + SG.rand(-140, 140),
            y: win.innerHeight * 0.32 + SG.rand(-40, 40),
            vx: SG.rand(-9, 9),
            vy: SG.rand(-13, -3),
            s: SG.rand(6, 14),
            c: SG.pick(colors),
            rot: SG.rand(0, 6.28),
            vr: SG.rand(-0.24, 0.24),
            life: SG.randInt(90, 165)
          });
        }
        if (!raf) raf = win.requestAnimationFrame(frame);
      },
      rain: function (count) {
        if (SG.reduceMotion()) return;
        ensure();
        resize();
        cv.classList.add("is-on");
        var colors = ["#7c5cff", "#00cdf0", "#ff4d9d", "#ffc94d", "#8bff6a"];
        var n = count || 130;
        for (var i = 0; i < n; i++) {
          parts.push({
            x: SG.rand(0, win.innerWidth),
            y: SG.rand(-win.innerHeight, 0),
            vx: SG.rand(-1.6, 1.6),
            vy: SG.rand(2, 5.5),
            s: SG.rand(5, 11),
            c: SG.pick(colors),
            rot: SG.rand(0, 6.28),
            vr: SG.rand(-0.2, 0.2),
            life: 320
          });
        }
        if (!raf) raf = win.requestAnimationFrame(frame);
      }
    };
  })();

  /* ----------------------------------------------------------- HUD helper */
  SG.hud = function (map) {
    var cells = {};
    Object.keys(map).forEach(function (k) {
      var el = SG.$('[data-hud="' + k + '"]');
      if (el) cells[k] = el;
    });
    return {
      set: function (k, v, bump) {
        var el = cells[k];
        if (!el) return;
        el.textContent = v;
        if (bump && !SG.reduceMotion()) {
          el.classList.remove("is-bump");
          void el.offsetWidth;
          el.classList.add("is-bump");
          win.setTimeout(function () { el.classList.remove("is-bump"); }, 200);
        }
      },
      get: function (k) { return cells[k] ? cells[k].textContent : null; }
    };
  };

  /* -------------------------------------------------------- ripple effect */
  SG.ripple = function (e, btn) {
    if (SG.reduceMotion() || !btn) return;
    var r = btn.getBoundingClientRect();
    var size = Math.max(r.width, r.height) * 1.6;
    var ink = doc.createElement("span");
    ink.className = "btn__ripple";
    ink.style.width = ink.style.height = size + "px";
    ink.style.left = e.clientX - r.left + "px";
    ink.style.top = e.clientY - r.top + "px";
    btn.appendChild(ink);
    win.setTimeout(function () { if (ink.parentNode) ink.parentNode.removeChild(ink); }, 640);
  };

  /* ----------------------------------------------------- reveal on scroll */
  SG.reveal = function (root) {
    var items = SG.$$(".reveal", root || doc);
    if (!("IntersectionObserver" in win)) {
      items.forEach(function (el) { el.classList.add("is-in"); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          en.target.classList.add("is-in");
          io.unobserve(en.target);
        }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    items.forEach(function (el, i) {
      el.style.setProperty("--d", (i % 8) * 60 + "ms");
      io.observe(el);
    });
  };

  /* ------------------------------------------------------- canvas helper */
  SG.dprCanvas = function (canvas, cssW, cssH) {
    var dpr = Math.min(win.devicePixelRatio || 1, 2);
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    var ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return ctx;
  };

  /* ------------------------------------------------------------ game meta */
  /* Single source of truth for names, icons and default bests. */
  SG.GAMES = {
    memory: { name: "Memory Match", icon: "🃏", tint: "#7c5cff", bestLabel: "fewest moves" },
    dice:   { name: "Dice Roll",     icon: "🎲", tint: "#00cdf0", bestLabel: "best roll" },
    slots:  { name: "777 Slots",     icon: "🎰", tint: "#ff4d9d", bestLabel: "biggest win" },
    pong:   { name: "Ping Pong",     icon: "🏓", tint: "#8bff6a", bestLabel: "best score" },
    ttt:    { name: "Tic Tac Toe",   icon: "⭕", tint: "#ffc94d", bestLabel: "wins" },
    snake:  { name: "Snake",         icon: "🐍", tint: "#8bff6a", bestLabel: "best score" },
    mole:   { name: "Whack-a-Mole",  icon: "🔨", tint: "#ff8a3d", bestLabel: "best score" },
    g2048:  { name: "2048",          icon: "🔢", tint: "#00cdf0", bestLabel: "best score" },
    breakout:  { name: "Breakout",      icon: "🧱", tint: "#ff4d6d", bestLabel: "best score" },
    tetris:    { name: "Tetris",        icon: "🧊", tint: "#7c5cff", bestLabel: "best score" },
    mines:     { name: "Minesweeper",   icon: "💣", tint: "#ff8a3d", bestLabel: "fastest" },
    c4:        { name: "Connect Four",  icon: "🔴", tint: "#00cdf0", bestLabel: "wins" },
    wordle:    { name: "Wordle",        icon: "📝", tint: "#8bff6a", bestLabel: "fewest tries" },
    flappy:    { name: "Flappy",        icon: "🐦", tint: "#ffc94d", bestLabel: "best score" },
    lightsout: { name: "Lights Out",    icon: "💡", tint: "#ff4d9d", bestLabel: "fewest moves" }
  };

  /* --------------------------------------------------------- boot: theme */
  SG.theme.set(SG.theme.get());
})(window, document);
