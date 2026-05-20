/**
 * shotAnimation.js — Capa visual de disparos (Bloob.io style).
 * Usada por executeShot() para TODOS los atacantes (jugador, PC, PvP).
 */

import { playShotSound, playExplosionSound, playSplashSound } from './audio.js';

const MIN_DURATION_MS = 320;
const MAX_DURATION_MS = 780;
const SWAY_PX = 20;

let isProjectileActive = false;
let effectsLayer = null;

/** Orígenes visuales por tipo de atacante (mismo comportamiento para todos). */
const ORIGIN_BY_ATTACKER = {
    player: { selector: '#board .game-board, #board', anchor: 'bottom' },
    player1: { selector: '#board .game-board, #board', anchor: 'bottom' },
    player2: { selector: '#board .game-board, #board', anchor: 'bottom' },
    pc: { selector: '#boardAttack .game-board, #boardAttack', anchor: 'top' }
};

export function getIsProjectileActive() {
    return isProjectileActive;
}

export function setBoardsInputLocked(locked) {
    document.getElementById('game-app')?.classList.toggle('game-app--shot-locked', locked);
}

function getEffectsLayer() {
    if (!effectsLayer || !document.body.contains(effectsLayer)) {
        effectsLayer = document.createElement('div');
        effectsLayer.id = 'shot-effects-layer';
        effectsLayer.className = 'shot-effects-layer';
        effectsLayer.setAttribute('aria-hidden', 'true');
        document.body.appendChild(effectsLayer);
    }
    return effectsLayer;
}

const PLAYER_FLEET_BOARD_TYPES = ['player1', 'player', 'player2'];

function getCellCenter(row, col, boardType) {
    const types = boardType
        ? [boardType, ...PLAYER_FLEET_BOARD_TYPES.filter((t) => t !== boardType)]
        : PLAYER_FLEET_BOARD_TYPES;

    for (const type of types) {
        const cell = document.getElementById(`${row},${col},${type}`);
        if (!cell) continue;
        const rect = cell.getBoundingClientRect();
        return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    }
    return null;
}

function getBoardAnchor(selector, anchor) {
    const board = document.querySelector(selector);
    if (!board) return null;
    const rect = board.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    let y = rect.top + rect.height / 2;
    if (anchor === 'bottom') y = rect.bottom - Math.min(24, rect.height * 0.1);
    if (anchor === 'top') y = rect.top + Math.min(24, rect.height * 0.1);
    return { x, y };
}

function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/**
 * Resuelve origen y destino en pantalla para cualquier atacante.
 * @param {string} attackerId — 'player' | 'pc' | 'player1' | 'player2'
 * @param {number} targetRow
 * @param {number} targetCol
 * @param {string} targetBoardType
 */
export function resolveShotEndpoints(attackerId, targetRow, targetCol, targetBoardType) {
    const originCfg = ORIGIN_BY_ATTACKER[attackerId] || ORIGIN_BY_ATTACKER.player;
    const origin = getBoardAnchor(originCfg.selector, originCfg.anchor);
    const target = getCellCenter(targetRow, targetCol, targetBoardType);
    return { origin, target };
}

/**
 * Anima proyectil + impacto. No modifica el tablero.
 * @returns {Promise<void>}
 */
export function playShotVisual(attackerId, targetRow, targetCol, targetBoardType, isHit) {
    const { origin, target } = resolveShotEndpoints(attackerId, targetRow, targetCol, targetBoardType);

    if (!origin || !target) {
        console.warn('Shot visual skipped — missing endpoints', { attackerId, origin, target });
        return Promise.resolve();
    }

    console.log('Projectile started');

    const dx = target.x - origin.x;
    const dy = target.y - origin.y;
    const distance = Math.hypot(dx, dy);
    const duration = Math.min(MAX_DURATION_MS, Math.max(MIN_DURATION_MS, distance * 0.55));

    const layer = getEffectsLayer();
    const projectile = document.createElement('div');
    projectile.className = 'shot-projectile';
    layer.appendChild(projectile);

    const perpX = distance > 0 ? -dy / distance : 0;
    const perpY = distance > 0 ? dx / distance : 0;

    isProjectileActive = true;
    playShotSound();

    return new Promise(resolve => {
        const start = performance.now();

        const frame = (now) => {
            const t = Math.min(1, (now - start) / duration);
            const eased = easeInOutCubic(t);
            const sway = Math.sin(Math.PI * eased) * SWAY_PX;

            const x = origin.x + dx * eased + perpX * sway;
            const y = origin.y + dy * eased + perpY * sway * 0.35;
            const scale = 0.85 + Math.sin(Math.PI * eased) * 0.18;

            projectile.style.transform =
                `translate(${x}px, ${y}px) translate(-50%, -50%) scale(${scale})`;

            if (t < 1) {
                requestAnimationFrame(frame);
            } else {
                projectile.remove();
                spawnImpact(target.x, target.y, isHit);
                isProjectileActive = false;
                console.log('Projectile finished');
                resolve();
            }
        };

        requestAnimationFrame(frame);
    });
}

function spawnImpact(x, y, isHit) {
    const layer = getEffectsLayer();
    const burst = document.createElement('div');
    burst.className = isHit ? 'shot-impact shot-impact--hit' : 'shot-impact shot-impact--miss';
    burst.style.left = `${x}px`;
    burst.style.top = `${y}px`;
    layer.appendChild(burst);

    if (isHit) {
        playExplosionSound();
        spawnParticles(layer, x, y, 'shot-particle--hit', 10);
    } else {
        playSplashSound();
        spawnParticles(layer, x, y, 'shot-particle--miss', 8);
    }

    setTimeout(() => burst.remove(), isHit ? 520 : 480);
}

function spawnParticles(layer, x, y, className, count) {
    for (let i = 0; i < count; i++) {
        const p = document.createElement('span');
        p.className = `shot-particle ${className}`;
        const angle = (Math.PI * 2 * i) / count + Math.random() * 0.35;
        const dist = 10 + Math.random() * 26;
        p.style.left = `${x}px`;
        p.style.top = `${y}px`;
        p.style.setProperty('--shot-px', `${Math.cos(angle) * dist}px`);
        p.style.setProperty('--shot-py', `${Math.sin(angle) * dist}px`);
        layer.appendChild(p);
        setTimeout(() => p.remove(), 500 + Math.random() * 150);
    }
}
