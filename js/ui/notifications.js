/**
 * notifications.js
 * Displays in-game UI notifications replacing all alert() calls.
 * Responsible for: toast messages and winner/loser modal.
 * Owner: J. Mena (feature/ui)
 */

const NOTIFICATION_DURATION = 3000;

/**
 * Returns or creates the toast container element in the DOM.
 * @returns {HTMLElement} The notification container
 */
function getNotificationContainer() {
    let container = document.getElementById('notification-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'notification-container';
        document.body.appendChild(container);
    }
    return container;
}

/**
 * Returns an emoji icon for a given notification type.
 * @param {string} type - 'hit' | 'miss' | 'error' | 'info' | 'enemy-hit' | 'enemy-miss'
 * @returns {string} Emoji icon string
 */
function getNotificationIcon(type) {
    const icons = {
        hit: '💥',
        miss: '🌊',
        error: '⚠️',
        info: 'ℹ️',
        'enemy-hit': '🔥',
        'enemy-miss': '💨'
    };
    return icons[type] || 'ℹ️';
}

/**
 * Shows a toast notification that auto-dismisses after a timeout.
 * @param {string} message - The message to display
 * @param {string} type - Notification type: 'hit' | 'miss' | 'error' | 'info' | 'enemy-hit' | 'enemy-miss'
 */
export function showNotification(message, type = 'info') {
    const container = getNotificationContainer();

    const toast = document.createElement('div');
    toast.className = `notification notification--${type}`;
    toast.innerHTML = `
        <span class="notification__icon">${getNotificationIcon(type)}</span>
        <span class="notification__text">${message}</span>
    `;

    container.appendChild(toast);

    // Trigger enter animation
    requestAnimationFrame(() => {
        requestAnimationFrame(() => toast.classList.add('notification--visible'));
    });

    // Auto-dismiss
    setTimeout(() => {
        toast.classList.remove('notification--visible');
        setTimeout(() => toast.remove(), 350);
    }, NOTIFICATION_DURATION);
}

/**
 * Shows a HIT notification (player hits the enemy).
 * @param {string} message - Message to display
 */
export function showHitNotification(message) {
    showNotification(message, 'hit');
}

/**
 * Shows a MISS notification (player's shot hit water).
 * @param {string} message - Message to display
 */
export function showMissNotification(message) {
    showNotification(message, 'miss');
}

/**
 * Shows an ERROR notification (invalid action).
 * @param {string} message - Message to display
 */
export function showErrorNotification(message) {
    showNotification(message, 'error');
}

/**
 * Shows an INFO notification (general information).
 * @param {string} message - Message to display
 */
export function showInfoNotification(message) {
    showNotification(message, 'info');
}

/**
 * Shows a notification when the enemy hits the player.
 * @param {string} message - Message to display
 */
export function showEnemyHitNotification(message) {
    showNotification(message, 'enemy-hit');
}

/**
 * Shows a notification when the enemy misses.
 * @param {string} message - Message to display
 */
export function showEnemyMissNotification(message) {
    showNotification(message, 'enemy-miss');
}

/**
 * UX-011: Confirmation dialog before starting without all ships placed.
 * @param {string} message - Warning message
 * @returns {Promise<boolean>} Resolves true if user confirms
 */
export function showConfirmDialog(message) {
    return new Promise(resolve => {
        const overlay = document.createElement('div');
        overlay.className = 'confirm-modal';
        overlay.innerHTML = `
            <div class="confirm-modal__content">
                <p class="confirm-modal__message">${message}</p>
                <div class="confirm-modal__actions">
                    <button type="button" class="btn btn-secondary" id="confirm-cancel">Cancelar</button>
                    <button type="button" class="btn btn-primary" id="confirm-ok">Continuar</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);

        requestAnimationFrame(() => overlay.classList.add('confirm-modal--visible'));

        overlay.querySelector('#confirm-ok').addEventListener('click', () => {
            overlay.remove();
            resolve(true);
        });
        overlay.querySelector('#confirm-cancel').addEventListener('click', () => {
            overlay.remove();
            resolve(false);
        });
    });
}

/**
 * UX-006: Toast when a full ship is sunk.
 * @param {string} shipDisplayName - Localized ship name
 */
export function showSunkShipNotification(shipDisplayName) {
    showNotification(`¡Hundiste el ${shipDisplayName}!`, 'hit');
}

/**
 * Shows a full-screen end-game modal with stats (UX-009, UX-010).
 * @param {string} winner - 'player' or 'pc'
 * @param {Object} stats - { totalShots, hits, accuracy, elapsedSeconds }
 * @param {Function} onRestart - Called when user clicks Nueva partida
 */
export function showWinnerModal(winner, stats = {}, onRestart = null) {
    const existing = document.getElementById('winner-modal');
    if (existing) existing.remove();

    const isPlayerWinner = winner === 'player' || winner === 'player1' || winner === 'player2';
    const winnerName = winner === 'player1' ? 'Jugador 1' : winner === 'player2' ? 'Jugador 2' : winner === 'player' ? 'Tú' : 'PC';
    const minutes = String(Math.floor((stats.elapsedSeconds || 0) / 60)).padStart(2, '0');
    const seconds = String((stats.elapsedSeconds || 0) % 60).padStart(2, '0');

    const modal = document.createElement('div');
    modal.id = 'winner-modal';
    modal.className = 'winner-modal';

    modal.innerHTML = `
        <div class="winner-modal__content">
            <div class="winner-modal__icon">${isPlayerWinner ? '🏆' : '💀'}</div>
            <h2 class="winner-modal__title ${isPlayerWinner ? 'winner-modal__title--win' : 'winner-modal__title--loss'}">
                ${isPlayerWinner ? '¡VICTORIA!' : 'DERROTA'}
            </h2>
            <p class="winner-modal__message">
                ${isPlayerWinner ? `${winnerName} ganó la partida.` : `${winnerName} hundió tu flota.`}
            </p>
            <ul class="winner-modal__stats list-unstyled">
                <li>Disparos totales: <strong>${stats.totalShots ?? 0}</strong></li>
                <li>Impactos: <strong>${stats.hits ?? 0}</strong></li>
                <li>Precisión: <strong>${stats.accuracy ?? 0}%</strong></li>
                <li>Tiempo: <strong>${minutes}:${seconds}</strong></li>
            </ul>
            <button type="button" class="winner-modal__btn btn btn-primary" id="restart-btn">
                Nueva partida
            </button>
        </div>
    `;

    document.body.appendChild(modal);

    requestAnimationFrame(() => {
        requestAnimationFrame(() => modal.classList.add('winner-modal--visible'));
    });

    document.getElementById('restart-btn').addEventListener('click', () => {
        modal.remove();
        if (typeof onRestart === 'function') {
            onRestart();
        } else {
            location.reload();
        }
    });
}
