// Every sound is synthesised with WebAudio: no audio files, nothing to load. Short voices for
// the game's events (an ember's chime, a wisp's thud, the wind's sweep) and a very quiet night
// pad under play. The context wakes on the first user gesture, as browsers require.

export function createAudio() {
  let context = null;
  let master = null;
  let padNodes = null;
  let muted = false;

  function ensure() {
    if (context) {
      if (context.state === 'suspended') context.resume();
      return true;
    }
    const AudioCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtor) return false;
    context = new AudioCtor();
    master = context.createGain();
    master.gain.value = muted ? 0 : 0.5;
    master.connect(context.destination);
    return true;
  }

  /** One oscillator voice with an envelope; the building block of every effect. */
  function voice({ type = 'sine', from = 440, to = null, at = 0, hold = 0.08, gain = 0.2, curve = 'exp' }) {
    if (!ensure()) return;
    const start = context.currentTime + at;
    const osc = context.createOscillator();
    const amp = context.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(from, start);
    if (to !== null) {
      if (curve === 'exp') osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), start + hold);
      else osc.frequency.linearRampToValueAtTime(to, start + hold);
    }
    amp.gain.setValueAtTime(0.0001, start);
    amp.gain.exponentialRampToValueAtTime(gain, start + 0.012);
    amp.gain.exponentialRampToValueAtTime(0.0001, start + hold);
    osc.connect(amp).connect(master);
    osc.start(start);
    osc.stop(start + hold + 0.05);
  }

  /** Filtered noise, for the wind and the wisp's hit. */
  function noise({ at = 0, hold = 0.4, from = 400, to = 1200, gain = 0.12 }) {
    if (!ensure()) return;
    const start = context.currentTime + at;
    const length = Math.max(1, Math.floor(context.sampleRate * hold));
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
    const source = context.createBufferSource();
    source.buffer = buffer;
    const filter = context.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.value = 1.1;
    filter.frequency.setValueAtTime(from, start);
    filter.frequency.exponentialRampToValueAtTime(Math.max(20, to), start + hold);
    const amp = context.createGain();
    amp.gain.setValueAtTime(0.0001, start);
    amp.gain.exponentialRampToValueAtTime(gain, start + hold * 0.3);
    amp.gain.exponentialRampToValueAtTime(0.0001, start + hold);
    source.connect(filter).connect(amp).connect(master);
    source.start(start);
  }

  return {
    /** Call from any user gesture so later sounds are allowed to play. */
    unlock() {
      ensure();
    },
    toggleMute() {
      muted = !muted;
      if (master) master.gain.value = muted ? 0 : 0.5;
      return muted;
    },
    isMuted() {
      return muted;
    },
    click() {
      voice({ type: 'triangle', from: 660, to: 520, hold: 0.07, gain: 0.12 });
    },
    collectEmber() {
      voice({ type: 'sine', from: 880, to: 1320, hold: 0.12, gain: 0.16 });
      voice({ type: 'sine', from: 1320, to: 1760, at: 0.05, hold: 0.1, gain: 0.08 });
    },
    collectGold() {
      [523, 659, 784, 1047].forEach((freq, i) =>
        voice({ type: 'triangle', from: freq, hold: 0.16, at: i * 0.055, gain: 0.14 }));
    },
    wispHit() {
      voice({ type: 'sawtooth', from: 220, to: 55, hold: 0.28, gain: 0.22 });
      noise({ hold: 0.22, from: 900, to: 200, gain: 0.14 });
    },
    gustRises() {
      noise({ hold: 2.2, from: 300, to: 1500, gain: 0.07 });
    },
    watchBell() {
      voice({ type: 'sine', from: 392, hold: 0.5, gain: 0.1 });
      voice({ type: 'sine', from: 587, at: 0.12, hold: 0.6, gain: 0.1 });
    },
    winFanfare() {
      [392, 523, 659, 784, 1047].forEach((freq, i) =>
        voice({ type: 'triangle', from: freq, hold: 0.34, at: i * 0.11, gain: 0.15 }));
      noise({ at: 0.2, hold: 1.1, from: 2000, to: 3600, gain: 0.03 });
    },
    loseDescent() {
      voice({ type: 'triangle', from: 392, to: 98, hold: 0.9, gain: 0.16, curve: 'lin' });
      voice({ type: 'sine', from: 196, to: 49, at: 0.1, hold: 0.9, gain: 0.1, curve: 'lin' });
    },
    /** The quiet pad under play: two detuned triangles breathing through a slow filter. */
    startPad() {
      if (!ensure() || padNodes) return;
      const oscA = context.createOscillator();
      const oscB = context.createOscillator();
      oscA.type = 'triangle';
      oscB.type = 'triangle';
      oscA.frequency.value = 110;
      oscB.frequency.value = 164.8;
      const filter = context.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 320;
      const amp = context.createGain();
      amp.gain.value = 0.0;
      amp.gain.linearRampToValueAtTime(0.035, context.currentTime + 2.5);
      const lfo = context.createOscillator();
      lfo.frequency.value = 0.07;
      const lfoGain = context.createGain();
      lfoGain.gain.value = 110;
      lfo.connect(lfoGain).connect(filter.frequency);
      oscA.connect(filter);
      oscB.connect(filter);
      filter.connect(amp).connect(master);
      oscA.start();
      oscB.start();
      lfo.start();
      padNodes = { oscA, oscB, lfo, amp };
    },
    stopPad() {
      if (!padNodes || !context) return;
      const { oscA, oscB, lfo, amp } = padNodes;
      amp.gain.linearRampToValueAtTime(0.0, context.currentTime + 0.4);
      const stopAt = context.currentTime + 0.5;
      oscA.stop(stopAt);
      oscB.stop(stopAt);
      lfo.stop(stopAt);
      padNodes = null;
    },
  };
}
