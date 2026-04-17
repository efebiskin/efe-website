# tools

## `gen-hero.py`

Generates a Seedance 2.0 hero video via fal.ai and drops it into `assets/hero.mp4`.

### One-time setup

1. Go to [fal.ai](https://fal.ai/dashboard/keys), create an API key.
2. Add credit (~$5 is plenty to start).
3. Set the key in your shell:

```bash
# Windows (Git Bash / PowerShell)
export FAL_KEY="your-fal-key-here"

# Or pass --key on every call
python tools/gen-hero.py --key "your-fal-key-here" "your prompt"
```

### Usage

```bash
# Default — 5s clip at 16:9, saves to assets/hero.mp4
python tools/gen-hero.py "slow drifting purple nebula, grainy film, cinematic"

# Custom duration / aspect / output path
python tools/gen-hero.py --duration 10 --aspect 21:9 \
  --out assets/hero-wide.mp4 \
  "liquid chrome ribbons, dark abstract, ultra slow"
```

### Good prompts for this site's palette

- `"slow drifting purple-teal nebula, grainy film stock, cinematic, no text"`
- `"liquid chrome ribbons over black, very slow, cinematic"`
- `"deep ocean currents with faint bioluminescent particles, slow drift, dark"`
- `"abstract violet smoke against black, ultra slow motion, soft focus"`
- `"minimalist cream-colored silk fabric, slow waves, dark background"`

### Cost

- Seedance 2.0 Pro on fal.ai: **~$0.40 for a 5s clip at 720p**.
- A full portfolio iteration (5–8 clip tests) = **$2–4**.

### Troubleshooting

- `401` → API key wrong or not set
- `402` → out of fal credit → add more in the dashboard
- Timeout → Seedance sometimes queues for 60s. The script polls up to 5 min. Bump `--timeout` if needed.
