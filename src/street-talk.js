// Face-to-face street conversations. Walking up to any person in the city and
// pressing TALK opens this: they turn to you, you pick a line, they answer, and
// some answers actually change the game (a snack, a tip, a bet, a route).
import { LANDMARKS, districtById } from './city-data.js';
import { mulberry32 } from './crowd.js';

export const SNACK_PRICE = 20;
export const WATER_PRICE = 10;
export const STREET_BET = 100;
export const STREET_BET_PRIZE = 260;

const TIPS = {
  city:[
    ['Where should I go?','The mission hub takes new riders. The cafe on the corner feeds you cheap.'],
    ['Anything happening?','Somebody is racing bikes behind the market tonight. Bring cash if you want in.'],
    ['How do I make money?','Deliveries from the hub, jobs on the board, and the casino if you feel lucky.'],
  ],
  downtown:[
    ['What is this tower?','Meridia offices. The lobby has a job board and air conditioning.'],
    ['Where can I eat?','The diner on this street is open all night. Ask for the grill plate.'],
    ['Nice cars around here.','Halcyon Motors sells them. Do not touch the supercar without cash.'],
    ['Any work?','The clinic pays for deliveries when they are short handed.'],
  ],
  market:[
    ['Best price in the market?','Third row, the woman with the red umbrella. Do not tell her I said so.'],
    ['Where is the cheap food?','Grills at the back of the hall. Two for the price of one after eight.'],
    ['You live here?','Above the shop. The noise never stops and I love it.'],
    ['Any bikes for sale?','The lodge up in the hills trades bikes. Halcyon sells them new.'],
  ],
  village:[
    ['What do you do here?','Fish. Boats leave at five, come back at ten, everybody argues in between.'],
    ['Is the water safe?','Up to your waist. Past that the current takes you to the port.'],
    ['Anything to buy?','The fish market sells ice and bread. Nothing else until the city.'],
  ],
  harbor:[
    ['What happens at the docks?','Containers come in, paperwork goes missing, nobody is surprised.'],
    ['Is the casino worth it?','It is worth a look. Do not bet the rent money.'],
    ['Where is dock nine?','Past the cranes, behind the office. Mind the trucks, they do not stop.'],
  ],
  hills:[
    ['How is the road up here?','Two corners will break your bike if you are greedy. Slow down for them.'],
    ['What is the lodge like?','Hot food, a fire, and riders who talk too much. You will like it.'],
    ['Any races here?','Ridge climb. Bikes only, and the view at the top is free.'],
  ],
  desert:[
    ['Anything out here?','Sand, a diner, and cars people left behind. Bring water.'],
    ['Is it safe at night?','Nothing out here is safe at night. Stay on the road.'],
    ['Where is the church?','North of the camp. Everybody knows it by the white walls.'],
  ],
};

const OPENERS = ['Yeah?','You need something?','Hey. Careful, traffic here is mad.','I know that face. You ride, right?','Make it quick, my tea is getting cold.','Talk to me.'];
const FAREWELLS = ['Go safe.','Watch the corner.','Come back when you have time.','Later, rider.'];
const ANGRY = ['Do not point that at me!','Get away from me!','You are trouble. I am walking.'];

// A conversation is built from the district, the player's money and heat level,
// plus a stable seed so the same person does not shuffle lines every frame.
export function streetConversation({npc, district = 'city', cash = 0, heat = 0, seed = 1, nearPlaceId = null, ownsBike = false} = {}) {
  const random = mulberry32(seed);
  const tips = TIPS[district] || TIPS.city;
  const tip = tips[Math.floor(random() * tips.length) % tips.length];
  const place = nearPlaceId ? LANDMARKS.find(p => p.id === nearPlaceId) : null;
  const options = [];
  if (heat > 0) {
    options.push({id:'heat', label:'ASK ABOUT THE POLICE', reply:`${ANGRY[Math.floor(random() * ANGRY.length)]} Lose them behind the market stalls, then walk like a normal person.`, effect:{kind:'hint', toast:'TIP · BREAK LINE OF SIGHT TO COOL YOUR HEAT'}});
  }
  options.push({id:'greet', label:'SAY HELLO', reply:`${OPENERS[Math.floor(random() * OPENERS.length)]} ${FAREWELLS[Math.floor(random() * FAREWELLS.length)]}`, effect:{kind:'none'}});
  options.push({id:'tip', label:tip[0], reply:tip[1], effect:{kind:'none'}});
  if (place) options.push({id:'place', label:`ASK ABOUT ${place.name}`, reply:`That is ${place.name}. Door is on the street side, walk up to it and press enter.`, effect:{kind:'route', placeId:place.id, toast:`GPS SET · ${place.name}`}});
  if (cash >= SNACK_PRICE) options.push({id:'snack', label:`BUY A GRILL PLATE · $${SNACK_PRICE}`, reply:'Here. Eat while it is hot. You look like you have been running.', effect:{kind:'buy', cost:SNACK_PRICE, health:18, toast:'GRILL PLATE · HEALTH +18'}});
  if (cash >= WATER_PRICE) options.push({id:'water', label:`BUY COLD WATER · $${WATER_PRICE}`, reply:'Cold, sealed, straight from the fridge.', effect:{kind:'buy', cost:WATER_PRICE, health:8, toast:'COLD WATER · HEALTH +8'}});
  if (cash >= STREET_BET && heat === 0) options.push({id:'bet', label:`RACE ME FOR $${STREET_BET}`, reply:`You are on. One lap, first to the line takes the winner's purse. Do not cry when I win.`, effect:{kind:'race', stake:STREET_BET, prize:STREET_BET_PRIZE, rival:npc?.name || 'STREET RIVAL', bike:ownsBike || npc?.kind === 'bike', toast:'STREET BET ACCEPTED'}});
  if (heat === 0 && random() < .5) options.push({id:'gift', label:'ASK FOR SPARE CHANGE', reply:'I only have a little. Take it and do not make a habit of it.', effect:{kind:'gift', amount:25 + Math.floor(random() * 4) * 25, toast:'SOMEBODY HELPED YOU OUT'}});
  options.push({id:'bye', label:'GOODBYE', reply:FAREWELLS[Math.floor(random() * FAREWELLS.length)], effect:{kind:'close'}});
  return {
    title:npc?.name || 'PERSON ON THE STREET',
    district:districtById(district).name,
    opening:`${OPENERS[Math.floor(random() * OPENERS.length)]}`,
    options,
  };
}

// Applying an answer is a small, testable state change.
export function applyStreetEffect(effect, state = {}) {
  const next = {money:state.money ?? 0, health:state.health ?? 100, toast:null, placeId:null, race:null, close:false};
  if (!effect || effect.kind === 'none') return next;
  if (effect.kind === 'close') { next.close = true; return next; }
  if (effect.kind === 'buy') {
    if (next.money < effect.cost) { next.toast = 'NOT ENOUGH CASH'; return next; }
    next.money -= effect.cost;
    next.health = Math.min(100, next.health + (effect.health || 0));
    next.toast = effect.toast || 'THANKS FOR THE TRADE';
    return next;
  }
  if (effect.kind === 'gift') { next.money += effect.amount || 0; next.toast = effect.toast || `+$${effect.amount || 0}`; return next; }
  if (effect.kind === 'route') { next.placeId = effect.placeId || null; next.toast = effect.toast || 'GPS SET'; return next; }
  if (effect.kind === 'race') {
    if (next.money < effect.stake) { next.toast = 'YOU NEED CASH FOR THAT BET'; return next; }
    next.money -= effect.stake;
    next.race = {stake:effect.stake, prize:effect.prize, rival:effect.rival, bike:!!effect.bike};
    next.toast = effect.toast || 'RACE ON';
    return next;
  }
  if (effect.kind === 'hint') { next.toast = effect.toast || null; return next; }
  return next;
}

// Which door the player is standing nearest to, for "ask about this place".
export function nearestLandmarkId(x, z, radius = 34) {
  let best = null, bestDistance = radius;
  for (const place of LANDMARKS) {
    const distance = Math.hypot(place.x - x, place.z - z);
    if (distance < bestDistance) { bestDistance = distance; best = place.id; }
  }
  return best;
}
