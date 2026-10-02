export const grpOf = n => n < 8 ? 0 : 1;

export function remaining(balls, grp, p) {
  if (grp[p] == null) return 99;
  return balls.filter(b => !b.in && b.n > 0 && b.n != 8 && grpOf(b.n) == grp[p]).length;
}

/**
 * Apply 8-ball turn resolution. Mutates balls (cue respawn) and grp.
 */
export function resolveTurn({ balls, cur, grp, first, rails, pot, foulsOn, pre }) {
  const me = cur;
  const cue = balls.find(b => b.n === 0) || balls[0];
  let foul = false, win = null, why = '';
  const scr = !!cue.in;
  if (cue.in) {
    foul = true;
    why = 'blanche empochée';
    cue.in = false;
    cue.x = 250;
    cue.y = 250;
    cue.vx = cue.vy = cue.wx = cue.wy = cue.wz = 0;
  }
  const own = n => n > 0 && n != 8 && grpOf(n) == grp[me];
  if (first == null) {
    foul = true;
    why = 'aucune boule touchée';
  } else if (grp[me] != null && (first == 8 ? pre > 0 : !own(first))) {
    foul = true;
    why = 'mauvaise boule touchée';
  }
  const pn = pot.filter(n => n > 0);
  if (first != null && !foul && !pn.length && !rails) {
    foul = true;
    why = 'aucune bande touchée';
  }
  if (!foulsOn && !scr) foul = false;
  if (pn.includes(8)) win = (grp[me] != null && pre == 0 && !foul) ? me : 1 - me;
  else if (grp[me] == null && !foul && pn[0]) {
    grp[me] = grpOf(pn[0]);
    grp[1 - me] = 1 - grp[me];
  }
  const keep = !foul && pn.some(own);
  return { foul, why, win, keep, cur: keep ? cur : 1 - cur, hand: foul, grp };
}
