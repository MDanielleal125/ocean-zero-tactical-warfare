/**
 * main.js
 * Entry point. Orchestrates game flow with UI modules.
 * Owner: Daniel (core logic) — UI/UX hooks: J. Mena (feature/ui)
 */

import {
    showHitNotification,
    showMissNotification,
    showErrorNotification,
    showInfoNotification,
    showEnemyHitNotification,
    showEnemyMissNotification,
    showWinnerModal,
    showConfirmDialog,
    showSunkShipNotification
} from './ui/notifications.js';

import {
    animateCellHit,
    animateCellMiss,
    animateShipPlacement,
    animateGameStart,
    animateTurnChange,
    animateInvalidCell
} from './ui/animations.js';

import {
    renderBoard,
    renderShipSelectors,
    updateShipQuantityDisplay,
    highlightSelectedShipButton,
    renderTurnIndicator,
    enablePlacementPreview,
    disablePlacementPreview,
    enableShipDragDrop
} from './ui/renderBoard.js';

import { initResponsiveLayout, resetCellZoom } from './ui/responsive.js';
import { playShotSound, playExplosionSound } from './ui/audio.js';
import {
    initWelcomeScreen,
    startMatchTimer,
    stopMatchTimer,
    getElapsedSeconds,
    updateSunkCounters,
    appendShotLogEntry,
    showShotLogSection,
    initBoardZoomControls,
    initThemeToggle,
    showAttackBoardSection
} from './ui/gameHud.js';

import { showElement, hideElement } from './utils/domUtils.js';

const SHIP_DISPLAY_NAMES = {
    carrier: 'Portaaviones',
    battleship: 'Acorazado',
    submarine: 'Submarino',
    destroyer: 'Destructor'
};

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
        this.placedShips = [];
    }

    create() {
        this.matrix = renderBoard(this.boardElement, this.boardType, this.clickHandler);
    }

    isValidPosition(row, col, orientation, shipSize) {
        if (orientation === 'horizontal') {
            return col + shipSize <= this.size;
        }
        if (orientation === 'vertical') {
            return row + shipSize <= this.size;
        }
        return false;
    }

    isCellEmpty(row, col) {
        return this.matrix[row][col] === '';
    }

    placeShip(row, col, orientation, shipSize, shipType = 'ship') {
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

        if (cells.length) {
            this.placedShips.push({
                type: shipType,
                cells: [...cells],
                sunk: false
            });
        }

        return cells;
    }

    getMatrix() {
        return this.matrix;
    }

    reset() {
        this.boardElement.innerHTML = '';
        this.matrix = [];
        this.placedShips = [];
        this.create();
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
        this.lastOrientation = 'horizontal';
    }

    initializeShips() {
        return [
            new Ship('carrier', 5, 1),
            new Ship('battleship', 4, 1),
            new Ship('submarine', 3, 1),
            new Ship('destroyer', 2, 2)
        ];
    }

    allShipsPlaced() {
        return this.ships.every(ship => ship.quantity === 0);
    }

    remainingShipCount() {
        return this.ships.reduce((sum, ship) => sum + ship.quantity, 0);
    }

    selectShip(shipIndex, orientation) {
        const ship = this.ships[shipIndex];
        if (ship.hasRemaining()) {
            this.selectedShip = { ...ship, index: shipIndex };
            this.selectedShip.setOrientation = Ship.prototype.setOrientation;
            this.selectedShip.setOrientation(orientation);
            this.lastOrientation = orientation;
            highlightSelectedShipButton(shipIndex, orientation);
            return true;
        }
        showInfoNotification('No quedan naves de este tipo');
        return false;
    }

    rotateSelectedOrientation() {
        if (!this.selectedShip) return;
        const next = this.selectedShip.orientation === 'horizontal' ? 'vertical' : 'horizontal';
        this.selectShip(this.selectedShip.index, next);
    }

    placeShipAt(row, col, options = {}) {
        const silent = options.silent === true;

        if (!this.selectedShip) {
            if (!silent) showErrorNotification('Selecciona una nave primero');
            return false;
        }

        const activeShip = this.selectedShip;
        const orientation = activeShip.orientation;

        if (activeShip.quantity <= 0) {
            if (!silent) showInfoNotification('No quedan naves de este tipo');
            this.selectedShip = null;
            return false;
        }

        if (!this.board.isValidPosition(row, col, orientation, activeShip.size)) {
            if (!silent) {
                showErrorNotification('Posición inválida — la nave saldría del tablero');
                animateInvalidCell(row, col, this.board.boardType);
            }
            return false;
        }

        const placedCells = this.board.placeShip(
            row,
            col,
            orientation,
            activeShip.size,
            activeShip.type
        );

        if (placedCells === null) {
            if (!silent) {
                showErrorNotification('La posición ya está ocupada');
                projectedInvalidPreview(row, col, orientation, activeShip.size);
            }
            return false;
        }

        animateShipPlacement(placedCells, this.board.boardType);
        this.ships[activeShip.index].decrement();
        updateShipQuantityDisplay(activeShip.index, this.ships[activeShip.index].quantity);
        this.selectedShip = null;
        return true;
    }

    placeShipByIndex(shipIndex, row, col, orientation) {
        if (!this.selectShip(shipIndex, orientation)) return false;
        return this.placeShipAt(row, col);
    }

    placeAllShipsRandomly() {
        const orientations = ['horizontal', 'vertical'];

        this.ships.forEach((ship, shipIndex) => {
            let attempts = 0;
            while (ship.hasRemaining() && attempts < 800) {
                attempts++;
                const orientation = orientations[Math.floor(Math.random() * orientations.length)];
                const row = Math.floor(Math.random() * 10);
                const col = Math.floor(Math.random() * 10);
                this.selectShip(shipIndex, orientation);
                this.placeShipAt(row, col, { silent: true });
            }
        });

        this.selectedShip = null;

        if (this.allShipsPlaced()) {
            showInfoNotification('Colocación aleatoria completada');
        } else {
            showErrorNotification(
                'No se colocaron todas las naves. Pulsa de nuevo o colócalas manualmente.'
            );
        }
    }

    clearSelection() {
        this.selectedShip = null;
    }

    getShips() {
        return this.ships;
    }
}

function projectedInvalidPreview(row, col, orientation, size) {
    for (let i = 0; i < size; i++) {
        const r = orientation === 'horizontal' ? row : row + i;
        const c = orientation === 'horizontal' ? col + i : col;
        if (r < 10 && c < 10) animateInvalidCell(r, c, 'player');
    }
}

// ---------------------------------------------------------------------------
// Game
// ---------------------------------------------------------------------------

class Game {
    constructor() {
        this.boardElement = document.querySelector('#board');
        this.boardAttackElement = document.querySelector('#boardAttack');
        this.playerBoard = null;
        this.pcBoard = null;
        this.shipPlacement = null;
        this.pcShipPlacement = null;
        this.gameStarted = false;
        this.stats = { totalShots: 0, hits: 0 };
        this.sunkCounts = { player: 0, enemy: 0 };
        this.uiReady = false;
    }

    bootstrap() {
        this.initialize();
        initWelcomeScreen();
        initThemeToggle();
        initBoardZoomControls();
    }

    initialize() {
        if (this.uiReady) return;
        this.uiReady = true;

        this.playerBoard = new Board(
            this.boardElement,
            'player',
            (e) => this.handlePlayerPlacement(e)
        );
        this.playerBoard.create();
        this.shipPlacement = new ShipPlacement(this.playerBoard);

        renderShipSelectors(
            this.shipPlacement.getShips(),
            (index, orientation) => this.shipPlacement.selectShip(index, orientation)
        );

        enablePlacementPreview(
            'player',
            () => this.shipPlacement.selectedShip,
            () => this.playerBoard.getMatrix()
        );

        enableShipDragDrop('player', (shipIndex, row, col, orientation) => {
            this.shipPlacement.placeShipByIndex(shipIndex, row, col, orientation);
        });

        document.addEventListener('keydown', (event) => {
            if (event.key === 'r' || event.key === 'R') {
                this.shipPlacement.rotateSelectedOrientation();
            }
        });

        document.getElementById('random-placement-btn')?.addEventListener('click', () => {
            if (this.gameStarted) return;
            this.playerBoard.reset();
            this.shipPlacement = new ShipPlacement(this.playerBoard);
            renderShipSelectors(
                this.shipPlacement.getShips(),
                (index, orientation) => this.shipPlacement.selectShip(index, orientation)
            );
            enablePlacementPreview(
                'player',
                () => this.shipPlacement.selectedShip,
                () => this.playerBoard.getMatrix()
            );
            enableShipDragDrop('player', (shipIndex, row, col, orientation) => {
                this.shipPlacement.placeShipByIndex(shipIndex, row, col, orientation);
            });
            this.shipPlacement.placeAllShipsRandomly();
        });

        document.getElementById('button')?.addEventListener('click', () => this.requestStartGame());

        initResponsiveLayout();
    }

    async requestStartGame() {
        if (this.gameStarted) return;

        if (!this.shipPlacement.allShipsPlaced()) {
            const confirmed = await showConfirmDialog(
                '¿Seguro? No has colocado todos tus barcos'
            );
            if (!confirmed) return;
        }

        this.startGame();
    }

    startGame() {
        this.gameStarted = true;
        this.stats = { totalShots: 0, hits: 0 };
        this.sunkCounts = { player: 0, enemy: 0 };
        updateSunkCounters(0, 0);

        showAttackBoardSection();
        this.boardAttackElement.innerHTML = '';
        this.pcBoard = new Board(
            this.boardAttackElement,
            'pc',
            (e) => this.handlePlayerShot(e)
        );
        this.pcBoard.create();
        this.pcShipPlacement = new ShipPlacement(this.pcBoard);
        this.placePCShipsRandomly();

        const startBtn = document.querySelector('#button');
        if (startBtn) startBtn.disabled = true;

        disablePlacementPreview();
        showElement('turn-indicator');
        renderTurnIndicator('player');
        animateGameStart();
        showShotLogSection();
        startMatchTimer();
        showInfoNotification('¡Batalla iniciada! Dispara en el tablero de ataque.');
    }

    placePCShipsRandomly() {
        const ships = this.pcShipPlacement.getShips();
        const orientations = ['horizontal', 'vertical'];

        ships.forEach((ship, shipIndex) => {
            let attempts = 0;
            while (ship.hasRemaining() && attempts < 5000) {
                attempts++;
                const orientation = orientations[Math.floor(Math.random() * orientations.length)];
                const row = Math.floor(Math.random() * 10);
                const col = Math.floor(Math.random() * 10);

                if (this.pcBoard.isValidPosition(row, col, orientation, ship.size)) {
                    const placed = this.pcBoard.placeShip(row, col, orientation, ship.size, ship.type);
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
        const row = parseInt(gridID[0], 10);
        const col = parseInt(gridID[1], 10);
        this.shipPlacement.placeShipAt(row, col);
    }

    handlePlayerShot(event) {
        const gridID = event.target.id.split(',');
        const row = parseInt(gridID[0], 10);
        const col = parseInt(gridID[1], 10);
        const matrix = this.pcBoard.getMatrix();

        if (matrix[row][col] === 'hit' || matrix[row][col] === 'miss') {
            showErrorNotification('Ya disparaste a esta celda');
            return;
        }

        playShotSound();
        this.stats.totalShots++;

        if (matrix[row][col] === 'ship') {
            matrix[row][col] = 'hit';
            this.stats.hits++;
            const cell = document.getElementById(`${row},${col},pc`);
            cell.classList.add('hit');
            animateCellHit(row, col, 'pc');
            playExplosionSound();
            showHitNotification('¡Impacto directo!');
            appendShotLogEntry(`Tú: ${String.fromCharCode(65 + col)}${row + 1} — IMPACTO`);
            this.processSunkShip(this.pcBoard, 'enemy');
            this.checkWinner(matrix, 'player');
        } else if (matrix[row][col] === '') {
            matrix[row][col] = 'miss';
            document.getElementById(`${row},${col},pc`).classList.add('miss');
            animateCellMiss(row, col, 'pc');
            showMissNotification('Agua — disparo fallido');
            appendShotLogEntry(`Tú: ${String.fromCharCode(65 + col)}${row + 1} — AGUA`);
            renderTurnIndicator('pc');
            animateTurnChange('pc');
            this.handlePCShot();
        }
    }

    handlePCShot() {
        const matrix = this.playerBoard.getMatrix();
        const row = Math.floor(Math.random() * 10);
        const col = Math.floor(Math.random() * 10);

        if (matrix[row][col] === 'hit' || matrix[row][col] === 'miss') {
            this.handlePCShot();
            return;
        }

        playShotSound();

        if (matrix[row][col] === 'ship') {
            matrix[row][col] = 'hit';
            document.getElementById(`${row},${col},player`).classList.add('hit');
            animateCellHit(row, col, 'player');
            playExplosionSound();
            showEnemyHitNotification('¡Te han impactado!');
            appendShotLogEntry(`PC: ${String.fromCharCode(65 + col)}${row + 1} — IMPACTO`);
            this.processSunkShip(this.playerBoard, 'player');
            this.checkWinner(matrix, 'pc');
            this.handlePCShot();
        } else {
            matrix[row][col] = 'miss';
            document.getElementById(`${row},${col},player`).classList.add('miss');
            animateCellMiss(row, col, 'player');
            showEnemyMissNotification('El enemigo falló — tu turno');
            appendShotLogEntry(`PC: ${String.fromCharCode(65 + col)}${row + 1} — AGUA`);
            renderTurnIndicator('player');
            animateTurnChange('player');
        }
    }

    processSunkShip(board, side) {
        board.placedShips.forEach(shipRecord => {
            if (shipRecord.sunk) return;

            const allHit = shipRecord.cells.every(pos => {
                const state = board.getMatrix()[pos.row][pos.col];
                return state === 'hit';
            });

            if (!allHit) return;

            shipRecord.sunk = true;
            shipRecord.cells.forEach(pos => {
                const cell = document.getElementById(`${pos.row},${pos.col},${board.boardType}`);
                if (cell) {
                    cell.classList.add('sunk');
                }
            });

            if (side === 'enemy') {
                this.sunkCounts.enemy++;
                showSunkShipNotification(SHIP_DISPLAY_NAMES[shipRecord.type] || shipRecord.type);
            } else {
                this.sunkCounts.player++;
            }

            updateSunkCounters(this.sunkCounts.player, this.sunkCounts.enemy);
        });
    }

    checkWinner(matrix, player) {
        for (let i = 0; i < 10; i++) {
            if (matrix[i].some(cell => cell === 'ship')) return;
        }

        stopMatchTimer();
        const accuracy = this.stats.totalShots
            ? Math.round((this.stats.hits / this.stats.totalShots) * 100)
            : 0;

        showWinnerModal(
            player === 'pc' ? 'pc' : 'player',
            {
                totalShots: this.stats.totalShots,
                hits: this.stats.hits,
                accuracy,
                elapsedSeconds: getElapsedSeconds()
            },
            () => this.resetMatch()
        );
    }

    resetMatch() {
        this.gameStarted = false;
        this.stats = { totalShots: 0, hits: 0 };
        this.sunkCounts = { player: 0, enemy: 0 };
        resetCellZoom();

        this.boardElement.innerHTML = '';
        this.boardAttackElement.innerHTML = '';

        document.querySelector('.board-section--attack')?.classList.add('hidden');
        document.querySelector('#button').disabled = false;

        const log = document.getElementById('shot-log');
        if (log) log.innerHTML = '';
        document.getElementById('shot-log-section')?.classList.add('hidden');

        hideElement('turn-indicator');
        updateSunkCounters(0, 0);
        stopMatchTimer();

        this.playerBoard = new Board(
            this.boardElement,
            'player',
            (e) => this.handlePlayerPlacement(e)
        );
        this.playerBoard.create();
        this.shipPlacement = new ShipPlacement(this.playerBoard);

        renderShipSelectors(
            this.shipPlacement.getShips(),
            (index, orientation) => this.shipPlacement.selectShip(index, orientation)
        );

        enablePlacementPreview(
            'player',
            () => this.shipPlacement.selectedShip,
            () => this.playerBoard.getMatrix()
        );

        showInfoNotification('Nueva partida — coloca tu flota');
    }
}

// ---------------------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------------------

const game = new Game();
game.bootstrap();
