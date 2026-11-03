# AIVM — AI Velocity Mobile

AIVM is an original, touch-first 3D city action **prototype**, built with Three.js and Vite. It is not a full GTA- or CODM-scale game. Explore a small city in third person, ride a bike or car, fight enemy bots with three weapons, and complete three short missions.

## Run locally

```sh
npm install
npm run dev
```

Open the printed URL on a computer or compatible mobile browser. `npm run build` creates a production build. `npm test` tests navigation and collision math.

## Controls

- **Mobile:** drag the left joystick to move. Drag an open area of the game view to look around. Hold **Fire** to auto-aim at the nearest visible enemy in range. Hold **Sprint** to run. Tap **Ride** near a vehicle to enter or exit. While driving, push the stick up/down to accelerate or reverse and left/right to steer. **Weapon** and **Reload** control your gun.
- **Desktop:** WASD or arrow keys to move/drive, drag the game view to look, Space to fire, E to enter/exit, Q to switch weapons, R to reload, Shift to sprint.
- Follow the green marker, distance indicator and minimap. Red minimap dots are enemies. Combat uses line-of-sight auto-aim; firing is disabled while riding. Health is partially restored between missions.

## Competition notes

Gameplay footage must be captured from the actual game. This prototype was developed with AI assistance. Check the official competition rules and eligibility before submitting; a public clip of at least 15 seconds tagging @loadoutprotocol is required.
