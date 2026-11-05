import { settleBet, WHEEL_SEGMENTS, SLOT_SYMBOLS } from './casino.js';

// A small animated casino floor: every wager is played out on screen — the coin
// tosses and lands, the die tumbles across the felt, the reels blur and stop one
// by one, the wheel spins down under the pointer. Fictional money only.
const PIPS = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };

export function createCasino(root, progress, onChange, close, sfx) {
  let stake = 50, message = 'Pick a stake, choose a table, watch it play out.', session = 0, busy = false;
  const timers = [];
  const later = (fn, ms) => { const id = setTimeout(() => { if (live()) fn() }, ms); timers.push(id); return id };
  const live = () => root.isConnected && session >= 0;
  const el = (tag, className, text) => { const node = document.createElement(tag); if (className) node.className = className; if (text !== undefined) node.textContent = text; return node };
  const button = (label, fn, className = 'arcade-button') => { const b = el('button', className, label); b.onclick = fn; return b };

  function frame(title, blurb) {
    session++; busy = false;
    root.replaceChildren();
    const head = el('div', 'arcade-head');
    const left = el('div');
    left.append(el('small', '', 'PALM GROVE · CASINO'), el('h2', '', title), el('p', '', blurb));
    const x = button('✕', close, 'arcade-close'); x.setAttribute('aria-label', 'Close casino games');
    head.append(left, x);
    const balance = el('p', 'casino-balance'); balance.id = 'casino-balance'; balance.setAttribute('aria-live', 'polite');
    const result = el('p', 'casino-result'); result.id = 'casino-result'; result.setAttribute('aria-live', 'polite');
    const stakes = el('div', 'arcade-actions casino-stakes');
    for (const n of [50, 100, 250]) {
      const b = button(`STAKE $${n}${n === stake ? ' ✓' : ''}`, () => { stake = n; rerender() });
      b.dataset.stake = String(n); stakes.append(b);
    }
    const table = el('div', 'casino-table'); table.id = 'casino-table';
    const actions = el('div', 'arcade-actions casino-actions'); actions.id = 'casino-actions';
    const lobby = button('← BACK TO THE TABLES', () => { renderLobby() });
    root.append(head, balance, result, stakes, table, actions, lobby);
    paint();
    return { table, actions, result };
  }
  function paint() {
    root.querySelector('#casino-balance').textContent = `BALANCE $${progress.money} · STAKE $${stake}`;
    root.querySelector('#casino-result').textContent = message;
    for (const b of root.querySelectorAll('.casino-stakes button')) b.classList.toggle('chosen', Number(b.dataset.stake) === stake);
    for (const b of root.querySelectorAll('.casino-actions button')) b.disabled = busy;
  }
  function wager(game, choice, reveal) {
    const result = settleBet(progress, game, choice, stake);
    if (!result) { message = 'Not enough in-game cash for this wager.'; paint(); return }
    onChange(); sfx?.('reload');
    busy = true; message = 'Playing…'; paint();
    reveal(result);
  }
  function finish(result, text) {
    busy = false;
    message = `${text} · ${result.won ? `WON $${result.payout} (includes stake)` : `LOST $${stake}`}`;
    sfx?.(result.won ? 'success' : 'hit');
    paint();
  }

  // --- coin flip -------------------------------------------------------------
  function coinTable() {
    const { table, actions } = frame('COIN FLIP', 'Heads or tails · win returns 2× your stake · 50% chance.');
    const stage = el('div', 'coin-stage');
    const coin = el('div', 'coin'); coin.append(el('div', 'coin-face heads', 'H'), el('div', 'coin-face tails', 'T'));
    stage.append(coin); table.append(stage);
    for (const choice of ['heads', 'tails']) actions.append(button(choice.toUpperCase(), () => wager('coin', choice, result => {
      const end = result.result === 'heads' ? 1800 : 1980;
      coin.style.setProperty('--spin-end', `${end}deg`);
      coin.className = 'coin flipping';
      later(() => { coin.className = 'coin landed'; coin.style.transform = `rotateX(${end}deg)`; finish(result, result.result.toUpperCase()) }, 1250);
    })));
  }

  // --- dice ------------------------------------------------------------------
  function diceTable() {
    const { table, actions } = frame('DICE', 'Call low 1–3 or high 4–6 · win returns 2× · watch the die tumble.');
    const stage = el('div', 'dice-stage');
    const die = el('div', 'die'); die.dataset.face = '1';
    const pips = el('div', 'pips'); die.append(pips); stage.append(die); table.append(stage);
    const showPips = face => { pips.replaceChildren(); for (let i = 0; i < 9; i++) pips.append(el('span', PIPS[face].includes(i) ? 'pip on' : 'pip')) };
    showPips(1);
    for (const choice of ['low', 'high']) actions.append(button(choice.toUpperCase(), () => wager('dice', choice, result => {
      const face = Number(result.result);
      die.classList.add('rolling');
      const swap = setInterval(() => { if (!live()) { clearInterval(swap); return } showPips(1 + Math.floor(Math.random() * 6)) }, 95);
      timers.push(swap);
      later(() => { clearInterval(swap); die.classList.remove('rolling'); showPips(face); finish(result, `THE DIE SHOWS ${face} (${face <= 3 ? 'LOW' : 'HIGH'})`) }, 1300);
    })));
  }

  // --- slots -----------------------------------------------------------------
  function slotsTable() {
    const { table, actions } = frame('SLOT MACHINE', 'Three matching symbols · win returns 10× · 1 in 16 chance.');
    const machine = el('div', 'slots');
    const reels = [0, 1, 2].map(() => { const reel = el('div', 'reel'); const window_ = el('div', 'reel-window', '🍒'); reel.append(window_); machine.append(reel); return window_ });
    table.append(machine);
    actions.append(button('PULL THE LEVER', () => wager('slots', 'spin', result => {
      const symbols = result.result.split(' ');
      machine.classList.add('spinning');
      reels.forEach(reel => reel.classList.add('spinning'));
      const spin = setInterval(() => { if (!live()) { clearInterval(spin); return } reels.forEach(reel => { if (reel.classList.contains('spinning')) reel.textContent = SLOT_SYMBOLS[Math.floor(Math.random() * 4)] }) }, 80);
      timers.push(spin);
      reels.forEach((reel, i) => later(() => {
        reel.classList.remove('spinning'); reel.textContent = symbols[i]; sfx?.('checkpoint');
        if (i === 2) { clearInterval(spin); machine.classList.remove('spinning'); finish(result, `REELS ${result.result}`) }
      }, 900 + i * 450));
    })));
  }

  // --- wheel -----------------------------------------------------------------
  function wheelTable() {
    const { table, actions } = frame('FORTUNE WHEEL', 'Red or black pays 2× · the two green pockets pay 5×.');
    const stage = el('div', 'wheel-stage');
    const wheel = el('div', 'wheel');
    const seg = 360 / WHEEL_SEGMENTS.length;
    const colors = { red: '#b8352c', black: '#161a20', green: '#1d7a4f' };
    wheel.style.background = `conic-gradient(${WHEEL_SEGMENTS.map((c, i) => `${colors[c]} ${i * seg}deg ${(i + 1) * seg}deg`).join(',')})`;
    const glow = el('div', 'wheel-glow');
    wheel.append(glow, el('div', 'wheel-pointer'), el('div', 'wheel-hub', 'AIVM'));
    stage.append(wheel); table.append(stage);
    let turns = 0;
    for (const choice of ['red', 'black', 'green']) actions.append(button(choice.toUpperCase(), () => wager('wheel', choice, result => {
      const pockets = WHEEL_SEGMENTS.map((c, i) => c === result.result ? i : -1).filter(i => i >= 0);
      const pocket = pockets[Math.floor(Math.random() * pockets.length)];
      turns += 5;
      const angle = turns * 360 + (360 - (pocket * seg + seg / 2)) % 360;
      glow.style.background = `conic-gradient(from ${pocket * seg}deg, #ffffffc0 0 ${seg}deg, transparent ${seg}deg)`;
      glow.style.opacity = '0';
      wheel.style.transition = 'transform 2.6s cubic-bezier(.15,.85,.25,1)';
      wheel.style.transform = `rotate(${angle}deg)`;
      sfx?.('checkpoint');
      later(() => {
        glow.style.opacity = '1';
        finish(result, `WHEEL LANDS ON ${result.result.toUpperCase()} ${pocket + 1}`);
        later(() => { glow.style.opacity = '0' }, 1600);
      }, 2700);
    })));
  }

  // --- lobby -----------------------------------------------------------------
  let openTable = null;
  const rerender = () => (openTable ? openTable() : renderLobby());
  const GAMES = [
    ['COIN FLIP', '', 'Watch the coin toss and land.', coinTable],
    ['DICE', '🎲', 'A single die tumbles across the felt.', diceTable],
    ['SLOT MACHINE', '🎰', 'Three reels blur, then stop one by one.', slotsTable],
    ['FORTUNE WHEEL', '🎡', 'Twelve pockets spin under the pointer.', wheelTable],
  ];
  function renderLobby() {
    session++; busy = false; openTable = null;
    root.replaceChildren();
    const head = el('div', 'arcade-head');
    const left = el('div');
    left.append(el('small', '', 'PALM GROVE · CASINO'), el('h2', '', 'CASINO GAMES'), el('p', '', 'Fictional in-game money only. No real payments or cash prizes. Every game plays out on screen.'));
    const x = button('✕', close, 'arcade-close'); x.setAttribute('aria-label', 'Close casino games');
    head.append(left, x);
    const balance = el('p', 'casino-balance'); balance.setAttribute('aria-live', 'polite');
    balance.textContent = `BALANCE $${progress.money} · STAKE $${stake}`;
    const stakes = el('div', 'arcade-actions casino-stakes');
    for (const n of [50, 100, 250]) {
      const b = button(`STAKE $${n}${n === stake ? ' ✓' : ''}`, rerender);
      b.dataset.stake = String(n); stakes.append(b);
    }
    const grid = el('div', 'casino-lobby');
    for (const [name, icon, blurb, open] of GAMES) {
      const tile = el('button', 'casino-tile');
      tile.append(el('span', 'casino-tile-icon', icon), el('b', '', name), el('small', '', blurb));
      tile.onclick = () => { openTable = open; open() };
      grid.append(tile);
    }
    root.append(head, balance, stakes, grid);
  }
  renderLobby();
  return { destroy() { session = -1; for (const id of timers) clearTimeout(id) } };
}
