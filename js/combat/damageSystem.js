/**
 * damageSystem.js
 * Handles ship damage tracking and sinking logic
 * These functions are imported by aiEasy.js
 */

/**
 * Finds a ship at a given position
 * @param {Array<Object>} ships - Array of ship objects
 * @param {number} row - Position row
 * @param {number} col - Position column
 * @returns {Object|null} Ship object if found, null otherwise
 */
export function findShipAtPosition(ships, row, col) {
    // Ships array structure would need to contain position data
    // For now, return null as placeholder
    return null;
}

/**
 * Applies damage to a ship at the given position
 * @param {Object} ship - Ship object to damage
 * @param {number} row - Damage position row
 * @param {number} col - Damage position column
 * @returns {Object} Updated ship object
 */
export function applyDamageToShip(ship, row, col) {
    if (!ship.damage) {
        ship.damage = [];
    }
    ship.damage.push({ row, col });
    return ship;
}

/**
 * Checks if a ship is sunk
 * @param {Object} ship - Ship object to check
 * @returns {boolean} True if ship is sunk
 */
export function isShipSunk(ship) {
    if (!ship.size || !ship.damage) {
        return false;
    }
    return ship.damage.length >= ship.size;
}
