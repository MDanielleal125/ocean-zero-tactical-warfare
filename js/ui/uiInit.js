import { initWelcomeScreen, initThemeToggle, initBoardZoomControls } from './gameHud.js';
import { initResponsiveLayout } from './responsive.js';
import { setAudioEnabled } from './audio.js';

let audioEnabled = true;

function toggleAudio() {
    audioEnabled = !audioEnabled;
    setAudioEnabled(audioEnabled);
    const button = document.getElementById('muteButton');
    if (button) {
        button.textContent = audioEnabled ? '🔊 Sonido' : '🔇 Silencio';
    }
}

function bindWelcomeStart() {
    const welcomeBtn = document.getElementById('welcome-start-btn');
    if (!welcomeBtn) return;

    welcomeBtn.addEventListener('click', () => {
        const welcome = document.getElementById('welcome-screen');
        if (welcome) {
            welcome.classList.add('welcome-screen--hidden');
        }
    });
}

function bindRestartButton() {
    const restart = document.getElementById('restartGameButton');
    if (!restart) return;

    restart.addEventListener('click', () => {
        window.dispatchEvent(new CustomEvent('gameRestartRequested'));
    });
}

function bindMuteButton() {
    const mute = document.getElementById('muteButton');
    if (!mute) return;
    mute.addEventListener('click', toggleAudio);
}

window.addEventListener('DOMContentLoaded', () => {
    initResponsiveLayout();
    initWelcomeScreen();
    initThemeToggle();
    initBoardZoomControls();
    bindWelcomeStart();
    bindRestartButton();
    bindMuteButton();
});
