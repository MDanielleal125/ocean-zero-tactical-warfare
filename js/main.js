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
import {
    getIsProjectileActive,
    setBoardsInputLocked,
    playShotVisual
} from './ui/shotAnimation.js';
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
import { initNavalMenuBackground } from './ui/navalMenuBackground.js';
import {
    initMusicManager,
    unlockAudio,
    playMenuMusic,
    playSelectionMusic,
    playBattleMusic,
    setMusicPaused,
    persistMusicSettings,
    syncMusicFromGameState
} from './ui/musicManager.js';

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
        this.playerName = 'Capitán';
        this.player2Name = 'Aliado';
        this.difficulty = 'normal';
        this.player1Board = null;
        this.player1ShipPlacement = null;
        this.player2Board = null;
        this.player2ShipPlacement = null;
        this.matchHistoryKey = 'battleship_match_history_v1';
        this.introTimeoutId = null;
        this.isIntroPlaying = false;
        this.cleanupWelcomeScreen = null;
        this.aiState = null;
        this.isProjectileActive = false;
    }

    bootstrap() {
        this.initialize();
        this.cleanupWelcomeScreen = initWelcomeScreen();
        initThemeToggle();
        initBoardZoomControls();

        document.addEventListener('welcomeStarted', () => {
            unlockAudio();
            this.closeIntro();
            this.showMainMenu();
        });
        this.setupMenuControls();
        this.navalMenuBg = initNavalMenuBackground();
        initMusicManager();
        playMenuMusic();
        this.startIntroSequence();
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

    setupMenuControls() {
        document.getElementById('menu-start-pve')?.addEventListener('click', () => this.startNewGame('pve'));
        document.getElementById('menu-start-pvp')?.addEventListener('click', () => this.startNewGame('pvp'));
        document.getElementById('menu-scores-btn')?.addEventListener('click', () => this.showScoresScreen());
        document.getElementById('menu-settings-btn')?.addEventListener('click', () => this.showSettingsScreen());
        document.getElementById('menu-credits-btn')?.addEventListener('click', () => this.showCreditsScreen());
        document.getElementById('settings-back-btn')?.addEventListener('click', () => this.showMainMenu());
        document.getElementById('scores-back-btn')?.addEventListener('click', () => this.showMainMenu());
        document.getElementById('credits-back-btn')?.addEventListener('click', () => this.showMainMenu());
        document.getElementById('save-settings-btn')?.addEventListener('click', () => this.saveSettings());
        document.getElementById('settings-mode')?.addEventListener('change', (event) => {
            const mode = event.target.value;
            const player2Group = document.getElementById('player2-name-group');
            if (player2Group) {
                player2Group.style.display = mode === 'pvp' ? 'block' : 'none';
            }
        });
    }

    startIntroSequence() {
        console.log('Intro started');
        this.isIntroPlaying = true;
        if (this.introTimeoutId) {
            clearTimeout(this.introTimeoutId);
            this.introTimeoutId = null;
        }

        this.introTimeoutId = setTimeout(() => {
            this.closeIntro();
            this.showMainMenu();
        }, 4200);
    }

    closeIntro() {
        if (!this.isIntroPlaying && !this.cleanupWelcomeScreen) return;
        console.log('Intro finished');
        this.isIntroPlaying = false;
        if (this.introTimeoutId) {
            clearTimeout(this.introTimeoutId);
            this.introTimeoutId = null;
        }

        const welcome = document.getElementById('welcome-screen');
        if (welcome) {
            welcome.classList.add('welcome-screen--hidden');
            welcome.style.display = 'none';
            welcome.style.pointerEvents = 'none';
            welcome.setAttribute('aria-hidden', 'true');
        }

        if (typeof this.cleanupWelcomeScreen === 'function') {
            this.cleanupWelcomeScreen();
            this.cleanupWelcomeScreen = null;
        }

        this.removeActiveOverlays();
    }

    showMainMenu() {
        this.closeIntro();
        this.hideAllMenus();
        document.getElementById('main-menu')?.classList.remove('hidden');
        document.getElementById('game-app')?.classList.add('hidden');
        this.updateModeToggleButton();
        this.loadScoreBoard();
        this.loadMatchHistory();
        this.removeActiveOverlays();
        setMusicPaused(false);
        playMenuMusic();
        console.log('Main menu opened');
    }

    hideAllMenus() {
        ['main-menu', 'settings-screen', 'scores-screen', 'credits-screen'].forEach(id => {
            document.getElementById(id)?.classList.add('hidden');
        });
    }

    showSettingsScreen() {
        this.hideAllMenus();
        document.getElementById('settings-screen')?.classList.remove('hidden');
        playMenuMusic();
        const modeField = document.getElementById('settings-mode');
        const nameField = document.getElementById('player-name-input');
        const name2Field = document.getElementById('player2-name-input');
        const difficultyField = document.getElementById('difficulty-select');
        const player2Group = document.getElementById('player2-name-group');

        if (modeField) modeField.value = this.mode;
        if (nameField) nameField.value = this.playerName;
        if (name2Field) name2Field.value = this.player2Name;
        if (difficultyField) difficultyField.value = this.difficulty;
        if (player2Group) player2Group.style.display = this.mode === 'pvp' ? 'block' : 'none';
    }

    saveSettings() {
        const modeField = document.getElementById('settings-mode');
        const nameField = document.getElementById('player-name-input');
        const name2Field = document.getElementById('player2-name-input');
        const difficultyField = document.getElementById('difficulty-select');

        if (modeField) this.mode = modeField.value;
        if (nameField && nameField.value.trim()) this.playerName = nameField.value.trim();
        if (name2Field && name2Field.value.trim()) this.player2Name = name2Field.value.trim();
        if (difficultyField) this.difficulty = difficultyField.value;

        this.updateModeToggleButton();
        persistMusicSettings();
        showInfoNotification('Configuración guardada');
        this.showMainMenu();
    }

    startNewGame(mode) {
        console.log('Starting game:', mode);
        this.closeIntro();
        this.removeActiveOverlays();
        this.mode = mode;
        this.gamePhase = 'setup';
        this.gameStarted = false;
        this.isPaused = false;
        this.activePlacementPlayer = 'player1';
        this.player1Board = null;
        this.player1ShipPlacement = null;
        this.player2Board = null;
        this.player2ShipPlacement = null;
        this.resetMatch();
        this.updateModeToggleButton();
        this.hideAllMenus();
        document.getElementById('main-menu')?.classList.add('hidden');
        const welcome = document.getElementById('welcome-screen');
        if (welcome) {
            welcome.classList.add('welcome-screen--hidden');
            welcome.style.display = 'none';
            welcome.style.pointerEvents = 'none';
            welcome.setAttribute('aria-hidden', 'true');
        }
        const gameApp = document.getElementById('game-app');
        if (gameApp) {
            gameApp.classList.remove('hidden');
            gameApp.style.pointerEvents = 'auto';
        }
        this.setupPlacementBoard('player1');
        playSelectionMusic();
        showInfoNotification(`Preparando partida: ${mode === 'pvp' ? '2 Jugadores local' : `vs PC (${this.difficulty})`}`);
        console.log('Game initialized');
    }

    showScoresScreen() {
        this.hideAllMenus();
        document.getElementById('scores-screen')?.classList.remove('hidden');
        this.loadScoreBoard();
        playMenuMusic();
    }

    showCreditsScreen() {
        this.hideAllMenus();
        document.getElementById('credits-screen')?.classList.remove('hidden');
        playMenuMusic();
    }

    updateModeToggleButton() {
        const btn = document.getElementById('mode-toggle-btn');
        if (!btn) return;
        btn.textContent = this.mode === 'pvp' ? 'Modo vs PC' : 'Modo 2 jugadores';
    }

    removeActiveOverlays() {
        ['pause-overlay', 'pass-device-overlay'].forEach(id => {
            const overlay = document.getElementById(id);
            if (overlay) overlay.remove();
        });
    }

    loadScoreBoard() {
        const raw = localStorage.getItem(this.matchHistoryKey);
        const history = raw ? JSON.parse(raw) : [];
        const scoreboard = {};

        history.forEach(entry => {
            const key = entry.winnerName || entry.winner || 'Desconocido';
            scoreboard[key] = scoreboard[key] || { wins: 0, accuracy: 0, matches: 0 };
            scoreboard[key].wins += 1;
            scoreboard[key].accuracy += entry.accuracy || 0;
            scoreboard[key].matches += 1;
        });

        const table = Object.entries(scoreboard)
            .map(([name, stats]) => ({
                name,
                wins: stats.wins,
                accuracy: Math.round(stats.accuracy / stats.matches)
            }))
            .sort((a, b) => b.wins - a.wins || b.accuracy - a.accuracy)
            .slice(0, 5);

        const list = document.getElementById('scoreboard-list');
        if (list) {
            list.innerHTML = '';
            table.forEach(entry => {
                const li = document.createElement('li');
                li.textContent = `${entry.name} — Victorias: ${entry.wins}, Precisión: ${entry.accuracy}%`;
                list.appendChild(li);
            });
            if (!table.length) {
                const li = document.createElement('li');
                li.textContent = 'No hay puntuaciones aún. Juega y tus resultados aparecerán aquí.';
                list.appendChild(li);
            }
        }

        const historyList = document.getElementById('score-history-list');
        if (historyList) {
            historyList.innerHTML = '';
            history.slice(0, 10).forEach(entry => {
                const li = document.createElement('li');
                const minutes = String(Math.floor((entry.durationSeconds || 0) / 60)).padStart(2, '0');
                const seconds = String((entry.durationSeconds || 0) % 60).padStart(2, '0');
                li.textContent = `${entry.date.split('T')[0]} — ${entry.winnerName || entry.winner} — ${entry.mode} — ${minutes}:${seconds}`;
                historyList.appendChild(li);
            });
        }
    }

    updateBoardTitles() {
        const ownTitle = document.getElementById('own-board-title');
        const attackTitle = document.getElementById('attack-board-title');
        const ownLabel = this.gamePhase === 'battle'
            ? (this.currentTurn === 'player1' ? this.playerName : this.player2Name)
            : (this.activePlacementPlayer === 'player1' ? this.playerName : this.player2Name);

        if (ownTitle) {
            ownTitle.textContent = this.gamePhase === 'battle'
                ? `Tu flota — ${ownLabel}`
                : `Flota de ${ownLabel}`;
        }
        if (attackTitle) {
            attackTitle.textContent = this.gamePhase === 'battle'
                ? `Ataque a ${this.currentTurn === 'player1' ? this.player2Name : this.playerName}`
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

        const currentPlayerName = player === 'player1' ? this.playerName : this.player2Name;
        this.updatePlayerStatusLabel(`${currentPlayerName} coloca sus barcos`);
        this.updateBoardTitles();
        const startBtn = document.getElementById('button');
        if (startBtn) {
            startBtn.textContent = player === 'player1' ? 'Listo Jugador 1' : 'Iniciar batalla';
        }
        this.updateStartButtonState();
    }

    async requestStartGame() {
        console.log('Ready clicked');
        console.log('Current player:', this.activePlacementPlayer);
        console.log('Current phase:', this.gamePhase);
        console.log('Battle started:', this.gameStarted);
        console.log('Game mode:', this.mode);
        console.log('All ships placed:', this.shipPlacement?.allShipsPlaced?.() ?? false);

        if (this.gameStarted) return;

        if (!this.shipPlacement?.allShipsPlaced()) {
            showErrorNotification('Faltan barcos por colocar');
            return;
        }

        if (this.mode === 'pvp') {
            if (this.activePlacementPlayer === 'player1') {
                this.player1Board = this.playerBoard;
                this.player1ShipPlacement = this.shipPlacement;
                showInfoNotification(`${this.playerName} está listo. ${this.player2Name} coloca sus barcos.`);
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
        this.gamePhase = 'battle';
        this.stats = { totalShots: 0, hits: 0 };
        this.sunkCounts = { player: 0, enemy: 0 };
        this.initializeAIState();
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
        this.updatePlayerStatusLabel(`${this.playerName} ataca ahora`);
        animateGameStart();
        showShotLogSection();
        startMatchTimer();
        playBattleMusic();
        showInfoNotification(`¡Batalla iniciada en ${this.difficulty}!. Dispara en el tablero de ataque.`);
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
        playBattleMusic();
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
        const currentPlayerName = player === 'player1' ? this.playerName : this.player2Name;
        this.updatePlayerStatusLabel(`Es el turno de ${currentPlayerName}.`);
        this.updateBoardTitles();
    }

    showPassDeviceOverlay(nextPlayer) {
        const existing = document.getElementById('pass-device-overlay');
        if (existing) existing.remove();

        const overlay = document.createElement('div');
        overlay.id = 'pass-device-overlay';
        overlay.className = 'pause-overlay';
        const nextName = nextPlayer === 'player1' ? this.playerName : this.player2Name;
        overlay.innerHTML = `
            <div class="pause-overlay__content">
                <p>Pasa el dispositivo a ${nextName}</p>
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
        if (!this.gameStarted) return;
        if (this.isPaused) {
            this.resumeGame();
        } else {
            this.pauseGame();
        }
    }

    pauseGame() {
        if (this.isPaused || !this.gameStarted) return;
        this.isPaused = true;
        setMusicPaused(true);
        const btn = document.getElementById('pause-resume-btn');
        if (btn) btn.textContent = 'Reanudar';
        stopMatchTimer();

        const overlay = document.createElement('div');
        overlay.id = 'pause-overlay';
        overlay.className = 'pause-overlay';
        overlay.innerHTML = `
            <div class="pause-overlay__content">
                <p>Juego en pausa</p>
                <div class="pause-overlay__actions">
                    <button type="button" id="pause-resume-control" class="btn btn-primary">Reanudar</button>
                    <button type="button" id="pause-save-control" class="btn btn-outline-light">Guardar</button>
                    <button type="button" id="pause-reset-control" class="btn btn-outline-danger">Reiniciar</button>
                    <button type="button" id="pause-menu-control" class="btn btn-secondary">Menú principal</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);

        document.getElementById('pause-resume-control')?.addEventListener('click', () => this.resumeGame());
        document.getElementById('pause-save-control')?.addEventListener('click', () => this.saveGameState());
        document.getElementById('pause-reset-control')?.addEventListener('click', () => {
            this.resetGame();
            this.resumeGame();
        });
        document.getElementById('pause-menu-control')?.addEventListener('click', () => {
            this.returnToMainMenu();
        });
    }

    resumeGame() {
        if (!this.isPaused) return;
        this.isPaused = false;
        setMusicPaused(false);
        const btn = document.getElementById('pause-resume-btn');
        if (btn) btn.textContent = 'Pausar';
        const overlay = document.getElementById('pause-overlay');
        if (overlay) overlay.remove();
        if (this.gameStarted) {
            startMatchTimer();
        }
    }

    returnToMainMenu() {
        this.isPaused = false;
        setMusicPaused(false);
        stopMatchTimer();
        const overlay = document.getElementById('pause-overlay');
        if (overlay) overlay.remove();
        this.resetMatch();
        this.showMainMenu();
    }

    // Save/Load
    saveGameState() {
        try {
            const payload = {
                mode: this.mode,
                gamePhase: this.gamePhase,
                gameStarted: this.gameStarted,
                isPaused: this.isPaused,
                currentTurn: this.currentTurn,
                stats: this.stats,
                sunkCounts: this.sunkCounts,
                elapsedSeconds: getElapsedSeconds(),
                playerName: this.playerName,
                player2Name: this.player2Name,
                difficulty: this.difficulty,
                playerBoard: this.playerBoard ? { matrix: this.playerBoard.getMatrix(), placedShips: this.playerBoard.placedShips } : null,
                pcBoard: this.pcBoard ? { matrix: this.pcBoard.getMatrix(), placedShips: this.pcBoard.placedShips } : null,
                player1Board: this.player1Board ? { matrix: this.player1Board.getMatrix(), placedShips: this.player1Board.placedShips } : null,
                player2Board: this.player2Board ? { matrix: this.player2Board.getMatrix(), placedShips: this.player2Board.placedShips } : null,
                activePlacementPlayer: this.activePlacementPlayer,
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

            this.removeActiveOverlays();
            this.resetMatch({ silent: true });

            this.mode = data.mode || 'pve';
            this.gamePhase = data.gamePhase || 'setup';
            this.playerName = data.playerName || this.playerName;
            this.player2Name = data.player2Name || this.player2Name;
            this.difficulty = data.difficulty || this.difficulty;
            this.gameStarted = !!data.gameStarted;
            this.isPaused = !!data.isPaused;
            this.activePlacementPlayer = data.activePlacementPlayer || 'player1';
            this.currentTurn = data.currentTurn || (this.mode === 'pvp' ? 'player1' : 'player');
            this.stats = data.stats || this.stats;
            this.sunkCounts = data.sunkCounts || this.sunkCounts;

            console.log('Game loaded');
            console.log('Current player:', this.activePlacementPlayer);
            console.log('Current phase:', this.gamePhase);
            console.log('Battle started:', this.gameStarted);
            console.log('Game mode:', this.mode);
            console.log('Is paused:', this.isPaused);

            this.updateModeToggleButton();

            if (this.gameStarted) {
                this.applyLoadedBattleState(data);
            } else {
                this.applyLoadedSetupState(data);
            }

            this.restoreShotLog(data.shotLog);

            const welcome = document.getElementById('welcome-screen');
            if (welcome) welcome.classList.add('welcome-screen--hidden');
            document.getElementById('game-app')?.classList.remove('hidden');
            ['main-menu', 'settings-screen', 'scores-screen', 'credits-screen'].forEach(id => {
                document.getElementById(id)?.classList.add('hidden');
            });

            if (this.isPaused) this.pauseGame();
            else if (this.gameStarted && !this.isPaused) startMatchTimer();

            const inBattle = this.mode === 'pvp'
                ? this.gameStarted && this.gamePhase === 'battle'
                : !!this.gameStarted;
            syncMusicFromGameState({ inMenu: false, inBattle });
            if (this.isPaused) setMusicPaused(true);

            this.updatePlayerStatusLabel('Partida cargada');
            showInfoNotification('Partida cargada');
        } catch (e) {
            console.error(e);
            showErrorNotification('Error cargando partida');
        }
    }

    applyLoadedSetupState(data) {
        this.gamePhase = 'setup';
        this.gameStarted = false;

        if (this.mode === 'pvp') {
            const placementPlayer = data.activePlacementPlayer || 'player1';

            if (placementPlayer === 'player2' && data.player1Board) {
                const holder = document.createElement('div');
                this.player1Board = new Board(holder, 'player1', null);
                this.player1Board.matrix = data.player1Board.matrix.map(row => [...row]);
                this.player1Board.placedShips = [...(data.player1Board.placedShips || [])];
            }

            this.setupPlacementBoard(placementPlayer);

            const boardSnapshot = placementPlayer === 'player2'
                ? data.playerBoard
                : (data.playerBoard || data.player1Board);

            if (boardSnapshot) {
                this.restoreBoardSnapshot(this.playerBoard, boardSnapshot, true);
            }
        } else {
            this.setupPlacementBoard('player1');
            if (data.playerBoard) {
                this.restoreBoardSnapshot(this.playerBoard, data.playerBoard, true);
            }
        }

        this.restoreShipPlacementFromSave(data);
        this.updateBoardTitles();

        const startBtn = document.getElementById('button');
        if (startBtn) {
            const p = this.activePlacementPlayer;
            startBtn.textContent = this.mode === 'pvp' && p === 'player1'
                ? 'Listo Jugador 1'
                : (this.mode === 'pvp' && p === 'player2' ? 'Iniciar batalla' : 'Iniciar batalla');
        }
        this.updateStartButtonState();
    }

    applyLoadedBattleState(data) {
        if (this.mode === 'pvp' && data.player1Board && data.player2Board) {
            this.player1Board = this.buildBoardFromSave(
                this.boardElement,
                'player1',
                data.player1Board,
                null
            );
            this.player2Board = this.buildBoardFromSave(
                this.boardAttackElement,
                'player2',
                data.player2Board,
                (e) => this.handlePlayerShot(e)
            );
            this.gamePhase = 'battle';
            showAttackBoardSection();
            this.renderPvPTurn(this.currentTurn);
            updateSunkCounters(this.sunkCounts.player, this.sunkCounts.enemy);

            const startBtn = document.getElementById('button');
            if (startBtn) {
                startBtn.disabled = true;
                startBtn.textContent = 'En juego';
            }
            return;
        }

        if (this.mode === 'pve') {
            this.gamePhase = 'battle';

            if (data.playerBoard) {
                this.setupPlacementBoard('player1');
                this.restoreBoardSnapshot(this.playerBoard, data.playerBoard, true);
                this.playerBoard.clickHandler = null;
            }

            if (data.pcBoard) {
                showAttackBoardSection();
                this.pcBoard = new Board(
                    this.boardAttackElement,
                    'pc',
                    (e) => this.handlePlayerShot(e)
                );
                this.pcBoard.create();
                this.restoreBoardSnapshot(this.pcBoard, data.pcBoard, true);
            }

            disablePlacementPreview();
            showElement('turn-indicator');
            renderTurnIndicator(this.currentTurn === 'pc' ? 'pc' : 'player');
            showShotLogSection();
            updateSunkCounters(this.sunkCounts.player, this.sunkCounts.enemy);

            const startBtn = document.getElementById('button');
            if (startBtn) {
                startBtn.disabled = true;
                startBtn.textContent = 'En juego';
            }
        }
    }

    buildBoardFromSave(element, boardType, snapshot, clickHandler) {
        const board = new Board(element, boardType, clickHandler);
        board.create(snapshot.matrix, clickHandler, true);
        board.placedShips = snapshot.placedShips ? [...snapshot.placedShips] : [];
        return board;
    }

    restoreBoardSnapshot(board, snapshot, revealShips = true) {
        if (!board || !snapshot?.matrix) return;

        const mat = snapshot.matrix;
        for (let r = 0; r < mat.length; r++) {
            for (let c = 0; c < mat[r].length; c++) {
                const state = mat[r][c];
                board.matrix[r][c] = state;

                if (state === 'ship' && !revealShips) continue;

                if (state === 'ship') {
                    updateCellState(r, c, board.boardType, 'ship');
                    const cell = document.getElementById(`${r},${c},${board.boardType}`);
                    if (cell) cell.classList.add('selected');
                } else if (state) {
                    updateCellState(r, c, board.boardType, state);
                }
            }
        }

        board.placedShips = snapshot.placedShips ? [...snapshot.placedShips] : [];
    }

    restoreShipPlacementFromSave(data) {
        if (!this.shipPlacement) return;

        const boardType = this.mode === 'pvp'
            ? (this.activePlacementPlayer || 'player1')
            : 'player1';

        if (data.playerShips?.length) {
            data.playerShips.forEach((saved, index) => {
                const ship = this.shipPlacement.ships[index];
                if (ship && ship.type === saved.type) {
                    ship.quantity = saved.quantity;
                }
            });
        } else if (this.playerBoard?.placedShips?.length) {
            this.syncShipQuantitiesFromPlacedShips(this.shipPlacement, this.playerBoard.placedShips);
        }

        renderShipSelectors(
            this.shipPlacement.getShips(),
            (index, orientation) => this.shipPlacement.selectShip(index, orientation)
        );

        enablePlacementPreview(
            boardType,
            () => this.shipPlacement.selectedShip,
            () => this.playerBoard.getMatrix()
        );

        enableShipDragDrop(boardType, (shipIndex, row, col, orientation) => {
            this.shipPlacement.placeShipByIndex(shipIndex, row, col, orientation);
        });

        this.shipPlacement.ships.forEach((ship, index) => {
            updateShipQuantityDisplay(index, ship.quantity);
        });
    }

    syncShipQuantitiesFromPlacedShips(shipPlacement, placedShips) {
        const initialCounts = { carrier: 1, battleship: 1, submarine: 1, destroyer: 2 };
        const placedCounts = {};

        placedShips.forEach(record => {
            placedCounts[record.type] = (placedCounts[record.type] || 0) + 1;
        });

        shipPlacement.ships.forEach(ship => {
            const initial = initialCounts[ship.type] || 0;
            const placed = placedCounts[ship.type] || 0;
            ship.quantity = Math.max(0, initial - placed);
        });
    }

    restoreShotLog(shotLog) {
        const log = document.getElementById('shot-log');
        if (!log) return;
        log.innerHTML = '';
        (shotLog || []).forEach(line => appendShotLogEntry(line));
    }

    // Record match to history storage
    recordMatchHistory(winner, durationSeconds) {
        try {
            const winnerName = winner === 'player1'
                ? this.playerName
                : winner === 'player2'
                    ? this.player2Name
                    : winner === 'player'
                        ? this.playerName
                        : 'PC';
            const raw = localStorage.getItem(this.matchHistoryKey);
            const arr = raw ? JSON.parse(raw) : [];
            const accuracy = this.stats.totalShots ? Math.round((this.stats.hits / this.stats.totalShots) * 100) : 0;
            arr.unshift({
                winner,
                winnerName,
                playerName: this.playerName,
                player2Name: this.player2Name,
                mode: this.mode,
                difficulty: this.difficulty,
                totalShots: this.stats.totalShots,
                hits: this.stats.hits,
                accuracy,
                durationSeconds,
                date: new Date().toISOString()
            });
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
                const winnerLabel = entry.winnerName || entry.winner || 'Desconocido';
                li.textContent = `${entry.date.split('T')[0]} — ${winnerLabel} — ${entry.mode || 'pve'} — ${minutes}:${seconds}`;
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
        const orientations = ['horizontal', 'vertical'];
        const maxPlacementAttempts = 5;
        let placementSuccessful = false;

        for (let attempt = 0; attempt < maxPlacementAttempts && !placementSuccessful; attempt++) {
            this.pcBoard.reset();
            this.pcBoard.create();
            this.pcShipPlacement = new ShipPlacement(this.pcBoard);

            placementSuccessful = true;
            const ships = this.pcShipPlacement.getShips();

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
                if (ship.hasRemaining()) {
                    placementSuccessful = false;
                }
            });
        }

        if (!placementSuccessful) {
            showErrorNotification('Error al colocar las naves del PC. Reinicia la partida.');
        }
    }

    handlePlayerPlacement(event) {
        if (this.gameStarted) return;
        const gridID = event.target.id.split(',');
        const row = parseInt(gridID[0], 10);
        const col = parseInt(gridID[1], 10);
        this.shipPlacement.placeShipAt(row, col);
    }

    handlePlayerShot(event) {
        if (this.isPaused || this.isProjectileActive || getIsProjectileActive()) return;

        const gridID = event.target.id.split(',');
        const row = parseInt(gridID[0], 10);
        const col = parseInt(gridID[1], 10);
        const ctx = this.resolveHumanShotContext(row, col);

        if (!ctx) return;

        void this.executeShot({ ...ctx, targetRow: row, targetCol: col });
    }

    /**
     * Flujo central de disparo — jugador, PC y PvP usan el mismo camino.
     * @param {object} params
     * @returns {Promise<{ cancelled?: boolean, isHit?: boolean, gameEnded?: boolean }>}
     */
    async executeShot(params) {
        const {
            attackerId,
            targetRow,
            targetCol,
            targetBoard,
            targetBoardType,
            actorLabel,
            sunkSide,
            _internal = false
        } = params;

        // Solo bloquear disparos humanos concurrentes; el PC/PvP interno no debe cancelarse.
        if (!_internal && (this.isProjectileActive || getIsProjectileActive())) {
            return { cancelled: true };
        }

        if (!targetBoard) return { cancelled: true };

        const matrix = targetBoard.getMatrix();
        const cellState = matrix[targetRow][targetCol];

        if (cellState === 'hit' || cellState === 'miss') {
            if (attackerId !== 'pc') {
                showErrorNotification('Ya disparaste a esta celda');
            }
            return { cancelled: true };
        }

        if (cellState !== 'ship' && cellState !== '') {
            return { cancelled: true };
        }

        const isHit = cellState === 'ship';

        console.log('Attacker:', attackerId);
        console.log('Target:', targetRow, targetCol);

        if (!_internal) {
            setBoardsInputLocked(true);
        }

        this.isProjectileActive = true;

        let gameEnded = false;

        try {
            await playShotVisual(attackerId, targetRow, targetCol, targetBoardType, isHit);

            gameEnded = this.applyShotResult({
                targetRow,
                targetCol,
                targetBoard,
                targetBoardType,
                actorLabel,
                attackerId,
                sunkSide,
                isHit
            });

            console.log('Shot applied');
        } finally {
            this.isProjectileActive = false;
        }

        if (gameEnded) {
            setBoardsInputLocked(false);
            return { isHit, gameEnded: true };
        }

        if (!isHit) {
            await this.afterShotTurnChange(attackerId);
            console.log('Turn changed');
        }

        if (!_internal) {
            setBoardsInputLocked(false);
        }

        return { isHit, gameEnded: false };
    }

    resolveHumanShotContext(row, col) {
        if (this.mode === 'pvp') {
            if (this.currentTurn === 'player1') {
                return {
                    attackerId: 'player1',
                    targetBoard: this.player2Board,
                    targetBoardType: 'player2',
                    actorLabel: this.playerName,
                    sunkSide: 'enemy'
                };
            }
            if (this.currentTurn === 'player2') {
                return {
                    attackerId: 'player2',
                    targetBoard: this.player1Board,
                    targetBoardType: 'player1',
                    actorLabel: this.player2Name,
                    sunkSide: 'enemy'
                };
            }
            return null;
        }

        return {
            attackerId: 'player',
            targetBoard: this.pcBoard,
            targetBoardType: 'pc',
            actorLabel: this.playerName,
            sunkSide: 'enemy'
        };
    }

    resolvePCShotContext() {
        if (!this.playerBoard) return null;
        return {
            attackerId: 'pc',
            targetBoard: this.playerBoard,
            targetBoardType: this.playerBoard.boardType,
            actorLabel: 'PC',
            sunkSide: 'player'
        };
    }

    /**
     * Aplica hit/miss tras la animación (lógica existente, sin cambios de reglas).
     * @returns {boolean} true si la partida terminó
     */
    applyShotResult({ targetRow, targetCol, targetBoard, targetBoardType, actorLabel, attackerId, sunkSide, isHit }) {
        const matrix = targetBoard.getMatrix();
        const coord = `${String.fromCharCode(65 + targetCol)}${targetRow + 1}`;
        this.stats.totalShots++;

        if (isHit) {
            matrix[targetRow][targetCol] = 'hit';
            this.stats.hits++;
            document.getElementById(`${targetRow},${targetCol},${targetBoardType}`)?.classList.add('hit');
            animateCellHit(targetRow, targetCol, targetBoardType);

            if (attackerId === 'pc') {
                showEnemyHitNotification('¡Te han impactado!');
            } else {
                showHitNotification('¡Impacto directo!');
            }

            appendShotLogEntry(`${actorLabel}: ${coord} — IMPACTO`);

            const sunk = this.processSunkShip(targetBoard, sunkSide);
            if (attackerId === 'pc') {
                this.updateAIStateAfterHit(targetRow, targetCol, sunk);
            }

            const winnerPlayer = this.getWinnerPlayerId(attackerId);
            return this.checkWinner(matrix, winnerPlayer);
        }

        matrix[targetRow][targetCol] = 'miss';
        document.getElementById(`${targetRow},${targetCol},${targetBoardType}`)?.classList.add('miss');
        animateCellMiss(targetRow, targetCol, targetBoardType);

        if (attackerId === 'pc') {
            showEnemyMissNotification('El enemigo falló — tu turno');
            this.updateAIStateAfterMiss(targetRow, targetCol);
        } else {
            showMissNotification('Agua — disparo fallido');
        }

        appendShotLogEntry(`${actorLabel}: ${coord} — AGUA`);
        return false;
    }

    getWinnerPlayerId(attackerId) {
        if (attackerId === 'pc') return 'pc';
        if (this.mode === 'pvp') return attackerId;
        return 'player';
    }

    async afterShotTurnChange(attackerId) {
        if (this.mode === 'pve' && attackerId !== 'pc') {
            renderTurnIndicator('pc');
            animateTurnChange('pc');
            await this.runPCShotSequence();
            return;
        }

        if (this.mode === 'pvp' && attackerId !== 'pc') {
            this.switchPvPTurn();
        }

        if (attackerId === 'pc') {
            renderTurnIndicator('player');
            animateTurnChange('player');
        }
    }

    /** Turno del PC — cada disparo pasa por executeShot (misma animación que el jugador). */
    async runPCShotSequence() {
        if (this.isPaused || !this.playerBoard) return;

        const matrix = this.playerBoard.getMatrix();
        let pcContinues = true;

        while (pcContinues && this.gameStarted && !this.isPaused) {
            const shot = this.selectAICell(matrix);
            if (!shot) break;

            const ctx = this.resolvePCShotContext();
            if (!ctx) break;

            const result = await this.executeShot({
                ...ctx,
                targetRow: shot.row,
                targetCol: shot.col,
                _internal: true
            });

            if (result.cancelled || result.gameEnded) return;

            pcContinues = !!result.isHit;
        }
    }

    /** @deprecated alias — usar runPCShotSequence */
    handlePCShot() {
        return this.runPCShotSequence();
    }

    selectAICell(matrix) {
        if (this.difficulty === 'easy') {
            const cell = this.selectRandomTargetCell(matrix);
            return cell ? { ...cell, strategy: 'random' } : null;
        }

        if (this.aiState.phase === 'target') {
            while (this.aiState.targetQueue.length) {
                const next = this.aiState.targetQueue.shift();
                if (this.isValidTargetCell(next.row, next.col, matrix)) {
                    return { ...next, strategy: 'target' };
                }
            }
            this.initializeAIState();
        }

        if (this.difficulty === 'hard') {
            const cell = this.selectPatternTargetCell(matrix);
            return cell ? { ...cell, strategy: 'pattern' } : null;
        }

        const cell = this.selectRandomTargetCell(matrix);
        return cell ? { ...cell, strategy: 'random' } : null;
    }

    selectRandomTargetCell(matrix) {
        const candidateCells = [];

        for (let row = 0; row < 10; row++) {
            for (let col = 0; col < 10; col++) {
                if (this.isValidTargetCell(row, col, matrix)) {
                    candidateCells.push({ row, col });
                }
            }
        }

        if (!candidateCells.length) return null;
        return candidateCells[Math.floor(Math.random() * candidateCells.length)];
    }

    selectPatternTargetCell(matrix) {
        const patternCells = [];
        const fallback = [];
        const step = this.getLargestRemainingShipSize(this.playerBoard) >= 4 ? 2 : 1;

        for (let row = 0; row < 10; row++) {
            for (let col = 0; col < 10; col++) {
                if (!this.isValidTargetCell(row, col, matrix)) continue;
                if (((row + col) % step) === 0) {
                    patternCells.push({ row, col });
                }
                fallback.push({ row, col });
            }
        }

        if (patternCells.length) {
            return patternCells[Math.floor(Math.random() * patternCells.length)];
        }
        if (fallback.length) {
            return fallback[Math.floor(Math.random() * fallback.length)];
        }
        return null;
    }

    updateAIStateAfterHit(row, col, sunk) {
        if (this.difficulty === 'easy') return;

        if (sunk) {
            this.initializeAIState();
            return;
        }

        this.aiState.targetHits.push({ row, col });
        this.aiState.targetDirection = this.getTargetDirection();
        this.aiState.phase = 'target';
        this.aiState.targetQueue = this.buildTargetQueue();

        if (!this.aiState.targetQueue.length) {
            this.initializeAIState();
        }
    }

    updateAIStateAfterMiss(row, col) {
        if (this.difficulty === 'easy') return;
        if (this.aiState.phase !== 'target') return;
        if (!this.aiState.targetQueue.length) {
            this.initializeAIState();
        }
    }

    buildTargetQueue() {
        if (!this.aiState.targetDirection) {
            const queue = [];
            this.aiState.targetHits.forEach(hit => {
                this.getAdjacentCells(hit.row, hit.col).forEach(cell => queue.push(cell));
            });
            return this.uniqueCells(queue);
        }
        return this.getOrientedTargetQueue();
    }

    getAdjacentCells(row, col) {
        return [
            { row: row - 1, col },
            { row: row + 1, col },
            { row, col: col - 1 },
            { row, col: col + 1 }
        ].filter(cell => cell.row >= 0 && cell.row < 10 && cell.col >= 0 && cell.col < 10);
    }

    getOrientedTargetQueue() {
        const hits = [...this.aiState.targetHits];
        const direction = this.aiState.targetDirection;
        const queue = [];

        if (direction === 'horizontal') {
            const row = hits[0].row;
            const sortedCols = hits.map(hit => hit.col).sort((a, b) => a - b);
            queue.push({ row, col: sortedCols[0] - 1 });
            queue.push({ row, col: sortedCols[sortedCols.length - 1] + 1 });
        } else if (direction === 'vertical') {
            const col = hits[0].col;
            const sortedRows = hits.map(hit => hit.row).sort((a, b) => a - b);
            queue.push({ row: sortedRows[0] - 1, col });
            queue.push({ row: sortedRows[sortedRows.length - 1] + 1, col });
        }

        const adjacent = [];
        this.aiState.targetHits.forEach(hit => {
            this.getAdjacentCells(hit.row, hit.col).forEach(cell => adjacent.push(cell));
        });

        return this.uniqueCells([...queue, ...adjacent]);
    }

    getTargetDirection() {
        if (this.aiState.targetHits.length < 2) return null;

        const [first, second] = this.aiState.targetHits;
        if (first.row === second.row) return 'horizontal';
        if (first.col === second.col) return 'vertical';
        return null;
    }

    isValidTargetCell(row, col, matrix) {
        if (row < 0 || row >= 10 || col < 0 || col >= 10) return false;
        const value = matrix[row][col];
        return value !== 'hit' && value !== 'miss';
    }

    uniqueCells(cells) {
        const seen = new Set();
        return cells.filter(cell => {
            const key = `${cell.row},${cell.col}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    }

    getLargestRemainingShipSize(board) {
        if (!board || !board.placedShips.length) return 3;
        const sizes = board.placedShips
            .filter(ship => !ship.sunk)
            .map(ship => ship.cells.length);
        return sizes.length ? Math.max(...sizes) : 1;
    }

    initializeAIState() {
        this.aiState = {
            phase: 'search',
            targetHits: [],
            targetQueue: [],
            targetDirection: null
        };
    }

    processSunkShip(board, side) {
        let sunkAny = false;

        board.placedShips.forEach(shipRecord => {
            if (shipRecord.sunk) return;

            const allHit = shipRecord.cells.every(pos => {
                const state = board.getMatrix()[pos.row][pos.col];
                return state === 'hit';
            });

            if (!allHit) return;

            sunkAny = true;
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

        return sunkAny;
    }

    checkWinner(matrix, player) {
        for (let i = 0; i < 10; i++) {
            if (matrix[i].some(cell => cell === 'ship')) return false;
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
            () => this.resetMatch(),
            () => this.returnToMainMenu()
        );
        return true;
    }

    resetMatch(options = {}) {
        this.gameStarted = false;
        this.stats = { totalShots: 0, hits: 0 };
        this.sunkCounts = { player: 0, enemy: 0 };
        this.gamePhase = 'setup';
        this.activePlacementPlayer = 'player1';
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

        this.player1Board = null;
        this.player1ShipPlacement = null;
        this.player2Board = null;
        this.player2ShipPlacement = null;

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

        const gameVisible = !document.getElementById('game-app')?.classList.contains('hidden');
        if (gameVisible && !options.silent) {
            playSelectionMusic();
        }

        if (!options.silent) {
            showInfoNotification('Nueva partida — coloca tu flota');
        }
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
