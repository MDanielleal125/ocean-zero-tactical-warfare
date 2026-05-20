/**
 * renderBoard.js
 * Handles all DOM rendering for game boards and ship selectors.
 * Responsible for: board grid creation, cell state updates, ship selector UI, turn indicator.
 * Owner: J. Mena (feature/ui)
 */

const BOARD_SIZE = 10;
const COL_LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];

/**
 * Renders a 10x10 interactive grid board inside the given container.
 * Adds column and row labels for readability.
 * @param {HTMLElement} boardElement - The container element for the board
 * @param {string} boardType - 'player' or 'pc'
 * @param {Function} clickHandler - Click handler attached to each cell
 * @returns {Array<Array<string>>} Initialized empty 2D matrix
 */
export function renderBoard(boardElement, boardType, clickHandler) {
    boardElement.innerHTML = '';
    boardElement.classList.add('game-board', `game-board--${boardType}`);

    renderColumnLabels(boardElement);

    const matrix = [];

    for (let i = 0; i < BOARD_SIZE; i++) {
        const row = [];
        const rowElement = document.createElement('div');
        rowElement.className = 'board-row';

        // Row number label (1–10)
        const rowLabel = document.createElement('span');
        rowLabel.className = 'board-label board-label--row';
        rowLabel.textContent = i + 1;
        rowElement.appendChild(rowLabel);

        for (let j = 0; j < BOARD_SIZE; j++) {
            const cell = document.createElement('div');
            cell.className = 'board-cell grid';
            cell.id = `${i},${j},${boardType}`;
            cell.dataset.row = i;
            cell.dataset.col = j;
            cell.dataset.board = boardType;

            if (clickHandler) {
                cell.addEventListener('click', clickHandler);
            }

            rowElement.appendChild(cell);
            row.push('');
        }

        boardElement.appendChild(rowElement);
        matrix.push(row);
    }

    return matrix;
}

/**
 * Renders A–J column header labels above the board grid.
 * @param {HTMLElement} boardElement - The board container
 */
function renderColumnLabels(boardElement) {
    const labelsRow = document.createElement('div');
    labelsRow.className = 'board-labels-row';

    // Empty corner cell to align with row labels
    const corner = document.createElement('span');
    corner.className = 'board-label board-label--corner';
    labelsRow.appendChild(corner);

    COL_LABELS.forEach(letter => {
        const label = document.createElement('span');
        label.className = 'board-label board-label--col';
        label.textContent = letter;
        labelsRow.appendChild(label);
    });

    boardElement.appendChild(labelsRow);
}

/**
 * Updates a single cell's visual CSS classes based on its game state.
 * @param {number} row - Row index
 * @param {number} col - Column index
 * @param {string} boardType - 'player' or 'pc'
 * @param {string} state - 'ship' | 'hit' | 'miss' | 'empty'
 */
export function updateCellState(row, col, boardType, state) {
    const cell = document.getElementById(`${row},${col},${boardType}`);
    if (!cell) return;

    cell.classList.remove('selected', 'hit', 'miss');

    if (state === 'ship') cell.classList.add('selected');
    else if (state === 'hit') cell.classList.add('hit');
    else if (state === 'miss') cell.classList.add('miss');
}

/**
 * Renders the ship selector panel with horizontal/vertical placement buttons.
 * @param {Array<Object>} ships - Array of ship objects with type, size, quantity
 * @param {Function} onSelectShip - Callback(shipIndex, orientation) when a button is clicked
 */
export function renderShipSelectors(ships, onSelectShip) {
    const container = document.getElementById('ships');
    if (!container) return;

    container.innerHTML = '';

    ships.forEach((ship, index) => {
        const card = document.createElement('div');
        card.className = 'ship-card';
        card.id = `ship-card-${index}`;

        // Visual block preview of ship size
        const preview = buildShipPreview(ship.size);

        // Ship info text
        const info = document.createElement('div');
        info.className = 'ship-card__info';
        info.innerHTML = `
            <span class="ship-card__name">${getShipDisplayName(ship.type)}</span>
            <span class="ship-card__detail">
                Size: ${ship.size} &nbsp;|&nbsp;
                Left: <strong id="ship-qty-${index}">${ship.quantity}</strong>
            </span>
        `;

        // Placement buttons
        const btnGroup = document.createElement('div');
        btnGroup.className = 'ship-card__actions';

        const horizontalBtn = document.createElement('button');
        horizontalBtn.className = 'ship-btn';
        horizontalBtn.id = `ship-h-${index}`;
        horizontalBtn.title = 'Place Horizontal';
        horizontalBtn.innerHTML = '↔ H';
        horizontalBtn.addEventListener('click', () => onSelectShip(index, 'horizontal'));

        const verticalBtn = document.createElement('button');
        verticalBtn.className = 'ship-btn';
        verticalBtn.id = `ship-v-${index}`;
        verticalBtn.title = 'Place Vertical';
        verticalBtn.innerHTML = '↕ V';
        verticalBtn.addEventListener('click', () => onSelectShip(index, 'vertical'));

        btnGroup.appendChild(horizontalBtn);
        btnGroup.appendChild(verticalBtn);

        card.appendChild(preview);
        card.appendChild(info);
        card.appendChild(btnGroup);

        if (ship.quantity === 0) card.classList.add('ship-card--depleted');

        container.appendChild(card);
    });
}

/**
 * Builds a small visual preview of a ship using block divs.
 * @param {number} size - Number of blocks to render
 * @returns {HTMLElement} The preview element
 */
function buildShipPreview(size) {
    const preview = document.createElement('div');
    preview.className = 'ship-preview';

    for (let i = 0; i < size; i++) {
        const block = document.createElement('div');
        block.className = 'ship-preview__block';
        preview.appendChild(block);
    }

    return preview;
}

/**
 * Updates the remaining quantity display for a ship card.
 * Marks the card as depleted if quantity reaches zero.
 * @param {number} shipIndex - Index of the ship
 * @param {number} quantity - New remaining quantity
 */
export function updateShipQuantityDisplay(shipIndex, quantity) {
    const qtyEl = document.getElementById(`ship-qty-${shipIndex}`);
    if (qtyEl) qtyEl.textContent = quantity;

    const card = document.getElementById(`ship-card-${shipIndex}`);
    if (card) card.classList.toggle('ship-card--depleted', quantity === 0);
}

/**
 * Marks a ship placement button as the active selection.
 * @param {number} shipIndex - Index of the selected ship
 * @param {string} orientation - 'horizontal' or 'vertical'
 */
export function highlightSelectedShipButton(shipIndex, orientation) {
    document.querySelectorAll('.ship-btn').forEach(btn => btn.classList.remove('ship-btn--active'));
    const btnId = orientation === 'horizontal' ? `ship-h-${shipIndex}` : `ship-v-${shipIndex}`;
    const btn = document.getElementById(btnId);
    if (btn) btn.classList.add('ship-btn--active');
}

/**
 * Updates the turn indicator element to reflect the current turn.
 * @param {string} currentTurn - 'player' or 'pc'
 */
export function renderTurnIndicator(currentTurn) {
    const indicator = document.getElementById('turn-indicator');
    if (!indicator) return;

    indicator.textContent = currentTurn === 'player' ? '⚓ Your Turn — Fire!' : '🤖 Enemy Targeting...';
    indicator.className = `turn-indicator turn-indicator--${currentTurn}`;
}

/**
 * Returns the human-readable name of a ship type.
 * @param {string} type - Ship type key (e.g. 'carrier')
 * @returns {string} Display name
 */
function getShipDisplayName(type) {
    const names = {
        carrier: 'Carrier',
        battleship: 'Battleship',
        submarine: 'Submarine',
        destroyer: 'Destroyer'
    };
    return names[type] || type;
}
