# Generates the static game pages from one shared template.
# Run:  powershell -File tools\gen-pages.ps1   (from the repo root)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$out  = Join-Path $root "games"
if (-not (Test-Path -LiteralPath $out)) { New-Item -ItemType Directory -Path $out | Out-Null }

$head = @'
<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>__H1__ &middot; shrivatsan.games</title>
<meta name="description" content="__DESC__">
<meta name="theme-color" content="#05070f">
<meta name="color-scheme" content="dark light">
<meta property="og:title" content="__H1__ &middot; shrivatsan.games">
<meta property="og:description" content="__DESC__">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' rx='26' fill='%237c5cff'/%3E%3Ctext x='50' y='71' font-size='62' font-family='Verdana' font-weight='bold' fill='white' text-anchor='middle'%3ES%3C/text%3E%3C/svg%3E">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700;800;900&family=JetBrains+Mono:wght@500;700;800&display=swap">
<link rel="stylesheet" href="../css/style.css">
<link rel="stylesheet" href="../css/games.css">
</head>
<body>

<div class="bg" aria-hidden="true">
  <div class="bg__grid"></div>
  <div class="blob blob--a"></div>
  <div class="blob blob--b"></div>
  <div class="blob blob--c"></div>
  <div class="bg__noise"></div>
</div>

<header class="nav">
  <div class="nav__inner">
    <a class="brand" href="../index.html">
      <span class="brand__mark" aria-hidden="true">S</span>
      <span class="brand-text">shrivatsan<em>.games</em></span>
    </a>

    <nav class="nav__links" id="nav-menu" data-nav-menu aria-label="Primary">
      <a href="../index.html#games" data-nav-link>Games</a>
      <a href="../index.html#stats" data-nav-link>Stats</a>
      <a href="../index.html#why" data-nav-link>Why</a>
      <a href="../index.html#about" data-nav-link>About</a>
      <a class="btn btn--primary btn--sm nav__cta-desktop" href="../index.html#games">Play free</a>
    </nav>

    <div class="nav__actions">
      <button class="icon-btn theme-toggle" data-theme-toggle type="button" aria-label="Toggle theme">
        <svg class="icon-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z"/>
        </svg>
        <svg class="icon-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="4"/>
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>
        </svg>
      </button>
      <button class="icon-btn" data-nav-toggle type="button" aria-label="Open menu" aria-expanded="false" aria-controls="nav-menu">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
          <path d="M3 6h18M3 12h18M3 18h18"/>
        </svg>
      </button>
    </div>
  </div>
</header>

<main class="game-page">
  <div class="shell">

    <div class="game-head">
      <div class="game-head__title">
        <a class="backlink" href="../index.html#games">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 12H5M11 18l-6-6 6-6"/></svg>
          All games
        </a>
        <div class="row" style="gap:14px">
          <span class="game-icon" aria-hidden="true">__ICON__</span>
          <h1>__H1__</h1>
        </div>
        <p>__LEDE__</p>
      </div>
      <div class="game-head__side">
        <button class="icon-btn" data-sound-toggle type="button" aria-pressed="true" aria-label="Toggle sound" title="Sound on">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M11 5 6 9H2v6h4l5 4V5Z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M18.5 5.5a9 9 0 0 1 0 13"/>
          </svg>
        </button>
        <a class="btn btn--soft btn--sm" href="../index.html">Home</a>
      </div>
    </div>

    <div style="--tint:__TINT__">
__BODY__
    </div>

  </div>
</main>

<footer class="footer">
  <div class="shell footer__inner">
    <div>
      <a class="brand" href="../index.html">
        <span class="brand__mark" aria-hidden="true">S</span>
        <span class="brand-text">shrivatsan<em>.games</em></span>
      </a>
      <p class="footer__note" style="margin-top:10px">Hand-coded arcade &middot; scores stay on your device.</p>
    </div>
    <nav class="footer__links" aria-label="Footer">
      <a href="../index.html#games">Games</a>
      <a href="../index.html#stats">Stats</a>
      <a href="../index.html#about">About</a>
    </nav>
  </div>
</footer>

<script src="../js/core.js"></script>
<script src="../js/main.js"></script>
<script src="../js/games/__ID__.js"></script>
</body>
</html>
'@

# ---------------------------------------------------------------- memory
$memory = @'
      <div class="hud">
        <div class="hud__cell"><span class="hud__k">Moves</span><span class="hud__v" data-hud="moves">0</span></div>
        <div class="hud__cell"><span class="hud__k">Pairs</span><span class="hud__v" data-hud="pairs">0/8</span></div>
        <div class="hud__cell"><span class="hud__k">Time</span><span class="hud__v" data-hud="time">0:00</span></div>
        <div class="hud__cell hud__cell--accent"><span class="hud__k">Best</span><span class="hud__v" data-hud="best">&mdash;</span></div>
      </div>

      <div class="toolbar">
        <div class="toolbar__group">
          <span class="toolbar__label">Board</span>
          <div class="seg" role="group" aria-label="Board size">
            <button type="button" data-cols="4" aria-pressed="true">Easy 4&times;4</button>
            <button type="button" data-cols="6" aria-pressed="false">Hard 6&times;6</button>
          </div>
        </div>
        <div class="toolbar__group">
          <span class="toolbar__label">Deck</span>
          <div class="seg" role="group" aria-label="Card set">
            <button type="button" data-set="fruit" aria-pressed="true">Fruit</button>
            <button type="button" data-set="space" aria-pressed="false">Space</button>
            <button type="button" data-set="food" aria-pressed="false">Food</button>
          </div>
        </div>
        <span class="spacer"></span>
        <label class="switch">
          <input type="checkbox" data-autopeek>
          <span class="switch__track"></span>
          Auto peek
        </label>
      </div>

      <div class="stage">
        <div class="memory-grid" data-grid style="--cols:4" role="grid" aria-label="Memory board"></div>
      </div>

      <div class="actions">
        <button class="btn btn--primary" type="button" data-new>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>
          New game
        </button>
        <button class="btn btn--ghost" type="button" data-peek-btn>Peek all</button>
      </div>

      <p class="hint">Flip two cards, match the pair. <kbd>N</kbd> new game &middot; <kbd>P</kbd> peek &middot; <kbd>1</kbd>/<kbd>2</kbd> board size</p>
'@

# ------------------------------------------------------------------ dice
$dice = @'
      <div class="hud">
        <div class="hud__cell"><span class="hud__k">Total</span><span class="hud__v" data-hud="total">0</span></div>
        <div class="hud__cell"><span class="hud__k">Dice</span><span class="hud__v" data-hud="count">1d6</span></div>
        <div class="hud__cell"><span class="hud__k">Rounds</span><span class="hud__v" data-hud="rounds">0</span></div>
        <div class="hud__cell hud__cell--accent"><span class="hud__k">Best total</span><span class="hud__v" data-hud="best">&mdash;</span></div>
      </div>

      <div class="toolbar">
        <div class="toolbar__group">
          <span class="toolbar__label">How many</span>
          <div class="seg" role="group" aria-label="Number of dice">
            <button type="button" data-qty="1" aria-pressed="true">1</button>
            <button type="button" data-qty="2" aria-pressed="false">2</button>
            <button type="button" data-qty="3" aria-pressed="false">3</button>
            <button type="button" data-qty="4" aria-pressed="false">4</button>
            <button type="button" data-qty="5" aria-pressed="false">5</button>
            <button type="button" data-qty="6" aria-pressed="false">6</button>
          </div>
        </div>
        <div class="toolbar__group">
          <span class="toolbar__label">Sides</span>
          <div class="seg" role="group" aria-label="Die type">
            <button type="button" data-sides="4" aria-pressed="false">d4</button>
            <button type="button" data-sides="6" aria-pressed="true">d6</button>
            <button type="button" data-sides="8" aria-pressed="false">d8</button>
            <button type="button" data-sides="10" aria-pressed="false">d10</button>
            <button type="button" data-sides="12" aria-pressed="false">d12</button>
            <button type="button" data-sides="20" aria-pressed="false">d20</button>
          </div>
        </div>
      </div>

      <div class="stage dice-stage">
        <div class="dice-tray" data-tray aria-live="polite"></div>
        <div class="dice-total">
          <span class="dice-total__n" data-total>0</span>
          <span class="toolbar__label">sum of the roll</span>
        </div>
        <div class="history" data-history></div>
      </div>

      <div class="actions">
        <button class="btn btn--primary btn--lg" type="button" data-roll>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a9 9 0 1 1-3-6.7"/><path d="M21 3v6h-6"/></svg>
          Roll
        </button>
        <button class="btn btn--ghost" type="button" data-clear>Clear history</button>
      </div>

      <p class="hint">Press <kbd>Space</kbd> or <kbd>R</kbd> to roll again.</p>
'@

# ----------------------------------------------------------------- slots
$slots = @'
      <div class="hud">
        <div class="hud__cell"><span class="hud__k">Last win</span><span class="hud__v" data-hud="last">0</span></div>
        <div class="hud__cell"><span class="hud__k">Spins</span><span class="hud__v" data-hud="spins">0</span></div>
        <div class="hud__cell"><span class="hud__k">Bet</span><span class="hud__v" data-hud="bet">10</span></div>
        <div class="hud__cell hud__cell--accent"><span class="hud__k">Biggest win</span><span class="hud__v" data-hud="best">&mdash;</span></div>
      </div>

      <div class="toolbar">
        <div class="toolbar__group">
          <span class="toolbar__label">Bet</span>
          <div class="seg" role="group" aria-label="Bet size">
            <button type="button" data-bet="5" aria-pressed="false">5</button>
            <button type="button" data-bet="10" aria-pressed="true">10</button>
            <button type="button" data-bet="25" aria-pressed="false">25</button>
            <button type="button" data-bet="50" aria-pressed="false">50</button>
          </div>
        </div>
        <span class="spacer"></span>
        <div class="toolbar__group">
          <span class="toolbar__label">Sound</span>
          <span class="glass-chip">win <b>&times;12</b> &middot; jackpot <b>&times;60</b></span>
        </div>
      </div>

      <div class="stage slots-stage">
        <div class="machine">
          <div class="machine__marquee">777</div>
          <div class="reels" data-reels>
            <div class="reel" data-reel="0"><div class="reel__strip"></div><div class="reel__win"></div></div>
            <div class="reel" data-reel="1"><div class="reel__strip"></div><div class="reel__win"></div></div>
            <div class="reel" data-reel="2"><div class="reel__strip"></div><div class="reel__win"></div></div>
          </div>
        </div>

        <div class="credits"><small>CREDITS</small> <span data-credits>500</span></div>
        <div class="slot-log" data-slot-log aria-live="polite"></div>
      </div>

      <div class="actions">
        <button class="btn btn--primary btn--lg" type="button" data-spin>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/><circle cx="12" cy="12" r="4"/></svg>
          Spin
        </button>
        <button class="btn btn--ghost" type="button" data-max>Spin max</button>
        <button class="btn btn--ghost" type="button" data-refill>Refill credits</button>
      </div>

      <div class="panel panel--pad" style="margin-top:22px">
        <table class="slot-paytable">
          <caption class="sr-only">Payout table</caption>
          <thead><tr><th scope="col">Combination</th><th scope="col">Payout</th></tr></thead>
          <tbody>
            <tr><td><span class="sym">7</span> 7 7 &mdash; jackpot</td><td>&times;60</td></tr>
            <tr><td><span class="sym">7</span> 7 bar</td><td>&times;25</td></tr>
            <tr><td>Three bars</td><td>&times;20</td></tr>
            <tr><td>Three of a kind (other)</td><td>&times;8</td></tr>
            <tr><td>Any two matching</td><td>&times;2</td></tr>
          </tbody>
        </table>
      </div>

      <p class="hint">Press <kbd>Space</kbd> to spin. Credits refill to 500 whenever you run dry.</p>
'@

# ------------------------------------------------------------------ pong
$pong = @'
      <div class="hud">
        <div class="hud__cell"><span class="hud__k">You</span><span class="hud__v" data-hud="you">0</span></div>
        <div class="hud__cell"><span class="hud__k">CPU</span><span class="hud__v" data-hud="cpu">0</span></div>
        <div class="hud__cell"><span class="hud__k">Rally</span><span class="hud__v" data-hud="rally">0</span></div>
        <div class="hud__cell hud__cell--accent"><span class="hud__k">Best</span><span class="hud__v" data-hud="best">&mdash;</span></div>
      </div>

      <div class="toolbar">
        <div class="toolbar__group">
          <span class="toolbar__label">CPU</span>
          <div class="seg" role="group" aria-label="Difficulty">
            <button type="button" data-diff="0" aria-pressed="false">Rookie</button>
            <button type="button" data-diff="1" aria-pressed="true">Pro</button>
            <button type="button" data-diff="2" aria-pressed="false">Ace</button>
          </div>
        </div>
        <div class="toolbar__group">
          <span class="toolbar__label">Target</span>
          <div class="seg" role="group" aria-label="Target score">
            <button type="button" data-goal="7" aria-pressed="false">7</button>
            <button type="button" data-goal="11" aria-pressed="true">11</button>
            <button type="button" data-goal="15" aria-pressed="false">15</button>
          </div>
        </div>
        <span class="spacer"></span>
        <label class="switch">
          <input type="checkbox" data-trails checked>
          <span class="switch__track"></span>
          Ball trail
        </label>
      </div>

      <div class="stage stage--bare" style="margin-top:4px">
        <div class="pong-wrap">
          <canvas data-canvas aria-label="Ping pong table" role="img"></canvas>
          <div class="pong-overlay" data-overlay>
            <h2 data-overlay-title>Ping Pong</h2>
            <p data-overlay-text>Move the mouse, drag with your finger, or use <kbd>&uarr;</kbd> <kbd>&darr;</kbd> / <kbd>W</kbd> <kbd>S</kbd>. First to the target score wins.</p>
            <button class="btn btn--primary btn--lg" type="button" data-start>Start match</button>
          </div>
        </div>
      </div>

      <div class="actions">
        <button class="btn btn--primary" type="button" data-start>Start</button>
        <button class="btn btn--ghost" type="button" data-pause>Pause</button>
        <button class="btn btn--ghost" type="button" data-reset>Reset scores</button>
      </div>

      <p class="hint">The CPU tracks your paddle with a reaction delay that shrinks as difficulty climbs.</p>
'@

# ------------------------------------------------------------------- ttt
$ttt = @'
      <div class="hud">
        <div class="hud__cell"><span class="hud__k">You (X)</span><span class="hud__v" data-hud="x">0</span></div>
        <div class="hud__cell"><span class="hud__k">CPU (O)</span><span class="hud__v" data-hud="o">0</span></div>
        <div class="hud__cell"><span class="hud__k">Draws</span><span class="hud__v" data-hud="d">0</span></div>
        <div class="hud__cell hud__cell--accent"><span class="hud__k">Streak</span><span class="hud__v" data-hud="streak">0</span></div>
      </div>

      <div class="toolbar">
        <div class="toolbar__group">
          <span class="toolbar__label">Mode</span>
          <div class="seg" role="group" aria-label="Game mode">
            <button type="button" data-mode="ai" aria-pressed="true">Vs CPU</button>
            <button type="button" data-mode="friend" aria-pressed="false">Two players</button>
          </div>
        </div>
        <div class="toolbar__group" data-diff-group>
          <span class="toolbar__label">CPU</span>
          <div class="seg" role="group" aria-label="CPU skill">
            <button type="button" data-diff="easy" aria-pressed="false">Easy</button>
            <button type="button" data-diff="hard" aria-pressed="true">Unbeatable</button>
          </div>
        </div>
        <span class="spacer"></span>
        <label class="switch">
          <input type="checkbox" data-ai-starts>
          <span class="switch__track"></span>
          CPU starts
        </label>
      </div>

      <div class="stage">
        <div class="t3t-board" data-board role="grid" aria-label="Tic tac toe board">
          <button class="t3t-cell" type="button" role="gridcell" data-i="0" aria-label="Row 1 column 1"></button>
          <button class="t3t-cell" type="button" role="gridcell" data-i="1" aria-label="Row 1 column 2"></button>
          <button class="t3t-cell" type="button" role="gridcell" data-i="2" aria-label="Row 1 column 3"></button>
          <button class="t3t-cell" type="button" role="gridcell" data-i="3" aria-label="Row 2 column 1"></button>
          <button class="t3t-cell" type="button" role="gridcell" data-i="4" aria-label="Row 2 column 2"></button>
          <button class="t3t-cell" type="button" role="gridcell" data-i="5" aria-label="Row 2 column 3"></button>
          <button class="t3t-cell" type="button" role="gridcell" data-i="6" aria-label="Row 3 column 1"></button>
          <button class="t3t-cell" type="button" role="gridcell" data-i="7" aria-label="Row 3 column 2"></button>
          <button class="t3t-cell" type="button" role="gridcell" data-i="8" aria-label="Row 3 column 3"></button>
        </div>

        <div class="actions">
          <button class="btn btn--primary" type="button" data-new>New round</button>
          <button class="btn btn--ghost" type="button" data-reset-scores>Reset tally</button>
        </div>

        <p class="hint" data-status role="status">Your move &mdash; tap any square.</p>
      </div>
'@

# ----------------------------------------------------------------- snake
$snake = @'
      <div class="hud">
        <div class="hud__cell"><span class="hud__k">Score</span><span class="hud__v" data-hud="score">0</span></div>
        <div class="hud__cell"><span class="hud__k">Length</span><span class="hud__v" data-hud="len">3</span></div>
        <div class="hud__cell"><span class="hud__k">Speed</span><span class="hud__v" data-hud="speed">12</span></div>
        <div class="hud__cell hud__cell--accent"><span class="hud__k">Best</span><span class="hud__v" data-hud="best">&mdash;</span></div>
      </div>

      <div class="toolbar">
        <div class="toolbar__group">
          <span class="toolbar__label">Pace</span>
          <div class="seg" role="group" aria-label="Speed">
            <button type="button" data-speed="9" aria-pressed="false">Chill</button>
            <button type="button" data-speed="13" aria-pressed="true">Classic</button>
            <button type="button" data-speed="18" aria-pressed="false">Rapid</button>
          </div>
        </div>
        <span class="spacer"></span>
        <label class="switch">
          <input type="checkbox" data-wrap>
          <span class="switch__track"></span>
          Wrap walls
        </label>
        <label class="switch">
          <input type="checkbox" data-grid checked>
          <span class="switch__track"></span>
          Show grid
        </label>
      </div>

      <div class="stage stage--bare" style="margin-top:4px">
        <div class="snake-wrap">
          <canvas data-canvas aria-label="Snake play area" role="img"></canvas>
          <div class="pong-overlay" data-overlay>
            <h2 data-overlay-title>Snake</h2>
            <p data-overlay-text>Eat the food, grow longer, do not bite yourself. Every food is worth 10 points.</p>
            <button class="btn btn--primary btn--lg" type="button" data-start>Play</button>
          </div>
        </div>
      </div>

      <div class="actions">
        <button class="btn btn--primary" type="button" data-start>Play</button>
        <button class="btn btn--ghost" type="button" data-restart>Restart</button>
      </div>

      <p class="hint">Arrow keys or <kbd>WASD</kbd> to steer. Swipe on touch. <kbd>Space</kbd> pauses.</p>
'@

# ------------------------------------------------------------------ mole
$mole = @'
      <div class="hud">
        <div class="hud__cell"><span class="hud__k">Score</span><span class="hud__v" data-hud="score">0</span></div>
        <div class="hud__cell"><span class="hud__k">Best combo</span><span class="hud__v" data-hud="combo">0</span></div>
        <div class="hud__cell"><span class="hud__k">Time</span><span class="hud__v" data-hud="time">30</span></div>
        <div class="hud__cell hud__cell--accent"><span class="hud__k">Best</span><span class="hud__v" data-hud="best">&mdash;</span></div>
      </div>

      <div class="toolbar">
        <div class="toolbar__group">
          <span class="toolbar__label">Round</span>
          <div class="seg" role="group" aria-label="Round length">
            <button type="button" data-dur="20" aria-pressed="false">20s</button>
            <button type="button" data-dur="30" aria-pressed="true">30s</button>
            <button type="button" data-dur="60" aria-pressed="false">60s</button>
          </div>
        </div>
        <div class="toolbar__group">
          <span class="toolbar__label">Speed</span>
          <div class="seg" role="group" aria-label="Difficulty">
            <button type="button" data-diff="0" aria-pressed="true">Relaxed</button>
            <button type="button" data-diff="1" aria-pressed="false">Furious</button>
          </div>
        </div>
        <span class="spacer"></span>
        <span class="glass-chip">points <b>10</b> &middot; miss <b>-3</b> &middot; bad mole <b>-5</b></span>
      </div>

      <div class="stage">
        <div class="mole-grid" data-grid role="group" aria-label="Mole holes"></div>
        <div class="actions">
          <button class="btn btn--primary btn--lg" type="button" data-start>Start round</button>
        </div>
        <p class="hint" data-status role="status">Watch the holes &mdash; hit the moles, avoid the grey ones.</p>
      </div>
'@

# ------------------------------------------------------------------ 2048
$g2048 = @'
      <div class="hud">
        <div class="hud__cell"><span class="hud__k">Score</span><span class="hud__v" data-hud="score">0</span></div>
        <div class="hud__cell"><span class="hud__k">Moves</span><span class="hud__v" data-hud="moves">0</span></div>
        <div class="hud__cell"><span class="hud__k">Top tile</span><span class="hud__v" data-hud="top">2</span></div>
        <div class="hud__cell hud__cell--accent"><span class="hud__k">Best</span><span class="hud__v" data-hud="best">&mdash;</span></div>
      </div>

      <div class="toolbar">
        <div class="toolbar__group">
          <button class="btn btn--primary btn--sm" type="button" data-new>New game</button>
          <button class="btn btn--ghost btn--sm" type="button" data-undo>Undo</button>
        </div>
        <span class="spacer"></span>
        <span class="glass-chip">merge equal tiles to climb</span>
      </div>

      <div class="stage stage--bare" style="margin-top:4px">
        <div class="g2048" data-board>
          <div class="g2048__grid" aria-hidden="true">
            <div class="g2048__slot"></div><div class="g2048__slot"></div>
            <div class="g2048__slot"></div><div class="g2048__slot"></div>
            <div class="g2048__slot"></div><div class="g2048__slot"></div>
            <div class="g2048__slot"></div><div class="g2048__slot"></div>
            <div class="g2048__slot"></div><div class="g2048__slot"></div>
            <div class="g2048__slot"></div><div class="g2048__slot"></div>
            <div class="g2048__slot"></div><div class="g2048__slot"></div>
            <div class="g2048__slot"></div><div class="g2048__slot"></div>
          </div>
          <div class="g2048__tiles" data-tiles></div>
          <div class="g2048__win" data-win hidden>
            <h2>2048 reached!</h2>
            <p style="color:var(--text-2);max-width:34ch">Keep going for a bigger tile, or start fresh.</p>
            <div class="row" style="justify-content:center">
              <button class="btn btn--primary" type="button" data-keep-playing>Keep playing</button>
              <button class="btn btn--ghost" type="button" data-new>New game</button>
            </div>
          </div>
        </div>

        <div class="dpad">
          <button class="dpad__up" type="button" data-dir="up" aria-label="Move up">&#9650;</button>
          <button class="dpad__left" type="button" data-dir="left" aria-label="Move left">&#9664;</button>
          <button class="dpad__right" type="button" data-dir="right" aria-label="Move right">&#9654;</button>
          <button class="dpad__down" type="button" data-dir="down" aria-label="Move down">&#9660;</button>
        </div>
      </div>

      <p class="hint">Arrow keys or <kbd>WASD</kbd>. Swipe anywhere on the board.</p>
'@

# ------------------------------------------------------------------ specs
$games = @(
  @{ id = "memory"; icon = "&#127183;"; tint = "#7c5cff";
     h1 = "Memory Match"; desc = "Flip the cards and clear the board in as few moves as you can.";
     lede = "Find every pair before the clock does you in. Four deck themes, two board sizes and a peek button for when you are truly lost.";
     body = $memory },

  @{ id = "dice"; icon = "&#127922;"; tint = "#00cdf0";
     h1 = "Dice Roll"; desc = "A clean, animated dice roller with up to six dice and six-sided to twenty-sided variety.";
     lede = "One die or a whole handful, d4 through d20. Every roll is tallied and kept in history so you can settle arguments properly.";
     body = $dice },

  @{ id = "slots"; icon = "&#127920;"; tint = "#ff4d9d";
     h1 = "777 Slots"; desc = "Three-reel 777 slot machine with a full paytable, credit system and jackpot.";
     lede = "Spin the reels, watch for three sevens. Ten ways to win, a credit system that never lets you play for real, and a jackpot worth 60x your bet.";
     body = $slots },

  @{ id = "pong"; icon = "&#127881;"; tint = "#8bff6a";
     h1 = "Ping Pong"; desc = "Classic paddle game against an adaptive AI that reads your movement.";
     lede = "Mouse, touch or keyboard. Three difficulty tiers, rally counter, ball trails and a first-to-N match format.";
     body = $pong },

  @{ id = "ttt"; icon = "&#11034;"; tint = "#ffc94d";
     h1 = "Tic Tac Toe"; desc = "Play the AI engine powered by minimax, or pass the device to a friend.";
     lede = "The unbeatable engine searches every possible line, so against Unbeatable you will never win &mdash; only draw. Switch to Easy or two-player for a real contest.";
     body = $ttt },

  @{ id = "snake"; icon = "&#128025;"; tint = "#8bff6a";
     h1 = "Snake"; desc = "The arcade classic rebuilt with smooth canvas rendering and a speed dial.";
     lede = "Eat, grow, survive. Three paces, optional wall wrapping and a grid to help you plan your turns.";
     body = $snake },

  @{ id = "mole"; icon = "&#128296;"; tint = "#ff8a3d";
     h1 = "Whack-a-Mole"; desc = "Thirty seconds of pure reflex. Moles pop, grey impostors cost you points.";
     lede = "Hit the orange moles for 10 points, dodge the grey ones, and do not swing at empty holes. The speed ramps as the clock runs down.";
     body = $mole },

  @{ id = "g2048"; icon = "&#128290;"; tint = "#00cdf0";
     h1 = "2048"; desc = "Slide and merge numbered tiles towards the legendary 2048 tile.";
     lede = "Arrow keys, WASD, swipes or the on-screen d-pad. Undo your last move when a corner trap ruins your run.";
     body = $g2048 }
)

$count = 0
foreach ($g in $games) {
  if ([string]::IsNullOrWhiteSpace($g.body)) {
    throw "Body for '$($g.id)' is empty: a here-string terminator is probably misplaced."
  }
  if ($g.body -match "__[A-Z]+__") {
    throw "Body for '$($g.id)' still contains an unsubstituted placeholder."
  }

  $html = $head
  $html = $html.Replace("__ID__", $g.id)
  $html = $html.Replace("__H1__", $g.h1)
  $html = $html.Replace("__DESC__", $g.desc)
  $html = $html.Replace("__ICON__", $g.icon)
  $html = $html.Replace("__TINT__", $g.tint)
  $html = $html.Replace("__LEDE__", $g.lede)
  $html = $html.Replace("__BODY__", $g.body)

  if ($html -match "__[A-Z]+__") {
    throw "Page '$($g.id)' still contains an unsubstituted placeholder: $($Matches[0])"
  }

  $path = Join-Path $out ("{0}.html" -f $g.id)
  [System.IO.File]::WriteAllText($path, $html, (New-Object System.Text.UTF8Encoding $false))
  Write-Output ("  {0,-8} {1,6} bytes" -f $g.id, $html.Length)
  $count++
}

Write-Output "Generated $count game pages in $out"
