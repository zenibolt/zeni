import '@fontsource-variable/bodoni-moda';
import '@fontsource-variable/archivo';
import '@fontsource/ibm-plex-mono/400.css';
import './styles/main.css';

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { CanvasSequence } from './sequence.js';
import { initGallery } from './gallery.js';
import { ensureLazyImages } from './lazy.js';
import { initBackdrop } from './backdrop.js';

gsap.registerPlugin(ScrollTrigger);

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const lowMemory = (navigator.deviceMemory || 8) < 4;
const isMobile = window.matchMedia('(max-width: 768px)').matches;

// ---------- quadros da sequência ----------
// Extraídos do filme (Kling 3.0 + Seedance 2.0) com ffmpeg.
const FRAME_COUNTS = { desktop: 120, mobile: 48 };
// quantos quadros precisam estar prontos antes de liberar a página;
// o resto entra por trás enquanto o visitante já está rolando
const EAGER = { desktop: 24, mobile: 10 };

function variantName() {
  return isMobile || lowMemory ? 'mobile' : 'desktop';
}

function frameUrls() {
  const variant = variantName();
  const count = FRAME_COUNTS[variant];
  const urls = [];
  for (let i = 1; i <= count; i++) {
    urls.push(`/frames/${variant}/frame-${String(i).padStart(3, '0')}.webp`);
  }
  return urls;
}

// Existência dos quadros é sinalizada em build; por ora detecta em runtime.
async function framesAvailable() {
  try {
    const probe = variantName();
    const res = await fetch(`/frames/${probe}/frame-001.webp`, { method: 'HEAD' });
    return res.ok;
  } catch {
    return false;
  }
}

// ---------- boot ----------
const loader = document.getElementById('loader');
const loaderBar = document.getElementById('loaderBar');
const loaderPct = document.getElementById('loaderPct');
document.body.classList.add('is-loading');

let lenis = null;

async function boot() {
  const canvas = document.getElementById('heroCanvas');
  const hasFrames = !reducedMotion && (await framesAvailable());

  const seq = new CanvasSequence(canvas, {
    frameUrls: hasFrames ? frameUrls() : null,
    // dissolver entre quadros vizinhos dobra o preenchimento e derruba
    // quadros no celular; a densidade de quadros já resolve o degrau
    blend: false,
    onProgress: (p) => {
      if (!loaderBar.isConnected) return; // recarga silenciosa depois do boot
      const pct = Math.round(p * 100);
      loaderBar.style.width = `${pct}%`;
      loaderPct.textContent = `${pct}%`;
    },
  });

  await seq.load({ eager: EAGER[variantName()] });

  // libera a página
  loader.classList.add('is-done');
  document.body.classList.remove('is-loading');
  setTimeout(() => loader.remove(), 700);

  if (reducedMotion) {
    // troca canvas por poster estático e revelações simples
    const poster = document.getElementById('heroPoster');
    poster.hidden = false;
    // o poster acompanha o formato: retrato no celular, paisagem no desktop
    if (!poster.getAttribute('src')) {
      poster.src =
        variantName() === 'mobile'
          ? '/media/hero-poster-mobile.webp'
          : '/media/hero-poster.webp';
    }
    initGallery({ reducedMotion: true });
    fillAboutMedia();
    ensureLazyImages();
    initBackdrop(document.getElementById('backdrop'), { reducedMotion: true });
    return;
  }

  // ---------- lenis + gsap ----------
  lenis = new Lenis({ smoothWheel: true, lerp: 0.11 });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);

  // ---------- hero scrub ----------
  const heroTrigger = ScrollTrigger.create({
    trigger: '#hero',
    start: 'top top',
    end: 'bottom bottom',
    scrub: 0.5,
    onUpdate: (self) => seq.draw(self.progress),
  });

  // onUpdate só dispara quando o progresso muda: no boot (progresso 0)
  // o primeiro quadro precisa ser pintado explicitamente.
  seq.draw(heroTrigger.progress);

  // Descarrega os quadros só quando o visitante já está bem longe do pin,
  // e recarrega ao voltar — com folga suficiente para a rolagem reversa
  // chegar na hero com a sequência inteira já em memória.
  ScrollTrigger.create({
    trigger: '#metodo',
    start: 'top bottom',
    onEnter: () => seq.dispose(),
    onLeaveBack: () => seq.restore(),
  });

  // O overlay some em proporção ao percurso da sequência, não a uma altura
  // fixa: a hero é mais curta no celular e o ritmo precisa ser o mesmo.
  const heroTravel = () =>
    Math.max(1, document.getElementById('hero').offsetHeight - window.innerHeight);

  gsap.to('.hero__title-block', {
    opacity: 0,
    y: -40,
    ease: 'none',
    scrollTrigger: {
      trigger: '#hero',
      start: 'top top',
      end: () => `+=${heroTravel() * 0.34}`,
      scrub: 0.5,
    },
  });
  gsap.to('.hero__scroll-hint', {
    opacity: 0,
    ease: 'none',
    scrollTrigger: {
      trigger: '#hero',
      start: 'top top',
      end: () => `+=${heroTravel() * 0.16}`,
      scrub: 0.5,
    },
  });

  // ---------- virada ----------
  const turnSpans = document.querySelectorAll('.turn__phrase > span');
  turnSpans.forEach((span) => {
    const wrap = document.createElement('span');
    wrap.className = 'reveal-line';
    span.parentNode.insertBefore(wrap, span);
    wrap.appendChild(span);
    span.style.display = 'inline-block';
  });
  gsap.from('.turn__machine', {
    yPercent: 110,
    duration: 1,
    ease: 'power3.out',
    scrollTrigger: { trigger: '.turn', start: 'top 62%' },
  });
  gsap.from('.turn__director', {
    yPercent: 110,
    duration: 1,
    delay: 0.15,
    ease: 'power3.out',
    scrollTrigger: { trigger: '.turn', start: 'top 62%' },
  });

  // ---------- títulos de seção ----------
  document.querySelectorAll('.section-head__title').forEach((el) => {
    gsap.from(el, {
      yPercent: 30,
      opacity: 0,
      duration: 0.9,
      ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 85%' },
    });
  });

  // ---------- método ----------
  gsap.utils.toArray('.method__step').forEach((step) => {
    gsap.from(step, {
      y: 50,
      opacity: 0,
      duration: 0.8,
      ease: 'power2.out',
      scrollTrigger: { trigger: step, start: 'top 88%' },
    });
  });

  initGallery({ reducedMotion: false });
  fillAboutMedia();
  ensureLazyImages();
  initBackdrop(document.getElementById('backdrop'), { reducedMotion: false });

  ScrollTrigger.refresh();
}

// ---------- imagem principal (Sobre) ----------
function fillAboutMedia() {
  const aboutImg = document.getElementById('aboutImage');
  if (!aboutImg.getAttribute('src')) aboutImg.src = '/media/about-studio.webp';
}

boot();
