import { BOARD_SIZE, CELL_STATES, ORIENTATIONS } from '../core/constants.js';

export function validateHorizontalBounds(row, col, size) {
    return col + size <= BOARD_SIZE && row >= 0 && row < BOARD_SIZE;
}

export function validateVerticalBounds(row, col, size) {
    return row + size <= BOARD_SIZE && col >= 0 && col < BOARD_SIZE;
}

export function validateShipBounds(row, col, size, orientation) {
    if (orientation === ORIENTATIONS.HORIZONTAL) {
        return validateHorizontalBounds(row, col, size);
    } else if (orientation === ORIENTATIONS.VERTICAL) {
        return validateVerticalBounds(row, col, size);
    }
    return false;
}

export function validateHorizontalCollision(matrix, row, col, size) {
    for (let c = col; c < col + size; c++) {
        if (matrix[row][c].state !== CELL_STATES.EMPTY) {
            return false;
        }
    }
    return true;
}

export function validateVerticalCollision(matrix, row, col, size) {
    for (let r = row; r < row + size; r++) {
        if (matrix[r][col].state !== CELL_STATES.EMPTY) {
            return false;
        }
    }
    return true;
}

export function validateShipCollision(matrix, row, col, size, orientation) {
    if (orientation === ORIENTATIONS.HORIZONTAL) {
        return validateHorizontalCollision(matrix, row, col, size);
    } else if (orientation === ORIENTATIONS.VERTICAL) {
        return validateVerticalCollision(matrix, row, col, size);
    }
    return false;
}

export function validateEdgePlacement(row, col, size, orientation) {
    if (orientation === ORIENTATIONS.HORIZONTAL) {
        if (col === 0 || col + size === BOARD_SIZE) {
            return true;
        }
    } else if (orientation === ORIENTATIONS.VERTICAL) {
        if (row === 0 || row + size === BOARD_SIZE) {
            return true;
        }
    }
    return false;
}

export function validateShipPlacement(matrix, row, col, size, orientation) {
    const boundsValidation = validateShipBounds(row, col, size, orientation);
    if (!boundsValidation) {
        return {
            valid: false,
            reason: 'Ship exceeds board boundaries'
        };
    }
    
    const collisionValidation = validateShipCollision(matrix, row, col, size, orientation);
    if (!collisionValidation) {
        return {
            valid: false,
            reason: 'Ship overlaps with another ship'
        };
    }
    
    return {
        valid: true,
        reason: 'Placement is valid'
    };
}

export function validateCellBounds(row, col) {
    return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;
}

export function validateCellState(matrix, row, col, expectedState) {
    if (!validateCellBounds(row, col)) {
        return false;
    }
    return matrix[row][col].state === expectedState;
}
