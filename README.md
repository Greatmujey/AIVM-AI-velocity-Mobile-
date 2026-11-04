# AIVM — AI Velocity Mobile

AIVM is an original touch-first 3D city action **prototype** built with Three.js and Vite. It is not a full GTA- or CODM-scale game. The expanded Palm Grove is a stylized neighbourhood, with traffic, pedestrians and animals, a furnished home interior, several distinct landmarks and three linked missions. Main-menu art is an illustration, not an in-game screenshot.

## Play

Start in your home. Tap **Use** (or press E), choose **Leave Home**, and follow the marker to the **Mission Hub**. Tap **Use** there to accept the first job; the following two jobs continue as a chain. Completed missions reward in-game cash. After the final job, choose **Return to City** to explore or replay the jobs. In-game money is fictional; the casino uses no real money.

The home is the only enterable interior. The casino, church, mosque, hotel, friend's house and mission hub are exterior landmarks with simple interaction menus—not fully simulated interiors or multiplayer. The hotel can restore health for in-game cash, the casino offers a simple chance game, and the friend and religious locations are quiet visit points. The mission hub sells two extra guns (SMG and marksman rifle) and a car speed upgrade. Cash and purchases are saved in browser storage when available; mission progress does not persist across reloads.

- **Mobile:** use the left stick to move and drag the view to look. Hold/drag right **Fire**, or use left **Fire**. Tap **Aim**, **Reload**, **Weapon**, and **Use/Ride** near locations or vehicles. Steer with the stick; use **Gas** and **Brake** when driving.
- **Map:** open it from the main menu or tap the minimap. In free roam, tap a landmark on the full map to set GPS. It shows the complete expanded area; the game pauses while the map is open.
- **Settings:** choose sound, look sensitivity, aim assist, sound-effects volume, music volume and one of two original synthesized music loops. **Customise Controls** lets you drag touch buttons and save separate portrait and landscape layouts, with on-foot and driving tabs. Settings and layouts stay on the current device when storage is available.
- **Desktop:** WASD/arrows move, drag to look, Space fires, E uses/rides, Q switches weapon, R reloads, V aims, M opens the map and Shift sprints.

## Run locally

```sh
npm install
npm run dev
npm test
npm run build
```

Open the printed URL on a computer or compatible mobile browser. Physical-device performance has not been benchmarked.

## Competition and credits

Gameplay footage must be captured from the actual game. This prototype was developed with AI assistance; check the official competition rules before submitting. Original GTA and Call of Duty assets are not used. See [CREDITS.md](CREDITS.md) for models, textures, sounds and licenses, and [design research](docs/DESIGN_RESEARCH.md) for the references and limitations.
