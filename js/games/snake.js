/* ==========================================================================
   Snake — canvas grid game, arrow keys / WASD / swipe
   ========================================================================== */
(function (win, doc) {
  "use strict";

  var $ = SG.$, $$ = SG.$$;
  var canvas = $("[data-canvas]");
  if (!canvas) return;

  var GAME = "snake";
  var hud = SG.hud({ score: 1, len: 1, speed: 1, best: 1 });

  var COLS = 24;
  var ROWS = 18;
  var CELL = 24;                 // world units
  var W = COLS * CELL;
  var H = ROWS * CELL;

  var config = {
    speed: parseInt(SG.store.get("snake:speed", 13), 10) || 13,   // ticks per second
    wrap: !!SG.store.get("snake:wrap", false),
    grid: SG.store.get("snake:grid", true) !== false
  };

  var state = {
    running: false,
    paused: false,
    over: false,
    snake: [],
    dir: { x: 1, y: 0 },
    queue: [],
    food: { x: 12, y: 9 },
    score: 0,
    stepMs: 1000 / 13,
    acc: 0,
    last: 0,
    raf: null
  };

  var ctx = null;

  /* --------------------------------------------------------------- setup */
  function fit() {
    var rect = canvas.getBoundingClientRect();
    var cssW = Math.max(260, rect.width || 640);
    var cssH = Math.round(cssW * (H / W));
    canvas.style.height = cssH + "px";
    ctx = SG.dprCanvas(canvas, cssW, cssH);
  }

  function reset() {
    var cy = Math.floor(ROWS / 2);
    state.snake = [
      { x: 6, y: cy }, { x: 5, y: cy }, { x: 4, y: cy }
    ];
    state.dir = { x: 1, y: 0 };
    state.queue = [];
    state.score = 0;
    state.over = false;
    state.paused = false;
    placeFood();
    paintHud();
    draw();
  }

  function placeFood() {
    var free = [];
    for (var y = 0; y < ROWS; y++) {
      for (var x = 0; x < COLS; x++) {
        if (!hits(x, y)) free.push({ x: x, y: y });
      }
    }
    state.food = free.length ? SG.pick(free) : { x: 0, y: 0 };
  }

  function hits(x, y) {
    for (var i = 0; i < state.snake.length; i++) {
      if (state.snake[i].x === x && state.snake[i].y === y) return true;
    }
    return false;
  }

  function paintHud() {
    hud.set("score", state.score, true);
    hud.set("len", state.snake.length);
    hud.set("speed", config.speed);
    var best = SG.scores.get(GAME);
    hud.set("best", best ? best.label : "—");
  }

  /* --------------------------------------------------------------- input */
  function steer(x, y) {
    var last = state.queue.length ? state.queue[state.queue.length - 1] : state.dir;
    if (x === -last.x && y === -last.y) return;   // no instant 180
    if (x === last.x && y === last.y) return;     // no duplicates
    if (state.queue.length < 3) state.queue.push({ x: x, y: y });
  }

  /* ---------------------------------------------------------------- loop */
  function frame(now) {
    state.raf = win.requestAnimationFrame(frame);
    if (!state.running) return;

    if (state.last === 0) state.last = now;
    var dt = Math.min(200, now - state.last);
    state.last = now;

    if (state.paused || state.over) { draw(); return; }

    state.acc += dt;
    while (state.acc >= state.stepMs) {
      state.acc -= state.stepMs;
      tick();
      if (state.over) break;
    }
    draw();
  }

  function tick() {
    if (state.queue.length) state.dir = state.queue.shift();

    var head = {
      x: state.snake[0].x + state.dir.x,
      y: state.snake[0].y + state.dir.y
    };

    /* walls */
    if (config.wrap) {
      head.x = (head.x + COLS) % COLS;
      head.y = (head.y + ROWS) % ROWS;
    } else if (head.x < 0 || head.y < 0 || head.x >= COLS || head.y >= ROWS) {
      return die("You hit the wall");
    }

    /* tail moves away, so hitting the last segment is legal */
    var body = state.snake.slice(0, state.snake.length - 1);
    for (var i = 0; i < body.length; i++) {
      if (body[i].x === head.x && body[i].y === head.y) return die("You bit yourself");
    }

    state.snake.unshift(head);

    if (head.x === state.food.x && head.y === state.food.y) {
      state.score += 10;
      SG.sound.play("eat");
      placeFood();
      paintHud();
    } else {
      state.snake.pop();
    }
  }

  function die(reason) {
    state.over = true;
    SG.sound.play("lose");
    var res = SG.scores.submit(GAME, state.score, String(state.score));
    var len = state.snake.length;
    showOverlay(
      "Game over",
      reason + ". Final score " + state.score + " at length " + len + ".",
      "Play again"
    );
    if (state.score > 0) {
      SG.toast({
        icon: res.isBest ? "🏅" : "🐍",
        title: res.isBest ? "New best: " + state.score : "Score " + state.score,
        sub: "Snake reached length " + len + "."
      });
    }
    if (res.isBest) paintHud();
  }

  /* --------------------------------------------------------------- paint */
  function draw() {
    if (!ctx) return;
    var s = W / (canvas.getBoundingClientRect().width || W);

    ctx.clearRect(0, 0, W, H);

    var bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, "#0a1018");
    bg.addColorStop(1, "#070b12");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    /* grid */
    if (config.grid) {
      ctx.strokeStyle = "rgba(255,255,255,0.05)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (var x = 1; x < COLS; x++) {
        ctx.moveTo(x * CELL * s, 0);
        ctx.lineTo(x * CELL * s, H * s);
      }
      for (var y = 1; y < ROWS; y++) {
        ctx.moveTo(0, y * CELL * s);
        ctx.lineTo(W * s, y * CELL * s);
      }
      ctx.stroke();
    }

    /* food */
    var fx = state.food.x * CELL * s + (CELL * s) / 2;
    var fy = state.food.y * CELL * s + (CELL * s) / 2;
    var pulse = 1 + Math.sin(Date.now() / 260) * 0.11;
    ctx.save();
    ctx.translate(fx, fy);
    ctx.scale(pulse, pulse);
    ctx.beginPath();
    ctx.fillStyle = "#ff4d6d";
    ctx.shadowColor = "rgba(255,77,109,0.85)";
    ctx.shadowBlur = 20;
    ctx.arc(0, 0, CELL * s * 0.31, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.shadowBlur = 0;

    /* snake */
    for (var i = state.snake.length - 1; i >= 0; i--) {
      var seg = state.snake[i];
      var t = 1 - i / Math.max(1, state.snake.length);
      var pad = (i === 0 ? 1 : 2.5) * s;
      var size = CELL * s - pad * 2;
      var r = i === 0 ? 8 * s : 6 * s;

      ctx.beginPath();
      roundRect(ctx, seg.x * CELL * s + pad, seg.y * CELL * s + pad, size, size, r);
      var g = ctx.createLinearGradient(
        seg.x * CELL * s, seg.y * CELL * s,
        seg.x * CELL * s + size, seg.y * CELL * s + size
      );
      if (i === 0) {
        g.addColorStop(0, "#c9ff9d");
        g.addColorStop(1, "#57d977");
      } else {
        g.addColorStop(0, "hsl(" + (96 + t * 26) + ", 62%, " + (44 + t * 20) + "%)");
        g.addColorStop(1, "hsl(" + (100 + t * 20) + ", 58%, " + (32 + t * 16) + "%)");
      }
      ctx.fillStyle = g;
      ctx.shadowColor = i === 0 ? "rgba(139,255,106,0.7)" : "rgba(87,217,119,0.28)";
      ctx.shadowBlur = i === 0 ? 18 : 8;
      ctx.fill();
      ctx.shadowBlur = 0;

      /* eyes on the head */
      if (i === 0) {
        ctx.fillStyle = "#0b1a0d";
        var ex = CELL * s * 0.3;
        var ey = CELL * s * 0.28;
        var cx = seg.x * CELL * s + CELL * s / 2;
        var cy = seg.y * CELL * s + CELL * s / 2;
        ctx.beginPath();
        ctx.arc(cx + state.dir.y * ex + state.dir.x * ey, cy + state.dir.x * ex - state.dir.y * ey, 2.4 * s, 0, Math.PI * 2);
        ctx.arc(cx - state.dir.y * ex - state.dir.x * ey, cy - state.dir.x * ex + state.dir.y * ey, 2.4 * s, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    /* paused / over scrim */
    if (state.paused || state.over) {
      ctx.fillStyle = "rgba(4,7,14,0.55)";
      ctx.fillRect(0, 0, W * s, H * s);
    }
  }

  function roundRect(c, x, y, w, h, r) {
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
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
  function play() {
    if (state.running && !state.over && !state.paused) return;
    if (state.over) reset();
    state.running = true;
    state.paused = false;
    state.last = 0;
    state.acc = 0;
    hideOverlay();
    SG.stats.play(GAME);
    SG.sound.play("tap");
  }

  function restart() {
    reset();
    hideOverlay();
    state.running = true;
    state.paused = false;
    state.last = 0;
    state.acc = 0;
    SG.stats.play(GAME);
    SG.sound.play("click");
  }

  function togglePause() {
    if (!state.running || state.over) return;
    state.paused = !state.paused;
    $$("[data-start]").forEach(function (b) { b.textContent = state.paused ? "Resume" : "Pause"; });
    if (state.paused) showOverlay("Paused", "Take your time.", "Resume");
    else hideOverlay();
  }

  $$("[data-start]").forEach(function (b) { b.addEventListener("click", play); });
  $("[data-restart]").addEventListener("click", restart);

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
      });
    });
  }

  bindSeg("data-speed", function (v) {
    config.speed = parseInt(v, 10);
    SG.store.set("snake:speed", config.speed);
    state.stepMs = 1000 / config.speed;
    paintHud();
    SG.sound.play("click");
  });

  var wrapBox = $("[data-wrap]");
  if (wrapBox) {
    wrapBox.checked = config.wrap;
    wrapBox.addEventListener("change", function () {
      config.wrap = wrapBox.checked;
      SG.store.set("snake:wrap", config.wrap);
      SG.sound.play("click");
    });
  }

  var gridBox = $("[data-grid]");
  if (gridBox) {
    gridBox.checked = config.grid;
    gridBox.addEventListener("change", function () {
      config.grid = gridBox.checked;
      SG.store.set("snake:grid", config.grid);
    });
  }

  /* ------------------------------------------------------------ keyboard */
  doc.addEventListener("keydown", function (e) {
    var t = e.target;
    if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
    var k = e.key.toLowerCase();

    if (k === "arrowup" || k === "w") { steer(0, -1); e.preventDefault(); if (!state.running) play(); }
    else if (k === "arrowdown" || k === "s") { steer(0, 1); e.preventDefault(); if (!state.running) play(); }
    else if (k === "arrowleft" || k === "a") { steer(-1, 0); e.preventDefault(); if (!state.running) play(); }
    else if (k === "arrowright" || k === "d") { steer(1, 0); e.preventDefault(); if (!state.running) play(); }
    else if (k === " ") {
      e.preventDefault();
      if (!state.running || state.over) play();
      else togglePause();
    }
  });

  /* --------------------------------------------------------------- touch */
  var touchStart = null;
  canvas.addEventListener("touchstart", function (e) {
    var t = e.changedTouches[0];
    touchStart = { x: t.clientX, y: t.clientY };
    if (!state.running) play();
  }, { passive: true });

  canvas.addEventListener("touchmove", function (e) {
    if (!touchStart) return;
    var t = e.changedTouches[0];
    var dx = t.clientX - touchStart.x;
    var dy = t.clientY - touchStart.y;
    if (Math.abs(dx) < 24 && Math.abs(dy) < 24) return;
    if (Math.abs(dx) > Math.abs(dy)) steer(dx > 0 ? 1 : -1, 0);
    else steer(0, dy > 0 ? 1 : -1);
    touchStart = null;
    e.preventDefault();
  }, { passive: false });

  /* --------------------------------------------------------------- boot */
  state.stepMs = 1000 / config.speed;
  syncPressed("data-speed", String(config.speed));
  fit();
  reset();
  state.raf = win.requestAnimationFrame(frame);
  win.addEventListener("resize", SG.debounce(function () { fit(); draw(); }, 140));
})(window, document);
