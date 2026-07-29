/**
 * O lazy-loading nativo do Chrome não reavalia imagens injetadas por JS
 * enquanto a rolagem é conduzida pelo Lenis: elas ficam presas em
 * "carregando" para sempre. O atributo loading="lazy" continua no HTML
 * (é ele que evita baixar tudo no boot), e este observer garante que a
 * imagem realmente carregue quando chega perto da viewport.
 */
export function ensureLazyImages(root = document) {
  const imgs = [...root.querySelectorAll('img[loading="lazy"]')].filter(
    (img) => !img.complete
  );
  if (!imgs.length) return;

  if (!('IntersectionObserver' in window)) {
    imgs.forEach((img) => (img.loading = 'eager'));
    return;
  }

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const img = entry.target;
        img.loading = 'eager';
        // reafirma o src: garante o início do download mesmo se o
        // navegador já tiver descartado a decisão de lazy load
        if (!img.complete) img.src = img.getAttribute('src');
        io.unobserve(img);
      });
    },
    { rootMargin: '600px 0px' }
  );

  imgs.forEach((img) => io.observe(img));
}
