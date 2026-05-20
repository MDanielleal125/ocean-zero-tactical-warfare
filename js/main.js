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

import { updateCellState } from './ui/renderBoard.js';

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

    create(initialMatrix = null, clickHandler = this.clickHandler, revealShips = true) {
        this.clickHandler = clickHandler;
        this.matrix = renderBoard(this.boardElement, this.boardType, this.clickHandler);
        if (initialMatrix) {
            this.applyMatrix(initialMatrix, revealShips);
        }
    }

    applyMatrix(matrix, revealShips = true) {
        for (let row = 0; row < matrix.length; row++) {
            for (let col = 0; col < matrix[row].length; col++) {
                const state = matrix[row][col];
                this.matrix[row][col] = state;
                if (state === 'ship' && !revealShips) continue;
                updateCellState(row, col, this.boardType, state || '');
            }
        }
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
        this.isPaused = false;
        this.mode = 'pve'; // 'pve' or 'pvp'
        this.currentTurn = 'player'; // 'player' | 'pc' | 'player1' | 'player2'
        this.gamePhase = 'setup'; // 'setup' | 'battle'
        this.activePlacementPlayer = 'player1';
        this.player1Board = null;
        this.player1ShipPlacement = null;
        this.player2Board = null;
        this.player2ShipPlacement = null;
        this.matchHistoryKey = 'battleship_match_history_v1';
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

        this.setupPlacementBoard('player1');

        // Listen for ship quantity changes to validate start and show missing indicators
        document.addEventListener('shipQuantityChanged', (e) => this.onShipQuantityChanged(e.detail));

        // Control buttons
        document.getElementById('pause-resume-btn')?.addEventListener('click', () => this.togglePause());
        document.getElementById('reset-game-btn')?.addEventListener('click', () => this.resetGame());
        document.getElementById('save-game-btn')?.addEventListener('click', () => this.saveGameState());
        document.getElementById('load-game-btn')?.addEventListener('click', () => this.loadGameState());
        document.getElementById('mode-toggle-btn')?.addEventListener('click', () => this.toggleMode());

        // Populate match history UI
        this.loadMatchHistory();

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

        // Ensure start button reflect initial ship counts
        this.updateStartButtonState();

        initResponsiveLayout();
    }

    updatePlayerStatusLabel(message) {
        const status = document.getElementById('player-status');
        if (status) {
            status.textContent = message;
        }
    }

    updateBoardTitles() {
        const ownTitle = document.getElementById('own-board-title');
        const attackTitle = document.getElementById('attack-board-title');
        const ownLabel = this.gamePhase === 'battle'
            ? (this.currentTurn === 'player1' ? 'Jugador 1' : 'Jugador 2')
            : (this.activePlacementPlayer === 'player1' ? 'Jugador 1' : 'Jugador 2');

        if (ownTitle) {
            ownTitle.textContent = this.gamePhase === 'battle'
                ? `Tu flota — ${ownLabel}`
                : `Flota de ${ownLabel}`;
        }
        if (attackTitle) {
            attackTitle.textContent = this.gamePhase === 'battle'
                ? `Ataque a ${this.currentTurn === 'player1' ? 'Jugador 2' : 'Jugador 1'}`
                : 'Ataque';
        }
    }

    setupPlacementBoard(player) {
        this.activePlacementPlayer = player;
        this.gamePhase = 'setup';
        this.currentTurn = player;
        this.boardAttackElement.innerHTML = '';
        document.querySelector('.board-section--attack')?.classList.add('hidden');

        this.playerBoard = new Board(
            this.boardElement,
            player,
            (e) => this.handlePlayerPlacement(e)
        );
        this.playerBoard.create();
        this.shipPlacement = new ShipPlacement(this.playerBoard);

        renderShipSelectors(
            this.shipPlacement.getShips(),
            (index, orientation) => this.shipPlacement.selectShip(index, orientation)
        );

        enablePlacementPreview(
            player,
            () => this.shipPlacement.selectedShip,
            () => this.playerBoard.getMatrix()
        );

        enableShipDragDrop(player, (shipIndex, row, col, orientation) => {
            this.shipPlacement.placeShipByIndex(shipIndex, row, col, orientation);
        });

        this.updatePlayerStatusLabel(`Jugador ${player === 'player1' ? '1' : '2'} coloca sus barcos`);
        this.updateBoardTitles();
        const startBtn = document.getElementById('button');
        if (startBtn) {
            startBtn.textContent = player === 'player1' ? 'Listo Jugador 1' : 'Iniciar batalla';
        }
        this.updateStartButtonState();
    }

    async requestStartGame() {
        if (this.gameStarted) return;

        if (!this.shipPlacement.allShipsPlaced()) {
            showErrorNotification('Faltan barcos por colocar');
            return;
        }

        if (this.mode === 'pvp') {
            if (this.activePlacementPlayer === 'player1') {
                this.player1Board = this.playerBoard;
                this.player1ShipPlacement = this.shipPlacement;
                showInfoNotification('Jugador 1 listo. Ahora Jugador 2 coloca sus barcos.');
                this.setupPlacementBoard('player2');
                return;
            }

            if (this.activePlacementPlayer === 'player2') {
                this.player2Board = this.playerBoard;
                this.player2ShipPlacement = this.shipPlacement;
                this.startBattle();
                return;
            }
        }

        this.startGame();
    }

    startGame() {
        if (this.mode === 'pvp') {
            this.startBattle();
            return;
        }

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
        this.currentTurn = 'player';
        renderTurnIndicator('player');
        animateGameStart();
        showShotLogSection();
        startMatchTimer();
        showInfoNotification('¡Batalla iniciada! Dispara en el tablero de ataque.');
    }

    startBattle() {
        if (!this.player1Board || !this.player2Board) {
            showErrorNotification('Falta el tablero de uno de los jugadores para iniciar PvP');
            return;
        }

        this.gameStarted = true;
        this.gamePhase = 'battle';
        this.currentTurn = 'player1';
        this.stats = { totalShots: 0, hits: 0 };
        this.sunkCounts = { player: 0, enemy: 0 };
        updateSunkCounters(0, 0);

        this.boardElement.innerHTML = '';
        this.boardAttackElement.innerHTML = '';

        showAttackBoardSection();
        this.renderPvPTurn('player1');

        const startBtn = document.querySelector('#button');
        if (startBtn) startBtn.disabled = true;
        startBtn.textContent = 'En juego';

        disablePlacementPreview();
        animateGameStart();
        showShotLogSection();
        startMatchTimer();
        showInfoNotification('¡Batalla PvP iniciada!');
    }

    switchPvPTurn() {
        this.currentTurn = this.currentTurn === 'player1' ? 'player2' : 'player1';
        this.showPassDeviceOverlay(this.currentTurn);
    }

    renderPvPTurn(player) {
        const ownBoard = player === 'player1' ? this.player1Board : this.player2Board;
        const enemyBoard = player === 'player1' ? this.player2Board : this.player1Board;

        if (!ownBoard || !enemyBoard) return;

        this.boardElement.innerHTML = '';
        this.boardAttackElement.innerHTML = '';

        this.playerBoard = ownBoard;
        this.playerBoard.boardElement = this.boardElement;
        this.playerBoard.create(this.playerBoard.getMatrix(), null, false);

        enemyBoard.boardElement = this.boardAttackElement;
        enemyBoard.create(enemyBoard.getMatrix(), (e) => this.handlePlayerShot(e), false);

        renderTurnIndicator(player);
        this.updatePlayerStatusLabel(`Es el turno de ${player === 'player1' ? 'Jugador 1' : 'Jugador 2'}.`);
        this.updateBoardTitles();
    }

    showPassDeviceOverlay(nextPlayer) {
        const existing = document.getElementById('pass-device-overlay');
        if (existing) existing.remove();

        const overlay = document.createElement('div');
        overlay.id = 'pass-device-overlay';
        overlay.className = 'pause-overlay';
        overlay.innerHTML = `
            <div class="pause-overlay__content">
                <p>Pasa el dispositivo a ${nextPlayer === 'player1' ? 'Jugador 1' : 'Jugador 2'}</p>
                <button type="button" id="pass-device-continue" class="btn btn-primary">Continuar</button>
            </div>
        `;
        document.body.appendChild(overlay);

        document.getElementById('pass-device-continue')?.addEventListener('click', () => {
            overlay.remove();
            this.renderPvPTurn(nextPlayer);
        });
    }

    // Toggle between PVE and local PvP mode
    toggleMode() {
        if (this.gameStarted) {
            showErrorNotification('No puedes cambiar el modo durante una partida');
            return;
        }
        this.mode = this.mode === 'pve' ? 'pvp' : 'pve';
        const btn = document.getElementById('mode-toggle-btn');
        if (btn) btn.textContent = this.mode === 'pvp' ? 'Modo vs PC' : 'Modo 2 jugadores';
        showInfoNotification(`Modo cambiado a ${this.mode}`);
    }

    togglePause() {
        this.isPaused = !this.isPaused;
        const btn = document.getElementById('pause-resume-btn');
        if (btn) btn.textContent = this.isPaused ? 'Reanudar' : 'Pausar';

        if (this.isPaused) {
            // show overlay
            const overlay = document.createElement('div');
            overlay.id = 'pause-overlay';
            overlay.className = 'pause-overlay';
            overlay.textContent = 'PAUSADO';
            document.body.appendChild(overlay);
            stopMatchTimer();
        } else {
            const overlay = document.getElementById('pause-overlay');
            if (overlay) overlay.remove();
            if (this.gameStarted) startMatchTimer();
        }
    }

    // Save/Load
    saveGameState() {
        try {
            const payload = {
                mode: this.mode,
                gameStarted: this.gameStarted,
                isPaused: this.isPaused,
                currentTurn: this.currentTurn,
                stats: this.stats,
                sunkCounts: this.sunkCounts,
                elapsedSeconds: getElapsedSeconds(),
                playerBoard: this.playerBoard ? { matrix: this.playerBoard.getMatrix(), placedShips: this.playerBoard.placedShips } : null,
                pcBoard: this.pcBoard ? { matrix: this.pcBoard.getMatrix(), placedShips: this.pcBoard.placedShips } : null,
                player2Board: this.player2Board ? { matrix: this.player2Board.getMatrix(), placedShips: this.player2Board.placedShips } : null,
                playerShips: this.shipPlacement ? this.shipPlacement.getShips().map(s => ({ type: s.type, size: s.size, quantity: s.quantity })) : null,
                pcShips: this.pcShipPlacement ? this.pcShipPlacement.getShips().map(s => ({ type: s.type, size: s.size, quantity: s.quantity })) : null,
                shotLog: Array.from(document.querySelectorAll('#shot-log .shot-log__item')).map(li => li.textContent || '')
            };
            localStorage.setItem('battleship_save_v1', JSON.stringify(payload));
            showInfoNotification('Partida guardada');
        } catch (e) {
            showErrorNotification('Error guardando partida');
        }
    }

    loadGameState() {
        try {
            const raw = localStorage.getItem('battleship_save_v1');
            if (!raw) {
                showErrorNotification('No hay partida guardada');
                return;
            }
            const data = JSON.parse(raw);
            // Reset current UI
            this.resetMatch();

            this.mode = data.mode || 'pve';
            this.gameStarted = !!data.gameStarted;
            this.isPaused = !!data.isPaused;
            this.currentTurn = data.currentTurn || 'player';
            this.stats = data.stats || this.stats;
            this.sunkCounts = data.sunkCounts || this.sunkCounts;

            // Restore boards
            if (data.playerBoard && this.playerBoard) {
                const mat = data.playerBoard.matrix;
                for (let r = 0; r < mat.length; r++) {
                    for (let c = 0; c < mat[r].length; c++) {
                        this.playerBoard.matrix[r][c] = mat[r][c];
                        updateCellState(r, c, 'player', mat[r][c] || '');
                    }
                }
                this.playerBoard.placedShips = data.playerBoard.placedShips || [];
            }

            if (data.pcBoard && this.pcBoard) {
                const mat = data.pcBoard.matrix;
                for (let r = 0; r < mat.length; r++) {
                    for (let c = 0; c < mat[r].length; c++) {
                        this.pcBoard.matrix[r][c] = mat[r][c];
                        updateCellState(r, c, 'pc', mat[r][c] || '');
                    }
                }
                this.pcBoard.placedShips = data.pcBoard.placedShips || [];
            }

            // Restore shot log
            const log = document.getElementById('shot-log');
            if (log) {
                log.innerHTML = '';
                (data.shotLog || []).forEach(line => {
                    appendShotLogEntry(line);
                });
            }

            if (this.isPaused) this.togglePause();

            showInfoNotification('Partida cargada');
        } catch (e) {
            console.error(e);
            showErrorNotification('Error cargando partida');
        }
    }

    // Record match to history storage
    recordMatchHistory(winner, durationSeconds) {
        try {
            const raw = localStorage.getItem(this.matchHistoryKey);
            const arr = raw ? JSON.parse(raw) : [];
            arr.unshift({ winner, durationSeconds, date: new Date().toISOString() });
            localStorage.setItem(this.matchHistoryKey, JSON.stringify(arr.slice(0,50)));
            this.loadMatchHistory();
        } catch (e) {
            // ignore
        }
    }

    loadMatchHistory() {
        const list = document.getElementById('match-history');
        if (!list) return;
        list.innerHTML = '';
        try {
            const raw = localStorage.getItem(this.matchHistoryKey);
            if (!raw) return;
            const arr = JSON.parse(raw);
            arr.forEach(entry => {
                const li = document.createElement('li');
                const minutes = String(Math.floor((entry.durationSeconds||0)/60)).padStart(2,'0');
                const seconds = String((entry.durationSeconds||0)%60).padStart(2,'0');
                li.textContent = `${entry.date.split('T')[0]} — ${entry.winner} — ${minutes}:${seconds}`;
                list.appendChild(li);
            });
        } catch (e) {
            // ignore
        }
    }

    onShipQuantityChanged(detail) {
        // highlight missing ship cards and update start button
        const { index, quantity } = detail;
        const card = document.getElementById(`ship-card-${index}`);
        if (card) card.classList.toggle('ship-card--missing', quantity > 0);
        this.updateStartButtonState();
    }

    updateStartButtonState() {
        const startBtn = document.getElementById('button');
        if (!startBtn) return;
        if (!this.shipPlacement) return;
        if (this.shipPlacement.allShipsPlaced()) {
            startBtn.disabled = false;
        } else {
            startBtn.disabled = true;
        }
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
        if (this.isPaused) return;

        const gridID = event.target.id.split(',');
        const row = parseInt(gridID[0], 10);
        const col = parseInt(gridID[1], 10);

        // Determine target board depending on mode/turn
        let targetBoard = this.pcBoard;
        let targetType = 'pc';
        let actorLabel = 'Tú';

        if (this.mode === 'pvp') {
            if (this.currentTurn === 'player1') {
                targetBoard = this.player2Board;
                targetType = 'player2';
                actorLabel = 'Jugador 1';
            } else if (this.currentTurn === 'player2') {
                targetBoard = this.player1Board;
                targetType = 'player1';
                actorLabel = 'Jugador 2';
            }
        }

        if (!targetBoard) return;

        const matrix = targetBoard.getMatrix();

        if (matrix[row][col] === 'hit' || matrix[row][col] === 'miss') {
            showErrorNotification('Ya disparaste a esta celda');
            return;
        }

        playShotSound();
        this.stats.totalShots++;

        if (matrix[row][col] === 'ship') {
            matrix[row][col] = 'hit';
            this.stats.hits++;
            const cell = document.getElementById(`${row},${col},${targetType}`);
            if (cell) cell.classList.add('hit');
            animateCellHit(row, col, targetType);
            playExplosionSound();
            showHitNotification('¡Impacto directo!');
            appendShotLogEntry(`${actorLabel}: ${String.fromCharCode(65 + col)}${row + 1} — IMPACTO`);
            this.processSunkShip(targetBoard, this.mode === 'pvp' ? (this.currentTurn === 'player1' ? 'enemy' : 'player') : 'enemy');
            this.checkWinner(matrix, this.mode === 'pvp' ? (this.currentTurn === 'player1' ? 'player1' : 'player2') : 'player');
        } else if (matrix[row][col] === '') {
            matrix[row][col] = 'miss';
            const cellEl = document.getElementById(`${row},${col},${targetType}`);
            if (cellEl) cellEl.classList.add('miss');
            animateCellMiss(row, col, targetType);
            showMissNotification('Agua — disparo fallido');
            appendShotLogEntry(`${actorLabel}: ${String.fromCharCode(65 + col)}${row + 1} — AGUA`);

            if (this.mode === 'pve') {
                renderTurnIndicator('pc');
                animateTurnChange('pc');
                this.handlePCShot();
            } else {
                this.switchPvPTurn();
            }
        }
    }

    handlePCShot() {
        if (this.isPaused) return;

        // Simple AI random shots on player board
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

        // Determine winner label for PvP or PvE
        const winnerLabel = this.mode === 'pvp'
            ? (player === 'player1' ? 'player1' : 'player2')
            : (player === 'pc' ? 'pc' : 'player');

        // Record match history
        this.recordMatchHistory(winnerLabel, getElapsedSeconds());

        showWinnerModal(
            winnerLabel,
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

    // Full reset: clears save and UI state without reloading page
    resetGame() {
        this.resetMatch();
        try { localStorage.removeItem('battleship_save_v1'); } catch (e) {}
        const overlay = document.getElementById('pause-overlay');
        if (overlay) overlay.remove();
        this.isPaused = false;
        const pauseBtn = document.getElementById('pause-resume-btn');
        if (pauseBtn) pauseBtn.textContent = 'Pausar';
        showInfoNotification('Partida reiniciada');
    }
}

// ---------------------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------------------

const game = new Game();
game.bootstrap();
