import { BOARD_SIZE } from '../core/constants.js';
import { validateShot, executeShot } from '../combat/shootingSystem.js';
import { findShipAtPosition, applyDamageToShip, isShipSunk } from '../combat/damageSystem.js';

export class EasyAI {
    constructor() {
        this.shots = new Set();
        this.isTurnActive = false;
        this.turnDelay = 1000;
    }

    generateRandomShot() {
        let row, col;
        let attempts = 0;
        const maxAttempts = BOARD_SIZE * BOARD_SIZE;
        
        while (attempts < maxAttempts) {
            row = Math.floor(Math.random() * BOARD_SIZE);
            col = Math.floor(Math.random() * BOARD_SIZE);
            const shotKey = `${row},${col}`;
            
            if (!this.shots.has(shotKey)) {
                return { row, col };
            }
            
            attempts++;
        }
        
        return null;
    }

    takeShot(matrix, ships, onHit, onMiss, onSunk) {
        const shot = this.generateRandomShot();
        
        if (!shot) {
            return {
                success: false,
                message: 'No valid shots available'
            };
        }
        
        const { row, col } = shot;
        const shotKey = `${row},${col}`;
        this.shots.add(shotKey);
        
        const shotResult = executeShot(matrix, row, col);
        
        if (!shotResult.success) {
            return shotResult;
        }
        
        if (shotResult.result === 'hit') {
            const hitShip = findShipAtPosition(ships, row, col);
            if (hitShip) {
                applyDamageToShip(hitShip, row, col);
                if (isShipSunk(hitShip)) {
                    if (onSunk) onSunk(hitShip);
                }
            }
            if (onHit) onHit(shotResult);
        } else if (shotResult.result === 'miss') {
            if (onMiss) onMiss(shotResult);
        }
        
        return shotResult;
    }

    startTurn(matrix, ships, onHit, onMiss, onSunk, onTurnEnd) {
        this.isTurnActive = true;
        
        const executeTurn = () => {
            if (!this.isTurnActive) return;
            
            const shotResult = this.takeShot(matrix, ships, onHit, onMiss, onSunk);
            
            if (!shotResult.success) {
                this.isTurnActive = false;
                if (onTurnEnd) onTurnEnd();
                return;
            }
            
            if (shotResult.result === 'hit') {
                setTimeout(executeTurn, this.turnDelay);
            } else if (shotResult.result === 'miss') {
                this.isTurnActive = false;
                if (onTurnEnd) onTurnEnd();
            }
        };
        
        executeTurn();
    }

    stopTurn() {
        this.isTurnActive = false;
    }

    reset() {
        this.shots.clear();
        this.isTurnActive = false;
    }

    hasValidShots(matrix) {
        for (let row = 0; row < BOARD_SIZE; row++) {
            for (let col = 0; col < BOARD_SIZE; col++) {
                const shotKey = `${row},${col}`;
                if (!this.shots.has(shotKey)) {
                    const validation = validateShot(matrix, row, col);
                    if (validation.valid) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    setTurnDelay(delay) {
        this.turnDelay = delay;
    }
}
