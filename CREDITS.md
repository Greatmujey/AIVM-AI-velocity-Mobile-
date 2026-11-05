# Third-party asset credits

All assets below are included locally; they are not taken from GTA or Call of Duty. Credits are given even where not required.

- **Human model** (`public/assets/models/human.glb`): MPFB2 / MakeHuman body authored by the UIC Campus Game project; its [credits](https://github.com/sthak34-sudo/UIC-campus-game/blob/149944d01f54bfbd681220fd799a176363995a93/CREDITS.md) designate the model CC0 1.0. Source: `client/public/models/characters/player_base.glb` at that commit.
- **Human animation** (`human-anims.glb`): Quaternius Universal Animation Library (Standard), CC0 1.0, retargeted to the above body by the UIC Campus Game project. Source: `client/public/models/characters/player_anims_cc0.glb` at the commit above; the project credits identify these clips as CC0 and separate them from private Mixamo clips. The original Quaternius license is in `public/assets/licenses/quaternius.txt`.
- **Sports sedan** (`sedan-sports.glb`): Kenney Car Kit, CC0 1.0. Mirror: [Hidencod/tge-assets](https://github.com/Hidencod/tge-assets/tree/7be9b573bc74f32ed766b44b3f46550d02ca83b5/packs/car-kit); license: `public/assets/licenses/kenney-car.txt`.
- **Motorcycle and color map** (`motorcycle.glb`, `Textures/colormap.png`): Kenney Racing Kit, CC0 1.0. Mirror: [Kenny-Racing](https://github.com/christopheschneider86-rgb/Kenny-Racing); license: `public/assets/licenses/kenney-racing.txt`.
- **Asphalt and concrete texture details**: Poly Haven CC0 assets, adapted in [shooter-game-2](https://github.com/hartj77-blip/shooter-game-2/blob/main/CREDITS.md). Asphalt 02 by Rob Tuytel, and Concrete Floor 02 by Rob Tuytel.
- **Firearm audio** (`pistol.mp3`, `rifle.mp3`, `shotgun.mp3`): CC0 from [The Free Firearm Sound Library](https://opengameart.org/content/the-free-firearm-sound-library) by Ben Jaszczak et al., adapted in shooter-game-2. **Reload audio** (`reload.mp3`): CC0 from [Handgun Reload Sound Effect](https://opengameart.org/content/handgun-reload-sound-effect) by zer0_sol, adapted in shooter-game-2.
- **Basis Universal transcoder** in `public/basis`: included with Three.js, MIT license. License: `public/assets/licenses/three.txt` ([upstream](https://github.com/mrdoob/three.js/blob/master/LICENSE)).
- **Coastal billboard** (`public/assets/coast-billboard.jpg`): original AI-generated illustration created for AIVM; no GTA or Call of Duty artwork was used.
- **Animated cat and dog** (`public/assets/models/cat.glb`, `dog.glb`): Quaternius, *Animal Pack Vol. 2* (cat) and *Ultimate Animated Animals* (husky), CC0 1.0. Rescaled GLB versions from [JDaza13/ar-viewer at 241f0cd](https://github.com/JDaza13/ar-viewer/tree/241f0cd29a1bf45e049e2720821a53c79b8a6f81/models); sources and licensing: [Animal Pack Vol. 2](https://opengameart.org/content/animated-animales-low-poly), [Ultimate Animated Animals](https://quaternius.com/packs/ultimateanimatedanimals.html). Quaternius license: `public/assets/licenses/quaternius.txt`.
- **Palm Grove mural** (`public/assets/neighborhood-mural.jpg`): original AI-generated illustration created for AIVM.
- **Playable character** (`public/assets/models/player-marcus.glb`): Marcus, smart-casual outfit from [Rohit Biradar's Avatar Studio, commit 0369f6b](https://github.com/memoriesrohit/avatar-studio/tree/0369f6bbf8e4e636a77d40eaf6dd8834413b83cc), generated with MakeHuman/MPFB. The source README credits the bodies, skins, hair and clothing to MakeHuman under CC0; the original model contains the `Idle` and `Walk` clips authored by the project (whose code is MIT). Material handling is adapted from Avatar Studio's MIT-licensed `js/scene.js`; its license is included at `public/assets/licenses/avatar-studio.txt`. Combat and sprint use the existing credited Quaternius clips; the player walk combines Marcus’s upright torso with the Quaternius walking leg and foot motion, adjusted for his rig. This is an original model, not a GTA or CODM character.
- **City vehicles** (`suv-luxury.glb`, `taxi.glb`, `hatchback-sports.glb`): Kenney Car Kit, CC0 1.0, same source and license as the sports sedan above.
- **Traffic, service and race fleet** (`sedan.glb`, `suv.glb`, `van.glb`, `truck.glb`, `police.glb`, `ambulance.glb`, `delivery.glb`, `race.glb`, `race-future.glb`, `garbage-truck.glb`, `firetruck.glb`, `truck-flat.glb`, `delivery-flat.glb`, `kart-oobi.glb`, `tractor.glb`, plus street props `cone.glb`, `box.glb`): Kenney Car Kit, CC0 1.0, same mirror and license as the sports sedan above. These back the parody marques in `src/vehicles.js` (traffic mixes, dealership stock, patrol cars and race rivals).
- **Main menu artwork** (`main-menu.jpg`): original AI-generated illustration created for AIVM; illustrative art, not in-game graphics.
- **Music**: five original synthesized loops generated in the browser by AIVM; no external recordings.

- **District foliage** (`public/assets/models/nature/`): Kenney Nature Kit, CC0 1.0. Source: [Kenney Nature Kit](https://kenney.nl/assets/nature-kit); GLB mirror: [Hidencod/tge-assets](https://github.com/Hidencod/tge-assets/tree/7be9b573bc74f32ed766b44b3f46550d02ca83b5/packs/nature-kit).
- **District selector previews** (`public/assets/districts/`): screenshots captured from AIVM itself.

- **Online race transport**: [PeerJS](https://github.com/peers/peerjs) by Michelle Bu and Eric Zhang, MIT; included license: `public/assets/licenses/peerjs.txt`. It uses the free public PeerJS signalling service and public STUN servers to open a direct WebRTC data channel between phones; no AIVM server is involved.
- **Chess rules engine**: [chess.js](https://github.com/jhlywa/chess.js) by Jeff Hlywa, BSD 2-Clause; included license: `public/assets/licenses/chess-js.txt`.

## Original vocal recordings (wave 7)

- `public/assets/audio/vocal-coast.mp3` and `vocal-night.mp3` are original spoken-word vocal hooks written for AIVM and recorded with Arena text-to-speech voices chosen by the project owner. They layer over the generated live-band instrumentation on Coast Drive and Night Cruise. All lyrics are original project writing.

## Real songs on the radio (wave 9)

The "REAL SONGS · AFRO LIVE" radio stations play actual recorded music — six
instrumental Afro-fusion / African-groove songs:

| Station | Track | File |
| --- | --- | --- |
| AFRO LIVE · UMLUNGU | Umlungu | `public/assets/music/afro-umlungu.mp3` |
| KWELA JIVE RADIO | A Kwela Fella | `public/assets/music/afro-kwela.mp3` |
| IYANETHA FM | Iyanetha | `public/assets/music/afro-iyanetha.mp3` |
| VILLAGE GROOVE RADIO | Happy African Village | `public/assets/music/afro-village.mp3` |
| AFRICAN MOON FM | African Moon | `public/assets/music/afro-moon.mp3` |
| WEST AFRICA RADIO | West in Africa | `public/assets/music/afro-west.mp3` |

All six are by **John Bartmann**, released under **CC0 1.0 (public domain)** —
free for any use with no attribution required (credit given here as courtesy).
Sourced via chosic.com and the SoundSafari/CC0-1.0-Music corpus on GitHub.
No copyrighted commercial recordings are used anywhere in this project.

## Real hip-hop songs with voices (wave 10)

The "HIP HOP · REAL SONGS WITH VOICES" radio stations play five full vocal
hip-hop recordings, all **CC0 1.0 (public domain)** via the Free Music Archive
corpus in SoundSafari/CC0-1.0-Music on GitHub:

| Station | Track | Artist | File |
| --- | --- | --- | --- |
| HIP HOP HEAT | When You See Me Now | HoliznaRAPS | `public/assets/music/hip-when-you-see-me.mp3` |
| FLOW FM | Greatest Self | FlowForRhythm | `public/assets/music/hip-greatest-self.mp3` |
| FLOW FM | Kill The Pain | FlowForRhythm | `public/assets/music/hip-kill-the-pain.mp3` |
| FLOW FM | The Winning Track | FlowForRhythm | `public/assets/music/hip-winning-track.mp3` |
| FLOW FM | Nice Day | FlowForRhythm | `public/assets/music/hip-nice-day.mp3` |

CC0 requires no attribution; credits are listed here as courtesy and for
provenance. No copyrighted commercial recordings are used in this project.
