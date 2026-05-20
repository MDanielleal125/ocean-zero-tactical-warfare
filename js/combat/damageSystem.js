import { CELL_STATES } from '../core/constants.js';

export function applyDamageToShip(ship, row, col) {
    if (!ship) {
        return {
            success: false,
            message: 'Ship not found'
        };
    }
    
    const positionIndex = ship.positions.findIndex(
        pos => pos.row === row && pos.col === col
    );
    
    if (positionIndex === -1) {
        return {
            success: false,
            message: 'Position not on ship'
        };
    }
    
    if (ship.health > 0) {
        ship.health--;
    }
    
    return {
        success: true,
        message: 'Damage applied',
        ship: ship,
        remainingHealth: ship.health
    };
}

export function isShipSunk(ship) {
    return ship.health <= 0;
}

export function findShipAtPosition(ships, row, col) {
    for (const ship of ships) {
        const position = ship.positions.find(
            pos => pos.row === row && pos.col === col
        );
        if (position) {
            return ship;
        }
    }
    return null;
}

export function getTotalShipsHealth(ships) {
    return ships.reduce((total, ship) => total + ship.health, 0);
}

export function getSunkShips(ships) {
    return ships.filter(ship => isShipSunk(ship));
}

export function getActiveShips(ships) {
    return ships.filter(ship => !isShipSunk(ship));
}

export function hasShipsRemaining(ships) {
    return ships.some(ship => ship.health > 0);
}
