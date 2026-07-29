# Prompts prontos — gerar manualmente no Runway

Os créditos do workspace "Zeni" acabaram, então a geração parou aqui (regra da spec: nada de improvisar mídia). Quando tiver créditos, é só rodar na ordem abaixo — **uma geração por vez** — e salvar cada resultado com o nome de arquivo indicado. Depois me avisa que eu integro tudo no site.

Referências já hospedadas no Runway (válidas por ~1 ano, aparecem nos seus assets):
- **@fone** — foto do headset rosa (vista explodida, sem logo aparente)
- **@zeni** — retrato buzz cut, moletom preto, estúdio escuro

> Atenção: as fotos originais do fone têm um logo "G" nas conchas. Todos os prompts pedem versão **sem marca**. Confira cada resultado antes de aprovar.

---

## 1. Tech sheet do fone (trava de design)
**Modelo:** Nano Banana Pro · imagem · 16:9 · referência: @fone
**Salvar como:** `assets-gerados/tech-sheet-fone.png`

```
Tech sheet of the premium over-ear headphone from @fone, original unbranded design, matte hot pink shell with graphite metal headband and brushed aluminum hinges, soft-touch texture on the ear cushions, keep the exact same shell shape, cushion proportions and pink color as @fone but remove any logo or brand mark, multiple views front / 45-degree / side / rear, plus exploded view showing ear cushions, driver housing, acoustic mesh, driver magnet assembly, internal wiring, headband slider and hinge screws separated in organized aligned layers, white background, isolated, studio softbox lighting, soft shadows, orthographic projection, no text, no logo, no brand marks, 8k resolution, highly detailed
```

## 2. Imagem hero (primeiro quadro do vídeo)
**Modelo:** Nano Banana Pro · imagem · 16:9 · referências: @zeni + @fone (ou o tech sheet aprovado do passo 1)
**Salvar como:** `assets-gerados/hero.png`

```
Cinematic hero frame, the young adult male creator from @zeni with buzzcut hair, mustache and neck tattoos, seen from a three-quarter back angle in a dark sophisticated studio, wearing the premium unbranded over-ear headphone from @fone with matte hot pink shells and graphite metal headband, deep black background, dramatic rim lighting from the left, soft pink bounce light on the headphone shell, subtle floating dust particles, volumetric haze, shallow depth of field, no extreme close-up of the face, no text, no logo, no brand marks, photorealistic, cinematic 16:9, 8k, highly detailed
```

## 3. Vídeo — clipe 1 de 2 (5 s)
**Modelo:** Kling 3.0 Pro · Image to Video · primeiro quadro = `hero.png` · 16:9 · sem áudio
**Salvar como:** `assets-gerados/clipe-1.mp4`

```
Single continuous cinematic shot, no cuts. Start on the young adult male creator seen from a three-quarter back angle in a dark studio, wearing a matte hot pink over-ear headphone. The headphone gently lifts off his head and rises, floating weightless, while the camera performs a slow smooth 180 degree orbit around the floating headphone and the man dissolves into the darkness behind. Slow, smooth, weightless motion, dramatic rim lighting, pink accent light, floating particles, deep black background, no text, no logo, no brand marks, photorealistic, cinematic, 16:9, no audio
```

## 4. Vídeo — clipe 2 de 2 (5 s)
**Modelo:** Seedance 2.0 · Image to Video · **startFrame = último quadro do clipe 1** (exporta o frame final no player do Runway) · 16:9 · sem áudio
**Salvar como:** `assets-gerados/clipe-2.mp4`

```
Single continuous cinematic shot, no cuts. The floating matte hot pink over-ear headphone separates into a clean exploded view: ear cushions, acoustic mesh, driver housing, magnet assembly, internal wiring, headband slider and hinge screws drifting apart into organized, aligned, suspended layers. Nothing breaks, nothing is thrown, nothing disappears, every part keeps its exact original design and color. The camera executes a controlled slow push in and dollies forward through the open driver housing, ending on a dark empty frame. Slow, smooth, weightless motion, dramatic rim lighting, pink accent light, floating particles, deep black background, no text, no logo, no brand marks, photorealistic, cinematic, 16:9, no audio
```

## 5. Imagem de encerramento (seção Sobre)
**Modelo:** Nano Banana Pro · imagem · 16:9 · referências: @zeni + @fone
**Salvar como:** `assets-gerados/sobre-estudio.png`

```
The young adult male creator from @zeni with buzzcut hair and mustache, in profile inside a dark editing studio, lit only by the glow of a large monitor showing abstract motion frames, wearing the matte hot pink over-ear headphone from @fone around his neck, hand on a mouse, warm rim light, deep shadows, cinematic realism, no readable text on screen, no logo, no brand marks, photorealistic, 8k, highly detailed
```

## 6. Stills conceituais (3 verticais sem case real)
**Modelo:** Nano Banana Pro ou Seedream · imagem · 16:9 · sem referência
**Salvar como:** `assets-gerados/concept-fintech.png`, `concept-sports.png`, `concept-eventos.png`

Base (trocar só o bloco `[CENA]`):
```
Cinematic still frame from a brand film, [CENA], dramatic controlled lighting, deep shadows, muted graphite palette with a single hot pink accent, anamorphic look, shallow depth of field, no text, no logo, no brand marks, no readable interface, photorealistic, cinematic 16:9, 8k, highly detailed
```

- **fintech:** `a hand sliding across a dark glass surface reflecting abstract data light`
- **sports:** `a running shoe mid-stride frozen above wet asphalt at night, water droplets suspended`
- **eventos:** `a crowd silhouette under stage haze and a single hard beam of light`

> Logística e imobiliário já têm case real no site (TR Aguiar e Debiasi) — não precisam de conceitual.

---

Quando os arquivos estiverem na pasta `C:\Site - zeni\assets-gerados\`, me chama: eu extraio os 120 quadros do vídeo com ffmpeg, monto a sequência no canvas e finalizo a validação.
