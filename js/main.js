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
            this.selectedShip = { ...ship, index: shipIndex };
            this.selectedShip.setOrientation(orientation);
            return true;
        }
        return false;
    }

    placeShipAt(row, col) {
        if (!this.selectedShip) {
            alert("Debes seleccionar un barco primero");
            return false;
        }

        if (!this.selectedShip.hasRemaining()) {
            alert("No quedan barcos de este tipo disponibles");
            this.selectedShip = null;
            return false;
        }

        if (!this.board.isValidPosition(row, col, this.selectedShip.orientation, this.selectedShip.size)) {
            alert("Selecciona una posición válida");
            return false;
        }

        const placed = this.board.placeShip(row, col, this.selectedShip.orientation, this.selectedShip.size);
        if (placed === null) {
            alert("La posición ya está ocupada");
            return false;
        }

        this.ships[this.selectedShip.index].decrement();
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

import { EasyAI } from './ai/aiEasy.js';

class Game {
    constructor() {
        this.boardElement = document.querySelector("#board");
        this.boardAttackElement = document.querySelector("#boardAttack");
        this.playerBoard = null;
        this.pcBoard = null;
        this.shipPlacement = null;
        this.pcShipPlacement = null;
        this.gameStarted = false;
        this.ai = new EasyAI();
    }

    initialize() {
        this.playerBoard = new Board(this.boardElement, "player", (e) => this.handlePlayerPlacement(e));
        this.playerBoard.create();
        this.shipPlacement = new ShipPlacement(this.playerBoard);
        this.createShipSelectors();
    }

    createShipSelectors() {
        const positionElements = document.querySelectorAll(".position");
        positionElements.forEach((positionElement, shipIndex) => {
            const ships = this.shipPlacement.getShips();
            
            const horizontal = document.createElement("div");
            horizontal.className = "horizontal " + shipIndex;
            horizontal.addEventListener("click", () => {
                if (this.shipPlacement.selectShip(shipIndex, "horizontal")) {
                    console.log(`Selected ${ships[shipIndex].type} horizontal`);
                } else {
                    alert("No quedan barcos de este tipo disponibles");
                }
            });
            positionElement.appendChild(horizontal);

            const vertical = document.createElement("div");
            vertical.className = "vertical " + shipIndex;
            vertical.addEventListener("click", () => {
                if (this.shipPlacement.selectShip(shipIndex, "vertical")) {
                    console.log(`Selected ${ships[shipIndex].type} vertical`);
                } else {
                    alert("No quedan barcos de este tipo disponibles");
                }
            });
            positionElement.appendChild(vertical);
        });
    }

    handlePlayerPlacement(event) {
        if (this.gameStarted) return;
        
        const grid = event.target;
        const gridID = grid.id.split(",");
        const row = parseInt(gridID[0]);
        const col = parseInt(gridID[1]);
        
        this.shipPlacement.placeShipAt(row, col);
    }

    startGame() {
        this.gameStarted = true;
        this.pcBoard = new Board(this.boardAttackElement, "pc", (e) => this.handlePlayerShot(e));
        this.pcBoard.create();
        this.pcShipPlacement = new ShipPlacement(this.pcBoard);
        this.placePCShipsRandomly();
        document.querySelector("#button").disabled = true;
    }

    placePCShipsRandomly() {
        const ships = this.pcShipPlacement.getShips();
        const orientations = ["horizontal", "vertical"];

        ships.forEach((ship, index) => {
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

    handlePlayerShot(event) {
        const grid = event.target;
        const gridID = grid.id.split(",");
        const row = parseInt(gridID[0]);
        const col = parseInt(gridID[1]);
        const matrix = this.pcBoard.getMatrix();

        if (matrix[row][col] === "ship") {
            alert("Muy bien, acertaste. Vuelve a jugar");
            matrix[row][col] = "hit";
            document.getElementById(`${row},${col},pc`).className += " hit";
            this.checkWinner(matrix, "player");
        } else if (matrix[row][col] === "") {
            alert("Mal! tu disparo cayó al agua");
            matrix[row][col] = "miss";
            document.getElementById(`${row},${col},pc`).className += " miss";
            this.handlePCShot();
        }
    }

    handlePCShot() {
        const matrix = this.convertToModernMatrix(this.playerBoard.getMatrix());
        
        this.ai.startTurn(
            matrix,
            [],
            (shotResult) => {
                document.getElementById(`${shotResult.row},${shotResult.col},player`).className += " hit";
                this.checkWinner(this.playerBoard.getMatrix(), "pc");
            },
            (shotResult) => {
                document.getElementById(`${shotResult.row},${shotResult.col},player`).className += " miss";
            },
            (ship) => {
                alert(`PC sunk your ${ship.type}!`);
            },
            () => {
                // Turn ended
            }
        );
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
        for (let i = 0; i < 10; i++) {
            const shipsRemaining = matrix[i].filter(cell => cell === "ship");
            if (shipsRemaining.length > 0) {
                return;
            }
        }
        if (player === "pc") {
            alert("Ha ganado el PC");
        } else {
            alert("GANASTE!!!");
        }
    }
}

const game = new Game();
game.initialize();

function startGame() {
    game.startGame();
}
