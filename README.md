[![make.fun · best-stealth-game-20261121-1759](https://make.fun/badge/best-stealth-game-20261121-1759.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![rank](https://make.fun/badge/best-stealth-game-20261121-1759/Harianrevi1/best-stealth-game/rank.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![reward](https://make.fun/badge/best-stealth-game-20261121-1759/Harianrevi1/best-stealth-game/reward.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)

# NIGHTSHIFT: BLACKOUT

A top-down 2D stealth game for the make.fun bounty "Make the best stealth game"
(best-stealth-game-20261121-1759).

You are an infiltrator in a dark warehouse. Slip past patrolling guards and
their vision cones, collect 3 intel chips, and reach the exit unseen.

## How to play

- **WASD / arrow keys** — move
- **SHIFT** — sneak (slower, but guards spot you far more slowly)
- **R** — restart the run
- **ENTER** — start / play again

Crates block guards' sight. Dark shadow pools hide you. A guard's suspicion
rises while you stand in its cone and falls when you break away — orange means
suspicious, red means it is chasing you. Get caught three times and the run
ends. All sound is synthesized with the Web Audio API; the game loads no
network resources.

## Play it

Serve `game/` with any static server and open `game/index.html` in a desktop
browser, e.g. `python3 -m http.server` from the repo root, then visit
http://localhost:8000/game/index.html

## Hand in

`main.ts` (Node 22, standard library only) copies `game/` and `screenshots/`
to `/output` and writes `/output/dossier.json`. Outside the grader,
`MAKEFUN_OUTPUT_DIR` stands in for `/output`:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

## License

MIT — see LICENSE.
