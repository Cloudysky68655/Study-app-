'use client';

/**
 * Premium UI sound system — all tones are synthesized in the browser via
 * the Web Audio API (no sound files to host/license). Palette is soft
 * sine/triangle tones with short exponential envelopes, plus filtered
 * noise bursts for "air" (whoosh/swish). Kept deliberately quiet and short
 * to match a calm, studying-app soundscape.
 */

const STORAGE_KEY = 'ui-sounds-enabled';

let ctx = null;
let enabled = true;
let unlocked = false;
const lastPlay = {};

function readStoredPref() {
  if (typeof window === 'undefined') return true;
  const v = window.localStorage.getItem(STORAGE_KEY);
  return v === null ? true : v === 'true';
}

export function initSounds() {
  enabled = readStoredPref();
}

export function getSoundsEnabled() {
  return enabled;
}

export function setSoundsEnabled(value) {
  enabled = value;
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(STORAGE_KEY, String(value));
  }
}

function getCtx() {
  if (typeof window === 'undefined') return null;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  if (!ctx) ctx = new AC();
  if (ctx.state === 'suspended') ctx.resume();
  unlocked = true;
  return ctx;
}

// Browsers block audio until a user gesture — call this on the first
// pointerdown anywhere in the app so the context is warm before it's
// actually needed for a sound.
export function unlockAudio() {
  if (unlocked) return;
  getCtx();
}

// Prevents rapid/overlapping triggers of the same sound (e.g. holding a
// key, double taps, fast repeated actions) from stacking into noise.
function throttled(key, minGapMs) {
  const now = performance.now();
  if (lastPlay[key] !== undefined && now - lastPlay[key] < minGapMs) return false;
  lastPlay[key] = now;
  return true;
}

function tone(c, { freq, freqEnd, duration, type = 'sine', gain = 0.05, delay = 0 }) {
  const t0 = c.currentTime + delay;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (freqEnd) osc.frequency.exponentialRampToValueAtTime(freqEnd, t0 + duration);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + Math.min(0.012, duration * 0.3));
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  osc.connect(g).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.03);
}

function airBurst(c, { duration, gain = 0.025, freqFrom = 1800, freqTo = 2600, delay = 0 }) {
  const t0 = c.currentTime + delay;
  const bufferSize = Math.max(1, Math.floor(c.sampleRate * duration));
  const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
  }
  const src = c.createBufferSource();
  src.buffer = buffer;
  const filt = c.createBiquadFilter();
  filt.type = 'bandpass';
  filt.Q.value = 0.9;
  filt.frequency.setValueAtTime(freqFrom, t0);
  filt.frequency.exponentialRampToValueAtTime(freqTo, t0 + duration);
  const g = c.createGain();
  g.gain.setValueAtTime(gain, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  src.connect(filt).connect(g).connect(c.destination);
  src.start(t0);
}

function safe(fn) {
  try {
    fn();
  } catch (e) {
    // Audio is a nice-to-have — never let it break an interaction.
  }
}

/* ---------------- Public sound palette ---------------- */

// Buttons: tiny soft click.
export function playClick() {
  if (!enabled || !throttled('click', 45)) return;
  safe(() => {
    const c = getCtx();
    if (!c) return;
    tone(c, { freq: 1500, freqEnd: 1000, duration: 0.045, type: 'sine', gain: 0.04 });
  });
}

// Checkboxes/toggles: tiny tactile click, a touch drier/higher than playClick.
export function playTick() {
  if (!enabled || !throttled('tick', 55)) return;
  safe(() => {
    const c = getCtx();
    if (!c) return;
    tone(c, { freq: 2000, freqEnd: 1400, duration: 0.028, type: 'triangle', gain: 0.028 });
  });
}

// Tabs/selection changes: subtle upward tick.
export function playSelect() {
  if (!enabled || !throttled('select', 80)) return;
  safe(() => {
    const c = getCtx();
    if (!c) return;
    tone(c, { freq: 1000, freqEnd: 1500, duration: 0.055, type: 'sine', gain: 0.035 });
  });
}

// Navigation between major views: airy whoosh.
export function playWhoosh() {
  if (!enabled || !throttled('whoosh', 220)) return;
  safe(() => {
    const c = getCtx();
    if (!c) return;
    airBurst(c, { duration: 0.16, gain: 0.02, freqFrom: 1400, freqTo: 2800 });
  });
}

// Panel/menu opening: soft swish, rising.
export function playSwishOpen() {
  if (!enabled || !throttled('swish', 160)) return;
  safe(() => {
    const c = getCtx();
    if (!c) return;
    airBurst(c, { duration: 0.14, gain: 0.022, freqFrom: 1200, freqTo: 2400 });
  });
}

// Panel/menu closing: slightly softer, falling swish.
export function playSwishClose() {
  if (!enabled || !throttled('swish', 160)) return;
  safe(() => {
    const c = getCtx();
    if (!c) return;
    airBurst(c, { duration: 0.12, gain: 0.016, freqFrom: 2000, freqTo: 1000 });
  });
}

// Successful actions: short two-note confirmation pop.
export function playSuccess() {
  if (!enabled || !throttled('success', 260)) return;
  safe(() => {
    const c = getCtx();
    if (!c) return;
    tone(c, { freq: 880, duration: 0.09, gain: 0.045 });
    tone(c, { freq: 1320, duration: 0.11, gain: 0.04, delay: 0.07 });
  });
}

// Meaningful notifications: soft single ping.
export function playPing() {
  if (!enabled || !throttled('ping', 350)) return;
  safe(() => {
    const c = getCtx();
    if (!c) return;
    tone(c, { freq: 1568, duration: 0.16, gain: 0.03, type: 'sine' });
  });
}

// Major milestones/achievements: richer three-note chime.
export function playMilestone() {
  if (!enabled || !throttled('milestone', 600)) return;
  safe(() => {
    const c = getCtx();
    if (!c) return;
    tone(c, { freq: 660, duration: 0.11, gain: 0.05 });
    tone(c, { freq: 880, duration: 0.11, gain: 0.05, delay: 0.09 });
    tone(c, { freq: 1320, duration: 0.2, gain: 0.055, delay: 0.18 });
  });
}

// Wrong-answer feedback (quizzes/practice): soft descending two-note dip —
// clearly "not this one" without being harsh or punishing.
export function playIncorrect() {
  if (!enabled || !throttled('incorrect', 260)) return;
  safe(() => {
    const c = getCtx();
    if (!c) return;
    tone(c, { freq: 380, freqEnd: 300, duration: 0.13, type: 'triangle', gain: 0.045 });
    tone(c, { freq: 300, freqEnd: 220, duration: 0.15, type: 'triangle', gain: 0.038, delay: 0.06 });
  });
}

// Correct-answer feedback (quizzes/practice): a brighter three-note rising
// arpeggio, deliberately distinct in timbre/register from click/select/tick
// so it reads as a distinct "quiz win" rather than a generic UI tap.
export function playCorrect() {
  if (!enabled || !throttled('correct', 260)) return;
  safe(() => {
    const c = getCtx();
    if (!c) return;
    tone(c, { freq: 523, duration: 0.09, type: 'triangle', gain: 0.05 });
    tone(c, { freq: 659, duration: 0.09, type: 'triangle', gain: 0.05, delay: 0.055 });
    tone(c, { freq: 784, duration: 0.14, type: 'triangle', gain: 0.055, delay: 0.11 });
  });
}
