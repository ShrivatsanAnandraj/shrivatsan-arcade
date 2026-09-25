/* ==========================================================================
   2048 — slide, merge, climb. Arrow keys / WASD / swipe, with undo.
   ========================================================================== */
(function (win, doc) {
  "use strict";

  var $ = SG.$, $$ = SG.$$;
  var boardEl = $("[data-board]");
  if (!boardEl) return;

  var GAME = "g2048";
  var hud = SG.hud({ score: 1, moves: 1, top: 1, best: 1 });

  var SIZE = 4;
  var GOAL = 2048;
  var HISTORY_LIMIT = 20;

  var state = {
    grid: [],
    score: 0,
    moves: 0,
    won: false,
    over: false,
    history: []
  };

  var tilesHost = $("[data-tiles]");
  var winPanel = $("[data-win]");

  /* ---------------------------------------------------------------- grid */
  function blank() {
    var g = [];
    for (var r = 0; r < SIZE; r++) {
      g.push(new Array(SIZE).fill(0));
    }
    return g;
  }

  function pushHistory() {
    state.history.push({
      grid: state.grid.map(function (row) { return row.slice(); }),
      score: state.score,
      moves: state.moves,
      won: state.won
    });
    if (state.history.length > HISTORY_LIMIT) state.history.shift();
  }

  function undo() {
    var prev = state.history.pop();
    if (!prev) { SG.sound.play("wrong"); return; }
    state.grid = prev.grid;
    state.score = prev.score;
    state.moves = prev.moves;
    state.won = prev.won;
    state.over = isDead();
    if (winPanel) winPanel.hidden = true;
    render();
    SG.sound.play("tap");
  }

  function addTile() {
    var free = [];
    for (var r = 0; r < SIZE; r++) {
      for (var c = 0; c < SIZE; c++) {
        if (!state.grid[r][c]) free.push([r, c]);
      }
    }
    if (!free.length) return;
    var spot = SG.pick(free);
    /* 90% twos, 10% fours — same odds as the original */
    state.grid[spot[0]][spot[1]] = Math.random() < 0.9 ? 2 : 4;
  }

  /* --------------------------------------------------------------- moves */
  /* returns true if the board actually changed */
  function move(dir) {
    if (state.over) return false;

    var next = blank();
    var gained = 0;

    for (var line = 0; line < SIZE; line++) {
      /* read this row/column in travel order */
      var cells = [];
      for (var i = 0; i < SIZE; i++) {
        var r = (dir === "up") ? i : (dir === "down") ? SIZE - 1 - i : line;
        var c = (dir === "left") ? i : (dir === "right") ? SIZE - 1 - i : line;
        cells.push(state.grid[r][c]);
      }

      /* drop empties, then merge equal neighbours */
      var vals = cells.filter(function (v) { return v !== 0; });
      var out = [];
      for (var j = 0; j < vals.length; j++) {
        if (j + 1 < vals.length && vals[j] === vals[j + 1]) {
          out.push(vals[j] * 2);
          gained += vals[j] * 2;
          j++;
        } else {
          out.push(vals[j]);
        }
      }
      while (out.length < SIZE) out.push(0);

      /* write the finished row back in the same travel order */
      for (var k = 0; k < SIZE; k++) {
        var rr = (dir === "up") ? k : (dir === "down") ? SIZE - 1 - k : line;
        var cc = (dir === "left") ? k : (dir === "right") ? SIZE - 1 - k : line;
        next[rr][cc] = out[k];
      }
    }

    if (same(next, state.grid)) return false;

    pushHistory();
    state.grid = next;
    state.score += gained;
    state.moves++;
    addTile();

    if (gained > 0) SG.sound.play("pop", Math.min(0, 600 - gained * 4));
    else SG.sound.play("tap");

    state.over = isDead();
    if (!state.won && hasTile(GOAL)) {
      state.won = true;
      SG.stats.win(GAME);
      SG.sound.chord("bigwin", [0, 4, 7, 12]);
      SG.confetti.rain(140);
      SG.toast({ icon: "🔢", title: "2048 reached!", sub: "Keep going or start a new game." });
      if (winPanel) winPanel.hidden = false;
    }

    if (state.over) {
      var res = SG.scores.submit(GAME, state.score, String(state.score));
      SG.sound.play("lose");
      if (winPanel) winPanel.hidden = true;
      setTimeout(function () {
        SG.toast({
          icon: res.isBest ? "🏅" : "🧱",
          title: (res.isBest ? "New best: " : "Game over: ") + state.score,
          sub: "No moves left. Undo or start fresh."
        });
      }, 260);
    }

    render();
    return true;
  }

  function same(a, b) {
    for (var r = 0; r < SIZE; r++) {
      for (var c = 0; c < SIZE; c++) {
        if (a[r][c] !== b[r][c]) return false;
      }
    }
    return true;
  }

  function hasTile(v) {
    for (var r = 0; r < SIZE; r++) {
      for (var c = 0; c < SIZE; c++) {
        if (state.grid[r][c] === v) return true;
      }
    }
    return false;
  }

  function topTile() {
    var max = 0;
    for (var r = 0; r < SIZE; r++) {
      for (var c = 0; c < SIZE; c++) {
        if (state.grid[r][c] > max) max = state.grid[r][c];
      }
    }
    return max;
  }

  function canSlide(r, c, dr, dc) {
    var nr = r + dr, nc = c + dc;
    if (nr < 0 || nc < 0 || nr >= SIZE || nc >= SIZE) return false;
    return !state.grid[nr][nc] || state.grid[nr][nc] === state.grid[r][c];
  }

  function isDead() {
    for (var r = 0; r < SIZE; r++) {
      for (var c = 0; c < SIZE; c++) {
        if (!state.grid[r][c]) return false;
        if (canSlide(r, c, 0, 1) || canSlide(r, c, 1, 0)) return false;
      }
    }
    return true;
  }

  /* -------------------------------------------------------------- render */
  function render() {
    var existing = {};
    $$(".tile", tilesHost).forEach(function (el) {
      existing[el.getAttribute("data-k")] = el;
    });

    var seen = {};

    for (var r = 0; r < SIZE; r++) {
      for (var c = 0; c < SIZE; c++) {
        var v = state.grid[r][c];
        if (!v) continue;
        var key = r + "-" + c;
        seen[key] = true;

        var el = existing[key];
        if (!el) {
          el = doc.createElement("div");
          el.className = "tile tile--v" + v;
          el.setAttribute("data-k", key);
          el.setAttribute("role", "img");
          el.setAttribute("aria-label", "Tile " + v);
          el.textContent = v;
          el.style.setProperty("--i", c);
          el.style.setProperty("--j", r);
          tilesHost.appendChild(el);
          /* pop in on the next frame so the transition has a start value */
          win.requestAnimationFrame((function (node) {
            return function () { node.classList.add("is-new"); };
          })(el));
        } else {
          if (el.textContent !== String(v)) {
            el.textContent = v;
            el.setAttribute("aria-label", "Tile " + v);
            el.classList.add("is-merged");
            win.setTimeout((function (node) {
              return function () { node.classList.remove("is-merged"); };
            })(el), 220);
          }
          el.className = el.className.replace(/\s*is-new|\s*is-merged|\stile--v\d+/g, "") + " tile--v" + v;
          el.style.setProperty("--i", c);
          el.style.setProperty("--j", r);
        }
      }
    }

    /* drop tiles that no longer hold a value */
    Object.keys(existing).forEach(function (k) {
      if (!seen[k] && existing[k].parentNode) existing[k].parentNode.removeChild(existing[k]);
    });

    paintHud();
  }

  function paintHud() {
    hud.set("score", state.score, true);
    hud.set("moves", state.moves);
    hud.set("top", topTile());
    var best = SG.scores.get(GAME);
    hud.set("best", best ? best.label : "—");
  }

  /* ------------------------------------------------------------- control */
  function newGame() {
    state.grid = blank();
    state.score = 0;
    state.moves = 0;
    state.won = false;
    state.over = false;
    state.history = [];
    addTile();
    addTile();
    if (winPanel) winPanel.hidden = true;
    SG.stats.play(GAME);
    render();
    SG.sound.play("click");
  }

  var KEYS = {
    arrowup: "up", w: "up",
    arrowdown: "down", s: "down",
    arrowleft: "left", a: "left",
    arrowright: "right", d: "right"
  };

  doc.addEventListener("keydown", function (e) {
    var t = e.target;
    if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
    var k = e.key.toLowerCase();
    if (KEYS[k]) {
      e.preventDefault();
      move(KEYS[k]);
    } else if (k === "z" || k === "u") {
      e.preventDefault();
      undo();
    }
  });

  $$("[data-dir]").forEach(function (b) {
    b.addEventListener("click", function () { move(b.getAttribute("data-dir")); });
  });

  $("[data-new]").addEventListener("click", newGame);
  $("[data-undo]").addEventListener("click", undo);
  if (winPanel) {
    $("[data-keep-playing]", winPanel).addEventListener("click", function () {
      if (winPanel) winPanel.hidden = true;
      SG.sound.play("click");
    });
    $("[data-new]", winPanel).addEventListener("click", newGame);
  }

  /* --------------------------------------------------------------- touch */
  var start = null;
  boardEl.addEventListener("touchstart", function (e) {
    var t = e.changedTouches[0];
    start = { x: t.clientX, y: t.clientY, at: Date.now() };
  }, { passive: true });

  boardEl.addEventListener("touchmove", function (e) {
    if (!start) return;
    e.preventDefault();
    var t = e.changedTouches[0];
    var dx = t.clientX - start.x;
    var dy = t.clientY - start.y;
    if (Math.abs(dx) < 22 && Math.abs(dy) < 22) return;
    if (Math.abs(dx) > Math.abs(dy)) move(dx > 0 ? "right" : "left");
    else move(dy > 0 ? "down" : "up");
    start = null;
  }, { passive: false });

  boardEl.addEventListener("touchend", function () { start = null; });

  /* ---------------------------------------------------------------- boot */
  state.grid = blank();
  addTile();
  addTile();
  render();
})(window, document);
