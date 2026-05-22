/**
 * SceneManager - Gestiona las transiciones entre escenas
 * y sincroniza la musica automaticamente via AudioManager.
 */
const SceneManager = (() => {
    let currentScene = null;

    function changeScene(scene) {
        if (currentScene === scene) return;
        currentScene = scene;

        const track = SCENE_MUSIC[scene];
        if (track) {
            AudioManager.switchMusic(track);
        } else {
            AudioManager.stop();
        }
    }

    function getCurrentScene() {
        return currentScene;
    }

    return {
        changeScene,
        getCurrentScene,
    };
})();
