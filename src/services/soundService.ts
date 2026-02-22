class SoundService {
    private sounds: { [key: string]: HTMLAudioElement } = {};
    private isInitialized = false;

    private soundUrls = {
        calling: 'https://assets.mixkit.co/active_storage/sfx/1359/1359-preview.mp3', // Outgoing ring
        ringing: 'https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3', // Incoming ring
        connected: 'https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3', // Call started
        disconnected: 'https://assets.mixkit.co/active_storage/sfx/2359/2359-preview.mp3' // Call ended
    };

    constructor() {
        if (typeof window !== 'undefined') {
            this.init();
        }
    }

    private init() {
        if (this.isInitialized) return;

        Object.entries(this.soundUrls).forEach(([key, url]) => {
            const audio = new Audio(url);
            audio.preload = 'auto';
            if (key === 'calling' || key === 'ringing') {
                audio.loop = true;
            }
            this.sounds[key] = audio;
        });

        this.isInitialized = true;
    }

    async play(soundName: keyof typeof this.soundUrls) {
        try {
            const sound = this.sounds[soundName];
            if (sound) {
                sound.currentTime = 0;
                await sound.play();
            }
        } catch (error) {
            console.warn(`Failed to play sound: ${soundName}`, error);
        }
    }

    stop(soundName: keyof typeof this.soundUrls) {
        const sound = this.sounds[soundName];
        if (sound) {
            sound.pause();
            sound.currentTime = 0;
        }
    }

    stopAll() {
        Object.values(this.sounds).forEach(sound => {
            sound.pause();
            sound.currentTime = 0;
        });
    }
}

export const soundService = new SoundService();
