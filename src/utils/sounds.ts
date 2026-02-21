
/**
 * Programmatic UI Sound Utility for BuddyLine
 * Generates sounds using Web Audio API for maximum reliability and distinctness.
 */

export type SoundEffect = 'click' | 'sent' | 'received' | 'merge' | 'error' | 'jump' | 'fall' | 'move' | 'eat' | 'collision' | 'correct' | 'incorrect' | 'lose_life' | 'flow_step' | 'flow_done' | 'mine_start' | 'mine_flag' | 'mine_reveal' | 'mine_explode' | 'mine_win';

class SoundManager {
    private static instance: SoundManager;
    private audioContext: AudioContext | null = null;

    private constructor() { }

    public static getInstance(): SoundManager {
        if (!SoundManager.instance) {
            SoundManager.instance = new SoundManager();
        }
        return SoundManager.instance;
    }

    private initContext() {
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || (window as Window & typeof globalThis & { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
        }
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
        return this.audioContext;
    }

    public play(effect: SoundEffect, volume: number = 0.5) {
        try {
            const ctx = this.initContext();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.connect(gain);
            gain.connect(ctx.destination);

            const now = ctx.currentTime;

            switch (effect) {
                case 'click':
                    // Short high-pitched sine click
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(1200, now);
                    gain.gain.setValueAtTime(volume, now);
                    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
                    osc.start(now);
                    osc.stop(now + 0.05);
                    break;
                case 'jump':
                    // Spring-like upward sine sweep
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(200, now);
                    osc.frequency.exponentialRampToValueAtTime(800, now + 0.15);
                    gain.gain.setValueAtTime(volume * 0.7, now);
                    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
                    osc.start(now);
                    osc.stop(now + 0.15);
                    break;
                case 'sent':
                    // Upward slide
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(400, now);
                    osc.frequency.linearRampToValueAtTime(600, now + 0.2);
                    gain.gain.setValueAtTime(volume * 0.3, now);
                    gain.gain.linearRampToValueAtTime(0, now + 0.2);
                    osc.start(now);
                    osc.stop(now + 0.2);
                    break;
                case 'received':
                    // Two-tone bell
                    osc.type = 'triangle';
                    osc.frequency.setValueAtTime(800, now);
                    osc.frequency.setValueAtTime(1200, now + 0.08);
                    gain.gain.setValueAtTime(volume * 0.6, now);
                    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
                    osc.start(now);
                    osc.stop(now + 0.2);
                    break;
                case 'merge':
                    // harmonic shine
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(300, now);
                    osc.frequency.setValueAtTime(600, now + 0.1);
                    osc.frequency.setValueAtTime(1200, now + 0.2);
                    gain.gain.setValueAtTime(volume * 0.8, now);
                    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
                    osc.start(now);
                    osc.stop(now + 0.3);
                    break;
                case 'error':
                    // Low buzz
                    osc.type = 'sawtooth';
                    osc.frequency.setValueAtTime(150, now);
                    gain.gain.setValueAtTime(volume * 0.4, now);
                    gain.gain.linearRampToValueAtTime(0, now + 0.2);
                    osc.start(now);
                    osc.stop(now + 0.2);
                    break;
                case 'fall':
                    // Downward whistling sweep
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(400, now);
                    osc.frequency.exponentialRampToValueAtTime(50, now + 0.5);
                    gain.gain.setValueAtTime(volume, now);
                    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
                    osc.start(now);
                    osc.stop(now + 0.5);
                    break;
                case 'move':
                    // Very short, subtle white-noise-like click for slithering
                    osc.type = 'triangle';
                    osc.frequency.setValueAtTime(150, now);
                    gain.gain.setValueAtTime(volume * 0.2, now);
                    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.03);
                    osc.start(now);
                    osc.stop(now + 0.03);
                    break;
                case 'eat':
                    // Upward poppy chirp
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(600, now);
                    osc.frequency.exponentialRampToValueAtTime(1200, now + 0.1);
                    gain.gain.setValueAtTime(volume * 0.8, now);
                    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
                    osc.start(now);
                    osc.stop(now + 0.1);
                    break;
                case 'collision':
                    // Low thud/crash
                    osc.type = 'square';
                    osc.frequency.setValueAtTime(100, now);
                    osc.frequency.linearRampToValueAtTime(40, now + 0.2);
                    gain.gain.setValueAtTime(volume * 0.5, now);
                    gain.gain.linearRampToValueAtTime(0, now + 0.2);
                    osc.start(now);
                    osc.stop(now + 0.2);
                    break;
                case 'correct':
                    // Short bright harmonic glissando
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(400, now);
                    osc.frequency.exponentialRampToValueAtTime(800, now + 0.1);
                    osc.frequency.exponentialRampToValueAtTime(1600, now + 0.2);
                    gain.gain.setValueAtTime(volume * 0.7, now);
                    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
                    osc.start(now);
                    osc.stop(now + 0.2);
                    break;
                case 'incorrect':
                    // Short low buzz (different from mistake/collision)
                    osc.type = 'sawtooth';
                    osc.frequency.setValueAtTime(220, now);
                    osc.frequency.linearRampToValueAtTime(110, now + 0.15);
                    gain.gain.setValueAtTime(volume * 0.4, now);
                    gain.gain.linearRampToValueAtTime(0, now + 0.15);
                    osc.start(now);
                    osc.stop(now + 0.15);
                    break;
                case 'lose_life':
                    // Double low pulse
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(150, now);
                    osc.frequency.setValueAtTime(100, now + 0.1);
                    gain.gain.setValueAtTime(volume, now);
                    gain.gain.setValueAtTime(volume * 0.5, now + 0.1);
                    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
                    osc.start(now);
                    osc.stop(now + 0.3);
                    break;
                case 'flow_step':
                    // Tiny high-pitched pop
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(1200, now);
                    gain.gain.setValueAtTime(volume * 0.1, now);
                    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.02);
                    osc.start(now);
                    osc.stop(now + 0.02);
                    break;
                case 'flow_done':
                    // Harmonic rise
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(440, now);
                    osc.frequency.exponentialRampToValueAtTime(880, now + 0.1);
                    gain.gain.setValueAtTime(volume * 0.6, now);
                    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
                    osc.start(now);
                    osc.stop(now + 0.15);
                    break;
                case 'mine_start':
                    // Mechanical clockwork start
                    osc.type = 'square';
                    osc.frequency.setValueAtTime(150, now);
                    osc.frequency.setValueAtTime(100, now + 0.1);
                    gain.gain.setValueAtTime(volume * 0.4, now);
                    gain.gain.linearRampToValueAtTime(0, now + 0.2);
                    osc.start(now);
                    osc.stop(now + 0.2);
                    break;
                case 'mine_flag':
                    // Sharp metallic click
                    osc.type = 'triangle';
                    osc.frequency.setValueAtTime(1000, now);
                    osc.frequency.linearRampToValueAtTime(800, now + 0.05);
                    gain.gain.setValueAtTime(volume, now);
                    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
                    osc.start(now);
                    osc.stop(now + 0.05);
                    break;
                case 'mine_reveal':
                    // Tapping glass
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(600, now);
                    gain.gain.setValueAtTime(volume * 0.3, now);
                    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
                    osc.start(now);
                    osc.stop(now + 0.05);
                    break;
                case 'mine_explode': {
                    // Distorted noise burst
                    const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
                    const outputChannel = noiseBuffer.getChannelData(0);
                    for (let i = 0; i < noiseBuffer.length; i++) {
                        outputChannel[i] = Math.random() * 2 - 1;
                    }
                    const noise = ctx.createBufferSource();
                    noise.buffer = noiseBuffer;
                    const noiseFilter = ctx.createBiquadFilter();
                    noiseFilter.type = 'lowpass';
                    noiseFilter.frequency.setValueAtTime(400, now);
                    noiseFilter.frequency.exponentialRampToValueAtTime(40, now + 0.5);
                    noise.connect(noiseFilter);
                    noiseFilter.connect(gain);
                    gain.gain.setValueAtTime(volume, now);
                    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
                    noise.start(now);
                    noise.stop(now + 0.5);
                    return; // Early return because we use noise source
                }
                case 'mine_win': {
                    // Rapid success pings
                    const freqs = [523.25, 659.25, 783.99, 1046.50];
                    freqs.forEach((freq, i) => {
                        const o = ctx.createOscillator();
                        const g = ctx.createGain();
                        o.frequency.setValueAtTime(freq, now + i * 0.1);
                        g.gain.setValueAtTime(volume * 0.5, now + i * 0.1);
                        g.gain.exponentialRampToValueAtTime(0.01, now + i * 0.1 + 0.2);
                        o.connect(g);
                        g.connect(ctx.destination);
                        o.start(now + i * 0.1);
                        o.stop(now + i * 0.1 + 0.2);
                    });
                    break;
                }
            }
        } catch (e) {
            console.warn('Sound play failed:', e);
        }
    }
}

export const playSound = (effect: SoundEffect, volume?: number) => {
    SoundManager.getInstance().play(effect, volume);
};
