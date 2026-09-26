/* ==========================================================================
   Breakout — paddle, ball, bricks. Mouse / touch / arrow keys.
   ========================================================================== */
(function (win, doc) {
  "use strict";

  var $ = SG.$, $$ = SG.$$;
  var canvas = $("[data-canvas]");
  if (!canvas) return;

  var GAME = "breakout";
  var hud = SG.hud({ score: 1, lives: 1, level: 1, best: 1 });

  /* virtual coordinate space */
  var W = 720;
  var H = 480;
  var COLS = 10;
  var BRICK_H = 20;

  var COLORS = ["#ff4d6d", "#ff8a3d", "#ffc94d", "#8bff6a", "#00cdf0", "#7c5cff"];

  var config = {
    lives: parseInt(SG.store.get("breakout:lives", 3), 10) || 3,
    speed: parseFloat(SG.store.get("breakout:speed", 1)) || 1
  };

  var state = {
    running: false,
    paused: false,
    over: false,
    won: false,
    score: 0,
    lives: 3,
    level: 1,
    ball: { x: W / 2, y: H - 60, vx: 0, vy: 0, r: 7, speed: 5 },
    paddle: { x: W / 2, w: 110, h: 13, vx: 0 },
    bricks: [],
    parts: [],
    keys: {},
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
    var cssW = Math.max(280, rect.width || W);
    var cssH = Math.round(cssW * (H / W));
    canvas.style.height = cssH + "px";
    ctx = SG.dprCanvas(canvas, cssW, cssH);
    view = cssW / W;
    applyView();
  }

  /* ---------------------------------------------------------------- board */
  function buildLevel() {
    var rows = Math.min(3 + state.level, 7);
    var w = (W - 40) / COLS;
    state.bricks = [];
    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < COLS; c++) {
        state.bricks.push({
          x: 20 + c * w,
          y: 46 + r * (BRICK_H + 8),
          w: w - 6,
          h: BRICK_H,
          hp: 1,
          color: COLORS[r % COLORS.length],
          dead: false
        });
      }
    }
  }

  function reset(full) {
    state.score = 0;
    state.lives = full ? config.lives : state.lives;
    state.level = 1;
    state.over = false;
    state.won = false;
    state.paused = false;
    state.parts = [];
    state.paddle.x = W / 2 - state.paddle.w / 2;
    buildLevel();
    serve(true);
    paintHud();
    draw();
  }

  function serve(soft) {
    var b = state.ball;
    b.x = state.paddle.x + state.paddle.w / 2;
    b.y = H - 46;
    /* a mostly-random angle keeps rallies varied but always upward */
    var ang = (-Math.PI / 2) + (Math.random() * 0.9 - 0.45);
    var sp = 5 * config.speed;
    b.vx = Math.cos(ang) * sp;
    b.vy = Math.sin(ang) * sp;
    b.speed = sp;
    state.paddle.vx = 0;
    if (soft) b.stuck = true;
  }

  /* ----------------------------------------------------------------- loop */
  function frame(now) {
    state.raf = win.requestAnimationFrame(frame);
    if (!state.running) return;
    if (state.last === 0) state.last = now;
    var dt = Math.min(34, now - state.last);
    state.last = now;
    if (state.paused || state.over) { draw(); return; }

    step(dt);
    draw();
  }

  function step(dt) {
    movePaddle(dt);
    stepBall(dt);
    stepParts(dt);

    if (state.ball.stuck) {
      state.ball.x = state.paddle.x + state.paddle.w / 2;
      state.ball.y = H - 46;
      return;
    }
  }

  function movePaddle(dt) {
    var p = state.paddle;
    var k = state.keys;
    var dir = 0;
    if (k.ArrowLeft || k.a) dir -= 1;
    if (k.ArrowRight || k.d) dir += 1;

    if (dir) {
      p.vx = dir * 0.62;
      p.x += p.vx * dt;
    } else if (p.vx) {
      p.vx *= 0.86;
      p.x += p.vx * dt;
    }

    if (p.x < 0) { p.x = 0; p.vx = 0; }
    if (p.x > W - p.w) { p.x = W - p.w; p.vx = 0; }
  }

  function stepBall(dt) {
    var b = state.ball;

    /* sub-step so a fast ball can never tunnel through the paddle */
    var speed = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
    var steps = Math.max(1, Math.ceil(speed * dt / 6));
    var sdt = dt / steps;

    for (var i = 0; i < steps; i++) {
      b.x += b.vx * sdt;
      b.y += b.vy * sdt;

      /* walls */
      if (b.x < b.r) { b.x = b.r; b.vx = Math.abs(b.vx); SG.sound.play("bounce"); }
      if (b.x > W - b.r) { b.x = W - b.r; b.vx = -Math.abs(b.vx); SG.sound.play("bounce"); }
      if (b.y < b.r) { b.y = b.r; b.vy = Math.abs(b.vy); SG.sound.play("bounce"); }

      /* paddle */
      var p = state.paddle;
      if (b.vy > 0 && b.y + b.r >= p.y && b.y - b.r <= p.y + p.h &&
          b.x >= p.x - b.r && b.x <= p.x + p.w + b.r) {
        b.y = p.y - b.r;
        /* where on the paddle it landed steers the angle */
        var rel = SG.clamp((b.x - (p.x + p.w / 2)) / (p.w / 2), -1, 1);
        var ang = -Math.PI / 2 + rel * 1.05;
        var sp = Math.min(9, Math.max(3.4, b.speed) + 0.16) * (config.speed > 1 ? 1.1 : 1);
        b.vx = Math.cos(ang) * sp;
        b.vy = Math.sin(ang) * sp;
        b.speed = sp;
        SG.sound.play("bounce", Math.round(rel * 120));
      }

      /* bricks */
      for (var k = 0; k < state.bricks.length; k++) {
        var br = state.bricks[k];
        if (br.dead) continue;
        if (b.x + b.r < br.x || b.x - b.r > br.x + br.w ||
            b.y + b.r < br.y || b.y - b.r > br.y + br.h) continue;

        /* decide which face was hit */
        var overlapX = Math.min(b.x + b.r - br.x, br.x + br.w - (b.x - b.r));
        var overlapY = Math.min(b.y + b.r - br.y, br.y + br.h - (b.y - b.r));
        if (overlapX < overlapY) b.vx = -b.vx;
        else b.vy = -b.vy;

        br.dead = true;
        state.score += 10 * state.level;
        SG.sound.play("pop");
        burst(br.x + br.w / 2, br.y + br.h / 2, br.color);
        paintHud();

        if (!state.bricks.some(function (x) { return !x.dead; })) {
          levelUp();
        }
        return;
      }

      /* floor */
      if (b.y - b.r > H) {
        loseBall();
        return;
      }
    }
  }

  function stepParts(dt) {
    for (var i = state.parts.length - 1; i >= 0; i--) {
      var p = state.parts[i];
      p.vy += 0.28 * (dt / 16);
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      if (p.life <= 0) state.parts.splice(i, 1);
    }
  }

  function burst(x, y, color) {
    for (var i = 0; i < 9; i++) {
      state.parts.push({
        x: x, y: y,
        vx: SG.rand(-2.6, 2.6),
        vy: SG.rand(-2.6, 0.6),
        life: SG.randInt(280, 520),
        c: color,
        s: SG.rand(2, 4.4)
      });
    }
  }

  function levelUp() {
    state.level += 1;
    state.score += 250 * state.level;
    SG.sound.chord("bigwin", [0, 4, 7]);
    burst(W / 2, H / 3, "#ffc94d");
    /* hold the ball: the wall is cleared, so freeze until the player advances */
    state.paused = true;
    state.ball.stuck = true;
    state.ball.vx = 0;
    state.ball.vy = 0;
    showOverlay(
      "Level " + state.level,
      "Clean sweep. The next wall is bigger and the ball is faster.",
      "Next level"
    );
  }

  function loseBall() {
    state.lives -= 1;
    state.ball.stuck = true;
    paintHud();
    SG.sound.play("bonk");

    if (state.lives <= 0) {
      state.over = true;
      var res = SG.scores.submit(GAME, state.score, String(state.score));
      showOverlay(
        "Game over",
        "Final score " + state.score + " across " + (state.level - 1) + " level" +
          (state.level === 2 ? "" : "s") + ".",
        "Play again"
      );
      SG.toast({
        icon: res.isBest ? "🏅" : "🧱",
        title: res.isBest ? "New best: " + state.score : "Score " + state.score,
        sub: "Reached level " + state.level
      });
      if (res.isBest) paintHud();
    } else {
      serve(true);
    }
  }

  /* ---------------------------------------------------------------- paint */
  function paintHud() {
    hud.set("score", state.score, true);
    hud.set("lives", state.lives);
    hud.set("level", state.level);
    var best = SG.scores.get(GAME);
    hud.set("best", best ? best.label : "—");
  }

  function draw() {
    if (!ctx) return;
    ctx.clearRect(0, 0, W, H);

    var bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, "#0b1120");
    bg.addColorStop(1, "#070b14");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    /* bricks */
    for (var i = 0; i < state.bricks.length; i++) {
      var b = state.bricks[i];
      if (b.dead) continue;
      ctx.fillStyle = b.color;
      roundRect(ctx, b.x, b.y, b.w, b.h, 4);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.24)";
      roundRect(ctx, b.x + 2, b.y + 2, b.w - 4, b.h * 0.32, 3);
      ctx.fill();
    }

    /* particles */
    for (var p = 0; p < state.parts.length; p++) {
      var q = state.parts[p];
      ctx.globalAlpha = SG.clamp(q.life / 400, 0, 1);
      ctx.fillStyle = q.c;
      ctx.fillRect(q.x, q.y, q.s, q.s);
    }
    ctx.globalAlpha = 1;

    /* paddle */
    var pd = state.paddle;
    var pg = ctx.createLinearGradient(pd.x, 0, pd.x + pd.w, 0);
    pg.addColorStop(0, "#7c5cff");
    pg.addColorStop(1, "#00cdf0");
    ctx.fillStyle = pg;
    roundRect(ctx, pd.x, pd.y, pd.w, pd.h, 7);
    ctx.fill();

    /* ball */
    var b2 = state.ball;
    ctx.beginPath();
    ctx.fillStyle = "#fff";
    ctx.shadowColor = "rgba(0,205,240,0.85)";
    ctx.shadowBlur = 16;
    ctx.arc(b2.x, b2.y, b2.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    if (state.paused || state.over) {
      ctx.fillStyle = "rgba(4,7,14,0.5)";
      ctx.fillRect(0, 0, W, H);
    }
  }

  function roundRect(c, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
  }

  /* -------------------------------------------------------------- overlay */
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

  /* -------------------------------------------------------------- control */
  function launch() {
    state.ball.stuck = false;
    SG.sound.play("click");
  }

  function play() {
    if (state.over) { reset(true); }
    /* advancing past a cleared wall rebuilds before the ball is released */
    if (state.level > 1 && !state.bricks.some(function (x) { return !x.dead; })) nextLevel();
    state.running = true;
    state.paused = false;
    state.last = 0;
    hideOverlay();
    SG.stats.play(GAME);
    if (state.ball.stuck) launch();
  }

  function nextLevel() {
    buildLevel();
    state.ball.speed = 5 * config.speed;
    serve(true);
    state.paused = false;
    hideOverlay();
    paintHud();
  }

  function togglePause() {
    if (!state.running || state.over) return;
    /* the level-clear overlay owns the screen; P must not dismiss it */
    if (state.paused && state.ball.stuck) return;
    state.paused = !state.paused;
    if (state.paused) showOverlay("Paused", "Ball is held. Take your time.", "Resume");
    else hideOverlay();
  }

  $$("[data-start]").forEach(function (b) {
    b.addEventListener("click", function () {
      if (state.over) { reset(true); hideOverlay(); }
      play();
    });
  });

  var pauseBtn = $("[data-pause]");
  if (pauseBtn) pauseBtn.addEventListener("click", togglePause);

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
      });
    });
  }

  function syncPressed(attr, value) {
    $$("button[" + attr + "]").forEach(function (b) {
      b.setAttribute("aria-pressed", String(b.getAttribute(attr) === value));
    });
  }

  bindSeg("data-lives", function (v) {
    config.lives = parseInt(v, 10);
    SG.store.set("breakout:lives", config.lives);
    state.lives = config.lives;
    paintHud();
    SG.sound.play("click");
  });

  bindSeg("data-speed", function (v) {
    config.speed = parseFloat(v);
    SG.store.set("breakout:speed", config.speed);
    SG.sound.play("click");
  });

  /* ------------------------------------------------------------ keyboard */
  doc.addEventListener("keydown", function (e) {
    var t = e.target;
    if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
    var k = e.key.toLowerCase();

    if (k === "arrowleft" || k === "arrowright" || k === "a" || k === "d") {
      state.keys[k === "arrowleft" || k === "a" ? "ArrowLeft" : "ArrowRight"] = true;
      e.preventDefault();
      if (!state.running) play();
    } else if (k === " ") {
      e.preventDefault();
      if (state.ball.stuck && !state.over) { if (!state.running) play(); else launch(); }
      else togglePause();
    }
  });

  doc.addEventListener("keyup", function (e) {
    var k = e.key.toLowerCase();
    if (k === "arrowleft" || k === "a") state.keys.ArrowLeft = false;
    if (k === "arrowright" || k === "d") state.keys.ArrowRight = false;
  });

  /* --------------------------------------------------------------- input */
  function paddleTo(clientX) {
    var rect = canvas.getBoundingClientRect();
    if (!rect.width) return;
    var x = ((clientX - rect.left) / rect.width) * W;
    state.paddle.x = SG.clamp(x - state.paddle.w / 2, 0, W - state.paddle.w);
  }

  canvas.addEventListener("pointermove", function (e) { paddleTo(e.clientX); });
  canvas.addEventListener("pointerdown", function (e) {
    paddleTo(e.clientX);
    if (canvas.setPointerCapture) canvas.setPointerCapture(e.pointerId);
    if (!state.running) { play(); return; }
    if (state.ball.stuck) launch();
  });

  /* ---------------------------------------------------------------- boot */
  state.paddle.y = H - 30;
  syncPressed("data-lives", String(config.lives));
  syncPressed("data-speed", String(config.speed));
  fit();
  reset(true);
  showOverlay(
    "Breakout",
    "Clear every brick with three lives. Drag or move the mouse to steer the paddle, " +
    "<kbd>&larr;</kbd> <kbd>&rarr;</kbd> also work. <kbd>Space</kbd> launches and pauses.",
    "Start game"
  );
  state.raf = win.requestAnimationFrame(frame);
  win.addEventListener("resize", SG.debounce(function () { fit(); draw(); }, 140));
})(window, document);
