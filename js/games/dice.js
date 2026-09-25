/* ==========================================================================
   Dice Roll — 1-6 dice, d4 to d20, animated, with roll history
   ========================================================================== */
(function (win, doc) {
  "use strict";

  var $ = SG.$, $$ = SG.$$;
  var tray = $("[data-tray]");
  if (!tray) return;

  var GAME = "dice";
  var hud = SG.hud({ total: 1, count: 1, rounds: 1, best: 1 });

  var config = {
    qty: SG.clamp(parseInt(SG.store.get("dice:qty", 1), 10) || 1, 1, 6),
    sides: SG.clamp(parseInt(SG.store.get("dice:sides", 6), 10) || 6, 4, 20)
  };
  var SIDE_CHOICES = [4, 6, 8, 10, 12, 20];

  var state = { rolling: false, rounds: 0, total: 0, history: [] };

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

  function bump(el) {
    if (!el || SG.reduceMotion()) return;
    el.classList.remove("is-bump");
    void el.offsetWidth;
    el.classList.add("is-bump");
  }

  /* ------------------------------------------------------------- die UI */
  function usePips() { return config.sides === 6; }

  function makeDie() {
    var d = doc.createElement("div");
    d.className = "die die--6";
    d.setAttribute("data-face", "6");
    d.setAttribute("role", "img");
    d.setAttribute("aria-label", "Die showing 6");
    if (usePips()) {
      for (var i = 0; i < 6; i++) {
        var pip = doc.createElement("span");
        pip.className = "die__pip";
        d.appendChild(pip);
      }
    } else {
      var num = doc.createElement("span");
      num.className = "die__num";
      d.appendChild(num);
    }
    return d;
  }

  /* value 1..20 -> pip count (only meaningful for d6) */
  function paintDie(die, value) {
    var n = SG.clamp(value, 1, config.sides);
    if (usePips()) {
      var pips = SG.clamp(n, 1, 6);
      die.className = "die die--" + pips;
      die.setAttribute("data-face", String(pips));
      $$(".die__pip", die).forEach(function (p, i) {
        p.classList.toggle("is-on", i < pips);
      });
    } else {
      die.className = "die die--num is-pips-off";
      die.setAttribute("data-face", String(((n - 1) % 6) + 1));
      var num = $(".die__num", die);
      if (num) num.textContent = n;
    }
    die.setAttribute("aria-label", "Die showing " + n);
  }

  function syncTray() {
    var wantPips = usePips();
    var current = $$(".die", tray);

    /* switching between pip and numeric dice changes the internal markup */
    if (current.length && wantPips !== !!$(".die__pip", current[0])) {
      current.forEach(function (d) { d.parentNode.removeChild(d); });
      current = [];
    }

    while (current.length < config.qty) {
      var d = makeDie();
      tray.appendChild(d);
      current.push(d);
    }
    while (current.length > config.qty) {
      var extra = current.pop();
      extra.parentNode.removeChild(extra);
    }
  }

  function paintHud() {
    hud.set("count", config.qty + "d" + config.sides);
    hud.set("rounds", state.rounds);
    var best = SG.scores.get(GAME);
    hud.set("best", best ? best.label : "—");
  }

  function paintIdle() {
    syncTray();
    $$(".die", tray).forEach(function (d) {
      paintDie(d, usePips() ? 6 : config.sides);
    });
    $("[data-total]").textContent = "0";
    hud.set("total", 0);
    paintHud();
  }

  /* -------------------------------------------------------------- roll */
  function roll() {
    if (state.rolling) return;
    state.rolling = true;
    state.rounds++;
    SG.stats.play(GAME);

    var btn = $("[data-roll]");
    btn.setAttribute("aria-disabled", "true");
    syncTray();

    var dice = $$(".die", tray);
    var startedAt = Date.now();

    var rattle = win.setInterval(function () {
      dice.forEach(function (d) {
        paintDie(d, SG.randInt(1, config.sides));
      });
      if (Date.now() - startedAt > 400 && Math.random() > 0.55) SG.sound.play("tick");
    }, 55);

    SG.sound.play("roll");
    dice.forEach(function (d) { d.classList.add("is-rolling"); });

    win.setTimeout(function () {
      win.clearInterval(rattle);
      dice.forEach(function (d) { d.classList.remove("is-rolling"); });

      var values = [];
      var total = 0;
      for (var i = 0; i < config.qty; i++) {
        var v = SG.randInt(1, config.sides);
        values.push(v);
        total += v;
        paintDie(dice[i], v);
        dice[i].setAttribute("aria-label", "Die " + (i + 1) + " showing " + v);
      }

      state.total = total;
      state.history.unshift({ values: values, total: total });
      if (state.history.length > 12) state.history.pop();

      var totalEl = $("[data-total]");
      totalEl.textContent = total;
      bump(totalEl);
      hud.set("total", total, true);
      hud.set("rounds", state.rounds);
      renderHistory();

      if (total === config.qty * config.sides) SG.sound.play("bigwin");
      else if (total >= config.sides * config.qty * 0.75) SG.sound.play("win");
      else if (total === config.qty) SG.sound.play("wrong");

      var res = SG.scores.submit(GAME, total, String(total));
      if (res.isBest && state.rounds > 1) {
        SG.toast({
          icon: "🎯",
          title: "New best total: " + total,
          sub: values.join(" + ") + " on " + config.qty + "d" + config.sides
        });
        SG.confetti.burst(60);
      }
      paintHud();

      btn.removeAttribute("aria-disabled");
      state.rolling = false;
    }, 620);
  }

  function renderHistory() {
    var host = $("[data-history]");
    if (!host) return;
    if (!state.history.length) {
      host.innerHTML = '<span class="glass-chip">no rolls yet &mdash; press <b>Roll</b></span>';
      return;
    }
    host.innerHTML = state.history.map(function (h) {
      return '<span class="history__chip" title="' + h.values.join(" + ") + '">' +
        h.total + ' <small>' + config.qty + "d" + config.sides + "</small></span>";
    }).join("");
  }

  /* ---------------------------------------------------------- controls */
  bindSeg("data-qty", function (v) {
    config.qty = parseInt(v, 10);
    SG.store.set("dice:qty", config.qty);
    paintIdle();
  });

  bindSeg("data-sides", function (v) {
    config.sides = parseInt(v, 10);
    SG.store.set("dice:sides", config.sides);
    state.history = [];
    renderHistory();
    paintIdle();
  });

  $("[data-roll]").addEventListener("click", roll);

  $("[data-clear]").addEventListener("click", function () {
    state.history = [];
    renderHistory();
    SG.sound.play("click");
  });

  doc.addEventListener("keydown", function (e) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    var t = e.target;
    if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
    var k = e.key.toLowerCase();
    if (k === " " || k === "r") { e.preventDefault(); roll(); }
    else if (k >= "1" && k <= "6") { clickSeg("data-qty", k); }
  });

  function clickSeg(attr, value) {
    var btn = doc.querySelector("button[" + attr + '="' + value + '"]');
    if (btn) btn.click();
  }

  /* -------------------------------------------------------------- boot */
  syncPressed("data-qty", String(config.qty));
  syncPressed("data-sides", String(config.sides));
  paintIdle();
  renderHistory();
})(window, document);
