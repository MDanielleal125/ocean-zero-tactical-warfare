/**
 * domUtils.js
 * Reusable DOM utility functions shared across UI modules.
 * Responsible for: safe element querying, class manipulation, cell access.
 * Owner: J. Mena (feature/ui)
 */

/**
 * Returns a board cell element by its row, col, and board type.
 * @param {number} row - Row index (0-9)
 * @param {number} col - Column index (0-9)
 * @param {string} boardType - 'player' or 'pc'
 * @returns {HTMLElement|null} The cell element or null if not found
 */
export function getCell(row, col, boardType) {
    return document.getElementById(`${row},${col},${boardType}`);
}

/**
 * Safely queries a single DOM element without throwing if not found.
 * @param {string} selector - CSS selector string
 * @param {HTMLElement} [scope=document] - Optional scope element
 * @returns {HTMLElement|null}
 */
export function querySafeElement(selector, scope = document) {
    return scope.querySelector(selector) ?? null;
}

/**
 * Safely queries multiple DOM elements.
 * @param {string} selector - CSS selector string
 * @param {HTMLElement} [scope=document] - Optional scope element
 * @returns {NodeList}
 */
export function querySafeAll(selector, scope = document) {
    return scope.querySelectorAll(selector);
}

/**
 * Adds a CSS class to a board cell identified by coordinates.
 * @param {number} row - Row index
 * @param {number} col - Column index
 * @param {string} boardType - 'player' or 'pc'
 * @param {string} className - CSS class to add
 */
export function addCellClass(row, col, boardType, className) {
    const cell = getCell(row, col, boardType);
    if (cell) cell.classList.add(className);
}

/**
 * Removes a CSS class from a board cell identified by coordinates.
 * @param {number} row - Row index
 * @param {number} col - Column index
 * @param {string} boardType - 'player' or 'pc'
 * @param {string} className - CSS class to remove
 */
export function removeCellClass(row, col, boardType, className) {
    const cell = getCell(row, col, boardType);
    if (cell) cell.classList.remove(className);
}

/**
 * Sets the visual state of a cell by toggling the appropriate CSS class.
 * @param {number} row - Row index
 * @param {number} col - Column index
 * @param {string} boardType - 'player' or 'pc'
 * @param {string} state - 'ship' | 'hit' | 'miss' | 'empty'
 */
export function setCellState(row, col, boardType, state) {
    const cell = getCell(row, col, boardType);
    if (!cell) return;

    cell.classList.remove('selected', 'hit', 'miss', 'preview-valid', 'preview-invalid');

    const stateMap = {
        ship:  'selected',
        hit:   'hit',
        miss:  'miss'
    };

    if (stateMap[state]) cell.classList.add(stateMap[state]);
}

/**
 * Removes a list of CSS classes from all elements matching a selector.
 * @param {string} selector - CSS selector
 * @param {string[]} classNames - Array of class names to remove
 */
export function clearClassesFromAll(selector, classNames) {
    document.querySelectorAll(selector).forEach(el => {
        el.classList.remove(...classNames);
    });
}

/**
 * Creates a DOM element with optional className, id, and innerHTML.
 * @param {string} tag - HTML tag name
 * @param {Object} [options] - { className, id, innerHTML, textContent }
 * @returns {HTMLElement}
 */
export function createElement(tag, options = {}) {
    const el = document.createElement(tag);
    if (options.className)   el.className   = options.className;
    if (options.id)          el.id          = options.id;
    if (options.innerHTML)   el.innerHTML   = options.innerHTML;
    if (options.textContent) el.textContent = options.textContent;
    return el;
}

/**
 * Shows a DOM element by removing the 'hidden' attribute / display:none.
 * @param {string} elementId - The element's id
 */
export function showElement(elementId) {
    const el = document.getElementById(elementId);
    if (el) el.style.display = '';
}

/**
 * Hides a DOM element by setting display to none.
 * @param {string} elementId - The element's id
 */
export function hideElement(elementId) {
    const el = document.getElementById(elementId);
    if (el) el.style.display = 'none';
}
