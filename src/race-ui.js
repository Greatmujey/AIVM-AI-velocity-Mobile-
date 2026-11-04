// Race menus: solo / computer / hosted code / join with code, plus the live
// race position board. All network work is delegated to the callbacks passed in.
import { RACE_TRACKS, TRACK_IDS, MAX_RACERS, makeRoomCode, normalizeCode } from './race.js';

const el = (tag, className, text) => { const node = document.createElement(tag); if(className)node.className = className; if(text!==undefined)node.textContent = text; return node };

export function createRaceUI(panel, handlers = {}) {
  const call = (name, ...args) => { try { return handlers[name]?.(...args); } catch (error) { console.error(error) } };
  function render() {
    panel.replaceChildren();
    const wrap = el('div', 'race-ui');
    const head = el('div', 'race-head');
    const title = el('div');
    title.append(el('small', '', 'AIVM · 2–5 RACERS'), el('h2', '', 'RACE ROOM'));
    head.append(title);
    const close = el('button', 'dialog-close', '✕'); close.setAttribute('aria-label', 'Close race room');
    close.onclick = () => call('close');
    head.append(close);
    wrap.append(head);
    wrap.append(el('p', 'race-note', 'Host a race to get a code, then up to four friends on other phones join with that code. Everyone races the same checkpoints in real time. Computer racers can fill empty seats.'));

    const trackRow = el('div', 'race-tracks');
    for (const id of TRACK_IDS) {
      const button = el('button', 'race-track', RACE_TRACKS[id].name);
      button.onclick = () => call('track', id);
      trackRow.append(button);
    }
    wrap.append(el('small', 'race-label', 'TRACK'), trackRow);

    const row = (label, hint, onClick, className = '') => {
      const button = el('button', 'race-action ' + className, label);
      if (hint) button.append(el('small', '', hint));
      button.onclick = onClick; return button;
    };
    const solo = row('QUICK RACE', `You against ${handlers.cpuCount?.() ?? 2} computer racers`, () => call('solo'));
    const roster = el('div', 'race-actions');
    roster.append(solo, row('HOST RACE · GET A CODE', 'Open a lobby others can join', () => call('host'), 'primary-race'));
    wrap.append(roster);

    const nameRow = el('div', 'race-name-row');
    const nameInput = el('input', 'race-input race-name'); nameInput.id = 'race-name-input'; nameInput.maxLength = 12; nameInput.value = handlers.name?.() || 'RACER';
    nameInput.setAttribute('aria-label', 'Racer name'); nameInput.addEventListener('input', () => call('setName', nameInput.value));
    nameRow.append(el('small', 'race-label', 'YOUR NAME'), nameInput); wrap.append(nameRow);
    const cpuRow = el('div', 'race-tracks');
    for (const count of [1, 2, 3, 4]) {
      const button = el('button', 'race-track' + (count === (handlers.cpuCount?.() ?? 2) ? ' selected' : ''), `${count} CPU`);
      button.onclick = () => call('setCpuCount', count);
      cpuRow.append(button);
    }
    wrap.append(el('small', 'race-label', 'COMPUTER RACERS'), cpuRow);
    const joinRow = el('div', 'race-join');
    const input = el('input', 'race-input'); input.id = 'race-code-input'; input.maxLength = 5; input.inputMode = 'text'; input.autocapitalize = 'characters'; input.autocomplete = 'off';
    input.setAttribute('aria-label', 'Race code'); input.placeholder = 'CODE';
    input.addEventListener('input', () => { input.value = normalizeCode(input.value) });
    const join = row('JOIN WITH CODE', 'Racer 2 to 5', () => call('join', input.value));
    joinRow.append(input, join); wrap.append(joinRow);
    wrap.append(el('p', 'race-note race-small', 'Online racing needs both phones online and uses a free peer-to-peer service. Some mobile networks block direct connections; if a code cannot connect, use Quick Race instead.'));
    panel.append(wrap);
    const active = TRACK_IDS.indexOf(handlers.trackId?.());
    const trackButtons = [...panel.querySelectorAll('.race-tracks')][0]?.querySelectorAll('.race-track') || [];
    trackButtons.forEach((button, index) => button.classList.toggle('selected', index === active));
    setTimeout(() => input.focus({ preventScroll: true }), 30);
  }

  function renderRoom(state) {
    panel.replaceChildren();
    const wrap = el('div', 'race-ui race-room');
    const head = el('div', 'race-head');
    const title = el('div'); title.append(el('small', '', state.trackName || 'RACE ROOM'), el('h2', '', state.code ? `CODE ${state.code}` : 'RACE ROOM'));
    head.append(title, (() => { const close = el('button', 'dialog-close', '✕'); close.setAttribute('aria-label', 'Leave race room'); close.onclick = () => call('leave'); return close })());
    wrap.append(head);
    wrap.append(el('p', 'race-status', state.status || 'Connecting…'));
    if (state.code) wrap.append(el('p', 'race-code', state.code));
    const list = el('ol', 'race-list');
    for (const player of state.players || []) {
      const item = el('li', 'race-player');
      item.append(el('span', 'race-player-name', `${player.name}${player.kind === 'host' ? ' · HOST' : player.kind === 'bot' ? ' · CPU' : ''}`));
      item.append(el('span', 'race-player-state', player.finished ? `FINISHED ${state.formatTime ? state.formatTime(player.time) : ''}` : `CP ${Math.min((player.step || 0) + 1, 5)}`));
      list.append(item);
    }
    if (state.players?.length >= MAX_RACERS) wrap.append(el('p', 'race-note', 'Race is full: 5 of 5 seats taken.'));
    wrap.append(list);
    const actions = el('div', 'race-actions');
    if (state.canStart) { const start = el('button', 'race-action primary-race', 'START RACE'); start.onclick = () => call('start'); actions.append(start) }
    if (state.isHost && state.canAddBot) { const bot = el('button', 'race-action', 'ADD COMPUTER RACER'); bot.onclick = () => call('addBot'); actions.append(bot) }
    const leave = el('button', 'race-action', 'LEAVE ROOM'); leave.onclick = () => call('leave'); actions.append(leave);
    wrap.append(actions);
    if (state.hint) wrap.append(el('p', 'race-note race-small', state.hint));
    panel.append(wrap);
  }

  function renderCountdown(seconds, state) {
    const wrap = el('div', 'race-ui race-countdown');
    wrap.append(el('small', '', 'RACE STARTING'));
    wrap.append(el('div', 'race-count', String(Math.max(0, seconds))));
    wrap.append(el('p', 'race-note', `${state?.trackName || 'TRACK'} · ${state?.players?.length || 0} RACERS`));
    panel.replaceChildren(wrap);
  }

  function renderResults(state, onLeave) {
    const wrap = el('div', 'race-ui race-results');
    wrap.append(el('small', '', state.trackName || 'RACE'));
    wrap.append(el('h2', '', 'FINISH'));
    const list = el('ol', 'race-list');
    for (const entry of state.entries || []) {
      const item = el('li', 'race-player');
      item.append(el('span', 'race-player-name', `${entry.place}. ${entry.name}`));
      item.append(el('span', 'race-player-state', entry.finished ? (state.formatTime ? state.formatTime(entry.time) : String(entry.time)) : 'DID NOT FINISH'));
      list.append(item);
    }
    wrap.append(list);
    const close = el('button', 'race-action primary-race', 'BACK TO THE CITY');
    close.onclick = onLeave; wrap.append(close);
    panel.replaceChildren(wrap);
  }

  return { render, renderRoom, renderCountdown, renderResults };
}

export { makeRoomCode };
