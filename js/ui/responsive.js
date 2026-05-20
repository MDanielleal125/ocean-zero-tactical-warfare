/**
 * responsive.js
 * Handles responsive layout behavior for mobile, tablet, and desktop viewports.
 * Owner: J. Mena (feature/ui)
 */

import { refreshAllBoardShipSprites } from './shipSprites.js';

const BREAKPOINTS = {
    mobile: 576,
    tablet: 768,
    desktop: 1024
};

/** Extra pixels added to cell size via +/- zoom buttons (UX-018). */
let cellZoomBonus = 0;
const CELL_ZOOM_STEP = 4;
const CELL_ZOOM_MIN = -8;
const CELL_ZOOM_MAX = 20;

/**
 * Initializes responsive layout detection and attaches a resize listener.
 */
export function initResponsiveLayout() {
    applyLayoutForCurrentSize();
    window.addEventListener('resize', handleResizeEvent);
}

/**
 * Handles the window resize event and re-applies the correct layout.
 */
export function handleResizeEvent() {
    applyLayoutForCurrentSize();
}

/**
 * Determines the current viewport size and applies the matching layout.
 */
function applyLayoutForCurrentSize() {
    const width = window.innerWidth;

    if (width < BREAKPOINTS.tablet) {
        applyMobileLayout();
        document.body.dataset.layout = 'mobile';
    } else if (width < BREAKPOINTS.desktop) {
        applyTabletLayout();
        document.body.dataset.layout = 'tablet';
    } else {
        applyDesktopLayout();
        document.body.dataset.layout = 'desktop';
    }

    scaleBoardCells();
}

/**
 * Applies the mobile stacked layout (boards stacked vertically).
 */
export function applyMobileLayout() {
    const container = document.getElementById('boards-container');
    if (!container) return;
    container.classList.remove('layout--desktop', 'layout--tablet');
    container.classList.add('layout--mobile');
}

/**
 * Applies the tablet layout (boards side by side when space allows).
 */
function applyTabletLayout() {
    const container = document.getElementById('boards-container');
    if (!container) return;
    container.classList.remove('layout--desktop', 'layout--mobile');
    container.classList.add('layout--tablet');
}

/**
 * Applies the desktop layout (boards side by side, full-size cells).
 */
export function applyDesktopLayout() {
    const container = document.getElementById('boards-container');
    if (!container) return;
    container.classList.remove('layout--mobile', 'layout--tablet');
    container.classList.add('layout--desktop');
}

/**
 * Base cell size from viewport — keeps boards readable without overflow.
 * @returns {number} Cell size in pixels (used with --cell-size for board grid only)
 */
export function getCellSize() {
    const width = window.innerWidth;
    const boardsVisible = document.querySelector('.board-section--attack:not(.hidden)')
        ? 2
        : 1;
    const available = Math.min(width * 0.9, 520 * boardsVisible);
    const labelPad = 28;
    const gaps = 9 * 2;
    const fromWidth = Math.floor((available - labelPad - gaps) / 10);

    if (width < BREAKPOINTS.mobile) {
        return Math.min(34, Math.max(24, fromWidth));
    }
    if (width < BREAKPOINTS.tablet) {
        return Math.min(38, Math.max(28, fromWidth));
    }
    if (width < BREAKPOINTS.desktop) {
        return Math.min(42, Math.max(32, fromWidth));
    }
    return Math.min(48, Math.max(36, fromWidth));
}

/**
 * UX-018: Increases or decreases board cell size (reflows layout, no overlap).
 * @param {number} direction - 1 to zoom in, -1 to zoom out
 */
export function adjustCellZoom(direction) {
    cellZoomBonus = Math.min(
        CELL_ZOOM_MAX,
        Math.max(CELL_ZOOM_MIN, cellZoomBonus + direction * CELL_ZOOM_STEP)
    );
    scaleBoardCells();
}

/**
 * Resets manual zoom offset (e.g. new match).
 */
export function resetCellZoom() {
    cellZoomBonus = 0;
    scaleBoardCells();
}

/**
 * Applies dynamic cell sizes to all board cells via a CSS custom property.
 */
function scaleBoardCells() {
    const size = getCellSize() + cellZoomBonus;
    document.documentElement.style.setProperty('--cell-size', `${size}px`);
    document.documentElement.style.setProperty(
        '--label-size',
        `${Math.max(18, Math.round(size * 0.55))}px`
    );

    document.querySelectorAll('#board, #boardAttack').forEach(board => {
        board.style.transform = '';
    });

    refreshAllBoardShipSprites();
}

/**
 * Returns true if the current viewport is in mobile range.
 * @returns {boolean}
 */
export function isMobileViewport() {
    return window.innerWidth < BREAKPOINTS.tablet;
}
