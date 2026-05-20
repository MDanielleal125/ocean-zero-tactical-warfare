import { BOARD_SIZE, AI_DIFFICULTY } from './constants.js';

export const GAME_CONFIG = Object.freeze({
    defaultBoardSize: BOARD_SIZE,
    aiTurnDelay: 1000,
    animationDuration: 300,
    notificationDuration: 3000,
    salvoLimit: 1
});

export const AI_CONFIG = Object.freeze({
    [AI_DIFFICULTY.EASY]: {
        turnDelay: 1000,
        hitContinuation: true,
        useHeatmap: false
    },
    [AI_DIFFICULTY.HARD]: {
        turnDelay: 800,
        hitContinuation: true,
        useHeatmap: true
    }
});

export const HEATMAP_CONFIG = Object.freeze({
    enabled: false,
    decayRate: 0.95,
    hitBonus: 2.0,
    adjacentBonus: 1.5,
    missPenalty: 0.5
});

export const ANIMATION_CONFIG = Object.freeze({
    hitDuration: 300,
    missDuration: 300,
    shipPlacementDuration: 200,
    fadeOutDuration: 500
});

export const SANDBOX_CONFIG = Object.freeze({
    enabled: false,
    revealEnemyShips: false,
    unlimitedShots: false,
    skipPlacement: false
});

export function getAIConfig(difficulty) {
    return AI_CONFIG[difficulty] || AI_CONFIG[AI_DIFFICULTY.EASY];
}

export function getTurnDelay(difficulty) {
    const config = getAIConfig(difficulty);
    return config.turnDelay;
}
