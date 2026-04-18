# EXFIL · Meshy.ai workflow

The procedural three.js model is a placeholder. To make EXFIL look photorealistic, generate the drive in **Meshy.ai**, download the `.glb`, and drop it at:

```
demos/exfil/assets/exfil-drive.glb
```

The page auto-detects it on next reload. The procedural model hides; the Meshy model takes its place under HDRI lighting + ACES tonemap + bloom.

---

## Suggested prompts

### Single full-product prompt (for the hero showcase)

> A futuristic cyberpunk USB flash drive, dual connectors with USB-A on the left end and USB-C on the right end, brushed dark anodized aluminum body, magenta-pink and electric yellow neon edge accents, small amber LED indicator on top, premium product industrial design, photorealistic, studio lighting, 8K render, white background

### Style modifiers worth adding

- `octane render`, `unreal engine 5`, `redshift` → cleaner specular highlights
- `top-down product photography` → if you want the chip layout visible
- `cinematic backlight` → halo/rim lighting that bloom will catch
- `physically based materials` → forces PBR map output

### Settings inside Meshy

- **Mode:** Text-to-3D **Pro** (not Quick) — Pro outputs better topology + PBR textures
- **Polycount:** 30k–60k is the sweet spot (under that = blocky, over that = slow to load)
- **Texture:** PBR (you want albedo + normal + roughness + metalness baked in)
- **Format:** **GLB** (single binary file, all textures embedded — easiest)
- **Symmetry:** off (USB-A and USB-C ends are different shapes)

---

## What gets swapped vs. what stays

| Element | Source after GLB load |
|---|---|
| 3D model in the hero | **Your Meshy GLB** ✓ |
| HDRI lighting / reflections | three.js `RoomEnvironment` (procedural) |
| Bloom on emissive parts | `UnrealBloomPass` |
| Tone mapping | ACES Filmic |
| Camera scroll behavior | Procedural — model tilts forward + zooms slightly as you scroll |
| Disassembly groups | **Disabled when GLB is loaded** (one mesh, can't split) |
| HUD, overlays, scanlines, kanji, copy | Unchanged |

---

## If you want disassembly to keep working with the Meshy model

Two options:

1. **Generate parts separately** — run Meshy multiple times with prompts for each component (body, USB-A connector, USB-C connector, PCB), download each as its own GLB. Tell me the filenames and I'll wire each one to a disassembly group.
2. **Stay with the procedural model for the disassembly section**, use the Meshy GLB *only* as the assembled "money shot" at the top + bottom of the page. (Best for first version — fastest result.)

---

## Cost reality check

Meshy Pro plan is $20/mo for 200 generations. For client work:
- Generate 3–5 candidates per project, pick the best → $0.40–0.70 per usable model
- Bake into your Pro tier ($1,500/site) and the cost is a rounding error
- Don't include this in your Starter tier ($750) — sourcing free Sketchfab GLBs is fine for the cheaper tier
