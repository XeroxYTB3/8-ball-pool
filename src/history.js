const KEY = 'salon8_hist';

export function addMatch({ mode, names, winner, why }) {
  let h = [];
  try { h = JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (e) { h = []; }
  h.unshift({ t: Date.now(), mode, names: names.slice(), winner, why: why || '' });
  try { localStorage.setItem(KEY, JSON.stringify(h.slice(0, 40))); } catch (e) { /* ignore */ }
}

export function listMatches() {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (e) { return []; }
}

export function exportProfile(obj) {
  return JSON.stringify(obj, null, 2);
}

export function parseProfile(text) {
  const o = JSON.parse(text);
  if (!o || typeof o !== 'object') throw new Error('Profil invalide');
  return o;
}
