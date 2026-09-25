/* ==========================================================================
   Ping Pong — canvas paddle game vs an adaptive AI
   Controls: mouse, touch, arrow keys / W-S
   ========================================================================== */
(function (win, doc) {
  "use strict";

  var $ = SG.$, $$ = SG.$$;
  var canvas = $("[data-canvas]");
  if (!canvas) return;

  var GAME = "pong";
  var hud = SG.hud({ you: 1, cpu: 1, rally: 1, best: 1 });

  /* virtual coordinate space — everything is authored against this */
  var W = 800;
  var H = 480;

  var DIFF = [
    { name: "Rookie", speed: 4.6, reaction: 0.28, error: 46, lead: 0.05 },
    { name: "Pro",    speed: 6.4, reaction: 0.15, error: 26, lead: 0.35 },
    { name: "Ace",    speed: 8.2, reaction: 0.05, error: 9,  lead: 0.75 }
  ];

  var config = {
    diff: parseInt(SG.store.get("pong:diff", 1), 10) || 1,
    goal: parseInt(SG.store.get("pong:goal", 11), 10) || 11,
    trails: SG.store.get("pong:trails", true) !== false
  };

  var state = {
    running: false,
    paused: false,
    you: 0,
    cpu: 0,
    rally: 0,
    bestRally: 0,
    phase: "idle",          // idle | serve | live | point | over
    countdown: 0
  };

  var ctx = null;

  /* ------------------------------------------------------------ entities */
  var ball = { x: W / 2, y: H / 2, vx: 0, vy: 0, r: 9, speed: 6.4 };
  var paddle = {
    h: 78, w: 13,
    y: H / 2 - 39,
    targetY: H / 2 - 39,
    v: 0
  };
  var cpu = {
    h: 78, w: 13,
    y: H / 2 - 39,
    v: 0,
    aim: H / 2,
    commit: 0
  };
  var trail = [];

  /* ------------------------------------------------------------- canvas */
  /* the game is authored in an 800x480 virtual space; `view` maps that onto
     whatever CSS width the layout gave us, so the court is never cropped */
  var view = 1;

  function applyView() {
    if (!ctx) return;
    var dpr = window.devicePixelRatio || 1;
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
    draw();
  }

  function toWorld(clientY) {
    var rect = canvas.getBoundingClientRect();
    if (!rect.height) return H / 2;
    return ((clientY - rect.top) / rect.height) * H;
  }

  /* -------------------------------------------------------------- paint */
  function draw() {
    if (!ctx) return;

    ctx.clearRect(0, 0, W, H);

    /* table */
    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#0a1024");
    g.addColorStop(1, "#060a16");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    /* court glow */
    var cg = ctx.createRadialGradient(W / 2, H / 2, 20, W / 2, H / 2, W * 0.55);
    cg.addColorStop(0, "rgba(0,205,240,0.07)");
    cg.addColorStop(1, "transparent");
    ctx.fillStyle = cg;
    ctx.fillRect(0, 0, W, H);

    /* centre line */
    ctx.save();
    ctx.setLineDash([14, 18]);
    ctx.lineWidth = 3;
    ctx.strokeStyle = "rgba(255,255,255,0.14)";
    ctx.beginPath();
    ctx.moveTo(W / 2, 0);
    ctx.lineTo(W / 2, H);
    ctx.stroke();
    ctx.restore();

    /* borders */
    ctx.lineWidth = 4;
    ctx.strokeStyle = "rgba(0,205,240,0.45)";
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(W, 0); ctx.moveTo(W, 0); ctx.lineTo(W, H);
    ctx.moveTo(W, H); ctx.lineTo(0, H); ctx.moveTo(0, H); ctx.lineTo(0, 0);
    ctx.stroke();

    /* scoring zones */
    ctx.fillStyle = "rgba(255,93,93,0.05)";
    ctx.fillRect(0, 0, 10, H);
    ctx.fillStyle = "rgba(139,255,106,0.05)";
    ctx.fillRect(W - 10, 0, 10, H);

    /* ball trail */
    if (config.trails) {
      for (var t = 0; t < trail.length; t++) {
        var p = trail[t];
        var a = (t / trail.length) * 0.45;
        ctx.beginPath();
        ctx.fillStyle = "rgba(0,205,240," + a.toFixed(3) + ")";
        ctx.arc(p.x, p.y, ball.r * (t / trail.length), 0, Math.PI * 2);
        ctx.fill();
      }
    }

    /* paddles */
    roundRect(ctx, paddle.w + 2, paddle.y, paddle.w, paddle.h, 7);
    var pg = ctx.createLinearGradient(0, paddle.y, 0, paddle.y + paddle.h);
    pg.addColorStop(0, "#8bff6a");
    pg.addColorStop(1, "#2fbf6a");
    ctx.fillStyle = pg;
    ctx.fill();
    ctx.shadowColor = "rgba(139,255,106,0.55)";
    ctx.shadowBlur = 18;
    ctx.fill();
    ctx.shadowBlur = 0;

    roundRect(ctx, W - cpu.w - 2, cpu.y, cpu.w, cpu.h, 7);
    var eg = ctx.createLinearGradient(0, cpu.y, 0, cpu.y + cpu.h);
    eg.addColorStop(0, "#ff4d9d");
    eg.addColorStop(1, "#c0246b");
    ctx.fillStyle = eg;
    ctx.fill();
    ctx.shadowColor = "rgba(255,77,157,0.55)";
    ctx.shadowBlur = 18;
    ctx.fill();
    ctx.shadowBlur = 0;

    /* ball */
    ctx.beginPath();
    ctx.fillStyle = "#ffffff";
    ctx.shadowColor = "rgba(255,255,255,0.85)";
    ctx.shadowBlur = 22;
    ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    /* on-table scoreboard */
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "800 76px 'JetBrains Mono', monospace";
    ctx.globalAlpha = 0.16;
    ctx.fillStyle = "#ffffff";
    ctx.fillText(String(state.you), W * 0.27, H * 0.42);
    ctx.fillText(String(state.cpu), W * 0.73, H * 0.42);
    ctx.globalAlpha = 1;
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

  /* ------------------------------------------------------------ physics */
  function resetBall(direction) {
    var angle = SG.rand(-0.42, 0.42);
    var speed = ball.speed;
    ball.x = W / 2;
    ball.y = H / 2;
    ball.vx = Math.cos(angle) * speed * (direction || 1);
    ball.vy = Math.sin(angle) * speed;
    trail.length = 0;
  }

  function serve(direction) {
    state.phase = "serve";
    resetBall(direction);
    state.countdown = 50;
  }

  function step() {
    if (!state.running || state.paused) return;

    /* ---- serve countdown ---- */
    if (state.phase === "serve") {
      if (--state.countdown <= 0) state.phase = "live";
      draw();
      return;
    }
    if (state.phase !== "live") { draw(); return; }

    /* ---- player paddle: ease toward the pointer/keyboard target ---- */
    var prevY = paddle.y;
    var diff = paddle.targetY - paddle.y;
    paddle.y += SG.clamp(diff * 0.28, -18, 18);
    paddle.y = SG.clamp(paddle.y, 4, H - paddle.h - 4);
    paddle.v = paddle.y - prevY;

    /* ---- cpu paddle: aim with a deliberate reaction delay ---- */
    var d = DIFF[config.diff];
    cpu.commit -= 1;
    if (cpu.commit <= 0) {
      cpu.commit = Math.max(1, Math.round(d.reaction * 60));
      /* only chase when the ball is on the CPU's half, and lead it a little */
      if (ball.vx > 0) {
        var predicted = ball.y + ball.vy * d.lead;
        var t = (W - ball.x) / Math.max(1, ball.vx);
        predicted += ball.vy * Math.min(t, 1.2) * d.lead;
        cpu.aim = SG.clamp(predicted + SG.rand(-d.error, d.error), paddle.h / 2, H - paddle.h / 2);
      } else {
        cpu.aim = H / 2 + SG.rand(-d.error, d.error) * 0.4;
      }
    }
    var cprev = cpu.y;
    cpu.y += SG.clamp((cpu.aim - cpu.h / 2 - cpu.y) * 0.3, -d.speed, d.speed);
    cpu.y = SG.clamp(cpu.y, 4, H - cpu.h - 4);
    cpu.v = cpu.y - cprev;

    /* ---- ball ---- */
    ball.x += ball.vx;
    ball.y += ball.vy;

    /* gradual speed-up keeps rallies exciting but winnable */
    var maxSpeed = 15;
    var sp = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
    if (sp < maxSpeed) {
      ball.vx *= 1.0016;
      ball.vy *= 1.0016;
    }

    /* top / bottom walls */
    if (ball.y - ball.r <= 0) { ball.y = ball.r; ball.vy = Math.abs(ball.vy); SG.sound.play("bounce"); }
    if (ball.y + ball.r >= H) { ball.y = H - ball.r; ball.vy = -Math.abs(ball.vy); SG.sound.play("bounce"); }

    /* trail */
    if (config.trails) {
      trail.push({ x: ball.x, y: ball.y });
      if (trail.length > 14) trail.shift();
    }

    /* ---- player paddle (left) ---- */
    if (ball.vx < 0 && ball.x - ball.r <= paddle.w + 6 && ball.x > -20) {
      if (ball.y > paddle.y && ball.y < paddle.y + paddle.h) {
        bounce(-1);
      }
    }
    /* ---- cpu paddle (right) ---- */
    if (ball.vx > 0 && ball.x + ball.r >= W - cpu.w - 6) {
      if (ball.y > cpu.y && ball.y < cpu.y + cpu.h) {
        bounce(1);
      }
    }

    /* ---- scoring ---- */
    if (ball.x < -ball.r) point("cpu");
    else if (ball.x > W + ball.r) point("you");

    draw();
  }

  function bounce(side) {
    /* english off the paddle's movement, like the real thing */
    var paddleObj = side === -1 ? paddle : cpu;
    var rel = SG.clamp((ball.y - (paddleObj.y + paddleObj.h / 2)) / (paddleObj.h / 2), -1, 1);
    var spin = SG.clamp(paddleObj.v / 22, -0.55, 0.55);

    var speed = Math.min(15, Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy) * 1.045 + 0.35);
    var angle = rel * 0.95 + spin * 0.5;
    ball.vx = Math.cos(angle) * speed * side * -1;
    ball.vy = Math.sin(angle) * speed;

    /* guarantee a minimum horizontal component so rallies never stall */
    if (Math.abs(ball.vx) < speed * 0.42) {
      ball.vx = (ball.vx < 0 ? -1 : 1) * speed * 0.42;
    }

    ball.x = side === -1 ? paddleObj.w + 8 : W - cpu.w - 8;
    state.rally++;
    if (state.rally > state.bestRally) {
      state.bestRally = state.rally;
      hud.set("rally", state.rally, true);
    }
    SG.sound.play("bounce", Math.round(rel * 120));
  }

  function point(who) {
    if (who === "you") {
      state.you++;
      SG.stats.win(GAME);
    } else {
      state.cpu++;
    }
    hud.set("you", state.you, true);
    hud.set("cpu", state.cpu, true);
    state.rally = 0;
    hud.set("rally", 0);

    var res = SG.scores.submit(GAME, state.you, state.you + " pts");
    if (res.isBest) hud.set("best", res.best.label);

    SG.sound.play(who === "you" ? "win" : "lose");

    if (state.you >= config.goal || state.cpu >= config.goal) {
      endMatch(who);
    } else {
      /* the conceder serves, so the ball always starts toward them */
      state.phase = "point";
      var next = who === "you" ? 1 : -1;
      win.setTimeout(function () {
        if (state.running && !state.paused) serve(next);
      }, 620);
    }
  }

  function endMatch(winner) {
    state.phase = "over";
    var youWon = winner === "you";
    showOverlay(
      youWon ? "You win!" : "CPU wins",
      (youWon ? "Final score " + state.you + "–" + state.cpu + ". " : "You went down " +
        state.you + "–" + state.cpu + ". ") +
      "Longest rally this session: " + state.bestRally + ".",
      youWon ? "Rematch" : "Try again",
      "Start match"
    );
    $$("[data-start]").forEach(function (b) { b.textContent = youWon ? "Rematch" : "Try again"; });
    if (youWon) {
      SG.confetti.burst(160);
      SG.toast({
        icon: "🏓",
        title: "You beat the " + DIFF[config.diff].name + " paddle",
        sub: state.you + "–" + state.cpu + " · best rally " + state.bestRally
      });
    }
  }

  /* ------------------------------------------------------------ overlay */
  function showOverlay(title, text, btn, fallback) {
    var ov = $("[data-overlay]");
    if (!ov) return;
    $("[data-overlay-title]").textContent = title;
    $("[data-overlay-text]").innerHTML = text;
    var b = $("[data-start]", ov);
    if (b) b.textContent = btn || fallback || "Start match";
    ov.hidden = false;
  }

  function hideOverlay() {
    var ov = $("[data-overlay]");
    if (ov) ov.hidden = true;
  }

  /* -------------------------------------------------------------- loop */
  function loop() {
    step();
    win.requestAnimationFrame(loop);
  }

  /* ------------------------------------------------------------- match */
  function start() {
    state.running = true;
    state.paused = false;
    state.you = 0;
    state.cpu = 0;
    state.rally = 0;
    state.bestRally = 0;
    ball.speed = config.diff === 2 ? 7.2 : config.diff === 1 ? 6.4 : 5.8;
    paddle.y = paddle.targetY = H / 2 - paddle.h / 2;
    cpu.y = H / 2 - cpu.h / 2;
    SG.stats.play(GAME);
    hud.set("you", 0);
    hud.set("cpu", 0);
    hud.set("rally", 0);
    var best = SG.scores.get(GAME);
    hud.set("best", best ? best.label : "—");
    hideOverlay();
    serve(Math.random() > 0.5 ? 1 : -1);
    SG.sound.play("tap");
  }

  function togglePause() {
    if (!state.running || state.phase === "over") return;
    state.paused = !state.paused;
    $("[data-pause]").textContent = state.paused ? "Resume" : "Pause";
    if (state.paused) {
      showOverlay("Paused", "Take a breath. The ball is waiting.", "Resume", "Resume");
    } else {
      hideOverlay();
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
      });
    });
  }

  bindSeg("data-diff", function (v) {
    config.diff = parseInt(v, 10);
    SG.store.set("pong:diff", config.diff);
    SG.sound.play("click");
    if (state.running) {
      state.phase = "over";
      showOverlay("Difficulty: " + DIFF[config.diff].name,
        "Changing difficulty restarts the match. Current score resets.",
        "Start match");
    }
  });

  bindSeg("data-goal", function (v) {
    config.goal = parseInt(v, 10);
    SG.store.set("pong:goal", config.goal);
    SG.sound.play("click");
  });

  var trailsBox = $("[data-trails]");
  if (trailsBox) {
    trailsBox.checked = config.trails;
    trailsBox.addEventListener("change", function () {
      config.trails = trailsBox.checked;
      SG.store.set("pong:trails", config.trails);
      if (!config.trails) trail.length = 0;
    });
  }

  /* pointer steering */
  canvas.addEventListener("pointermove", function (e) {
    paddle.targetY = toWorld(e.clientY) - paddle.h / 2;
  });
  canvas.addEventListener("pointerdown", function (e) {
    paddle.targetY = toWorld(e.clientY) - paddle.h / 2;
    if (!state.running) start();
    canvas.setPointerCapture && canvas.setPointerCapture(e.pointerId);
  });

  /* keyboard steering */
  var keys = {};
  doc.addEventListener("keydown", function (e) {
    var t = e.target;
    if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
    var k = e.key.toLowerCase();
    if (k === "arrowup" || k === "w") { keys.up = true; e.preventDefault(); }
    if (k === "arrowdown" || k === "s") { keys.down = true; e.preventDefault(); }
    if (k === " " || k === "enter") {
      if (t && t.tagName === "BUTTON") return;
      e.preventDefault();
      if (!state.running || state.phase === "over") start();
      else togglePause();
    }
    if (k === "p") togglePause();
  });
  doc.addEventListener("keyup", function (e) {
    var k = e.key.toLowerCase();
    if (k === "arrowup" || k === "w") keys.up = false;
    if (k === "arrowdown" || k === "s") keys.down = false;
  });

  /* fold the key state into the paddle target on a fixed tick */
  win.setInterval(function () {
    if (keys.up) paddle.targetY -= 17;
    if (keys.down) paddle.targetY += 17;
    paddle.targetY = SG.clamp(paddle.targetY, 4, H - paddle.h - 4);
  }, 16);

  $$("[data-start]").forEach(function (b) { b.addEventListener("click", start); });
  $("[data-pause]").addEventListener("click", togglePause);
  $("[data-reset]").addEventListener("click", function () {
    state.you = 0;
    state.cpu = 0;
    state.rally = 0;
    state.bestRally = 0;
    state.phase = "over";
    hud.set("you", 0);
    hud.set("cpu", 0);
    hud.set("rally", 0);
    showOverlay("Scores reset", "Ready for a fresh match?", "Start match");
    $$("[data-start]").forEach(function (b) { b.textContent = "Start match"; });
  });

  /* -------------------------------------------------------------- boot */
  syncPressed("data-diff", String(config.diff));
  syncPressed("data-goal", String(config.goal));

  win.addEventListener("resize", SG.debounce(fit, 140));
  if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(fit);
  fit();
  loop();
})(window, document);
