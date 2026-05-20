/**
 * gameHud.js
 * Match timer, sunk counters, shot log, zoom, theme, welcome screen.
 * Owner: J. Mena (feature/ui)
 */

import { adjustCellZoom } from './responsive.js';

let timerInterval = null;
let elapsedSeconds = 0;

/**
 * UX-025: Hides welcome splash overlay (boards load underneath).
 */
export function initWelcomeScreen() {
    const welcome = document.getElementById('welcome-screen');
    const btn = document.getElementById('welcome-start-btn');

    if (!btn || !welcome) return;

    btn.addEventListener('click', () => {
        welcome.classList.add('welcome-screen--hidden');
    });
}

/**
 * UX-014: Starts the match timer display.
 */
export function startMatchTimer() {
    stopMatchTimer();
    elapsedSeconds = 0;
    updateTimerDisplay();

    timerInterval = setInterval(() => {
        elapsedSeconds++;
        updateTimerDisplay();
    }, 1000);
}

/**
 * Stops the match timer.
 */
export function stopMatchTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

/**
 * @returns {number} Elapsed seconds in current match
 */
export function getElapsedSeconds() {
    return elapsedSeconds;
}

function updateTimerDisplay() {
    const el = document.getElementById('match-timer');
    if (!el) return;

    const minutes = String(Math.floor(elapsedSeconds / 60)).padStart(2, '0');
    const seconds = String(elapsedSeconds % 60).padStart(2, '0');
    el.textContent = `Tiempo: ${minutes}:${seconds}`;
}

/**
 * UI-023: Updates sunk ship counters for both sides.
 * @param {number} playerSunk
 * @param {number} enemySunk
 */
export function updateSunkCounters(playerSunk, enemySunk) {
    const playerEl = document.getElementById('player-sunk-count');
    const enemyEl = document.getElementById('enemy-sunk-count');
    if (playerEl) playerEl.textContent = String(playerSunk);
    if (enemyEl) enemyEl.textContent = String(enemySunk);
}

/**
 * UX-013: Appends an entry to the visible shot log.
 * @param {string} text - Log line
 */
export function appendShotLogEntry(text) {
    const log = document.getElementById('shot-log');
    if (!log) return;

    const item = document.createElement('li');
    item.className = 'shot-log__item';
    item.textContent = text;
    log.prepend(item);

    while (log.children.length > 30) {
        log.lastChild.remove();
    }
}

/**
 * Shows the shot log panel when combat starts.
 */
export function showShotLogSection() {
    const section = document.getElementById('shot-log-section');
    if (section) {
        section.classList.remove('hidden');
        section.style.display = '';
    }
}

/**
 * UX-018: Zoom changes real cell size so layout does not overlap ships section.
 */
export function initBoardZoomControls() {
    const zoomIn = document.getElementById('board-zoom-in');
    const zoomOut = document.getElementById('board-zoom-out');

    zoomIn?.addEventListener('click', () => adjustCellZoom(1));
    zoomOut?.addEventListener('click', () => adjustCellZoom(-1));
}

/**
 * UX-020: Toggles dark mode on body.
 */
export function initThemeToggle() {
    const btn = document.getElementById('theme-toggle');
    if (!btn) return;

    btn.addEventListener('click', () => {
        document.body.classList.toggle('theme-dark');
        const isDark = document.body.classList.contains('theme-dark');
        btn.textContent = isDark ? 'Modo claro' : 'Modo oscuro';
    });
}

/**
 * Reveals the enemy attack board section.
 */
export function showAttackBoardSection() {
    const section = document.querySelector('.board-section--attack');
    if (section) section.classList.remove('hidden');
}
