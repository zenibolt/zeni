import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { works } from './works.js';

/**
 * Galeria editorial: entrada com máscara circular (diafragma),
 * parallax leve e detalhe em overlay com contexto/execução/resultado.
 */
export function initGallery({ reducedMotion }) {
  const grid = document.getElementById('worksGrid');
  const detail = document.getElementById('workDetail');
  const detailInner = document.getElementById('workDetailInner');
  const detailClose = document.getElementById('workDetailClose');
  let lastFocused = null;

  grid.innerHTML = works
    .map(
      (w) => `
      <button class="work" data-id="${w.id}" aria-haspopup="dialog">
        <span class="work__mask">
          <img class="work__img" src="${w.image}" alt="${w.alt}" loading="lazy" width="1600" height="1000" />
        </span>
        <span class="work__meta">
          <span class="work__name">${w.name}</span>
          <span class="work__tag mono">${w.tag}</span>
        </span>
      </button>`
    )
    .join('');

  // diafragma + parallax
  grid.querySelectorAll('.work').forEach((el) => {
    const mask = el.querySelector('.work__mask');
    const img = el.querySelector('.work__img');

    if (reducedMotion) {
      mask.style.clipPath = 'none';
      return;
    }

    gsap.fromTo(
      mask,
      { clipPath: 'circle(0% at 50% 50%)' },
      {
        clipPath: 'circle(75% at 50% 50%)',
        ease: 'power2.out',
        scrollTrigger: {
          trigger: el,
          start: 'top 82%',
          end: 'top 40%',
          scrub: 0.5,
        },
      }
    );

    gsap.fromTo(
      img,
      { yPercent: -7 },
      {
        yPercent: 7,
        ease: 'none',
        scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true },
      }
    );
  });

  // ---------- detalhe ----------
  function openDetail(work) {
    lastFocused = document.activeElement;
    const media = work.video
      ? `<video src="${work.video}" muted loop playsinline autoplay aria-label="${work.alt}"></video>`
      : `<img src="${work.image}" alt="${work.alt}" width="1600" height="900" />`;
    detailInner.innerHTML = `
      <div class="work-detail__media${work.vertical ? ' work-detail__media--vertical' : ''}">${media}</div>
      <div class="work-detail__text">
        <p class="mono work-detail__tag">${work.tag}</p>
        <h3 class="work-detail__title" id="workDetailTitle">${work.name}</h3>
        <p class="work-detail__resumo">${work.resumo}</p>
        ${
          work.link
            ? `<a class="work-detail__link" href="${work.link}" target="_blank" rel="noopener">visitar o site ↗</a>`
            : ''
        }
      </div>
    `;
    detail.hidden = false;
    document.body.style.overflow = 'hidden';
    detailClose.focus();
    gsap.fromTo(detail, { opacity: 0 }, { opacity: 1, duration: 0.4, ease: 'power2.out' });
  }

  function closeDetail() {
    gsap.to(detail, {
      opacity: 0,
      duration: 0.3,
      ease: 'power2.in',
      onComplete: () => {
        detail.hidden = true;
        document.body.style.overflow = '';
        detailInner.innerHTML = '';
        lastFocused?.focus();
      },
    });
  }

  grid.addEventListener('click', (e) => {
    const btn = e.target.closest('.work');
    if (!btn) return;
    const work = works.find((w) => w.id === btn.dataset.id);
    if (work) openDetail(work);
  });

  detailClose.addEventListener('click', closeDetail);
  detail.addEventListener('click', (e) => {
    if (e.target === detail) closeDetail();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !detail.hidden) closeDetail();
  });

  ScrollTrigger.refresh();
}
