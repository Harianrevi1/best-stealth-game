// NIGHTSHIFT: BLACKOUT — synthesized sound.
// Every sound is built with the Web Audio API at run time, so the
// game ships no audio files at all. The context is created lazily
// on the first key press (browsers block audio before a gesture).

export function createAudio() {
  let ctx = null;
  let master = null;

  function ensure() {
    if (ctx) return true;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
    } catch (e) {
      return false;
    }
    return true;
  }

  function tone(freq, dur, type, vol, slideTo) {
    if (!ensure()) return;
    if (ctx.state === 'suspended') ctx.resume();
    const t0 = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(gain);
    gain.connect(master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  function noiseBurst(dur, vol, lowFreq) {
    if (!ensure()) return;
    if (ctx.state === 'suspended') ctx.resume();
    const t0 = ctx.currentTime;
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = lowFreq;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    src.start(t0);
  }

  return {
    unlock() { ensure(); },
    step(sneaking) {
      // Soft footstep: a short filtered thud, quieter while sneaking.
      noiseBurst(0.07, sneaking ? 0.05 : 0.11, sneaking ? 300 : 520);
    },
    pickup() {
      tone(660, 0.09, 'sine', 0.22);
      setTimeout(() => tone(990, 0.12, 'sine', 0.22), 70);
    },
    spotted() {
      // Two-note alarm sting.
      tone(392, 0.16, 'square', 0.14, 311);
      setTimeout(() => tone(311, 0.22, 'square', 0.14, 233), 140);
    },
    caught() {
      tone(220, 0.4, 'sawtooth', 0.2, 110);
    },
    exitOpen() {
      tone(523, 0.12, 'sine', 0.2);
      setTimeout(() => tone(784, 0.18, 'sine', 0.2), 110);
    },
    win() {
      [523, 659, 784, 1047].forEach((f, i) =>
        setTimeout(() => tone(f, 0.22, 'triangle', 0.22), i * 120));
    },
    lose() {
      [392, 330, 262, 196].forEach((f, i) =>
        setTimeout(() => tone(f, 0.3, 'triangle', 0.2), i * 160));
    },
  };
}
