export const BOARD_SIZE = 10;

export const CELL_STATES = Object.freeze({
    EMPTY: 'empty',
    SHIP: 'ship',
    HIT: 'hit',
    MISS: 'miss'
});

export const SHIP_TYPES = Object.freeze({
    CARRIER: 'carrier',
    BATTLESHIP: 'battleship',
    SUBMARINE: 'submarine',
    DESTROYER: 'destroyer'
});

export const SHIP_SIZES = Object.freeze({
    [SHIP_TYPES.CARRIER]: 5,
    [SHIP_TYPES.BATTLESHIP]: 4,
    [SHIP_TYPES.SUBMARINE]: 3,
    [SHIP_TYPES.DESTROYER]: 2
});

export const GAME_STATES = Object.freeze({
    SETUP: 'setup',
    PLAYING: 'playing',
    PAUSED: 'paused',
    GAME_OVER: 'gameOver'
});

export const PLAYER_TYPES = Object.freeze({
    PLAYER: 'player',
    ENEMY: 'enemy'
});

export const ORIENTATIONS = Object.freeze({
    HORIZONTAL: 'horizontal',
    VERTICAL: 'vertical'
});

export const AI_DIFFICULTY = Object.freeze({
    EASY: 'easy',
    HARD: 'hard'
});

export const GAME_MODES = Object.freeze({
    STANDARD: 'standard',
    SANDBOX: 'sandbox'
});

export const GAME_STATUS = Object.freeze({
    NOT_STARTED: 'notStarted',
    IN_PROGRESS: 'inProgress',
    COMPLETED: 'completed'
});
