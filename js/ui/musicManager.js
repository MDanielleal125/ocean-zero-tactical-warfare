/**
 * musicManager.js — Dynamic background music with crossfade and localStorage prefs.
 */

const TRACKS = {
    menu: 'assets/audio/naval_menu.mp3',
    selection: 'assets/audio/navalepic_seleccion.mp3',
    battle: 'assets/audio/navalcaribe_batalla.mp3'
};

const STORAGE_VOLUME = 'battleship_music_volume';
const STORAGE_MUTED = 'battleship_music_muted';
const DEFAULT_VOLUME = 0.7;
const FADE_MS = 900;
const PAUSE_DUCK = 0.35;

let audios = null;
let activeScene = null;
let fadeToken = 0;
let unlocked = false;
let pendingScene = 'menu';
let userVolume = DEFAULT_VOLUME;
let muted = false;
let gamePaused = false;
let settingsBound = false;

/**
 * Initializes music system and settings UI hooks.
 */
export function initMusicManager() {
    if (audios) return;

    audios = {
        menu: createTrack(TRACKS.menu),
        selection: createTrack(TRACKS.selection),
        battle: createTrack(TRACKS.battle)
    };

    loadPreferences();
    bindUnlockHandlers();
    bindSettingsUI();
    document.addEventListener('audioUnlock', () => unlockAudio());
    pendingScene = 'menu';
}

function createTrack(src) {
    const audio = new Audio(src);
    audio.loop = true;
    audio.preload = 'auto';
    audio.volume = 0;
    return audio;
}

function loadPreferences() {
    try {
        const vol = localStorage.getItem(STORAGE_VOLUME);
        if (vol !== null) {
            const parsed = parseFloat(vol);
            if (!Number.isNaN(parsed)) userVolume = Math.min(1, Math.max(0, parsed));
        }
        muted = localStorage.getItem(STORAGE_MUTED) === 'true';
    } catch {
        // ignore
    }
    syncSettingsControls();
}

function savePreferences() {
    try {
        localStorage.setItem(STORAGE_VOLUME, String(userVolume));
        localStorage.setItem(STORAGE_MUTED, String(muted));
    } catch {
        // ignore
    }
}

function syncSettingsControls() {
    const slider = document.getElementById('music-volume');
    const label = document.getElementById('music-volume-value');
    const muteBtn = document.getElementById('music-mute-btn');

    if (slider) slider.value = String(Math.round(userVolume * 100));
    if (label) label.textContent = `${Math.round(userVolume * 100)}%`;
    if (muteBtn) {
        muteBtn.textContent = muted ? 'Activar música' : 'Silenciar música';
        muteBtn.classList.toggle('btn-outline-danger', muted);
        muteBtn.classList.toggle('btn-outline-light', !muted);
    }
}

function bindSettingsUI() {
    if (settingsBound) return;
    settingsBound = true;

    const slider = document.getElementById('music-volume');
    const muteBtn = document.getElementById('music-mute-btn');

    slider?.addEventListener('input', () => {
        userVolume = Math.min(1, Math.max(0, Number(slider.value) / 100));
        syncSettingsControls();
        applyVolumeToActive();
        savePreferences();
    });

    muteBtn?.addEventListener('click', () => {
        muted = !muted;
        syncSettingsControls();
        applyVolumeToActive();
        savePreferences();
    });
}

function bindUnlockHandlers() {
    const unlock = () => {
        if (unlocked) return;
        unlocked = true;
        const scene = pendingScene || 'menu';
        crossfadeTo(scene);
    };

    document.addEventListener('pointerdown', unlock, { passive: true });
    document.addEventListener('keydown', unlock, { passive: true });
}

/**
 * Call after user interaction (welcome skip, etc.).
 */
export function unlockAudio() {
    if (unlocked) return;
    unlocked = true;
    crossfadeTo(pendingScene || 'menu');
}

function effectiveVolume() {
    if (muted) return 0;
    let v = userVolume;
    if (gamePaused) v *= PAUSE_DUCK;
    return Math.max(0, Math.min(1, v));
}

function applyVolumeToActive() {
    if (!activeScene || !audios) return;
    const audio = audios[activeScene];
    if (!audio || audio.paused) return;
    audio.volume = effectiveVolume();
}

function isScenePlaying(scene) {
    const audio = audios?.[scene];
    return !!(audio && !audio.paused && audio.currentTime > 0);
}

/**
 * @param {'menu'|'selection'|'battle'} scene
 */
function requestScene(scene) {
    initMusicManager();
    pendingScene = scene;

    if (!unlocked) return;

    if (activeScene === scene && isScenePlaying(scene)) return;

    crossfadeTo(scene);
}

function crossfadeTo(scene) {
    if (!audios) return;

    const token = ++fadeToken;
    const target = audios[scene];
    if (!target) return;

    const fromScene = activeScene;
    const fromAudio = fromScene ? audios[fromScene] : null;

    if (fromScene === scene && fromAudio && !fromAudio.paused) {
        applyVolumeToActive();
        return;
    }

    const run = async () => {
        if (fromAudio && fromScene !== scene) {
            await fadeAudio(fromAudio, fromAudio.volume, 0, FADE_MS, token);
            if (token !== fadeToken) return;
            fromAudio.pause();
            fromAudio.currentTime = 0;
            fromAudio.volume = 0;
        }

        if (token !== fadeToken) return;

        activeScene = scene;
        pendingScene = scene;

        try {
            if (target.paused) {
                target.currentTime = 0;
                await target.play();
            }
        } catch {
            return;
        }

        if (token !== fadeToken) return;

        const endVol = effectiveVolume();
        await fadeAudio(target, 0, endVol, FADE_MS, token);
        if (token !== fadeToken) return;
        target.volume = effectiveVolume();
    };

    run();
}

function fadeAudio(audio, fromVol, toVol, duration, token) {
    return new Promise(resolve => {
        const start = performance.now();

        const step = (now) => {
            if (token !== fadeToken) {
                resolve();
                return;
            }
            const t = Math.min(1, (now - start) / duration);
            const eased = t * t * (3 - 2 * t);
            audio.volume = fromVol + (toVol - fromVol) * eased;
            if (t < 1) {
                requestAnimationFrame(step);
            } else {
                audio.volume = toVol;
                resolve();
            }
        };

        requestAnimationFrame(step);
    });
}

/** Menu / intro / settings / scores / credits */
export function playMenuMusic() {
    requestScene('menu');
}

/** Ship placement & pre-battle setup */
export function playSelectionMusic() {
    requestScene('selection');
}

/** Active combat */
export function playBattleMusic() {
    requestScene('battle');
}

/** Lower volume while game is paused (does not stop track). */
export function setMusicPaused(duck) {
    gamePaused = !!duck;
    applyVolumeToActive();
}

/** Persist volume/mute from settings panel. */
export function persistMusicSettings() {
    savePreferences();
}

/**
 * Sync track from loaded game state.
 * @param {{ inMenu?: boolean, inBattle?: boolean }} state
 */
export function syncMusicFromGameState(state) {
    if (state.inMenu) playMenuMusic();
    else if (state.inBattle) playBattleMusic();
    else playSelectionMusic();
}

export function getMusicVolume() {
    return userVolume;
}

export function isMusicMuted() {
    return muted;
}
