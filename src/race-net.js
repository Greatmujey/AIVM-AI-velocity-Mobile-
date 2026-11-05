// Real-time race transport. PeerJS opens a WebRTC data channel between the
// host's phone and each joining phone; the room code is the host's peer id, so
// no server of our own is needed. Only small race messages are sent.
import { roomPeerId, PEER_PREFIX, normalizeRaceClass } from './race.js';

export { PEER_PREFIX };
export const ICE_SERVERS = [
  { urls:'stun:stun.l.google.com:19302' },
  { urls:'stun:global.stun.twilio.com:3478' },
  { urls:'stun:stun1.l.google.com:19302' },
];
export const peerOptions = (debug = 0) => ({ debug, config:{ iceServers:ICE_SERVERS } });
export const hostPeerId = (code, cls = 'car') => roomPeerId(code, cls);

// Human-readable text for the transport failures a phone can realistically hit.
export function describePeerError(error) {
  const type = typeof error === 'string' ? error : error?.type;
  if (type === 'unavailable-id') return 'That race code is already hosting. Pick another code.';
  if (type === 'peer-unavailable') return 'No race found with that code. Check the code and try again.';
  if (type === 'network' || type === 'server-error' || type === 'socket-error') return 'Cannot reach the race service. Check your internet connection.';
  if (type === 'webrtc') return 'Could not open a direct connection. Some mobile networks block peer-to-peer play.';
  if (type === 'browser-incompatible') return 'This browser cannot host an online race.';
  return 'Online race connection problem. Try hosting a new code.';
}

// PeerJS is loaded only when an online race starts, keeping the normal game
// bundle light. It is a CommonJS package, so the default export is used.
let PeerClass = null;
export async function loadPeerClass() {
  if (!PeerClass) { const module = await import('peerjs'); PeerClass = module.default?.Peer || module.Peer || module.default; }
  return PeerClass;
}

// Wraps PeerJS with the small set of callbacks the race screen needs.
export function createRaceNet(handlers = {}, Peer = null) {
  let peer = null, host = false, closed = false;
  const connections = new Map();
  const emit = (name, ...args) => { try { handlers[name]?.(...args); } catch (error) { console.warn('race handler failed', error); } };

  function wire(connection, incoming) {
    connections.set(connection.peer, connection);
    connection.on('open', () => { emit('peerOpen', connection.peer, connection); if(incoming) emit('peerJoined', connection.peer); });
    connection.on('data', data => { if(connection.open) emit('message', data, connection.peer); });
    connection.on('close', () => { connections.delete(connection.peer); emit('peerLeft', connection.peer); });
    connection.on('error', error => { emit('error', error); });
  }

  return {
    get id() { return peer?.id || null; },
    get isHost() { return host; },
    peers() { return [...connections.keys()]; },
    setPeerClass(value) { Peer = value; },
    host(code, cls = 'car') {
      if (!Peer) { emit('status', 'Online racing is still loading. Try again.'); return false; }
      host = true; closed = false;
      try { peer = new Peer(hostPeerId(code, cls), peerOptions()); } catch (error) { emit('error', error); emit('status', describePeerError(error)); return false; }
      peer.on('open', () => emit('open', peer.id, true));
      peer.on('connection', connection => wire(connection, true));
      peer.on('error', error => { emit('error', error); emit('status', describePeerError(error)); });
      peer.on('disconnected', () => { if(!closed) { emit('status', 'RACE SERVICE UNREACHABLE · TRY QUICK RACE'); try { peer.reconnect(); } catch {} } });
      return true;
    },
    join(code, cls = 'car') {
      if (!Peer) { emit('status', 'Online racing is still loading. Try again.'); return false; }
      host = false; closed = false;
      try { peer = new Peer(undefined, peerOptions()); } catch (error) { emit('error', error); emit('status', describePeerError(error)); return false; }
      peer.on('open', () => {
        emit('open', peer.id, false);
        const connection = peer.connect(hostPeerId(code, cls), { reliable:true });
        if(!connection) { emit('status', 'No race found with that code.'); return; }
        wire(connection, false);
      });
      peer.on('error', error => { emit('error', error); emit('status', describePeerError(error)); });
      peer.on('disconnected', () => { if(!closed) { emit('status', 'RACE SERVICE UNREACHABLE · TRY QUICK RACE'); try { peer.reconnect(); } catch {} } });
      return true;
    },
    sendTo(peerId, message) { const connection = connections.get(peerId); if(connection?.open) { try { connection.send(message); } catch {} } },
    broadcast(message) { for(const connection of connections.values()) if(connection.open) { try { connection.send(message); } catch {} } },
    close() {
      closed = true;
      for(const connection of connections.values()) { try { connection.close(); } catch {} }
      connections.clear();
      try { peer?.destroy(); } catch {}
      peer = null;
    },
  };
}
