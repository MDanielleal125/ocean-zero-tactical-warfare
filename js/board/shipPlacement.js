import { SHIP_CONFIGS, CELL_STATES, ORIENTATIONS } from '../core/constants.js';
import { gameState, setSelectedShip, getSelectedShip, setSelectedOrientation, getSelectedOrientation, decreaseShipCount, canPlaceShip } from '../core/gameState.js';
import { validateShipPlacement } from './collisionValidator.js';
import { setCellState } from './boardManager.js';

export function selectShip(shipType) {
    if (canPlaceShip(shipType)) {
        setSelectedShip(shipType);
        return {
            success: true,
            message: `${shipType} selected`
        };
    }
    return {
        success: false,
        message: `No ${shipType} available to place`
    };
}

export function setOrientation(orientation) {
    if (orientation === ORIENTATIONS.HORIZONTAL || orientation === ORIENTATIONS.VERTICAL) {
        setSelectedOrientation(orientation);
        return {
            success: true,
            message: `Orientation set to ${orientation}`
        };
    }
    return {
        success: false,
        message: 'Invalid orientation'
    };
}

export function placeShip(row, col) {
    const selectedShip = getSelectedShip();
    const orientation = getSelectedOrientation();
    
    if (!selectedShip) {
        return {
            success: false,
            message: 'No ship selected'
        };
    }
    
    if (!canPlaceShip(selectedShip)) {
        return {
            success: false,
            message: `No ${selectedShip} available to place`
        };
    }
    
    const shipConfig = SHIP_CONFIGS[selectedShip];
    const size = shipConfig.size;
    
    const validation = validateShipPlacement(gameState.playerMatrix, row, col, size, orientation);
    
    if (!validation.valid) {
        return {
            success: false,
            message: validation.reason
        };
    }
    
    const positions = [];
    
    if (orientation === ORIENTATIONS.HORIZONTAL) {
        for (let c = col; c < col + size; c++) {
            setCellState(gameState.playerMatrix, row, c, CELL_STATES.SHIP);
            positions.push({ row: row, col: c });
        }
    } else if (orientation === ORIENTATIONS.VERTICAL) {
        for (let r = row; r < row + size; r++) {
            setCellState(gameState.playerMatrix, r, col, CELL_STATES.SHIP);
            positions.push({ row: r, col: col });
        }
    }
    
    const ship = {
        id: `${selectedShip}-${gameState.playerShips.length + 1}`,
        type: selectedShip,
        size: size,
        health: size,
        direction: orientation,
        positions: positions
    };
    
    gameState.playerShips.push(ship);
    decreaseShipCount(selectedShip);
    
    return {
        success: true,
        message: `${selectedShip} placed successfully`,
        ship: ship
    };
}

export function getShipPositions(shipType, row, col, orientation) {
    const size = SHIP_CONFIGS[shipType].size;
    const positions = [];
    
    if (orientation === ORIENTATIONS.HORIZONTAL) {
        for (let c = col; c < col + size; c++) {
            positions.push({ row: row, col: c });
        }
    } else if (orientation === ORIENTATIONS.VERTICAL) {
        for (let r = row; r < row + size; r++) {
            positions.push({ row: r, col: col });
        }
    }
    
    return positions;
}
