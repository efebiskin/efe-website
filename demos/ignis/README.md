# Ignis — spec demo

> Fictional luxury single-malt Scotch brand. Built to demonstrate motion-website style: editorial, dark, amber-toned, CSS-rendered product visuals (no stock photography).

## What's demonstrated

- **Full brand system in one file** — navigation, hero, marquee, story sections, product grid, heritage timeline, footer
- **CSS-only bottle illustrations** with amber-glow hover states (no image assets needed for core visuals)
- **Animated flame** in the brand logo using pure CSS keyframes
- **Scroll-reveal choreography** via IntersectionObserver
- **Custom cursor + magnetic hover** — same interaction language as the parent site but with luxury palette
- **Canvas fallback hero** that reads as slow amber smoke until a Seedance video is dropped in at `demos/ignis/hero.mp4`
- Fully responsive, zero framework dependencies

## Seedance prompts that fit this palette

- `"slow swirling bourbon in crystal glass, warm amber light, cinematic, dark background"`
- `"candle smoke in amber backlight, ultra slow, cinematic film grain"`
- `"peat fire glowing embers, slow motion, dark atmospheric, close up"`
- `"golden liquid droplets falling through darkness, slow motion"`

Generate with:

```bash
python ../../tools/gen-hero.py \
  --out demos/ignis/hero.mp4 \
  "slow swirling bourbon in crystal glass, warm amber light, cinematic"
```

## Commercial disclaimer

Ignis is not a real distillery. All history, products, and details are invented for demonstration purposes.
