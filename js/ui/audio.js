/**
 * audio.js
 * Sound effects for shots and hits (UX-004, UX-005).
 * Owner: J. Mena (feature/ui)
 */

let audioEnabled = true;

/**
 * Enables or disables game sounds.
 * @param {boolean} enabled
 */
export function setAudioEnabled(enabled) {
    audioEnabled = enabled;
}

/**
 * Creates a shared oscillator-based tone.
 */
function playTone(frequency, duration, type = 'sine', volume = 0.12) {
    if (!audioEnabled) return;

    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        const context = new AudioContext();
        const oscillator = context.createOscillator();
        const gain = context.createGain();

        oscillator.type = type;
        oscillator.frequency.value = frequency;
        gain.gain.setValueAtTime(volume, context.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + duration);

        oscillator.connect(gain);
        gain.connect(context.destination);
        oscillator.start();
        oscillator.stop(context.currentTime + duration);
    } catch {
        // Audio not supported in this environment
    }
}

export function playShotSound() {
    playTone(140, 0.12, 'square', 0.14);
    setTimeout(() => playTone(90, 0.08, 'square', 0.1), 45);
}

export function playExplosionSound() {
    playTone(220, 0.14, 'sawtooth', 0.14);
    setTimeout(() => playTone(120, 0.18, 'triangle', 0.1), 80);
}

export function playMissSound() {
    playTone(220, 0.1, 'triangle', 0.08);
    setTimeout(() => playTone(180, 0.08, 'triangle', 0.06), 35);
}

export function playSunkSound() {
    playTone(260, 0.16, 'square', 0.16);
    setTimeout(() => playTone(140, 0.18, 'sine', 0.08), 90);
}

export function playWinSound() {
    playTone(420, 0.22, 'triangle', 0.14);
    setTimeout(() => playTone(320, 0.24, 'triangle', 0.12), 120);
}
