/**
 * backgroundBattle.js
 * Immersive naval ocean background for the game screen (#game-app).
 * Visual layer only — does not affect board colors or game logic.
 */

const GAME_APP_ID = 'game-app';
const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const BUBBLE_COUNT = REDUCED_MOTION ? 8 : 22;

/**
 * @param {string} appId
 * @returns {{ resume: () => void, pause: () => void, destroy: () => void } | null}
 */
export function initBattleGameBackground(appId = GAME_APP_ID) {
    const app = document.getElementById(appId);
    if (!app) return null;

    let root = app.querySelector('[data-battle-bg]');
    if (!root) {
        root = buildBackgroundLayers(app);
    }

    const instance = new BattleGameBackground(app, root);
    instance.attach();
    return instance;
}

function buildBackgroundLayers(app) {
    const root = document.createElement('div');
    root.className = 'battle-bg';
    root.setAttribute('data-battle-bg', '');
    root.setAttribute('aria-hidden', 'true');

    root.innerHTML = `
        <div class="battle-bg__depth battle-bg__layer"></div>
        <div class="battle-bg__waves battle-bg__layer">
            <div class="battle-bg__wave battle-bg__wave--1"></div>
            <div class="battle-bg__wave battle-bg__wave--2"></div>
            <div class="battle-bg__wave battle-bg__wave--3"></div>
            <div class="battle-bg__wave battle-bg__wave--4"></div>
        </div>
        <canvas class="battle-bg__canvas" aria-hidden="true"></canvas>
        <div class="battle-bg__bubbles battle-bg__layer" aria-hidden="true"></div>
        <div class="battle-bg__silhouettes battle-bg__layer" aria-hidden="true">
            <div class="battle-bg__ship battle-bg__ship--1"></div>
            <div class="battle-bg__ship battle-bg__ship--2"></div>
            <div class="battle-bg__ship battle-bg__ship--3"></div>
        </div>
        <div class="battle-bg__shimmer battle-bg__layer" aria-hidden="true"></div>
        <div class="battle-bg__smoke battle-bg__layer" aria-hidden="true"></div>
        <div class="battle-bg__flash" aria-hidden="true"></div>
        <div class="battle-bg__overlay"></div>
        <div class="battle-bg__vignette"></div>
    `;

    app.insertBefore(root, app.firstChild);
    seedBubbles(root.querySelector('.battle-bg__bubbles'));
    return root;
}

function seedBubbles(layer) {
    if (!layer) return;
    const parts = [];
    for (let i = 0; i < BUBBLE_COUNT; i++) {
        const left = 4 + Math.random() * 92;
        const size = 3 + Math.random() * 7;
        const delay = Math.random() * 12;
        const duration = 14 + Math.random() * 18;
        const drift = (Math.random() - 0.5) * 30;
        parts.push(
            `<span class="battle-bg__bubble" style="left:${left}%;width:${size}px;height:${size}px;animation-delay:${delay}s;animation-duration:${duration}s;--bubble-drift:${drift}px"></span>`
        );
    }
    layer.innerHTML = parts.join('');
}

class BattleGameBackground {
    constructor(appEl, rootEl) {
        this.app = appEl;
        this.root = rootEl;
        this.canvas = rootEl.querySelector('.battle-bg__canvas');
        this.ctx = this.canvas.getContext('2d', { alpha: true });
        this.flashEl = rootEl.querySelector('.battle-bg__flash');

        this.running = false;
        this.rafId = 0;
        this.time = 0;
        this.lastFrame = 0;

        this.pointer = { nx: 0, ny: 0 };
        this.parallax = { x: 0, y: 0 };
        this.horizonEvents = [];
        this.nextHorizonEvent = 5 + Math.random() * 10;
        this.distantLights = [];
        this.nextLightAt = 3 + Math.random() * 5;

        this._onResize = () => this.resize();
        this._onPointerMove = (e) => this.handlePointerMove(e);
        this._onVisibility = () => this.syncRunningState();
        this.boundTick = (t) => this.tick(t);
    }

    attach() {
        this.resize();
        this.syncRunningState();

        window.addEventListener('resize', this._onResize);
        document.addEventListener('visibilitychange', this._onVisibility);
        this.app.addEventListener('pointermove', this._onPointerMove, { passive: true });

        this._observer = new MutationObserver(this._onVisibility);
        this._observer.observe(this.app, { attributes: true, attributeFilter: ['class'] });
    }

    resize() {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const rect = this.app.getBoundingClientRect();
        const w = Math.max(1, Math.floor(rect.width));
        const h = Math.max(1, Math.floor(rect.height));

        this.canvas.width = w * dpr;
        this.canvas.height = h * dpr;
        this.canvas.style.width = `${w}px`;
        this.canvas.style.height = `${h}px`;
        this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        this.width = w;
        this.height = h;
    }

    handlePointerMove(event) {
        const rect = this.app.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width;
        const y = (event.clientY - rect.top) / rect.height;
        const nx = (Math.max(0, Math.min(1, x)) - 0.5) * 2;
        const ny = (Math.max(0, Math.min(1, y)) - 0.5) * 2;

        this.pointer.nx = nx;
        this.pointer.ny = ny;

        const targetPx = nx * 18;
        const targetPy = ny * 12;
        this.parallax.x += (targetPx - this.parallax.x) * 0.08;
        this.parallax.y += (targetPy - this.parallax.y) * 0.08;

        this.root.style.setProperty('--parallax-x', `${this.parallax.x}px`);
        this.root.style.setProperty('--parallax-y', `${this.parallax.y}px`);
        this.root.style.setProperty('--parallax-deep-x', `${this.parallax.x * 1.4}px`);
        this.root.style.setProperty('--parallax-deep-y', `${this.parallax.y * 1.25}px`);
        this.root.style.setProperty('--pointer-x', `${(x * 100).toFixed(1)}%`);
        this.root.style.setProperty('--pointer-y', `${(y * 100).toFixed(1)}%`);
    }

    isVisible() {
        return !this.app.classList.contains('hidden');
    }

    syncRunningState() {
        if (this.isVisible() && !document.hidden) {
            this.resize();
            this.resume();
        } else {
            this.pause();
        }
    }

    resume() {
        if (this.running) return;
        this.running = true;
        this.rafId = requestAnimationFrame(this.boundTick);
    }

    pause() {
        this.running = false;
        if (this.rafId) cancelAnimationFrame(this.rafId);
        this.rafId = 0;
    }

    destroy() {
        this.pause();
        window.removeEventListener('resize', this._onResize);
        document.removeEventListener('visibilitychange', this._onVisibility);
        this.app.removeEventListener('pointermove', this._onPointerMove);
        this._observer?.disconnect();
    }

    tick(timestamp) {
        if (!this.running) return;
        const dt = Math.min(40, timestamp - (this.lastFrame || timestamp));
        this.lastFrame = timestamp;
        this.time += dt * 0.001;

        if (!REDUCED_MOTION) this.update(dt);
        this.draw();
        this.rafId = requestAnimationFrame(this.boundTick);
    }

    update(dt) {
        if (this.time >= this.nextHorizonEvent) {
            this.spawnHorizonEvent();
            this.nextHorizonEvent = this.time + 6 + Math.random() * 14;
        }

        this.horizonEvents.forEach(e => {
            e.life -= dt * 0.0006;
            e.size += dt * 0.025;
        });
        this.horizonEvents = this.horizonEvents.filter(e => e.life > 0);

        if (this.time >= this.nextLightAt) {
            this.distantLights.push({
                x: 0.1 + Math.random() * 0.8,
                y: 0.08 + Math.random() * 0.12,
                life: 1,
                phase: Math.random() * Math.PI * 2
            });
            this.nextLightAt = this.time + 4 + Math.random() * 8;
            if (this.distantLights.length > 4) this.distantLights.shift();
        }

        this.distantLights.forEach(l => { l.life -= dt * 0.0004; });
        this.distantLights = this.distantLights.filter(l => l.life > 0);
    }

    spawnHorizonEvent() {
        const x = 0.2 + Math.random() * 0.6;
        const y = 0.1 + Math.random() * 0.14;
        this.horizonEvents.push({
            x: x * this.width,
            y: y * this.height,
            life: 1,
            size: 4 + Math.random() * 10
        });

        if (this.flashEl && Math.random() > 0.65) {
            this.flashEl.classList.add('battle-bg__flash--active');
            window.setTimeout(() => {
                this.flashEl?.classList.remove('battle-bg__flash--active');
            }, 380);
        }
    }

    draw() {
        const ctx = this.ctx;
        const w = this.width;
        const h = this.height;
        const px = this.parallax.x;
        const py = this.parallax.y;

        ctx.clearRect(0, 0, w, h);
        this.drawCaustics(ctx, w, h, px, py);
        this.drawSurfaceWaves(ctx, w, h, px, py);
        this.drawHorizonEvents(ctx);
        this.drawDistantLights(ctx, w, h);
    }

    drawCaustics(ctx, w, h, px, py) {
        const baseY = h * 0.55 + py * 0.15;
        ctx.save();
        ctx.globalAlpha = 0.12 + Math.sin(this.time * 0.6) * 0.04;

        for (let band = 0; band < 4; band++) {
            const y = baseY + band * 22;
            ctx.beginPath();
            for (let x = 0; x <= w; x += 8) {
                const shimmer = Math.sin(x * 0.018 + this.time * 0.9 + band) * 2.5
                    + Math.sin(x * 0.04 - this.time * 0.5) * 1.2;
                if (x === 0) ctx.moveTo(x, y + shimmer);
                else ctx.lineTo(x, y + shimmer);
            }
            ctx.strokeStyle = `rgba(90, 170, 220, ${0.08 + band * 0.02})`;
            ctx.lineWidth = 1;
            ctx.stroke();
        }
        ctx.restore();
    }

    drawSurfaceWaves(ctx, w, h, px, py) {
        const layers = [
            { amp: 10, freq: 0.012, speed: 0.35, alpha: 0.1, y: h * 0.62, color: '70, 150, 210' },
            { amp: 14, freq: 0.008, speed: 0.25, alpha: 0.08, y: h * 0.7, color: '50, 120, 185' },
            { amp: 8, freq: 0.02, speed: 0.45, alpha: 0.12, y: h * 0.58, color: '100, 190, 235', stroke: true }
        ];

        layers.forEach((layer, li) => {
            ctx.beginPath();
            ctx.moveTo(0, h);
            for (let x = 0; x <= w; x += 8) {
                const y = layer.y + py * 0.08 * (li + 1) + px * 0.04 * li
                    + Math.sin(x * layer.freq + this.time * layer.speed + li) * layer.amp
                    + Math.sin(x * layer.freq * 1.8 + this.time * layer.speed * 1.2) * (layer.amp * 0.35);
                ctx.lineTo(x, y);
            }
            ctx.lineTo(w, h);
            ctx.closePath();

            if (layer.stroke) {
                ctx.strokeStyle = `rgba(${layer.color}, ${layer.alpha})`;
                ctx.lineWidth = 1.5;
                ctx.stroke();
            } else {
                const grad = ctx.createLinearGradient(0, layer.y - layer.amp, 0, h);
                grad.addColorStop(0, `rgba(${layer.color}, ${layer.alpha})`);
                grad.addColorStop(1, `rgba(${layer.color}, 0)`);
                ctx.fillStyle = grad;
                ctx.fill();
            }
        });
    }

    drawHorizonEvents(ctx) {
        this.horizonEvents.forEach(e => {
            const alpha = e.life * 0.35;
            const g = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, e.size * 2.5);
            g.addColorStop(0, `rgba(255, 180, 100, ${alpha})`);
            g.addColorStop(0.4, `rgba(255, 90, 50, ${alpha * 0.4})`);
            g.addColorStop(1, 'rgba(255, 60, 20, 0)');
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(e.x, e.y, e.size * 2.5, 0, Math.PI * 2);
            ctx.fill();
        });
    }

    drawDistantLights(ctx, w, h) {
        this.distantLights.forEach(l => {
            const x = l.x * w;
            const y = l.y * h;
            const pulse = 0.4 + Math.sin(this.time * 2 + l.phase) * 0.3;
            ctx.beginPath();
            ctx.arc(x, y, 2 + pulse, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 220, 140, ${l.life * pulse * 0.5})`;
            ctx.fill();
        });
    }
}
