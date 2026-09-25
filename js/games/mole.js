/* ==========================================================================
   Whack-a-Mole — timed reflex game with combo scoring
   Rules: mole +10, empty hole -3, grey (bad) mole -5
   ========================================================================== */
(function (win, doc) {
  "use strict";

  var $ = SG.$, $$ = SG.$$;
  var grid = $("[data-grid]");
  if (!grid) return;

  var GAME = "mole";
  var hud = SG.hud({ score: 1, combo: 1, time: 1, best: 1 });

  var HOLES = 9;
  var GOOD = 10;
  var MISS = -3;
  var BAD = -5;

  var config = {
    dur: parseInt(SG.store.get("mole:dur", 30), 10) || 30,
    diff: parseInt(SG.store.get("mole:diff", 0), 10) || 0
  };

  var state = {
    running: false,
    score: 0,
    combo: 0,
    bestCombo: 0,
    left: 0,
    spawnAt: 0,
    nextSpawn: 0,
    raf: null
  };

  var holes = [];

  /* --------------------------------------------------------------- setup */
  function build() {
    grid.innerHTML = "";
    holes = [];
    for (var i = 0; i < HOLES; i++) {
      var hole = doc.createElement("button");
      hole.type = "button";
      hole.className = "mole-hole";
      hole.setAttribute("aria-label", "Hole " + (i + 1) + ", empty");
      hole.innerHTML =
        '<span class="mole" aria-hidden="true"><span class="mole__score"></span></span>';
      hole.addEventListener("click", function (e) { whack(e.currentTarget); });
      grid.appendChild(hole);
      holes.push(hole);
    }
  }

  function down(el) { el.classList.remove("is-up", "is-bonk", "is-bad"); }

  function up(el, bad) {
    if (el.classList.contains("is-up")) return;
    down(el);
    el.classList.add("is-up");
    if (bad) el.classList.add("is-bad");
  }

  /* -------------------------------------------------------------- tuning */
  function tuning() {
    /* faster and nastier as the clock drains */
    var progress = 1 - state.left / config.dur;
    var base = config.diff === 0 ? 820 : 560;
    var interval = SG.clamp(base - progress * (config.diff === 0 ? 430 : 400), config.diff === 0 ? 340 : 210, 2000);
    return {
      upFor: SG.clamp((config.diff === 0 ? 900 : 720) - progress * 260, 320, 1100),
      interval: interval,
      badChance: SG.clamp((config.diff === 0 ? 0.06 : 0.15) + progress * 0.14, 0, 0.34)
    };
  }

  /* --------------------------------------------------------------- whack */
  function whack(hole) {
    if (!state.running) return;

    if (hole.classList.contains("is-up")) {
      var bad = hole.classList.contains("is-bad");
      down(hole);

      if (bad) {
        state.score = Math.max(0, state.score + BAD);
        state.combo = 0;
        SG.sound.play("wrong");
      } else {
        state.score += GOOD + Math.min(20, state.combo * 2);
        state.combo++;
        if (state.combo > state.bestCombo) state.bestCombo = state.combo;
        SG.sound.play("bonk", state.combo * 18);
        $(".mole__score", hole).textContent = "+" + GOOD;
        hole.classList.add("is-bonk");
        win.setTimeout(function () { hole.classList.remove("is-bonk"); }, 260);
      }
    } else {
      /* swinging at nothing costs you */
      if (!hole.classList.contains("is-bonk")) {
        state.score = Math.max(0, state.score + MISS);
        state.combo = 0;
        SG.sound.play("tick");
      }
    }
    paint(true);
  }

  function paint(bump) {
    hud.set("score", state.score, !!bump);
    hud.set("combo", state.bestCombo, !!bump);
    hud.set("time", Math.max(0, Math.ceil(state.left)));
    var best = SG.scores.get(GAME);
    hud.set("best", best ? best.label : "—");
  }

  /* ---------------------------------------------------------------- loop */
  function frame(now) {
    state.raf = win.requestAnimationFrame(frame);
    if (!state.running) return;
    if (!state.last) state.last = now;

    state.left -= (now - state.last) / 1000;
    state.last = now;

    if (state.left <= 0) { end(); return; }

    if (now >= state.nextSpawn) {
      spawn();
      var t = tuning();
      state.nextSpawn = now + t.interval * SG.rand(0.75, 1.25);
    }

    /* retire moles that have been up too long */
    if (now - state.spawnAt > tuning().upFor) {
      holes.forEach(function (h) {
        if (h.classList.contains("is-up") && !h.classList.contains("is-bonk")) down(h);
      });
    }

    paint(false);
  }

  function spawn() {
    var idle = holes.filter(function (h) { return !h.classList.contains("is-up"); });
    if (!idle.length) return;
    var t = tuning();
    up(SG.pick(idle), Math.random() < t.badChance);
    state.spawnAt = win.performance ? win.performance.now() : Date.now();
  }

  /* ----------------------------------------------------------- round flow */
  function start() {
    holes.forEach(down);
    state.score = 0;
    state.combo = 0;
    state.bestCombo = 0;
    state.left = config.dur;
    state.running = true;
    state.last = 0;
    state.nextSpawn = 0;
    SG.stats.play(GAME);
    paint();
    $("[data-status]").textContent = "Go! Hit the orange moles, dodge the grey ones.";
    SG.sound.play("tap");
  }

  function end() {
    state.running = false;
    holes.forEach(down);
    state.left = 0;
    paint();

    var res = SG.scores.submit(GAME, state.score, String(state.score));
    if (state.score > 0) SG.stats.win(GAME);
    SG.sound.play(state.score > 40 ? "bigwin" : "lose");

    $("[data-status]").textContent =
      "Round over — " + state.score + " points" +
      (res.isBest && state.score > 0 ? " · new personal best!" : ".");

    if (res.isBest && state.score > 0) {
      SG.confetti.rain(120);
      SG.toast({
        icon: "🏅",
        title: "New best: " + state.score,
        sub: "Best combo was " + state.bestCombo + " hits."
      });
    } else {
      SG.toast({
        icon: "🔨",
        title: "Round over: " + state.score,
        sub: "Best combo " + state.bestCombo + " hits."
      });
    }
  }

  /* ----------------------------------------------------------- controls */
  function syncPressed(attr, value) {
    $$("button[" + attr + "]").forEach(function (b) {
      b.setAttribute("aria-pressed", String(b.getAttribute(attr) === value));
    });
  }

  function bindSeg(attr, cb) {
    var groups = [];
    $$("button[" + attr + "]").forEach(function (b) {
      if (groups.indexOf(b.parentNode) === -1) groups.push(b.parentNode);
    });
    groups.forEach(function (g) {
      g.addEventListener("click", function (e) {
        var btn = e.target.closest("button[" + attr + "]");
        if (!btn) return;
        syncPressed(attr, btn.getAttribute(attr));
        cb(btn.getAttribute(attr));
        SG.sound.play("click");
      });
    });
  }

  bindSeg("data-dur", function (v) {
    config.dur = parseInt(v, 10);
    SG.store.set("mole:dur", config.dur);
    if (state.running) start();
  });

  bindSeg("data-diff", function (v) {
    config.diff = parseInt(v, 10);
    SG.store.set("mole:diff", config.diff);
  });

  $("[data-start]").addEventListener("click", start);

  doc.addEventListener("keydown", function (e) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    var t = e.target;
    if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
    if (e.key === " " || e.key.toLowerCase() === "r") {
      if (t && t.tagName === "BUTTON" && e.key === "Enter") return;
      e.preventDefault();
      start();
    }
  });

  /* --------------------------------------------------------------- boot */
  build();
  syncPressed("data-dur", String(config.dur));
  syncPressed("data-diff", String(config.diff));
  paint();
  state.raf = win.requestAnimationFrame(frame);
})(window, document);
