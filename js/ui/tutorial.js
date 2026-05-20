/**
 * tutorial.js — Interactive how-to-play overlay for the main menu (UI only).
 */

const OVERLAY_ID = 'tutorial-overlay';
const TOTAL_STEPS = 5;

const TUTORIAL_STEPS = [
    {
        title: 'Objetivo del juego',
        tag: 'Misión',
        body: `
            <p>Tu misión es <strong>localizar y hundir toda la flota enemiga</strong> antes de que el adversario destruya la tuya.</p>
            <p>Cada disparo acertado revela parte de un barco. Cuando todas las casillas de una nave quedan impactadas, queda <strong>hundida</strong>.</p>
        `,
        visual: `
            <div class="tutorial-visual tutorial-visual--objective" aria-hidden="true">
                <div class="tutorial-mini-board">
                    <span class="tutorial-cell tutorial-cell--ship"></span>
                    <span class="tutorial-cell tutorial-cell--ship"></span>
                    <span class="tutorial-cell tutorial-cell--hit"></span>
                    <span class="tutorial-cell"></span>
                    <span class="tutorial-cell tutorial-cell--hit"></span>
                    <span class="tutorial-cell tutorial-cell--ship"></span>
                    <span class="tutorial-cell"></span>
                    <span class="tutorial-cell tutorial-cell--miss"></span>
                    <span class="tutorial-cell tutorial-cell--hit"></span>
                </div>
                <p class="tutorial-visual__caption">Impacta todas las casillas de cada barco enemigo</p>
            </div>
        `
    },
    {
        title: 'Colocación de barcos',
        tag: 'Preparación',
        body: `
            <p>Antes de la batalla, coloca tu flota en <strong>Tu flota</strong>:</p>
            <ul class="tutorial-list">
                <li>Selecciona una nave y su orientación (↔ / ↕ o tecla <kbd>R</kbd>).</li>
                <li>Haz clic en el tablero para colocarla, o usa <em>Colocación aleatoria</em>.</li>
                <li>Repite hasta colocar todas las naves requeridas.</li>
            </ul>
            <p class="tutorial-note">Tras pulsar <strong>Iniciar batalla</strong>, las posiciones quedan <strong>bloqueadas</strong> y ya no podrás moverlas.</p>
        `,
        visual: `
            <div class="tutorial-visual tutorial-visual--placement" aria-hidden="true">
                <div class="tutorial-mini-board tutorial-mini-board--placement">
                    <span class="tutorial-cell tutorial-cell--ship"></span>
                    <span class="tutorial-cell tutorial-cell--ship"></span>
                    <span class="tutorial-cell tutorial-cell--ship"></span>
                    <span class="tutorial-cell tutorial-cell--preview"></span>
                    <span class="tutorial-cell"></span>
                    <span class="tutorial-cell"></span>
                    <span class="tutorial-cell"></span>
                    <span class="tutorial-cell"></span>
                    <span class="tutorial-cell"></span>
                </div>
                <span class="tutorial-chip">↔ Orientación</span>
                <span class="tutorial-chip tutorial-chip--accent">Clic para colocar</span>
            </div>
        `
    },
    {
        title: 'Inicio del juego',
        tag: 'Combate',
        body: `
            <p>Cuando tu flota esté lista, pulsa <strong>Iniciar batalla</strong> (o <em>Listo Jugador 1</em> en modo 2 jugadores).</p>
            <p>En ese momento comienza el combate: se activa el tablero de <strong>Ataque</strong> y los turnos alternados.</p>
        `,
        visual: `
            <div class="tutorial-visual tutorial-visual--start" aria-hidden="true">
                <button type="button" class="tutorial-fake-btn" tabindex="-1">Iniciar batalla</button>
                <p class="tutorial-visual__caption">El botón de juego solo está disponible con la flota completa</p>
            </div>
        `
    },
    {
        title: 'Sistema de disparos',
        tag: 'Ataque',
        body: `
            <p>En tu turno, haz clic en una casilla del tablero enemigo (<strong>Ataque</strong>) para disparar.</p>
            <p>El tablero te devuelve feedback inmediato:</p>
        `,
        visual: `
            <div class="tutorial-visual tutorial-visual--shots" aria-hidden="true">
                <div class="tutorial-shot-demo">
                    <div class="tutorial-shot-demo__item">
                        <span class="tutorial-cell tutorial-cell--miss tutorial-cell--lg"></span>
                        <span><strong>Agua</strong> — disparo fallido</span>
                    </div>
                    <div class="tutorial-shot-demo__item">
                        <span class="tutorial-cell tutorial-cell--hit tutorial-cell--lg"></span>
                        <span><strong>Impacto</strong> — tocaste un barco</span>
                    </div>
                </div>
            </div>
        `
    },
    {
        title: 'Condición de victoria',
        tag: 'Victoria',
        body: `
            <p>La partida termina cuando <strong>todos los barcos</strong> de un bando han sido hundidos.</p>
            <p>El jugador (o equipo) que conserve flota en pie gana la batalla. En modo vs PC, vence quien destruya primero la flota rival.</p>
        `,
        visual: `
            <div class="tutorial-visual tutorial-visual--victory" aria-hidden="true">
                <div class="tutorial-victory-icon" aria-hidden="true">⚓</div>
                <p class="tutorial-visual__caption">Flota enemiga hundida = victoria</p>
            </div>
        `
    }
];

let overlayEl = null;
let currentStep = 0;
let isOpen = false;
let keyHandler = null;

/**
 * Builds overlay DOM once and wires controls.
 */
export function initTutorial() {
    if (document.getElementById(OVERLAY_ID)) {
        overlayEl = document.getElementById(OVERLAY_ID);
        wireControls();
        return;
    }

    overlayEl = document.createElement('div');
    overlayEl.id = OVERLAY_ID;
    overlayEl.className = 'tutorial-overlay hidden';
    overlayEl.setAttribute('role', 'dialog');
    overlayEl.setAttribute('aria-modal', 'true');
    overlayEl.setAttribute('aria-labelledby', 'tutorial-title');
    overlayEl.setAttribute('aria-hidden', 'true');

    overlayEl.innerHTML = `
        <div class="tutorial-overlay__backdrop" data-tutorial-backdrop></div>
        <div class="tutorial-overlay__panel">
            <header class="tutorial-overlay__header">
                <span class="tutorial-overlay__tag" id="tutorial-tag"></span>
                <h2 class="tutorial-overlay__title" id="tutorial-title"></h2>
                <p class="tutorial-overlay__progress" id="tutorial-progress" aria-live="polite"></p>
            </header>
            <div class="tutorial-overlay__body" id="tutorial-body"></div>
            <nav class="tutorial-overlay__nav" aria-label="Navegación del tutorial">
                <button type="button" id="tutorial-prev" class="btn btn-outline-secondary">Atrás</button>
                <button type="button" id="tutorial-next" class="btn btn-primary">Siguiente</button>
                <button type="button" id="tutorial-exit" class="btn btn-outline-light">Salir al menú</button>
            </nav>
        </div>
    `;

    document.body.appendChild(overlayEl);
    wireControls();
}

function wireControls() {
    document.getElementById('tutorial-prev')?.addEventListener('click', () => goToStep(currentStep - 1));
    document.getElementById('tutorial-next')?.addEventListener('click', onNextClick);
    document.getElementById('tutorial-exit')?.addEventListener('click', () => closeTutorial());
    overlayEl?.querySelector('[data-tutorial-backdrop]')?.addEventListener('click', () => closeTutorial());
}

function onNextClick() {
    if (currentStep >= TOTAL_STEPS - 1) {
        closeTutorial();
        return;
    }
    goToStep(currentStep + 1);
}

function goToStep(index) {
    currentStep = Math.max(0, Math.min(TOTAL_STEPS - 1, index));
    renderStep(currentStep);
}

function renderStep(index) {
    const step = TUTORIAL_STEPS[index];
    if (!step || !overlayEl) return;

    const tagEl = document.getElementById('tutorial-tag');
    const titleEl = document.getElementById('tutorial-title');
    const progressEl = document.getElementById('tutorial-progress');
    const bodyEl = document.getElementById('tutorial-body');
    const prevBtn = document.getElementById('tutorial-prev');
    const nextBtn = document.getElementById('tutorial-next');

    if (tagEl) tagEl.textContent = step.tag;
    if (titleEl) titleEl.textContent = step.title;
    if (progressEl) progressEl.textContent = `Paso ${index + 1} de ${TOTAL_STEPS}`;
    if (bodyEl) {
        bodyEl.innerHTML = `
            <div class="tutorial-step__text">${step.body}</div>
            ${step.visual || ''}
        `;
    }

    if (prevBtn) {
        prevBtn.disabled = index === 0;
        prevBtn.setAttribute('aria-disabled', index === 0 ? 'true' : 'false');
    }
    if (nextBtn) {
        const isLast = index === TOTAL_STEPS - 1;
        nextBtn.textContent = isLast ? 'Entendido' : 'Siguiente';
        nextBtn.setAttribute('aria-label', isLast ? 'Cerrar tutorial' : 'Siguiente paso');
    }

    overlayEl.dataset.step = String(index + 1);
}

function lockMenuInteraction(lock) {
    const mainMenu = document.getElementById('main-menu');
    if (mainMenu) {
        mainMenu.classList.toggle('main-menu--tutorial-locked', lock);
        if (lock) mainMenu.setAttribute('inert', '');
        else mainMenu.removeAttribute('inert');
    }
    document.body.classList.toggle('tutorial-open', lock);
}

function attachKeyboard() {
    detachKeyboard();
    keyHandler = (e) => {
        if (!isOpen) return;
        if (e.key === 'Escape') {
            e.preventDefault();
            closeTutorial();
            return;
        }
        if (e.key === 'ArrowRight' && currentStep < TOTAL_STEPS - 1) {
            e.preventDefault();
            goToStep(currentStep + 1);
        }
        if (e.key === 'ArrowLeft' && currentStep > 0) {
            e.preventDefault();
            goToStep(currentStep - 1);
        }
    };
    document.addEventListener('keydown', keyHandler);
}

function detachKeyboard() {
    if (keyHandler) {
        document.removeEventListener('keydown', keyHandler);
        keyHandler = null;
    }
}

/**
 * Opens the tutorial overlay on top of the main menu.
 */
export function openTutorial() {
    if (!overlayEl) initTutorial();
    if (!overlayEl || isOpen) return;

    currentStep = 0;
    renderStep(0);
    isOpen = true;

    overlayEl.classList.remove('hidden');
    overlayEl.setAttribute('aria-hidden', 'false');
    lockMenuInteraction(true);
    attachKeyboard();

    const exitBtn = document.getElementById('tutorial-exit');
    exitBtn?.focus();
}

/**
 * Closes the tutorial and restores menu interaction.
 */
export function closeTutorial() {
    if (!overlayEl) return;

    isOpen = false;
    overlayEl.classList.add('hidden');
    overlayEl.setAttribute('aria-hidden', 'true');
    lockMenuInteraction(false);
    detachKeyboard();

    currentStep = 0;
    overlayEl.dataset.step = '';
    document.getElementById('tutorial-body')?.replaceChildren();

    const menuBtn = document.getElementById('menu-tutorial-btn');
    if (menuBtn && document.getElementById('main-menu') && !document.getElementById('main-menu').classList.contains('hidden')) {
        menuBtn.focus();
    }
}

export function isTutorialOpen() {
    return isOpen;
}
