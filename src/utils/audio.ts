/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

class AudioSynthesizer {
  private ctx: AudioContext | null = null;
  private soundEnabled: boolean = true;
  private bgMusicInterval: any = null;
  private bgActiveGains: GainNode[] = [];

  constructor() {
    // Lazy initialize to avoid browser autoclave restrictions
  }

  private initContext() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtxClass) {
        this.ctx = new AudioCtxClass();
      }
    }
  }

  toggleSound(enabled?: boolean) {
    this.soundEnabled = enabled !== undefined ? enabled : !this.soundEnabled;
    if (!this.soundEnabled) {
      this.stopBackgroundMusic();
    }
    return this.soundEnabled;
  }

  isSoundEnabled() {
    return this.soundEnabled;
  }

  playTick() {
    if (!this.soundEnabled) return;
    this.initContext();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, this.ctx.currentTime);
    gain.gain.setValueAtTime(0.05, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.05);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.06);
  }

  playCorrect() {
    if (!this.soundEnabled) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(523.25, now); // C5
    osc.frequency.setValueAtTime(659.25, now + 0.1); // E5
    osc.frequency.setValueAtTime(783.99, now + 0.2); // G5
    osc.frequency.setValueAtTime(1046.50, now + 0.3); // C6

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    osc.start();
    osc.stop(now + 0.5);
  }

  playWrong() {
    if (!this.soundEnabled) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.3);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc.start();
    osc.stop(now + 0.4);
  }

  playFireworkWhistle() {
    if (!this.soundEnabled) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    // Rocket whistling: pleasant sine wave frequency sweep upwards mimicking a whistling firework launching cleanly
    osc.type = 'sine';
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.exponentialRampToValueAtTime(1400, now + 0.9);

    // Fade dynamically to keep it smooth and easy on the ears with no explosion pops
    gain.gain.setValueAtTime(0.005, now);
    gain.gain.linearRampToValueAtTime(0.08, now + 0.15);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.0);

    osc.start();
    osc.stop(now + 1.1);
  }

  playLevelUp() {
    if (!this.soundEnabled) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain1 = this.ctx.createGain();
    const gain2 = this.ctx.createGain();

    osc1.connect(gain1);
    gain1.connect(this.ctx.destination);

    osc2.connect(gain2);
    gain2.connect(this.ctx.destination);

    osc1.type = 'sine';
    osc2.type = 'triangle';

    osc1.frequency.setValueAtTime(440, now);
    osc1.frequency.setValueAtTime(554, now + 0.1);
    osc1.frequency.setValueAtTime(659, now + 0.2);
    osc1.frequency.setValueAtTime(880, now + 0.3);

    osc2.frequency.setValueAtTime(880, now);
    osc2.frequency.setValueAtTime(1108, now + 0.1);
    osc2.frequency.setValueAtTime(1318, now + 0.2);
    osc2.frequency.setValueAtTime(1760, now + 0.3);

    gain1.gain.setValueAtTime(0.1, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

    gain2.gain.setValueAtTime(0.05, now);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

    osc1.start();
    osc2.start();

    osc1.stop(now + 0.65);
    osc2.stop(now + 0.65);
  }

  playFanfare() {
    if (!this.soundEnabled) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const freqs = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50];
    
    freqs.forEach((freq, idx) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.08);

      gain.gain.setValueAtTime(0.08, now + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.35);

      osc.start(now + idx * 0.08);
      osc.stop(now + idx * 0.08 + 0.4);
    });
  }

  playChristmas() {
    if (!this.soundEnabled) return null;
    this.initContext();
    if (!this.ctx) return null;

    const ctx = this.ctx;
    const now = ctx.currentTime;
    
    // Notes and frequencies for Jingle Bells chorus
    // E5: 659.25, G5: 783.99, C5: 523.25, D5: 587.33, F5: 698.46, A5: 880.00
    const tempo = 0.22; // Seconds per beat
    const melody = [
      { f: 659.25, d: 1 }, { f: 659.25, d: 1 }, { f: 659.25, d: 2 }, // E E E
      { f: 659.25, d: 1 }, { f: 659.25, d: 1 }, { f: 659.25, d: 2 }, // E E E
      { f: 659.25, d: 1 }, { f: 783.99, d: 1 }, { f: 523.25, d: 1.5 }, { f: 587.33, d: 0.5 }, { f: 659.25, d: 4 }, // E G C D E -
      
      { f: 698.46, d: 1 }, { f: 698.46, d: 1 }, { f: 698.46, d: 1.5 }, { f: 698.46, d: 0.5 }, // F F F F
      { f: 698.46, d: 1 }, { f: 659.25, d: 1 }, { f: 659.25, d: 1 }, { f: 659.25, d: 0.5 }, { f: 659.25, d: 0.5 }, // F E E E E
      { f: 659.25, d: 1 }, { f: 587.33, d: 1 }, { f: 587.33, d: 1 }, { f: 659.25, d: 1 }, { f: 587.33, d: 2 }, // E D D E D 
      { f: 783.99, d: 2 }, // G (wait)
      
      { f: 659.25, d: 1 }, { f: 659.25, d: 1 }, { f: 659.25, d: 2 }, // E E E
      { f: 659.25, d: 1 }, { f: 659.25, d: 1 }, { f: 659.25, d: 2 }, // E E E
      { f: 659.25, d: 1 }, { f: 783.99, d: 1 }, { f: 523.25, d: 1.5 }, { f: 587.33, d: 0.5 }, { f: 659.25, d: 4 }, // E G C D E -
      
      { f: 698.46, d: 1 }, { f: 698.46, d: 1 }, { f: 698.46, d: 1.5 }, { f: 698.46, d: 0.5 }, // F F F F
      { f: 698.46, d: 1 }, { f: 659.25, d: 1 }, { f: 659.25, d: 2 }, // F E E 
      { f: 783.99, d: 1 }, { f: 783.99, d: 1 }, { f: 698.46, d: 1 }, { f: 587.33, d: 1 }, // G G F D
      { f: 523.25, d: 4 } // C 
    ];

    const activeNodes: { osc: OscillatorNode; gain: GainNode }[] = [];

    let currentRelativeTime = 0.05;
    melody.forEach((note) => {
      if (!this.ctx) return;
      const startTime = now + currentRelativeTime;
      const duration = note.d * tempo;
      
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(note.f, startTime);
      
      const oscHarmonic = this.ctx.createOscillator();
      const gainHarmonic = this.ctx.createGain();
      oscHarmonic.connect(gainHarmonic);
      gainHarmonic.connect(this.ctx.destination);
      oscHarmonic.type = 'sine';
      oscHarmonic.frequency.setValueAtTime(note.f * 2, startTime);
      
      // Volume envelopes for crystalline chime box sound
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.08, startTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration - 0.02);
      
      gainHarmonic.gain.setValueAtTime(0, startTime);
      gainHarmonic.gain.linearRampToValueAtTime(0.03, startTime + 0.01);
      gainHarmonic.gain.exponentialRampToValueAtTime(0.001, startTime + duration - 0.02);
      
      osc.start(startTime);
      osc.stop(startTime + duration);
      
      oscHarmonic.start(startTime);
      oscHarmonic.stop(startTime + duration);
      
      activeNodes.push({ osc, gain });
      activeNodes.push({ osc: oscHarmonic, gain: gainHarmonic });
      
      currentRelativeTime += duration;
    });

    const stopFn = () => {
      activeNodes.forEach(({ osc, gain }) => {
        try {
          osc.stop();
          osc.disconnect();
          gain.disconnect();
        } catch (e) {
          // ignore
        }
      });
    };

    return stopFn;
  }

  playPianoNote(freq: number, startTime: number, duration: number, volume: number = 0.05) {
    if (!this.ctx || !this.soundEnabled) return;
    try {
      const osc = this.ctx.createOscillator();
      const gainNode = this.ctx.createGain();
      
      // Mix a triangle and sine to emulate piano string strike
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, startTime);
      
      // Low pass filter to make it warmer like a real felt piano hammer
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1000, startTime);
      
      osc.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(this.ctx.destination);
      
      // Piano ADSR envelope: sharp attack, decay, release
      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(volume, startTime + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
      
      osc.start(startTime);
      osc.stop(startTime + duration + 0.1);
      
      this.bgActiveGains.push(gainNode);
    } catch (e) {
      // ignore
    }
  }

  startBackgroundMusic() {
    if (!this.soundEnabled) return;
    this.initContext();
    if (!this.ctx) return;

    // Do nothing if already playing
    if (this.bgMusicInterval) return;

    let loopCounter = 0;

    const playNextLoopPart = () => {
      if (!this.ctx || !this.soundEnabled) return;
      const now = this.ctx.currentTime;
      const type = loopCounter % 4;
      loopCounter++;

      if (type === 0) {
        // --- 0. Iconic Mario Overworld Intro ---
        this.playPianoNote(659.25, now + 0.0, 0.25, 0.04); // E5
        this.playPianoNote(659.25, now + 0.2, 0.25, 0.04); // E5
        this.playPianoNote(659.25, now + 0.6, 0.25, 0.04); // E5
        this.playPianoNote(523.25, now + 0.8, 0.25, 0.04); // C5
        this.playPianoNote(659.25, now + 1.0, 0.25, 0.05); // E5
        this.playPianoNote(783.99, now + 1.4, 0.35, 0.05); // G5
        this.playPianoNote(392.00, now + 2.2, 0.35, 0.05); // G4

        // Lounge Accompaniment
        this.playPianoNote(130.81, now + 0.8, 0.5, 0.02);  // C3
        this.playPianoNote(196.00, now + 1.4, 1.0, 0.02);  // G3
        this.playPianoNote(261.63, now + 2.2, 1.0, 0.023); // C4
      } else if (type === 1) {
        // --- 1. Mario Overworld Swing harmony ---
        this.playPianoNote(523.25, now + 0.0, 0.3, 0.04);  // C5
        this.playPianoNote(392.00, now + 0.4, 0.3, 0.035); // G4
        this.playPianoNote(329.63, now + 0.8, 0.3, 0.035); // E4
        this.playPianoNote(440.00, now + 1.2, 0.3, 0.04);  // A4
        this.playPianoNote(493.88, now + 1.6, 0.3, 0.04);  // B4
        this.playPianoNote(466.16, now + 2.0, 0.3, 0.04);  // Bb4
        this.playPianoNote(440.00, now + 2.4, 0.3, 0.04);  // A4

        // Accompaniment
        this.playPianoNote(130.81, now + 0.0, 0.5, 0.02);  // C3
        this.playPianoNote(164.81, now + 0.8, 0.5, 0.02);  // E3
        this.playPianoNote(174.61, now + 1.2, 1.5, 0.02);  // F3
      } else if (type === 2) {
        // --- 2. Star Power Upbeat Piano Chords ---
        const playChord = (freqs: number[], t: number) => {
          freqs.forEach(f => this.playPianoNote(f, t, 0.25, 0.03));
        };
        playChord([261.63, 329.63, 392.00], now + 0.0); // C major chord
        playChord([261.63, 329.63, 392.00], now + 0.4);
        playChord([261.63, 329.63, 392.00], now + 0.8);
        playChord([293.66, 369.99, 440.00], now + 1.2); // D major chord
        playChord([293.66, 369.99, 440.00], now + 1.6);
        playChord([246.94, 293.66, 392.00], now + 2.0); // G major chord
        playChord([246.94, 293.66, 392.00], now + 2.4);
        playChord([261.63, 329.63, 392.00], now + 2.8); // C major chord

        // Bass accompaniment
        this.playPianoNote(130.81, now + 0.0, 0.5, 0.02);  // C3
        this.playPianoNote(98.00, now + 0.8, 0.5, 0.02);   // G2
        this.playPianoNote(146.83, now + 1.6, 0.5, 0.02);  // D3
        this.playPianoNote(196.00, now + 2.4, 0.5, 0.02);  // G3
      } else {
        // --- 3. Cozy Jazzy Underground theme ---
        this.playPianoNote(130.81, now + 0.0, 0.15, 0.02);  // C3
        this.playPianoNote(261.63, now + 0.15, 0.15, 0.025); // C4
        this.playPianoNote(110.00, now + 0.4, 0.15, 0.02);   // A2
        this.playPianoNote(220.00, now + 0.55, 0.15, 0.025); // A3
        this.playPianoNote(92.50, now + 0.8, 0.15, 0.02);    // F#2
        this.playPianoNote(185.00, now + 0.95, 0.15, 0.025); // F#3
        this.playPianoNote(98.00, now + 1.2, 0.15, 0.02);    // G2
        this.playPianoNote(196.00, now + 1.35, 0.15, 0.025); // G3

        // Right hand jazz lick
        this.playPianoNote(659.25, now + 1.8, 0.2, 0.045);   // E5
        this.playPianoNote(587.33, now + 2.0, 0.2, 0.04);    // D5
        this.playPianoNote(622.25, now + 2.2, 0.2, 0.04);    // Eb5
        this.playPianoNote(523.25, now + 2.4, 0.5, 0.045);   // C5
      }
    };

    // Play initial piece instantly
    playNextLoopPart();

    // Loop every 3.5 seconds
    this.bgMusicInterval = setInterval(playNextLoopPart, 3500);
  }

  stopBackgroundMusic() {
    if (this.bgMusicInterval) {
      clearInterval(this.bgMusicInterval);
      this.bgMusicInterval = null;
    }
    // Fade out any active gains gracefully to avoid clicking sounds
    this.bgActiveGains.forEach((gainNode) => {
      try {
        gainNode.gain.cancelScheduledValues(0);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, 1.0);
      } catch (e) {
        // ignore
      }
    });
    this.bgActiveGains = [];
  }
}

export const gameAudio = new AudioSynthesizer();
