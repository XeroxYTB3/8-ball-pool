export const W = 1000, H = 500, R = 13, P = 48;
export const CW = W + 2 * P, CH = H + 2 * P;
export const PK = [[0, 0, 25], [W / 2, -7, 21], [W, 0, 25], [0, H, 25], [W / 2, H + 7, 21], [W, H, 25]];

export function rm() {
  const a = Math.random() * 6.28, z = Math.random() * 2 - 1, q = Math.sqrt(1 - z * z);
  const kx = q * Math.cos(a), ky = q * Math.sin(a), kz = z, ph = Math.random() * 6.28;
  const c = Math.cos(ph), s = Math.sin(ph), t = 1 - c;
  return [t * kx * kx + c, t * kx * ky - s * kz, t * kx * kz + s * ky, t * kx * ky + s * kz, t * ky * ky + c, t * ky * kz - s * kx, t * kx * kz - s * ky, t * ky * kz + s * kx, t * kz * kz + c];
}

export const mk = (n, x, y) => ({ n, x, y, vx: 0, vy: 0, wx: 0, wy: 0, wz: 0, in: false, M: rm() });

export function cloneBalls(balls) {
  return balls.map(b => ({ ...b, M: b.M ? b.M.slice() : rm() }));
}

export function pocketTest(b, pot, onPocket) {
  for (const p of PK) {
    const dx = b.x - p[0], dy = b.y - p[1], dist = Math.hypot(dx, dy);
    if (dist >= p[2] * 0.92) continue;
    const speed = Math.hypot(b.vx, b.vy);
    const toward = speed < 0.04 ? 1 : -(b.vx * dx + b.vy * dy) / (speed * (dist || 1));
    const deep = dist < p[2] * 0.48;
    const lip = dist < p[2] * 0.68 && toward > 0.18;
    if (!deep && !lip) continue;
    b.in = true;
    b.vx = b.vy = b.wx = b.wy = b.wz = 0;
    pot.push(b.n);
    onPocket?.(b);
    return true;
  }
  return false;
}

export function cushion(b, nx, ny, ctx) {
  const vn = b.vx * nx + b.vy * ny;
  if (vn >= 0) return;
  if (ctx.first != null) ctx.rails++;
  const tx = -ny, ty = nx, vt = b.vx * tx + b.vy * ty - R * b.wz;
  const jn = -(1 + Math.max(0.55, 0.88 - 0.012 * -vn)) * vn;
  b.vx += jn * nx;
  b.vy += jn * ny;
  const jt = -Math.max(-0.2 * jn, Math.min(0.2 * jn, vt * 0.4));
  b.vx += jt * tx;
  b.vy += jt * ty;
  b.wz -= jt / (0.4 * R);
  ctx.onCush?.(-vn);
}

export function wall(b, ctx) {
  if (b.x < R) { b.x = R; cushion(b, 1, 0, ctx); }
  else if (b.x > W - R) { b.x = W - R; cushion(b, -1, 0, ctx); }
  if (b.y < R) { b.y = R; cushion(b, 0, 1, ctx); }
  else if (b.y > H - R) { b.y = H - R; cushion(b, 0, -1, ctx); }
}

export function collideAll(B, ctx) {
  for (let i = 0; i < B.length; i++) for (let j = i + 1; j < B.length; j++) {
    const a = B[i], b = B[j];
    if (a.in || b.in) continue;
    const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy);
    if (d >= 2 * R || d == 0) continue;
    const nx = dx / d, ny = dy / d, o = (2 * R - d) / 2;
    a.x -= nx * o; a.y -= ny * o; b.x += nx * o; b.y += ny * o;
    const dv = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
    if (dv <= 0) continue;
    const jn = dv * 0.98;
    a.vx -= jn * nx; a.vy -= jn * ny; b.vx += jn * nx; b.vy += jn * ny;
    ctx.onClack?.(dv);
    const tx = -ny, ty = nx;
    const vt = (a.vx - b.vx) * tx + (a.vy - b.vy) * ty + R * (a.wz + b.wz);
    const throwK = 0.42;
    const jt = -Math.max(-0.08 * jn, Math.min(0.08 * jn, vt * throwK));
    a.vx += jt * tx; a.vy += jt * ty; b.vx -= jt * tx; b.vy -= jt * ty;
    a.wz += jt / (0.4 * R); b.wz += jt / (0.4 * R);
    if (i == 0 && ctx.first == null) ctx.first = b.n;
  }
}

export function cloth(b, dt) {
  const ux = b.vx + R * b.wy, uy = b.vy - R * b.wx, u = Math.hypot(ux, uy);
  if (u > 0.03) {
    const f = 0.07 * dt, k = Math.min(1, u / (3.5 * f)), ax = ux / u, ay = uy / u;
    b.vx -= f * k * ax; b.vy -= f * k * ay;
    b.wx += f * k * ay / (0.4 * R); b.wy -= f * k * ax / (0.4 * R);
  }
}

export function spin(b, dt) {
  const w = Math.hypot(b.wx, b.wy, b.wz);
  if (w < 1e-5) return;
  const a = w * dt, kx = b.wx / w, ky = b.wy / w, kz = b.wz / w, c = Math.cos(a), s = Math.sin(a), t = 1 - c, m = b.M;
  const r = [t * kx * kx + c, t * kx * ky - s * kz, t * kx * kz + s * ky, t * kx * ky + s * kz, t * ky * ky + c, t * ky * kz - s * kx, t * kx * kz - s * ky, t * ky * kz + s * kx, t * kz * kz + c];
  const n = new Array(9);
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) n[i * 3 + j] = r[i * 3] * m[j] + r[i * 3 + 1] * m[3 + j] + r[i * 3 + 2] * m[6 + j];
  b.M = n; b._d = 1;
}

export function stepPhysics(B, cfg, ctx) {
  const N = 16, dt = 1 / N;
  for (let s = 0; s < N; s++) {
    for (const b of B) if (!b.in) {
      b.x += b.vx * dt; b.y += b.vy * dt;
      cloth(b, dt); spin(b, dt); wall(b, ctx); pocketTest(b, ctx.pot, ctx.onPocket);
    }
    collideAll(B, ctx);
  }
  for (const b of B) {
    if (b.in) continue;
    b.wz *= 0.985;
    const v = Math.hypot(b.vx, b.vy);
    if (v) {
      const n = Math.max(0, v * cfg.rl - 0.012), m = n / v;
      b.vx *= m; b.vy *= m; b.wx *= m; b.wy *= m;
      if (n < 0.04 && Math.hypot(b.vx + R * b.wy, b.vy - R * b.wx) < 0.08) b.vx = b.vy = b.wx = b.wy = 0;
    } else if (Math.hypot(b.wx, b.wy) < 0.004) b.wx = b.wy = 0;
  }
}

export const moving = B => B.some(b => !b.in && (b.vx || b.vy || Math.hypot(b.wx, b.wy) > 0.004));
