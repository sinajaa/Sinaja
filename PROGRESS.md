# Progress

Updated 2026-11-17 18:30 UTC. Branch `makefun-game`, remote
`github.com/sinajaa/Sinaja`.

## Where the work stands

The playable slice is in place and is the current head of the entry. The city,
on-foot movement, car theft and driving, traffic, pedestrians, shooting, the wanted
system, police cruisers and officers, four missions, HUD, minimap, audio, and a
save slot all exist and were exercised by an in-page test pass. Four real
screenshots were captured from the running game, and the kit entry program builds
a dossier from them.

## Done

- Backup of the supplied starting state is committed and pushed:
  - `335f803` initial workspace (archive + notes)
  - `598629a` redacted Stripe-looking keys that GitHub push protection flagged
  - `73d679f` first playable build (city, cars, police, missions, HUD, screenshots)
- The uploaded `.zip` was a conversation archive, not game code. The five files
  are preserved under `conversation-archive/`; the previous chat was read end to
  end for the bounty spec and last known state.
- three.js r160 is vendored at `game/vendor/three.module.min.js`; the game works
  offline with no network requests.
- World: 7x7 road grid, asphalt and crosswalks, lamps, towers with window
  textures, Needle landmark, parks, palms, billboards, beach boardwalk, bay, sky,
  low sun, fog and shadows.
- Cars: mesh variants (sedan, sports, police), arcade acceleration/braking/steer,
  building collision, wheel spin, parked rows and lane traffic with braking.
- Player: third-person controller, sprint, camera orbit, enter/exit car, pistol
  with hitscan, tracers, muzzle flash, reload, ammo.
- Crime: wanted stars, heat decay, SCPD cruisers that chase and fire, officers who
  deploy and shoot, siren, hit-and-run detection, and an air unit with a searchlight
  at four stars.
- Missions: four jobs with markers, dialogue, hostiles, rewards, progression and an
  all-jobs-complete card.
- Presentation: HUD (health, money, stars, clock, district, objective, speed),
  dialogue box, toasts, mission panel, live minimap, synthesised audio, save slot.
- Screenshots: `screenshots/1-street.jpg`, `2-car.jpg`, `3-chase.jpg`,
  `4-mission.jpg`, all 1280x720 JPEG under 256 KiB, captured from the live canvas.
- Kit build: `MAKEFUN_OUTPUT_DIR=out node main.ts` produces `out/dossier.json`
  (about 850 KiB) and copies 20 game files (about 784 KiB).
- Gate-oriented cleanup: no absolute http(s) string literals in reachable game
  modules (including the vendored three.js build).

## Verified by test pass

Two passes were run against the real game in headless Chromium.

The first was an in-page harness stepping the simulation at 1/60 s:

```
walk=4.2m  car=yes,speed=12.0  shot=1,wanted=1,hit=ped  mission=1,money=150
cops=2  traffic=5.0m  peds=0.5m  decay=0
```

The second drove the game over the Chrome DevTools Protocol (`node tools/playtest.mjs`)
and played the whole job chain:

```
shot=[1,1]  job1=[1,1400]  job2=[2,1700]  hostiles=3  job3=[3,2200]
job4=[4,3100]  chase=[1,90.5,4]  chopper=yes  respawn=[100,0,3000]
```

Every job advanced its index and paid its reward, a pistol shot killed a pedestrian
and raised a star, a three-star chase put a cruiser and officers on the street and
cost health, and death reset health, stars and $100. That pass also found a real bug
in the first tower job: `buildPerson` was called with an object instead of an RNG
function, so the job crashed on spawn. It is fixed, and `tools/inspect.mjs` now
prints the live state of each posed screenshot scene.

The temporary in-page harness was removed from `main.js` afterward; the CDP tools
stay in `tools/` and are not part of the entry.

## Not done yet

- Human playtest of all four jobs in a real browser, especially job 4 (lose the
  cops) and job 3 (tower hostiles behind cover).
- Audio check in a real browser with a user gesture; the WebAudio graph is created
  defensively but the siren loop and engine pitch have only been reviewed in code.
- Performance pass on lower-end GPUs: 2048 shadow map, ~20k building boxes and
  point lights are fine in software Chromium but could be trimmed.
- Gameplay polish: car damage smoke/fire, mission retry after death, a proper pause
  menu, and denser crowds on the boardwalk.
- Bounty submission itself (see below). The dossier is built, but the entry has
  not been opened and no submission has been made.

## Bounty notes that affect submission

- Bounty `gta6-01`, $1,666 pot, 100 paid places, entry free, 7-day window, opens
  2026-11-17 15:00 UTC.
- The house AI judge reads a dossier limited to 256 KiB of text, four images of at
  most 256 KiB each, and 1.5 MiB total, backed by a mandatory 2-minute transcript.
- The transcript must record a single unedited 2-minute take of the exact commands
  on a clean machine, covering extraction, dependency installation, build, run and
  open/inspect steps. It must show the command and output as actually run, with no
  cuts, speedups, or later substitution.
- The dossier must carry the complete files and the exact shell commands. A typo or
  one extra character in a command counts as not reproducing.
- The repository is identified by URL; do not delete or recreate it after opening
  the entry. Push the branch and keep it public through judging.

## Next steps

1. Play the four jobs manually with `node serve.ts --port 12000` and fix anything
   that blocks completion.
2. Tune performance and audio, then recapture screenshots only if visuals change.
3. Rebuild `out/dossier.json`, confirm file counts and sizes, and stage the entry
   on make.fun without opening it until the transcript is ready.
4. Record the 2-minute transcript in one take and submit.
