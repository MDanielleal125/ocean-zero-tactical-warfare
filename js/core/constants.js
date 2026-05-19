export const BOARD_SIZE = 10;

export const CELL_STATES = {
    EMPTY: 'empty',
    SHIP: 'ship',
    HIT: 'hit',
    MISS: 'miss'
};

export const SHIP_TYPES = {
    CARRIER: 'carrier',
    BATTLESHIP: 'battleship',
    SUBMARINE: 'submarine',
    DESTROYER: 'destroyer'
};

export const SHIP_CONFIGS = {
    [SHIP_TYPES.CARRIER]: {
        size: 5,
        quantity: 1
    },
    [SHIP_TYPES.BATTLESHIP]: {
        size: 4,
        quantity: 1
    },
    [SHIP_TYPES.SUBMARINE]: {
        size: 3,
        quantity: 1
    },
    [SHIP_TYPES.DESTROYER]: {
        size: 2,
        quantity: 1
    }
};

export const ORIENTATIONS = {
    HORIZONTAL: 'horizontal',
    VERTICAL: 'vertical'
};
