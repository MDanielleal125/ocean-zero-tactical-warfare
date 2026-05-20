/**
 * shootingSystem.js
 * Handles shot validation and execution logic
 * These functions are imported by aiEasy.js
 */

/**
 * Validates if a shot is valid (cell hasn't been shot before)
 * @param {Array<Array<Object>>} matrix - Game board matrix
 * @param {number} row - Target row
 * @param {number} col - Target column
 * @returns {Object} { valid: boolean, message: string }
 */
export function validateShot(matrix, row, col) {
    if (row < 0 || row >= matrix.length || col < 0 || col >= matrix[0].length) {
        return { valid: false, message: 'Shot out of bounds' };
    }

    const cell = matrix[row][col];
    if (cell.state === 'hit' || cell.state === 'miss') {
        return { valid: false, message: 'Already shot at this location' };
    }

    return { valid: true, message: 'Valid shot' };
}

/**
 * Executes a shot on the board
 * @param {Array<Array<Object>>} matrix - Game board matrix
 * @param {number} row - Target row
 * @param {number} col - Target column
 * @returns {Object} { success: boolean, result: 'hit'|'miss', row: number, col: number }
 */
export function executeShot(matrix, row, col) {
    const validation = validateShot(matrix, row, col);
    if (!validation.valid) {
        return { success: false, message: validation.message };
    }

    const cell = matrix[row][col];
    const isHit = cell.state === 'ship';

    if (isHit) {
        cell.state = 'hit';
    } else {
        cell.state = 'miss';
    }

    return {
        success: true,
        result: isHit ? 'hit' : 'miss',
        row: row,
        col: col
    };
}
