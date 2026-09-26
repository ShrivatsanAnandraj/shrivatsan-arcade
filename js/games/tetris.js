/* ==========================================================================
   Tetris — falling blocks, 7-bag randomiser, line clears, levels.
   ========================================================================== */
(function (win, doc) {
  "use strict";

  var $ = SG.$, $$ = SG.$$;
  var canvas = $("[data-canvas]");
  if (!canvas) return;

  var GAME = "tetris";
  var hud = SG.hud({ score: 1, lines: 1, level: 1, best: 1 });

  var COLS = 10;
  var ROWS = 20;
  var CELL = 24;
  var W = COLS * CELL;
  var H = ROWS * CELL;

  var SHAPES = {
    I: { color: "#00cdf0", cells: [[0, 1], [1, 1], [2, 1], [3, 1]] },
    J: { color: "#4d7cff", cells: [[0, 0], [0, 1], [1, 1], [2, 1]] },
    L: { color: "#ff8a3d", cells: [[2, 0], [0, 1], [1, 1], [2, 1]] },
    O: { color: "#ffc94d", cells: [[1, 0], [2, 0], [1, 1], [2, 1]] },
    S: { color: "#8bff6a", cells: [[1, 0], [2, 0], [0, 1], [1, 1]] },
    T: { color: "#c07cff", cells: [[1, 0], [0, 1], [1, 1], [2, 1]] },
    Z: { color: "#ff4d6d", cells: [[0, 0], [1, 0], [1, 1], [2, 1]] }
  };
  var KEYS = Object.keys(SHAPES);

  /* rotation states per piece, clockwise, in a 3x3 box */
  var ROTATIONS = {
    I: [[[0, 1], [1, 1], [2, 1], [3, 1]], [[2, 0], [2, 1], [2, 2], [2, 3]],
        [[0, 2], [1, 2], [2, 2], [3, 2]], [[1, 0], [1, 1], [1, 2], [1, 3]]],
    J: [[[0, 0], [0, 1], [1, 1], [2, 1]], [[1, 0], [2, 0], [1, 1], [1, 2]],
        [[0, 1], [1, 1], [2, 1], [2, 2]], [[1, 0], [1, 1], [0, 2], [1, 2]]],
    L: [[[2, 0], [0, 1], [1, 1], [2, 1]], [[1, 0], [1, 1], [1, 2], [2, 2]],
        [[0, 1], [1, 1], [2, 1], [0, 2]], [[0, 0], [1, 0], [1, 1], [1, 2]]],
    O: [[[1, 0], [2, 0], [1, 1], [2, 1]]],
    S: [[[1, 0], [2, 0], [0, 1], [1, 1]], [[1, 0], [1, 1], [2, 1], [2, 2]],
        [[1, 1], [2, 1], [0, 2], [1, 2]], [[0, 0], [0, 1], [1, 1], [1, 2]]],
    T: [[[1, 0], [0, 1], [1, 1], [2, 1]], [[1, 0], [1, 1], [2, 1], [1, 2]],
        [[0, 1], [1, 1], [2, 1], [1, 2]], [[1, 0], [0, 1], [1, 1], [1, 2]]],
    Z: [[[0, 0], [1, 0], [1, 1], [2, 1]], [[2, 0], [1, 1], [2, 1], [1, 2]],
        [[0, 1], [1, 1], [1, 2], [2, 2]], [[1, 0], [0, 1], [1, 1], [0, 2]]]
  };

  var config = {
    ghost: SG.store.get("tetris:ghost", true) !== false
  };

  var state = {
    running: false,
    paused: false,
    over: false,
    grid: [],
    piece: null,
    bag: [],
    hold: null,
    canHold: true,
    score: 0,
    lines: 0,
    level: 1,
    dropMs: 800,
    acc: 0,
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
    var cssW = Math.max(200, rect.width || 240);
    var cssH = Math.round(cssW * (H / W));
    canvas.style.height = cssH + "px";
    ctx = SG.dprCanvas(canvas, cssW, cssH);
    view = cssW / W;
    applyView();
  }

  /* ---------------------------------------------------------------- board */
  function blank() {
    var g = [];
    for (var y = 0; y < ROWS; y++) {
      var row = [];
      for (var x = 0; x < COLS; x++) row.push(null);
      g.push(row);
    }
    return g;
  }

  function nextBag() {
    var bag = SG.shuffle(KEYS);
    state.bag = state.bag.concat(bag);
  }

  function pull() {
    if (state.bag.length < 1) nextBag();
    return state.bag.shift();
  }

  function makePiece(key) {
    var rot = 0;
    return { key: key, rot: rot, x: 3, y: 0, cells: ROTATIONS[key][0] };
  }

  function collides(piece, dx, dy, cells) {
    var c = cells || piece.cells;
    for (var i = 0; i < c.length; i++) {
      var x = piece.x + c[i][0] + (dx || 0);
      var y = piece.y + c[i][1] + (dy || 0);
      if (x < 0 || x >= COLS || y >= ROWS) return true;
      if (y >= 0 && state.grid[y][x]) return true;
    }
    return false;
  }

  function spawn() {
    state.piece = makePiece(pull());
    state.canHold = true;
    syncHoldBtn();
    paintPreviews();
    if (collides(state.piece, 0, 0)) gameOver();
  }

  /* pulls the next piece without granting a fresh hold, used after holding */
  function spawnFromHold() {
    state.piece = makePiece(pull());
    syncHoldBtn();
    paintPreviews();
    if (collides(state.piece, 0, 0)) gameOver();
  }

  function lock() {
    var p = state.piece;
    for (var i = 0; i < p.cells.length; i++) {
      var x = p.x + p.cells[i][0];
      var y = p.y + p.cells[i][1];
      if (y >= 0 && y < ROWS && x >= 0 && x < COLS) {
        state.grid[y][x] = { key: p.key, color: SHAPES[p.key].color };
      }
    }

    var cleared = clearLines();
    if (cleared) {
      var pts = [0, 100, 300, 500, 800][cleared] * state.level;
      state.score += pts;
      state.lines += cleared;
      state.level = 1 + Math.floor(state.lines / 10);
      state.dropMs = Math.max(80, 800 - (state.level - 1) * 65);
      SG.sound.chord(cleared >= 4 ? "bigwin" : "pop", [0, 4, 7]);
      if (cleared >= 4) {
        SG.confetti.burst(90);
        SG.toast({ icon: "🧹", title: "TETRIS! " + cleared + " lines", sub: "+" + pts + " points" });
      }
    } else {
      SG.sound.play("bonk");
    }

    paintHud();
    spawn();
  }

  function clearLines() {
    var cleared = 0;
    for (var y = ROWS - 1; y >= 0; y--) {
      var full = true;
      for (var x = 0; x < COLS; x++) if (!state.grid[y][x]) { full = false; break; }
      if (!full) continue;
      state.grid.splice(y, 1);
      state.grid.unshift(new Array(COLS).fill(null));
      cleared++;
      y++;
    }
    return cleared;
  }

  function ghostY() {
    if (!state.piece) return 0;
    var d = 0;
    while (!collides(state.piece, 0, d + 1)) d++;
    return d;
  }

  /* ---------------------------------------------------------------- input */
  function move(dx) {
    if (!state.running || state.paused || state.over || !state.piece) return;
    if (collides(state.piece, dx, 0)) { SG.sound.play("bonk"); return; }
    state.piece.x += dx;
    SG.sound.play("tick");
  }

  function rotate(dir) {
    if (!state.running || state.paused || state.over || !state.piece) return;
    var p = state.piece;
    if (p.key === "O") return;
    var next = (p.rot + (dir > 0 ? 1 : 3)) % 4;

    /* simple wall kicks, tried left then right */
    var offsets = [0, -1, 1, -2, 2];
    for (var i = 0; i < offsets.length; i++) {
      if (!collides({ x: p.x, y: p.y, cells: ROTATIONS[p.key][next] }, offsets[i], 0)) {
        p.x += offsets[i];
        p.rot = next;
        p.cells = ROTATIONS[p.key][next];
        SG.sound.play("tick");
        return;
      }
    }
  }

  function softDrop() {
    if (!state.running || state.paused || state.over || !state.piece) return false;
    if (collides(state.piece, 0, 1)) return false;
    state.piece.y += 1;
    state.score += 1;
    return true;
  }

  function hardDrop() {
    if (!state.running || state.paused || state.over || !state.piece) return;
    var d = ghostY();
    state.piece.y += d;
    state.score += d * 2;
    SG.sound.play("bonk");
    lock();
  }

  function holdPiece() {
    if (!state.running || state.paused || state.over || !state.canHold) return;
    var cur = state.piece.key;
    state.canHold = false;
    if (state.hold) {
      var k = state.hold;
      state.hold = cur;
      state.piece = makePiece(k);
      if (collides(state.piece, 0, 0)) gameOver();
    } else {
      state.hold = cur;
      spawnFromHold();
    }
    SG.sound.play("click");
    syncHoldBtn();
    paintPreviews();
  }

  /* ----------------------------------------------------------------- loop */
  function frame(now) {
    state.raf = win.requestAnimationFrame(frame);
    if (!state.running) return;
    if (state.last === 0) state.last = now;
    var dt = Math.min(120, now - state.last);
    state.last = now;
    if (state.paused || state.over) { draw(); return; }

    state.acc += dt;
    while (state.acc >= state.dropMs) {
      state.acc -= state.dropMs;
      if (state.piece && !collides(state.piece, 0, 1)) state.piece.y += 1;
      else if (state.piece) lock();
      if (state.over) break;
    }
    draw();
  }

  /* ---------------------------------------------------------------- paint */
  function paintHud() {
    hud.set("score", state.score, true);
    hud.set("lines", state.lines);
    hud.set("level", state.level);
    var best = SG.scores.get(GAME);
    hud.set("best", best ? best.label : "-");
    syncHoldBtn();
  }

  /* the hold slot may only be used once per piece, so mirror that in the UI */
  function syncHoldBtn() {
    if (!holdBtn) return;
    var usable = state.running && !state.paused && !state.over && state.canHold;
    holdBtn.disabled = !usable;
    holdBtn.setAttribute("aria-disabled", String(!usable));
    holdBtn.textContent = state.hold ? "Swap piece" : "Hold piece";
  }

  function draw() {
    if (!ctx) return;
    ctx.clearRect(0, 0, W, H);

    var bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, "#0a0f1c");
    bg.addColorStop(1, "#06090f");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    /* grid */
    ctx.strokeStyle = "rgba(255,255,255,0.045)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (var x = 1; x < COLS; x++) { ctx.moveTo(x * CELL, 0); ctx.lineTo(x * CELL, H); }
    for (var y = 1; y < ROWS; y++) { ctx.moveTo(0, y * CELL); ctx.lineTo(W, y * CELL); }
    ctx.stroke();

    function block(gx, gy, color, alpha, size) {
      if (gy < 0) return;
      var pad = 2;
      var s = (size || CELL) - pad * 2;
      ctx.globalAlpha = alpha === undefined ? 1 : alpha;
      ctx.fillStyle = color;
      roundRect(ctx, gx * CELL + pad, gy * CELL + pad, s, s, 4);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.22)";
      roundRect(ctx, gx * CELL + pad + 2, gy * CELL + pad + 2, s - 4, s * 0.3, 3);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    /* settled blocks */
    for (var r = 0; r < ROWS; r++) {
      for (var c = 0; c < COLS; c++) {
        var cell = state.grid[r][c];
        if (cell) block(c, r, cell.color);
      }
    }

    if (state.piece) {
      /* ghost */
      if (config.ghost) {
        var gy2 = ghostY();
        if (gy2 > 0) {
          for (var i = 0; i < state.piece.cells.length; i++) {
            var gc = state.piece.cells[i];
            block(state.piece.x + gc[0], state.piece.y + gc[1] + gy2, "#ffffff", 0.13);
          }
        }
      }
      /* active piece */
      var col = SHAPES[state.piece.key].color;
      for (var j = 0; j < state.piece.cells.length; j++) {
        var cc = state.piece.cells[j];
        block(state.piece.x + cc[0], state.piece.y + cc[1], col);
      }
    }

    if (state.paused || state.over) {
      ctx.fillStyle = "rgba(4,7,14,0.55)";
      ctx.fillRect(0, 0, W, H);
    }
  }

  /* next / hold previews: the CSS expects a row of <i> swatches */
  function paintMini(el, key) {
    if (!el) return;
    if (!key) { el.innerHTML = ""; el.setAttribute("data-empty", ""); return; }
    var cells = SHAPES[key].cells;
    var minX = Math.min.apply(null, cells.map(function (c) { return c[0]; }));
    var maxX = Math.max.apply(null, cells.map(function (c) { return c[0]; }));
    var out = "";
    for (var x = minX; x <= maxX; x++) {
      for (var y = 0; y < 4; y++) {
        var on = cells.some(function (c) { return c[0] === x && c[1] === y; });
        out += '<i style="background:' + (on ? SHAPES[key].color : "var(--line-strong)") +
          ";opacity:" + (on ? 1 : 0.4) + '"></i>';
      }
    }
    el.innerHTML = out;
    el.removeAttribute("data-empty");
  }

  function paintPreviews() {
    paintMini($("[data-next]"), state.bag && state.bag.length ? state.bag[0] : "");
    paintMini($("[data-holdmini]"), state.hold || "");
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

  function gameOver() {
    state.over = true;
    var res = SG.scores.submit(GAME, state.score, String(state.score));
    SG.sound.play("lose");
    showOverlay("Game over", "Final score " + state.score + " with " + state.lines + " lines cleared.", "Play again");
    SG.toast({
      icon: res.isBest ? "🏅" : "🧱",
      title: res.isBest ? "New best: " + state.score : "Score " + state.score,
      sub: state.lines + " lines · level " + state.level
    });
    if (res.isBest) paintHud();
  }

  function reset() {
    state.grid = blank();
    state.bag = [];
    state.hold = null;
    state.score = 0;
    state.lines = 0;
    state.level = 1;
    state.dropMs = 800;
    state.over = false;
    state.paused = false;
    state.acc = 0;
    nextBag();
    spawn();
    paintHud();
    draw();
  }

  function play() {
    if (state.over) reset();
    state.running = true;
    state.paused = false;
    state.last = 0;
    hideOverlay();
    syncHoldBtn();
    SG.stats.play(GAME);
  }

  function togglePause() {
    if (!state.running || state.over) return;
    state.paused = !state.paused;
    syncHoldBtn();
    if (state.paused) showOverlay("Paused", "The stack is held exactly where you left it.", "Resume");
    else { hideOverlay(); SG.sound.play("tap"); }
  }

  /* the toolbar button is a real "new game": always start from a clean stack */
  function newGame() {
    reset();
    play();
  }

  $$("[data-start]").forEach(function (b) { b.addEventListener("click", play); });
  $$("[data-new]").forEach(function (b) { b.addEventListener("click", newGame); });
  var pBtn = $("[data-pause]");
  if (pBtn) pBtn.addEventListener("click", togglePause);

  var ghostBox = $("[data-ghost]");
  if (ghostBox) {
    ghostBox.checked = config.ghost;
    ghostBox.addEventListener("change", function () {
      config.ghost = ghostBox.checked;
      SG.store.set("tetris:ghost", config.ghost);
      draw();
    });
  }

  /* ------------------------------------------------------------ keyboard */
  doc.addEventListener("keydown", function (e) {
    var t = e.target;
    if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
    var k = e.key.toLowerCase();

    if (k === "arrowleft" || k === "a") { move(-1); e.preventDefault(); }
    else if (k === "arrowright" || k === "d") { move(1); e.preventDefault(); }
    else if (k === "arrowdown" || k === "s") {
      if (softDrop()) state.score += 0;
      e.preventDefault();
      if (!state.running) play();
    }
    else if (k === "arrowup" || k === "w") { rotate(1); e.preventDefault(); if (!state.running) play(); }
    else if (k === "x") { rotate(1); e.preventDefault(); }
    else if (k === "z" || k === "control") { rotate(-1); e.preventDefault(); }
    else if (k === " ") { hardDrop(); e.preventDefault(); if (!state.running) play(); }
    else if (k === "c") { holdPiece(); e.preventDefault(); }
    else if (k === "p" || k === "escape") { togglePause(); e.preventDefault(); }
  });

  /* ------------------------------------------------------- touch controls */
  $$("[data-tmove]").forEach(function (b) {
    b.addEventListener("click", function () { move(parseInt(b.getAttribute("data-tmove"), 10)); });
  });
  var rotBtn = $("[data-trotate]");
  if (rotBtn) rotBtn.addEventListener("click", function () { rotate(1); });
  var dropBtn = $("[data-tdrop]");
  if (dropBtn) dropBtn.addEventListener("click", hardDrop);
  var holdBtn = $("[data-thold]");
  if (holdBtn) holdBtn.addEventListener("click", holdPiece);

  /* swipe on the board */
  var tsx = null, tsy = null;
  canvas.addEventListener("touchstart", function (e) {
    tsx = e.changedTouches[0].clientX;
    tsy = e.changedTouches[0].clientY;
  }, { passive: true });
  canvas.addEventListener("touchend", function (e) {
    if (tsx === null) return;
    var dx = e.changedTouches[0].clientX - tsx;
    var dy = e.changedTouches[0].clientY - tsy;
    if (Math.abs(dx) < 22 && Math.abs(dy) < 22) { rotate(1); }
    else if (Math.abs(dx) > Math.abs(dy)) move(dx > 0 ? 1 : -1);
    else if (dy < 0) hardDrop();
    tsx = null;
  }, { passive: true });

  /* ---------------------------------------------------------------- boot */
  fit();
  reset();
  showOverlay(
    "Tetris",
    "Stack the blocks and clear four lines at a time. " +
    "<kbd>&larr;</kbd> <kbd>&rarr;</kbd> move &middot; <kbd>&uarr;</kbd> rotate &middot; " +
    "<kbd>&darr;</kbd> soft drop &middot; <kbd>Space</kbd> hard drop &middot; <kbd>C</kbd> hold.",
    "Start game"
  );
  state.raf = win.requestAnimationFrame(frame);
  win.addEventListener("resize", SG.debounce(function () { fit(); draw(); }, 140));
})(window, document);
