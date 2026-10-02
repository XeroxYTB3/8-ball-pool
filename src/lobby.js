import Peer from 'peerjs';

export const peerOpts = {
  debug: 0,
  config: {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' }
    ]
  }
};

const HUB_ID = 'salon8-hub-v2';

export function createLobby({ onUpdate, lbOk, roomOk }) {
  let lbH = 0, lbT = {}, roomT = {}, lbC = [], lbc = null, clientPeer = null;

  function rooms() {
    return {
      L: Object.values(lbT).filter(x => !x.round).map(({ code, name, n, round }) => ({ code, name, n, round })),
      R: Object.values(roomT).map(({ code, name, n }) => ({ code, name, n }))
    };
  }

  function push() {
    if (lbH) {
      const m = { t: 'L', ...rooms() };
      lbC = lbC.filter(c => c.open);
      lbC.forEach(c => { try { c.send(m); } catch (e) { /* ignore */ } });
    }
    onUpdate(rooms());
  }

  function joinClient() {
    if (lbH || lbc) return;
    const q = new Peer(undefined, peerOpts);
    clientPeer = q;
    q.on('open', () => {
      const c = q.connect(HUB_ID, { reliable: true });
      c.on('open', () => { lbc = c; onUpdate(rooms()); });
      c.on('data', d => {
        if (d && d.t == 'L' && Array.isArray(d.L)) {
          onUpdate({
            L: d.L.map(lbOk).filter(Boolean),
            R: Array.isArray(d.R) ? d.R.map(roomOk).filter(Boolean) : []
          });
        }
      });
      c.on('close', () => {
        lbc = null;
        try { q.destroy(); } catch (e) { /* ignore */ }
        onUpdate({ L: [], R: [] });
        setTimeout(init, 1200 + Math.random() * 2500);
      });
    });
    q.on('error', () => {
      try { q.destroy(); } catch (e) { /* ignore */ }
      if (!lbc && !lbH) setTimeout(init, 4000);
    });
  }

  function init() {
    if (!window || lbH || lbc) return;
    let p;
    try { p = new Peer(HUB_ID, peerOpts); } catch (e) { return; }
    p.on('open', () => {
      lbH = 1;
      lbT = {};
      roomT = {};
      push();
    });
    p.on('connection', c => {
      lbC.push(c);
      c.on('open', push);
      c.on('data', d => {
        if (!d || typeof d != 'object') return;
        const x = lbOk(d), r = roomOk(d);
        if (d.t == 'a' && x) { lbT[x.code] = { ...x, c }; push(); }
        else if (d.t == 'd' && typeof d.code == 'string') { delete lbT[d.code]; push(); }
        else if (d.t == 'ra' && r) { roomT[r.code] = { ...r, c }; push(); }
        else if (d.t == 'rd' && typeof d.code == 'string') { delete roomT[d.code]; push(); }
      });
      c.on('close', () => {
        for (const k in lbT) if (lbT[k].c === c) delete lbT[k];
        for (const k in roomT) if (roomT[k].c === c) delete roomT[k];
        push();
      });
    });
    p.on('error', e => {
      if (lbH) return;
      try { p.destroy(); } catch (_) { /* ignore */ }
      if (e.type == 'unavailable-id') joinClient();
      else setTimeout(init, 4000);
    });
  }

  function send(msg) {
    if (lbH) {
      if (msg.t == 'a') lbT[msg.code] = { ...msg, c: null };
      if (msg.t == 'd') delete lbT[msg.code];
      if (msg.t == 'ra') roomT[msg.code] = { code: msg.code, name: msg.name, n: msg.n, c: null };
      if (msg.t == 'rd') delete roomT[msg.code];
      push();
    } else if (lbc && lbc.open) {
      try { lbc.send(msg); } catch (e) { /* ignore */ }
    }
  }

  setInterval(() => { if (!lbH && !lbc) init(); }, 8000);

  return { init, send, isHub: () => !!lbH };
}

export { Peer };
