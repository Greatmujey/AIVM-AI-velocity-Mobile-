# AIVM design research

This is an inspiration and implementation note, not a claim that we reproduced a commercial game.

## REA

[morluto/rea](https://github.com/morluto/rea) is an MIT-licensed reverse-engineering toolkit, not a catalogue of games or GTA/CODM source code. We inspected its README and public showcases. Its [DX-Ball showcase](https://github.com/morluto/rea/blob/main/website/public/showcase/dx-ball/index.html) describes analyzing ball/paddle physics; its [TH04 showcase](https://github.com/morluto/rea/blob/main/website/public/showcase/th04/index.html) describes inspecting bullet patterns. Neither is a close match for AIVM's city-action mechanics. We did not run REA against GTA, CODM, or any protected game executable, and did not copy their code or assets.

## Browser game references

- [UIC Campus Game](https://github.com/sthak34-sudo/UIC-campus-game): its public README describes a Three.js practice-combat prototype with aiming, shooting and an animated character. Lesson for AIVM: a readable third-person silhouette, animation, and aiming feedback matter before adding a huge map. AIVM uses separately credited CC0 character and animation assets from this project; see [CREDITS.md](../CREDITS.md).
- [Fireteam / shooter-game-2](https://github.com/hartj77-blip/shooter-game-2): its public README describes touch controls, distinct mission goals, extraction, enemy behaviors, and combat feedback. Lesson for AIVM: focus on clear objectives, a recognizable aiming loop, sound and hit feedback. We have a smaller single-player implementation, not its co-op or full mission systems. Our CC0 sound and texture sources are credited in CREDITS.md.

## What is implemented in AIVM

- Animated CC0 human models and vehicle models, plus civilian and traffic ambience.
- Camera-relative movement, a zoomed aiming mode, reticle-based optional aim assist, cover/line-of-sight checks, hit markers and weapon audio.
- A first-delivery ambush, hostile guards, final-mission reinforcements, and a street-network GPS route.
- An original coastal neighbourhood inspired by the broader look of urban open-world games: homes, storefronts, palms, utility lines and warmer lighting. It remains a stylized, small-scale prototype.

## Honest limitations / next priorities

The city, traffic and combat are still small-scale. Traffic and pedestrians are ambient, not a complete simulation. Driving physics and enemy tactics are simplified. The game has not been validated on physical mobile devices. Priorities: test on real phones, tune frame rate and touch layout, make enemy pursuit and cover more intelligent, and strengthen one mission into a polished showcase before adding scope.

## Touch-control references

- [Godot Touch Input Manager](https://github.com/Federico-Ciuffardi/GodotTouchInputManager) is a Godot gesture manager with individual touch, drag and multitouch events. AIVM is a Three.js web game, so it does not import its GDScript; the relevant principle is to track separate touch pointers independently and clean up on cancellation.
- [Unity Standard Assets](https://github.com/marticliment/UnityStandardAssets) is a repackaged Unity asset package targeting Unity 2018. It is not directly usable in this browser project, and the repository does not provide a clear standalone open-source license. No code or assets were imported.
- [AstarPathfindingProject](https://github.com/TigardHighGDC/AstarPathfindingProject) is a Unity copy of the A* Pathfinding Project with Asset Store licensing, not a touch-control package. It was not imported; AIVM's own street-grid router remains in use.

The new layout independently tracks movement and look/fire touches, allows dragging the right fire button to aim while shooting, provides a second left fire button, zoom and adjustable sensitivity, and keeps aim assist close to the reticle. It takes inspiration from common mobile-shooter control patterns, not copied proprietary layouts or code.

### Other repositories reviewed

- [Call-of-Duty-Movement-in-Godot-4](https://github.com/TheHyper-Dev/Call-of-Duty-Movement-in-Godot-4): Godot 4 movement experiment with sprinting, adjustable mouse-look smoothing and stances. Its configurable look is a useful direction for touch sensitivity; it is not a CODM touch HUD and AIVM does not import its code.
- [gFPS](https://github.com/khairul169/gfps): Godot FPS framework with player sound and movement tutorials. It reinforces the importance of feedback and separated input actions; its framework and demo assets are not imported.
- [awesome-godot](https://github.com/calinou/awesome-godot): a curated index, not an input package. It lists projects such as OpenLiberty and aiming tools; each linked project must be evaluated separately for licenses and platform fit.
- [godot-vehicle](https://github.com/Seerban/godot-vehicle): a work-in-progress Godot racing project with custom raycast vehicle physics and a minimap. Its vehicle tuning and route information suggest future improvements, but it is not directly usable in AIVM's Three.js runtime and no code or assets were imported.

These are engine-specific references, not drop-in controls for AIVM. We retained the current Three.js game and implemented browser-native pointer tracking rather than replacing the engine or importing these repositories.
