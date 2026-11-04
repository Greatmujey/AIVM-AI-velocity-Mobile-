// Fictional in-game credits only. Results settle immediately; nothing is
// withdrawable or exchangeable for real money. The table UI animates the same
// result afterwards so you always watch the coin, die, reels or wheel land.
const ALLOWED_STAKES = [50, 100, 250];
// The wheel: twelve pockets, two green. Red/black pay 2x, green pays 5x.
export const WHEEL_SEGMENTS = ['red', 'black', 'red', 'black', 'red', 'black', 'red', 'green', 'black', 'red', 'black', 'green'];
export const SLOT_SYMBOLS = ['🍒', '🔔', '★', '7'];

export function settleBet(progress, game, choice, stake, random = Math.random) {
  if (!ALLOWED_STAKES.includes(stake) || !Number.isSafeInteger(progress.money) || progress.money < stake) return null;
  if (!({ coin: ['heads', 'tails'], dice: ['low', 'high'], slots: ['spin'], wheel: ['red', 'black', 'green'] }[game] || []).includes(choice)) return null;
  let result, won, multiplier;
  if (game === 'coin') { result = random() < .5 ? 'heads' : 'tails'; won = choice === result; multiplier = 2 }
  else if (game === 'dice') { const die = Math.floor(random() * 6) + 1; result = String(die); won = choice === (die <= 3 ? 'low' : 'high'); multiplier = 2 }
  else if (game === 'wheel') { const pocket = WHEEL_SEGMENTS[Math.floor(random() * WHEEL_SEGMENTS.length)]; result = pocket; won = choice === pocket; multiplier = pocket === 'green' ? 5 : 2 }
  else { const symbols = Array.from({ length: 3 }, () => SLOT_SYMBOLS[Math.floor(random() * 4)]); result = symbols.join(' '); won = symbols.every(x => x === symbols[0]); multiplier = 10 }
  const payout = won ? stake * multiplier : 0;
  progress.money = Math.min(9999999, progress.money - stake + payout);
  return { game, choice, stake, result, won, payout };
}
