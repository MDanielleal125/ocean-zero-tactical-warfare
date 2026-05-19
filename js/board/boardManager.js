import { BOARD_SIZE, CELL_STATES } from '../core/constants.js';
import { gameState } from '../core/gameState.js';

export function createEmptyMatrix() {
    const matrix = [];
    for (let row = 0; row < BOARD_SIZE; row++) {
        const rowArray = [];
        for (let col = 0; col < BOARD_SIZE; col++) {
            rowArray.push({
                row: row,
                col: col,
                state: CELL_STATES.EMPTY
            });
        }
        matrix.push(rowArray);
    }
    return matrix;
}

export function initializeBoards() {
    gameState.playerMatrix = createEmptyMatrix();
    gameState.enemyMatrix = createEmptyMatrix();
}

export function getCellState(matrix, row, col) {
    if (row < 0 || row >= BOARD_SIZE || col < 0 || col >= BOARD_SIZE) {
        return null;
    }
    return matrix[row][col].state;
}

export function setCellState(matrix, row, col, state) {
    if (row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE) {
        matrix[row][col].state = state;
    }
}

export function clearBoards() {
    gameState.playerMatrix = createEmptyMatrix();
    gameState.enemyMatrix = createEmptyMatrix();
    gameState.playerShips = [];
    gameState.enemyShips = [];
}
