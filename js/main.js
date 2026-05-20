// ============================================
// ES6 Module Imports - MUST be at the top
// ============================================
import { EasyAI } from './ai/aiEasy.js';
import {
    showHitNotification,
    showMissNotification,
    showErrorNotification,
    showInfoNotification,
    showEnemyHitNotification,
    showEnemyMissNotification,
    showSunkShipNotification,
    showWinnerModal
} from './ui/notifications.js';
import {
    updateShipQuantityDisplay,
    highlightSelectedShipButton,
    renderTurnIndicator,
    appendShotLogEntry,
    updateSunkCounters,
    startMatchTimer,
    stopMatchTimer,
    getElapsedSeconds
} from './ui/gameHud.js';
import {
    enablePlacementPreview,
    disablePlacementPreview,
    enableShipDragDrop
} from './ui/renderBoard.js';
import {
    playShotSound,
    playExplosionSound,
    playMissSound,
    playSunkSound,
    playWinSound
} from './ui/audio.js';

// ============================================
// Ship Class
// ============================================
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

// ============================================
// Board Class
// ============================================
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
            let rowElement = document.createElement("div");
            this.boardElement.appendChild(rowElement);
            rowElement.className = "myRow";

            for (let j = 0; j < this.size; j++) {
                let grid = document.createElement("div");
                rowElement.appendChild(grid);
                grid.className = "grid";
                grid.id = `${i},${j},${this.boardType}`;
                grid.addEventListener("click", this.clickHandler);
                row.push("");
            }
            this.matrix.push(row);
        }
    }

    isValidPosition(row, col, orientation, shipSize) {
        if (orientation === "horizontal") {
            return col + shipSize <= this.size;
        } else if (orientation === "vertical") {
            return row + shipSize <= this.size;
        }
        return false;
    }

    isCellEmpty(row, col) {
        return this.matrix[row][col] === "";
    }

    placeShip(row, col, orientation, shipSize) {
        const cells = [];
        if (orientation === "horizontal") {
            for (let i = col; i < col + shipSize; i++) {
                if (!this.isCellEmpty(row, i)) {
                    return null;
                }
                cells.push({ row, col: i });
            }
            for (let i = col; i < col + shipSize; i++) {
                this.matrix[row][i] = "ship";
                document.getElementById(`${row},${i},${this.boardType}`).className += " selected";
            }
        } else if (orientation === "vertical") {
            for (let i = row; i < row + shipSize; i++) {
                if (!this.isCellEmpty(i, col)) {
                    return null;
                }
                cells.push({ row: i, col });
            }
            for (let i = row; i < row + shipSize; i++) {
                this.matrix[i][col] = "ship";
                document.getElementById(`${i},${col},${this.boardType}`).className += " selected";
            }
        }
        return cells;
    }

    getMatrix() {
        return this.matrix;
    }
}

// ============================================
// ShipPlacement Class
// ============================================
class ShipPlacement {
    constructor(board) {
        this.board = board;
        this.selectedShip = null;
        this.ships = this.initializeShips();
    }

    initializeShips() {
        return [
            new Ship("carrier", 5, 1),
            new Ship("battleship", 4, 1),
            new Ship("submarine", 3, 1),
            new Ship("destroyer", 2, 2)
        ];
    }

    selectShip(shipIndex, orientation) {
        const ship = this.ships[shipIndex];
        if (ship.hasRemaining()) {
            this.selectedShip = ship;
            this.selectedShip.index = shipIndex;
            this.selectedShip.setOrientation(orientation);
            return true;
        }
        return false;
    }

    placeShipAt(row, col) {
        if (!this.selectedShip) {
            return null;
        }

        if (!this.selectedShip.hasRemaining()) {
            this.selectedShip = null;
            return null;
        }

        if (!this.board.isValidPosition(row, col, this.selectedShip.orientation, this.selectedShip.size)) {
            return null;
        }

        const placed = this.board.placeShip(row, col, this.selectedShip.orientation, this.selectedShip.size);
        if (placed === null) {
            return null;
        }

        const placedIndex = this.selectedShip.index;
        this.ships[placedIndex].decrement();
        this.selectedShip = null;
        return {
            shipIndex: placedIndex,
            positions: placed
        };
    }

    getSelectedShip() {
        return this.selectedShip;
    }

    areAllShipsPlaced() {
        return this.ships.every(ship => !ship.hasRemaining());
    }

    clearSelection() {
        this.selectedShip = null;
    }

    getShips() {
        return this.ships;
    }
}

// ============================================
// Game Class - Main Game Controller
// ============================================
class Game {
    constructor() {
        this.boardElement = document.querySelector("#board");
        this.boardAttackElement = document.querySelector("#boardAttack");
        this.playerBoard = null;
        this.pcBoard = null;
        this.shipPlacement = null;
        this.pcShipPlacement = null;
        this.playerShips = [];
        this.pcShips = [];
        this.gameStarted = false;
        this.ai = new EasyAI();
        this.totalShots = 0;
        this.playerHits = 0;
        this.enemyHits = 0;
        this.playerSunkCount = 0;
        this.enemySunkCount = 0;
        this.startButton = document.querySelector("#startGameButton");
    }

    initialize() {
        this.playerBoard = new Board(this.boardElement, "player", (e) => this.handlePlayerPlacement(e));
        this.playerBoard.create();
        this.shipPlacement = new ShipPlacement(this.playerBoard);
        this.createShipSelectors();
        enablePlacementPreview("player", () => this.shipPlacement.getSelectedShip(), () => this.playerBoard.getMatrix());
        enableShipDragDrop("player", (shipIndex, row, col, orientation) => this.placeShipFromDrag(shipIndex, row, col, orientation));
        this.updateStartButtonState();
        renderTurnIndicator("player");
        showInfoNotification("Selecciona tu flota y coloca todos los barcos antes de iniciar la batalla.");
    }

    createShipSelectors() {
        const positionElements = document.querySelectorAll(".position");
        positionElements.forEach((positionElement, shipIndex) => {
            const ships = this.shipPlacement.getShips();

            const horizontal = document.createElement("div");
            horizontal.className = "horizontal " + shipIndex;
            horizontal.addEventListener("click", () => {
                if (this.shipPlacement.selectShip(shipIndex, "horizontal")) {
                    highlightSelectedShipButton(shipIndex, "horizontal");
                    showInfoNotification(`Seleccionado ${ships[shipIndex].type} en horizontal. Haz clic en el tablero para colocarlo.`);
                } else {
                    showErrorNotification("No quedan barcos de este tipo disponibles.");
                }
            });
            positionElement.appendChild(horizontal);

            const vertical = document.createElement("div");
            vertical.className = "vertical " + shipIndex;
            vertical.addEventListener("click", () => {
                if (this.shipPlacement.selectShip(shipIndex, "vertical")) {
                    highlightSelectedShipButton(shipIndex, "vertical");
                    showInfoNotification(`Seleccionado ${ships[shipIndex].type} en vertical. Haz clic en el tablero para colocarlo.`);
                } else {
                    showErrorNotification("No quedan barcos de este tipo disponibles.");
                }
            });
            positionElement.appendChild(vertical);
        });
    }

    placeShipFromDrag(shipIndex, row, col, orientation) {
        if (this.gameStarted) {
            showErrorNotification("La partida ya comenzó. No puedes mover barcos ahora.");
            return false;
        }

        if (!this.shipPlacement.selectShip(shipIndex, orientation)) {
            showErrorNotification("Barco no disponible para colocar.");
            return false;
        }

        highlightSelectedShipButton(shipIndex, orientation);
        return this.performPlacement(row, col);
    }

    performPlacement(row, col) {
        if (!this.shipPlacement.getSelectedShip()) {
            showErrorNotification("Selecciona un barco y su orientación antes de colocarlo.");
            return false;
        }

        const result = this.shipPlacement.placeShipAt(row, col);
        if (result === null) {
            showErrorNotification("Posición inválida o la celda ya está ocupada.");
            return false;
        }

        const ship = this.shipPlacement.getShips()[result.shipIndex];
        updateShipQuantityDisplay(result.shipIndex, ship.quantity);
        this.playerShips.push({
            type: ship.type,
            size: ship.size,
            positions: result.positions,
            hits: []
        });

        showInfoNotification("Barco colocado correctamente.");
        this.updateStartButtonState();

        if (this.shipPlacement.areAllShipsPlaced()) {
            showInfoNotification("Flota completa. Presiona Iniciar batalla para empezar.");
        }

        return true;
    }

    handlePlayerPlacement(event) {
        if (this.gameStarted) return;

        const grid = event.target;
        const [rowStr, colStr] = grid.id.split(",");
        const row = parseInt(rowStr, 10);
        const col = parseInt(colStr, 10);

        this.performPlacement(row, col);
    }

    startGame() {
        if (this.gameStarted) return;

        if (!this.shipPlacement.areAllShipsPlaced()) {
            showErrorNotification("Debes colocar toda tu flota antes de iniciar batalla.");
            return;
        }

        this.gameStarted = true;
        this.pcShips = [];
        this.totalShots = 0;
        this.playerHits = 0;
        this.enemyHits = 0;
        this.playerSunkCount = 0;
        this.enemySunkCount = 0;

        this.pcBoard = new Board(this.boardAttackElement, "pc", (e) => this.handlePlayerShot(e));
        this.pcBoard.create();
        this.pcShipPlacement = new ShipPlacement(this.pcBoard);
        this.placePCShipsRandomly();

        disablePlacementPreview();
        if (this.startButton) this.startButton.disabled = true;
        startMatchTimer();
        updateSunkCounters(0, 0);
        renderTurnIndicator("player");
        showInfoNotification("Batalla iniciada. ¡Dispara al enemigo!");
        playShotSound();
    }

    placePCShipsRandomly() {
        const ships = this.pcShipPlacement.getShips();
        const orientations = ["horizontal", "vertical"];

        ships.forEach(ship => {
            while (ship.hasRemaining()) {
                const orientation = orientations[Math.floor(Math.random() * orientations.length)];
                const row = Math.floor(Math.random() * 10);
                const col = Math.floor(Math.random() * 10);

                if (this.pcBoard.isValidPosition(row, col, orientation, ship.size)) {
                    const placed = this.pcBoard.placeShip(row, col, orientation, ship.size);
                    if (placed !== null) {
                        this.pcShips.push({
                            type: ship.type,
                            size: ship.size,
                            positions: placed,
                            hits: []
                        });
                        ship.decrement();
                    }
                }
            }
        });
    }

    handlePlayerShot(event) {
        if (!this.gameStarted) {
            showErrorNotification("Inicia la batalla primero.");
            return;
        }

        const grid = event.target;
        const [rowStr, colStr] = grid.id.split(",");
        const row = parseInt(rowStr, 10);
        const col = parseInt(colStr, 10);
        const matrix = this.pcBoard.getMatrix();
        const currentState = matrix[row][col];

        if (currentState === 'hit' || currentState === 'miss') {
            showErrorNotification('Ya disparaste en esa posición.');
            return;
        }

        this.totalShots += 1;
        playShotSound();

        if (currentState === 'ship') {
            this.playerHits += 1;
            matrix[row][col] = 'hit';
            document.getElementById(`${row},${col},pc`)?.classList.add('hit');
            playExplosionSound();
            showHitNotification('Impacto! Vuelve a disparar.');
            appendShotLogEntry(`Jugador impactó en ${String.fromCharCode(65 + col)}${row + 1}`);
            this.markShipHit(this.pcShips, row, col, 'enemy');
            this.checkWinner(this.pcBoard.getMatrix(), 'player');
        } else {
            matrix[row][col] = 'miss';
            document.getElementById(`${row},${col},pc`)?.classList.add('miss');
            playMissSound();
            showMissNotification('¡Fallaste! Turno del PC.');
            appendShotLogEntry(`Jugador falló en ${String.fromCharCode(65 + col)}${row + 1}`);
            renderTurnIndicator('pc');
            this.handlePCShot();
        }
    }

    handlePCShot() {
        const matrix = this.convertToModernMatrix(this.playerBoard.getMatrix());

        this.ai.startTurn(
            matrix,
            [],
            (shotResult) => {
                this.playerBoard.matrix[shotResult.row][shotResult.col] = 'hit';
                document.getElementById(`${shotResult.row},${shotResult.col},player`)?.classList.add('hit');
                playExplosionSound();
                showEnemyHitNotification(`PC impactó en ${String.fromCharCode(65 + shotResult.col)}${shotResult.row + 1}`);
                appendShotLogEntry(`PC impactó en ${String.fromCharCode(65 + shotResult.col)}${shotResult.row + 1}`);
                this.enemyHits += 1;
                this.markShipHit(this.playerShips, shotResult.row, shotResult.col, 'player');
                this.checkWinner(this.playerBoard.getMatrix(), 'pc');
            },
            (shotResult) => {
                this.playerBoard.matrix[shotResult.row][shotResult.col] = 'miss';
                document.getElementById(`${shotResult.row},${shotResult.col},player`)?.classList.add('miss');
                playMissSound();
                showEnemyMissNotification(`PC falló en ${String.fromCharCode(65 + shotResult.col)}${shotResult.row + 1}`);
                appendShotLogEntry(`PC falló en ${String.fromCharCode(65 + shotResult.col)}${shotResult.row + 1}`);
            },
            () => {
                // Ship sunk callback not used because we track sinking manually.
            },
            () => {
                if (this.gameStarted) {
                    renderTurnIndicator('player');
                }
            }
        );
    }

    markShipHit(ships, row, col, owner) {
        const ship = ships.find(item => item.positions.some(pos => pos.row === row && pos.col === col));
        if (!ship) return;

        if (!ship.hits.some(hit => hit.row === row && hit.col === col)) {
            ship.hits.push({ row, col });
        }

        if (ship.hits.length >= ship.size) {
            const shipName = ship.type.charAt(0).toUpperCase() + ship.type.slice(1);
            showSunkShipNotification(shipName);
            playSunkSound();

            if (owner === 'enemy') {
                this.enemySunkCount += 1;
            } else {
                this.playerSunkCount += 1;
            }
            updateSunkCounters(this.playerSunkCount, this.enemySunkCount);
        }
    }

    convertToModernMatrix(oldMatrix) {
        const modernMatrix = [];
        for (let row = 0; row < oldMatrix.length; row++) {
            const rowArray = [];
            for (let col = 0; col < oldMatrix[row].length; col++) {
                let state = 'empty';
                if (oldMatrix[row][col] === 'ship') {
                    state = 'ship';
                } else if (oldMatrix[row][col] === 'hit') {
                    state = 'hit';
                } else if (oldMatrix[row][col] === 'miss') {
                    state = 'miss';
                }
                rowArray.push({ row, col, state });
            }
            modernMatrix.push(rowArray);
        }
        return modernMatrix;
    }

    checkWinner(matrix, player) {
        const shipsRemaining = matrix.flat().filter(cell => cell === 'ship');
        if (shipsRemaining.length > 0) return;

        this.gameStarted = false;
        stopMatchTimer();

        const stats = {
            totalShots: this.totalShots,
            hits: this.playerHits,
            accuracy: this.calculateAccuracy(),
            elapsedSeconds: getElapsedSeconds()
        };

        playWinSound();

        if (player === 'pc') {
            showWinnerModal('pc', stats, () => window.location.reload());
        } else {
            showWinnerModal('player', stats, () => window.location.reload());
        }
    }

    calculateAccuracy() {
        if (this.totalShots === 0) return 0;
        return Math.round((this.playerHits / this.totalShots) * 100);
    }

    updateStartButtonState() {
        if (!this.startButton) return;
        this.startButton.disabled = !this.shipPlacement.areAllShipsPlaced();
    }
}

// ============================================
// Game Initialization & Event Binding
// ============================================
const game = new Game();

function bindGameControls() {
    const startButton = document.querySelector("#startGameButton");
    if (startButton) {
        startButton.addEventListener("click", () => {
            game.startGame();
        });
    } else {
        console.error("Ocean Zero Warfare: no se encontró el botón de inicio de batalla.");
    }

    window.addEventListener("gameRestartRequested", () => {
        window.location.reload();
    });
}

if (document.readyState === "loading") {
    window.addEventListener("DOMContentLoaded", () => {
        game.initialize();
        bindGameControls();
    });
} else {
    game.initialize();
    bindGameControls();
}
