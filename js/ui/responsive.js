/**
 * responsive.js
 * Handles responsive layout behavior for mobile, tablet, and desktop viewports.
 * Responsible for: breakpoint detection, layout switching, cell size scaling.
 * Owner: J. Mena (feature/ui)
 */

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
 * Should be called once on game load.
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

    // UI-019: stack boards below 768px
    if (width < BREAKPOINTS.tablet) {
        applyMobileLayout();
    } else if (width < BREAKPOINTS.desktop) {
        applyTabletLayout();
    } else {
        applyDesktopLayout();
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
 * Applies the tablet layout (boards side by side, smaller cells).
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
 * Calculates the optimal cell size based on current viewport width.
 * @returns {number} Cell size in pixels
 */
export function getCellSize() {
    const width = window.innerWidth;
    if (width < BREAKPOINTS.mobile) return 26;
    if (width < BREAKPOINTS.tablet) return 30;
    return 38;
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

    document.querySelectorAll('#board, #boardAttack').forEach(board => {
        board.style.transform = '';
    });
}

/**
 * Returns true if the current viewport is in mobile range.
 * @returns {boolean}
 */
export function isMobileViewport() {
    return window.innerWidth < BREAKPOINTS.tablet;
}
