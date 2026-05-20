/**
 * shipSprites.js — Cascos 2D alineados 1:1 con la grid.
 * Los PNG en assets/ships/ están en orientación VERTICAL (proa arriba).
 */

const SHIP_HULL_SRC = {
    carrier: 'assets/ships/ShipCarrierHull.png',
    battleship: 'assets/ships/ShipBattleshipHull.png',
    submarine: 'assets/ships/ShipSubMarineHull.png',
    destroyer: 'assets/ships/ShipDestroyerHull.png',
    cruiser: 'assets/ships/ShipCruiserHull.png'
};

/** Celdas por tipo — igual que ShipPlacement en main.js */
const SHIP_LENGTH_BY_TYPE = {
    carrier: 5,
    battleship: 4,
    submarine: 3,
    destroyer: 2,
    cruiser: 3
};

const LAYER_CLASS = 'ship-sprites-layer';
const SPRITE_CLASS = 'ship-sprite';
const PREVIEW_CLASS = 'ship-sprite--preview';
const GRID_ROOT_CLASS = 'board-grid';

/** @type {WeakMap<HTMLElement, { boardType: string, getPlacedShips: () => Array }>} */
const boardRegistry = new WeakMap();

function getHullSrc(shipType) {
    return SHIP_HULL_SRC[shipType] || SHIP_HULL_SRC.destroyer;
}

function getShipDisplayLength(shipType, cellCount) {
    return SHIP_LENGTH_BY_TYPE[shipType] ?? cellCount;
}

export function getGridMetrics() {
    const root = getComputedStyle(document.documentElement);
    const cellSize = parseFloat(root.getPropertyValue('--cell-size')) || 36;
    const gap = parseFloat(root.getPropertyValue('--board-gap')) || 2;
    const labelSize = parseFloat(root.getPropertyValue('--label-size')) || 22;
    const step = cellSize + gap;

    return { cellSize, gap, labelSize, step };
}

export function inferShipOrientation(cells) {
    if (!cells?.length) return 'horizontal';
    const rows = new Set(cells.map((c) => c.row));
    return rows.size === 1 ? 'horizontal' : 'vertical';
}

export function getShipAnchor(cells, orientationHint) {
    const row = Math.min(...cells.map((c) => c.row));
    const col = Math.min(...cells.map((c) => c.col));
    const length = cells.length;
    const orientation = orientationHint || inferShipOrientation(cells);
    return { row, col, length, orientation };
}

export function computeShipSpanPx(length) {
    const { cellSize, gap } = getGridMetrics();
    return length * cellSize + (length - 1) * gap;
}

export function computeSpriteRect(row, col, length, orientation) {
    const { cellSize, step } = getGridMetrics();
    const span = computeShipSpanPx(length);
    const inset = getSpriteInset();

    const x = col * step + inset;
    const y = row * step + inset;

    if (orientation === 'horizontal') {
        return {
            x,
            y,
            width: span - inset * 2,
            height: cellSize - inset * 2,
            orientation: 'horizontal',
            span
        };
    }

    return {
        x,
        y,
        width: cellSize - inset * 2,
        height: span - inset * 2,
        orientation: 'vertical',
        span
    };
}

function getSpriteInset() {
    const { cellSize } = getGridMetrics();
    return Math.max(2, Math.round(cellSize * 0.06));
}

function canShowHullSprites(board) {
    return board?.showHullSprites !== false && board?.boardElement?.id !== 'boardAttack';
}

function isShipVisible(shipRecord, boardType, showHullSprites) {
    if (!showHullSprites) return false;
    return shipRecord.cells.some(({ row, col }) => {
        const cell = document.getElementById(`${row},${col},${boardType}`);
        return cell?.classList.contains('selected');
    });
}

function getBoardElement(boardType) {
    if (boardType === 'pc') {
        return document.getElementById('boardAttack');
    }
    return (
        document.querySelector(`.game-board--${boardType}`) ||
        document.getElementById('board')
    );
}

function getGridRoot(boardElement) {
    return boardElement.querySelector(`.${GRID_ROOT_CLASS}`) || boardElement;
}

function ensureSpritesLayer(boardElement) {
    boardElement.classList.add('game-board--ship-sprites');
    const gridRoot = getGridRoot(boardElement);
    let layer = gridRoot.querySelector(`.${LAYER_CLASS}`);

    if (!layer) {
        layer = document.createElement('div');
        layer.className = LAYER_CLASS;
        layer.setAttribute('aria-hidden', 'true');
        gridRoot.insertBefore(layer, gridRoot.firstChild);
    }

    return layer;
}

/**
 * PNG vertical: grid vertical sin rotar; grid horizontal rota 90°.
 * Longitud visual = SHIP_LENGTH_BY_TYPE (carrier siempre 5 celdas).
 */
function applySpriteGeometry(spriteEl, cells, shipType, orientationHint) {
    const anchor = getShipAnchor(cells, orientationHint);
    const length = getShipDisplayLength(shipType, anchor.length);
    const rect = computeSpriteRect(anchor.row, anchor.col, length, anchor.orientation);

    spriteEl.style.left = `${rect.x}px`;
    spriteEl.style.top = `${rect.y}px`;
    spriteEl.style.width = `${rect.width}px`;
    spriteEl.style.height = `${rect.height}px`;
    spriteEl.style.zIndex = String(1 + anchor.row);

    spriteEl.classList.remove('ship-sprite--grid-h', 'ship-sprite--grid-v');
    spriteEl.classList.add(
        anchor.orientation === 'horizontal' ? 'ship-sprite--grid-h' : 'ship-sprite--grid-v'
    );

    Object.keys(SHIP_LENGTH_BY_TYPE).forEach((type) => {
        spriteEl.classList.toggle(`ship-sprite--${type}`, type === shipType);
    });

    const inner = spriteEl.querySelector('.ship-sprite__inner');
    const img = spriteEl.querySelector('.ship-sprite__img');
    if (!inner || !img) return;

    inner.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;box-sizing:border-box;';
    img.style.cssText = '';

    if (anchor.orientation === 'horizontal') {
        inner.style.display = 'flex';
        inner.style.alignItems = 'center';
        inner.style.justifyContent = 'center';
        inner.style.overflow = 'visible';

        img.style.width = `${rect.height}px`;
        img.style.height = `${rect.width}px`;
        img.style.maxWidth = 'none';
        img.style.maxHeight = 'none';
        img.style.flexShrink = '0';
        img.style.objectFit = 'fill';
        img.style.transform = 'rotate(90deg)';
        img.style.transformOrigin = 'center center';
    } else {
        inner.style.display = 'block';
        inner.style.overflow = 'hidden';
        img.style.width = '100%';
        img.style.height = '100%';
        img.style.objectFit = 'fill';
        img.style.objectPosition = 'center center';
    }
}

function createSpriteElement(shipType, id) {
    const spriteEl = document.createElement('div');
    spriteEl.id = id;
    spriteEl.className = SPRITE_CLASS;

    const inner = document.createElement('div');
    inner.className = 'ship-sprite__inner';

    const img = document.createElement('img');
    img.className = 'ship-sprite__img';
    img.alt = '';
    img.draggable = false;
    img.loading = 'eager';
    img.src = getHullSrc(shipType);

    inner.appendChild(img);
    spriteEl.appendChild(inner);
    return spriteEl;
}

function upsertShipSprite(layer, board, shipRecord, index) {
    const { boardType } = board;
    const visible = isShipVisible(shipRecord, boardType, canShowHullSprites(board));
    const id = `ship-sprite-${boardType}-${index}`;
    let spriteEl = document.getElementById(id);

    if (spriteEl && spriteEl.parentElement !== layer) {
        spriteEl = null;
    }

    if (!visible || !shipRecord.cells?.length) {
        spriteEl?.remove();
        return;
    }

    if (!spriteEl) {
        spriteEl = createSpriteElement(shipRecord.type, id);
        layer.appendChild(spriteEl);
    } else {
        const img = spriteEl.querySelector('.ship-sprite__img');
        if (img) img.src = getHullSrc(shipRecord.type);
    }

    spriteEl.classList.toggle('ship-sprite--sunk', !!shipRecord.sunk);
    applySpriteGeometry(spriteEl, shipRecord.cells, shipRecord.type, shipRecord.orientation);
}

export function syncBoardShipSprites(board) {
    if (!board?.boardElement) return;

    const { boardElement, boardType, placedShips = [] } = board;

    if (!canShowHullSprites(board)) {
        clearBoardShipSprites(boardElement);
        boardRegistry.delete(boardElement);
        return;
    }

    const layer = ensureSpritesLayer(boardElement);

    boardRegistry.set(boardElement, {
        boardType,
        getPlacedShips: () => board.placedShips || [],
        showHullSprites: true
    });

    const usedIds = new Set();

    placedShips.forEach((shipRecord, index) => {
        upsertShipSprite(layer, board, shipRecord, index);
        usedIds.add(`ship-sprite-${boardType}-${index}`);
    });

    layer.querySelectorAll(`.${SPRITE_CLASS}:not(.${PREVIEW_CLASS})`).forEach((el) => {
        if (!usedIds.has(el.id)) {
            el.remove();
        }
    });
}

export function notifyShipPlaced(board) {
    if (!canShowHullSprites(board)) return;
    syncBoardShipSprites(board);
}

export function clearBoardShipSprites(boardElement) {
    if (!boardElement) return;
    boardElement.classList.remove('game-board--ship-sprites');
    boardElement.querySelector(`.${LAYER_CLASS}`)?.remove();
    boardRegistry.delete(boardElement);
}

export function refreshAllBoardShipSprites() {
    document.querySelectorAll('.game-board--ship-sprites').forEach((boardElement) => {
        const meta = boardRegistry.get(boardElement);
        if (!meta || meta.showHullSprites === false) return;
        if (boardElement.id === 'boardAttack') return;
        const placedShips = meta.getPlacedShips();
        if (!placedShips?.length) return;
        syncBoardShipSprites({
            boardElement,
            boardType: meta.boardType,
            placedShips,
            showHullSprites: true
        });
    });
}

export function updatePlacementPreviewSprite(boardType, cells, shipType, isValid) {
    const boardElement = getBoardElement(boardType);
    if (!boardElement || !cells?.length || !shipType) return;

    const layer = ensureSpritesLayer(boardElement);
    let preview = layer.querySelector(`.${PREVIEW_CLASS}`);

    if (!preview) {
        preview = createSpriteElement(shipType, `ship-sprite-preview-${boardType}`);
        preview.classList.add(PREVIEW_CLASS);
        layer.appendChild(preview);
    } else {
        const img = preview.querySelector('.ship-sprite__img');
        if (img) img.src = getHullSrc(shipType);
    }

    preview.classList.toggle('ship-sprite--preview-invalid', !isValid);
    const orientation = inferShipOrientation(cells);
    applySpriteGeometry(preview, cells, shipType, orientation);
}

export function clearPlacementPreviewSprite(boardType) {
    const boardElement = getBoardElement(boardType);
    const gridRoot = boardElement ? getGridRoot(boardElement) : null;
    gridRoot?.querySelector(`.${PREVIEW_CLASS}`)?.remove();
}

export function initShipSpriteScaling() {
    Object.values(SHIP_HULL_SRC).forEach((src) => {
        const img = new Image();
        img.src = src;
    });
}
