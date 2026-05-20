import { PLAYER_TYPES, AI_DIFFICULTY, GAME_MODES, GAME_STATUS } from './constants.js';

let gameState = {
    currentTurn: PLAYER_TYPES.PLAYER,
    gameStarted: false,
    gameOver: false,
    selectedShip: null,
    selectedOrientation: null,
    playerMatrix: [],
    enemyMatrix: [],
    playerShips: [],
    enemyShips: [],
    hitCounters: {
        player: 0,
        enemy: 0
    },
    missCounters: {
        player: 0,
        enemy: 0
    },
    aiDifficulty: AI_DIFFICULTY.EASY,
    gameMode: GAME_MODES.STANDARD,
    gameStatus: GAME_STATUS.NOT_STARTED,
    winner: null
};

export function getGameState() {
    return { ...gameState };
}

export function updateGameState(updates) {
    gameState = { ...gameState, ...updates };
    return gameState;
}

export function resetGameState() {
    gameState = {
        currentTurn: PLAYER_TYPES.PLAYER,
        gameStarted: false,
        gameOver: false,
        selectedShip: null,
        selectedOrientation: null,
        playerMatrix: [],
        enemyMatrix: [],
        playerShips: [],
        enemyShips: [],
        hitCounters: {
            player: 0,
            enemy: 0
        },
        missCounters: {
            player: 0,
            enemy: 0
        },
        aiDifficulty: AI_DIFFICULTY.EASY,
        gameMode: GAME_MODES.STANDARD,
        gameStatus: GAME_STATUS.NOT_STARTED,
        winner: null
    };
    return gameState;
}

export function getCurrentTurn() {
    return gameState.currentTurn;
}

export function setCurrentTurn(turn) {
    gameState.currentTurn = turn;
    return gameState.currentTurn;
}

export function isGameStarted() {
    return gameState.gameStarted;
}

export function setGameStarted(started) {
    gameState.gameStarted = started;
    gameState.gameStatus = started ? GAME_STATUS.IN_PROGRESS : GAME_STATUS.NOT_STARTED;
    return gameState.gameStarted;
}

export function isGameOver() {
    return gameState.gameOver;
}

export function setGameOver(over) {
    gameState.gameOver = over;
    gameState.gameStatus = over ? GAME_STATUS.COMPLETED : GAME_STATUS.IN_PROGRESS;
    return gameState.gameOver;
}

export function getSelectedShip() {
    return gameState.selectedShip;
}

export function setSelectedShip(ship) {
    gameState.selectedShip = ship;
    return gameState.selectedShip;
}

export function getSelectedOrientation() {
    return gameState.selectedOrientation;
}

export function setSelectedOrientation(orientation) {
    gameState.selectedOrientation = orientation;
    return gameState.selectedOrientation;
}

export function getPlayerMatrix() {
    return gameState.playerMatrix;
}

export function setPlayerMatrix(matrix) {
    gameState.playerMatrix = matrix;
    return gameState.playerMatrix;
}

export function getEnemyMatrix() {
    return gameState.enemyMatrix;
}

export function setEnemyMatrix(matrix) {
    gameState.enemyMatrix = matrix;
    return gameState.enemyMatrix;
}

export function getPlayerShips() {
    return gameState.playerShips;
}

export function setPlayerShips(ships) {
    gameState.playerShips = ships;
    return gameState.playerShips;
}

export function getEnemyShips() {
    return gameState.enemyShips;
}

export function setEnemyShips(ships) {
    gameState.enemyShips = ships;
    return gameState.enemyShips;
}

export function incrementHitCounter(player) {
    gameState.hitCounters[player]++;
    return gameState.hitCounters[player];
}

export function incrementMissCounter(player) {
    gameState.missCounters[player]++;
    return gameState.missCounters[player];
}

export function getHitCounters() {
    return { ...gameState.hitCounters };
}

export function getMissCounters() {
    return { ...gameState.missCounters };
}

export function getAIDifficulty() {
    return gameState.aiDifficulty;
}

export function setAIDifficulty(difficulty) {
    gameState.aiDifficulty = difficulty;
    return gameState.aiDifficulty;
}

export function getGameMode() {
    return gameState.gameMode;
}

export function setGameMode(mode) {
    gameState.gameMode = mode;
    return gameState.gameMode;
}

export function getWinner() {
    return gameState.winner;
}

export function setWinner(winner) {
    gameState.winner = winner;
    return gameState.winner;
}

export function getGameStatus() {
    return gameState.gameStatus;
}

export function setGameStatus(status) {
    gameState.gameStatus = status;
    return gameState.gameStatus;
}
