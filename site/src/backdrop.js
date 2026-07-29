/**
 * Fundo: um muro de slabs extrudados. Cada bloco tem espessura de verdade —
 * as laterais aparecem — e o muro inclina de leve conforme o cursor anda,
 * como se a câmera orbitasse um palmo. A luz vem por trás e escapa pelas
 * frestas, que são fios finos, não faixas.
 *
 * A profundidade é falsa mas honesta: as faces são projetadas a partir de um
 * ponto de fuga que segue o cursor. Bloco à direita do ponto de fuga mostra a
 * lateral esquerda, bloco acima mostra a de baixo, e assim por diante.
 */
const CELL = 148; // módulo do muro
const GAP = 15; // fresta entre os slabs — precisa sobrar aberta depois da extrusão
const RADIUS = 460; // alcance da luz
const PARALLAX = 46; // o quanto o ponto de fuga corre atrás do cursor

const PINK = [220, 66, 113];
const PINK_HOT = [255, 150, 186];
const WARM = [242, 237, 230];

function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export function initBackdrop(canvas, { reducedMotion = false } = {}) {
  const ctx = canvas.getContext('2d');
  // fundo desfocado e escuro: 1x já basta, e devolve ~2x de orçamento de pintura
  const dpr = 1;
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  const still = reducedMotion || coarse;

  let blocks = [];
  let vignette = null;
  let w = 0;
  let h = 0;

  const pointer = { x: 0, y: 0 };
  const eye = { x: 0, y: 0 }; // ponto de fuga, corre atrás do cursor com atraso
  let intensity = 0;
  let target = 0;
  let raf = null;
  let pastHero = false;

  function buildBlocks() {
    const rand = rng(20260728);
    const cols = Math.ceil(w / CELL) + 2;
    const rows = Math.ceil(h / CELL) + 2;
    const taken = Array.from({ length: rows }, () => new Array(cols).fill(false));
    blocks = [];

    const fits = (r, c, sh, sw) => {
      if (r + sh > rows || c + sw > cols) return false;
      for (let i = r; i < r + sh; i++)
        for (let j = c; j < c + sw; j++) if (taken[i][j]) return false;
      return true;
    };

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (taken[r][c]) continue;
        let sw = 1;
        let sh = 1;
        const roll = rand();
        if (roll > 0.9 && fits(r, c, 2, 2)) { sw = 2; sh = 2; }
        else if (roll > 0.74 && fits(r, c, 1, 2)) { sw = 2; }
        else if (roll > 0.58 && fits(r, c, 2, 1)) { sh = 2; }

        for (let i = r; i < r + sh; i++)
          for (let j = c; j < c + sw; j++) taken[i][j] = true;

        blocks.push({
          x: (c - 1) * CELL,
          y: (r - 1) * CELL,
          w: sw * CELL - GAP,
          h: sh * CELL - GAP,
          // espessura do slab: uns saem mais do muro que outros
          d: 0.1 + rand() * 0.9,
        });
      }
    }
  }

  /**
   * Gradiente é caro de reavaliar a cada quadro sobre milhões de pixels.
   * Os três são pintados uma vez em canvas fora da tela e depois só copiados.
   */
  let glowSprite = null;
  let bloomSprite = null;

  function sprite(size, paint) {
    const c = document.createElement('canvas');
    c.width = size;
    c.height = size;
    paint(c.getContext('2d'), size / 2);
    return c;
  }

  function buildSprites() {
    const s = RADIUS * 2;
    glowSprite = sprite(s, (g, r) => {
      const grad = g.createRadialGradient(r, r, 0, r, r, r);
      grad.addColorStop(0, `rgba(${PINK_HOT}, 0.8)`);
      grad.addColorStop(0.3, `rgba(${PINK}, 0.5)`);
      grad.addColorStop(0.65, `rgba(${PINK}, 0.16)`);
      grad.addColorStop(1, `rgba(${PINK}, 0)`);
      g.fillStyle = grad;
      g.fillRect(0, 0, r * 2, r * 2);
    });
    bloomSprite = sprite(s, (g, r) => {
      const grad = g.createRadialGradient(r, r, 0, r, r, r * 0.82);
      grad.addColorStop(0, `rgba(${PINK_HOT}, 0.16)`);
      grad.addColorStop(0.45, `rgba(${PINK}, 0.07)`);
      grad.addColorStop(1, `rgba(${PINK}, 0)`);
      g.fillStyle = grad;
      g.fillRect(0, 0, r * 2, r * 2);
    });
  }

  function buildVignette() {
    const r = Math.hypot(w, h) / 2;
    vignette = document.createElement('canvas');
    vignette.width = Math.max(1, Math.round(w));
    vignette.height = Math.max(1, Math.round(h));
    const g = vignette.getContext('2d');
    const grad = g.createRadialGradient(w / 2, h / 2, r * 0.3, w / 2, h / 2, r);
    grad.addColorStop(0, 'rgba(10, 10, 11, 0)');
    grad.addColorStop(0.62, 'rgba(10, 10, 11, 0.38)');
    grad.addColorStop(1, 'rgba(10, 10, 11, 0.9)');
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h);
  }

  function resize() {
    w = window.innerWidth;
    h = window.innerHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (!pointer.x) {
      pointer.x = w / 2;
      pointer.y = h / 2;
      eye.x = w / 2;
      eye.y = h / 2;
    }
    buildBlocks();
    buildVignette();
    if (!glowSprite) buildSprites();
    render();
  }

  function render() {
    ctx.clearRect(0, 0, w, h);

    const lit = intensity > 0.004;
    const lx = pointer.x;
    const ly = pointer.y;

    // 1. a luz, atrás do muro
    if (lit) {
      ctx.globalAlpha = intensity;
      ctx.drawImage(glowSprite, lx - RADIUS, ly - RADIUS);
      ctx.globalAlpha = 1;
    }

    // 2. o muro: slabs extrudados a partir do ponto de fuga
    const vx = eye.x;
    const vy = eye.y;

    for (let i = 0; i < blocks.length; i++) {
      const b = blocks[i];
      const { x, y, w: bw, h: bh, d } = b;

      // projeção da face frontal: empurrada para longe do ponto de fuga
      const k = 1 + d * 0.028;
      const fx = vx + (x - vx) * k;
      const fy = vy + (y - vy) * k;
      const fw = bw * k;
      const fh = bh * k;

      const cx = fx + fw / 2;
      const cy = fy + fh / 2;

      // o quanto este bloco recebe da luz
      let f = 0;
      if (lit) {
        const dist = Math.hypot(lx - cx, ly - cy);
        if (dist < RADIUS) f = (1 - dist / RADIUS) ** 2 * intensity;
      }

      // ---- laterais: só as duas que ficam viradas para fora ----
      // lateral vertical
      const rightOfEye = cx > vx;
      const sideShade = 5 + d * 3 + f * 34;
      ctx.fillStyle = `rgb(${Math.round(sideShade)}, ${Math.round(sideShade * 0.86)}, ${Math.round(sideShade * 0.95)})`;
      ctx.beginPath();
      if (rightOfEye) {
        ctx.moveTo(x, y);
        ctx.lineTo(fx, fy);
        ctx.lineTo(fx, fy + fh);
        ctx.lineTo(x, y + bh);
      } else {
        ctx.moveTo(x + bw, y);
        ctx.lineTo(fx + fw, fy);
        ctx.lineTo(fx + fw, fy + fh);
        ctx.lineTo(x + bw, y + bh);
      }
      ctx.closePath();
      ctx.fill();

      // lateral horizontal
      const belowEye = cy > vy;
      const capShade = 8 + d * 5 + f * 44;
      ctx.fillStyle = `rgb(${Math.round(capShade)}, ${Math.round(capShade * 0.86)}, ${Math.round(capShade * 0.95)})`;
      ctx.beginPath();
      if (belowEye) {
        ctx.moveTo(x, y);
        ctx.lineTo(fx, fy);
        ctx.lineTo(fx + fw, fy);
        ctx.lineTo(x + bw, y);
      } else {
        ctx.moveTo(x, y + bh);
        ctx.lineTo(fx, fy + fh);
        ctx.lineTo(fx + fw, fy + fh);
        ctx.lineTo(x + bw, y + bh);
      }
      ctx.closePath();
      ctx.fill();

      // ---- face frontal: quase preta, com um respingo da luz ----
      const face = 11 + d * 3 + f * 16;
      ctx.fillStyle = `rgb(${Math.round(face)}, ${Math.round(face * 0.9)}, ${Math.round(face * 0.98)})`;
      ctx.fillRect(fx, fy, fw, fh);

      // ---- fio de luz na quina: só onde a luz chega; contornar o muro
      // inteiro custa caro e as laterais já dão forma aos slabs ----
      if (f > 0.02) {
        ctx.strokeStyle = `rgba(${PINK_HOT}, ${Math.min(0.75, f * 1.6)})`;
        ctx.lineWidth = 1;
        ctx.strokeRect(fx + 0.5, fy + 0.5, fw - 1, fh - 1);
      }
    }

    // 3. a luz volta por cima, somando: é o estouro dela contornando os slabs
    if (lit) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = intensity;
      ctx.drawImage(bloomSprite, lx - RADIUS, ly - RADIUS);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }

    // 4. vinheta: o muro recua nas bordas
    if (vignette) ctx.drawImage(vignette, 0, 0);
  }

  function loop() {
    intensity += (target - intensity) * 0.09;
    // o ponto de fuga persegue o cursor com atraso: dá inércia ao muro
    eye.x += (w / 2 + (pointer.x - w / 2) * (PARALLAX / w) * 6 - eye.x) * 0.07;
    eye.y += (h / 2 + (pointer.y - h / 2) * (PARALLAX / h) * 6 - eye.y) * 0.07;
    render();

    const settled =
      Math.abs(target - intensity) < 0.004 &&
      Math.abs(eye.x - w / 2) < 0.6 &&
      Math.abs(eye.y - h / 2) < 0.6;

    if (!settled || target > 0) {
      raf = requestAnimationFrame(loop);
    } else {
      intensity = 0;
      eye.x = w / 2;
      eye.y = h / 2;
      render();
      raf = null;
    }
  }

  function wake() {
    if (raf === null) raf = requestAnimationFrame(loop);
  }

  let idleTimer = null;
  function onPointerMove(e) {
    if (!pastHero) return;
    pointer.x = e.clientX;
    pointer.y = e.clientY;
    target = 1;
    wake();
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      target = 0;
      pointer.x = w / 2;
      pointer.y = h / 2;
      wake();
    }, 1200);
  }

  resize();
  window.addEventListener('resize', resize);

  if (still) return { destroy() {} };

  const hero = document.getElementById('hero');
  if (hero) {
    new IntersectionObserver(
      ([entry]) => {
        pastHero = !entry.isIntersecting;
        if (!pastHero) {
          target = 0;
          intensity = 0;
          pointer.x = w / 2;
          pointer.y = h / 2;
          eye.x = w / 2;
          eye.y = h / 2;
          render();
        }
      },
      { threshold: 0 }
    ).observe(hero);
  } else {
    pastHero = true;
  }

  window.addEventListener('pointermove', onPointerMove, { passive: true });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      target = 0;
      intensity = 0;
      render();
    }
  });

  return {
    destroy() {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('resize', resize);
      if (raf !== null) cancelAnimationFrame(raf);
    },
  };
}
