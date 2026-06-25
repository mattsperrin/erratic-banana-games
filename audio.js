// audio.js — Donut Game Sound System (Web Audio API, no files needed)

const DonutAudio = (() => {
  let ctx = null;
  let masterGain, musicGain, sfxGain;
  let musicPlaying = false;
  let loopTimer = null;
  let muted = false;
  let lastShootT = 0;
  let lastBaseHitT = 0;

  // ── Music constants ──────────────────────────────────────────────────────
  const BPM = 148;
  const B = 60 / BPM;  // quarter note
  const H = B * 2;
  const E = B / 2;
  const _ = 0; // rest

  const C3=130.81, G3=196.00,
        C4=261.63, D4=293.66, F4=349.23, G4=392.00, A4=440.00, B4=493.88,
        C5=523.25, D5=587.33, E5=659.25, F5=698.46, G5=783.99, A5=880.00;

  // 8 bars of 4/4 — each bar = 4B
  const MELODY = [
    [C5,E],[E5,E],[G5,E],[E5,E],[D5,E],[C5,E],[D5,E],[E5,E],  // bar 1  (8×E = 4B)
    [C5,H],[_,B],[G4,E],[A4,E],                                 // bar 2  (H+B+2E = 4B)
    [C5,E],[D5,E],[E5,E],[F5,E],[G5,E],[A5,E],[G5,E],[E5,E],   // bar 3
    [F5,E],[E5,E],[D5,E],[C5,E],[E5,B],[_,B],                   // bar 4
    [G5,E],[E5,E],[G5,E],[A5,E],[G5,E],[F5,E],[E5,E],[D5,E],   // bar 5
    [C5,H],[E5,B],[G5,B],                                        // bar 6
    [A5,E],[G5,E],[F5,E],[E5,E],[D5,E],[E5,E],[D5,E],[C5,E],   // bar 7
    [G4,E],[A4,E],[B4,E],[C5,E],[C5,H],                         // bar 8
  ];

  const BASS = [
    [C3,B],[_,B],[G3,B],[_,B],  // bars 1–2
    [F4,B],[_,B],[C4,B],[_,B],
    [C3,B],[_,B],[G3,B],[_,B],  // bars 3–4
    [F4,B],[_,B],[C4,B],[_,B],
    [G3,B],[_,B],[D4,B],[_,B],  // bars 5–6
    [C3,B],[_,B],[G3,B],[_,B],
    [F4,B],[_,B],[C4,B],[_,B],  // bars 7–8
    [G3,H],[C3,H],
  ];

  // ── Internal helpers ─────────────────────────────────────────────────────
  function init() {
    if (ctx) return;
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = ctx.createGain(); masterGain.gain.value = 0.55; masterGain.connect(ctx.destination);
    musicGain  = ctx.createGain(); musicGain.gain.value  = 0.28; musicGain.connect(masterGain);
    sfxGain    = ctx.createGain(); sfxGain.gain.value    = 0.72; sfxGain.connect(masterGain);
  }

  function playNote(freq, waveType, startT, dur, vol, dest) {
    if (!freq || !ctx) return;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = waveType;
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.001, startT);
    g.gain.linearRampToValueAtTime(vol, startT + 0.012);
    g.gain.setValueAtTime(vol * 0.75, startT + dur * 0.6);
    g.gain.exponentialRampToValueAtTime(0.001, startT + dur);
    o.connect(g); g.connect(dest);
    o.start(startT); o.stop(startT + dur + 0.05);
  }

  function whiteNoiseBurst(startT, dur, vol, loFreq, hiFreq, dest) {
    if (!ctx) return;
    const len = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    const g   = ctx.createGain();
    const lp  = ctx.createBiquadFilter();
    const hp  = ctx.createBiquadFilter();
    lp.type = 'lowpass';  lp.frequency.value = hiFreq;
    hp.type = 'highpass'; hp.frequency.value = loFreq;
    g.gain.setValueAtTime(vol, startT);
    g.gain.exponentialRampToValueAtTime(0.001, startT + dur);
    src.buffer = buf;
    src.connect(hp); hp.connect(lp); lp.connect(g); g.connect(dest);
    src.start(startT);
  }

  function scheduleTrack(track, waveType, vol, dest, startT) {
    let t = startT;
    for (const [freq, dur] of track) {
      playNote(freq, waveType, t, dur * 0.88, vol, dest);
      t += dur;
    }
    return t - startT;
  }

  function scheduleDrums(startT, bars) {
    for (let bar = 0; bar < bars; bar++) {
      for (let beat = 0; beat < 4; beat++) {
        const t = startT + (bar * 4 + beat) * B;
        // Kick on 1 & 3
        if (beat === 0 || beat === 2) {
          const ko = ctx.createOscillator(), kg = ctx.createGain();
          ko.frequency.setValueAtTime(110, t);
          ko.frequency.exponentialRampToValueAtTime(32, t + 0.13);
          kg.gain.setValueAtTime(0.55, t);
          kg.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
          ko.connect(kg); kg.connect(musicGain);
          ko.start(t); ko.stop(t + 0.18);
        }
        // Snare on 2 & 4
        if (beat === 1 || beat === 3) {
          whiteNoiseBurst(t, 0.07, 0.18, 1200, 8000, musicGain);
          playNote(180, 'sine', t, 0.05, 0.12, musicGain);
        }
        // Hi-hat every 8th note
        for (let h = 0; h < 2; h++) {
          whiteNoiseBurst(t + h * E, 0.022, 0.09, 7000, 18000, musicGain);
        }
      }
    }
  }

  function scheduleLoop(startT) {
    if (!musicPlaying) return;
    const dur = scheduleTrack(MELODY, 'triangle', 0.5, musicGain, startT);
    scheduleTrack(BASS, 'sine', 0.6, musicGain, startT);
    scheduleDrums(startT, 8);
    loopTimer = setTimeout(() => scheduleLoop(startT + dur), (dur - 0.5) * 1000);
  }

  // ── Public API ───────────────────────────────────────────────────────────
  return {
    init,

    resume() {
      if (ctx && ctx.state === 'suspended') ctx.resume();
    },

    startMusic() {
      init();
      if (musicPlaying) return;
      musicPlaying = true;
      scheduleLoop(ctx.currentTime + 0.1);
    },

    stopMusic() {
      musicPlaying = false;
      if (loopTimer) { clearTimeout(loopTimer); loopTimer = null; }
    },

    toggleMute() {
      init();
      muted = !muted;
      masterGain.gain.setTargetAtTime(muted ? 0 : 0.55, ctx.currentTime, 0.05);
      return muted;
    },

    // ── Sound effects ──────────────────────────────────────────────────────

    sfxCoin() {
      init();
      const t = ctx.currentTime;
      [784, 988, 1319].forEach((f, i) => playNote(f, 'square', t + i*0.06, 0.09, 0.2, sfxGain));
    },

    sfxBuy() {
      init();
      const t = ctx.currentTime;
      playNote(392, 'sine', t,      0.07, 0.38, sfxGain);
      playNote(523, 'sine', t+0.07, 0.07, 0.38, sfxGain);
      playNote(659, 'sine', t+0.14, 0.07, 0.38, sfxGain);
      playNote(784, 'sine', t+0.14, 0.2,  0.28, sfxGain);
    },

    sfxShoot() {
      init();
      const t = ctx.currentTime;
      if (t - lastShootT < 0.10) return;
      lastShootT = t;
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'square';
      o.frequency.setValueAtTime(650, t);
      o.frequency.exponentialRampToValueAtTime(170, t + 0.07);
      g.gain.setValueAtTime(0.14, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
      o.connect(g); g.connect(sfxGain);
      o.start(t); o.stop(t + 0.1);
    },

    sfxHit() {
      init();
      const t = ctx.currentTime;
      whiteNoiseBurst(t, 0.035, 0.22, 800, 4000, sfxGain);
    },

    sfxEnemyDie() {
      init();
      const t = ctx.currentTime;
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(260, t);
      o.frequency.exponentialRampToValueAtTime(42, t + 0.22);
      g.gain.setValueAtTime(0.28, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
      o.connect(g); g.connect(sfxGain);
      o.start(t); o.stop(t + 0.28);
    },

    sfxBlockHit() {
      init();
      const t = ctx.currentTime;
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'square';
      o.frequency.setValueAtTime(220, t);
      o.frequency.exponentialRampToValueAtTime(85, t + 0.1);
      g.gain.setValueAtTime(0.32, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.13);
      o.connect(g); g.connect(sfxGain);
      o.start(t); o.stop(t + 0.16);
    },

    sfxBlockOpen() {
      init();
      const t = ctx.currentTime;
      [523, 659, 784, 1047, 1319, 1568].forEach((f, i) =>
        playNote(f, 'triangle', t + i*0.065, 0.2, Math.max(0.08, 0.3 - i*0.03), sfxGain));
    },

    sfxWaveWin() {
      init();
      const t = ctx.currentTime;
      [[392,0.12],[523,0.12],[659,0.12],[784,0.28]].forEach(([f, d], i) =>
        playNote(f, 'square', t + i*0.13, d, 0.35, sfxGain));
    },

    sfxWaveLose() {
      init();
      const t = ctx.currentTime;
      [[392,0.15],[349,0.15],[311,0.15],[262,0.35]].forEach(([f, d], i) =>
        playNote(f, 'sawtooth', t + i*0.17, d, 0.3, sfxGain));
    },

    sfxGameOver() {
      init();
      const t = ctx.currentTime;
      [[440,0.3],[392,0.3],[349,0.3],[294,0.3],[220,0.7]].forEach(([f, d], i) =>
        playNote(f, 'sine', t + i*0.22, d, 0.45, sfxGain));
    },

    sfxMove() {
      init();
      const t = ctx.currentTime;
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(360, t);
      o.frequency.linearRampToValueAtTime(560, t + 0.08);
      g.gain.setValueAtTime(0.12, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
      o.connect(g); g.connect(sfxGain);
      o.start(t); o.stop(t + 0.12);
    },

    sfxArrive() {
      init();
      const t = ctx.currentTime;
      playNote(880,  'sine', t,      0.05, 0.16, sfxGain);
      playNote(1047, 'sine', t+0.05, 0.08, 0.14, sfxGain);
    },

    sfxBaseHit() {
      init();
      const t = ctx.currentTime;
      if (t - lastBaseHitT < 0.4) return;
      lastBaseHitT = t;
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sawtooth';
      o.frequency.value = 52;
      g.gain.setValueAtTime(0.38, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
      o.connect(g); g.connect(sfxGain);
      o.start(t); o.stop(t + 0.32);
    },

    sfxWaveStart() {
      init();
      const t = ctx.currentTime;
      [200, 280, 360, 460].forEach((f, i) =>
        playNote(f, 'square', t + i*0.045, 0.07, 0.2, sfxGain));
    },

    sfxAttackStart() {
      init();
      const t = ctx.currentTime;
      [300, 400, 530, 680, 840].forEach((f, i) =>
        playNote(f, 'square', t + i*0.055, 0.08, 0.22, sfxGain));
    },
  };
})();
