const KEY = 'aivm-progress-v1';
export const PRICES = { smg: 400, sniper: 700, car: 550, revolver: 600, battle: 850, mg: 900, bazooka: 1200 };
export function loadProgress(storage) {
  try {
    const data = JSON.parse(storage?.getItem(KEY) || '{}');
    return { money: Number.isSafeInteger(data.money) && data.money >= 0 ? Math.min(data.money, 9999999) : 0,
      owned: Array.isArray(data.owned) ? data.owned.filter(x => Object.hasOwn(PRICES, x)) : [] };
  } catch { return {money:0,owned:[]}; }
}
export function saveProgress(storage, progress) {
  try { storage?.setItem(KEY, JSON.stringify(progress)); } catch { /* private browsing */ }
}
export function purchase(progress, item) {
  const cost=PRICES[item];
  if (!cost || progress.owned.includes(item) || progress.money < cost) return false;
  progress.money-=cost; progress.owned.push(item); return true;
}
export function reward(progress, amount) {
  if (Number.isSafeInteger(amount) && amount > 0) progress.money=Math.min(9999999,progress.money+amount);
}
