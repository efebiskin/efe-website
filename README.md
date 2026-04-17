# efe-website

> Personal portfolio, motion-first. Built with **Claude Opus 4.7** (code) + **Seedance 2.0** (hero video).

Static site. Zero dependencies. Zero build step. Drop into any static host (Vercel, Netlify, GitHub Pages, Cloudflare Pages) — or open `index.html` directly in a browser.

## Live

Deploy with one click on Vercel: drag the folder into [vercel.com/new](https://vercel.com/new), or connect the repo.

## The Seedance 2.0 slot

The hero video is the one place in the site that expects a generated `.mp4`. The flow:

1. Generate a ~10–20s loop in **Seedance 2.0** (via fal.ai or ByteDance direct). Good prompts for this site: *"slow drifting purple-teal nebula, grainy film stock, cinematic"*, *"abstract liquid chrome ribbons, dark, slow"*, *"deep ocean currents with faint biolights, ultra slow"*.
2. Export at 1920×1080, 24–30 fps, H.264, under 3 MB (loop-ready).
3. Save as `assets/hero.mp4`.

That's it. The video auto-plays muted, auto-loops, auto-fills the viewport.

**If `assets/hero.mp4` is missing**, the hero shows a procedural WebGL-style gradient canvas (implemented in pure 2D canvas — see `assets/script.js :: heroCanvas`). The site never looks broken.

## Swap the content

Everything lives in `index.html`. Search for these:

- Hero copy: `.hero-title` and `.hero-sub`
- Project list: `<article class="project">` blocks under `#work`
- Open-source cards: `.oss-card` blocks
- Contact links: `.contact-links`

## Stack

- HTML + CSS + vanilla JS
- Google Fonts: *Instrument Serif* (display italic), *Inter* (body), *JetBrains Mono* (labels)
- Canvas 2D for hero fallback
- `IntersectionObserver` for scroll reveals
- Custom cursor via `mix-blend-mode: difference`
- Magnetic hover via `mousemove` delta → transform

## Local preview

```bash
# Python
python -m http.server 5173
# or Node
npx serve .
```

Then open `http://localhost:5173`.

## License

MIT.
