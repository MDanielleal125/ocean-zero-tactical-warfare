import { CELL_STATES } from '../core/constants.js';
import { hasShipsRemaining } from './damageSystem.js';

export function checkWinner(playerShips, enemyShips) {
    const playerHasShips = hasShipsRemaining(playerShips);
    const enemyHasShips = hasShipsRemaining(enemyShips);
    
    if (!playerHasShips && !enemyHasShips) {
        return {
            winner: null,
            gameOver: true,
            reason: 'Draw - both fleets destroyed'
        };
    }
    
    if (!playerHasShips) {
        return {
            winner: 'enemy',
            gameOver: true,
            reason: 'Enemy wins - all player ships destroyed'
        };
    }
    
    if (!enemyHasShips) {
        return {
            winner: 'player',
            gameOver: true,
            reason: 'Player wins - all enemy ships destroyed'
        };
    }
    
    return {
        winner: null,
        gameOver: false,
        reason: 'Game continues'
    };
}

export function checkMatrixVictory(matrix) {
    for (let row = 0; row < matrix.length; row++) {
        for (let col = 0; col < matrix[row].length; col++) {
            if (matrix[row][col].state === CELL_STATES.SHIP) {
                return false;
            }
        }
    }
    return true;
}

export function isGameOver(playerShips, enemyShips) {
    const result = checkWinner(playerShips, enemyShips);
    return result.gameOver;
}

export function getVictoryMessage(winner) {
    if (winner === 'player') {
        return 'YOU WIN!!!';
    } else if (winner === 'enemy') {
        return 'PC WINS!';
    } else {
        return 'Game continues';
    }
}
