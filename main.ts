// NIGHTSHIFT: BLACKOUT — the hand-in program (Node 22, standard library only).
// The game itself is plain static files under game/, and the screenshots
// live under screenshots/. This program gathers both into the output
// directory and writes dossier.json, the summary the judge reads,
// using the vendored make.fun library. The grader runs it twice and
// both runs must write identical bytes; outside the grader,
// MAKEFUN_OUTPUT_DIR takes the place of /output.

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(outDir, { recursive: true });
cpSync(join(repoRoot, 'game'), join(outDir, 'game'), { recursive: true });
mkdirSync(join(outDir, 'screenshots'), { recursive: true });
if (existsSync(join(repoRoot, 'screenshots'))) {
  cpSync(join(repoRoot, 'screenshots'), join(outDir, 'screenshots'), { recursive: true });
}

// The caps match the gate's own limits: at most 4 screenshots, each
// under 256 KiB; game/ under 993 entries and 48 MiB; paths under
// 1000 bytes. The dossier text is capped at 160 KiB.
writeFileSync(
  join(outDir, 'dossier.json'),
  buildDossier(outDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);
