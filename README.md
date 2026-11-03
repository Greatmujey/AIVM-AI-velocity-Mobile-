# AIVM — AI Velocity Mobile

AIVM is an original, touch-first 3D city action **prototype**, built with Three.js and Vite. It is not a full GTA- or CODM-scale game. Explore a small city in third person, ride a bike or car, fight enemy bots with three weapons, and complete three short missions. The district has a Palm Grove gateway, low-rise homes, storefronts, a distant business district, ambient pedestrians, traffic, dogs, cats and pigeons. The opening delivery becomes a rival-car pursuit followed by a drop-zone shootout; you can use the bike, car or travel on foot.

## Run locally

```sh
npm install
npm run dev
```

Open the printed URL on a computer or compatible mobile browser. `npm run build` creates a production build. `npm test` tests navigation, combat, map, collision math and saved settings.

## Controls

- **Mobile:** drag the left joystick to move. Drag the open game view to look around. Hold and drag the right **Fire** button to aim while shooting, or use the left **Fire** button while looking with your right thumb. Tap **Aim** to toggle zoom. A quick tap on either fire button fires immediately; holding fires repeatedly. Adjust **LOOK** sensitivity and turn **ASSIST** or sound on or off above the minimap. These settings are saved on your device when browser storage is available. Hold **Sprint** to run. Tap the minimap for the full city map; the game pauses until you close it. Tap **Ride** near a vehicle to enter or exit. While driving, steer with the left stick and hold **Gas** or **Brake** (hold Brake to reverse); the stick also supports forward/reverse. Tap **Weapon** to pick a specific gun. Tap **Reload** to reload, or reload automatically when empty; the progress bar shows the reload. Switching weapons or entering a vehicle cancels a reload.
- **Desktop:** WASD or arrow keys to move/drive, drag the game view to look, Space to fire, E to enter/exit, Q to switch weapons, R to reload, V or right-click to toggle aim, M to open/close the full map, Shift to sprint.
- Follow the green marker, distance indicator and minimap. The green GPS line follows the street network, and the arrow points to the next turn. Red minimap dots are enemies, including the pursuing car during the first mission. Animals are ambient and cannot be targeted. Combat uses a small reticle-based, line-of-sight aim assist; firing is disabled while riding. Health is partially restored between missions. If you fail, retry the current mission with full health and ammo or start the run over.

## Competition notes

Gameplay footage must be captured from the actual game. This prototype was developed with AI assistance. Check the official competition rules and eligibility before submitting; a public clip of at least 15 seconds tagging @loadoutprotocol is required.

## Assets

Original proprietary GTA and Call of Duty assets are not used. See [CREDITS.md](CREDITS.md) for the included CC0 models, textures, sounds and licenses.

See [design research](docs/DESIGN_RESEARCH.md) for the references, implemented ideas and remaining limitations.
