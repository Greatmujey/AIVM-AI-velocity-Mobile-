# AIVM — AI Velocity Mobile

AIVM is an original touch-first 3D city action **prototype** built with Three.js and Vite. It is not a full GTA- or CODM-scale game. The expanded Palm Grove is a stylized connected city with five different districts (city centre, coastal village, harbor, hills and desert), with traffic, pedestrians and animals, a furnished home interior, several distinct landmarks and three linked missions, two repeatable delivery jobs, and two solo racing time trials. Main-menu art is an illustration, not an in-game screenshot.

## Play

Choose an environment from the main menu. Its preview is captured from the actual game; all five environments are connected districts of the same map, not separate levels. The hills and dunes are decorative scenery; the playable roads and ground are flat. Start in your home. Tap **Use** (or press E), choose **Leave Home**, and follow the marker to your selected district or to the **Mission Hub**. When a non-city district is selected, the home menu also offers fast travel there. At the **Mission Hub**, tap **Use** to accept the first job; the following two jobs continue as a chain. Completed missions reward in-game cash. After the final job, choose **Return to City** to explore or replay the jobs. In-game money is fictional; the casino uses no real money.

All marked locations—including the mission hub, friend's house, church, mosque, hotel, casino and Palm Grove Shop—have simple walkable interiors. At an entrance, tap **Use** to go inside; tap **Use** again inside for actions and to leave. The shop sells the SMG, marksman rifle, car speed upgrade and health kits with earned in-game cash. The mission hub still offers the permanent upgrades too, including the revolver and battle rifle. The casino and mission hub each offer a free offline arcade with chess against a simple computer, a small word-rack game, a match-three game and a tap-target range. The word game is not full Scrabble; the racing events are solo checkpoint time trials, not races against opponents. The hotel can restore health for cash, and the casino offers a simple chance game using fictional money only. Interiors are small stylized rooms with menu-based interactions, not fully simulated businesses or multiplayer. Cash and permanent purchases are saved in browser storage when available; mission progress does not persist across reloads.

- **Mobile:** use the left stick to move and drag the view to look. Hold/drag right **Fire**, or use left **Fire**. Tap **Aim**, **Reload**, **Weapon**, and **Use/Ride** near locations or parked vehicles. Steer with the stick; use **Gas** and **Brake** when driving. Brake stops forward motion before engaging reverse. Approach a stopped traffic car and tap **Take** to pull the driver out and drive it. The driver-ejection transition is simplified; traffic bikes cannot be taken.
- **Map:** open it from the main menu or tap the minimap. In free roam, tap a landmark or district pin on the full map to set GPS. It shows the complete expanded area; the game pauses while the map is open.
- **Jobs and races:** at the mission hub, use the menu to start a repeatable courier job or timed car/bike trial. Follow each GPS checkpoint; trials require the specified vehicle. The timer pauses indoors and in menus.
- **Settings:** choose sound, look/aim/steering sensitivity, invert look, high-contrast HUD, aim assist, sound-effects volume, music volume and one of two original synthesized music loops. **Change Environment** sets a destination and, outside a mission, offers immediate travel to it. **Graphics → Performance** reduces resolution and disables shadows for lighter rendering. **Customise Controls** lets you drag touch buttons and save separate portrait and landscape layouts, with on-foot and driving tabs. Settings and layouts stay on the current device when storage is available.
- **Desktop:** WASD/arrows move, drag to look, Space fires, E uses/rides, Q switches weapon, R reloads, V aims, M opens the map and Shift sprints.

## Run locally

```sh
npm install
npm run dev
npm test
npm run build
```

Open the printed URL on a computer or compatible mobile browser. Crowd and vehicle models are instantiated nearby, and distant actors are hidden or animated less to reduce work, but physical-device performance has not been benchmarked.

## Competition and credits

Gameplay footage must be captured from the actual game. This prototype was developed with AI assistance; check the official competition rules before submitting. Original GTA and Call of Duty assets are not used. See [CREDITS.md](CREDITS.md) for models, textures, sounds and licenses, and [design research](docs/DESIGN_RESEARCH.md) for the references and limitations.
