import { BOARD_SIZE } from '../core/constants.js';
import { validateShot } from '../combat/shootingSystem.js';

export function generateRandomCoordinates() {
    const row = Math.floor(Math.random() * BOARD_SIZE);
    const col = Math.floor(Math.random() * BOARD_SIZE);
    return { row, col };
}

export function isValidShot(matrix, row, col) {
    const validation = validateShot(matrix, row, col);
    return validation.valid;
}

export function getUnshotCells(matrix, shotHistory) {
    const unshotCells = [];
    
    for (let row = 0; row < BOARD_SIZE; row++) {
        for (let col = 0; col < BOARD_SIZE; col++) {
            const shotKey = `${row},${col}`;
            if (!shotHistory.has(shotKey)) {
                if (isValidShot(matrix, row, col)) {
                    unshotCells.push({ row, col });
                }
            }
        }
    }
    
    return unshotCells;
}

export function getRandomUnshotCell(matrix, shotHistory) {
    const unshotCells = getUnshotCells(matrix, shotHistory);
    
    if (unshotCells.length === 0) {
        return null;
    }
    
    const randomIndex = Math.floor(Math.random() * unshotCells.length);
    return unshotCells[randomIndex];
}

export function createShotKey(row, col) {
    return `${row},${col}`;
}

export function parseShotKey(shotKey) {
    const [row, col] = shotKey.split(',').map(Number);
    return { row, col };
}

export function isCellInBounds(row, col) {
    return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;
}

export function getAdjacentCells(row, col) {
    const adjacent = [];
    const directions = [
        { row: -1, col: 0 },
        { row: 1, col: 0 },
        { row: 0, col: -1 },
        { row: 0, col: 1 }
    ];
    
    for (const direction of directions) {
        const newRow = row + direction.row;
        const newCol = col + direction.col;
        
        if (isCellInBounds(newRow, newCol)) {
            adjacent.push({ row: newRow, col: newCol });
        }
    }
    
    return adjacent;
}

export function filterShotCells(cells, shotHistory) {
    return cells.filter(cell => {
        const shotKey = createShotKey(cell.row, cell.col);
        return !shotHistory.has(shotKey);
    });
}

export function countRemainingShips(ships) {
    return ships.filter(ship => ship.health > 0).length;
}

export function getTotalShipHealth(ships) {
    return ships.reduce((total, ship) => total + ship.health, 0);
}
