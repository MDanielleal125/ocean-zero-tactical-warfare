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

    if (width < BREAKPOINTS.mobile) {
        applyMobileLayout();
    } else if (width < BREAKPOINTS.tablet) {
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
 * Applies dynamic cell sizes to all board cells via a CSS custom property.
 */
function scaleBoardCells() {
    const size = getCellSize();
    document.documentElement.style.setProperty('--cell-size', `${size}px`);
}

/**
 * Returns true if the current viewport is in mobile range.
 * @returns {boolean}
 */
export function isMobileViewport() {
    return window.innerWidth < BREAKPOINTS.mobile;
}
