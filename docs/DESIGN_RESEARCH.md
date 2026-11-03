# AIVM design research

This is an inspiration and implementation note, not a claim that we reproduced a commercial game.

## REA

[morluto/rea](https://github.com/morluto/rea) is an MIT-licensed reverse-engineering toolkit, not a catalogue of games or GTA/CODM source code. We inspected its README and public showcases. Its [DX-Ball showcase](https://github.com/morluto/rea/blob/main/website/public/showcase/dx-ball/index.html) describes analyzing ball/paddle physics; its [TH04 showcase](https://github.com/morluto/rea/blob/main/website/public/showcase/th04/index.html) describes inspecting bullet patterns. Neither is a close match for AIVM's city-action mechanics. We did not run REA against GTA, CODM, or any protected game executable, and did not copy their code or assets.

## Browser game references

- [UIC Campus Game](https://github.com/sthak34-sudo/UIC-campus-game): its public README describes a Three.js practice-combat prototype with aiming, shooting and an animated character. Lesson for AIVM: a readable third-person silhouette, animation, and aiming feedback matter before adding a huge map. AIVM uses separately credited CC0 character and animation assets from this project; see [CREDITS.md](../CREDITS.md).
- [Fireteam / shooter-game-2](https://github.com/hartj77-blip/shooter-game-2): its public README describes touch controls, distinct mission goals, extraction, enemy behaviors, and combat feedback. Lesson for AIVM: focus on clear objectives, a recognizable aiming loop, sound and hit feedback. We have a smaller single-player implementation, not its co-op or full mission systems. Our CC0 sound and texture sources are credited in CREDITS.md.

## What is implemented in AIVM

- Animated CC0 human models and vehicle models, plus civilian and traffic ambience.
- Camera-relative movement, a zoomed aiming mode, forward-cone aim assist, cover/line-of-sight checks, hit markers and weapon audio.
- A first-delivery ambush, hostile guards, final-mission reinforcements, and a street-network GPS route.

## Honest limitations / next priorities

The city, traffic and combat are still small-scale. Traffic and pedestrians are ambient, not a complete simulation. Driving physics and enemy tactics are simplified. The game has not been validated on physical mobile devices. Priorities: test on real phones, tune frame rate and touch layout, make enemy pursuit and cover more intelligent, and strengthen one mission into a polished showcase before adding scope.
