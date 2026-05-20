import { CELL_STATES } from '../core/constants.js';

export function validateShot(matrix, row, col) {
    if (row < 0 || row >= matrix.length || col < 0 || col >= matrix[0].length) {
        return {
            valid: false,
            reason: 'Invalid coordinates'
        };
    }
    
    const cellState = matrix[row][col].state;
    
    if (cellState === CELL_STATES.HIT || cellState === CELL_STATES.MISS) {
        return {
            valid: false,
            reason: 'Cell already shot'
        };
    }
    
    return {
        valid: true,
        reason: 'Shot is valid'
    };
}

export function executeShot(matrix, row, col) {
    const validation = validateShot(matrix, row, col);
    
    if (!validation.valid) {
        return {
            success: false,
            message: validation.reason,
            result: null
        };
    }
    
    const cellState = matrix[row][col].state;
    let result;
    
    if (cellState === CELL_STATES.SHIP) {
        matrix[row][col].state = CELL_STATES.HIT;
        result = 'hit';
    } else if (cellState === CELL_STATES.EMPTY) {
        matrix[row][col].state = CELL_STATES.MISS;
        result = 'miss';
    } else {
        return {
            success: false,
            message: 'Invalid cell state',
            result: null
        };
    }
    
    return {
        success: true,
        message: `Shot resulted in ${result}`,
        result: result,
        row: row,
        col: col
    };
}

export function isCellAlreadyShot(matrix, row, col) {
    const cellState = matrix[row][col].state;
    return cellState === CELL_STATES.HIT || cellState === CELL_STATES.MISS;
}

export function getShotResult(matrix, row, col) {
    const cellState = matrix[row][col].state;
    
    if (cellState === CELL_STATES.HIT) {
        return 'hit';
    } else if (cellState === CELL_STATES.MISS) {
        return 'miss';
    } else if (cellState === CELL_STATES.SHIP) {
        return 'ship';
    } else {
        return 'empty';
    }
}
