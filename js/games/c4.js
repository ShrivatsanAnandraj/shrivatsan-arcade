/* ==========================================================================
   Connect Four — drop discs, 4-in-a-row wins. Heuristic AI or hot seat.
   ========================================================================== */
(function (win, doc) {
  "use strict";

  var $ = SG.$, $$ = SG.$$;
  var boardEl = $("[data-board]");
  if (!boardEl) return;

  var GAME = "c4";
  var COLS = 7;
  var ROWS = 6;

  var state = {
    mode: SG.store.get("c4:mode", "ai") === "ai" ? "ai" : "friend",
    cells: [],
    turn: 1,
    over: false,
    winner: 0,
    winLine: [],
    thinking: false,
    tally: SG.store.get("c4:tally", { you: 0, cpu: 0, draw: 0 }) || { you: 0, cpu: 0, draw: 0 }
  };

  var hud = SG.hud({ you: 1, cpu: 1, draw: 1, mode: 1 });

  var LINES = (function () {
    var out = [];
    var r, c, k;
    /* columns */
    for (c = 0; c < COLS; c++) {
      var col = [];
      for (r = 0; r < ROWS; r++) col.push([r, c]);
      out.push(col);
    }
    /* rows */
    for (r = 0; r < ROWS; r++) {
      var row = [];
      for (c = 0; c < COLS; c++) row.push([r, c]);
      out.push(row);
    }
    /* diagonals */
    for (r = 0; r < ROWS - 3; r++) {
      for (c = 0; c < COLS - 3; c++) {
        var d1 = [], d2 = [];
        for (k = 0; k < 4; k++) {
          d1.push([r + k, c + k]);
          d2.push([r + k, c + 3 - k]);
        }
        out.push(d1);
        out.push(d2);
      }
    }
    return out;
  })();

  /* ----------------------------------------------------------------- dom */
  function build() {
    boardEl.innerHTML = "";
    state.cells = [];
    for (var r = 0; r < ROWS; r++) {
      var row = [];
      for (var c = 0; c < COLS; c++) {
        var b = doc.createElement("button");
        b.type = "button";
        b.className = "c4-cell";
        b.setAttribute("data-c", c);
        b.setAttribute("aria-label", "Column " + (c + 1));
        row.push(b);
        boardEl.appendChild(b);
      }
      state.cells.push(row);
    }
  }

  function render() {
    for (var r = 0; r < ROWS; r++) {
      for (var c = 0; c < COLS; c++) {
        var el = state.cells[r][c];
        var v = state.cells[r][c].dataset.value;
        el.textContent = v === "1" ? "●" : v === "2" ? "●" : "";
        el.className = "c4-cell" + (v === "1" ? " is-p1" : v === "2" ? " is-p2" : "");
        if (state.winLine.some(function (p) { return p[0] === r && p[1] === c; })) {
          el.classList.add("is-win");
        }
        el.disabled = state.over || state.thinking || dropRow(c) === -1;
      }
    }
  }

  function setStatus(text) { $("[data-status]").textContent = text; }

  /* ------------------------------------------------------------- gameplay */
  function dropRow(c) {
    for (var r = ROWS - 1; r >= 0; r--) if (!state.cells[r][c].dataset.value) return r;
    return -1;
  }

  function place(c, player) {
    var r = dropRow(c);
    if (r === -1 || state.over) return false;
    state.cells[r][c].dataset.value = String(player);
    SG.sound.play(player === 1 ? "tap" : "click");
    return true;
  }

  function winnerOf() {
    for (var i = 0; i < LINES.length; i++) {
      var line = LINES[i];
      var v = state.cells[line[0][0]][line[0][1]].dataset.value;
      if (!v) continue;
      var same = true;
      for (var k = 1; k < 4; k++) {
        var p = line[k];
        if (state.cells[p[0]][p[1]].dataset.value !== v) { same = false; break; }
      }
      if (same) return { player: parseInt(v, 10), line: line };
    }
    return null;
  }

  function isFull() {
    for (var c = 0; c < COLS; c++) if (dropRow(c) !== -1) return false;
    return true;
  }

  function checkEnd() {
    var w = winnerOf();
    if (w) {
      state.over = true;
      state.winner = w.player;
      state.winLine = w.line;
      end(w.player);
      return true;
    }
    if (isFull()) {
      state.over = true;
      state.winner = 0;
      end(0);
      return true;
    }
    return false;
  }

  /* seat labels follow the active mode so hot seat never says "CPU" */
  function seat(who) {
    if (state.mode === "ai") return who === 1 ? "You" : "CPU";
    return who === 1 ? "Player 1" : "Player 2";
  }

  function end(winner) {
    SG.sound.chord(winner ? "bigwin" : "win", [0, 4, 7]);
    if (winner) SG.confetti.burst(130);
    if (winner === 1) state.tally.you += 1;
    else if (winner === 2) state.tally.cpu += 1;
    else state.tally.draw += 1;
    SG.store.set("c4:tally", state.tally);

    var label = winner ? seat(winner) + " win" + (winner === 1 && state.mode === "ai" ? "" : "s") : "Draw";
    var verb = winner === 1 ? "Well played" : winner === 2 ? "Better luck next time" : "Nobody broke through";
    setStatus(label + " — " + verb + ".");
    render();
    paintHud();

    SG.toast({
      icon: winner === 1 ? "🏆" : winner === 2 ? "🤖" : "🤝",
      title: label,
      sub: seat(1) + " " + state.tally.you + " – " + state.tally.cpu + " " + seat(2) + " · " + state.tally.draw + " drawn"
    });
  }

  function reset() {
    state.turn = 1;
    state.over = false;
    state.winner = 0;
    state.winLine = [];
    state.thinking = false;
    build();
    render();
    setStatus("Your move — pick a column.");
    paintHud();
  }

  function paintHud() {
    hud.set("you", state.tally.you);
    hud.set("cpu", state.tally.cpu);
    hud.set("draw", state.tally.draw);
    hud.set("mode", state.mode === "ai" ? "vs CPU" : "2 players");
  }

  function humanMove(c) {
    if (state.over || state.thinking) return;
    if (state.mode === "ai" && state.turn !== 1) return;
    if (dropRow(c) === -1) { SG.sound.play("wrong"); return; }

    place(c, state.turn);
    render();
    if (checkEnd()) return;

    state.turn = state.turn === 1 ? 2 : 1;
    if (state.mode === "ai") {
      setStatus("CPU is thinking…");
      aiMove();
    } else {
      setStatus(state.turn === 1 ? "Your move — pick a column." : "Player 2 — pick a column.");
    }
  }

  /* ------------------------------------------------------------------ ai */
  /* Negamax with a depth-5 threat scan; fast enough to run synchronously. */
  function aiMove() {
    state.thinking = true;
    render();
    var move = bestMove();
    state.thinking = false;
    if (move === null) { if (!state.over) checkEnd(); return; }

    win.setTimeout(function () {
      if (state.over) return;
      place(move, 2);
      render();
      if (checkEnd()) return;
      state.turn = 1;
      setStatus("Your move — pick a column.");
    }, 380);
  }

  function cloneGrid() {
    var g = [];
    for (var r = 0; r < ROWS; r++) {
      g.push([]);
      for (var c = 0; c < COLS; c++) g[r].push(parseInt(state.cells[r][c].dataset.value || "0", 10));
    }
    return g;
  }

  function heightOf(g, c) {
    for (var r = 0; r < ROWS; r++) if (!g[r][c]) return r;
    return ROWS;
  }

  function winnerInGrid(g) {
    for (var i = 0; i < LINES.length; i++) {
      var line = LINES[i];
      var v = g[line[0][0]][line[0][1]];
      if (!v) continue;
      var same = true;
      for (var k = 1; k < 4; k++) if (g[line[k][0]][line[k][1]] !== v) { same = false; break; }
      if (same) return v;
    }
    return 0;
  }

  /* +score for `me`, -score for `them` */
  function scoreLine(cells, me) {
    var them = 3 - me;
    var mine = 0, theirs = 0, empty = 0;
    for (var i = 0; i < 4; i++) {
      if (cells[i] === me) mine++;
      else if (cells[i] === them) theirs++;
      else empty++;
    }
    if (mine === 4) return 1000000;
    if (theirs === 4) return -1000000;
    if (mine === 3 && empty === 1) return 90;
    if (mine === 2 && empty === 2) return 12;
    if (theirs === 3 && empty === 1) return -80;
    if (theirs === 2 && empty === 2) return -10;
    return mine - theirs;
  }

  function evaluate(g, me) {
    var total = 0;
    for (var i = 0; i < LINES.length; i++) {
      var line = LINES[i];
      total += scoreLine([
        g[line[0][0]][line[0][1]], g[line[1][0]][line[1][1]],
        g[line[2][0]][line[2][1]], g[line[3][0]][line[3][1]]
      ], me);
    }
    /* prefer the middle columns */
    for (var c = 0; c < COLS; c++) {
      var h = heightOf(g, c);
      if (h >= ROWS) continue;
      total += (3 - Math.abs(c - 3)) * 2;
      total -= h;
    }
    return total;
  }

  function negamax(g, depth, alpha, beta, me) {
    var w = winnerInGrid(g);
    if (w === me) return 1000000 - (6 - depth);
    if (w === (3 - me)) return -1000000 + (6 - depth);

    var full = true;
    for (var c = 0; c < COLS; c++) if (heightOf(g, c) < ROWS) { full = false; break; }
    if (full) return 0;
    if (depth === 0) return evaluate(g, me);

    var best = -Infinity;
    for (var col = 0; col < COLS; col++) {
      var row = heightOf(g, col);
      if (row >= ROWS) continue;
      g[row][col] = me;
      var val = -negamax(g, depth - 1, -beta, -alpha, 3 - me);
      g[row][col] = 0;                      /* exact undo: remember the row */
      if (val > best) best = val;
      if (best > alpha) alpha = best;
      if (alpha >= beta) break;
    }
    return best;
  }

  /* drop `p` into column `c` and return the row it landed on, or -1 */
  function dropIn(g, c, p) {
    var r = heightOf(g, c);
    if (r >= ROWS) return -1;
    g[r][c] = p;
    return r;
  }

  function bestMove() {
    var g = cloneGrid();
    var c, r, sc, bestScore, bestCol;
    var order = [3, 2, 4, 1, 5, 0, 6];

    /* 1. win immediately */
    for (c = 0; c < COLS; c++) {
      r = dropIn(g, c, 2);
      if (r === -1) continue;
      if (winnerInGrid(g) === 2) { g[r][c] = 0; return c; }
      g[r][c] = 0;
    }
    /* 2. block an immediate win */
    for (c = 0; c < COLS; c++) {
      r = dropIn(g, c, 1);
      if (r === -1) continue;
      if (winnerInGrid(g) === 1) { g[r][c] = 0; return c; }
      g[r][c] = 0;
    }
    /* 3. search */
    bestScore = -Infinity;
    bestCol = null;
    for (var i = 0; i < order.length; i++) {
      c = order[i];
      r = dropIn(g, c, 2);
      if (r === -1) continue;
      sc = -negamax(g, 4, -Infinity, Infinity, 1);
      g[r][c] = 0;
      if (sc > bestScore) { bestScore = sc; bestCol = c; }
    }
    return bestCol;
  }

  /* -------------------------------------------------------------- events */
  boardEl.addEventListener("click", function (e) {
    var b = e.target.closest(".c4-cell");
    if (!b) return;
    humanMove(parseInt(b.getAttribute("data-c"), 10));
  });

  $$("[data-new]").forEach(function (b) { b.addEventListener("click", reset); });

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

  bindSeg("data-mode", function (v) {
    state.mode = v;
    SG.store.set("c4:mode", v);
    reset();
    setStatus(v === "ai" ? "You are red. CPU is blue." : "Player 1 is red, player 2 is blue.");
  });

  doc.addEventListener("keydown", function (e) {
    var t = e.target;
    if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
    var n = parseInt(e.key, 10);
    if (n >= 1 && n <= COLS) { e.preventDefault(); humanMove(n - 1); }
    else if (e.key === "n" || e.key === "N") { e.preventDefault(); reset(); }
  });

  /* ---------------------------------------------------------------- boot */
  $$("button[data-mode]").forEach(function (o) {
    o.setAttribute("aria-pressed", String(o.getAttribute("data-mode") === state.mode));
  });
  reset();
})(window, document);
