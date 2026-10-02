import './style.css';
import { Peer, createLobby, peerOpts } from './lobby.js';
import { W, H, R, P, CW, CH, PK, mk, stepPhysics, moving, cloneBalls } from './physics.js';
import { grpOf, remaining, resolveTurn } from './rules.js';
import { setMute, cueHit, clack, cushionHit, pocketHit } from './audio.js';
import { addMatch, listMatches, exportProfile, parseProfile } from './history.js';

const cv = document.getElementById('c'), g = cv.getContext('2d'), $ = id => document.getElementById(id);
const DPR = Math.min(2, devicePixelRatio || 1);
cv.width = CW * DPR; cv.height = CH * DPR; g.setTransform(DPR, 0, 0, DPR, 0, 0); g.imageSmoothingQuality = 'high';
const COL = ['#f4f0e4', '#f5bf16', '#1f4fd0', '#d8262c', '#5a2aa0', '#f26b17', '#12894a', '#7c1b27', '#18181d'];
const cfg = { time: 30, aim: 2, fouls: 1, snd: 1, brk: 0, rl: .9915 };
const ADM = Object.assign({ xw: 100, xl: 30, cw: 60, cl: 15, mo: 1.3, b0: .5, b1: 1, b2: 1.5, lb: 50, tix: 2500, var: 0, t1x: 200, t1c: 300, t2x: 120, t2c: 180, t4x: 70, t4c: 100, t8x: 40, t8c: 60, t16x: 20, t16c: 30 }, (() => { try { return JSON.parse(localStorage.getItem('salon8_adm') || '{}'); } catch (e) { return {}; } })());
let mainOn = 0, shopC = 'cue', champK = '', deco = [null, null], lastShot = null, netReady = [0, 0], lastJoin = '';
const hx = (h, s, l) => { s /= 100; l /= 100; const a = s * Math.min(l, 1 - l), f = n => { const k = (n + h / 30) % 12; return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)))); }; return '#' + [f(0), f(8), f(4)].map(x => x.toString(16).padStart(2, '0')).join(''); },
  G = (h, d, s, l) => [...Array(7)].map((_, i) => hx((h + i * d) % 360, s, l)).concat('#18181d'),
  BG = (a, b, k) => k == 'r' ? `radial-gradient(circle at 50% 40%,${a},${b})` : k == 'c' ? `conic-gradient(from 200deg at 50% 50%,${a},${b},${a})` : k == 's' ? `repeating-linear-gradient(45deg,${a} 0 22px,${b} 22px 44px)` : `linear-gradient(145deg,${a},${b})`,
  NC = (a, b) => `linear-gradient(90deg,${a},${b})`,
  CAT = {
    cue: { n: 'Cannes', m: 1, i: [['Classique', '#e9f1ec', 1], ['Érable', '#e0b36a', 2], ['Noyer', '#8a5a34', 3], ['Ébène', '#4a4a52', 4], ['Bambou', '#c9d88a', 4], ['Cerisier', '#b5483a', 5], ['Rubis', '#d8262c', 6], ['Saphir', '#2f78f0', 6], ['Émeraude', '#1fb36b', 7], ['Améthyste', '#9b5de5', 8], ['Corail', '#ff7f6e', 8], ['Citron', '#f3e84a', 9], ['Or', '#f5bf16', 10], ['Argent', '#cfd6dc', 10, '#7a8791'], ['Bronze', '#b0773c', 11], ['Bonbon', '#ff8fcf', 11, '#fff'], ['Turquoise', '#2ec4c4', 12], ['Lave', '#ff4d1a', 13, '#2a0a05'], ['Glace', '#bfe9ff', 13, '#fff'], ['Néon vert', '#39ff14', 14, '#0b3d00'], ['Néon rose', '#ff2bd6', 15, '#3d0034'], ['Toxique', '#b6ff00', 16, '#1a2600'], ['Galaxie', '#3a2a8f', 17, '#e0b3ff'], ['Samouraï', '#c1121f', 18, '#111'], ['Forêt', '#2f6b3a', 19, '#c9a96a'], ['Océan', '#0077b6', 20, '#90e0ef'], ['Aurore', '#4cc9f0', 22, '#f72585'], ['Royale', '#5a189a', 24, '#ffd60a'], ['Diamant', '#e8f8ff', 26, '#7fd8ff'], ['Obsidienne', '#15151a', 28, '#ff3b3b'], ['Légendaire', '#ffd700', 30, '#ff4500']] },
    ball: { n: 'Boules', m: 1.2, i: [['Classique', ['#f5bf16', '#1f4fd0', '#d8262c', '#5a2aa0', '#f26b17', '#12894a', '#7c1b27', '#18181d'], 1], ['Pastel', G(0, 50, 70, 80), 3], ['Bonbon', G(320, 25, 90, 65), 4], ['Océan', G(185, 9, 80, 50), 5], ['Feu', G(0, 6, 100, 50), 6], ['Forêt', G(90, 12, 60, 38), 7], ['Menthe', G(150, 8, 60, 65), 8], ['Cuivre', G(20, 5, 60, 50), 9], ['Glace', G(190, 6, 70, 75), 10], ['Coucher de soleil', G(350, 10, 90, 60), 11], ['Néon', G(0, 50, 100, 55), 12], ['Cyber', G(280, 24, 100, 60), 13], ['Toxique', G(70, 7, 100, 45), 14], ['Lave', G(0, 5, 100, 40), 15], ['Sakura', G(330, 4, 80, 80), 16], ['Monochrome', ['#f2f2f2', '#d6d6d6', '#bbb', '#a0a0a0', '#858585', '#6a6a6a', '#4f4f4f', '#18181d'], 17], ['Or & Noir', ['#f5bf16', '#222', '#f5bf16', '#222', '#f5bf16', '#222', '#f5bf16', '#000'], 19], ['Rétro', ['#e9c46a', '#2a9d8f', '#e76f51', '#8d5a97', '#f4a261', '#6a994e', '#9b2226', '#264653'], 21], ['Galaxie', G(240, 20, 80, 45), 23], ['Arc-en-ciel', G(0, 51, 95, 55), 26]] },
    bg: { n: 'Tapis du billard', m: .8, i: [['Tapis vert', BG('#0f2a20', '#1c5a42', 'r'), 1], ['Nuit bleue', BG('#050b2e', '#1b3a8a'), 2], ['Casino', BG('#2a0510', '#7a1030', 'r'), 3], ['Minuit', BG('#000', '#1a1a2e'), 3], ['Forêt', BG('#06210f', '#2f6b3a'), 4], ['Océan profond', BG('#001a33', '#0077b6'), 5], ['Lagune', BG('#003d4d', '#2ec4b6', 'r'), 6], ['Crépuscule', BG('#2b0a3d', '#ff6b35'), 7], ['Aurore', BG('#0b1f3a', '#38e0a5'), 8], ['Volcan', BG('#1a0300', '#ff4d1a', 'r'), 9], ['Sakura', BG('#4a1230', '#ffb7d5'), 10], ['Désert', BG('#4a2c0a', '#f4a259'), 11], ['Glacier', BG('#0a3a5a', '#d6f3ff'), 12], ['Mojito', BG('#0d3b1e', '#b7f171', 'r'), 13], ['Néon city', BG('#12002e', '#ff00c8'), 14], ['Galaxie', BG('#0a0020', '#6a1b9a', 'r'), 15], ['Cuivre', BG('#2b1308', '#c97b3a'), 16], ['Carbone', BG('#0a0a0a', '#2b2b2b', 's'), 17], ['Rayures vertes', BG('#0f2a20', '#143827', 's'), 18], ['Rayures rouges', BG('#2a0a0a', '#4a1010', 's'), 19], ['Rayures bleues', BG('#0a1a33', '#12305c', 's'), 20], ['Or sombre', BG('#1a1200', '#b8860b', 'r'), 22], ['Argent', BG('#1c1f24', '#9aa5b1'), 24], ['Spirale feu', BG('#ff4d00', '#220000', 'c'), 26], ['Spirale glace', BG('#00b4ff', '#001a33', 'c'), 28], ['Spirale arc-en-ciel', BG('#ff0080', '#00e5ff', 'c'), 30]] },
    ti: { n: 'Titres', m: .5, i: ['Novice', 'Kawai pro de la boule', 'Boule de gomme', 'Mange-tapis', 'Pas la blanche !', 'Queue de poisson', 'Casse-tout', 'Le Râteau', 'Frotteur de craie', 'Ça passe ou ça casse', 'Chat noir (la 8)', 'Champion du bar', 'Triangle des Bermudes', 'Bille en tête', 'Pêcheur à la queue', 'Mamie sniper', 'Roi du rebond', 'Tonton Billard', 'Ninja de la bande', 'Explosion de triangle', 'Le Rouleur fou', 'Billard en pantoufles', 'Ctrl+Z la blanche', 'Bouboule', 'Boule de cristal', 'Maître Queue', 'Dompteur de boules', 'Boule puissance 8', 'Légende de mon salon', 'Dieu du tapis', 'Le GOAT', 'Boulet de canon', "Empocheur d'élite", "Calcul d'angle fatal", 'Roi de la chance', 'Boule de feu'].map((t, i) => [t, t, i ? 1 + i : 1]) },
    av: { n: 'Avatars', m: .6, i: [...Array(15)].map((_, i) => ['Boule ' + (i + 1), i + 1, 1]).concat([['Boule 8 pro', 'B8'], ['Cool', 'CO'], ['Cow-boy', 'CB'], ['Renard', 'RE'], ['Loup', 'LO'], ['Lion', 'LI'], ['Tigre', 'TI'], ['Panda', 'PA'], ['Grenouille', 'GR'], ['Pieuvre', 'PI'], ['Requin', 'RQ'], ['Aigle', 'AI'], ['Dragon', 'DR'], ['Licorne', 'LC'], ['Pingouin', 'PG'], ['Hibou', 'HI'], ['Abeille', 'AB'], ['Dino', 'DI'], ['Robot', 'RO'], ['Alien', 'AL'], ['Fantôme', 'FA'], ['Crâne', 'CR'], ['Citrouille', 'CI'], ['Ninja', 'NI'], ['Mage', 'MA'], ['Vampire', 'VA'], ['Génie', 'GE'], ['Héros', 'HE'], ['Couronne', 'CO'], ['Diamant', 'DI'], ['Flamme', 'FL'], ['Éclair', 'EC'], ['Lune', 'LU'], ['Soleil', 'SO'], ['Trèfle', 'TR'], ['Fusée', 'FU'], ['Trophée', 'TO'], ['Cible', 'CI']].map((a, i) => [a[0], a[1], 2 + Math.floor(i * .75)])) },
    fr: { n: 'Cadres', m: 1, i: [['Aucun', 'transparent', 1]] },
    nc: { n: 'Couleurs', m: .9, i: [['Blanc', NC('#e9f1ec', '#e9f1ec'), 1], ['Menthe', NC('#7ff0c0', '#7ff0c0'), 2], ['Ciel', NC('#7cc7ff', '#7cc7ff'), 3], ['Rose', NC('#ff9ad5', '#ff9ad5'), 4], ['Orange', NC('#ffa042', '#ffa042'), 5], ['Citron', NC('#fff06a', '#fff06a'), 6], ['Rouge', NC('#ff5a5a', '#ff5a5a'), 7], ['Violet', NC('#b58cff', '#b58cff'), 8], ['Lime', NC('#a6ff4d', '#a6ff4d'), 9], ['Or', NC('#ffe066', '#d4a017'), 11], ['Argent', NC('#ffffff', '#9aa5b1'), 12], ['Feu', NC('#ffd000', '#ff2200'), 13], ['Glace', NC('#ffffff', '#4fc3ff'), 14], ['Océan', NC('#00e5ff', '#2f5bff'), 15], ['Coucher', NC('#ff9a3c', '#ff3c8e'), 16], ['Néon', NC('#39ff14', '#00e5ff'), 17], ['Aurore', NC('#4cc9f0', '#f72585'), 18], ['Toxique', NC('#b6ff00', '#00b36b'), 19], ['Royal', NC('#ffd60a', '#9b5de5'), 21], ['Arc-en-ciel', 'linear-gradient(90deg,#f33,#fa0,#ee3,#3d6,#3cf,#a5f,#f33)', 24, 1], ['Galaxie', 'linear-gradient(90deg,#7b2ff7,#00e5ff,#ff2bd6,#7b2ff7)', 27, 1], ['Lave', 'linear-gradient(90deg,#ff2200,#ffd000,#ff2200)', 30, 1]] }
  }, CK = Object.keys(CAT);
let PKEY = 'salon8_pf';
const PF = Object.assign({ name: '', xp: 0, coins: 0, tix: 0 }, (() => { try { return JSON.parse(localStorage.getItem(PKEY) || '{}'); } catch (e) { return {}; } })());
const save = () => { try { localStorage.setItem(PKEY, JSON.stringify(PF)); } catch (e) { } };
const lv = x => Math.floor(Math.sqrt(x / 60)) + 1;
PF.inv = PF.inv || {}; PF.eq = PF.eq || {}; CK.forEach(k => { PF.inv[k] = PF.inv[k] || (k == 'cue' && PF.own) || (k == 'av' ? [...Array(15).keys()] : [0]); PF.eq[k] = PF.eq[k] ?? (k == 'cue' ? PF.cue || 0 : k == 'av' ? (PF.av || 1) - 1 : 0); });
const mineD = () => ({ t: PF.eq.ti, n: PF.eq.nc, a: PF.eq.av, f: PF.eq.fr }),
  okD = d => { const o = {}; for (const [k, c] of [['t', 'ti'], ['n', 'nc'], ['a', 'av'], ['f', 'fr']]) o[k] = d && Number.isInteger(d[k]) && d[k] >= 0 && d[k] < CAT[c].i.length ? d[k] : 0; return o; },
  dc = i => mode == 2 ? (i == me ? mineD() : deco[i]) : (i == 0 ? mineD() : null),
  avH = (d = mineD()) => { const v = CAT.av.i[d.a][1]; return `<span class="fr" style="--f:${CAT.fr.i[d.f][1]}">${typeof v == 'number' ? `<i class="d${v > 8 ? ' s' : ''}" data-n="${v}" style="--c:${col(v)}"></i>` : `<i class="pa" style="background:hsl(${d.a * 37 % 360} 45% 32%)">${esc(String(v))}</i>`}</span>`; },
  nH = (s, d) => `<span class="nc${CAT.nc.i[d.n][3] ? ' an' : ''}" style="background-image:${CAT.nc.i[d.n][1]}">${esc(s)}</span>`, tH = d => esc(CAT.ti.i[d.t][0]),
  price = (k, i) => { const it = CAT[k].i[i]; return i == 0 || (k == 'av' && i < 15) ? 0 : Math.round((it[2] * it[2] * 6 + 30 * it[2]) * CAT[k].m / 10) * 10; }, own = (k, i) => PF.inv[k].includes(i),
  applyBg = () => { TB = tableBoard(); },
  applyBalls = () => { CAT.ball.i[PF.eq.ball][1].forEach((c, i) => { COL[i + 1] = c; RGB[i + 1] = [1, 3, 5].map(j => (parseInt(c.slice(j, j + 2), 16) / 255) ** 2); }); B.forEach(b => b._d = 1); },
  sw = (k, it, i) => k == 'cue' ? `<i class="sw" style="height:12px;width:80px;clip-path:polygon(0 40%,100% 0,100% 100%,0 60%);background:linear-gradient(90deg,#f2efe6 6%,${it[1]} 6% 70%,${it[3] || '#1b1b20'} 70% 96%,#1b1b20 96%)"></i>` : k == 'ball' ? `<span class="bs">${it[1].map(c => `<i style="background-color:${c}"></i>`).join('')}</span>` : k == 'bg' ? `<i class="sw" style="width:56px;height:28px;background:${it[1]}"></i>` : k == 'ti' ? '<b class="mv">★</b>' : k == 'av' ? `<span class="mv">${avH({ a: i, f: 0, n: 0, t: 0 })}</span>` : k == 'fr' ? `<span class="mv">${avH({ a: PF.eq.av, f: i, n: 0, t: 0 })}</span>` : `<span class="np"><span class="nc${it[3] ? ' an' : ''}" style="background-image:${it[1]}">${esc(PF.name || 'Pseudo')}</span></span>`,
  lbHtml = () => LB.filter(x => !(T && T.code == x.code)).map(x => `<button onclick="tjoin('${esc(x.code)}')">Tournoi · ${esc(x.name)} · ${x.n} joueur(s) — Rejoindre</button>`).join(''),
  roomHtml = () => { const rooms = Rooms.filter(x => x.code !== ownRoomCode); return rooms.length ? rooms.map(x => `<div class="room-card"><span><strong>Room de ${esc(x.name)}</strong><small>Partie en attente · code ${esc(x.code)}</small></span><button onclick="join('${esc(x.code)}')">Rejoindre</button></div>`).join('') : '<div class="room-empty">Aucune partie en attente pour le moment.</div>'; },
  roomRender = () => { const el = $('room-list'); if (el) el.innerHTML = roomHtml(); };
let LB = [], Rooms = [], ownRoomCode = '';
const lbOk = x => x && typeof x.code == 'string' && /^[A-Z0-9]{5}$/.test(x.code) ? { code: x.code, name: clean(x.name), n: +x.n | 0, round: +x.round | 0 } : null,
  roomOk = x => x && typeof x.code == 'string' && /^[A-Z0-9]{5}$/.test(x.code) && typeof x.name == 'string' ? { code: x.code, name: clean(x.name), n: Math.max(1, +x.n | 0) } : null,
  lbRender = () => { if (mainOn) showMenu(); roomRender(); };
const lobby = createLobby({
  onUpdate: ({ L, R }) => { LB = L || []; Rooms = R || []; lbRender(); },
  lbOk, roomOk
});
function lbAnn() { if (!T) return; lobby.send({ t: 'a', code: T.code, name: T.name, n: T.pl.length, round: T.round }); }
function roomAnn(code) { lobby.send({ t: 'ra', code, name: myName, n: 1 }); }
function roomDel(code) { if (code) lobby.send({ t: 'rd', code }); }
function pause() { if (phase == 'menu') return; if (watchingT) return tview(); paused = mode == 2 ? 0 : 1; ov(`<h2>Pause</h2><p>${mode == 2 ? 'Partie en ligne : le temps continue.' : 'La partie est en attente.'}</p><button onclick="paused=0;$('menu').style.display='none'">Reprendre</button><button class="back" onclick="paused=0;showMenu()">Quitter la partie</button>`); }

let paused = 0, TM = 16, tRw = '', tp = null, tcn = null, tpl = null, TS = null, tvw = 0, tv = 0, inT = 0, watchingT = 0, tMatch = '', liveAt = 0, adminLiveCode = '', adm = 0, T = null, rails = 0, why = '', ssx = 0, ssy = 0, ao = 0, lastA = 0, fv = 0, shiftK = 0, me = 0, peer = null, conn = null, myName = 'Joueur', ntm = 0, hn = '', ds = null, pl = 0, B = [], cur = 0, grp = [null, null], mode = 0, phase = 'menu', hand = false, mouse = { x: 0, y: 0 }, first = null, pot = [], pre = 0, aim = 0, pw = 55, sx = 0, sy = 0, sp = 0, sk = 0, lvl = 1, names = ['Joueur 1', 'Joueur 2'], tl = 30, mute = false;
const col = n => COL[n > 8 ? n - 8 : n], nm = i => names[i], isBot = () => mode == 1 && cur == 1, msg = s => $('msg').textContent = s;
function rf() { fv = 0; }
function nudge(d) { if (human() && !hand) { aim += d; ao += d; } }
function rem(p) { return remaining(B, grp, p); }
function newGame(m) {
  mode = m; lastShot = null; netReady = [0, 0];
  if (m < 2) names = [myName, m ? 'Ordinateur' : 'Joueur 2'];
  cur = cfg.brk == 2 ? Math.random() * 2 | 0 : cfg.brk | 0; grp = [null, null]; hand = false; tl = cfg.time;
  const nums = [1, 2, 3, 4, 5, 6, 7, 9, 10, 11, 12, 13, 14, 15].sort(() => Math.random() - .5); nums.splice(4, 0, 8);
  B = [mk(0, 250, 250)]; let k = 0;
  for (let c = 0; c < 5; c++) for (let r = 0; r <= c; r++) B.push(mk(nums[k++], 700 + c * (R * 1.74 + .4), 250 + (r - c / 2) * (2 * R + .4)));
  aim = 0; ao = 0; rf(); phase = 'aim'; $('menu').style.display = 'none'; msg(nm(cur) + ' casse.'); hud(); if (isBot()) botPlay();
}
function tray(i) { return grp[i] == null ? '' : B.filter(b => b.n > 0 && b.n != 8 && grpOf(b.n) == grp[i]).map(b => `<i class="d${b.n > 8 ? ' s' : ''}" data-n="${b.n}" style="--c:${col(b.n)};opacity:${b.in ? .25 : 1}"></i>`).join(''); }
function hud() {
  [0, 1].forEach(i => { $('p' + i).className = 'pc' + (cur == i ? ' on' : ''); $('p' + i).innerHTML = `<div class="av">${dc(i) ? avH(dc(i)) : esc(nm(i)[0])}</div><div><div class="nm">${dc(i) ? nH(nm(i), dc(i)) : esc(nm(i))}${!(mode == 0 && i == 1) ? '' : ' <small style="opacity:.5;font-size:14px">✎</small>'}</div><div class="gt">${dc(i) ? tH(dc(i)) + ' · ' : ''}${grp[i] == null ? 'groupe à choisir' : grp[i] ? 'rayées' : 'pleines'}</div><div class="tray">${tray(i)}</div></div>`; });
  $('rack').innerHTML = B.filter(b => b.in && b.n > 0).map(b => `<i class="d${b.n > 8 ? ' s' : ''}" data-n="${b.n}" style="--c:${col(b.n)}"></i>`).join('');
  $('undo').disabled = !lastShot || mode == 2 || phase != 'aim';
}
function startShot(a, p, x, y) { aim = a; sp = p; ssx = x; ssy = y; sk = 0; phase = 'strike'; }
function shoot() {
  if (mode < 2) lastShot = snap();
  const c = B[0], v = 3 + sp * 27;
  c.vx = Math.cos(aim) * v; c.vy = Math.sin(aim) * v;
  const w = 2 * v * ssy / R; c.wx = w * Math.sin(aim); c.wy = -w * Math.cos(aim); c.wz = 2 * v * ssx / R;
  phase = 'move'; first = null; rails = 0; pot = []; pre = rem(cur); cueHit(sp); hud();
}
function step() {
  const ctx = { first, rails, pot, onClack: clack, onCush: cushionHit, onPocket: pocketHit };
  stepPhysics(B, cfg, ctx);
  first = ctx.first; rails = ctx.rails;
}
function endTurn() {
  const r = resolveTurn({ balls: B, cur, grp, first, rails, pot, foulsOn: cfg.fouls, pre });
  why = r.why; grp = r.grp;
  if (r.win != null) { hud(); if (mode == 2) send({ t: 'e', s: snap(), win: r.win }); endCard(r.win); return; }
  if (!r.keep) cur = r.cur; else cur = r.cur;
  hand = r.hand; phase = 'aim'; tl = cfg.time; aim = 0; ao = 0; rf(); lastShot = mode < 2 ? lastShot : null;
  msg(r.foul ? `Faute (${r.why}) ! ${nm(cur)} place la blanche.` : r.keep ? `${nm(cur)} rejoue.` : `Au tour de ${nm(cur)}.`);
  hud(); if (mode == 2) send({ t: 'e', s: snap(), m: $('msg').textContent }); if (isBot()) botPlay();
}
function blocked(ax, ay, bx, by, ig) {
  const dx = bx - ax, dy = by - ay, L = dx * dx + dy * dy; if (!L) return true;
  for (const b of B) { if (b.in || ig.includes(b)) continue; const t = ((b.x - ax) * dx + (b.y - ay) * dy) / L; if (t < 0 || t > 1) continue; if (Math.hypot(ax + dx * t - b.x, ay + dy * t - b.y) < 2 * R * .95) return true; }
  return false;
}
function botPlay() {
  setTimeout(() => {
    const c = B[0]; hand = false; const gp = grp[1];
    const cand = B.filter(b => !b.in && b.n > 0 && (gp == null ? b.n != 8 : (rem(1) ? b.n != 8 && grpOf(b.n) == gp : b.n == 8)));
    let best = null, bs = -9;
    for (const t of cand) for (const p of PK) {
      const tx = p[0] - t.x, ty = p[1] - t.y, td = Math.hypot(tx, ty), gx = t.x - tx / td * 2 * R, gy = t.y - ty / td * 2 * R, vx = gx - c.x, vy = gy - c.y, cd = Math.hypot(vx, vy); if (!cd) continue;
      const cs = (vx * tx + vy * ty) / (cd * td), s = cs - (cd + td) / 1500;
      if (cs > .2 && s > bs && !blocked(c.x, c.y, gx, gy, [c, t]) && !blocked(t.x, t.y, p[0], p[1], [c, t])) { bs = s; best = { a: Math.atan2(vy, vx), d: cd + td, pot: 1 }; }
    }
    if (!best || bs < 0.22) {
      const t = cand.find(b => !blocked(c.x, c.y, b.x, b.y, [c, b])) || cand[0] || B.find(b => !b.in && b.n > 0);
      if (t) {
        const walls = [[t.x, R + 4], [t.x, H - R - 4], [R + 4, t.y], [W - R - 4, t.y]];
        let hide = walls[0], hd = 1e9;
        for (const w of walls) { const d = Math.hypot(t.x - w[0], t.y - w[1]); if (d < hd) { hd = d; hide = w; } }
        const gx = t.x + (t.x - hide[0]) * 0.02, gy = t.y + (t.y - hide[1]) * 0.02;
        best = { a: Math.atan2(gy - c.y, gx - c.x), d: Math.hypot(gx - c.x, gy - c.y), pot: 0 };
      }
    }
    const e = [.07, .03, .008][lvl];
    const power = best.pot ? Math.min(.95, .22 + best.d / 1100 + (Math.random() - .5) * e * 3) : Math.min(.45, .12 + best.d / 2200);
    startShot(best.a + (Math.random() - .5) * e * 2, power, 0, 0);
  }, 1000);
}
function pt(e) { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) * CW / r.width - P, y: (e.clientY - r.top) * CH / r.height - P }; }
const free = (x, y) => x > R && x < W - R && y > R && y < H - R && B.every(b => b.n == 0 || b.in || Math.hypot(b.x - x, b.y - y) > 2 * R);
const human = () => phase == 'aim' && !isBot() && (mode != 2 || cur == me);
function fire() { if (!human() || hand) return; if (mode == 2 && me == 1) { send({ t: 's', aim, p: pw / 100, sx, sy }); phase = 'wait'; return; } startShot(aim, pw / 100, sx, sy); if (mode == 2) send({ t: 'go', aim, p: pw / 100, sx, sy, s: snap() }); }
function undoShot() { if (!lastShot || mode == 2 || phase != 'aim') return; applySnap(lastShot); lastShot = null; phase = 'aim'; ao = 0; rf(); hud(); msg('Coup précédent restauré.'); }
cv.onpointermove = e => { mouse = pt(e); if (!human()) return; if (hand) { if (free(mouse.x, mouse.y)) { B[0].x = mouse.x; B[0].y = mouse.y; netHand(0); } } else if (ds) { pl = Math.max(0, -((mouse.x - ds.x) * Math.cos(aim) + (mouse.y - ds.y) * Math.sin(aim))); setPw(Math.min(100, pl / 2.2)); } else { const a = Math.atan2(mouse.y - B[0].y, mouse.x - B[0].x); if (shiftK) { let d = a - lastA; d = Math.atan2(Math.sin(d), Math.cos(d)); ao -= d * .9; } lastA = a; aim = a + ao; } };
cv.onpointerdown = e => { if (!human()) return; mouse = pt(e); if (hand) { if (free(mouse.x, mouse.y)) { B[0].x = mouse.x; B[0].y = mouse.y; hand = false; netHand(1); } return; } lastA = Math.atan2(mouse.y - B[0].y, mouse.x - B[0].x); aim = lastA + ao; ds = { x: mouse.x, y: mouse.y }; pl = 0; cv.setPointerCapture(e.pointerId); setPw(5); };
cv.onpointerup = cv.onpointercancel = () => { if (!ds) return; ds = null; if (pl > 14) fire(); pl = 0; };
function setPw(v) { pw = Math.max(5, Math.min(100, Math.round(v))); $('gf').style.height = pw + '%'; $('gf').style.backgroundSize = '100% ' + 10000 / pw + '%'; $('gp').textContent = pw; }
$('gauge').onpointerdown = $('gauge').onpointermove = e => { if (e.type == 'pointermove' && !e.buttons) return; const r = $('gauge').getBoundingClientRect(); setPw((r.bottom - e.clientY) / r.height * 100); };
$('spin').onpointerdown = e => { const r = $('spin').getBoundingClientRect(), w = r.width / 2; let x = (e.clientX - r.left - w) / w, y = (e.clientY - r.top - w) / w; const l = Math.hypot(x, y); if (l > .7) { x *= .7 / l; y *= .7 / l; } sx = x; sy = -y; $('sd').style.left = (w + x * w - 5) + 'px'; $('sd').style.top = (w + y * w - 5) + 'px'; };
onkeydown = e => { if (['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName)) return; if (e.key == 'Shift') shiftK = 1; if (e.key == ' ') { e.preventDefault(); fire(); } if (e.key == 'z' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); undoShot(); } const k = e.shiftKey ? .00005 : .0002; if (e.key == 'ArrowLeft') nudge(-k); if (e.key == 'ArrowRight') nudge(k); if (e.key == 'ArrowUp') setPw(pw + 2); if (e.key == 'ArrowDown') setPw(pw - 2); };
onkeyup = e => { if (e.key == 'Shift') shiftK = 0; };
cv.onwheel = e => { e.preventDefault(); nudge(Math.sign(e.deltaY) * (shiftK ? .00005 : .0002)); };
const K = 3, S = 2 * R + 4, SS = S * K, Rk = R * K, NT = 64, NX = [];
const RGB = COL.map(h => [1, 3, 5].map(i => (parseInt(h.slice(i, i + 2), 16) / 255) ** 2));
const sm = (a, b, x) => { x = Math.max(0, Math.min(1, (x - a) / (b - a))); return x * x * (3 - 2 * x); };
(() => { const c = document.createElement('canvas'); c.width = c.height = NT; const x = c.getContext('2d'); x.textAlign = 'center'; x.textBaseline = 'middle';
  for (let n = 1; n < 16; n++) { x.clearRect(0, 0, NT, NT); const t = '' + n; x.font = `800 ${t.length > 1 ? 34 : 46}px Arial,sans-serif`; x.fillText(t, NT / 2, NT / 2 + 2); if (n == 6 || n == 9) x.fillRect(NT / 2 - 9, NT - 10, 18, 4);
    const d = x.getImageData(0, 0, NT, NT).data; NX[n] = Uint8Array.from({ length: NT * NT }, (_, i) => d[i * 4 + 3]); } })();
function paint(b) { const d = b._i.data, m = b.M, n = b.n, st = n > 8, bs = RGB[st ? n - 8 : n], T = NX[n], h = SS / 2, lim = 1 + 1.2 / Rk;
  for (let j = 0; j < SS; j++) { const py = (j + .5 - h) / Rk; for (let i = 0; i < SS; i++) { const px = (i + .5 - h) / Rk, r2 = px * px + py * py, o = (j * SS + i) * 4;
    if (r2 > lim * lim) { d[o + 3] = 0; continue; }
    const nz = Math.sqrt(Math.max(0, 1 - r2)), vz = -nz, lx = m[0] * px + m[3] * py + m[6] * vz, ly = m[1] * px + m[4] * py + m[7] * vz, lz = m[2] * px + m[5] * py + m[8] * vz;
    let a0 = bs[0], a1 = bs[1], a2 = bs[2];
    if (!n) { const e = sm(.962, .976, Math.max(Math.abs(lx), Math.abs(ly), Math.abs(lz))); a0 = .9 - .7 * e; a1 = .87 - .84 * e; a2 = .8 - .77 * e; }
    else { if (st) { const w = sm(.65, .67, Math.abs(ly)); a0 += (.9 - a0) * w; a1 += (.87 - a1) * w; a2 += (.8 - a2) * w; }
      const rr = Math.hypot(lx, ly) / .52;
      if (rr < 1.1) { const k = 1 - sm(.93, 1, rr); if (k > 0) { const u = ((lz > 0 ? lx : -lx) / .52 * .5 + .5) * (NT - 1), v = (ly / .52 * .5 + .5) * (NT - 1), x0 = Math.max(0, Math.min(NT - 2, u | 0)), y0 = Math.max(0, Math.min(NT - 2, v | 0)), fx = Math.max(0, Math.min(1, u - x0)), fy = Math.max(0, Math.min(1, v - y0)), q = y0 * NT + x0, t = ((T[q] * (1 - fx) + T[q + 1] * fx) * (1 - fy) + (T[q + NT] * (1 - fx) + T[q + NT + 1] * fx) * fy) / 255;
        a0 += (.9 * (1 - t) + .01 * t - a0) * k; a1 += (.87 * (1 - t) + .01 * t - a1) * k; a2 += (.8 * (1 - t) + .014 * t - a2) * k; } } }
    const k = r2 > .86 ? .72 : 1; d[o] = 255 * Math.sqrt(a0) * k; d[o + 1] = 255 * Math.sqrt(a1) * k; d[o + 2] = 255 * Math.sqrt(a2) * k;
    d[o + 3] = 255 * Math.min(1, Math.max(0, (1 - Math.sqrt(r2)) * Rk + .5)); } } }
function sprite(b) { if (!b._c) { b._c = document.createElement('canvas'); b._c.width = b._c.height = SS; b._x = b._c.getContext('2d'); b._i = b._x.createImageData(SS, SS); b._d = 1; } if (b._d) { paint(b); b._x.putImageData(b._i, 0, 0); b._d = 0; } return b._c; }
function ray(c, ux, uy) { let t = 1e9, hb = null;
  for (const b of B) { if (b === c || b.in) continue; const dx = b.x - c.x, dy = b.y - c.y, pr = dx * ux + dy * uy; if (pr <= 0) continue; const d2 = dx * dx + dy * dy - pr * pr; if (d2 < 4 * R * R) { const tt = pr - Math.sqrt(4 * R * R - d2); if (tt < t) { t = tt; hb = b; } } }
  const tx = ux > 0 ? (W - R - c.x) / ux : ux < 0 ? (R - c.x) / ux : 1e9, ty = uy > 0 ? (H - R - c.y) / uy : uy < 0 ? (R - c.y) / uy : 1e9, tw = Math.min(tx, ty);
  return tw < t ? { t: tw, hb: null } : { t, hb }; }
let TB; function tableBoard() { const c = document.createElement('canvas'); c.width = CW * DPR; c.height = CH * DPR; const t = c.getContext('2d'); t.scale(DPR, DPR);
  const colors = (CAT.bg.i[PF.eq.bg][1].match(/#[0-9a-f]{3,8}/ig) || []), rgb = h => { let s = h.slice(1); if (s.length == 3) s = s.split('').map(x => x + x).join(''); return s.length >= 6 ? '#' + s.slice(0, 6) : '#1c5a42'; }, cloth = colors.length ? rgb(colors[0]) : '#0f2a20', cloth2 = colors.length > 1 ? rgb(colors[1]) : '#1c5a42';
  t.fillStyle = '#0a1e16'; t.beginPath(); t.roundRect(0, 0, CW, CH, 24); t.fill();
  const felt = t.createLinearGradient(P, P, P + W, P + H); felt.addColorStop(0, cloth2); felt.addColorStop(1, cloth); t.fillStyle = felt; t.fillRect(P, P, W, H);
  const fiber = document.createElement('canvas'); fiber.width = fiber.height = 64; const f = fiber.getContext('2d'); for (let i = 0; i < 520; i++) { const x = Math.random() * 64, y = Math.random() * 64; f.strokeStyle = i % 2 ? '#fff' : '#000'; f.globalAlpha = .04 + Math.random() * .1; f.lineWidth = .4 + Math.random() * .8; f.beginPath(); f.moveTo(x, y); f.lineTo(x + Math.random() * 3, y + Math.random() * 2); f.stroke(); } f.globalAlpha = 1;
  t.globalAlpha = .22; t.fillStyle = t.createPattern(fiber, 'repeat'); t.fillRect(P, P, W, H); t.globalAlpha = 1;
  t.strokeStyle = '#101b18'; t.lineWidth = 14; t.strokeRect(P - 7, P - 7, W + 14, H + 14);
  t.fillStyle = '#7fa393'; const dt = (x, y) => { t.beginPath(); t.arc(x, y, 2.5, 0, 7); t.fill(); };
  for (let i = 1; i < 8; i++) if (i != 4) { dt(P + W / 8 * i, 16); dt(P + W / 8 * i, CH - 16); } for (let i = 1; i < 4; i++) { dt(16, P + H / 4 * i); dt(CW - 16, P + H / 4 * i); }
  t.fillStyle = '#ffffff22'; t.fillRect(P + 249.2, P, 1.6, H); t.beginPath(); t.arc(P + 700, P + 250, 3, 0, 7); t.fill();
  t.fillStyle = '#050c09'; for (const p of PK) { t.beginPath(); t.arc(P + p[0], P + p[1], p[2], 0, 7); t.fill(); }
  return c; }
const SZ = R * 5, SH = (() => { const c = document.createElement('canvas'); c.width = c.height = SZ * DPR; const x = c.getContext('2d'); x.scale(DPR, DPR); const m = SZ / 2;
  [[3.5, 5.5, .2, 1.75, .5, .26], [.8, 1.8, .6, 1.12, .65, .4]].forEach(([dx, dy, a, b, p, q]) => { const r = x.createRadialGradient(m + dx, m + dy, R * a, m + dx, m + dy, R * b); r.addColorStop(0, `rgba(0,0,0,${p})`); r.addColorStop(.6, `rgba(0,0,0,${q})`); r.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = r; x.fillRect(0, 0, SZ, SZ); }); return c; })();
function line(x1, y1, x2, y2, c, w, d) { g.strokeStyle = c; g.lineWidth = w; g.lineCap = d ? 'round' : 'butt'; g.setLineDash(d || []); g.beginPath(); g.moveTo(x1 + P, y1 + P); g.lineTo(x2 + P, y2 + P); g.stroke(); g.setLineDash([]); }
function draw() { $('deg').textContent = (((aim * 57.29578) % 360 + 360) % 360).toFixed(2) + '°'; g.drawImage(TB, 0, 0, CW, CH);
  for (const b of B) if (!b.in) g.drawImage(SH, b.x + P - SZ / 2, b.y + P - SZ / 2 + 2, SZ, SZ);
  for (const b of B) if (!b.in) g.drawImage(sprite(b), b.x + P - S / 2, b.y + P - S / 2, S, S);
  const c = B[0], aimCol = mode == 2 && cur != me ? '#ffffff55' : '#ffffffb0'; if ((phase == 'aim' || phase == 'strike') && !c.in && (!isBot() || phase == 'strike')) {
    const ux = Math.cos(aim), uy = Math.sin(aim);
    if (phase == 'aim' && !hand && cfg.aim) { const r = ray(c, ux, uy), gx = c.x + ux * r.t, gy = c.y + uy * r.t;
      if (cfg.aim >= 1) line(c.x, c.y, gx, gy, aimCol, 2, [1, 8]);
      if (cfg.aim >= 2) { g.fillStyle = mode == 2 && cur != me ? '#ffffff08' : '#ffffff18'; g.strokeStyle = mode == 2 && cur != me ? '#ffffff70' : '#fffffff0'; g.lineWidth = 1.8; g.beginPath(); g.arc(gx + P, gy + P, R, 0, 7); g.fill(); g.stroke();
        if (r.hb) { const nx = (r.hb.x - gx) / (2 * R), ny = (r.hb.y - gy) / (2 * R); line(r.hb.x, r.hb.y, r.hb.x + nx * 70, r.hb.y + ny * 70, mode == 2 && cur != me ? '#e9f1ec55' : '#e9f1ecaa', 2);
          const dp = ux * nx + uy * ny, tx = ux - dp * nx, ty = uy - dp * ny, tl2 = Math.hypot(tx, ty) || 1; line(gx, gy, gx + tx / tl2 * 60, gy + ty / tl2 * 60, mode == 2 && cur != me ? '#ffffff40' : '#ffffff80', 2); } } }
    if (phase == 'aim' && hand) { g.strokeStyle = '#e9f1ec'; g.lineWidth = 2; g.setLineDash([4, 4]); g.beginPath(); g.arc(c.x + P, c.y + P, R + 5, 0, 7); g.stroke(); g.setLineDash([]); }
    else { const pull = (8 + (phase == 'strike' ? sp : pw / 100) * 75) * (phase == 'strike' ? Math.pow(1 - sk / 7, 2) : 1), o = R + 4 + pull, nx = -uy, ny = ux,
      pq = (a, b, w0, w1, col) => { g.fillStyle = col; g.beginPath(); g.moveTo(c.x + P - ux * (o + a) - nx * w0, c.y + P - uy * (o + a) - ny * w0); g.lineTo(c.x + P - ux * (o + b) - nx * w1, c.y + P - uy * (o + b) - ny * w1); g.lineTo(c.x + P - ux * (o + b) + nx * w1, c.y + P - uy * (o + b) + ny * w1); g.lineTo(c.x + P - ux * (o + a) + nx * w0, c.y + P - uy * (o + a) + ny * w0); g.closePath(); g.fill(); };
      { const Q = CAT.cue.i[PF.eq.cue], A = Q[3] || '#1b1b20'; g.save(); g.shadowColor = '#0007'; g.shadowBlur = 10; g.shadowOffsetY = 4; pq(0, 330, 2.6, 6.4, '#000'); g.restore(); pq(0, 5, 2.6, 2.8, '#4a90c8'); pq(5, 18, 2.8, 3, '#f2efe6'); pq(18, 235, 3, 5.2, Q[1]); pq(235, 300, 5.2, 6, A); pq(300, 330, 6, 6.4, '#1b1b20'); pq(120, 126, 4.2, 4.3, A); pq(18, 235, .6, 1.4, '#ffffff40'); } } } }
requestAnimationFrame(function loop() { if (paused) { draw(); return requestAnimationFrame(loop); } if (watchingT) { draw(); return requestAnimationFrame(loop); } if (phase == 'strike' && ++sk >= 7) shoot(); else if (phase == 'move') { step(); if (!moving(B)) { if (mode == 2 && me == 1) phase = 'wait'; else endTurn(); } } draw(); requestAnimationFrame(loop); });
setInterval(() => { if (phase != 'aim' || paused) return; if (!cfg.time) { $('tm').style.setProperty('--p', 100); $('tm').firstChild.textContent = '∞'; return; } tl--; $('tm').style.setProperty('--p', Math.max(tl, 0) / cfg.time * 100); $('tm').firstChild.textContent = Math.max(tl, 0);
  if (tl <= 0) { if (mode == 2 && me == 1) return; hand = false; cur = 1 - cur; tl = cfg.time; msg('Temps écoulé : au tour de ' + nm(cur) + '.'); hud(); if (mode == 2) send({ t: 'e', s: snap(), m: $('msg').textContent }); if (isBot()) botPlay(); } }, 1000);
const NOPEER = "Le module en ligne n'a pas pu se charger (pas de connexion, ou page bloquée).", NOSRV = "Impossible de joindre le serveur de mise en relation.";
function esc(s) { return String(s).replace(/[&<>"']/g, c => '&#' + c.charCodeAt(0) + ';'); }
function clean(s) { return String(s || '').replace(/[<>&"'\\]/g, '').trim().slice(0, 14) || 'Joueur'; }
myName = PF.name || 'Joueur';
function setName(v) { myName = clean(v); try { localStorage.setItem('salon8_name', myName); } catch (e) { } }
const ov = h => { mainOn = 0; $('pf').style.display = 'none'; $('menu').querySelector('.card').innerHTML = h; $('menu').style.display = 'flex'; };
function showMenu0(t = 'Salon 8', p = 'Choisis comment jouer.') {
  mainOn = 0; paused = 0; phase = 'menu'; mode = 0; me = 0; tvw = 0; tv = 0; inT = 0; watchingT = 0; netReady = [0, 0];
  if (ownRoomCode) { roomDel(ownRoomCode); ownRoomCode = ''; } if (conn) { try { conn.close(); } catch (e) { } conn = null; } if (peer) { try { peer.destroy(); } catch (e) { } peer = null; }
  ov(`<h2>${t}</h2><p>${adm ? 'Mode admin activé.' : p}</p>${lbHtml()}<div class="menu-actions"><button class="primary" onclick="menuBot()">Jouer contre l'ordinateur</button><button onclick="menuNet()">Jouer en ligne</button><button onclick="pfCard()">Profil et cosmétiques</button><button class="shopb" onclick="shop('cue')">Boutique</button><button onclick="menuSet()">Réglages de la partie</button><button onclick="histCard()">Historique</button>${tcn ? '<button onclick="tview()">Retour à la salle du tournoi</button>' : ''}${adm ? (T ? '<button onclick="tadm(1)">Mon tournoi</button>' : '<button onclick="tourNew()">Créer un tournoi</button>') + '<button onclick="admPanel()">Paramètres admin</button>' : ''}</div>`);
}
function menuBot() { menuSet('newGame(1)', 'Lancer la partie', `<label class="lb">Difficulté<select id="sl">${['Facile', 'Moyen', 'Expert'].map((t, i) => `<option value="${i}"${lvl == i ? ' selected' : ''}>${t}</option>`).join('')}</select></label>`, "Salon · contre l'ordinateur"); }
function menuNet() { ov(`<h2>Jouer en ligne</h2><p>Rejoins une partie disponible ou crée ta propre room.</p><button class="primary" onclick="menuSet('host()','Créer la room','','Nouvelle partie en ligne')">Créer une partie</button><div class="room-heading">Rooms de parties en attente</div><div class="room-list" id="room-list">${roomHtml()}</div><label class="lb" style="margin-top:14px">Rejoindre avec un code<div class="row"><input id="cd" placeholder="Code de la room" maxlength="5" style="text-transform:uppercase"><button onclick="join($('cd').value)">Rejoindre</button></div></label><button class="back" onclick="showMenu()">Retour</button>`); }
function adminPw() { ov(`<h2>Mode admin</h2><p>Entre le mot de passe.</p><input id="ap" type="password" onkeydown="if(event.key=='Enter')adminOk()"><p id="ae" style="margin:0"></p><button onclick="adminOk()">Valider</button><button class="back" onclick="showMenu()">Annuler</button>`); $('ap').focus(); }
function adminOk() {
  const v = $('ap')?.value || '';
  const ok = [...v].reduce((a, c, i) => a + c.charCodeAt(0) * (i + 3), 0);
  if (ok === 3300 && v.length === 6) swProf('salon8_pfA');
  else $('ae').textContent = 'Mot de passe incorrect.';
}
function menuSet(go, lab, ex = '', t = 'Réglages') { ov(`<h2>${t}</h2>${ex}<label class="lb">Temps par joueur<select id="st">${[[0, 'Illimité'], [15, '15 s'], [30, '30 s'], [45, '45 s'], [60, '60 s']].map(([v, t]) => `<option value="${v}"${cfg.time == v ? ' selected' : ''}>${t}</option>`).join('')}</select></label><label class="lb">Aide à la visée<select id="sa">${[[0, 'Aucune'], [1, 'Ligne seulement'], [2, 'Ligne + fantôme']].map(([v, t]) => `<option value="${v}"${cfg.aim == v ? ' selected' : ''}>${t}</option>`).join('')}</select></label><label class="lb"><input type="checkbox" id="sf"${cfg.fouls ? ' checked' : ''}>Fautes (blanche en main)</label><label class="lb"><input type="checkbox" id="ss"${cfg.snd ? ' checked' : ''}>Son</label><label class="lb">Qui casse<select id="sb">${[[0, "Moi / l'hôte"], [1, "L'adversaire"], [2, 'Au hasard']].map(([v, t]) => `<option value="${v}"${cfg.brk == v ? ' selected' : ''}>${t}</option>`).join('')}</select></label><label class="lb">Tapis<select id="sr">${[[.9945, 'Rapide'], [.9915, 'Normal'], [.988, 'Lent']].map(([v, t]) => `<option value="${v}"${cfg.rl == v ? ' selected' : ''}>${t}</option>`).join('')}</select></label><button onclick="saveSet();${go || 'showMenu()'}">${lab || 'Enregistrer'}</button><button class="back" onclick="showMenu()">Retour</button>`); }
function saveSet() { cfg.time = +$('st').value; cfg.aim = +$('sa').value; cfg.fouls = $('sf').checked ? 1 : 0; cfg.snd = $('ss').checked ? 1 : 0; mute = !cfg.snd; setMute(mute); cfg.brk = +$('sb').value; cfg.rl = +$('sr').value; if ($('sl')) lvl = +$('sl').value; }
const xpP = () => { const L = lv(PF.xp), a = 60 * (L - 1) * (L - 1); return (PF.xp - a) / (60 * L * L - a) * 100; }, CODE = () => Array.from({ length: 5 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.random() * 32 | 0]).join('');
function pfRender() { const d = mineD(); $('pf').innerHTML = `<button class="pfb" onclick="pfCard()"><span class="pm">${avH(d)}</span><span><b>${nH(PF.name, d)}</b><small>${tH(d)} · Niv. ${lv(PF.xp)} · ${PF.coins} ◎</small><i class="xpb"><u style="width:${xpP()}%"></u></i></span></button>`; $('pf').style.display = 'block'; }
function showMenu(...a) { showMenu0(...a); if (!$('ap')) pfRender(); mainOn = !$('ap') && phase == 'menu'; }
function pfCard() { const d = mineD(); ov(`<div class="pm big">${avH(d)}</div><h2>${nH(PF.name, d)}</h2><p>${tH(d)}<br>Niveau ${lv(PF.xp)} · ${PF.xp} XP · ${PF.coins} ◎ · ${PF.tix} ticket(s) de renommage</p><button onclick="shop('av')">Boutique et personnalisation</button><button onclick="${PF.tix ? 'pfName()' : "shop('tix')"}">Changer de pseudo (${PF.tix ? '1 ticket' : 'ticket requis'})</button><button onclick="exportPf()">Exporter le profil</button><button onclick="importPf()">Importer un profil</button><button class="back" onclick="showMenu()">Retour</button>`); }
function exportPf() { const blob = new Blob([exportProfile({ PF, ADM: adm ? ADM : undefined })], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'salon8-profil.json'; a.click(); }
function importPf() { ov(`<h2>Importer</h2><p>Colle le JSON de ton profil.</p><textarea id="im" rows="8"></textarea><button onclick="importPfOk()">Valider</button><button class="back" onclick="pfCard()">Annuler</button>`); }
function importPfOk() { try { const o = parseProfile($('im').value); if (o.PF) Object.assign(PF, o.PF); else Object.assign(PF, o); save(); applyBg(); applyBalls(); showMenu(); } catch (e) { ov('<h2>Import</h2><p>Fichier invalide.</p><button onclick="pfCard()">Retour</button>'); } }
function histCard() {
  const h = listMatches();
  const modes = ['Local', 'Ordinateur', 'En ligne'];
  ov(`<h2>Historique</h2>${h.length ? `<ul class="hist">${h.map(x => `<li>${new Date(x.t).toLocaleString()} · ${esc(modes[x.mode] || '')} · ${esc((x.names || []).join(' vs '))} · ${esc(x.winner || '')}</li>`).join('')}</ul>` : '<p>Aucune partie enregistrée.</p>'}<button class="back" onclick="showMenu()">Retour</button>`);
}
function shop(k) { const cd = () => $('menu').querySelector('.card'), y = k ? 0 : cd().scrollTop; if (k) shopC = k; const L = lv(PF.xp), tabs = [...CK.filter(x => x != 'fr'), 'tix'].map(x => `<button class="tb${x == shopC ? ' on' : ''}" onclick="shop('${x}')">${x == 'tix' ? 'Ticket' : CAT[x].n}</button>`).join('');
  const body = shopC == 'tix' ? `<div class="row it"><span>Ticket de renommage<small>${ADM.tix} ◎ · tu en as ${PF.tix}</small></span><button ${PF.coins < ADM.tix ? 'disabled' : ''} onclick="buy('tix',0)">Acheter</button></div>` : CAT[shopC].i.map((it, i) => { const o = own(shopC, i), e = PF.eq[shopC] == i, p = price(shopC, i), no = !o && (L < it[2] || PF.coins < p); return `<div class="row it">${sw(shopC, it, i)}<span>${esc(it[0])}<small>${o ? 'Possédé' : 'Niv. ' + it[2] + ' · ' + p + ' ◎'}</small></span><button ${e || no ? 'disabled' : ''} onclick="buy('${shopC}',${i})">${e ? 'Équipé' : o ? 'Équiper' : 'Acheter'}</button></div>`; }).join('');
  ov(`<h2>Boutique</h2><p>${PF.coins} ◎ · niveau ${L}</p><div class="tbs">${tabs}</div>${body}<button class="back" onclick="pfCard()">Retour</button>`); cd().scrollTop = y; }
function buy(k, i) { if (k == 'tix') { if (PF.coins >= ADM.tix) { PF.coins -= ADM.tix; PF.tix++; } } else { const it = CAT[k].i[i], p = price(k, i); if (own(k, i)) PF.eq[k] = i; else if (lv(PF.xp) >= it[2] && PF.coins >= p) { PF.coins -= p; PF.inv[k].push(i); PF.eq[k] = i; } } save(); if (k == 'bg') applyBg(); if (k == 'ball') applyBalls(); shop(); }
function pfName() { ov(`<h2>Nouveau pseudo</h2><p>Utilise 1 ticket de renommage.</p><input id="wn" maxlength="14" value="${esc(PF.name)}"><button onclick="pfNameOk()">Valider</button><button class="back" onclick="pfCard()">Annuler</button>`); }
function pfNameOk() { const v = $('wn').value.trim(); if (!v || !PF.tix) return; PF.tix--; PF.name = clean(v); setName(PF.name); save(); showMenu(); }
function welcome() { ov(`<h2>Bienvenue</h2><p>Choisis ton pseudo. Le changer ensuite coûte un ticket de renommage.</p><input id="wn" maxlength="14" placeholder="Pseudo" onkeydown="if(event.key=='Enter')welcomeOk()"><button onclick="welcomeOk()">Commencer</button>`); }
function welcomeOk() { const v = $('wn').value.trim(); if (!v) return; PF.name = clean(v); setName(PF.name); save(); showMenu(); }
function tourNew() { ov(`<h2>Nouveau tournoi</h2><label class="lb">Nom<input id="tn" value="Tournoi" maxlength="20"></label><label class="lb">Joueurs max<select id="tm">${[4, 8, 16, 32].map(v => `<option${v == TM ? ' selected' : ''}>${v}</option>`).join('')}</select></label><button onclick="TT=clean($('tn').value);TM=+$('tm').value;menuSet('tourOpen()','Ouvrir les inscriptions','','Réglages du tournoi')">Suivant : réglages</button><button class="back" onclick="showMenu()">Retour</button>`); }
let TT = 'Tournoi';
function tourOpen() {
  const code = CODE(); T = { name: TT, code, pl: [], spec: [], round: 0, list: [], ms: [], live: null, champ: null, cfg: { time: cfg.time, fouls: cfg.fouls, aim: cfg.aim, brk: cfg.brk, rl: cfg.rl }, max: TM, out: {}, R: 0, rw: rwSnap() };
  try { tp = new Peer('salon8t-' + code, peerOpts); } catch (e) { return netErr(NOSRV); }
  tp.on('open', () => { tadm(1); lbAnn(); }); tp.on('error', () => netErr(NOSRV));
  tp.on('connection', c => { c.on('data', d => {
    if (!d || typeof d != 'object') return;
    if (d.t == 'j' && !T.round) { const n = clean(d.name); if (T.pl.some(p => p.n.toLowerCase() == n.toLowerCase())) return c.send({ t: 'x' }); if (T.pl.length >= T.max) return c.send({ t: 'f' }); const counts = [T.pl.filter(p => p.side == 1).length, T.pl.filter(p => p.side == 2).length], side = counts[0] == counts[1] ? (Math.random() < .5 ? 1 : 2) : (counts[0] < counts[1] ? 1 : 2); T.pl.push({ n, c, side }); c.send({ t: 'j', side }); c.on('close', () => { if (!T.round) { T.pl = T.pl.filter(p => p.c !== c); tbc(); } else tforfeit(n); }); tbc(); }
    else if (d.t == 'j' && T.round) { if (!c.tournamentSpectator) { c.tournamentSpectator = 1; T.spec.push(c); c.on('close', () => { T.spec = T.spec.filter(x => x !== c); }); } c.send({ t: 's', S: tourState() }); }
    else if (d.t == 'w') { const w = clean(d.w), i = T.ms.findIndex(m => !m.d && m.code == d.code && (m.a == w || m.b == w)); if (i >= 0) tw(i, T.ms[i].a == w ? 0 : 1); }
    else if (d.t == 'v' && T.round && d.v && typeof d.v.code == 'string') { const m = T.ms.find(x => !x.d && x.code == d.v.code); if (!m || !d.v.s || !okSnap(d.v.s)) return; T.live = { code: m.code, names: [clean(d.v.names && d.v.names[0]), clean(d.v.names && d.v.names[1])], phase: ['aim', 'strike', 'move', 'wait', 'menu'].includes(d.v.phase) ? d.v.phase : 'aim', aim: isFinite(d.v.aim) ? +d.v.aim : 0, pw: isFinite(d.v.pw) ? +d.v.pw : 55, s: d.v.s }; T.pl.forEach(p => { if (p.c !== c && p.c.open) try { p.c.send({ t: 'v', v: T.live }); } catch (e) { } }); T.spec.forEach(s => { if (s.open) try { s.send({ t: 'v', v: T.live }); } catch (e) { } }); if (watchingT) { TS = TS || {}; TS.live = T.live; watchLive(); } else if (tv && adminLiveCode != T.live.code) { adminLiveCode = T.live.code; tadm(1); } }
  }); });
}
function tourState() { return { k: T.code, out: T.out, rw: T.rw, name: T.name, pl: T.pl.map(p => ({ n: p.n, side: p.side })), round: T.round, champ: T.champ, live: T.live, ms: T.ms.map(m => ({ a: m.a, b: m.b, w: m.w, code: m.code })) }; }
function tbc() { lbAnn(); const S = tourState(); T.pl.forEach(p => { try { p.c.send({ t: 's', S }); } catch (e) { } }); T.spec.forEach(c => { if (c.open) try { c.send({ t: 's', S }); } catch (e) { } }); tadm(); }
function teamMarkup(players, admin = false) { return `<div class="teams">${[1, 2].map(side => `<section class="team"><h3>ÉQUIPE ${side} · ${side == 1 ? 'À GAUCHE' : 'À DROITE'} <small>(${players.filter(p => p.side == side).length})</small></h3>${players.filter(p => p.side == side).map(p => `<div class="team-player"><span>${esc(p.n)}</span>${admin ? `<button onclick="tmove('${esc(p.n)}',${3 - side})">${side == 1 ? 'Déplacer à droite →' : '← Déplacer à gauche'}</button>` : ''}</div>`).join('') || '<small>En attente de joueurs…</small>'}</section>`).join('')}</div>`; }
function tmove(name, side) { if (!T || T.round) return; const p = T.pl.find(x => x.n == name); if (!p) return; p.side = side; tbc(); tadm(1); }
function tforfeit(name) { if (!T || !T.round) return; const m = T.ms.find(x => !x.d && (x.a == name || x.b == name)); if (!m) return; m.d = 1; m.w = m.a == name ? m.b : m.a; if (name) T.out[name] = 2 ** (T.R - T.round + 1); tnext(); }
function tadm(f) { if (!T) return; if (!f && !tv) return; tv = 1; const teams = teamMarkup(T.pl, true), status = T.round ? (T.champ ? `<p>${esc(T.champ)} remporte le tournoi !</p>` : `<p>Tour ${T.round}</p>`) + T.ms.map((m, i) => `<div class="row it"><span>${esc(m.a || '—')} contre ${esc(m.b || '—')}<small>${m.w ? 'Vainqueur : ' + esc(m.w) : 'Match en cours (résultat automatique)'}</small></span>${m.w ? '' : `<button onclick="tw(${i},0)">${esc(m.a)}</button><button onclick="tw(${i},1)">${esc(m.b)}</button>`}</div>`).join('') : `<p>${T.pl.length}/${T.max} joueurs inscrits</p>${T.pl.length >= 2 ? '<button class="primary" onclick="tstart()">Lancer le tournoi</button>' : ''}`; ov(`<h2>${esc(T.name)}</h2><p>Code du tournoi : <b>${esc(T.code)}</b></p>${teams}${T.live ? `<p><span class="room-label">PARTIE EN DIRECT</span> · ${esc(T.live.names.join(' contre '))}</p><button class="primary" onclick="watchLive()">Observer la partie</button>` : ''}${status}<button class="back" onclick="showMenu()">Menu</button><button class="back" onclick="tclose()">Fermer le tournoi</button>`); }
function tstart() { if (!T || T.round || T.pl.length < 2) return; const one = T.pl.filter(p => p.side == 1).map(p => p.n).sort(() => Math.random() - .5), two = T.pl.filter(p => p.side == 2).map(p => p.n).sort(() => Math.random() - .5), l = []; for (let i = 0; i < Math.max(one.length, two.length); i++) { if (one[i]) l.push(one[i]); if (two[i]) l.push(two[i]); } let z = 2; while (z < l.length) z *= 2; while (l.length < z) l.push(null); T.list = l; T.R = Math.log2(z); T.round = 1; tround(); }
function tround() { const l = T.list; T.live = null; T.ms = []; for (let i = 0; i < l.length; i += 2) { const a = l[i], b = l[i + 1], d = a == null || b == null; T.ms.push({ a, b, d, w: d ? (a ?? b ?? null) : null, s: 0, code: '' }); } tnext(); }
function tnext() { if (T.ms.every(m => m.d)) { const nx = T.ms.map(m => m.w); if (nx.length == 1) T.champ = nx[0]; else { T.list = nx; T.round++; return tround(); } }
  T.ms.forEach(m => { if (m.d || m.s) return; m.s = 1; m.code = CODE(); const pa = T.pl.find(p => p.n == m.a), pb = T.pl.find(p => p.n == m.b); if (!pa || !pb || !pa.c.open || !pb.c.open) { m.d = 1; m.w = pa && pa.c.open ? m.a : pb && pb.c.open ? m.b : null; return; } try { pa.c.send({ t: 'm', code: m.code, h: 1, cfg: T.cfg }); pb.c.send({ t: 'm', code: m.code, h: 0, cfg: T.cfg }); } catch (e) { m.s = 0; } }); tbc(); }
function tw(i, k) { const m = T.ms[i]; if (!m || m.d) return; m.d = 1; m.w = k ? m.b : m.a; if (T.live && T.live.code == m.code) T.live = null; const lo = k ? m.a : m.b; if (lo) T.out[lo] = 2 ** (T.R - T.round + 1); tnext(); }
function tjoin(code) { code = (code || '').trim().toUpperCase(); if (code.length < 5) return netErr('Entre le code à 5 caractères.'); ov('<h2>Connexion…</h2><p>Recherche du tournoi ' + esc(code) + '</p>');
  tpl = new Peer(undefined, peerOpts); tpl.on('error', () => netErr('Tournoi introuvable.'));
  tpl.on('open', () => { const c = tcn = tpl.connect('salon8t-' + code, { reliable: true }); c.on('open', () => { c.send({ t: 'j', name: myName }); TS = null; tview(); }); c.on('data', tdata); c.on('close', () => { if (tcn === c) { tcn = null; ov('<h2>Tournoi</h2><p>Connexion perdue.</p><button onclick="showMenu()">Menu</button>'); } }); }); }
function tdata(d) { if (!d || typeof d != 'object') return; if (d.t == 's') { TS = d.S; if (TS.champ && champK != TS.k && TS.pl.some(p => (typeof p == 'string' ? p : p.n) == myName)) { champK = TS.k; tRw = tourRw(TS); } if (watchingT && !TS.live) { watchingT = 0; tview(); } else if (tvw) tview(); } else if (d.t == 'v' && d.v && typeof d.v == 'object') { const hadLive = TS && TS.live; TS = TS || {}; TS.live = d.v; if (watchingT) watchLive(); else if (tvw && !hadLive) tview(); } else if (d.t == 'f') { tcn = null; netErr('Ce tournoi est complet.'); }
  else if (d.t == 'x') { tcn = null; netErr('Ce pseudo est déjà pris dans ce tournoi.'); }
  else if (d.t == 'm' && typeof d.code == 'string') { const c = d.code.replace(/[^A-Z0-9]/g, '').slice(0, 5); if (d.cfg) { cfg.time = +d.cfg.time || 0; cfg.fouls = d.cfg.fouls ? 1 : 0; cfg.aim = +d.cfg.aim || 0; cfg.brk = +d.cfg.brk || 0; cfg.rl = +d.cfg.rl || .9915; } tvw = 0; watchingT = 0; tMatch = c; inT = 1;
    if (conn) { try { conn.close(); } catch (e) { } conn = null; } if (peer) { try { peer.destroy(); } catch (e) { } peer = null; } if (d.h) host(c); else setTimeout(() => join(c), 3000); } }
function watchLive() { const v = (T && T.live) || (TS && TS.live); if (!v || !okSnap(v.s)) return; watchingT = 1; tvw = 0; inT = 0; mode = 2; applySnap(v.s); me = 1 - cur; aim = isFinite(v.aim) ? +v.aim : 0; pw = isFinite(v.pw) ? +v.pw : 55; phase = v.phase || 'aim'; $('menu').style.display = 'none'; msg('Observation en direct · ' + nm(cur) + ' joue'); hud(); }
function tview() { watchingT = 0; tvw = 1; inT = 0; mode = 0; phase = 'menu'; const S = TS; if (!S) return ov('<h2>Tournoi</h2><p>Inscription envoyée, en attente de la salle…</p><button class="back" onclick="tleave()">Quitter</button>');
  const players = (S.pl || []).map((p, i) => typeof p == 'string' ? { n: p, side: i % 2 + 1 } : p), teams = teamMarkup(players), live = S.live && S.live.names ? `<p><span class="room-label">PARTIE EN DIRECT</span><br>${esc(S.live.names[0])} contre ${esc(S.live.names[1])}</p><button class="primary" onclick="watchLive()">Voir la partie en direct</button>` : '', matches = S.ms && S.ms.length ? S.ms.map(m => `<div class="team-player"><span>${esc(m.a || '—')} contre ${esc(m.b || '—')}${m.w ? ' · gagne ' + esc(m.w) : ''}</span>${S.live && m.code == S.live.code ? `<button onclick="watchLive()">Observer</button>` : ''}</div>`).join('') : '';
  ov(`<span class="room-label">SALLE DU TOURNOI</span><h2>${esc(S.name || 'Tournoi')}</h2><p>${S.champ ? esc(S.champ) + ' remporte le tournoi !' : S.round ? 'Tour ' + S.round + ' · matchs en cours' : 'Inscriptions · ' + players.length + ' joueur(s)'}</p>${teams}${live}${tRw && S.champ ? '<p>' + tRw + '</p>' : ''}${matches ? `<h3>Matchs du tournoi</h3>${matches}` : ''}<div class="room-actions"><button class="back" onclick="tleave()">Quitter le tournoi</button><button class="back" onclick="tvw=0;showMenu()">Menu principal</button></div>`); }
function tleave() { tvw = 0; watchingT = 0; if (tcn) { const c = tcn; tcn = null; try { c.close(); } catch (e) { } } if (tpl) { try { tpl.destroy(); } catch (e) { } tpl = null; } TS = null; showMenu(); }
function netErr(m) { const retry = lastJoin ? `<button onclick="join('${esc(lastJoin)}')">Réessayer</button>` : ''; ov(`<h2>Connexion</h2><p>${m}</p>${retry}<button class="back" onclick="menuNet()">Retour</button>`); }
function endCard(w) { phase = 'menu'; addMatch({ mode, names, winner: nm(w), why }); const rw = (mode == 1 || mode == 2) ? rw2(w == (mode == 2 ? me : 0)) : ''; if (mode == 2 && inT) { inT = 0; if (me == 0 && tcn) tcn.send({ t: 'w', w: nm(w), code: tMatch }); return ov(`<h2>${esc(nm(w))} gagne !</h2><p>${rw}</p><button onclick="tview()">Retour à la salle du tournoi</button>`); } ov(`<h2>${esc(nm(w))} gagne !</h2><p>Belle partie.<br>${rw}</p>${mode == 2 ? (me == 0 ? '<button onclick="waitRoom(1)">Rejouer</button>' : "<p>En attente de l'hôte pour rejouer…</p>") : `<button onclick="newGame(${mode})">Rejouer</button>`}<button class="back" onclick="showMenu()">Menu</button>`); }
const send = o => { try { if (conn && conn.open) conn.send(o); } catch (e) { } };
let lh = 0; function netHand(d) { if (mode != 2) return; const n = performance.now(); if (!d && n - lh < 60) return; lh = n; send({ t: 'h', x: B[0].x, y: B[0].y, done: !!d }); }
const snap = () => ({ b: cloneBalls(B).map(b => ({ n: b.n, x: b.x, y: b.y, vx: b.vx, vy: b.vy, wx: b.wx, wy: b.wy, wz: b.wz, in: b.in, M: b.M })), cur, grp, hand, tl, names, T: cfg.time });
const okSnap = s => s && Array.isArray(s.b) && s.b.length == 16 && s.b.every(b => b && Array.isArray(b.M) && b.M.length == 9 && isFinite(b.x) && isFinite(b.y)) && (s.cur == 0 || s.cur == 1) && Array.isArray(s.names) && Array.isArray(s.grp);
function applySnap(s) { B = s.b.map(b => ({ ...b })); cur = s.cur; grp = s.grp; hand = !!s.hand; tl = +s.tl || 30; cfg.time = +s.T || 0; names = [clean(s.names[0]), clean(s.names[1])]; }
function startOnline() { newGame(2); send({ t: 'start', s: snap(), d: mineD() }); }
function waitRoom(forceStart) {
  if (forceStart && me == 0) { startOnline(); return; }
  ov(`<h2>Salle d'attente</h2><p>${esc(names[0])} <i class="ready-dot${netReady[0] ? ' on' : ''}"></i> · ${esc(names[1] || '…')} <i class="ready-dot${netReady[1] ? ' on' : ''}"></i></p><p>Les deux joueurs doivent être prêts avant le casse.</p><button class="primary" onclick="iReady()">Je suis prêt</button><button class="back" onclick="showMenu()">Annuler</button>`);
}
function iReady() {
  netReady[me] = 1; send({ t: 'rdy' });
  if (me == 0 && netReady[0] && netReady[1]) startOnline();
  else waitRoom();
}
function host(fc) {
  const code = fc || CODE();
  ownRoomCode = fc ? '' : code; lastJoin = code;
  ov('<h2>Salon</h2><p>Création du salon…</p>');
  try { peer = new Peer('salon8-' + code, peerOpts); } catch (e) { return netErr(NOSRV); }
  ntm = setTimeout(() => { if (peer && !peer.open) netErr(NOSRV); }, 8000);
  peer.on('open', () => { clearTimeout(ntm); if (ownRoomCode) roomAnn(code); ov(`<h2>Room de ${esc(myName)}</h2><p>Partage ce code pour inviter un joueur :</p><h2 class="room-code">${esc(code)}</h2><p>En attente d'un adversaire…</p><button class="back" onclick="showMenu()">Annuler</button>`); });
  peer.on('close', () => { if (ownRoomCode == code) { roomDel(code); ownRoomCode = ''; } });
  peer.on('error', e => { clearTimeout(ntm); if (ownRoomCode == code) { roomDel(code); ownRoomCode = ''; } netErr('Erreur réseau (' + esc(e.type || 'inconnue') + ').'); });
  peer.on('connection', c => { if (conn) { c.close(); return; } if (ownRoomCode == code) { roomDel(code); ownRoomCode = ''; } conn = c; me = 0; mode = 2; wire(c); });
}
function join(code) {
  code = (code || '').trim().toUpperCase(); if (code.length < 5) return netErr('Entre le code à 5 caractères.'); lastJoin = code;
  ov('<h2>Connexion…</h2><p>Recherche du salon ' + esc(code) + '</p>'); peer = new Peer(undefined, peerOpts);
  ntm = setTimeout(() => { if (!conn || !conn.open) netErr('Salon introuvable, ou connexion bloquée.'); }, 9000);
  peer.on('open', () => { conn = peer.connect('salon8-' + code, { reliable: true }); me = 1; mode = 2; wire(conn); });
  peer.on('error', e => { clearTimeout(ntm); netErr(e.type == 'peer-unavailable' ? 'Aucun salon avec ce code.' : 'Erreur réseau (' + esc(e.type || 'inconnue') + ').'); });
}
function wire(c) { c.on('open', () => { clearTimeout(ntm); send({ t: 'n', name: myName, d: mineD() }); }); c.on('data', onMsg);
  c.on('close', () => { if (conn === c) { conn = null; phase = 'menu'; ov(`<h2>Connexion perdue</h2><p>Ton adversaire a quitté la partie.</p>${lastJoin ? `<button onclick="join('${esc(lastJoin)}')">Réessayer</button>` : ''}<button onclick="showMenu()">Menu</button>`); } }); }
function onMsg(d) {
  if (!d || typeof d != 'object') return; const t = d.t;
  if (t == 'n') { if (me == 0 && mode == 2) { deco[1] = okD(d.d); names = [myName, clean(d.name)]; netReady = [0, 0]; send({ t: 'wait', names, d: mineD() }); waitRoom(); } else hn = clean(d.name); }
  else if (t == 'wait' && me == 1) { names = [clean(d.names[0]), myName]; deco[0] = okD(d.d); netReady = [0, 0]; waitRoom(); }
  else if (t == 'rdy') { netReady[1 - me] = 1; if (me == 0 && netReady[0] && netReady[1]) startOnline(); else if (phase == 'menu') waitRoom(); }
  else if (t == 'start' && me == 1) { if (!okSnap(d.s)) return; mode = 2; deco[0] = okD(d.d); applySnap(d.s); $('menu').style.display = 'none'; phase = 'aim'; ao = 0; rf(); msg(nm(cur) + ' casse.'); hud(); }
  else if (t == 'a' && mode == 2 && cur != me && phase == 'aim') { aim = +d.aim || 0; setPw(+d.pw || 55); }
  else if (t == 'h' && mode == 2 && hand && cur != me && isFinite(d.x) && isFinite(d.y)) { B[0].x = +d.x; B[0].y = +d.y; if (d.done) hand = false; }
  else if (t == 's' && me == 0 && mode == 2 && phase == 'aim' && cur == 1 && !hand) { const p = Math.max(.05, Math.min(1, +d.p || .5)), x = Math.max(-.7, Math.min(.7, +d.sx || 0)), y = Math.max(-.7, Math.min(.7, +d.sy || 0)), a = +d.aim || 0; startShot(a, p, x, y); send({ t: 'go', aim: a, p, sx: x, sy: y, s: snap() }); }
  else if (t == 'go' && me == 1 && okSnap(d.s)) { applySnap(d.s); startShot(+d.aim || 0, +d.p || .5, +d.sx || 0, +d.sy || 0); }
  else if (t == 'e' && me == 1 && okSnap(d.s)) { applySnap(d.s); ao = 0; rf(); if (d.win != null) { hud(); endCard(d.win); } else { phase = 'aim'; msg(String(d.m || '').slice(0, 80)); hud(); } }
  else if (t == 'rn' && d.i == 1 - me) { names[1 - me] = clean(d.name); hud(); }
}
function rename(i) { if (mode != 0 || i == 0) return; $('dlg').querySelector('.card').innerHTML = `<h2>Nom du joueur</h2><input id="rn" value="${esc(names[i])}" maxlength="14" onkeydown="if(event.key=='Enter')doRename(${i})"><button onclick="doRename(${i})">Valider</button><button class="back" onclick="$('dlg').style.display='none'">Annuler</button>`; $('dlg').style.display = 'flex'; $('rn').focus(); $('rn').select(); }
function doRename(i) { const v = clean($('rn').value); names[i] = v; if ((mode != 2 && i == 0) || (mode == 2 && i == me)) setName(v); if (mode == 2) send({ t: 'rn', i, name: v }); $('dlg').style.display = 'none'; hud(); }
$('p0').onclick = () => rename(0); $('p1').onclick = () => rename(1);
setInterval(() => { if (mode == 2 && human() && !hand) send({ t: 'a', aim, pw }); if (mode == 2 && me == 0 && inT && tcn && tcn.open && performance.now() - liveAt > 120 && phase != 'menu') { liveAt = performance.now(); try { tcn.send({ t: 'v', v: { code: tMatch, names, phase, aim, pw, s: snap() } }); } catch (e) { } } }, 100);
(() => { applyBg(); applyBalls(); })();
const vr = () => 1 + (Math.random() * 2 - 1) * (ADM.var || 0) / 100;
function rw2(win) { const m = mode == 1 ? [ADM.b0, ADM.b1, ADM.b2][lvl] : ADM.mo, k = vr(), x = Math.round((win ? ADM.xw : ADM.xl) * m * k), c = Math.round((win ? ADM.cw : ADM.cl) * m * k), o = lv(PF.xp); PF.xp += x; PF.coins += c; let t = `+${x} XP · +${c} ◎`; if (lv(PF.xp) > o) { PF.coins += ADM.lb; t += ` · Niveau ${lv(PF.xp)} ! +${ADM.lb} ◎`; } save(); return t; }
const rwSnap = () => { const o = {}; for (const k in ADM) if (/^t\d|^var$|^lb$/.test(k)) o[k] = ADM[k]; return o; };
function tourRw(S) { const top = S.champ == myName ? 1 : (S.out && S.out[myName]) || 16, r = S.rw || ADM, key = [1, 2, 4, 8, 16].find(k => top <= k) || 16, k = 1 + (Math.random() * 2 - 1) * (r.var || 0) / 100, x = Math.round((r['t' + key + 'x'] || 0) * k), c = Math.round((r['t' + key + 'c'] || 0) * k), o = lv(PF.xp); PF.xp += x; PF.coins += c; let t = `Top ${top} : +${x} XP · +${c} ◎`; if (lv(PF.xp) > o) { PF.coins += r.lb || 0; t += ` · Niveau ${lv(PF.xp)} !`; } save(); return t; }
function tclose() { const k = T && T.code; if (T) T.pl.forEach(p => { try { p.c.close(); } catch (e) { } }); try { tp.destroy(); } catch (e) { } T = null; tp = null; tv = 0; if (k) lobby.send({ t: 'd', code: k }); showMenu(); }
function swProf(k) { save(); PKEY = k; let o = {}; try { o = JSON.parse(localStorage.getItem(k) || '{}'); } catch (e) { }
  if (k == 'salon8_pfA' && !localStorage.getItem(k)) { o = { name: 'Admin', xp: 150000, coins: 999999, tix: 99, inv: {} }; CK.forEach(c => o.inv[c] = [...CAT[c].i.keys()]); }
  for (const x in PF) delete PF[x]; Object.assign(PF, { name: '', xp: 0, coins: 0, tix: 0 }, o); PF.inv = PF.inv || {}; PF.eq = PF.eq || {}; CK.forEach(c => { PF.inv[c] = PF.inv[c] || (c == 'av' ? [...Array(15).keys()] : [0]); PF.eq[c] = PF.eq[c] ?? 0; });
  myName = PF.name || 'Joueur'; adm = k == 'salon8_pfA' ? 1 : 0; save(); applyBg(); applyBalls(); PF.name ? showMenu() : welcome(); }
const AF = [['Parties normales', [['xw', 'XP victoire'], ['xl', 'XP défaite'], ['cw', 'Pièces victoire'], ['cl', 'Pièces défaite'], ['mo', 'Multiplicateur en ligne'], ['b0', 'Multiplicateur bot facile'], ['b1', 'Multiplicateur bot moyen'], ['b2', 'Multiplicateur bot expert'], ['lb', 'Pièces par niveau gagné'], ['tix', 'Prix du ticket de pseudo'], ['var', 'Variation aléatoire (%)']]], ['Tournoi : gains moyens selon le classement', [1, 2, 4, 8, 16].flatMap(k => [['t' + k + 'x', 'Top ' + k + ' · XP'], ['t' + k + 'c', 'Top ' + k + ' · pièces']])]];
function admPanel() { ov(`<h2>Admin</h2>${AF.map(([h, l]) => `<p style="margin:12px 0 4px">${h}</p>${l.map(([k, t]) => `<label class="lb">${t}<input id="a_${k}" type="number" step="any" value="${ADM[k]}"></label>`).join('')}`).join('')}<p>Les gains de tournoi sont envoyés aux joueurs inscrits ; les autres réglages s'appliquent sur cet appareil.</p><button onclick="admSave()">Enregistrer</button><button class="back" onclick="showMenu()">Retour</button><button class="back" onclick="admReset()">Valeurs par défaut</button>`); }
function admSave() { AF.forEach(([, l]) => l.forEach(([k]) => { const v = parseFloat($('a_' + k).value); if (isFinite(v)) ADM[k] = Math.max(0, v); })); try { localStorage.setItem('salon8_adm', JSON.stringify(ADM)); } catch (e) { } showMenu(); }
function admReset() { try { localStorage.removeItem('salon8_adm'); } catch (e) { } location.reload(); }

$('admin-secret').onclick = adminPw;
$('mn').onclick = pause;
$('fire').onclick = fire;
$('undo').onclick = undoShot;

Object.assign(window, { pause, menuBot, menuNet, pfCard, shop, menuSet, join, host, showMenu, tjoin, adminPw, adminOk, saveSet, newGame, buy, pfName, pfNameOk, welcomeOk, tourNew, tourOpen, tadm, tstart, tmove, tw, tview, tleave, watchLive, tclose, admPanel, admSave, admReset, histCard, exportPf, importPf, importPfOk, iReady, waitRoom, undoShot, fire, doRename, $ });
Object.defineProperty(window, 'TT', { get: () => TT, set: v => { TT = v; } });
Object.defineProperty(window, 'TM', { get: () => TM, set: v => { TM = v; } });
Object.defineProperty(window, 'paused', { get: () => paused, set: v => { paused = v; } });

setMute(mute);
setPw(55); newGame(0); PF.name ? showMenu() : welcome(); lobby.init();
