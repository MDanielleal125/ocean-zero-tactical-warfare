/**
 * animations.js
 * Handles visual animations triggered by game events.
 * Responsible for: hit, miss, placement, game-start, and turn-change animations.
 * Owner: J. Mena (feature/ui)
 */

/**
 * Plays the explosion animation on a cell that was hit.
 * @param {number} row - Row index of the cell
 * @param {number} col - Column index of the cell
 * @param {string} boardType - 'player' or 'pc'
 */
export function animateCellHit(row, col, boardType) {
    const cell = document.getElementById(`${row},${col},${boardType}`);
    if (!cell) return;

    cell.classList.add('cell-anim--hit-burst');
    setTimeout(() => cell.classList.remove('cell-anim--hit-burst'), 600);
}

/**
 * Plays the water-splash animation on a cell that was missed.
 * @param {number} row - Row index of the cell
 * @param {number} col - Column index of the cell
 * @param {string} boardType - 'player' or 'pc'
 */
export function animateCellMiss(row, col, boardType) {
    const cell = document.getElementById(`${row},${col},${boardType}`);
    if (!cell) return;

    cell.classList.add('cell-anim--miss-splash');
    setTimeout(() => cell.classList.remove('cell-anim--miss-splash'), 700);
}

/**
 * Plays a pulse animation on newly placed ship cells.
 * @param {Array<{row: number, col: number}>} cells - Array of cell positions
 * @param {string} boardType - 'player' or 'pc'
 */
export function animateShipPlacement(cells, boardType) {
    if (!cells || !cells.length) return;

    cells.forEach((pos, index) => {
        const cell = document.getElementById(`${pos.row},${pos.col},${boardType}`);
        if (!cell) return;

        setTimeout(() => {
            cell.classList.add('cell-anim--place');
            setTimeout(() => cell.classList.remove('cell-anim--place'), 500);
        }, index * 60);
    });
}

/**
 * Plays a slide-in animation on the game boards when the game starts.
 */
export function animateGameStart() {
    const boards = document.querySelectorAll('.game-board');
    boards.forEach((board, index) => {
        board.style.opacity = '0';
        board.style.transform = 'translateY(30px)';

        setTimeout(() => {
            board.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
            board.style.opacity = '1';
            board.style.transform = 'translateY(0)';
        }, index * 200);
    });
}

/**
 * Plays a flash animation on the turn indicator when the turn changes.
 * @param {string} currentTurn - 'player' or 'pc'
 */
export function animateTurnChange(currentTurn) {
    const indicator = document.getElementById('turn-indicator');
    if (!indicator) return;

    indicator.classList.remove('turn-anim--flash');

    // Force reflow to restart animation
    void indicator.offsetWidth;

    indicator.classList.add('turn-anim--flash');
    setTimeout(() => indicator.classList.remove('turn-anim--flash'), 600);
}

/**
 * Plays a shake animation on a cell when an invalid action is attempted.
 * @param {number} row - Row index
 * @param {number} col - Column index
 * @param {string} boardType - 'player' or 'pc'
 */
export function animateInvalidCell(row, col, boardType) {
    const cell = document.getElementById(`${row},${col},${boardType}`);
    if (!cell) return;

    cell.classList.add('cell-anim--shake');
    setTimeout(() => cell.classList.remove('cell-anim--shake'), 400);
}

/**
 * Plays the victory or defeat screen animation.
 * @param {string} winner - 'player' or 'pc'
 */
export function animateGameEnd(winner) {
    const modal = document.getElementById('winner-modal');
    if (!modal) return;

    const content = modal.querySelector('.winner-modal__content');
    if (!content) return;

    content.classList.add(
        winner === 'player' ? 'modal-anim--victory' : 'modal-anim--defeat'
    );
}
