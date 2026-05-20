import { BOARD_SIZE, CELL_STATES, SHIP_TYPES, SHIP_CONFIGS, ORIENTATIONS } from './core/constants.js';
import { gameState, getSelectedShip, getSelectedOrientation, getAvailableShips } from './core/gameState.js';
import { initializeBoards, setCellState, getCellState } from './board/boardManager.js';
import { selectShip, setOrientation, placeShip } from './board/shipPlacement.js';
import { showNotification } from './ui/notifications.js';
import { executeShot, validateShot } from './combat/shootingSystem.js';
import { findShipAtPosition, applyDamageToShip, isShipSunk } from './combat/damageSystem.js';
import { checkWinner, getVictoryMessage } from './combat/winnerSystem.js';

let gameStarted = false;

function initializeGame() {
    initializeBoards();
    renderBoard('board', 'player');
    renderBoard('boardAttack', 'enemy');
    createShipSelectors();
}

function renderBoard(boardId, boardType) {
    const boardElement = document.getElementById(boardId);
    boardElement.innerHTML = '';
    
    for (let row = 0; row < BOARD_SIZE; row++) {
        const rowElement = document.createElement('div');
        rowElement.className = 'myRow';
        
        for (let col = 0; col < BOARD_SIZE; col++) {
            const grid = document.createElement('div');
            grid.className = 'grid';
            grid.id = `${row},${col},${boardType}`;
            
            if (boardType === 'player') {
                grid.addEventListener('click', () => handlePlayerPlacement(row, col));
            } else if (boardType === 'enemy' && gameStarted) {
                grid.addEventListener('click', () => handlePlayerShot(row, col));
            }
            
            rowElement.appendChild(grid);
        }
        boardElement.appendChild(rowElement);
    }
}

function createShipSelectors() {
    const positionElements = document.querySelectorAll('.position');
    const shipTypes = [SHIP_TYPES.CARRIER, SHIP_TYPES.BATTLESHIP, SHIP_TYPES.SUBMARINE, SHIP_TYPES.DESTROYER];
    
    positionElements.forEach((positionElement, index) => {
        const shipType = shipTypes[index];
        
        const horizontal = document.createElement('div');
        horizontal.className = 'horizontal';
        horizontal.addEventListener('click', () => {
            const result = selectShip(shipType);
            if (result.success) {
                setOrientation(ORIENTATIONS.HORIZONTAL);
                showNotification(`${shipType} selected - Horizontal`);
            } else {
                showNotification(result.message);
            }
        });
        positionElement.appendChild(horizontal);

        const vertical = document.createElement('div');
        vertical.className = 'vertical';
        vertical.addEventListener('click', () => {
            const result = selectShip(shipType);
            if (result.success) {
                setOrientation(ORIENTATIONS.VERTICAL);
                showNotification(`${shipType} selected - Vertical`);
            } else {
                showNotification(result.message);
            }
        });
        positionElement.appendChild(vertical);
    });
}

function handlePlayerPlacement(row, col) {
    if (gameStarted) return;
    
    const result = placeShip(row, col);
    
    if (result.success) {
        updateBoardUI();
        showNotification(result.message);
        checkAllShipsPlaced();
    } else {
        showNotification(result.message);
    }
}

function updateBoardUI() {
    for (let row = 0; row < BOARD_SIZE; row++) {
        for (let col = 0; col < BOARD_SIZE; col++) {
            const cellState = getCellState(gameState.playerMatrix, row, col);
            const grid = document.getElementById(`${row},${col},player`);
            
            if (cellState === CELL_STATES.SHIP) {
                grid.classList.add('selected');
            }
        }
    }
}

function checkAllShipsPlaced() {
    const availableShips = getAvailableShips();
    const allPlaced = Object.values(availableShips).every(count => count === 0);
    
    if (allPlaced) {
        showNotification('All ships placed! Click "Start Game" to begin.');
    }
}

function startGame() {
    if (gameStarted) return;
    
    const availableShips = getAvailableShips();
    const allPlaced = Object.values(availableShips).every(count => count === 0);
    
    if (!allPlaced) {
        showNotification('Place all ships before starting the game');
        return;
    }
    
    gameStarted = true;
    gameState.gameStarted = true;
    
    placePCShipsRandomly();
    renderBoard('boardAttack', 'enemy');
    
    document.getElementById('button').disabled = true;
    showNotification('Game started! Your turn to shoot.');
}

function placePCShipsRandomly() {
    const shipTypes = [SHIP_TYPES.CARRIER, SHIP_TYPES.BATTLESHIP, SHIP_TYPES.SUBMARINE, SHIP_TYPES.DESTROYER];
    const orientations = [ORIENTATIONS.HORIZONTAL, ORIENTATIONS.VERTICAL];
    
    shipTypes.forEach(shipType => {
        const size = SHIP_CONFIGS[shipType].size;
        let placed = false;
        
        while (!placed) {
            const orientation = orientations[Math.floor(Math.random() * orientations.length)];
            const row = Math.floor(Math.random() * BOARD_SIZE);
            const col = Math.floor(Math.random() * BOARD_SIZE);
            
            if (validatePCPlacement(row, col, size, orientation)) {
                placePCShip(row, col, size, orientation);
                placed = true;
            }
        }
    });
}

function validatePCPlacement(row, col, size, orientation) {
    if (orientation === ORIENTATIONS.HORIZONTAL) {
        if (col + size > BOARD_SIZE) return false;
        for (let c = col; c < col + size; c++) {
            if (getCellState(gameState.enemyMatrix, row, c) !== CELL_STATES.EMPTY) {
                return false;
            }
        }
    } else {
        if (row + size > BOARD_SIZE) return false;
        for (let r = row; r < row + size; r++) {
            if (getCellState(gameState.enemyMatrix, r, col) !== CELL_STATES.EMPTY) {
                return false;
            }
        }
    }
    return true;
}

function placePCShip(row, col, size, orientation) {
    if (orientation === ORIENTATIONS.HORIZONTAL) {
        for (let c = col; c < col + size; c++) {
            setCellState(gameState.enemyMatrix, row, c, CELL_STATES.SHIP);
        }
    } else {
        for (let r = row; r < row + size; r++) {
            setCellState(gameState.enemyMatrix, r, col, CELL_STATES.SHIP);
        }
    }
}

function handlePlayerShot(row, col) {
    const shotResult = executeShot(gameState.enemyMatrix, row, col);
    
    if (!shotResult.success) {
        showNotification(shotResult.message);
        return;
    }
    
    const grid = document.getElementById(`${row},${col},enemy`);
    
    if (shotResult.result === 'hit') {
        grid.classList.add('hit');
        showNotification('Hit! You can shoot again.');
        
        const hitShip = findShipAtPosition(gameState.enemyShips, row, col);
        if (hitShip) {
            applyDamageToShip(hitShip, row, col);
            if (isShipSunk(hitShip)) {
                showNotification(`Enemy ${hitShip.type} sunk!`);
            }
        }
        
        checkGameWinner();
    } else if (shotResult.result === 'miss') {
        grid.classList.add('miss');
        showNotification('Miss! PC\'s turn.');
        setTimeout(handlePCShot, 1000);
    }
}

function handlePCShot() {
    let isPCTurn = true;
    
    function executePCShot() {
        if (!isPCTurn || !gameStarted) return;
        
        let row, col;
        let validShot = false;
        
        while (!validShot) {
            row = Math.floor(Math.random() * BOARD_SIZE);
            col = Math.floor(Math.random() * BOARD_SIZE);
            const validation = validateShot(gameState.playerMatrix, row, col);
            
            if (validation.valid) {
                validShot = true;
            }
        }
        
        const shotResult = executeShot(gameState.playerMatrix, row, col);
        const grid = document.getElementById(`${row},${col},player`);
        
        if (shotResult.result === 'hit') {
            grid.classList.add('hit');
            showNotification('PC hit your ship!');
            
            const hitShip = findShipAtPosition(gameState.playerShips, row, col);
            if (hitShip) {
                applyDamageToShip(hitShip, row, col);
                if (isShipSunk(hitShip)) {
                    showNotification(`Your ${hitShip.type} was sunk!`);
                }
            }
            
            checkGameWinner();
            
            if (gameStarted) {
                setTimeout(executePCShot, 1000);
            }
        } else if (shotResult.result === 'miss') {
            grid.classList.add('miss');
            showNotification('PC missed. Your turn.');
            isPCTurn = false;
        }
    }
    
    executePCShot();
}

function checkGameWinner() {
    const result = checkWinner(gameState.playerShips, gameState.enemyShips);
    
    if (result.gameOver) {
        gameStarted = false;
        gameState.gameStarted = false;
        const message = getVictoryMessage(result.winner);
        showNotification(message);
    }
}

document.addEventListener('DOMContentLoaded', initializeGame);

window.startGame = startGame;
