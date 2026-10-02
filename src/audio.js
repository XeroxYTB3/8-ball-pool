let AC, mute = false;

export function setMute(v) { mute = v; }

function ctx() {
  AC = AC || new AudioContext();
  return AC;
}

function env(gain, t, v, d) {
  gain.gain.setValueAtTime(Math.min(0.35, v), t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + d);
}

export function tone(f, v, d, type = 'triangle') {
  if (mute || v < 0.01) return;
  try {
    const ac = ctx(), o = ac.createOscillator(), n = ac.createGain(), t = ac.currentTime;
    o.type = type;
    o.frequency.value = f;
    env(n, t, v, d);
    o.connect(n); n.connect(ac.destination);
    o.start(); o.stop(t + d);
  } catch (e) { /* ignore */ }
}

function noiseBurst(v, d, freq) {
  if (mute || v < 0.01) return;
  try {
    const ac = ctx(), len = Math.max(1, (ac.sampleRate * d) | 0);
    const buf = ac.createBuffer(1, len, ac.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ac.createBufferSource();
    src.buffer = buf;
    const f = ac.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = freq;
    f.Q.value = 0.8;
    const g = ac.createGain();
    env(g, ac.currentTime, v, d);
    src.connect(f); f.connect(g); g.connect(ac.destination);
    src.start();
  } catch (e) { /* ignore */ }
}

export function cueHit(power) {
  tone(220 + power * 180, 0.12 + power * 0.12, 0.05, 'sine');
  noiseBurst(0.08 + power * 0.12, 0.04, 900);
}

export function clack(dv) {
  noiseBurst(Math.min(0.22, dv * 0.03), 0.05, 1800);
  tone(900, Math.min(0.16, dv * 0.02), 0.05, 'triangle');
}

export function cushionHit(vn) {
  noiseBurst(Math.min(0.18, vn * 0.03), 0.08, 420);
  tone(170, Math.min(0.14, vn * 0.02), 0.09, 'sine');
}

export function pocketHit() {
  tone(110, 0.2, 0.28, 'sine');
  tone(165, 0.08, 0.22, 'triangle');
  noiseBurst(0.1, 0.12, 280);
}

export const snd = tone;
