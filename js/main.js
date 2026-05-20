/**
 * main.js
 * Entry point. Orchestrates game flow using modular classes.
 * Imports UI modules (notifications, animations, renderBoard, responsive).
 * Owner: Daniel (core logic) — UI hooks added by J. Mena (feature/ui)
 */

import {
    showHitNotification,
    showMissNotification,
    showErrorNotification,
    showInfoNotification,
    showEnemyHitNotification,
    showEnemyMissNotification,
    showWinnerModal
} from './ui/notifications.js';

import {
    animateCellHit,
    animateCellMiss,
    animateShipPlacement,
    animateGameStart,
    animateTurnChange
} from './ui/animations.js';

import {
    renderShipSelectors,
    updateShipQuantityDisplay,
    highlightSelectedShipButton,
    renderTurnIndicator,
    enablePlacementPreview,
    disablePlacementPreview
} from './ui/renderBoard.js';

import { initResponsiveLayout } from './ui/responsive.js';

import { showElement } from './utils/domUtils.js';

// ---------------------------------------------------------------------------
// Ship
// ---------------------------------------------------------------------------

class Ship {
    constructor(type, size, quantity) {
        this.type = type;
        this.size = size;
        this.quantity = quantity;
        this.orientation = null;
    }

    setOrientation(orientation) {
        this.orientation = orientation;
    }

    hasRemaining() {
        return this.quantity > 0;
    }

    decrement() {
        if (this.quantity > 0) {
            this.quantity--;
        }
    }
}

// ---------------------------------------------------------------------------
// Board
// ---------------------------------------------------------------------------

class Board {
    constructor(boardElement, boardType, clickHandler) {
        this.boardElement = boardElement;
        this.boardType = boardType;
        this.matrix = [];
        this.clickHandler = clickHandler;
        this.size = 10;
    }

    create() {
        for (let i = 0; i < this.size; i++) {
            let row = [];
            let rowElement = document.createElement('div');
            this.boardElement.appendChild(rowElement);
            rowElement.className = 'board-row myRow';

            for (let j = 0; j < this.size; j++) {
                let grid = document.createElement('div');
                rowElement.appendChild(grid);
                grid.className = 'board-cell grid';
                grid.id = `${i},${j},${this.boardType}`;
                grid.addEventListener('click', this.clickHandler);
                row.push('');
            }
            this.matrix.push(row);
        }
    }

    isValidPosition(row, col, orientation, shipSize) {
        if (orientation === 'horizontal') {
            return col + shipSize <= this.size;
        } else if (orientation === 'vertical') {
            return row + shipSize <= this.size;
        }
        return false;
    }

    isCellEmpty(row, col) {
        return this.matrix[row][col] === '';
    }

    placeShip(row, col, orientation, shipSize) {
        const cells = [];
        if (orientation === 'horizontal') {
            for (let i = col; i < col + shipSize; i++) {
                if (!this.isCellEmpty(row, i)) return null;
                cells.push({ row, col: i });
            }
            for (let i = col; i < col + shipSize; i++) {
                this.matrix[row][i] = 'ship';
                document.getElementById(`${row},${i},${this.boardType}`).classList.add('selected');
            }
        } else if (orientation === 'vertical') {
            for (let i = row; i < row + shipSize; i++) {
                if (!this.isCellEmpty(i, col)) return null;
                cells.push({ row: i, col });
            }
            for (let i = row; i < row + shipSize; i++) {
                this.matrix[i][col] = 'ship';
                document.getElementById(`${i},${col},${this.boardType}`).classList.add('selected');
            }
        }
        return cells;
    }

    getMatrix() {
        return this.matrix;
    }
}

// ---------------------------------------------------------------------------
// ShipPlacement
// ---------------------------------------------------------------------------

class ShipPlacement {
    constructor(board) {
        this.board = board;
        this.selectedShip = null;
        this.ships = this.initializeShips();
    }

    initializeShips() {
        return [
            new Ship('carrier',    5, 1),
            new Ship('battleship', 4, 1),
            new Ship('submarine',  3, 1),
            new Ship('destroyer',  2, 2)
        ];
    }

    selectShip(shipIndex, orientation) {
        const ship = this.ships[shipIndex];
        if (ship.hasRemaining()) {
            this.selectedShip = { ...ship, index: shipIndex };
            this.selectedShip.setOrientation = Ship.prototype.setOrientation;
            this.selectedShip.setOrientation(orientation);
            highlightSelectedShipButton(shipIndex, orientation);
            return true;
        }
        showInfoNotification('No ships of this type remaining');
        return false;
    }

    placeShipAt(row, col) {
        if (!this.selectedShip) {
            showErrorNotification('Select a ship first');
            return false;
        }

        if (this.selectedShip.quantity <= 0) {
            showInfoNotification('No ships of this type remaining');
            this.selectedShip = null;
            return false;
        }

        if (!this.board.isValidPosition(row, col, this.selectedShip.orientation, this.selectedShip.size)) {
            showErrorNotification('Invalid position — ship would go off the board');
            return false;
        }

        const placedCells = this.board.placeShip(row, col, this.selectedShip.orientation, this.selectedShip.size);
        if (placedCells === null) {
            showErrorNotification('Position already occupied by another ship');
            return false;
        }

        // Animate the placed ship cells
        animateShipPlacement(placedCells, this.board.boardType);

        this.ships[this.selectedShip.index].decrement();
        updateShipQuantityDisplay(this.selectedShip.index, this.ships[this.selectedShip.index].quantity);
        this.selectedShip = null;
        return true;
    }

    clearSelection() {
        this.selectedShip = null;
    }

    getShips() {
        return this.ships;
    }
}

// ---------------------------------------------------------------------------
// Game
// ---------------------------------------------------------------------------

class Game {
    constructor() {
        this.boardElement        = document.querySelector('#board');
        this.boardAttackElement  = document.querySelector('#boardAttack');
        this.playerBoard         = null;
        this.pcBoard             = null;
        this.shipPlacement       = null;
        this.pcShipPlacement     = null;
        this.gameStarted         = false;
    }

    initialize() {
        this.playerBoard = new Board(
            this.boardElement,
            'player',
            (e) => this.handlePlayerPlacement(e)
        );
        this.playerBoard.create();
        this.shipPlacement = new ShipPlacement(this.playerBoard);

        // Render ship selector panel via UI module
        renderShipSelectors(
            this.shipPlacement.getShips(),
            (index, orientation) => this.shipPlacement.selectShip(index, orientation)
        );

        // Hover preview: shows ghost of ship on board cells while placing
        enablePlacementPreview(
            'player',
            () => this.shipPlacement.selectedShip,
            () => this.playerBoard.getMatrix()
        );

        // Initialize responsive layout
        initResponsiveLayout();
    }

    startGame() {
        this.gameStarted = true;

        this.pcBoard = new Board(
            this.boardAttackElement,
            'pc',
            (e) => this.handlePlayerShot(e)
        );
        this.pcBoard.create();
        this.pcShipPlacement = new ShipPlacement(this.pcBoard);
        this.placePCShipsRandomly();

        document.querySelector('#button').disabled = true;

        // Disable hover preview — placement phase is over
        disablePlacementPreview();

        // Show turn indicator
        showElement('turn-indicator');
        renderTurnIndicator('player');

        // Animate boards sliding in
        animateGameStart();

        showInfoNotification('Battle started — fire at the enemy waters!');
    }

    placePCShipsRandomly() {
        const ships = this.pcShipPlacement.getShips();
        const orientations = ['horizontal', 'vertical'];

        ships.forEach(ship => {
            while (ship.hasRemaining()) {
                const orientation = orientations[Math.floor(Math.random() * orientations.length)];
                const row = Math.floor(Math.random() * 10);
                const col = Math.floor(Math.random() * 10);

                if (this.pcBoard.isValidPosition(row, col, orientation, ship.size)) {
                    const placed = this.pcBoard.placeShip(row, col, orientation, ship.size);
                    if (placed !== null) {
                        ship.decrement();
                    }
                }
            }
        });
    }

    handlePlayerPlacement(event) {
        if (this.gameStarted) return;

        const gridID = event.target.id.split(',');
        const row = parseInt(gridID[0]);
        const col = parseInt(gridID[1]);

        this.shipPlacement.placeShipAt(row, col);
    }

    handlePlayerShot(event) {
        const gridID = event.target.id.split(',');
        const row    = parseInt(gridID[0]);
        const col    = parseInt(gridID[1]);
        const matrix = this.pcBoard.getMatrix();

        if (matrix[row][col] === 'ship') {
            matrix[row][col] = 'hit';
            document.getElementById(`${row},${col},pc`).classList.add('hit');
            animateCellHit(row, col, 'pc');
            showHitNotification('Direct hit! Enemy ship struck! 💥');
            this.checkWinner(matrix, 'player');

        } else if (matrix[row][col] === '') {
            matrix[row][col] = 'miss';
            document.getElementById(`${row},${col},pc`).classList.add('miss');
            animateCellMiss(row, col, 'pc');
            showMissNotification('Splash! Shot went into the water');
            renderTurnIndicator('pc');
            animateTurnChange('pc');
            this.handlePCShot();

        } else if (matrix[row][col] === 'hit' || matrix[row][col] === 'miss') {
            showErrorNotification('You already fired at this cell');
        }
    }

    handlePCShot() {
        const matrix = this.playerBoard.getMatrix();
        const row = Math.floor(Math.random() * 10);
        const col = Math.floor(Math.random() * 10);

        if (matrix[row][col] === 'ship') {
            matrix[row][col] = 'hit';
            document.getElementById(`${row},${col},player`).classList.add('hit');
            animateCellHit(row, col, 'player');
            showEnemyHitNotification('Your ship has been hit! 🔥');
            this.checkWinner(matrix, 'pc');
            this.handlePCShot();

        } else if (matrix[row][col] === 'hit' || matrix[row][col] === 'miss') {
            // Re-roll if already shot
            this.handlePCShot();

        } else {
            matrix[row][col] = 'miss';
            document.getElementById(`${row},${col},player`).classList.add('miss');
            animateCellMiss(row, col, 'player');
            showEnemyMissNotification('Enemy shot missed — your turn! ⚓');
            renderTurnIndicator('player');
            animateTurnChange('player');
        }
    }

    checkWinner(matrix, player) {
        for (let i = 0; i < 10; i++) {
            if (matrix[i].some(cell => cell === 'ship')) return;
        }
        showWinnerModal(player === 'pc' ? 'pc' : 'player');
    }
}

// ---------------------------------------------------------------------------
// Bootstrap the game
// ---------------------------------------------------------------------------

const game = new Game();
game.initialize();

document.getElementById('button').addEventListener('click', () => {
    game.startGame();
});
