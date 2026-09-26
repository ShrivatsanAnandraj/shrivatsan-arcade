# SHRIVATSAN'S ARCADE

this is my own live arcade website

A polished, responsive browser arcade — fifteen games, no frameworks, no build step.
Static HTML, CSS and vanilla JavaScript, hosted on GitHub Pages.

Open `index.html` in a browser, or visit the live site.

## Games

| Game | Highlights |
| --- | --- |
| Memory Match | 4x4 / 4x6 / 6x6 boards, peek, move + time bests |
| Dice Roll | 1-4 dice, d4 / d6 / d8 / d10 / d12 / d20 / d100, roll history |
| 777 Slots | 3-reel machine, bet sizing, payouts, credit bankroll |
| Ping Pong | Canvas AI opponent, 3 difficulties, rally counter |
| Tic Tac Toe | Minimax unbeatable AI, 2-player mode, win/loss/draw tally |
| Snake | Canvas Snake, speed ramps, high-score tracking |
| Whack-a-Mole | 30 second timer, 3x3 grid, penalties for bombs |
| 2048 | Undo, swipe + arrow keys, win at 2048, endless mode |
| Breakout | Canvas paddle physics, brick levels, lives, level clear overlay |
| Tetris | 7-bag randomiser, hold + next preview, ghost piece, level speed ramp |
| Minesweeper | First-click safety, flood fill, flags, 3 difficulties, best times |
| Connect Four | Negamax AI, 2-player mode, animated disc drops, session tally |
| Wordle | Daily + free play, hard mode, tile cascade, answer + streak bests |
| Flappy | Canvas one-button flight, adjustable gravity + gap, rank medals |
| Lights Out | 5x5 / 6x6 / 7x7 boards, always-solvable generator, single hint |

## Shortcuts

On the landing page, `1`-`9` open the first nine games, `0` opens the tenth and
`Shift`+`1`-`5` open the last five.

## Features

- Dark and light themes, remembered per browser.
- WebAudio sound effects (mutable, never autoplays before a gesture).
- High scores, statistics and preferences in `localStorage` under `sg:` keys.
- Keyboard accessible: every control is reachable and operable, with a
  `?` shortcuts dialog.
- Respects `prefers-reduced-motion`.
- Works offline apart from the optional Google Fonts request; system font
  fallbacks are always in place.

## Layout

```
index.html          landing page
css/style.css       design system, layout, components
css/games.css       game-specific styles
js/core.js          shared runtime (window.SG): storage, scores, theme,
                    sound, toasts, confetti, canvas helpers
js/main.js          landing page behaviour
js/games/*.js       one file per game
games/*.html        static game pages
tools/gen-pages.ps1 regenerates the games/*.html pages from templates
```

`js/games/*.js` are plain classic scripts that assume `SG` is already defined;
load `core.js` first.

## Editing a game page

The fifteen pages under `games/` are generated. Edit the template blocks in
`tools/gen-pages.ps1`, then regenerate:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File "tools\gen-pages.ps1"
```

The script refuses to write a page with an empty body or an unresolved
placeholder, so a broken template cannot silently ship.

## Credits

Built with vanilla JavaScript and CSS. No runtime dependencies.
