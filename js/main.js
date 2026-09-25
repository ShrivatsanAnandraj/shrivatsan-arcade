/* ==========================================================================
   shrivatsan.games — shared page chrome + landing page logic
   Requires: js/core.js (window.SG)
   ========================================================================== */
(function (win, doc) {
  "use strict";

  var $ = SG.$, $$ = SG.$$;
  var ORDER = ["memory", "dice", "slots", "pong", "ttt", "snake", "mole", "g2048"];

  /* ------------------------------------------------------- sticky nav */
  var nav = $(".nav");
  if (nav) {
    var onScroll = function () {
      nav.classList.toggle("is-stuck", win.scrollY > 8);
    };
    onScroll();
    win.addEventListener("scroll", onScroll, { passive: true });
  }

  /* ------------------------------------------------------- mobile menu */
  var burger = $("[data-nav-toggle]");
  var links = $("[data-nav-menu]");
  if (burger && links) {
    burger.addEventListener("click", function () {
      var open = links.classList.toggle("is-open");
      burger.setAttribute("aria-expanded", String(open));
      burger.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    });
    links.addEventListener("click", function (e) {
      if (e.target.closest("a")) {
        links.classList.remove("is-open");
        burger.setAttribute("aria-expanded", "false");
      }
    });
    doc.addEventListener("click", function (e) {
      if (!links.classList.contains("is-open")) return;
      if (e.target.closest("[data-nav-toggle]") || e.target.closest("[data-nav-menu]")) return;
      links.classList.remove("is-open");
      burger.setAttribute("aria-expanded", "false");
    });
    doc.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && links.classList.contains("is-open")) {
        links.classList.remove("is-open");
        burger.setAttribute("aria-expanded", "false");
        burger.focus();
      }
    });
  }

  /* -------------------------------------------------------- theme toggle */
  var themeBtn = $("[data-theme-toggle]");
  if (themeBtn) {
    var syncThemeLabel = function () {
      themeBtn.setAttribute(
        "aria-label",
        SG.theme.get() === "light" ? "Switch to dark theme" : "Switch to light theme"
      );
      themeBtn.setAttribute("title", "Toggle theme");
    };
    syncThemeLabel();
    themeBtn.addEventListener("click", function () {
      var next = SG.theme.toggle();
      syncThemeLabel();
      SG.sound.play("click");
      SG.toast({ icon: next === "light" ? "☀️" : "🌙", title: next === "light" ? "Light mode" : "Dark mode" });
    });
  }

  /* -------------------------------------------------------- sound toggle */
  $$("[data-sound-toggle]").forEach(function (btn) {
    var sync = function () {
      var on = SG.sound.enabled();
      btn.setAttribute("aria-pressed", String(on));
      btn.title = on ? "Sound on" : "Sound off";
      var label = btn.querySelector("[data-sound-label]");
      if (label) label.textContent = on ? "Sound on" : "Sound off";
      btn.classList.toggle("is-off", !on);
    };
    sync();
    btn.addEventListener("click", function () {
      SG.sound.toggle();
      sync();
      if (SG.sound.enabled()) SG.sound.play("tap");
    });
  });

  /* ------------------------------------------------------------- ripple */
  doc.addEventListener("pointerdown", function (e) {
    if (!e.target || !e.target.closest) return;
    var btn = e.target.closest(".btn, .icon-btn");
    if (btn && !btn.hasAttribute("disabled") && !btn.hasAttribute("aria-disabled")) {
      SG.ripple(e, btn);
    }
  });

  /* ------------------------------------------------------------- reveal */
  SG.reveal();

  /* --------------------------------------------------------- active nav */
  var here = (win.location.pathname.split("/").pop() || "index.html").toLowerCase();
  $$("[data-nav-link]").forEach(function (a) {
    var target = (a.getAttribute("href") || "").split("#")[0].split("/").pop().toLowerCase();
    if (target && target === here) a.setAttribute("aria-current", "page");
  });

  /* ======================================================================
     Landing page
     ====================================================================== */
  var grid = $("[data-games-grid]");
  if (grid) {
    var BLURB = {
      memory: "Flip the cards, match every pair. Track moves, streak your best time and chase a perfect board.",
      dice:  "Roll one, two or a whole handful. Keeps history, tallies totals and finds your lucky faces.",
      slots: "Three reels, seven ways to win. Watch the spin land and try to beat the jackpot.",
      pong:  "You versus an adaptive AI paddle. First to eleven takes the table, rally as long as you can.",
      ttt:   "Outsmart an unbeatable engine or pass the device. Perfect play never loses.",
      snake: "Classic snake, modern speed. Dodge, grow and set a new high score before you crash.",
      mole:  "Fast hands, faster moles. Thirty seconds, rising difficulty, one very satisfying bonk.",
      g2048: "Slide the tiles, chase the 2048 tile. Swipe on touch, arrow keys on desktop."
    };

    var bests = SG.scores.all();

    var html = ORDER.map(function (id, i) {
      var g = SG.GAMES[id];
      var best = bests[id];
      return (
        '<a class="gcard reveal" href="games/' + id + '.html" data-game="' + id + '"' +
        ' style="--tint:' + g.tint + ';--d:' + (i % 4) * 70 + 'ms" aria-label="Play ' + g.name + '">' +
          '<div class="gcard__top">' +
            '<span class="gcard__icon" aria-hidden="true">' + g.icon + "</span>" +
            '<span class="gcard__tag">Classic</span>' +
          "</div>" +
          "<h3>" + g.name + "</h3>" +
          "<p>" + BLURB[id] + "</p>" +
          '<div class="gcard__foot">' +
            '<span class="gcard__best">' + g.bestLabel + " <b data-best=\"" + id + "\">" +
              (best ? best.label : "—") + "</b></span>" +
            '<span class="gcard__go">Play <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
              'stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
              '<path d="M5 12h14M13 6l6 6-6 6"/></svg></span>' +
          "</div>" +
        "</a>"
      );
    }).join("");

    grid.innerHTML = html;
    SG.reveal(grid);

    /* mark games with a recorded best */
    Object.keys(bests).forEach(function (id) {
      var chip = grid.querySelector('[data-best="' + id + '"]');
      if (chip) chip.textContent = bests[id].label;
    });
  }

  /* headline stats */
  var stats = SG.stats.data();
  var setStat = function (sel, val) {
    var el = $(sel);
    if (el) el.textContent = val;
  };
  setStat("[data-stat-games]", ORDER.length || Object.keys(SG.GAMES).length);
  setStat("[data-stat-plays]", SG.fmt(stats.plays));
  setStat("[data-stat-wins]", SG.fmt(stats.wins));
  setStat(
    "[data-stat-bests]",
    SG.fmt(Object.keys(SG.scores.all()).length)
  );
  var rate = stats.plays ? Math.round((stats.wins / stats.plays) * 100) : 0;
  setStat("[data-stat-rate]", rate + "%");

  /* live clock in the footer */
  var clock = $("[data-clock]");
  if (clock) {
    var tick = function () {
      clock.textContent = new Date().toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit"
      });
    };
    tick();
    win.setInterval(tick, 15000);
  }

  /* --------------------------------------------------- keyboard shortcuts */
  if (grid) {
    doc.addEventListener("keydown", function (e) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      var t = e.target;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      var n = parseInt(e.key, 10);
      if (n >= 1 && n <= ORDER.length) {
        win.location.href = "games/" + ORDER[n - 1] + ".html";
      }
    });
  }

  /* first-visit greeting */
  if (!SG.store.get("seen", false)) {
    SG.store.set("seen", true);
    win.setTimeout(function () {
      SG.toast({
        icon: "🎮",
        title: "Welcome to the arcade",
        sub: "Press 1–8 to jump straight into a game.",
        duration: 4600
      });
    }, 1200);
  }
})(window, document);
