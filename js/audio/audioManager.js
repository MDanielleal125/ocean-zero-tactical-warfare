/**
 * AudioManager - Singleton global para gestionar la musica entre escenas.
 *
 * Uso:
 *   AudioManager.switchMusic("assets/audio/menu.mp3");
 *   AudioManager.stop();
 *   AudioManager.setVolume(0.5);
 */
const AudioManager = (() => {
    let currentAudio = null;
    let currentTrack = null;
    let volume = 0.5;

    function stop() {
        if (currentAudio) {
            currentAudio.pause();
            currentAudio.currentTime = 0;
            currentAudio = null;
            currentTrack = null;
        }
    }

    function play(track) {
        if (!track) return;
        if (currentTrack === track && currentAudio && !currentAudio.paused) return;

        stop();

        currentAudio = new Audio(track);
        currentAudio.loop = true;
        currentAudio.volume = volume;
        currentTrack = track;

        currentAudio.play().catch((err) => {
            console.warn("AudioManager: no se pudo reproducir:", err.message);
        });
    }

    function switchMusic(track) {
        if (currentTrack === track) return;
        play(track);
    }

    function pause() {
        if (currentAudio && !currentAudio.paused) {
            currentAudio.pause();
        }
    }

    function resume() {
        if (currentAudio && currentAudio.paused && currentTrack) {
            currentAudio.play().catch((err) => {
                console.warn("AudioManager: no se pudo reanudar:", err.message);
            });
        }
    }

    function setVolume(v) {
        volume = Math.max(0, Math.min(1, v));
        if (currentAudio) {
            currentAudio.volume = volume;
        }
    }

    function getVolume() {
        return volume;
    }

    function isPlaying() {
        return currentAudio !== null && !currentAudio.paused;
    }

    function getCurrentTrack() {
        return currentTrack;
    }

    return {
        play,
        stop,
        switchMusic,
        pause,
        resume,
        setVolume,
        getVolume,
        isPlaying,
        getCurrentTrack,
    };
})();
