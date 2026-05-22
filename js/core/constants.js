/**
 * Escenas del juego y sus pistas de musica asociadas.
 *
 * Para usar tus propios archivos de audio, coloca los .mp3/.ogg
 * en la carpeta assets/audio/ y actualiza las rutas aqui.
 */
const SCENES = {
    MENU: "menu",
    LOBBY: "lobby",
    BATTLE: "battle",
    VICTORY: "victory",
    DEFEAT: "defeat",
};

const SCENE_MUSIC = {
    [SCENES.MENU]: "assets/audio/menu-theme.mp3",
    [SCENES.LOBBY]: "assets/audio/lobby-theme.mp3",
    [SCENES.BATTLE]: "assets/audio/battle-theme.mp3",
    [SCENES.VICTORY]: "assets/audio/victory-theme.mp3",
    [SCENES.DEFEAT]: "assets/audio/defeat-theme.mp3",
};
