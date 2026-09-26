/* ==========================================================================
   Minesweeper — grid reveal, chording, flagging, first-click safety.
   ========================================================================== */
(function (win, doc) {
  "use strict";

  var $ = SG.$, $$ = SG.$$;
  var gridEl = $("[data-grid]");
  if (!gridEl) return;

  var GAME = "mines";

  var LEVELS = {
    beginner: { cols: 9, rows: 9, mines: 10, label: "Beginner" },
    easy:     { cols: 12, rows: 9, mines: 18, label: "Easy" },
    hard:     { cols: 16, rows: 16, mines: 40, label: "Hard" }
  };

  var state = {
    cfg: LEVELS[SG.store.get("mines:level", "beginner")] || LEVELS.beginner,
    grid: [],
    started: false,
    over: false,
    won: false,
    flags: 0,
    revealed: 0,
    elapsed: 0,
    timer: null,
    bests: SG.store.get("mines:bests", {})
  };

  var hud = SG.hud({ mines: 1, flags: 1, time: 1, best: 1 });

  var INDEX = 0;

  /* ---------------------------------------------------------------- board */
  function neighbours(r, c) {
    var out = [];
    for (var dr = -1; dr <= 1; dr++) {
      for (var dc = -1; dc <= 1; dc++) {
        if (!dr && !dc) continue;
        var nr = r + dr, nc = c + dc;
        if (nr < 0 || nc < 0 || nr >= state.cfg.rows || nc >= state.cfg.cols) continue;
        out.push([nr, nc]);
      }
    }
    return out;
  }

  function placeMines(safeR, safeC) {
    var taken = {};
    /* the opening click and its neighbours are always mine-free */
    taken[safeR + ":" + safeC] = true;
    neighbours(safeR, safeC).forEach(function (n) { taken[n[0] + ":" + n[1]] = true; });

    var placed = 0;
    while (placed < state.cfg.mines) {
      var r = SG.randInt(0, state.cfg.rows - 1);
      var c = SG.randInt(0, state.cfg.cols - 1);
      var key = r + ":" + c;
      if (taken[key]) continue;
      taken[key] = true;
      state.grid[r][c].mine = true;
      placed++;
    }

    for (var rr = 0; rr < state.cfg.rows; rr++) {
      for (var cc = 0; cc < state.cfg.cols; cc++) {
        if (state.grid[rr][cc].mine) { state.grid[rr][cc].n = -1; continue; }
        var n = 0;
        neighbours(rr, cc).forEach(function (p) { if (state.grid[p[0]][p[1]].mine) n++; });
        state.grid[rr][cc].n = n;
      }
    }
  }

  function reset() {
    var cfg = state.cfg;
    state.grid = [];
    for (var r = 0; r < cfg.rows; r++) {
      var row = [];
      for (var c = 0; c < cfg.cols; c++) {
        row.push({ mine: false, n: 0, open: false, flag: false, el: null });
      }
      state.grid.push(row);
    }
    state.started = false;
    state.over = false;
    state.won = false;
    state.flags = 0;
    state.revealed = 0;
    state.elapsed = 0;
    stopTimer();
    buildDom();
    paintHud();
  }

  /* ------------------------------------------------------------------ dom */
  function buildDom() {
    gridEl.style.setProperty("--cols", state.cfg.cols);
    gridEl.style.setProperty("--rows", state.cfg.rows);
    gridEl.innerHTML = "";

    for (var r = 0; r < state.cfg.rows; r++) {
      for (var c = 0; c < state.cfg.cols; c++) {
        var b = doc.createElement("button");
        b.type = "button";
        b.className = "cell";
        b.setAttribute("data-r", r);
        b.setAttribute("data-c", c);
        b.setAttribute("aria-label", "Row " + (r + 1) + " column " + (c + 1));
        b.textContent = "";
        state.grid[r][c].el = b;
        gridEl.appendChild(b);
      }
    }
  }

  function cellEl(r, c) { return state.grid[r][c].el; }

  function paintCell(r, c) {
    var cell = state.grid[r][c];
    var el = cell.el;
    if (!el) return;
    el.className = "cell";
    el.textContent = "";
    el.removeAttribute("data-n");
    el.disabled = false;

    if (cell.flag) {
      el.classList.add("is-flag");
      el.textContent = "🚩";
      el.setAttribute("aria-label", "Flagged");
    } else if (cell.open) {
      el.classList.add("is-open");
      el.disabled = true;
      if (cell.mine) {
        el.classList.add("is-mine");
        el.textContent = "💣";
        el.setAttribute("aria-label", "Mine");
      } else if (cell.n > 0) {
        el.classList.add("is-n" + cell.n);
        el.textContent = String(cell.n);
        el.setAttribute("aria-label", String(cell.n) + " adjacent mines");
      } else {
        el.setAttribute("aria-label", "Empty");
      }
    }
  }

  function paintAll() {
    for (var r = 0; r < state.cfg.rows; r++) {
      for (var c = 0; c < state.cfg.cols; c++) paintCell(r, c);
    }
  }

  function paintHud() {
    hud.set("mines", state.cfg.mines);
    hud.set("flags", state.flags);
    hud.set("time", state.elapsed);
    var key = levelKey();
    var b = state.bests[key];
    hud.set("best", b ? b + "s" : "—");
  }

  function levelKey() { return state.cfg.cols + "x" + state.cfg.rows + ":" + state.cfg.mines; }

  /* ------------------------------------------------------------- gameplay */
  function startTimer() {
    if (state.timer) return;
    state.timer = win.setInterval(function () {
      if (state.over) return;
      state.elapsed += 1;
      paintHud();
    }, 1000);
  }

  function stopTimer() {
    if (state.timer) { win.clearInterval(state.timer); state.timer = null; }
  }

  function open(r, c) {
    if (state.over) return;
    var cell = state.grid[r][c];
    if (cell.open || cell.flag) return;

    if (!state.started) {
      state.started = true;
      placeMines(r, c);
      startTimer();
      SG.stats.play(GAME);
    }

    if (cell.mine) { boom(r, c); return; }

    /* flood fill zeroes */
    var stack = [[r, c]];
    while (stack.length) {
      var cur = stack.pop();
      var cr = cur[0], cc = cur[1];
      var k = state.grid[cr][cc];
      if (k.open || k.flag) continue;
      k.open = true;
      state.revealed++;
      if (k.n === 0) neighbours(cr, cc).forEach(function (n) { stack.push(n); });
    }
    SG.sound.play("flip");
    paintAll();
    checkWin();
  }

  function chord(r, c) {
    if (state.over) return;
    var cell = state.grid[r][c];
    if (!cell.open || !cell.n) return;
    var nb = neighbours(r, c);
    var flags = nb.filter(function (n) { return state.grid[n[0]][n[1]].flag; }).length;
    if (flags !== cell.n) return;
    var boomAt = nb.filter(function (n) { return state.grid[n[0]][n[1]].mine && !state.grid[n[0]][n[1]].flag; });
    if (boomAt.length) { boom(boomAt[0][0], boomAt[0][1]); return; }
    nb.forEach(function (n) {
      if (!state.grid[n[0]][n[1]].open) open(n[0], n[1]);
    });
  }

  function toggleFlag(r, c) {
    if (state.over) return;
    var cell = state.grid[r][c];
    if (cell.open) return;
    cell.flag = !cell.flag;
    state.flags += cell.flag ? 1 : -1;
    SG.sound.play(cell.flag ? "click" : "tick");
    paintCell(r, c);
    paintHud();
  }

  /* r/c are the trigger cell; every mine is revealed regardless */
  function boom(r, c) {
    state.over = true;
    stopTimer();
    SG.sound.play("lose");

    for (var rr = 0; rr < state.cfg.rows; rr++) {
      for (var cc = 0; cc < state.cfg.cols; cc++) {
        var cell = state.grid[rr][cc];
        if (cell.mine) {
          cell.open = true;
          cell.el.className = "cell is-open is-mine";
          cell.el.textContent = "💣";
        } else if (cell.flag) {
          /* wrongly flagged cell */
          cell.el.className = "cell is-open is-wrong";
          cell.el.textContent = "✕";
        }
      }
    }
    paintHud();
    SG.toast({ icon: "💥", title: "Boom", sub: "You cleared " + state.revealed + " cells in " + state.elapsed + "s." });
  }

  function checkWin() {
    var safeTotal = state.cfg.cols * state.cfg.rows - state.cfg.mines;
    if (state.revealed < safeTotal) return;
    state.over = true;
    state.won = true;
    stopTimer();
    SG.stats.win(GAME);
    SG.sound.chord("bigwin", [0, 4, 7, 12]);
    SG.confetti.burst(150);

    /* auto-flag what is left */
    for (var r = 0; r < state.cfg.rows; r++) {
      for (var c = 0; c < state.cfg.cols; c++) {
        var cell = state.grid[r][c];
        if (cell.mine && !cell.flag) { cell.flag = true; state.flags += 1; paintCell(r, c); }
      }
    }

    var key = levelKey();
    var prev = state.bests[key];
    if (!prev || state.elapsed < prev) {
      state.bests[key] = state.elapsed;
      SG.store.set("mines:bests", state.bests);
    }
    paintHud();
    SG.toast({
      icon: "🏁",
      title: "Board cleared in " + state.elapsed + "s",
      sub: state.cfg.label + " · " + state.cfg.mines + " mines"
    });
  }

  /* -------------------------------------------------------------- events */
  gridEl.addEventListener("click", function (e) {
    var b = e.target.closest(".cell");
    if (!b) return;
    INDEX++;
    var r = parseInt(b.getAttribute("data-r"), 10);
    var c = parseInt(b.getAttribute("data-c"), 10);
    if (b.classList.contains("is-open")) chord(r, c);
    else open(r, c);
  });

  gridEl.addEventListener("contextmenu", function (e) {
    var b = e.target.closest(".cell");
    if (!b) return;
    e.preventDefault();
    toggleFlag(parseInt(b.getAttribute("data-r"), 10), parseInt(b.getAttribute("data-c"), 10));
  });

  gridEl.addEventListener("auxclick", function (e) {
    if (e.button !== 1) return;
    var b = e.target.closest(".cell");
    if (!b) return;
    e.preventDefault();
    toggleFlag(parseInt(b.getAttribute("data-r"), 10), parseInt(b.getAttribute("data-c"), 10));
  });

  doc.addEventListener("keydown", function (e) {
    var t = e.target;
    if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
    if (e.key === "f" || e.key === "F") {
      var b = doc.activeElement;
      if (b && b.classList && b.classList.contains("cell") && !b.disabled) {
        e.preventDefault();
        toggleFlag(parseInt(b.getAttribute("data-r"), 10), parseInt(b.getAttribute("data-c"), 10));
      }
    } else if (e.key === "n" || e.key === "N") {
      e.preventDefault();
      reset();
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

  bindSeg("data-level", function (v) {
    state.cfg = LEVELS[v] || LEVELS.beginner;
    SG.store.set("mines:level", v);
    reset();
  });

  $$("[data-new]").forEach(function (b) { b.addEventListener("click", reset); });

  /* ---------------------------------------------------------------- boot */
  $$("button[data-level]").forEach(function (o) {
    o.setAttribute("aria-pressed", String(o.getAttribute("data-level") === (state.cfg.label.toLowerCase())));
  });
  reset();
})(window, document);
