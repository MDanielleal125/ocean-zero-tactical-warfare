import { SHIP_CONFIGS, ORIENTATIONS } from './constants.js';

export const gameState = {
    currentTurn: 'player',
    gameStarted: false,
    winner: null,
    
    playerMatrix: [],
    enemyMatrix: [],
    
    playerShips: [],
    enemyShips: [],
    
    selectedShip: null,
    selectedOrientation: ORIENTATIONS.HORIZONTAL,
    
    availableShips: {
        carrier: SHIP_CONFIGS.carrier.quantity,
        battleship: SHIP_CONFIGS.battleship.quantity,
        submarine: SHIP_CONFIGS.submarine.quantity,
        destroyer: SHIP_CONFIGS.destroyer.quantity
    }
};

export function setSelectedShip(shipType) {
    gameState.selectedShip = shipType;
}

export function getSelectedShip() {
    return gameState.selectedShip;
}

export function setSelectedOrientation(orientation) {
    gameState.selectedOrientation = orientation;
}

export function getSelectedOrientation() {
    return gameState.selectedOrientation;
}

export function decreaseShipCount(shipType) {
    if (gameState.availableShips[shipType] > 0) {
        gameState.availableShips[shipType]--;
        return true;
    }
    return false;
}

export function getAvailableShips() {
    return gameState.availableShips;
}

export function canPlaceShip(shipType) {
    return gameState.availableShips[shipType] > 0;
}
