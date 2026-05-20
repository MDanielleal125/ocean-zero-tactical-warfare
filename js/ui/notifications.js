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
 * Shows a full-screen winner/loser modal with a restart button.
 * @param {string} winner - 'player' or 'pc'
 */
export function showWinnerModal(winner) {
    const existing = document.getElementById('winner-modal');
    if (existing) existing.remove();

    const isPlayerWinner = winner === 'player';

    const modal = document.createElement('div');
    modal.id = 'winner-modal';
    modal.className = 'winner-modal';

    modal.innerHTML = `
        <div class="winner-modal__content">
            <div class="winner-modal__icon">${isPlayerWinner ? '🏆' : '💀'}</div>
            <h2 class="winner-modal__title ${isPlayerWinner ? 'winner-modal__title--win' : 'winner-modal__title--loss'}">
                ${isPlayerWinner ? 'VICTORY!' : 'DEFEAT'}
            </h2>
            <p class="winner-modal__message">
                ${isPlayerWinner ? 'You destroyed the enemy fleet!' : 'Your fleet has been sunk!'}
            </p>
            <button class="winner-modal__btn" id="restart-btn">
                ⚓ Play Again
            </button>
        </div>
    `;

    document.body.appendChild(modal);

    requestAnimationFrame(() => {
        requestAnimationFrame(() => modal.classList.add('winner-modal--visible'));
    });

    document.getElementById('restart-btn').addEventListener('click', () => {
        location.reload();
    });
}
