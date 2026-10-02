import { describe, it, expect } from 'vitest';
import { resolveTurn, grpOf, remaining } from '../src/rules.js';
import { mk } from '../src/physics.js';

function balls(overrides = {}) {
  const B = [mk(0, 250, 250), ...Array.from({ length: 15 }, (_, i) => mk(i + 1, 400, 100 + i * 20))];
  Object.assign(B[0], overrides.cue || {});
  if (overrides.pocket) overrides.pocket.forEach(n => { B.find(b => b.n === n).in = true; });
  return B;
}

describe('grpOf', () => {
  it('sépare pleines et rayées', () => {
    expect(grpOf(1)).toBe(0);
    expect(grpOf(7)).toBe(0);
    expect(grpOf(9)).toBe(1);
    expect(grpOf(15)).toBe(1);
  });
});

describe('resolveTurn', () => {
  it('faute si aucune boule touchée', () => {
    const grp = [0, 1];
    const r = resolveTurn({ balls: balls(), cur: 0, grp, first: null, rails: 0, pot: [], foulsOn: 1, pre: 7 });
    expect(r.foul).toBe(true);
    expect(r.why).toBe('aucune boule touchée');
    expect(r.cur).toBe(1);
    expect(r.hand).toBe(true);
  });

  it('faute si aucune bande et rien empoché', () => {
    const grp = [0, 1];
    const r = resolveTurn({ balls: balls(), cur: 0, grp, first: 1, rails: 0, pot: [], foulsOn: 1, pre: 7 });
    expect(r.foul).toBe(true);
    expect(r.why).toBe('aucune bande touchée');
  });

  it('choisit le groupe sur la première empochée', () => {
    const grp = [null, null];
    const B = balls({ pocket: [3] });
    const r = resolveTurn({ balls: B, cur: 0, grp, first: 3, rails: 1, pot: [3], foulsOn: 1, pre: 7 });
    expect(r.foul).toBe(false);
    expect(r.keep).toBe(true);
    expect(grp[0]).toBe(0);
    expect(grp[1]).toBe(1);
    expect(r.cur).toBe(0);
  });

  it('perd si la 8 tombe trop tôt', () => {
    const grp = [0, 1];
    const r = resolveTurn({ balls: balls({ pocket: [8] }), cur: 0, grp, first: 1, rails: 1, pot: [8], foulsOn: 1, pre: 3 });
    expect(r.win).toBe(1);
  });

  it('gagne si la 8 tombe après les siennes, sans faute', () => {
    const grp = [0, 1];
    const r = resolveTurn({ balls: balls({ pocket: [8] }), cur: 0, grp, first: 8, rails: 1, pot: [8], foulsOn: 1, pre: 0 });
    expect(r.win).toBe(0);
  });

  it('faute blanche empochée et respawn', () => {
    const grp = [0, 1];
    const B = balls({ cue: { in: true } });
    const r = resolveTurn({ balls: B, cur: 0, grp, first: 1, rails: 1, pot: [0], foulsOn: 1, pre: 7 });
    expect(r.foul).toBe(true);
    expect(B[0].in).toBe(false);
    expect(B[0].x).toBe(250);
    expect(r.hand).toBe(true);
  });

  it('remaining compte les boules du groupe', () => {
    const B = balls({ pocket: [1, 2] });
    expect(remaining(B, [0, 1], 0)).toBe(5);
  });
});
