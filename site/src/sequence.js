/**
 * Sequência de quadros no canvas, controlada por progresso [0..1].
 * Enquanto os quadros reais não existem, desenha um placeholder
 * procedural (anéis do driver se desmontando) para validar o pipeline.
 */
export class CanvasSequence {
  constructor(canvas, { frameUrls = null, onProgress = () => {}, blend = false } = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.frameUrls = frameUrls;
    this.frames = null;
    this.onProgress = onProgress;
    this.blend = blend;
    this.progress = 0;
    // 2 é o teto: medido em celular com CPU 4x mais lenta, 2,5 e 3 devolvem
    // travões de rolagem por taxa de preenchimento e o ganho de nitidez é
    // pequeno — os quadros já vêm de recorte vertical em 4K.
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.resize();
    window.addEventListener('resize', () => this.resize());
    // o canvas pode ainda não ter layout no boot (loader ocupando a tela):
    // o observer garante o primeiro dimensionamento correto.
    if ('ResizeObserver' in window) {
      this._ro = new ResizeObserver(() => this.resize());
      this._ro.observe(canvas);
    }
  }

  resize() {
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    if (!w || !h) return;
    const nextW = Math.round(w * this.dpr);
    const nextH = Math.round(h * this.dpr);
    if (this.canvas.width === nextW && this.canvas.height === nextH) return;
    this.canvas.width = nextW;
    this.canvas.height = nextH;
    this.draw(this.progress);
  }

  /**
   * Carrega um quadro já decodificado. `createImageBitmap` tira a decodificação
   * do caminho do desenho: sem ela, cada quadro novo decodifica na hora de
   * pintar e derruba um frame da rolagem.
   */
  async loadFrame(url, i) {
    try {
      const res = await fetch(url);
      if (!res.ok) return;
      const bmp = await createImageBitmap(await res.blob());
      if (this.frames) this.frames[i] = bmp;
    } catch {
      /* quadro perdido: draw() usa o vizinho mais próximo */
    }
  }

  /**
   * Carrega só o começo da sequência e devolve o controle. O resto continua
   * chegando por trás, então a página abre em vez de segurar o visitante
   * num loader enquanto a sequência inteira desce.
   */
  async load({ eager = Infinity } = {}) {
    if (!this.frameUrls || !this.frameUrls.length) {
      this.onProgress(1);
      return;
    }
    const total = this.frameUrls.length;
    this.frames = new Array(total);
    const head = Math.min(eager, total);

    let done = 0;
    const track = (p) => {
      done += 1;
      this.onProgress(Math.min(1, done / head));
      return p;
    };

    // 1) o começo, em paralelo: é o que libera a página
    await Promise.all(
      this.frameUrls.slice(0, head).map((u, i) => this.loadFrame(u, i).then(track))
    );

    if (head >= total) return;

    // 2) o resto, em lotes, sem bloquear
    this.tail = (async () => {
      const batch = 6;
      for (let i = head; i < total; i += batch) {
        if (!this.frames) return; // descarregado no meio do caminho
        await Promise.all(
          this.frameUrls.slice(i, i + batch).map((u, j) => this.loadFrame(u, i + j))
        );
      }
    })();
  }

  /**
   * Libera os quadros da memória quando o visitante já está longe do pin.
   * Guarda as URLs para poder recarregar se ele voltar — a rolagem
   * reversa precisa desmontar a animação ao contrário, não cair no placeholder.
   */
  dispose() {
    if (!this.frames) return;
    // ImageBitmap segura memória de verdade: precisa ser fechado, não só solto
    for (const f of this.frames) f?.close?.();
    this.frames = null;
    this.disposed = true;
  }

  /** Recarrega os quadros descarregados (vêm do cache do navegador). */
  async restore() {
    if (!this.disposed || this.loading) return;
    this.loading = true;
    this.disposed = false;
    await this.load();
    this.loading = false;
    this.draw(this.progress);
  }

  draw(progress) {
    this.progress = progress;
    const { ctx, canvas } = this;
    const W = canvas.width;
    const H = canvas.height;

    if (this.frames && this.frames.length) {
      const total = this.frames.length;
      const pos = Math.max(0, Math.min(total - 1, progress * (total - 1)));
      const idx = Math.floor(pos);
      const frac = pos - idx;

      // se o quadro exato ainda não chegou, segura o vizinho mais próximo:
      // melhor um quadro levemente atrasado do que a tela piscando
      const nearest = (i) => {
        if (this.frames[i]) return this.frames[i];
        for (let r = 1; r < total; r++) {
          const f = this.frames[i - r] || this.frames[i + r];
          if (f) return f;
        }
        return null;
      };

      const img = nearest(idx);
      if (!img || !img.width) return;

      const paint = (bmp) => {
        const scale = Math.max(W / bmp.width, H / bmp.height);
        const dw = bmp.width * scale;
        const dh = bmp.height * scale;
        ctx.drawImage(bmp, (W - dw) / 2, (H - dh) / 2, dw, dh);
      };

      ctx.clearRect(0, 0, W, H);
      paint(img);

      // Dissolve para o quadro seguinte no meio do caminho entre os dois.
      // Sem isso a sequência anda em degraus visíveis onde há poucos quadros
      // para muito percurso de rolagem — o celular sente na hora.
      if (this.blend && frac > 0.04 && idx + 1 < total) {
        const next = this.frames[idx + 1];
        if (next && next.width) {
          ctx.globalAlpha = frac;
          paint(next);
          ctx.globalAlpha = 1;
        }
      }
      return;
    }

    // ---------- placeholder procedural ----------
    ctx.fillStyle = '#0A0A0B';
    ctx.fillRect(0, 0, W, H);
    const cx = W / 2;
    const cy = H / 2;
    const base = Math.min(W, H);

    // halo rosa
    const halo = ctx.createRadialGradient(cx, cy, 0, cx, cy, base * 0.6);
    halo.addColorStop(0, `rgba(220, 66, 113, ${0.28 - progress * 0.1})`);
    halo.addColorStop(1, 'rgba(10,10,11,0)');
    ctx.fillStyle = halo;
    ctx.fillRect(0, 0, W, H);

    // anéis do "driver" se afastando conforme o progresso
    const rings = 7;
    for (let i = 0; i < rings; i++) {
      const t = i / (rings - 1);
      const explode = progress * base * 0.38 * (t - 0.5) * 2;
      const r = base * (0.06 + t * 0.16) + Math.abs(explode);
      ctx.beginPath();
      ctx.arc(cx, cy, Math.max(1, r), 0, Math.PI * 2);
      ctx.strokeStyle =
        i % 3 === 0
          ? `rgba(220, 66, 113, ${0.85 - progress * 0.3})`
          : `rgba(242, 237, 230, ${0.22 - t * 0.12})`;
      ctx.lineWidth = this.dpr * (i % 3 === 0 ? 1.6 : 0.8);
      ctx.stroke();
    }

    // travessia final: escurece tudo rumo ao preto
    if (progress > 0.82) {
      const fade = (progress - 0.82) / 0.18;
      ctx.fillStyle = `rgba(10, 10, 11, ${fade})`;
      ctx.fillRect(0, 0, W, H);
    }
  }
}
