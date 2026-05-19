import { BOARD_SIZE, CELL_STATES, ORIENTATIONS } from '../core/constants.js';

export function validateShipBounds(row, col, size, orientation) {
    if (orientation === ORIENTATIONS.HORIZONTAL) {
        return col + size <= BOARD_SIZE;
    } else if (orientation === ORIENTATIONS.VERTICAL) {
        return row + size <= BOARD_SIZE;
    }
    return false;
}

export function validateShipCollision(matrix, row, col, size, orientation) {
    if (orientation === ORIENTATIONS.HORIZONTAL) {
        for (let c = col; c < col + size; c++) {
            if (matrix[row][c].state !== CELL_STATES.EMPTY) {
                return false;
            }
        }
    } else if (orientation === ORIENTATIONS.VERTICAL) {
        for (let r = row; r < row + size; r++) {
            if (matrix[r][col].state !== CELL_STATES.EMPTY) {
                return false;
            }
        }
    }
    return true;
}

export function validateShipPlacement(matrix, row, col, size, orientation) {
    if (!validateShipBounds(row, col, size, orientation)) {
        return {
            valid: false,
            reason: 'Ship exceeds board boundaries'
        };
    }
    
    if (!validateShipCollision(matrix, row, col, size, orientation)) {
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
