import { Chess } from 'chess.js';
import { createLudo, rollLudo, moveLudo, legalLudoMoves, square, SAFE_SQUARES, FINISH } from './ludo.js';

// Small offline arcade activities; they do not use or award real money.
// Every game pays fictional in-game cash through the `award` callback so
// playing always means earning.
export function createArcade(root, close, award = () => {}) {
  let game = '', chess, selected = null, board = [], first = null, moves = 0, score = 0, shots = 0, target = 0, ludo;
  let grid = [], gridSize = 6, placed = [], foundWords = [], selection = [], paidOut = false;
  let arrows = [], arrowScore = 0;
  const glyph = { wk: '♔', wq: '♕', wr: '♖', wb: '♗', wn: '♘', wp: '♙', bk: '♚', bq: '♛', br: '♜', bb: '♝', bn: '♞', bp: '♟' };
  const WORDS = 'an as at ate ant art are arts ear ears east eat eats net nets nest neat near ran rat rats rate rates rest rent rents sat sea seat sent set star stare stars tan tar tea teas ten tens tear tears renter aster nestle senate ratteen'.split(' ');
  const validWords = new Set(WORDS);

  function set(html) { root.innerHTML = html }
  function button(label, cb, extra = '') { const b = document.createElement('button'); b.type = 'button'; b.className = 'arcade-button ' + extra; b.textContent = label; b.onclick = cb; return b }
  function header(title, help) { set(`<div class="arcade-head"><div><small>PALM GROVE · ARCADE</small><h2>${title}</h2><p>${help}</p></div><button class="arcade-close" aria-label="Close arcade">✕</button></div><div id="arcade-status" aria-live="polite"></div><div id="arcade-body"></div><div id="arcade-actions" class="arcade-actions"></div>`); root.querySelector('.arcade-close').onclick = close }
  function status(text) { const el = root.querySelector('#arcade-status'); if (el) el.textContent = text }
  function actions() { const a = root.querySelector('#arcade-actions'); a.append(button('🎮 GAMES', menu), button('RESTART', () => start(game))) }
  function pay(cash, label) { if (cash > 0) award(cash, label) }

  function menu() {
    game = '';
    header('GAME HUB', 'Every game pays city cash: win, score or clear the board and the winnings are yours.');
    const area = root.querySelector('#arcade-body'); area.className = 'arcade-menu';
    for (const [id, name, desc] of [
      ['ludo', '🎲 LUDO', 'Roll a real tumbling die · race both tokens · win $200'],
      ['chess', '♟ CHESS', 'Tap a piece to see every square it can move to · win $250'],
      ['words', '🔤 CROSS GRID', 'A 4×4 or 6×6 crossword table · spell the hidden words · $15 each'],
      ['match', '💎 GEM MATCH', 'Swap gems and make threes · every point pays $1'],
      ['range', '🎯 TARGET RANGE', 'Tap targets for a high score · $12 a hit'],
      ['untangle', '➶ ARROW PILE', 'Tap interwoven arrows one by one to set them free · $15 each'],
    ]) { const b = button(name, () => start(id), 'arcade-tile'); const small = document.createElement('small'); small.textContent = desc; b.append(small); area.append(b) }
  }

  function start(id) {
    game = id; selected = null; first = null; score = 0; moves = 0; shots = 0; paidOut = false;
    selection = []; foundWords = [];
    if (id === 'ludo') ludo = createLudo();
    if (id === 'chess') chess = new Chess();
    if (id === 'match') board = newBoard();
    if (id === 'range') target = Math.floor(Math.random() * 16);
    if (id === 'words') buildGrid(gridSize);
    if (id === 'untangle') buildArrows();
    render();
  }

  // --- Chess: show every legal destination when a piece is tapped -----------
  function chessStatus() { if (chess.isCheckmate()) return chess.turn() === 'w' ? 'Checkmate. Computer wins.' : 'Checkmate. You win!'; if (chess.isDraw()) return 'Draw.'; return chess.isCheck() ? 'Check! Your move.' : 'Your move · white pieces' }
  function chessHints() {
    if (!selected || chess.isGameOver()) return new Set();
    try { return new Set(chess.moves({ square: selected, verbose: true }).map(m => m.to)) } catch { return new Set() }
  }
  function renderChess() {
    header('CHESS', 'Tap any white piece: every square it can legally move to lights up. Tap a lit square to move.');
    status(chessStatus());
    const hints = chessHints();
    const area = root.querySelector('#arcade-body'); area.className = 'chess-board';
    for (let row = 0; row < 8; row++) for (let col = 0; col < 8; col++) {
      const sq = 'abcdefgh'[col] + (8 - row), piece = chess.get(sq);
      const b = button(piece ? glyph[piece.color + piece.type] : '', () => moveChess(sq), (row + col) % 2 ? 'square dark' : 'square light');
      if (hints.has(sq)) b.classList.add('hint-move');
      if (selected === sq) b.classList.add('chosen');
      if (piece?.color === 'w') b.classList.add('mine');
      b.setAttribute('aria-label', `${sq} ${piece ? (piece.color === 'w' ? 'white ' : 'black ') + ({ p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' })[piece.type] : hints.has(sq) ? 'possible move' : 'empty'}`);
      area.append(b);
    }
    if (chess.isGameOver() && !paidOut) {
      paidOut = true;
      const won = chess.isCheckmate() && chess.turn() === 'b';
      pay(won ? 250 : chess.isDraw() ? 60 : 0, won ? 'CHESS VICTORY' : 'CHESS DRAW');
      status(`${chessStatus()} ${won ? '· +$250' : chess.isDraw() ? '· +$60' : ''}`);
    }
    actions();
  }
  function moveChess(sq) {
    if (chess.isGameOver()) return;
    const piece = chess.get(sq);
    if (piece?.color === 'w') { selected = selected === sq ? null : sq; renderChess(); return }
    if (!selected) return;
    if (!chessHints().has(sq)) { status('Not a legal move for that piece — the lit squares are your options.'); return }
    let moved = false; try { moved = !!chess.move({ from: selected, to: sq, promotion: 'q' }) } catch { }
    selected = null;
    if (moved && !chess.isGameOver()) { const options = chess.moves(); if (options.length) chess.move(options[Math.floor(Math.random() * options.length)]) }
    renderChess();
  }

  // --- Cross grid: a real 4x4 / 6x6 crossword table -------------------------
  function buildGrid(size) {
    gridSize = size; placed = []; foundWords = []; selection = [];
    grid = Array.from({ length: size * size }, () => '');
    const pool = WORDS.filter(w => w.length >= 3 && w.length <= size).sort(() => Math.random() - .5);
    const dirs = [[0, 1], [1, 0]];
    for (const word of pool) {
      if (placed.length >= (size === 4 ? 4 : 6)) break;
      let best = null;
      for (let r = 0; r < size && !best; r++) for (let c = 0; c < size && !best; c++) for (const [dr, dc] of dirs) {
        const er = r + dr * (word.length - 1), ec = c + dc * (word.length - 1);
        if (er >= size || ec >= size) continue;
        let cross = 0, ok = true;
        for (let i = 0; i < word.length; i++) {
          const cell = grid[(r + dr * i) * size + (c + dc * i)];
          if (cell) { if (cell !== word[i]) { ok = false; break } cross++ }
        }
        if (!ok) continue;
        // A new word must cross an existing one (or be the first word).
        if (placed.length && cross === 0) continue;
        // No parallel touching: keep it a clean crossword table.
        for (let i = 0; i < word.length; i++) {
          const rr = r + dr * i, cc = c + dc * i;
          if (grid[rr * size + cc]) continue;
          for (const [pr, pc] of [[dr, dc], [-dr, -dc]]) {
            const nr = rr + pr, nc = cc + pc;
            if (nr < 0 || nc < 0 || nr >= size || nc >= size) continue;
            if (grid[nr * size + nc] && !isPartOfCross(nr, nc, r, c, dr, dc)) ok = false;
          }
        }
        if (ok && (!best || cross > best.cross)) best = { r, c, dr, dc, cross };
      }
      if (!best && placed.length === 0) best = { r: Math.floor(size / 2), c: 0, dr: 0, dc: 1, cross: 0 };
      if (!best) continue;
      for (let i = 0; i < word.length; i++) grid[(best.r + best.dr * i) * size + (best.c + best.dc * i)] = word[i];
      placed.push({ word, ...best });
    }
    const alphabet = 'EARTSNOM';
    for (let i = 0; i < grid.length; i++) if (!grid[i]) grid[i] = alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  function isPartOfCross(nr, nc, r, c, dr, dc) {
    return placed.some(p => {
      for (let i = 0; i < p.word.length; i++) if (p.r + (p.dr || 0) * 0 + 0 === 0) break;
      for (let i = 0; i < p.word.length; i++) { const pr = p.r + p.dr * i, pc = p.c + p.dc * i; if (pr === nr && pc === nc) return p.dr !== dr || p.dc !== dc }
      return false;
    }) || (nr === r && nc === c);
  }
  function selectionText() { return selection.map(i => grid[i]).join('') }
  function renderWords() {
    header('CROSS GRID', `A ${gridSize}×${gridSize} crossword table. Tap letters in a straight line to spell a word, then bank it. Hidden words pay $15 each.`);
    const banked = foundWords.length, goal = placed.length;
    status(`Banked ${banked} word${banked === 1 ? '' : 's'} · $${score} earned · selecting: ${selectionText() || '—'}`);
    const area = root.querySelector('#arcade-body'); area.className = 'cross-grid';
    area.style.setProperty('--cols', String(gridSize));
    grid.forEach((letter, i) => {
      const b = button(letter, () => tapCell(i), 'cross-cell');
      if (selection.includes(i)) b.classList.add('chosen');
      if (foundWords.some(f => f.cells.includes(i))) b.classList.add('found');
      b.setAttribute('aria-label', `Row ${Math.floor(i / gridSize) + 1} column ${i % gridSize + 1} letter ${letter}`);
      area.append(b);
    });
    const clues = document.createElement('div'); clues.className = 'cross-clues';
    clues.innerHTML = `<strong>HIDDEN WORDS</strong>` + placed.map(p => foundWords.some(f => f.word === p.word) ? `<s>${p.word.toUpperCase()}</s>` : `<span>${'_ '.repeat(p.word.length).trim()} · ${p.dr ? 'down' : 'across'}</span>`).join('');
    area.append(clues);
    actions();
    const a = root.querySelector('#arcade-actions');
    a.prepend(button('CLEAR', () => { selection = []; renderWords() }), button('BANK WORD', bankWord));
    a.append(button(gridSize === 6 ? 'SIZE 4×4' : 'SIZE 6×6', () => { buildGrid(gridSize === 6 ? 4 : 6); renderWords() }));
    if (banked >= goal && !paidOut) { paidOut = true; pay(60, 'CROSS GRID COMPLETE'); status(`Every hidden word found · +$60 bonus · $${score} total`) }
  }
  function tapCell(i) {
    if (selection.includes(i)) { selection = selection.slice(0, selection.indexOf(i)); renderWords(); return }
    if (selection.length) {
      const last = selection[selection.length - 1];
      const sameRow = Math.floor(last / gridSize) === Math.floor(i / gridSize);
      const sameCol = last % gridSize === i % gridSize;
      const step = sameRow ? 1 : sameCol ? gridSize : 0;
      if (!step || i !== last + step) { selection = [i]; renderWords(); return }
    }
    selection.push(i); renderWords();
  }
  function bankWord() {
    const text = selectionText().toLowerCase();
    if (text.length < 3) { status('Select at least three letters in a line.'); return }
    const reversed = [...text].reverse().join('');
    const hit = placed.find(p => p.word === text || p.word === reversed);
    if (hit && foundWords.some(f => f.word === hit.word)) { status('Already banked that one.'); selection = []; renderWords(); return }
    if (validWords.has(text) || validWords.has(reversed) || hit) {
      const word = hit ? hit.word : (validWords.has(text) ? text : reversed);
      foundWords.push({ word, cells: [...selection] });
      score += 15; pay(15, `WORD · ${word.toUpperCase()}`);
      selection = [];
      renderWords();
      status(`Banked ${word.toUpperCase()} · +$15`);
    } else status('Not a word in the book — try another line.');
  }

  // --- Gem match / range: unchanged rules, now paying -----------------------
  function newBoard() { let b; do { b = Array.from({ length: 36 }, () => Math.floor(Math.random() * 5)) } while (matches(b).size || !hasMove(b)); return b }
  function matches(b) { const found = new Set(); for (let r = 0; r < 6; r++) for (let c = 0; c < 6; c++) { const i = r * 6 + c; if (c < 4 && b[i] === b[i + 1] && b[i] === b[i + 2]) { found.add(i); found.add(i + 1); found.add(i + 2) } if (r < 4 && b[i] === b[i + 6] && b[i] === b[i + 12]) { found.add(i); found.add(i + 6); found.add(i + 12) } } return found }
  function hasMove(b) { for (let i = 0; i < 36; i++) for (const j of [i % 6 < 5 ? i + 1 : -1, i < 30 ? i + 6 : -1]) { if (j < 0) continue; [b[i], b[j]] = [b[j], b[i]]; const ok = matches(b).size > 0; [b[i], b[j]] = [b[j], b[i]]; if (ok) return true } return false }
  function renderMatch(message = '') {
    header('GEM MATCH', 'Tap two neighbouring gems to swap. Match 3 or more. 20 moves · every point pays $1 at the end.');
    status(message || `Score ${score} · ${20 - moves} moves left`);
    const area = root.querySelector('#arcade-body'); area.className = 'gem-board';
    const symbols = ['●', '◆', '▲', '■', '★'], colors = ['coral', 'mint', 'blue', 'gold', 'violet'];
    board.forEach((v, i) => { const b = button(symbols[v], () => swap(i), `gem ${colors[v]}`); b.setAttribute('aria-label', `${colors[v]} gem row ${Math.floor(i / 6) + 1} column ${i % 6 + 1}`); if (first === i) b.classList.add('chosen'); area.append(b) });
    actions();
  }
  function swap(i) {
    if (moves >= 20) return;
    if (first === null) { first = i; renderMatch('Choose a neighbouring gem.'); return }
    if (first === i) { first = null; renderMatch(); return }
    const a = first; first = null;
    if (Math.abs(Math.floor(a / 6) - Math.floor(i / 6)) + Math.abs(a % 6 - i % 6) !== 1) { renderMatch('Choose neighbours only.'); return }
    [board[a], board[i]] = [board[i], board[a]];
    let m = matches(board);
    if (!m.size) { [board[a], board[i]] = [board[i], board[a]]; renderMatch('No match — try another swap.'); return }
    moves++; let rounds = 0;
    while (m.size && rounds++ < 40) { score += m.size * 10; for (let c = 0; c < 6; c++) { const keep = []; for (let r = 5; r >= 0; r--) { const n = r * 6 + c; if (!m.has(n)) keep.push(board[n]) } for (let r = 5; r >= 0; r--) board[r * 6 + c] = keep[5 - r] ?? Math.floor(Math.random() * 5) } m = matches(board) }
    const shuffled = !hasMove(board); if (shuffled) board = newBoard();
    if (moves >= 20 && !paidOut) { paidOut = true; pay(score, 'GEM MATCH PAYOUT') }
    renderMatch(moves >= 20 ? `Game over · final score ${score} paid out` : shuffled ? 'No moves left — board refreshed.' : '');
  }
  function renderRange() {
    header('TARGET RANGE', 'Tap the highlighted target. Ten attempts; each hit pays $12.');
    status(`Hits ${score} / ${shots} · ${10 - shots} attempts left`);
    const area = root.querySelector('#arcade-body'); area.className = 'range-board';
    for (let i = 0; i < 16; i++) {
      const b = button(i === target ? '◎' : '·', () => {
        if (shots >= 10) return; shots++;
        if (i === target) { score++; pay(12, 'TARGET HIT') }
        target = Math.floor(Math.random() * 16); renderRange();
      }, 'range-cell');
      b.setAttribute('aria-label', i === target ? 'Target' : 'Empty space'); area.append(b);
    }
    actions();
  }

  // --- Ludo: a tumbling die, coloured board and visible tokens --------------
  const DIE_FACES = ['', '', '⚂', '⚃', '', ''];
  let dieTimer = null;
  function renderLudo(rolling = false) {
    header('LUDO', 'Roll the die and watch it tumble. Both of your tokens (▲) race the computer (●) home · win $200.');
    status(ludo.winner === null ? `${ludo.last || 'Your turn'} · ${rolling ? 'Die is rolling…' : ludo.die !== null ? 'Choose a token' : 'Roll the die'}` : ludo.last);
    const area = root.querySelector('#arcade-body'); area.className = 'ludo-wrap';
    const track = document.createElement('div'); track.className = 'ludo-track';
    for (let i = 0; i < 52; i++) {
      const cell = document.createElement('div');
      cell.className = 'ludo-cell' + (SAFE_SQUARES.includes(i) ? ' safe' : '') + (i % 13 < 3 ? ` zone-${Math.floor(i / 13) % 2}` : '');
      const row = i < 14 ? 0 : i < 27 ? i - 13 : i < 40 ? 13 : 52 - i, col = i < 14 ? i : i < 27 ? 13 : i < 40 ? 39 - i : 0;
      cell.style.gridRow = String(row + 1); cell.style.gridColumn = String(col + 1);
      let players = '';
      for (let side = 0; side < 2; side++) for (let token = 0; token < 2; token++) if (square(side, ludo.tokens[side][token]) === i) players += `<i class="tok tok-${side}">${side ? '●' : '▲'}</i>`;
      cell.innerHTML = players || (SAFE_SQUARES.includes(i) ? '★' : '');
      cell.setAttribute('aria-label', `Track ${i + 1}${players ? ` tokens ${players.replace(/<[^>]+>/g, '')}` : ''}${SAFE_SQUARES.includes(i) ? ' safe' : ''}`);
      track.append(cell);
    }
    const center = document.createElement('div'); center.className = 'ludo-center';
    center.innerHTML = `<span class="tok-you">▲ YOU</span><span class="tok-cpu">● CPU</span><b id="ludo-die" class="ludo-die${rolling ? ' rolling' : ''}">${ludo.die ? DIE_FACES[ludo.die - 1] : '🎲'}</b>`;
    track.append(center); area.append(track);
    // "Tickets": a coloured chip per token so you always see where both are.
    const labels = document.createElement('div'); labels.className = 'ludo-label';
    labels.innerHTML = `<span class="tok-you">YOUR TICKETS</span> ${ludo.tokens[0].map((p, i) => `<b class="chip chip-you">${i + 1}: ${ludoPlace(p)}</b>`).join('')} <span class="tok-cpu">CPU</span> ${ludo.tokens[1].map((p, i) => `<b class="chip chip-cpu">${i + 1}: ${ludoPlace(p)}</b>`).join('')}`;
    area.append(labels);
    actions();
    const controls = root.querySelector('#arcade-actions');
    if (ludo.winner === null && ludo.turn === 0 && !rolling) {
      if (ludo.die === null) controls.prepend(button('🎲 ROLL DIE', () => rollDieAnimation()));
      else for (const i of legalLudoMoves(ludo).reverse()) controls.prepend(button(`MOVE TOKEN ${i + 1}`, () => { moveLudo(ludo, i); if (ludo.turn === 1) cpuLudo(); afterLudoMove() }));
    }
  }
  function rollDieAnimation() {
    let ticks = 0;
    renderLudo(true);
    dieTimer = setInterval(() => {
      ticks++;
      const die = root.querySelector('#ludo-die');
      if (die) die.textContent = DIE_FACES[Math.floor(Math.random() * 6)];
      if (ticks >= 10) {
        clearInterval(dieTimer); dieTimer = null;
        rollLudo(ludo);
        if (ludo.turn === 1) cpuLudo();
        afterLudoMove();
      }
    }, 85);
  }
  function afterLudoMove() {
    if (ludo.winner !== null && !paidOut) {
      paidOut = true;
      if (ludo.winner === 0) pay(200, 'LUDO VICTORY');
    }
    renderLudo();
  }
  function cpuLudo() { let safety = 0; while (ludo.turn === 1 && ludo.winner === null && safety++ < 30) { rollLudo(ludo); if (ludo.turn === 1 && ludo.die !== null) { const options = legalLudoMoves(ludo); if (options.length) moveLudo(ludo, options[Math.floor(Math.random() * options.length)]) } } if (safety >= 30) { ludo.turn = 0; ludo.die = null } }
  function ludoPlace(p) { return p < 0 ? 'YARD' : p === FINISH ? 'FINISHED' : p >= 52 ? `HOME ${p - 51}` : `TRACK ${p + 1}` }

  // --- Arrow pile: interwoven arrows you free one by one --------------------
  function segIntersect(a, b) {
    const d = (p, q, r) => Math.sign((q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x));
    return d(a.p, a.q, b.p) !== d(a.p, a.q, b.q) && d(b.p, b.q, a.p) !== d(b.p, b.q, a.q);
  }
  function buildArrows() {
    arrows = []; arrowScore = 0;
    for (let i = 0; i < 9; i++) {
      const p = { x: 8 + Math.random() * 84, y: 8 + Math.random() * 84 };
      const angle = Math.random() * Math.PI * 2, len = 26 + Math.random() * 40;
      const q = { x: Math.max(4, Math.min(96, p.x + Math.cos(angle) * len)), y: Math.max(4, Math.min(96, p.y + Math.sin(angle) * len)) };
      arrows.push({ id: i, p, q, gone: false, hue: (i * 47) % 360 });
    }
  }
  function arrowFree(index) {
    const a = arrows[index];
    return !arrows.some((b, j) => j > index && !b.gone && segIntersect(a, b));
  }
  function renderArrows(message = '') {
    header('ARROW PILE', 'Arrows lie interwoven in the square. Only an arrow with nothing on top of it can be pulled free — tap them one by one until the board escapes clean. $15 each.');
    const left = arrows.filter(a => !a.gone).length;
    status(message || `${left} arrow${left === 1 ? '' : 's'} left · $${arrowScore} earned`);
    const area = root.querySelector('#arcade-body'); area.className = 'arrow-pile';
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 100 100'); svg.setAttribute('class', 'arrow-svg');
    arrows.forEach((a, i) => {
      if (a.gone) return;
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.setAttribute('class', 'arrow-line' + (arrowFree(i) ? ' free' : ''));
      g.setAttribute('data-index', String(i));
      g.style.stroke = g.style.color = `hsl(${a.hue} 85% 62%)`;
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', a.p.x); line.setAttribute('y1', a.p.y); line.setAttribute('x2', a.q.x); line.setAttribute('y2', a.q.y);
      line.setAttribute('stroke-width', '2.6'); line.setAttribute('stroke-linecap', 'round');
      const dx = a.q.x - a.p.x, dy = a.q.y - a.p.y, len = Math.hypot(dx, dy) || 1;
      const ux = dx / len, uy = dy / len, head = 7;
      const poly = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
      poly.setAttribute('points', `${a.q.x},${a.q.y} ${a.q.x - ux * head - uy * head * .55},${a.q.y - uy * head + ux * head * .55} ${a.q.x - ux * head + uy * head * .55},${a.q.y - uy * head - ux * head * .55}`);
      poly.setAttribute('fill', `hsl(${a.hue} 85% 62%)`);
      const fat = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      fat.setAttribute('x1', a.p.x); fat.setAttribute('y1', a.p.y); fat.setAttribute('x2', a.q.x); fat.setAttribute('y2', a.q.y);
      fat.setAttribute('stroke-width', '8'); fat.setAttribute('stroke', 'transparent'); fat.setAttribute('class', 'arrow-hit');
      g.append(line, poly, fat);
      g.addEventListener('click', () => tapArrow(i));
      svg.append(g);
    });
    area.append(svg);
    if (left === 0 && !paidOut) { paidOut = true; pay(80, 'ARROW PILE CLEARED'); status('Board cleared — every arrow escaped · +$80 bonus') }
    actions();
  }
  function tapArrow(i) {
    if (arrows[i].gone) return;
    if (!arrowFree(i)) { renderArrows('That arrow is pinned under another — free the ones on top first.'); const g = root.querySelector(`[data-index="${i}"]`); g?.classList.add('shake'); return }
    arrows[i].gone = true; arrowScore += 15; pay(15, 'ARROW FREED');
    renderArrows(`Arrow away · +$15`);
  }

  function render() {
    if (game === 'ludo') renderLudo();
    if (game === 'chess') renderChess();
    if (game === 'words') renderWords();
    if (game === 'match') renderMatch();
    if (game === 'range') renderRange();
    if (game === 'untangle') renderArrows();
  }
  menu();
  return { menu, destroy() { if (dieTimer) clearInterval(dieTimer) } };
}
