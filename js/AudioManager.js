/**
 * AudioManager.js
 * High-performance Web Audio API procedural sound engine.
 * Fully standalone - requires zero external sound files.
 * Generates realistic dynamic engine audio, tire skids, nitro roars, collisions,
 * countdown beeps, checkpoint chimes, ambient city wind, and synthwave racing soundtrack.
 */

class AudioManager {
  constructor() {
    this.ctx = null;
    this.isMuted = false;
    this.masterVolume = 0.8;
    this.sfxVolume = 0.8;
    this.musicVolume = 0.5;

    // Engine synth nodes
    this.engineGain = null;
    this.engineOsc1 = null;
    this.engineOsc2 = null;
    this.engineSub = null;
    this.engineFilter = null;
    this.engineRunning = false;

    // Tire skid nodes
    this.skidGain = null;
    this.skidFilter = null;
    this.skidNoiseNode = null;

    // Nitro sound nodes
    this.nitroGain = null;
    this.nitroFilter = null;

    // Wind ambient nodes
    this.windGain = null;
    this.windFilter = null;

    // Background procedural music state
    this.musicPlaying = false;
    this.musicGain = null;
    this.musicTimer = null;
    this.musicStep = 0;

    // Master bus
    this.masterNode = null;
    this.sfxNode = null;

    this.initialized = false;
  }

  init() {
    if (this.initialized) return;

    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      this.ctx = new AudioContext();

      // Master bus
      this.masterNode = this.ctx.createGain();
      this.masterNode.gain.setValueAtTime(this.masterVolume, this.ctx.currentTime);
      this.masterNode.connect(this.ctx.destination);

      // SFX bus
      this.sfxNode = this.ctx.createGain();
      this.sfxNode.gain.setValueAtTime(this.sfxVolume, this.ctx.currentTime);
      this.sfxNode.connect(this.masterNode);

      // Music bus
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.setValueAtTime(this.musicVolume, this.ctx.currentTime);
      this.musicGain.connect(this.masterNode);

      this.initEngineAudio();
      this.initSkidAudio();
      this.initNitroAudio();
      this.initWindAudio();

      this.initialized = true;
    } catch (e) {
      console.warn('Web Audio init failed:', e);
    }
  }

  ensureContext() {
    if (!this.initialized) {
      this.init();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  initEngineAudio() {
    if (!this.ctx) return;

    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.setValueAtTime(0.001, this.ctx.currentTime);

    this.engineFilter = this.ctx.createBiquadFilter();
    this.engineFilter.type = 'lowpass';
    this.engineFilter.frequency.setValueAtTime(350, this.ctx.currentTime);
    this.engineFilter.Q.setValueAtTime(3.0, this.ctx.currentTime);

    // Primary engine cylinder pulse oscillator (sawtooth)
    this.engineOsc1 = this.ctx.createOscillator();
    this.engineOsc1.type = 'sawtooth';
    this.engineOsc1.frequency.setValueAtTime(45, this.ctx.currentTime);

    // Secondary harmonic oscillator (triangle for rumble)
    this.engineOsc2 = this.ctx.createOscillator();
    this.engineOsc2.type = 'triangle';
    this.engineOsc2.frequency.setValueAtTime(90, this.ctx.currentTime);

    // Sub-bass oscillator
    this.engineSub = this.ctx.createOscillator();
    this.engineSub.type = 'sine';
    this.engineSub.frequency.setValueAtTime(22.5, this.ctx.currentTime);

    this.engineOsc1.connect(this.engineFilter);
    this.engineOsc2.connect(this.engineFilter);
    this.engineSub.connect(this.engineFilter);
    this.engineFilter.connect(this.engineGain);
    this.engineGain.connect(this.sfxNode);

    try {
      this.engineOsc1.start();
      this.engineOsc2.start();
      this.engineSub.start();
      this.engineRunning = true;
    } catch (e) {}
  }

  initSkidAudio() {
    if (!this.ctx) return;

    // Buffer of white noise for screech
    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    whiteNoise.loop = true;

    this.skidFilter = this.ctx.createBiquadFilter();
    this.skidFilter.type = 'bandpass';
    this.skidFilter.frequency.setValueAtTime(1400, this.ctx.currentTime);
    this.skidFilter.Q.setValueAtTime(4.0, this.ctx.currentTime);

    this.skidGain = this.ctx.createGain();
    this.skidGain.gain.setValueAtTime(0.0001, this.ctx.currentTime);

    whiteNoise.connect(this.skidFilter);
    this.skidFilter.connect(this.skidGain);
    this.skidGain.connect(this.sfxNode);

    try {
      whiteNoise.start();
    } catch (e) {}
  }

  initNitroAudio() {
    if (!this.ctx) return;

    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    whiteNoise.loop = true;

    this.nitroFilter = this.ctx.createBiquadFilter();
    this.nitroFilter.type = 'lowpass';
    this.nitroFilter.frequency.setValueAtTime(900, this.ctx.currentTime);

    this.nitroGain = this.ctx.createGain();
    this.nitroGain.gain.setValueAtTime(0.0001, this.ctx.currentTime);

    whiteNoise.connect(this.nitroFilter);
    this.nitroFilter.connect(this.nitroGain);
    this.nitroGain.connect(this.sfxNode);

    try {
      whiteNoise.start();
    } catch (e) {}
  }

  initWindAudio() {
    if (!this.ctx) return;

    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    noise.loop = true;

    this.windFilter = this.ctx.createBiquadFilter();
    this.windFilter.type = 'lowpass';
    this.windFilter.frequency.setValueAtTime(200, this.ctx.currentTime);

    this.windGain = this.ctx.createGain();
    this.windGain.gain.setValueAtTime(0.0001, this.ctx.currentTime);

    noise.connect(this.windFilter);
    this.windFilter.connect(this.windGain);
    this.windGain.connect(this.sfxNode);

    try {
      noise.start();
    } catch (e) {}
  }

  /**
   * Update continuous sound parameters based on dynamic vehicle physics
   * @param {number} rpm - normalized 0 to 1
   * @param {number} throttle - 0 to 1
   * @param {number} speed - speed in km/h
   * @param {number} slip - tire slip magnitude 0 to 1
   * @param {boolean} isNitroActive - whether nitro is firing
   */
  updateEngine(rpm, throttle, speed, slip, isNitroActive) {
    if (!this.initialized || !this.ctx || this.isMuted) return;

    const now = this.ctx.currentTime;

    // Dynamic pitch based on RPM
    const baseFreq = 40 + rpm * 180 + (throttle * 30);
    this.engineOsc1.frequency.setTargetAtTime(baseFreq, now, 0.05);
    this.engineOsc2.frequency.setTargetAtTime(baseFreq * 1.5, now, 0.05);
    this.engineSub.frequency.setTargetAtTime(baseFreq * 0.5, now, 0.05);

    // Dynamic filter opens up on throttle
    const filterFreq = 300 + (rpm * 2200) + (throttle * 1400);
    this.engineFilter.frequency.setTargetAtTime(filterFreq, now, 0.05);

    // Engine volume
    const targetVolume = Math.min(0.7, 0.15 + (throttle * 0.35) + (rpm * 0.25));
    this.engineGain.gain.setTargetAtTime(targetVolume, now, 0.05);

    // Tire skid sound
    if (slip > 0.18) {
      const skidVol = Math.min(0.65, (slip - 0.18) * 1.5);
      const skidFreq = 1200 + slip * 800;
      this.skidGain.gain.setTargetAtTime(skidVol, now, 0.03);
      this.skidFilter.frequency.setTargetAtTime(skidFreq, now, 0.03);
    } else {
      this.skidGain.gain.setTargetAtTime(0.0001, now, 0.08);
    }

    // Nitro sound
    if (isNitroActive) {
      this.nitroGain.gain.setTargetAtTime(0.5, now, 0.05);
      this.nitroFilter.frequency.setTargetAtTime(1400, now, 0.05);
    } else {
      this.nitroGain.gain.setTargetAtTime(0.0001, now, 0.1);
    }

    // High speed wind sound
    const windVol = Math.min(0.35, Math.max(0, (speed - 50) / 250));
    this.windGain.gain.setTargetAtTime(windVol, now, 0.1);
    this.windFilter.frequency.setTargetAtTime(150 + speed * 3.5, now, 0.1);
  }

  // Crash / impact feedback
  playCrash(intensity = 1.0) {
    if (!this.initialized || !this.ctx || this.isMuted) return;

    this.ensureContext();
    const now = this.ctx.currentTime;
    const dur = 0.35 * Math.min(1.5, intensity);

    // Low boom
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(120, now);
    osc.frequency.exponentialRampToValueAtTime(25, now + dur);

    gain.gain.setValueAtTime(Math.min(0.8, 0.3 * intensity), now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

    osc.connect(gain);
    gain.connect(this.sfxNode);

    osc.start(now);
    osc.stop(now + dur);

    // Noise crack
    const bufferSize = Math.floor(this.ctx.sampleRate * 0.2);
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.25));
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(Math.min(0.7, 0.4 * intensity), now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    noise.connect(noiseGain);
    noiseGain.connect(this.sfxNode);
    noise.start(now);
  }

  // Checkpoint chime (two harmonic bells)
  playCheckpoint() {
    if (!this.initialized || !this.ctx || this.isMuted) return;
    this.ensureContext();

    const now = this.ctx.currentTime;
    [523.25, 783.99].forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.08);

      gain.gain.setValueAtTime(0.3, now + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.08 + 0.5);

      osc.connect(gain);
      gain.connect(this.sfxNode);

      osc.start(now + idx * 0.08);
      osc.stop(now + idx * 0.08 + 0.5);
    });
  }

  // Countdown beeps (high tone for GO!)
  playCountdown(isFinal = false) {
    if (!this.initialized || !this.ctx || this.isMuted) return;
    this.ensureContext();

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = isFinal ? 'triangle' : 'sine';
    const freq = isFinal ? 880 : 440;
    const dur = isFinal ? 0.6 : 0.25;

    osc.frequency.setValueAtTime(freq, now);
    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

    osc.connect(gain);
    gain.connect(this.sfxNode);

    osc.start(now);
    osc.stop(now + dur);
  }

  // Turbo blow-off valve on shift
  playGearShift() {
    if (!this.initialized || !this.ctx || this.isMuted) return;
    this.ensureContext();

    const now = this.ctx.currentTime;
    const bufferSize = Math.floor(this.ctx.sampleRate * 0.15);
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(2500, now);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxNode);
    noise.start(now);
  }

  // UI button click
  playClick() {
    if (!this.initialized || !this.ctx || this.isMuted) return;
    this.ensureContext();

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(300, now + 0.06);

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

    osc.connect(gain);
    gain.connect(this.sfxNode);
    osc.start(now);
    osc.stop(now + 0.06);
  }

  // Procedural Synthwave Background Music
  startMusic() {
    if (this.musicPlaying || this.isMuted) return;
    this.ensureContext();
    this.musicPlaying = true;
    this.musicStep = 0;

    // Synthwave chord progression & bass pattern: Am - F - C - G
    const bassNotes = [110, 110, 87.3, 87.3, 65.4, 65.4, 98.0, 98.0]; // A2, F2, C2, G2
    const leadChords = [
      [220, 261.6, 329.6], // Am
      [174.6, 220, 261.6], // F
      [130.8, 164.8, 196.0], // C
      [196.0, 246.9, 293.7]  // G
    ];

    const stepDuration = 0.22; // 136 BPM roughly

    const playMusicStep = () => {
      if (!this.musicPlaying || !this.ctx) return;
      const now = this.ctx.currentTime;

      const beat = this.musicStep % 16;
      const bar = Math.floor((this.musicStep % 64) / 16);

      // Kick drum on 0, 4, 8, 12
      if (beat % 4 === 0) {
        const kickOsc = this.ctx.createOscillator();
        const kickGain = this.ctx.createGain();
        kickOsc.type = 'sine';
        kickOsc.frequency.setValueAtTime(130, now);
        kickOsc.frequency.exponentialRampToValueAtTime(38, now + 0.12);
        kickGain.gain.setValueAtTime(0.3, now);
        kickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
        kickOsc.connect(kickGain);
        kickGain.connect(this.musicGain);
        kickOsc.start(now);
        kickOsc.stop(now + 0.14);
      }

      // Snare on 4, 12
      if (beat === 4 || beat === 12) {
        const snareOsc = this.ctx.createOscillator();
        const snareGain = this.ctx.createGain();
        snareOsc.type = 'triangle';
        snareOsc.frequency.setValueAtTime(190, now);
        snareGain.gain.setValueAtTime(0.15, now);
        snareGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        snareOsc.connect(snareGain);
        snareGain.connect(this.musicGain);
        snareOsc.start(now);
        snareOsc.stop(now + 0.1);
      }

      // Synth Bassline on every 8th note
      const bassFreq = bassNotes[Math.floor(this.musicStep / 2) % bassNotes.length];
      const bassOsc = this.ctx.createOscillator();
      const bassGain = this.ctx.createGain();
      bassOsc.type = 'sawtooth';
      bassOsc.frequency.setValueAtTime(bassFreq, now);

      const bassFilter = this.ctx.createBiquadFilter();
      bassFilter.type = 'lowpass';
      bassFilter.frequency.setValueAtTime(400, now);
      bassFilter.frequency.exponentialRampToValueAtTime(150, now + stepDuration * 0.8);

      bassGain.gain.setValueAtTime(0.14, now);
      bassGain.gain.exponentialRampToValueAtTime(0.001, now + stepDuration * 0.9);

      bassOsc.connect(bassFilter);
      bassFilter.connect(bassGain);
      bassGain.connect(this.musicGain);
      bassOsc.start(now);
      bassOsc.stop(now + stepDuration);

      // Arpeggiated Synth Lead
      const chord = leadChords[bar % leadChords.length];
      const leadFreq = chord[this.musicStep % chord.length] * 2;
      const leadOsc = this.ctx.createOscillator();
      const leadGain = this.ctx.createGain();
      leadOsc.type = 'square';
      leadOsc.frequency.setValueAtTime(leadFreq, now);

      const leadFilter = this.ctx.createBiquadFilter();
      leadFilter.type = 'lowpass';
      leadFilter.frequency.setValueAtTime(1600, now);

      leadGain.gain.setValueAtTime(0.06, now);
      leadGain.gain.exponentialRampToValueAtTime(0.001, now + stepDuration * 0.7);

      leadOsc.connect(leadFilter);
      leadFilter.connect(leadGain);
      leadGain.connect(this.musicGain);
      leadOsc.start(now);
      leadOsc.stop(now + stepDuration);

      this.musicStep++;
    };

    this.musicTimer = setInterval(playMusicStep, stepDuration * 1000);
  }

  stopMusic() {
    this.musicPlaying = false;
    if (this.musicTimer) {
      clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }

  toggleMusic() {
    if (this.musicPlaying) {
      this.stopMusic();
    } else {
      this.startMusic();
    }
    return this.musicPlaying;
  }

  setVolume(master, sfx, music) {
    this.masterVolume = master;
    this.sfxVolume = sfx;
    this.musicVolume = music;

    if (this.masterNode && this.ctx) {
      this.masterNode.gain.setValueAtTime(this.isMuted ? 0 : this.masterVolume, this.ctx.currentTime);
    }
    if (this.sfxNode && this.ctx) {
      this.sfxNode.gain.setValueAtTime(this.sfxVolume, this.ctx.currentTime);
    }
    if (this.musicGain && this.ctx) {
      this.musicGain.gain.setValueAtTime(this.musicVolume, this.ctx.currentTime);
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.masterNode && this.ctx) {
      this.masterNode.gain.setValueAtTime(this.isMuted ? 0 : this.masterVolume, this.ctx.currentTime);
    }
    return this.isMuted;
  }
}

window.AudioManager = AudioManager;
