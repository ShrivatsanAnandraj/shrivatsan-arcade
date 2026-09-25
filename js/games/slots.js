/* ==========================================================================
   777 Slots — three-reel machine with a real paytable and credit system
   ========================================================================== */
(function (win, doc) {
  "use strict";

  var $ = SG.$, $$ = SG.$$;
  var reelsHost = $("[data-reels]");
  if (!reelsHost) return;

  var GAME = "slots";
  var hud = SG.hud({ last: 1, spins: 1, bet: 1, best: 1 });

  /* ---------------------------------------------------------- symbols */
  var SEVEN = "7";
  var BAR = "BAR";
  var SYMBOLS = [SEVEN, BAR, "🍒", "🔔", "💎", "★"];

  function symHTML(sym) {
    if (sym === BAR) return '<span class="reel__sym__bar">' + BAR + "</span>";
    if (sym === SEVEN) return '<span class="reel__sym__7">' + SEVEN + "</span>";
    return sym;
  }

  var PAY = {
    triple7: 60,
    sevenSevenBar: 25,
    tripleBar: 20,
    triple: 8,
    pair: 2
  };

  var TURNS = 6;          // full symbol heights a reel travels per spin
  var REEL_DELAY = [0, 170, 340];

  var config = { bet: SG.clamp(parseInt(SG.store.get("slots:bet", 10), 10) || 10, 5, 50) };
  var state = {
    credits: SG.clamp(parseInt(SG.store.get("slots:credits", 500), 10), 0, 1000000) || 500,
    spins: 0,
    spinning: false,
    log: []
  };

  var reels = $$(".reel", reelsHost);
  var result = [null, null, null];

  /* ------------------------------------------------------------ helpers */
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
        SG.sound.play("click");
      });
    });
  }

  function symbolHeight() {
    var probe = doc.createElement("div");
    probe.className = "reel__sym";
    probe.textContent = SEVEN;
    reels[0].appendChild(probe);
    var h = probe.offsetHeight || 120;
    reels[0].removeChild(probe);
    return h;
  }
  function paintHud() {
    $("[data-credits]").textContent = SG.fmt(state.credits);
    hud.set("bet", config.bet);
    hud.set("spins", state.spins);
    var best = SG.scores.get(GAME);
    hud.set("best", best ? best.label : "—");
  }

  function saveCredits() { SG.store.set("slots:credits", state.credits); }

  /* ----------------------------------------------------- reel mechanics */
  function buildStrip(reel, finalSymbol) {
    var strip = $(".reel__strip", reel);
    strip.classList.remove("reel__strip--spin");
    /* suppress the transition while we reposition, so the reset is instant */
    strip.style.transition = "none";
    strip.style.transform = "translateY(0)";

    var html = "";
    for (var i = 0; i < TURNS; i++) {
      html += '<div class="reel__sym">' + symHTML(SG.pick(SYMBOLS)) + "</div>";
    }
    html += '<div class="reel__sym" data-landing="1">' + symHTML(finalSymbol) + "</div>";
    strip.innerHTML = html;

    /* commit the reset, then hand control back to the class-based transition */
    void strip.offsetWidth;
    strip.style.transition = "";
    return strip;
  }

  function spinReel(reel, idx, finalSymbol) {
    return new Promise(function (resolve) {
      var h = symbolHeight();
      var strip = buildStrip(reel, finalSymbol);
      void strip.offsetWidth;

      var duration = 1500 + idx * 260;
      strip.classList.add("reel__strip--spin");
      strip.style.setProperty("--dur", duration + "ms");
      strip.style.transform = "translateY(" + -(TURNS * h) + "px)";

      SG.sound.play("reel", idx * 180);

      var settled = false;
      var finish = function () {
        if (settled) return;
        settled = true;
        reel.removeEventListener("transitionend", onEnd);
        resolve();
      };
      var onEnd = function (e) {
        if (e.propertyName !== "transform") return;
        finish();
      };
      reel.addEventListener("transitionend", onEnd);
      win.setTimeout(finish, duration + 320); // fallback
    });
  }

  /* ------------------------------------------------------------ payouts */
  function evaluate(symbols) {
    var a = symbols[0], b = symbols[1], c = symbols[2];
    if (a === SEVEN && b === SEVEN && c === SEVEN) return { mult: PAY.triple7, name: "JACKPOT" };
    if (a === SEVEN && b === SEVEN && c === BAR) return { mult: PAY.sevenSevenBar, name: "777 bar" };
    if (a === BAR && b === BAR && c === BAR) return { mult: PAY.tripleBar, name: "three bars" };
    if (a === b && b === c) return { mult: PAY.triple, name: "three of a kind" };
    if (a === b || b === c || a === c) return { mult: PAY.pair, name: "a pair" };
    return { mult: 0, name: "no win" };
  }

  /* --------------------------------------------------------------- spin */
  /* multiplier 1 = normal spin, 5 = "Spin max": stakes (and pays) 5x the bet */
  function spin(multiplier) {
    if (state.spinning) return;
    var multiplier = multiplier || 1;
    var bet = config.bet * multiplier;
    var cost = bet;

    if (state.credits < cost) {
      if (state.credits <= 0) refill();
      if (state.credits < cost) {
        SG.sound.play("lose");
        SG.toast({
          icon: "💸",
          title: "Not enough credits",
          sub: "Lower the bet or refill for another 500.",
          duration: 2600
        });
        return;
      }
    }

    state.spinning = true;
    state.spins++;
    SG.stats.play(GAME);

    state.credits -= cost;
    saveCredits();
    paintHud();

    var btn = $("[data-spin]");
    var btnMax = $("[data-max]");
    btn.setAttribute("aria-disabled", "true");
    btnMax.setAttribute("aria-disabled", "true");
    hud.set("last", 0, true);

    var finals = [];
    for (var i = 0; i < 3; i++) finals.push(SG.pick(SYMBOLS));
    result = finals;

    reels.forEach(function (r) { r.classList.remove("is-win"); });

    var jobs = reels.map(function (reel, idx) {
      return new Promise(function (res) {
        win.setTimeout(function () { spinReel(reel, idx, finals[idx]).then(res); }, REEL_DELAY[idx]);
      });
    });

    Promise.all(jobs).then(function () {
      settle(finals, bet);
      state.spinning = false;
      btn.removeAttribute("aria-disabled");
      btnMax.removeAttribute("aria-disabled");
    });
  }

  function settle(symbols, bet) {
    var out = evaluate(symbols);
    var payout = out.mult * bet;

    if (payout > 0) {
      state.credits += payout;
      saveCredits();
      hud.set("last", payout, true);

      if (out.mult >= PAY.triple7) {
        reels.forEach(function (r) { r.classList.add("is-win"); });
        SG.sound.chord("bigwin", [0, 4, 7, 12]);
        SG.confetti.rain(150);
        SG.toast({
          icon: "🎆",
          title: "JACKPOT — " + SG.fmt(payout),
          sub: "Three sevens at " + out.mult + "x your " + bet + " bet.",
          duration: 5200
        });
      } else if (out.mult >= PAY.tripleBar || out.mult === PAY.triple) {
        reels.forEach(function (r) { r.classList.add("is-win"); });
        SG.sound.chord("win", [0, 4, 7]);
        SG.confetti.burst(90);
        SG.toast({
          icon: "💰",
          title: out.name + " — " + SG.fmt(payout),
          sub: out.mult + "x your " + bet + " bet."
        });
      } else {
        SG.sound.play("win");
        SG.toast({ icon: "🍀", title: out.name + " — " + SG.fmt(payout), sub: "2x returned." });
      }
      SG.stats.win(GAME);
    } else {
      SG.sound.play("lose");
    }

    var res = SG.scores.submit(GAME, payout, SG.fmt(payout));
    if (res.isBest && payout > 0) {
      win.setTimeout(function () {
        SG.toast({ icon: "⭐", title: "New biggest win: " + SG.fmt(payout) });
      }, 900);
    }

    state.log.unshift({ text: symbols.join(" ") + " · " + (payout ? "+" + SG.fmt(payout) : "—"), win: payout > 0 });
    if (state.log.length > 8) state.log.pop();
    renderLog();
    paintHud();
  }

  function renderLog() {
    var host = $("[data-slot-log]");
    if (!host) return;
    if (!state.log.length) {
      host.innerHTML = '<span class="glass-chip">spin to start the log</span>';
      return;
    }
    host.innerHTML = state.log.map(function (l) {
      return '<span class="slot-log__item' + (l.win ? " is-win" : "") + '">' + l.text + "</span>";
    }).join("");
  }

  function refill() {
    state.credits = 500;
    saveCredits();
    paintHud();
    SG.sound.chord("win", [0, 5, 9]);
    SG.toast({ icon: "💳", title: "Credits refilled to 500", sub: "The house thanks you for your business." });
  }

  /* ---------------------------------------------------------- controls */
  bindSeg("data-bet", function (v) {
    config.bet = parseInt(v, 10);
    SG.store.set("slots:bet", config.bet);
    paintHud();
  });

  $("[data-spin]").addEventListener("click", function () { spin(1); });
  $("[data-max]").addEventListener("click", function () { spin(5); });
  $("[data-refill]").addEventListener("click", function () {
    if (state.credits >= 500) {
      SG.toast({ icon: "💳", title: "Already topped up", sub: "Refill only when you run dry." });
      return;
    }
    refill();
  });

  doc.addEventListener("keydown", function (e) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    var t = e.target;
    if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
    if (e.key === " " || e.key.toLowerCase() === "s") {
      if (t && t.tagName === "BUTTON" && e.key === "Enter") return;
      e.preventDefault();
      spin(1);
    }
  });

  /* -------------------------------------------------------------- boot */
  syncPressed("data-bet", String(config.bet));
  paintHud();
  renderLog();
  /* park each reel on a random symbol so the machine is never empty */
  reels.forEach(function (reel) {
    buildStrip(reel, SG.pick(SYMBOLS));
    var h = symbolHeight();
    $(".reel__strip", reel).style.transform = "translateY(" + -(h * SG.randInt(0, TURNS - 1)) + "px)";
  });

  if (state.credits <= 0) state.credits = 500;
})(window, document);
