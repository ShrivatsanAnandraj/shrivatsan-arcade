/* ==========================================================================
   Tic Tac Toe — minimax AI (never loses) or two-player hot-seat
   ========================================================================== */
(function (win, doc) {
  "use strict";

  var $ = SG.$, $$ = SG.$$;
  var board = $("[data-board]");
  if (!board) return;

  var GAME = "ttt";
  var hud = SG.hud({ x: 1, o: 1, d: 1, streak: 1 });

  var cells = $$(".t3t-cell", board);

  var LINES = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6]
  ];

  var config = {
    mode: SG.store.get("ttt:mode", "ai"),
    diff: SG.store.get("ttt:diff", "hard"),
    aiStarts: !!SG.store.get("ttt:aiStarts", false)
  };

  var state = {
    cells: new Array(9).fill(""),
    turn: "X",
    over: false,
    busy: false,
    tally: { X: 0, O: 0, D: 0 },
    streak: 0
  };

  /* --------------------------------------------------------------- tally */
  function loadTally() {
    var t = SG.store.get("ttt:tally", null);
    if (t) state.tally = t;
    var s = SG.store.get("ttt:streak", 0);
    state.streak = SG.clamp(parseInt(s, 10) || 0, 0, 999);
    paintTally();
  }

  function saveTally() {
    SG.store.set("ttt:tally", state.tally);
    SG.store.set("ttt:streak", state.streak);
  }

  function paintTally() {
    hud.set("x", state.tally.X);
    hud.set("o", state.tally.O);
    hud.set("d", state.tally.D);
    hud.set("streak", state.streak);
  }

  /* --------------------------------------------------------------- board */
  function paint() {
    cells.forEach(function (el, i) {
      el.textContent = state.cells[i];
      el.disabled = state.over || state.busy || !!state.cells[i];
      el.classList.remove("is-win", "is-dim");
    });
    var winLine = findWinner();
    if (winLine.index >= 0) {
      winLine.line.forEach(function (i) { cells[i].classList.add("is-win"); });
      state.cells.forEach(function (v, i) {
        if (v && winLine.line.indexOf(i) === -1) cells[i].classList.add("is-dim");
      });
    }
  }

  function findWinner(b) {
    var c = b || state.cells;
    for (var i = 0; i < LINES.length; i++) {
      var l = LINES[i];
      if (c[l[0]] && c[l[0]] === c[l[1]] && c[l[1]] === c[l[2]]) {
        return { index: i, line: l, who: c[l[0]] };
      }
    }
    return { index: -1, line: [] };
  }

  function isFull(b) {
    var c = b || state.cells;
    return c.every(function (v) { return v !== ""; });
  }

  function setStatus(text) { $("[data-status]").textContent = text; }

  /* -------------------------------------------------------------- minimax */
  /* returns a score from the perspective of `me` */
  function minimax(board, me, depth) {
    var w = findWinner(board);
    if (w.index >= 0) return w.who === me ? 10 - depth : depth - 10;
    if (isFull(board)) return 0;
    if (depth >= 9) return 0;

    var opp = me === "X" ? "O" : "X";
    var best = -Infinity;

    for (var i = 0; i < 9; i++) {
      if (board[i]) continue;
      board[i] = me;
      var score = minimax(board, me, depth + 1);
      board[i] = "";
      if (score > best) best = score;
    }
    return best;
  }

  /* pick the best move for `me`, with a little randomness on easy */
  function bestMove(me, easy) {
    var moves = [];
    var bestScore = -Infinity;

    for (var i = 0; i < 9; i++) {
      if (state.cells[i]) continue;
      state.cells[i] = me;
      var s = minimax(state.cells, me, 0);
      state.cells[i] = "";
      moves.push({ i: i, s: s });
      if (s > bestScore) bestScore = s;
    }
    if (!moves.length) return -1;

    var top = moves.filter(function (m) { return m.s === bestScore; });

    if (easy) {
      /* mostly the best move, but sometimes a blunder so it feels human */
      var blunder = Math.random() < 0.38;
      var pool = blunder ? moves.filter(function (m) { return m.s < bestScore; }) : top;
      if (!pool.length) pool = top;
      /* but easy AI should still block an immediate loss most of the time */
      if (blunder && Math.random() < 0.4) pool = top;
      return SG.pick(pool).i;
    }
    return SG.pick(top).i;
  }

  /* --------------------------------------------------------------- moves */
  function play(i) {
    if (state.over || state.busy || state.cells[i]) return;
    state.cells[i] = state.turn;
    SG.sound.play("tap", i * 40);
    paint();

    var w = findWinner();
    if (w.index >= 0) return finish(w.who);
    if (isFull()) return finish("D");

    state.turn = state.turn === "X" ? "O" : "X";
    updateStatus();

    if (config.mode === "ai" && state.turn === "O") think();
  }

  function think() {
    state.busy = true;
    paint();
    var delay = config.diff === "hard" ? SG.randInt(360, 560) : SG.randInt(260, 460);

    win.setTimeout(function () {
      if (state.over) { state.busy = false; return; }
      var i = bestMove("O", config.diff === "easy");
      state.busy = false;
      if (i < 0) { finish("D"); return; }
      state.cells[i] = "O";
      SG.sound.play("tap", 120);
      paint();

      var w = findWinner();
      if (w.index >= 0) return finish(w.who);
      if (isFull()) return finish("D");

      state.turn = "X";
      updateStatus();
    }, delay);
  }

  function finish(who) {
    state.over = true;
    paint();

    if (who === "X") { state.tally.X++; state.streak++; SG.stats.win(GAME); }
    else if (who === "O") { state.tally.O++; state.streak = 0; }
    else { state.tally.D++; state.streak = 0; }

    saveTally();
    paintTally();

    if (who === "D") {
      SG.sound.play("tick");
      setStatus("Draw. Nobody blinked.");
      SG.toast({ icon: "🤝", title: "Draw", sub: "Tally is " + tallyLine() });
      return;
    }

    var friend = config.mode === "friend";
    var youWon = who === "X" && config.mode === "ai";
    SG.sound.play(youWon ? "bigwin" : "win");

    if (friend) {
      SG.confetti.burst(110);
      SG.toast({
        icon: who === "X" ? "❌" : "⭕",
        title: who + " wins!",
        sub: tallyLine() + " · X–O–Draw"
      });
      setStatus(who + " wins. Tap New round to go again.");
    } else if (youWon) {
      SG.confetti.burst(140);
      SG.toast({
        icon: "🏆",
        title: "You beat the AI!",
        sub: "Streak is now " + state.streak + " · " + tallyLine()
      });
      setStatus("You win! Tap New round to go again.");
    } else {
      setStatus("The AI wins this one.");
      SG.toast({
        icon: "🤖",
        title: "The AI takes it",
        sub: config.diff === "hard" ? "Unbeatable mode never loses." : "Try Easy mode.",
        duration: 2600
      });
    }
  }

  function tallyLine() {
    return state.tally.X + "–" + state.tally.O + "–" + state.tally.D;
  }

  function updateStatus() {
    if (state.over) return;
    if (config.mode === "friend") {
      setStatus(state.turn + " to move.");
    } else {
      setStatus(state.turn === "X" ? "Your move — pick a square." : "The AI is thinking…");
    }
  }

  /* -------------------------------------------------------------- rounds */
  function newRound() {
    state.cells = new Array(9).fill("");
    state.over = false;
    state.busy = false;
    state.turn = "X";
    paint();
    SG.stats.play(GAME);
    updateStatus();
    SG.sound.play("click");

    if (config.mode === "ai" && config.aiStarts) {
      state.turn = "O";
      updateStatus();
      think();
    }
  }

  /* ----------------------------------------------------------- controls */
  cells.forEach(function (el) {
    el.addEventListener("click", function () { play(+el.getAttribute("data-i")); });
  });

  $("[data-new]").addEventListener("click", newRound);

  $("[data-reset-scores]").addEventListener("click", function () {
    state.tally = { X: 0, O: 0, D: 0 };
    state.streak = 0;
    saveTally();
    paintTally();
    SG.sound.play("click");
    SG.toast({ icon: "🧹", title: "Tally cleared" });
  });

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

  bindSeg("data-mode", function (v) {
    config.mode = v;
    SG.store.set("ttt:mode", v);
    var diffGroup = $("[data-diff-group]");
    if (diffGroup) diffGroup.style.display = v === "ai" ? "" : "none";
    newRound();
  });

  bindSeg("data-diff", function (v) {
    config.diff = v;
    SG.store.set("ttt:diff", v);
    SG.sound.play("click");
  });

  var aiStarts = $("[data-ai-starts]");
  if (aiStarts) {
    aiStarts.checked = config.aiStarts;
    aiStarts.addEventListener("change", function () {
      config.aiStarts = aiStarts.checked;
      SG.store.set("ttt:aiStarts", config.aiStarts);
      SG.sound.play("click");
    });
  }

  doc.addEventListener("keydown", function (e) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    var t = e.target;
    if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
    var k = e.key.toLowerCase();
    if (k === "n") newRound();
    else if (k === "r") { state.tally = { X: 0, O: 0, D: 0 }; state.streak = 0; saveTally(); paintTally(); }
  });

  /* --------------------------------------------------------------- boot */
  loadTally();
  syncPressed("data-mode", config.mode);
  syncPressed("data-diff", config.diff);
  var diffGroup = $("[data-diff-group]");
  if (diffGroup) diffGroup.style.display = config.mode === "ai" ? "" : "none";
  newRound();
})(window, document);
