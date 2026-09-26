/* ==========================================================================
   Flappy — one button, one bird, a lot of pipes.
   ========================================================================== */
(function (win, doc) {
  "use strict";

  var $ = SG.$, $$ = SG.$$;
  var canvas = $("[data-canvas]");
  if (!canvas) return;

  var GAME = "flappy";
  var hud = SG.hud({ score: 1, best: 1, medal: 1, pipes: 1 });

  var W = 480;
  var H = 640;
  var GROUND = 72;

  var config = {
    gravity: parseFloat(SG.store.get("flappy:gravity", 0.42)) || 0.42,
    gap: parseInt(SG.store.get("flappy:gap", 132), 10) || 132
  };

  var state = {
    running: false,
    over: false,
    started: false,
    score: 0,
    pipes: [],
    parts: [],
    bird: { x: 120, y: H / 2, vy: 0, r: 14, rot: 0 },
    tick: 0,
    last: 0,
    raf: null
  };

  var ctx = null;
  var view = 1;

  /* --------------------------------------------------------------- canvas */
  function applyView() {
    if (!ctx) return;
    var dpr = win.devicePixelRatio || 1;
    ctx.setTransform(view * dpr, 0, 0, view * dpr, 0, 0);
  }

  function fit() {
    var rect = canvas.getBoundingClientRect();
    var cssW = Math.max(220, rect.width || 360);
    var cssH = Math.round(cssW * (H / W));
    canvas.style.height = cssH + "px";
    ctx = SG.dprCanvas(canvas, cssW, cssH);
    view = cssW / W;
    applyView();
  }

  /* ---------------------------------------------------------------- state */
  function reset() {
    state.score = 0;
    state.pipes = [];
    state.parts = [];
    state.over = false;
    state.started = false;
    state.tick = 0;
    state.bird.y = H / 2;
    state.bird.vy = 0;
    state.bird.rot = 0;
    paintHud();
    draw();
  }

  function flap() {
    if (state.over) { reset(); return; }
    state.bird.vy = -6.4;
    state.started = true;
    state.running = true;
    SG.sound.play("flip");
  }

  function medal() {
    if (state.score >= 30) return { icon: "🏆", text: "Ace" };
    if (state.score >= 20) return { icon: "🥈", text: "Silver" };
    if (state.score >= 10) return { icon: "🥉", text: "Bronze" };
    return { icon: "🎖️", text: "Rookie" };
  }

  function paintHud() {
    hud.set("score", state.score, true);
    hud.set("pipes", state.pipes.length);
    var m = medal();
    hud.set("medal", m.icon + " " + m.text);
    var best = SG.scores.get(GAME);
    hud.set("best", best ? best.label : "—");
  }

  /* ----------------------------------------------------------------- loop */
  function frame(now) {
    state.raf = win.requestAnimationFrame(frame);
    if (!state.running || state.over) { draw(); return; }
    if (state.last === 0) state.last = now;
    var dt = Math.min(32, now - state.last);
    state.last = now;
    step(dt);
    draw();
  }

  function step(dt) {
    var b = state.bird;
    state.tick += dt;
    b.vy += config.gravity * (dt / 16);
    b.y += b.vy * (dt / 16);
    b.rot = SG.clamp(b.vy * 0.055, -0.5, 1.25);

    /* pipes scroll left, spawn on a fixed cadence */
    var speed = 2.5 * (dt / 16);
    var before = state.pipes.length;
    for (var i = state.pipes.length - 1; i >= 0; i--) {
      state.pipes[i].x -= speed;
      if (state.pipes[i].x < -80) state.pipes.splice(i, 1);
    }
    if (state.started && state.tick > 1500) {
      state.tick = 0;
      state.pipes.push(newPipe());
    }
    /* the "pipes" readout tracks the live count, so refresh it when it moves */
    if (state.pipes.length !== before) paintHud();

    /* collisions */
    if (b.y - b.r > H - GROUND) {
      b.y = H - GROUND - b.r;
      die("Hit the ground");
      return;
    }
    if (b.y + b.r < 0) {
      b.y = -b.r;
      die("Flew off the top");
      return;
    }
    for (var k = 0; k < state.pipes.length; k++) {
      var p = state.pipes[k];
      if (p.passed) continue;
      if (p.x + 60 < 120) {
        p.passed = true;
        state.score += 1;
        SG.sound.play("match");
        SG.sound.chord("win", [0, 4]);
        paintHud();
      }
      if (circleHitsRect(b.x, b.y, b.r, p.x, 0, 56, p.gapY)) return die("Hit a pipe");
      if (circleHitsRect(b.x, b.y, b.r, p.x, p.gapY + p.gap, 56, H - GROUND)) return die("Hit a pipe");
    }

    /* particles */
    for (var j = state.parts.length - 1; j >= 0; j--) {
      var q = state.parts[j];
      q.x += q.vx * dt;
      q.y += q.vy * dt;
      q.vy += 0.08 * (dt / 16);
      q.life -= dt;
      if (q.life <= 0) state.parts.splice(j, 1);
    }
  }

  function newPipe() {
    var margin = 70;
    var maxY = H - GROUND - config.gap - margin;
    var gapY = SG.randInt(margin, Math.max(margin + 1, maxY));
    return { x: W + 20, gapY: gapY, gap: config.gap, passed: false };
  }

  function circleHitsRect(cx, cy, r, rx, ry, rw, rh) {
    var nx = SG.clamp(cx, rx, rx + rw);
    var ny = SG.clamp(cy, ry, ry + rh);
    var dx = cx - nx, dy = cy - ny;
    return dx * dx + dy * dy <= r * r;
  }

  function die(reason) {
    state.over = true;
    SG.sound.play("lose");
    var res = SG.scores.submit(GAME, state.score, state.score + " pipes");
    var m = medal();
    showOverlay(
      "Game over",
      reason + " after " + state.score + " pipe" + (state.score === 1 ? "" : "s") + ".",
      "Try again"
    );
    SG.toast({
      icon: res.isBest ? "🏅" : m.icon,
      title: res.isBest ? "New best: " + state.score : m.text + " · " + state.score + " pipes",
      sub: "Tap or press Space to fly again"
    });
    if (res.isBest) paintHud();
  }

  /* ---------------------------------------------------------------- paint */
  function draw() {
    if (!ctx) return;
    ctx.clearRect(0, 0, W, H);

    /* sky */
    var sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, "#12203f");
    sky.addColorStop(0.6, "#1d2f5c");
    sky.addColorStop(1, "#2b4272");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);

    /* parallax city */
    ctx.fillStyle = "rgba(9,14,30,0.55)";
    var off = (state.tick ? (performance.now() / 22) % 90 : 0);
    for (var i = -1; i < W / 90 + 2; i++) {
      var bx = i * 90 - off;
      var bh = 70 + ((i * 37) % 60);
      ctx.fillRect(bx, H - GROUND - bh, 62, bh);
    }

    /* pipes */
    for (var p = 0; p < state.pipes.length; p++) {
      var pipe = state.pipes[p];
      drawPipe(pipe.x, 0, 56, pipe.gapY, true);
      drawPipe(pipe.x, pipe.gapY + pipe.gap, 56, H - GROUND - pipe.gapY - pipe.gap, false);
    }

    /* ground */
    var gy = H - GROUND;
    var gg = ctx.createLinearGradient(0, gy, 0, H);
    gg.addColorStop(0, "#7c5cff");
    gg.addColorStop(1, "#4a2fb0");
    ctx.fillStyle = gg;
    ctx.fillRect(0, gy, W, GROUND);
    ctx.fillStyle = "rgba(255,255,255,0.18)";
    ctx.fillRect(0, gy, W, 5);

    /* particles */
    for (var q = 0; q < state.parts.length; q++) {
      var pt = state.parts[q];
      ctx.globalAlpha = SG.clamp(pt.life / 500, 0, 1);
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    /* bird */
    if (!state.over) {
      var b = state.bird;
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(b.rot);
      ctx.fillStyle = "#ffc94d";
      ctx.shadowColor = "rgba(255,201,77,0.7)";
      ctx.shadowBlur = 18;
      ctx.beginPath();
      ctx.ellipse(0, 0, b.r + 2, b.r, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      /* wing */
      ctx.fillStyle = "#e8a92c";
      ctx.beginPath();
      ctx.ellipse(-3, -1, 7, 5, 0.5, 0, Math.PI * 2);
      ctx.fill();
      /* eye */
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(6, -3, 4.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#10131c";
      ctx.beginPath();
      ctx.arc(7.4, -3, 2.1, 0, Math.PI * 2);
      ctx.fill();
      /* beak */
      ctx.fillStyle = "#ff8a3d";
      ctx.beginPath();
      ctx.moveTo(11, 1);
      ctx.lineTo(19, 4);
      ctx.lineTo(11, 7);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    if (!state.started && !state.over) {
      ctx.fillStyle = "rgba(255,255,255,0.86)";
      ctx.font = "600 17px Outfit, system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Tap or press Space to flap", W / 2, H / 2 - 46);
    }
  }

  function drawPipe(x, y, w, h, cap) {
    if (h <= 0) return;
    var g = ctx.createLinearGradient(x, 0, x + w, 0);
    g.addColorStop(0, "#57d977");
    g.addColorStop(0.5, "#8bff6a");
    g.addColorStop(1, "#3aa85c");
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = "rgba(255,255,255,0.22)";
    ctx.fillRect(x + 6, y, 8, h);
    /* cap */
    ctx.fillStyle = "#6ee08a";
    var cy = cap ? y + h - 22 : y;
    ctx.fillRect(x - 5, cy, w + 10, 22);
    ctx.fillStyle = "rgba(255,255,255,0.18)";
    ctx.fillRect(x - 1, cy, 6, 22);
  }

  /* ------------------------------------------------------------- overlay */
  function showOverlay(title, text, btn) {
    var ov = $("[data-overlay]");
    if (!ov) return;
    $("[data-overlay-title]").textContent = title;
    $("[data-overlay-text]").innerHTML = text;
    var b = $("[data-start]", ov);
    if (b) b.textContent = btn;
    ov.hidden = false;
  }
  function hideOverlay() { var ov = $("[data-overlay]"); if (ov) ov.hidden = true; }

  /* ------------------------------------------------------------- control */
  $$("[data-start]").forEach(function (b) {
    b.addEventListener("click", function () {
      if (state.over) reset();
      hideOverlay();
      flap();
      SG.stats.play(GAME);
    });
  });

  canvas.addEventListener("pointerdown", function (e) {
    e.preventDefault();
    if (state.over) reset();
    hideOverlay();
    flap();
    SG.stats.play(GAME);
  });

  doc.addEventListener("keydown", function (e) {
    var t = e.target;
    if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
    var k = e.key.toLowerCase();
    if (k === " " || k === "arrowup" || k === "w") {
      e.preventDefault();
      if (state.over) reset();
      hideOverlay();
      flap();
      SG.stats.play(GAME);
    }
  });

  function bindSeg(attr, cb) {
    var groups = [];
    $$("button[" + attr + "]").forEach(function (b) {
      if (groups.indexOf(b.parentNode) === -1) groups.push(b.parentNode);
    });
    groups.forEach(function (g) {
      g.addEventListener("click", function (e) {
        var btn = e.target.closest("button[" + attr + "]");
        if (!btn) return;
        $$("button[" + attr + "]").forEach(function (o) {
          o.setAttribute("aria-pressed", String(o.getAttribute(attr) === btn.getAttribute(attr)));
        });
        cb(btn.getAttribute(attr));
      });
    });
  }

  bindSeg("data-gravity", function (v) {
    config.gravity = parseFloat(v);
    SG.store.set("flappy:gravity", config.gravity);
    SG.sound.play("click");
  });
  bindSeg("data-gap", function (v) {
    config.gap = parseInt(v, 10);
    SG.store.set("flappy:gap", config.gap);
    SG.sound.play("click");
  });

  /* ---------------------------------------------------------------- boot */
  fit();
  reset();
  showOverlay(
    "Flappy",
    "One button, one bird. Tap the sky or press <kbd>Space</kbd> to rise and let go to fall. " +
    "Thread as many pipes as you can.",
    "Start flying"
  );
  state.raf = win.requestAnimationFrame(frame);
  win.addEventListener("resize", SG.debounce(function () { fit(); draw(); }, 140));
})(window, document);
