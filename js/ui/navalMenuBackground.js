/**
 * navalMenuBackground.js
 * Cinematic naval warfare background for the main menu (canvas + CSS layers).
 */

import { playSonarPing } from './audio.js';

const MENU_ID = 'main-menu';
const COLS = 'ABCDEFGHIJ';
const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * @param {string} menuId
 * @returns {{ resume: () => void, pause: () => void, destroy: () => void } | null}
 */
export function initNavalMenuBackground(menuId = MENU_ID) {
    const menu = document.getElementById(menuId);
    if (!menu) return null;

    let bgRoot = menu.querySelector('[data-naval-bg]');
    if (!bgRoot) {
        bgRoot = buildBackgroundLayers(menu);
    } else {
        upgradeBackgroundLayers(bgRoot);
    }

    const instance = new NavalMenuBackground(menu, bgRoot);
    instance.attach();
    return instance;
}

function buildBackgroundLayers(menu) {
    const root = document.createElement('div');
    root.className = 'naval-bg';
    root.setAttribute('data-naval-bg', '');
    root.setAttribute('aria-hidden', 'true');

    root.innerHTML = `
        <canvas class="naval-bg__canvas" aria-hidden="true"></canvas>
        <div class="naval-bg__sky naval-bg__layer">
            <div class="naval-bg__cloud naval-bg__cloud--1"></div>
            <div class="naval-bg__cloud naval-bg__cloud--2"></div>
            <div class="naval-bg__cloud naval-bg__cloud--3"></div>
            <div class="naval-bg__cloud naval-bg__cloud--4"></div>
        </div>
        <div class="naval-bg__waves naval-bg__layer">
            <div class="naval-bg__wave naval-bg__wave--1"></div>
            <div class="naval-bg__wave naval-bg__wave--2"></div>
            <div class="naval-bg__wave naval-bg__wave--3"></div>
            <div class="naval-bg__wave naval-bg__wave--4"></div>
        </div>
        <div class="naval-bg__hud naval-bg__layer">
            <div class="naval-bg__hud-grid"></div>
            <div class="naval-bg__hud-corner naval-bg__hud-corner--tl"></div>
            <div class="naval-bg__hud-corner naval-bg__hud-corner--tr"></div>
            <div class="naval-bg__hud-corner naval-bg__hud-corner--bl"></div>
            <div class="naval-bg__hud-corner naval-bg__hud-corner--br"></div>
            <div class="naval-bg__hud-scan"></div>
        </div>
        <div class="naval-bg__coords naval-bg__layer"></div>
        <div class="naval-bg__flash" aria-hidden="true"></div>
        <div class="naval-bg__vignette"></div>
    `;

    menu.insertBefore(root, menu.firstChild);
    return root;
}

/** Adds cinematic layers to backgrounds created before v2. */
function upgradeBackgroundLayers(root) {
    if (!root.querySelector('.naval-bg__sky')) {
        const sky = document.createElement('div');
        sky.className = 'naval-bg__sky naval-bg__layer';
        sky.innerHTML = `
            <div class="naval-bg__cloud naval-bg__cloud--1"></div>
            <div class="naval-bg__cloud naval-bg__cloud--2"></div>
            <div class="naval-bg__cloud naval-bg__cloud--3"></div>
            <div class="naval-bg__cloud naval-bg__cloud--4"></div>
        `;
        const canvas = root.querySelector('.naval-bg__canvas');
        root.insertBefore(sky, canvas?.nextSibling || root.firstChild);
    }

    const waves = root.querySelector('.naval-bg__waves');
    if (waves && !waves.querySelector('.naval-bg__wave--4')) {
        waves.insertAdjacentHTML('beforeend', '<div class="naval-bg__wave naval-bg__wave--4"></div>');
    }

    if (!root.querySelector('.naval-bg__flash')) {
        const flash = document.createElement('div');
        flash.className = 'naval-bg__flash';
        flash.setAttribute('aria-hidden', 'true');
        const vignette = root.querySelector('.naval-bg__vignette');
        root.insertBefore(flash, vignette);
    }
}

function randomCoord() {
    const col = COLS[Math.floor(Math.random() * COLS.length)];
    const row = Math.floor(Math.random() * 10) + 1;
    return `${col}${row}`;
}

class NavalMenuBackground {
    constructor(menuEl, rootEl) {
        this.menu = menuEl;
        this.root = rootEl;
        this.canvas = rootEl.querySelector('.naval-bg__canvas');
        this.ctx = this.canvas.getContext('2d', { alpha: true });
        this.coordsLayer = rootEl.querySelector('.naval-bg__coords');
        this.flashEl = rootEl.querySelector('.naval-bg__flash');

        this.running = false;
        this.rafId = 0;
        this.time = 0;
        this.lastRippleAt = 0;

        this.pointer = { x: 0.5, y: 0.5, nx: 0, ny: 0 };
        this.radarAngle = 0;
        this.radarPulse = 0;
        this.parallax = { x: 0, y: 0 };

        this.ripples = [];
        this.pings = [];
        this.fogParticles = [];
        this.ships = [];
        this.radarBlips = [];
        this.horizonEvents = [];
        this.smokePuffs = [];
        this.lightning = { flash: 0, nextAt: 2 + Math.random() * 6 };
        this.nextHorizonEvent = 4 + Math.random() * 8;
        this.nextBlipAt = 1.5;

        this._onResize = () => this.resize();
        this._onPointerMove = (e) => this.handlePointerMove(e);
        this._onPointerDown = (e) => this.handlePointerDown(e);
        this._onVisibility = () => this.syncRunningState();
        this.boundTick = (t) => this.tick(t);
    }

    attach() {
        this.seedCoords();
        this.seedFog();
        this.seedShips();
        this.resize();
        this.wireMenuButtons();
        this.syncRunningState();

        window.addEventListener('resize', this._onResize);
        document.addEventListener('visibilitychange', this._onVisibility);
        this.menu.addEventListener('pointermove', this._onPointerMove, { passive: true });
        this.menu.addEventListener('pointerdown', this._onPointerDown, { passive: true });

        this._observer = new MutationObserver(this._onVisibility);
        this._observer.observe(this.menu, { attributes: true, attributeFilter: ['class'] });
    }

    wireMenuButtons() {
        this.menu.querySelectorAll('.btn').forEach(btn => {
            btn.addEventListener('mouseenter', () => {
                this.radarPulse = 1.2;
                this.menu.classList.add('menu-screen--radar-pulse');
            });
            btn.addEventListener('mouseleave', () => {
                this.menu.classList.remove('menu-screen--radar-pulse');
            });
        });
    }

    seedCoords() {
        if (!this.coordsLayer) return;
        const count = window.innerWidth < 768 ? 10 : 16;
        const fragments = [];

        for (let i = 0; i < count; i++) {
            const label = randomCoord();
            const left = 6 + Math.random() * 88;
            const top = 8 + Math.random() * 78;
            const delay = Math.random() * 8;
            const duration = 10 + Math.random() * 10;
            fragments.push(
                `<span class="naval-bg__coord" style="left:${left}%;top:${top}%;animation-delay:${delay}s;animation-duration:${duration}s">${label}</span>`
            );
        }

        this.coordsLayer.innerHTML = fragments.join('');
    }

    seedFog() {
        const count = REDUCED_MOTION ? 16 : 48;
        this.fogParticles = Array.from({ length: count }, () => ({
            x: Math.random(),
            y: Math.random() * 0.85,
            r: 1 + Math.random() * 4,
            speed: 0.015 + Math.random() * 0.035,
            alpha: 0.06 + Math.random() * 0.14,
            drift: (Math.random() - 0.5) * 0.0012
        }));
    }

    seedShips() {
        const configs = [
            { type: 'destroyer', depth: 0.85, speed: 0.000045, scale: 1.1, y: 0.58 },
            { type: 'carrier', depth: 0.55, speed: 0.000028, scale: 1.35, y: 0.52 },
            { type: 'submarine', depth: 0.95, speed: 0.000038, scale: 0.75, y: 0.68 },
            { type: 'destroyer', depth: 0.7, speed: 0.000052, scale: 0.95, y: 0.62 },
            { type: 'carrier', depth: 0.4, speed: 0.000022, scale: 1.15, y: 0.48 },
            { type: 'submarine', depth: 0.78, speed: 0.000042, scale: 0.85, y: 0.65 }
        ];

        if (REDUCED_MOTION) {
            this.ships = configs.slice(0, 3).map((c, i) => this.createShip(c, i, i % 2 === 0 ? 1 : -1));
            return;
        }

        this.ships = configs.map((c, i) => {
            const dir = i % 2 === 0 ? 1 : -1;
            return this.createShip(c, i, dir);
        });
    }

    createShip(config, index, dir) {
        return {
            ...config,
            x: dir > 0 ? -0.12 - index * 0.15 : 1.12 + index * 0.12,
            dir,
            phase: Math.random() * Math.PI * 2,
            bobPhase: Math.random() * Math.PI * 2,
            wake: []
        };
    }

    resize() {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const rect = this.menu.getBoundingClientRect();
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
        const rect = this.menu.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width;
        const y = (event.clientY - rect.top) / rect.height;

        this.pointer.x = Math.max(0, Math.min(1, x));
        this.pointer.y = Math.max(0, Math.min(1, y));
        this.pointer.nx = (this.pointer.x - 0.5) * 2;
        this.pointer.ny = (this.pointer.y - 0.5) * 2;

        const targetPx = this.pointer.nx * 42;
        const targetPy = this.pointer.ny * 32;
        this.parallax.x += (targetPx - this.parallax.x) * 0.1;
        this.parallax.y += (targetPy - this.parallax.y) * 0.1;

        this.root.style.setProperty('--parallax-x', `${this.parallax.x}px`);
        this.root.style.setProperty('--parallax-y', `${this.parallax.y}px`);
        this.root.style.setProperty('--parallax-deep-x', `${this.parallax.x * 1.35}px`);
        this.root.style.setProperty('--parallax-deep-y', `${this.parallax.y * 1.2}px`);
        this.root.style.setProperty('--pointer-x', `${this.pointer.x * 100}%`);
        this.root.style.setProperty('--pointer-y', `${this.pointer.y * 100}%`);

        const now = performance.now();
        if (!REDUCED_MOTION && now - this.lastRippleAt > 70) {
            this.lastRippleAt = now;
            const wx = this.pointer.x * this.width;
            const wy = this.pointer.y * this.height;
            for (let i = 0; i < 2; i++) {
                this.ripples.push({
                    x: wx + (Math.random() - 0.5) * 12,
                    y: wy + (Math.random() - 0.5) * 8,
                    r: i * 4,
                    maxR: 45 + Math.random() * 35,
                    alpha: 0.55 - i * 0.12,
                    lineWidth: 2 - i * 0.5
                });
            }
            if (this.ripples.length > 18) this.ripples.splice(0, this.ripples.length - 18);
        }
    }

    handlePointerDown(event) {
        if (!this.isVisible()) return;
        if (event.target.closest('.menu-screen__content')) return;

        const rect = this.menu.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        this.spawnPing(x, y, true);
        playSonarPing();
    }

    spawnPing(x, y, strong = false) {
        const maxR = Math.max(this.width, this.height) * (strong ? 0.55 : 0.45);
        const rings = strong ? 4 : 2;
        for (let i = 0; i < rings; i++) {
            this.pings.push({
                x,
                y,
                r: i * 12,
                maxR,
                alpha: strong ? 0.75 - i * 0.12 : 0.5,
                lineWidth: strong ? 3 - i * 0.5 : 2,
                fill: i === 0 && strong
            });
        }
        if (this.pings.length > 10) this.pings.splice(0, this.pings.length - 10);
        this.radarPulse = strong ? 1.4 : 1;
    }

    isVisible() {
        return !this.menu.classList.contains('hidden');
    }

    syncRunningState() {
        if (this.isVisible() && !document.hidden) this.resume();
        else this.pause();
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
        this.menu.removeEventListener('pointermove', this._onPointerMove);
        this.menu.removeEventListener('pointerdown', this._onPointerDown);
        this._observer?.disconnect();
    }

    tick(timestamp) {
        if (!this.running) return;
        const dt = Math.min(40, timestamp - (this.lastFrame || timestamp));
        this.lastFrame = timestamp;
        this.time += dt * 0.001;

        if (this.radarPulse > 0) this.radarPulse = Math.max(0, this.radarPulse - dt * 0.0015);

        this.update(dt);
        this.draw();
        this.rafId = requestAnimationFrame(this.boundTick);
    }

    update(dt) {
        this.radarAngle += REDUCED_MOTION ? 0.0005 * dt : 0.0011 * dt;

        this.ripples.forEach(r => {
            r.r += dt * 0.08;
            r.alpha *= 0.982;
        });
        this.ripples = this.ripples.filter(r => r.alpha > 0.03 && r.r < r.maxR);

        this.pings.forEach(p => {
            p.r += dt * 0.42;
            p.alpha *= 0.988;
        });
        this.pings = this.pings.filter(p => p.alpha > 0.04 && p.r < p.maxR);

        this.fogParticles.forEach(p => {
            p.y -= p.speed * (dt / 16);
            p.x += p.drift * (dt / 16);
            if (p.y < -0.08) {
                p.y = 1.05;
                p.x = Math.random();
            }
        });

        this.ships.forEach(ship => {
            const ease = 1 + Math.sin(this.time * 0.4 + ship.phase) * 0.08;
            ship.x += ship.speed * ship.dir * dt * ease;

            if (ship.dir > 0 && ship.x > 1.2) ship.x = -0.18;
            if (ship.dir < 0 && ship.x < -0.2) ship.x = 1.18;

            const sx = ship.x * this.width;
            const sy = ship.y * this.height
                + Math.sin(this.time * 0.9 + ship.bobPhase) * (4 + ship.depth * 6)
                + Math.sin(this.time * 1.7 + ship.bobPhase * 2) * 2;

            ship.wake.push({ x: sx, y: sy + 8 * ship.scale, life: 1 });
            if (ship.wake.length > 28) ship.wake.shift();
            ship.wake.forEach(w => { w.life -= dt * 0.0012; });
            ship.wake = ship.wake.filter(w => w.life > 0.05);
        });

        if (!REDUCED_MOTION) {
            if (this.time >= this.lightning.nextAt) {
                this.lightning.flash = 1;
                this.lightning.nextAt = this.time + 5 + Math.random() * 12;
                if (this.flashEl) this.flashEl.classList.add('naval-bg__flash--active');
            }
            if (this.lightning.flash > 0) {
                this.lightning.flash = Math.max(0, this.lightning.flash - dt * 0.004);
                if (this.lightning.flash <= 0 && this.flashEl) {
                    this.flashEl.classList.remove('naval-bg__flash--active');
                }
            }

            if (this.time >= this.nextHorizonEvent) {
                this.spawnHorizonEvent();
                this.nextHorizonEvent = this.time + 3 + Math.random() * 7;
            }

            this.horizonEvents.forEach(e => { e.life -= dt * 0.0008; e.size += dt * 0.04; });
            this.horizonEvents = this.horizonEvents.filter(e => e.life > 0);

            this.smokePuffs.forEach(s => {
                s.y -= dt * 0.00015;
                s.x += s.drift * dt;
                s.life -= dt * 0.001;
                s.r += dt * 0.02;
            });
            this.smokePuffs = this.smokePuffs.filter(s => s.life > 0);

            if (this.time >= this.nextBlipAt) {
                this.radarBlips.push({
                    angle: Math.random() * Math.PI * 2,
                    dist: 0.25 + Math.random() * 0.65,
                    life: 1,
                    blink: 0
                });
                this.nextBlipAt = this.time + 1.2 + Math.random() * 2.5;
                if (this.radarBlips.length > 8) this.radarBlips.shift();
            }

            this.radarBlips.forEach(b => {
                b.life -= dt * 0.00035;
                b.blink += dt * 0.008;
            });
            this.radarBlips = this.radarBlips.filter(b => b.life > 0);
        }
    }

    spawnHorizonEvent() {
        const x = 0.15 + Math.random() * 0.7;
        const y = 0.12 + Math.random() * 0.18;
        this.horizonEvents.push({
            x: x * this.width,
            y: y * this.height,
            life: 1,
            size: 8 + Math.random() * 20,
            type: Math.random() > 0.4 ? 'explosion' : 'muzzle'
        });

        for (let i = 0; i < 5; i++) {
            this.smokePuffs.push({
                x: x * this.width + (Math.random() - 0.5) * 40,
                y: y * this.height,
                r: 6 + Math.random() * 14,
                life: 0.7 + Math.random() * 0.5,
                drift: (Math.random() - 0.5) * 0.0004,
                alpha: 0.25 + Math.random() * 0.2
            });
        }
    }

    draw() {
        const ctx = this.ctx;
        const w = this.width;
        const h = this.height;
        const px = this.parallax.x;
        const py = this.parallax.y;

        ctx.clearRect(0, 0, w, h);

        this.drawSky(ctx, w, h);
        this.drawOceanBase(ctx, w, h);
        this.drawWaterReflections(ctx, w, h, px, py);
        this.drawWaves(ctx, w, h, px, py);
        this.drawHorizonEvents(ctx);
        this.drawSmoke(ctx);
        this.drawFog(ctx, w, h);

        const sortedShips = [...this.ships].sort((a, b) => a.depth - b.depth);
        sortedShips.forEach(ship => this.drawShip(ctx, w, h, ship, px, py));

        this.drawRadar(ctx, w, h);
        this.drawRipples(ctx);
        this.drawPings(ctx);
        this.drawLightningFlash(ctx, w, h);
    }

    drawSky(ctx, w, h) {
        const sky = ctx.createLinearGradient(0, 0, 0, h * 0.55);
        sky.addColorStop(0, '#1a3a5c');
        sky.addColorStop(0.35, '#245878');
        sky.addColorStop(0.7, '#1e4a6a');
        sky.addColorStop(1, 'rgba(20, 60, 90, 0)');
        ctx.fillStyle = sky;
        ctx.fillRect(0, 0, w, h * 0.5);

        const moonGlow = ctx.createRadialGradient(w * 0.78, h * 0.12, 0, w * 0.78, h * 0.12, h * 0.35);
        moonGlow.addColorStop(0, 'rgba(180, 220, 255, 0.35)');
        moonGlow.addColorStop(0.4, 'rgba(80, 160, 220, 0.12)');
        moonGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = moonGlow;
        ctx.fillRect(0, 0, w, h * 0.45);
    }

    drawOceanBase(ctx, w, h) {
        const pulse = Math.sin(this.time * 0.35) * 0.03;
        const ocean = ctx.createLinearGradient(0, h * 0.2, 0, h);
        ocean.addColorStop(0, `rgb(18, 72, 110)`);
        ocean.addColorStop(0.35 + pulse, `rgb(12, 58, 95)`);
        ocean.addColorStop(0.65, `rgb(8, 45, 78)`);
        ocean.addColorStop(1, `rgb(5, 32, 58)`);
        ctx.fillStyle = ocean;
        ctx.fillRect(0, h * 0.18, w, h);

        const surfaceLight = ctx.createLinearGradient(0, h * 0.35, 0, h * 0.75);
        surfaceLight.addColorStop(0, 'rgba(60, 160, 220, 0.18)');
        surfaceLight.addColorStop(0.5, 'rgba(40, 120, 180, 0.08)');
        surfaceLight.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = surfaceLight;
        ctx.fillRect(0, h * 0.3, w, h * 0.5);
    }

    drawWaterReflections(ctx, w, h, px, py) {
        const baseY = h * 0.42 + py * 0.2;
        ctx.save();
        ctx.globalAlpha = 0.35 + Math.sin(this.time * 0.8) * 0.08;

        for (let band = 0; band < 6; band++) {
            const y = baseY + band * 28;
            ctx.beginPath();
            for (let x = 0; x <= w; x += 6) {
                const shimmer = Math.sin(x * 0.02 + this.time * 1.2 + band) * 3
                    + Math.sin(x * 0.05 - this.time * 0.7) * 1.5;
                if (x === 0) ctx.moveTo(x, y + shimmer);
                else ctx.lineTo(x, y + shimmer);
            }
            ctx.strokeStyle = `rgba(120, 200, 255, ${0.15 + band * 0.03})`;
            ctx.lineWidth = 1.5;
            ctx.stroke();
        }

        ctx.globalAlpha = 0.2;
        const moonX = w * 0.78 + px * 0.3;
        const reflectGrad = ctx.createLinearGradient(moonX - 80, h * 0.4, moonX + 80, h * 0.85);
        reflectGrad.addColorStop(0, 'rgba(150, 210, 255, 0.5)');
        reflectGrad.addColorStop(0.5, 'rgba(80, 160, 220, 0.15)');
        reflectGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = reflectGrad;
        ctx.fillRect(moonX - 100, h * 0.38, 200, h * 0.5);

        ctx.restore();
    }

    drawWaves(ctx, w, h, px, py) {
        const layers = [
            { amp: 22, freq: 0.009, speed: 0.4, alpha: 0.28, y: h * 0.48, color: '50, 140, 200' },
            { amp: 30, freq: 0.007, speed: 0.3, alpha: 0.22, y: h * 0.56, color: '40, 120, 185' },
            { amp: 38, freq: 0.005, speed: 0.22, alpha: 0.18, y: h * 0.64, color: '30, 100, 170' },
            { amp: 14, freq: 0.015, speed: 0.55, alpha: 0.35, y: h * 0.52, color: '90, 180, 230', stroke: true },
            { amp: 45, freq: 0.004, speed: 0.16, alpha: 0.14, y: h * 0.72, color: '25, 85, 150' }
        ];

        layers.forEach((layer, li) => {
            ctx.beginPath();
            ctx.moveTo(0, h);
            for (let x = 0; x <= w; x += 6) {
                const y = layer.y + py * 0.12 * (li + 1) + px * 0.05 * li
                    + Math.sin(x * layer.freq + this.time * layer.speed + li * 1.2) * layer.amp
                    + Math.sin(x * layer.freq * 2.1 + this.time * layer.speed * 1.4 + li) * (layer.amp * 0.4)
                    + Math.sin(x * layer.freq * 0.5 + this.time * 0.15) * (layer.amp * 0.2);
                ctx.lineTo(x, y);
            }
            ctx.lineTo(w, h);
            ctx.closePath();

            if (layer.stroke) {
                ctx.strokeStyle = `rgba(${layer.color}, ${layer.alpha})`;
                ctx.lineWidth = 2;
                ctx.stroke();
            } else {
                const grad = ctx.createLinearGradient(0, layer.y - layer.amp, 0, h);
                grad.addColorStop(0, `rgba(${layer.color}, ${layer.alpha + 0.1})`);
                grad.addColorStop(1, `rgba(${layer.color}, ${layer.alpha * 0.3})`);
                ctx.fillStyle = grad;
                ctx.fill();
            }
        });
    }

    drawHorizonEvents(ctx) {
        this.horizonEvents.forEach(e => {
            const alpha = e.life * 0.9;
            if (e.type === 'explosion') {
                const g = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, e.size * 2);
                g.addColorStop(0, `rgba(255, 200, 120, ${alpha})`);
                g.addColorStop(0.35, `rgba(255, 100, 40, ${alpha * 0.6})`);
                g.addColorStop(1, 'rgba(255, 60, 20, 0)');
                ctx.fillStyle = g;
                ctx.beginPath();
                ctx.arc(e.x, e.y, e.size * 2, 0, Math.PI * 2);
                ctx.fill();
            } else {
                ctx.fillStyle = `rgba(255, 220, 150, ${alpha * 0.7})`;
                ctx.fillRect(e.x - e.size, e.y - 1, e.size * 2, 3);
            }
        });
    }

    drawSmoke(ctx) {
        this.smokePuffs.forEach(s => {
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(140, 160, 180, ${s.alpha * s.life})`;
            ctx.fill();
        });
    }

    drawFog(ctx, w, h) {
        this.fogParticles.forEach(p => {
            const x = p.x * w + this.parallax.x * (0.2 + p.y * 0.3);
            const y = p.y * h + this.parallax.y * 0.2;
            const g = ctx.createRadialGradient(x, y, 0, x, y, p.r * 4);
            g.addColorStop(0, `rgba(200, 230, 255, ${p.alpha})`);
            g.addColorStop(1, 'rgba(200, 230, 255, 0)');
            ctx.fillStyle = g;
            ctx.fillRect(x - p.r * 4, y - p.r * 4, p.r * 8, p.r * 8);
        });
    }

    drawShip(ctx, w, h, ship, px, py) {
        const depthFactor = ship.depth;
        const parallaxMul = 0.35 + depthFactor * 0.65;
        const x = ship.x * w + px * parallaxMul;
        const bob = Math.sin(this.time * 0.9 + ship.bobPhase) * (5 + depthFactor * 8)
            + Math.sin(this.time * 1.6 + ship.bobPhase * 1.3) * 3;
        const y = ship.y * h + py * parallaxMul * 0.5 + bob;
        const s = (48 + depthFactor * 28) * ship.scale;

        this.drawShipWake(ctx, ship, x, y, s);

        ctx.save();
        ctx.translate(x, y);
        ctx.scale(ship.dir, 1);

        const alpha = 0.55 + depthFactor * 0.35;
        ctx.globalAlpha = alpha;

        const hullGrad = ctx.createLinearGradient(0, -s * 0.2, 0, s * 0.2);
        hullGrad.addColorStop(0, '#3d6a8a');
        hullGrad.addColorStop(0.5, '#1e3d58');
        hullGrad.addColorStop(1, '#0f2438');
        ctx.fillStyle = hullGrad;
        ctx.strokeStyle = 'rgba(120, 200, 255, 0.65)';
        ctx.lineWidth = 2;

        if (ship.type === 'destroyer') this.drawDestroyer(ctx, s);
        else if (ship.type === 'carrier') this.drawCarrier(ctx, s);
        else this.drawSubmarine(ctx, s);

        ctx.globalAlpha = alpha * 0.9;
        ctx.strokeStyle = 'rgba(180, 230, 255, 0.5)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-s * 0.3, -s * 0.02);
        ctx.lineTo(s * 0.35, -s * 0.04);
        ctx.stroke();

        ctx.restore();
    }

    drawShipWake(ctx, ship, x, y, s) {
        if (ship.wake.length < 2) return;

        ctx.save();
        ctx.lineCap = 'round';
        for (let i = 1; i < ship.wake.length; i++) {
            const a = ship.wake[i - 1];
            const b = ship.wake[i];
            const life = (a.life + b.life) * 0.5;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = `rgba(200, 235, 255, ${life * 0.35})`;
            ctx.lineWidth = (s * 0.08) * life;
            ctx.stroke();

            ctx.beginPath();
            ctx.arc(b.x, b.y, (s * 0.06) * life, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(220, 245, 255, ${life * 0.2})`;
            ctx.fill();
        }
        ctx.restore();
    }

    drawDestroyer(ctx, s) {
        ctx.beginPath();
        ctx.moveTo(-s * 0.55, s * 0.12);
        ctx.lineTo(s * 0.5, s * 0.08);
        ctx.lineTo(s * 0.42, -s * 0.1);
        ctx.lineTo(s * 0.15, -s * 0.14);
        ctx.lineTo(-s * 0.25, -s * 0.08);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = 'rgba(80, 140, 180, 0.6)';
        ctx.fillRect(s * 0.05, -s * 0.22, s * 0.08, s * 0.14);
    }

    drawCarrier(ctx, s) {
        ctx.fillRect(-s * 0.58, -s * 0.05, s * 1.12, s * 0.16);
        ctx.strokeRect(-s * 0.58, -s * 0.05, s * 1.12, s * 0.16);
        ctx.fillStyle = 'rgba(70, 120, 160, 0.7)';
        ctx.fillRect(-s * 0.12, -s * 0.28, s * 0.14, s * 0.24);
        ctx.strokeRect(-s * 0.12, -s * 0.28, s * 0.14, s * 0.24);
        for (let i = 0; i < 4; i++) {
            ctx.fillRect(-s * 0.35 + i * s * 0.18, -s * 0.02, s * 0.06, s * 0.04);
        }
    }

    drawSubmarine(ctx, s) {
        ctx.beginPath();
        ctx.ellipse(0, s * 0.02, s * 0.5, s * 0.1, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = 'rgba(60, 110, 150, 0.8)';
        ctx.fillRect(s * 0.22, -s * 0.2, s * 0.07, s * 0.24);
        ctx.beginPath();
        ctx.moveTo(-s * 0.45, s * 0.02);
        ctx.lineTo(-s * 0.55, s * 0.08);
        ctx.stroke();
    }

    drawRadar(ctx, w, h) {
        const cx = w * (0.5 + this.pointer.nx * 0.1);
        const cy = h * (0.5 + this.pointer.ny * 0.08);
        const baseR = Math.min(w, h) * 0.48;
        const pulseR = baseR * (1 + this.radarPulse * 0.12);

        ctx.save();
        ctx.translate(cx, cy);

        const ringGrad = ctx.createRadialGradient(0, 0, pulseR * 0.2, 0, 0, pulseR);
        ringGrad.addColorStop(0, 'rgba(40, 120, 90, 0.05)');
        ringGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = ringGrad;
        ctx.fillRect(-pulseR, -pulseR, pulseR * 2, pulseR * 2);

        for (let i = 1; i <= 5; i++) {
            ctx.beginPath();
            ctx.arc(0, 0, (pulseR / 5) * i, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(80, 220, 150, ${0.12 + i * 0.05})`;
            ctx.lineWidth = i === 5 ? 2 : 1.5;
            ctx.stroke();
        }

        const sweep = this.radarAngle + this.pointer.nx * 0.4;
        ctx.save();
        ctx.rotate(sweep);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, pulseR, -0.55, 0.55);
        ctx.closePath();
        const sweepGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, pulseR);
        sweepGrad.addColorStop(0, 'rgba(100, 255, 180, 0.35)');
        sweepGrad.addColorStop(0.6, 'rgba(60, 200, 130, 0.12)');
        sweepGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = sweepGrad;
        ctx.fill();
        ctx.strokeStyle = 'rgba(120, 255, 180, 0.5)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(pulseR, 0);
        ctx.stroke();
        ctx.restore();

        this.radarBlips.forEach(blip => {
            const bx = Math.cos(blip.angle) * pulseR * blip.dist;
            const by = Math.sin(blip.angle) * pulseR * blip.dist;
            const sweepDiff = Math.abs(
                ((blip.angle - sweep + Math.PI) % (Math.PI * 2)) - Math.PI
            );
            const detected = sweepDiff < 0.35;
            const pulse = 0.5 + Math.sin(blip.blink) * 0.5;

            ctx.beginPath();
            ctx.arc(bx, by, detected ? 6 : 4, 0, Math.PI * 2);
            ctx.fillStyle = detected
                ? `rgba(255, 255, 120, ${blip.life * pulse})`
                : `rgba(80, 200, 140, ${blip.life * 0.5})`;
            ctx.fill();
            if (detected) {
                ctx.beginPath();
                ctx.arc(bx, by, 12 + pulse * 4, 0, Math.PI * 2);
                ctx.strokeStyle = `rgba(255, 255, 100, ${blip.life * 0.4})`;
                ctx.lineWidth = 1.5;
                ctx.stroke();
            }
        });

        ctx.beginPath();
        ctx.moveTo(-pulseR, 0);
        ctx.lineTo(pulseR, 0);
        ctx.moveTo(0, -pulseR);
        ctx.lineTo(0, pulseR);
        ctx.strokeStyle = 'rgba(80, 220, 150, 0.25)';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(0, 0, 6, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(140, 255, 200, 0.9)';
        ctx.fill();

        ctx.restore();
    }

    drawRipples(ctx) {
        this.ripples.forEach(r => {
            ctx.beginPath();
            ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(140, 220, 255, ${r.alpha})`;
            ctx.lineWidth = r.lineWidth || 2;
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(r.x, r.y, r.r * 0.6, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(200, 240, 255, ${r.alpha * 0.5})`;
            ctx.lineWidth = 1;
            ctx.stroke();
        });
    }

    drawPings(ctx) {
        this.pings.forEach(p => {
            if (p.fill && p.alpha > 0.3) {
                const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
                g.addColorStop(0, `rgba(100, 255, 200, ${p.alpha * 0.15})`);
                g.addColorStop(1, 'rgba(0, 0, 0, 0)');
                ctx.fillStyle = g;
                ctx.fillRect(p.x - p.r, p.y - p.r, p.r * 2, p.r * 2);
            }
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(80, 255, 200, ${p.alpha})`;
            ctx.lineWidth = p.lineWidth || 2;
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r * 0.72, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(150, 255, 220, ${p.alpha * 0.55})`;
            ctx.lineWidth = 1;
            ctx.stroke();
        });
    }

    drawLightningFlash(ctx, w, h) {
        if (this.lightning.flash <= 0) return;
        ctx.fillStyle = `rgba(200, 230, 255, ${this.lightning.flash * 0.25})`;
        ctx.fillRect(0, 0, w, h * 0.4);
    }
}
