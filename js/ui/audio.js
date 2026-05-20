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
 * Plays a short tone using Web Audio API (no external files required).
 * @param {number} frequency - Hz
 * @param {number} duration - seconds
 * @param {string} type - oscillator type
 */
function playTone(frequency, duration, type = 'sine') {
    if (!audioEnabled) return;

    try {
        const context = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = context.createOscillator();
        const gain = context.createGain();

        oscillator.type = type;
        oscillator.frequency.value = frequency;
        gain.gain.setValueAtTime(0.15, context.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, context.currentTime + duration);

        oscillator.connect(gain);
        gain.connect(context.destination);
        oscillator.start();
        oscillator.stop(context.currentTime + duration);
    } catch {
        // Audio not supported in this environment
    }
}

/**
 * UX-004: Cannon sound when a shot is fired.
 */
export function playShotSound() {
    playTone(120, 0.12, 'square');
    setTimeout(() => playTone(80, 0.08, 'square'), 40);
}

/**
 * UX-005: Explosion sound when a shot hits a ship.
 */
export function playExplosionSound() {
    playTone(90, 0.2, 'sawtooth');
    setTimeout(() => playTone(55, 0.25, 'triangle'), 60);
}

/**
 * Splash de agua cuando un disparo falla.
 */
export function playSplashSound() {
    playTone(300, 0.07, 'sine');
    setTimeout(() => playTone(190, 0.12, 'triangle'), 45);
}

/**
 * Sonar ping for naval menu background (optional click feedback).
 */
export function playSonarPing() {
    playTone(520, 0.08, 'sine');
    setTimeout(() => playTone(280, 0.22, 'sine'), 70);
    setTimeout(() => playTone(180, 0.35, 'triangle'), 140);
}
