/* ==========================================================================
   Wordle — 6 guesses, 5 letters, three-state letter feedback.
   Answer is chosen from a bundled word list; daily mode is deterministic.
   ========================================================================== */
(function (win, doc) {
  "use strict";

  var $ = SG.$, $$ = SG.$$;
  var boardEl = $("[data-board]");
  if (!boardEl) return;

  var GAME = "wordle";
  var ROWS = 6;
  var COLS = 5;

  /* A compact, dependency-free answer list. Guesses are validated against
     the same list so the game never dead-ends on a word it will not accept. */
  var WORDS = (
    "about above abuse actor acute admit adopt adult after again agent agree ahead alarm album " +
    "alert alike alive allow alone along alter among anger angle angry apart apple apply arena " +
    "argue arise armor arrow aside asset audio avoid awake award aware bacon badge baker basic " +
    "basin batch beach beard beast begin being belly bench berry birth black blade blame blank " +
    "blast blind block blood board bonus boost booth bound brain brake brand brass brave bread " +
    "break breed brick bride brief bring broad broke brown brush build burst buyer cable " +
    "candy canoe cargo carry carve catch cause chain chair chalk chaos charm chart chase cheap " +
    "check chest chief child china chose civil claim clean clear clerk click cliff climb clock " +
    "close cloth cloud coach coast cocoa color comet coral couch could count court cover craft " +
    "crane crash crate crawl cream creek crest crisp cross crowd crown crumb crush crust curve " +
    "cycle daily dairy dance dealt debut decay delay delta dense depth diner dirty ditch diver " +
    "doubt dozen draft drain drama drank drawn dream dress dried drift drill drink drive " +
    "driven drone drove dying eager early earth eight elbow elder elect elite ember empty enemy " +
    "enjoy enter entry equal error essay event every exact exist extra faith false fault favor " +
    "feast fence ferry fever field fifty fight final first flame flash fleet flesh float flock " +
    "floor flour fluid focus force forge forth forty forum found frame fraud fresh fried front " +
    "frost fruit fully funny giant given glass globe glory going grace grade grain grand grant " +
    "grape grasp grass grave great green greet grief grill grind gross group grove grow guard " +
    "guess guest guide habit happy hardy harsh haste hatch haunt haven heart heavy hedge hello " +
    "hence hobby honey honor horse hotel house human humor hurry ideal image index inner input " +
    "issue ivory jelly jewel joint jolly judge juice keeps knife knock known label labor large " +
    "laser later laugh layer learn lease least leave legal lemon level light limit linen liner " +
    "liver lobby local lodge logic loose lover lower loyal lucky lunar lunch magic major maker " +
    "maple march match maybe mayor medal media mercy merge merit metal meter midst might minor " +
    "minus mixed model moist money month moral motor mount mouse mouth movie music newly night " +
    "noble noise north noted novel nurse oasis occur ocean offer often olive onion order other " +
    "ought ounce outer owner paint panel paper party pasta patch pause peace peach pearl pedal " +
    "penny phase phone photo piano piece pilot pinch pitch place plain plane plank plant plate " +
    "plaza plumb point polar porch pound power press price pride prime print prize proof proud " +
    "prove pulse punch pupil purse queen query quest queue quick quiet quilt quite quota radar " +
    "radio raise rally ranch range rapid ratio reach react ready realm rebel refer relax renew " +
    "rental reply rider ridge right rigid rinse risen rival river roast robin robot rocky roman " +
    "rough round royal rugby ruler rumor rural sadly saint salad sauce scale scene scope score " +
    "scout scrap screw sense serve seven shade shaft shake shall shape share shark sharp sheep " +
    "sheet shelf shell shift shine shirt shock shoot shore short shown shrub sight sigma silly " +
    "since sixth sixty sized skill slate sleep slice slide slope small smart smash smell smile " +
    "smoke snack snake sneak solar solid solve sonic sorry sound south space spare spark speak " +
    "speed spell spend spice spike spine spite split spoke sponge spoon sport spray squad stack " +
    "staff stage stake stamp stand start state steam steel steep steer stern stick still sting " +
    "stock stone stood stool store storm story stove strap straw strip stuck study stuff style " +
    "sugar suited sunny super surge swamp swarm sweat sweep sweet swift swing sword table " +
    "taste teach tear tempo tenant tense tenth thank theme there thick thing think third " +
    "those three threw throw thumb tidal tiger tight timer title toast today token topic torch " +
    "total touch tough tower toxic trace track trade trail train trait treat trend trial tribe " +
    "trick tried tulip tumor tutor twice twist ultra uncle under union unite unity until upper " +
    "upset urban usage usual vague valid value valve vapor vault venue verse video vigor villa " +
    "vinyl viola virus visit vital vivid vocal voice voter wagon waist waste watch water wave " +
    "weary whale wheat wheel where which while white whole widen width windy witty woman world " +
    "worry worth would wound wrist write wrong yacht yeast yield young youth zebra"
  ).split(/\s+/).filter(Boolean).map(function (w) { return w.toUpperCase(); });

  var state = {
    mode: SG.store.get("wordle:mode", "daily") === "daily" ? "daily" : "free",
    hard: SG.store.get("wordle:hard", false) === true,
    board: [],
    row: 0,
    answer: "",
    guess: "",
    locked: false,
    over: false,
    won: false,
    dailyKey: "",
    streak: SG.store.get("wordle:streak", { current: 0, best: 0 }) || { current: 0, best: 0 }
  };

  var hud = SG.hud({ left: 1, word: 1, streak: 1, best: 1 });

  /* ---------------------------------------------------------------- util */
  function dayNumber() {
    return Math.floor(Date.now() / 86400000);
  }

  function pickAnswer() {
    if (state.mode === "daily") {
      var key = "wordle:daily:" + dayNumber();
      var saved = SG.store.get(key, null);
      if (saved) return String(saved).toUpperCase();
      var w = SG.pick(WORDS);
      SG.store.set(key, w);
      return w;
    }
    return SG.pick(WORDS);
  }

  function isWord(w) { return WORDS.indexOf(String(w).toUpperCase()) !== -1; }

  function score(guess, answer) {
    /* returns an array of 'exact' | 'present' | 'absent' */
    var res = new Array(COLS);
    var pool = {};

    for (var i = 0; i < COLS; i++) {
      if (guess[i] === answer[i]) res[i] = "exact";
      else pool[answer[i]] = (pool[answer[i]] || 0) + 1;
    }
    for (var j = 0; j < COLS; j++) {
      if (res[j] === "exact") continue;
      var ch = guess[j];
      if (pool[ch] > 0) { res[j] = "present"; pool[ch] -= 1; }
      else res[j] = "absent";
    }
    return res;
  }

  /* ----------------------------------------------------------------- dom */
  function buildBoard() {
    boardEl.innerHTML = "";
    state.board = [];
    for (var r = 0; r < ROWS; r++) {
      var row = [];
      var rowEl = doc.createElement("div");
      rowEl.className = "wordle__row";
      rowEl.setAttribute("role", "group");
      rowEl.setAttribute("aria-label", "Guess " + (r + 1));
      for (var c = 0; c < COLS; c++) {
        var cell = doc.createElement("div");
        cell.className = "wordle__cell";
        rowEl.appendChild(cell);
        row.push(cell);
      }
      boardEl.appendChild(rowEl);
      state.board.push(row);
    }
  }

  function paintCurrent() {
    for (var r = 0; r < ROWS; r++) {
      for (var c = 0; c < COLS; c++) {
        var cell = state.board[r][c];
        var ch = r === state.row ? state.guess[c] || "" : (state.board[r][c].textContent || "");
        if (r > state.row) ch = cell.textContent;
        if (cell.textContent !== ch) cell.textContent = ch;
        cell.classList.toggle("is-filled", !!ch && r === state.row);
      }
    }
    paintKeypad();
  }

  function paintKeypad() {
    /* derive key state from every graded row: correct > present > absent */
    var rank = { absent: 1, present: 2, exact: 3 };
    var best = {};
    for (var rr = 0; rr < state.board.length; rr++) {
      var rowEl = state.board[rr][0].parentNode;
      var marks = rowEl.getAttribute("data-marks");
      if (!marks) continue;
      var parsed = JSON.parse(marks);
      for (var i = 0; i < COLS; i++) {
        var ch = state.board[rr][i].getAttribute("data-ch");
        if (!ch) continue;
        if (!best[ch] || rank[parsed[i]] > rank[best[ch]]) best[ch] = parsed[i];
      }
    }
    $$("[data-key]").forEach(function (k) {
      var ch = k.getAttribute("data-key");
      k.classList.remove("is-exact", "is-present", "is-absent");
      if (!ch || ch === "?" || ch === "DEL") return;
      if (best[ch]) k.classList.add("is-" + best[ch]);
    });
  }

  function grade(guess) {
    var marks = score(guess, state.answer);
    var rowEl = state.board[state.row][0].parentNode;
    rowEl.setAttribute("data-marks", JSON.stringify(marks));

    state.board[state.row].forEach(function (cell, i) {
      var ch = guess[i];
      cell.setAttribute("data-ch", ch);
      cell.setAttribute("data-mark", marks[i]);
    });

    /* stagger the reveal so the colour change reads as a cascade */
    state.board[state.row].forEach(function (cell, i) {
      var ch = guess[i];
      win.setTimeout(function () {
        cell.classList.add("is-revealed", "is-" + marks[i]);
        var keyEl = $('[data-key="' + ch + '"]');
        if (keyEl) {
          var order = { absent: 1, present: 2, exact: 3 };
          var cur = keyEl.className.match(/is-(exact|present|absent)/);
          if (!cur || order[marks[i]] > order[cur[1]]) {
            keyEl.classList.remove("is-exact", "is-present", "is-absent");
            keyEl.classList.add("is-" + marks[i]);
          }
        }
        SG.sound.play(marks[i] === "exact" ? "match" : marks[i] === "present" ? "tick" : "bonk");
      }, i * 260);
    });
  }

  /* ------------------------------------------------------------ gameplay */
  function newGame() {
    state.answer = pickAnswer();
    state.row = 0;
    state.guess = "";
    state.locked = false;
    state.over = false;
    state.won = false;
    buildBoard();
    paintCurrent();
    paintHud();
    SG.stats.play(GAME);
  }

  function typeLetter(ch) {
    if (state.locked || state.over || state.guess.length >= COLS) return;
    state.guess += ch;
    paintCurrent();
    paintHud();
  }

  function backspace() {
    if (state.locked || state.over) return;
    state.guess = state.guess.slice(0, -1);
    paintCurrent();
    paintHud();
  }

  /* Hard mode: every hint already earned must be honoured. */
  function violatesHardMode(g) {
    if (!state.hard) return null;

    for (var r = 0; r < state.row; r++) {
      var marks = JSON.parse(state.board[r][0].parentNode.getAttribute("data-marks") || "[]");
      for (var i = 0; i < COLS; i++) {
        var ch = state.board[r][i].getAttribute("data-ch");
        if (!ch) continue;
        if (marks[i] === "exact" && g[i] !== ch) {
          return "Position " + (i + 1) + " must stay " + ch;
        }
        if (marks[i] === "absent" && g.indexOf(ch) !== -1) {
          return ch + " is already ruled out";
        }
      }
    }

    /* a known-present letter must appear somewhere */
    var need = {};
    for (var k = 0; k < state.row; k++) {
      var mk = JSON.parse(state.board[k][0].parentNode.getAttribute("data-marks") || "[]");
      for (var j = 0; j < COLS; j++) {
        var c2 = state.board[k][j].getAttribute("data-ch");
        if (c2 && mk[j] === "present") need[c2] = true;
      }
    }
    for (var letter in need) {
      if (need[letter] && g.indexOf(letter) === -1) return "Must still use " + letter;
    }
    return null;
  }

  function submit() {
    if (state.locked || state.over) return;
    var g = state.guess;
    if (g.length < COLS) {
      SG.sound.play("wrong");
      SG.toast({ icon: "⌨️", title: "Too short", sub: "You need " + COLS + " letters.", duration: 1400 });
      return;
    }
    if (!isWord(g)) {
      SG.sound.play("wrong");
      shakeRow();
      SG.toast({ icon: "🚫", title: "Not in the word list", sub: "Try a different word.", duration: 1800 });
      return;
    }
    var problem = violatesHardMode(g);
    if (problem) {
      SG.sound.play("wrong");
      shakeRow();
      SG.toast({ icon: "🔒", title: "Hard mode", sub: problem, duration: 2200 });
      return;
    }

    state.locked = true;
    grade(g);
    var solved = g === state.answer;

    win.setTimeout(function () {
      state.locked = false;
      state.guess = "";
      state.row += 1;

      if (solved) {
        state.over = true;
        state.won = true;
        finish();
      } else if (state.row >= ROWS) {
        state.over = true;
        finish();
      } else {
        paintCurrent();
        paintHud();
      }
    }, COLS * 260 + 120);
  }

  function shakeRow() {
    var rowEl = state.board[state.row][0].parentNode;
    rowEl.classList.add("is-shake");
    win.setTimeout(function () { rowEl.classList.remove("is-shake"); }, 460);
  }

  function finish() {
    if (state.won) SG.stats.win(GAME);
    settleStreak();
    var attempts = state.won ? state.row : ROWS;
    var res = SG.scores.submitLow(GAME, attempts, attempts + (attempts === 1 ? " guess" : " guesses"));

    if (state.won) {
      SG.confetti.burst(140);
      SG.sound.chord("bigwin", [0, 4, 7]);
      SG.toast({
        icon: "🎉",
        title: res.isBest ? "New best: " + attempts + (attempts === 1 ? " guess" : " guesses") : "Solved in " + attempts,
        sub: "The word was " + state.answer.toUpperCase()
      });
    } else {
      SG.sound.play("lose");
      SG.toast({
        icon: "📖",
        title: "Out of guesses",
        sub: "The word was " + state.answer.toUpperCase()
      });
    }
    paintHud();
  }

  /* streak is a game-over side effect, never a paint side effect */
  function settleStreak() {
    if (state.won) {
      state.streak.current += 1;
      if (state.streak.current > state.streak.best) state.streak.best = state.streak.current;
    } else {
      state.streak.current = 0;
    }
    SG.store.set("wordle:streak", state.streak);
  }

  function paintHud() {
    var remaining = ROWS - state.row;
    hud.set("left", state.won ? "solved" : remaining);
    hud.set("word", state.row > 0 ? state.answer.toUpperCase() : "?????");
    hud.set("streak", state.streak.current);
    var b = SG.scores.get(GAME);
    hud.set("best", b ? b.label : "—");
  }

  /* -------------------------------------------------------------- events */
  $$("[data-key]").forEach(function (k) {
    k.addEventListener("click", function () {
      var ch = k.getAttribute("data-key");
      if (ch === "?") { submit(); return; }
      if (ch === "DEL") { backspace(); return; }
      typeLetter(ch);
    });
  });

  $$("[data-new]").forEach(function (b) { b.addEventListener("click", newGame); });

  doc.addEventListener("keydown", function (e) {
    var t = e.target;
    if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    var k = e.key;

    if (k === "Enter") { e.preventDefault(); submit(); return; }
    if (k === "Backspace") { e.preventDefault(); backspace(); return; }
    if (/^[a-zA-Z]$/.test(k)) { e.preventDefault(); typeLetter(k.toUpperCase()); }
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

  bindSeg("data-mode", function (v) {
    state.mode = v;
    SG.store.set("wordle:mode", v);
    newGame();
  });

  var hardBox = $("[data-hard]");
  if (hardBox) {
    hardBox.checked = state.hard;
    hardBox.addEventListener("change", function () {
      state.hard = hardBox.checked;
      SG.store.set("wordle:hard", state.hard);
    });
  }

  /* ---------------------------------------------------------------- boot */
  newGame();
})(window, document);
