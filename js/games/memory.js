/* ==========================================================================
   Memory Match — flip pairs, clear the board in as few moves as possible
   ========================================================================== */
(function (win, doc) {
  "use strict";

  var $ = SG.$, $$ = SG.$$;
  var grid = $("[data-grid]");
  if (!grid) return;

  var GAME = "memory";
  var hud = SG.hud({ moves: 1, pairs: 1, time: 1, best: 1 });

  /* ------------------------------------------------------------- decks */
  var DECKS = {
    fruit: ["🍎", "🍌", "🍇", "🍓", "🍒", "🥝", "🍑", "🍍", "🥭", "🍋", "🍐", "🫐",
            "🍈", "🥥", "🍆", "🍅", "🍠", "🥕"],
    space: ["🚀", "🛸", "🪐", "🌑", "🌕", "🌟", "☄️", "👽", "🌌", "🔭", "🛰️", "🧑‍🚀",
            "🌙", "🌞", "⭐", "🔆", "⚡", "🌠"],
    food:  ["🍔", "🍕", "🌮", "🍣", "🍜", "🥗", "🍩", "🍪", "🧁", "🍰", "🥙", "🍚",
            "🥔", "🍤", "🧇", "🥞", "🍿", "🥜"]
  };

  var config = { cols: 4, set: "fruit", autoPeek: !!SG.store.get("memory:autopeek", false) };

  var state = {
    deck: [],
    open: [],
    matched: 0,
    locked: false,
    moves: 0,
    elapsed: 0,
    startedAt: 0,
    timer: null,
    running: false,
    over: false
  };

  /* ------------------------------------------------------------ helpers */
  function fmtTime(ms) {
    var t = Math.floor(ms / 1000);
    var m = Math.floor(t / 60);
    return m + ":" + (t % 60 < 10 ? "0" : "") + (t % 60);
  }

  function paint(bump) {
    hud.set("moves", state.moves, bump === "moves");
    hud.set("pairs", state.matched + "/" + (state.deck.length / 2), bump === "pairs");
    hud.set("time", fmtTime(state.elapsed));
    var best = SG.scores.get(GAME);
    hud.set("best", best ? best.label : "—");
  }

  function startClock() {
    if (state.running || state.over) return;
    state.running = true;
    state.startedAt = Date.now() - state.elapsed;
    state.timer = win.setInterval(function () {
      if (!state.running) return;
      state.elapsed = Date.now() - state.startedAt;
      hud.set("time", fmtTime(state.elapsed));
    }, 250);
  }

  function stopClock() {
    state.running = false;
    if (state.timer) { win.clearInterval(state.timer); state.timer = null; }
  }

  /* -------------------------------------------------------------- board */
  function build() {
    var total = config.cols * config.cols;
    var deck = DECKS[config.set] || DECKS.fruit;
    var faces = SG.shuffle(deck).slice(0, total / 2);

    state.deck = SG.shuffle(faces.concat(faces));
    state.open = [];
    state.matched = 0;
    state.locked = false;
    state.moves = 0;
    state.elapsed = 0;
    state.over = false;
    stopClock();

    grid.style.setProperty("--cols", config.cols);
    grid.innerHTML = "";

    state.deck.forEach(function (face, i) {
      var card = doc.createElement("button");
      card.type = "button";
      card.className = "mcard";
      card.setAttribute("data-i", String(i));
      card.setAttribute("aria-label", "Card " + (i + 1) + ", face down");
      card.innerHTML =
        '<span class="mcard__face mcard__back" aria-hidden="true"></span>' +
        '<span class="mcard__face mcard__front" aria-hidden="true">' + face + "</span>";
      card.addEventListener("click", function () { flip(card, i); });
      grid.appendChild(card);
    });

    paint();
    if (config.autoPeek) flash(1400);
  }

  /* reveal every card for a moment */
  function flash(duration) {
    var cards = $$(".mcard", grid);
    if (!cards.length || state.over) return;
    state.locked = true;
    cards.forEach(function (c) { c.classList.add("is-open"); });
    SG.sound.play("tap");
    win.setTimeout(function () {
      cards.forEach(function (c) {
        if (c.classList.contains("is-matched")) return;
        c.classList.remove("is-open");
        c.setAttribute("aria-label", "Card " + (+c.getAttribute("data-i") + 1) + ", face down");
      });
      state.locked = false;
    }, duration);
  }

  function flip(card, i) {
    if (state.locked || state.over) return;
    if (card.classList.contains("is-matched")) return;

    card.classList.add("is-open");
    card.setAttribute("aria-label", "Card " + (i + 1) + ", " + state.deck[i]);
    SG.sound.play("flip");
    state.open.push(i);

    if (state.open.length < 2) { startClock(); return; }

    state.moves++;
    hud.set("moves", state.moves, true);

    var a = state.open[0];
    var b = state.open[1];
    state.locked = true;

    if (state.deck[a] === state.deck[b]) {
      win.setTimeout(function () {
        [a, b].forEach(function (idx) {
          var el = grid.querySelector('[data-i="' + idx + '"]');
          if (!el) return;
          el.classList.remove("is-open");
          el.classList.add("is-matched");
          el.disabled = true;
          el.setAttribute("aria-label", "Matched " + state.deck[idx]);
        });
        state.matched++;
        state.open = [];
        state.locked = false;
        SG.sound.play("match");
        hud.set("pairs", state.matched + "/" + state.deck.length / 2, true);

        if (state.matched * 2 === state.deck.length) win.setTimeout(finish, 340);
      }, 400);
    } else {
      SG.sound.play("wrong");
      [a, b].forEach(function (idx) {
        var el = grid.querySelector('[data-i="' + idx + '"]');
        if (el) el.classList.add("is-wrong");
      });
      win.setTimeout(function () {
        $$(".mcard.is-open", grid).forEach(function (el) {
          el.classList.remove("is-open", "is-wrong");
          el.setAttribute("aria-label", "Card " + (+el.getAttribute("data-i") + 1) + ", face down");
        });
        state.open = [];
        state.locked = false;
      }, 780);
    }
  }

  function finish() {
    state.over = true;
    stopClock();
    state.elapsed = Date.now() - state.startedAt;

    SG.stats.win(GAME);
    var perfect = state.moves === state.deck.length / 2;
    var best = SG.scores.submitLow(GAME, state.moves, state.moves + " moves");
    var fastest = SG.scores.submitLow(GAME + ":time", state.elapsed, fmtTime(state.elapsed));

    /* paint last so the Best cell reflects the score we just saved */
    paint();
    SG.sound.play(perfect ? "bigwin" : "win");
    SG.confetti.burst(perfect ? 200 : 120);

    var note = [];
    if (best.isBest) note.push("new best");
    if (fastest.isBest) note.push("fastest clear");
    SG.toast({
      icon: perfect ? "🌟" : "🎉",
      title: "Cleared in " + state.moves + " moves",
      sub: fmtTime(state.elapsed) + (note.length ? " · " + note.join(" · ") : "") +
           (perfect ? " · perfect game!" : "")
    });
  }

  /* ---------------------------------------------------------- controls */
  function bindSeg(attr, cb) {
    var groups = [];
    $$("button[" + attr + "]").forEach(function (b) {
      if (groups.indexOf(b.parentNode) === -1) groups.push(b.parentNode);
    });
    groups.forEach(function (g) {
      g.addEventListener("click", function (e) {
        var btn = e.target.closest("button[" + attr + "]");
        if (!btn) return;
        $$("button[" + attr + "]", g).forEach(function (b) {
          b.setAttribute("aria-pressed", String(b === btn));
        });
        cb(btn.getAttribute(attr));
        SG.sound.play("click");
      });
    });
  }

  bindSeg("data-cols", function (v) { config.cols = parseInt(v, 10); build(); });
  bindSeg("data-set", function (v) { config.set = v; build(); });

  $("[data-new]").addEventListener("click", function () { build(); SG.sound.play("click"); });
  $("[data-peek-btn]").addEventListener("click", function () { flash(1300); });

  var autoBox = $("[data-autopeek]");
  var peekBtn = $("[data-peek-btn]");

  if (autoBox) {
    autoBox.checked = config.autoPeek;
    autoBox.addEventListener("change", function () {
      config.autoPeek = autoBox.checked;
      SG.store.set("memory:autopeek", config.autoPeek);
      if (peekBtn) peekBtn.disabled = config.autoPeek;
      if (config.autoPeek) flash(1400);
    });
    if (peekBtn) peekBtn.disabled = config.autoPeek;
  }

  /* ---------------------------------------------------------- keyboard */
  doc.addEventListener("keydown", function (e) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    var t = e.target;
    if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
    if (t && t.classList && t.classList.contains("mcard") &&
        (e.key === "Enter" || e.key === " ")) return; // let the card handle it

    var k = e.key.toLowerCase();
    if (k === "n") { build(); SG.sound.play("click"); }
    else if (k === "p") { if (peekBtn && !peekBtn.disabled) flash(1300); }
    else if (k === "1") { clickSeg("data-cols", "4"); }
    else if (k === "2") { clickSeg("data-cols", "6"); }
  });

  function clickSeg(attr, value) {
    var btn = doc.querySelector("button[" + attr + '="' + value + '"]');
    if (btn) btn.click();
  }

  /* -------------------------------------------------------------- boot */
  build();
  SG.stats.play(GAME);
  win.addEventListener("beforeunload", stopClock);
})(window, document);
