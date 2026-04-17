#!/usr/bin/env python3
"""
gen-hero.py — generate a Seedance 2.0 hero video and save to assets/hero.mp4

Usage:
    # set once
    export FAL_KEY=your-fal-api-key

    python tools/gen-hero.py "slow drifting purple nebula, cinematic, grainy film"
    python tools/gen-hero.py "liquid chrome ribbons, dark abstract, ultra slow" --out assets/hero-chrome.mp4
    python tools/gen-hero.py --aspect 21:9 --duration 10 "deep ocean currents with biolights"

Requires only Python stdlib + `urllib`. No pip install needed.

fal.ai endpoint docs: https://fal.ai/models/fal-ai/bytedance/seedance/v1/pro
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path


FAL_ENDPOINT = "https://queue.fal.run/fal-ai/bytedance/seedance/v1/pro/text-to-video"
FAL_STATUS_BASE = "https://queue.fal.run/fal-ai/bytedance/seedance/v1/pro"


def _headers(key: str) -> dict[str, str]:
    return {
        "Authorization": f"Key {key}",
        "Content-Type": "application/json",
        "Accept": "application/json",
    }


def _post(url: str, body: dict, key: str) -> dict:
    req = urllib.request.Request(
        url,
        data=json.dumps(body).encode("utf-8"),
        headers=_headers(key),
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read())


def _get(url: str, key: str) -> dict:
    req = urllib.request.Request(url, headers=_headers(key))
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read())


def _download(url: str, dest: Path) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    with urllib.request.urlopen(url, timeout=120) as resp, dest.open("wb") as f:
        while True:
            chunk = resp.read(64 * 1024)
            if not chunk:
                break
            f.write(chunk)


def submit(prompt: str, aspect_ratio: str, duration: int, key: str) -> str:
    """Submit a text-to-video job. Returns the request_id for polling."""
    payload = {
        "prompt": prompt,
        "aspect_ratio": aspect_ratio,   # "16:9", "21:9", "9:16", "1:1"
        "duration": duration,            # 5 or 10 (seconds) on Seedance Pro
        "resolution": "720p",
        "seed": -1,
    }
    resp = _post(FAL_ENDPOINT, payload, key)
    request_id = resp.get("request_id")
    if not request_id:
        raise RuntimeError(f"submit failed, response: {resp}")
    return request_id


def wait(request_id: str, key: str, poll_every: float = 3.0, timeout: float = 300.0) -> dict:
    """Poll the status endpoint until the job succeeds or fails."""
    deadline = time.monotonic() + timeout
    while True:
        if time.monotonic() > deadline:
            raise TimeoutError(f"job {request_id} did not finish in {timeout}s")
        status = _get(f"{FAL_STATUS_BASE}/requests/{request_id}/status", key)
        state = status.get("status")
        elapsed = int(time.monotonic() - (deadline - timeout))
        print(f"  [{elapsed:>3}s] status: {state}")
        if state == "COMPLETED":
            return _get(f"{FAL_STATUS_BASE}/requests/{request_id}", key)
        if state in {"FAILED", "CANCELLED"}:
            raise RuntimeError(f"job {state}: {status}")
        time.sleep(poll_every)


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description="Generate a Seedance 2.0 hero video via fal.ai.")
    ap.add_argument("prompt", help="Text prompt for the video.")
    ap.add_argument("--out", default="assets/hero.mp4", help="Output path (default: assets/hero.mp4)")
    ap.add_argument("--aspect", default="16:9", choices=["16:9", "21:9", "9:16", "1:1"])
    ap.add_argument("--duration", type=int, default=5, choices=[5, 10], help="Clip length in seconds")
    ap.add_argument("--key", default=os.environ.get("FAL_KEY"), help="fal.ai API key (or set FAL_KEY env)")
    args = ap.parse_args(argv)

    if not args.key:
        print("error: set FAL_KEY env var or pass --key", file=sys.stderr)
        return 2

    print(f"→ generating: {args.prompt!r}  ({args.aspect}, {args.duration}s)")
    try:
        req_id = submit(args.prompt, args.aspect, args.duration, args.key)
        print(f"  request_id: {req_id}")
        result = wait(req_id, args.key)
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")
        print(f"HTTP error {e.code}: {body}", file=sys.stderr)
        return 1
    except Exception as e:
        print(f"error: {e}", file=sys.stderr)
        return 1

    video_url = (result.get("video") or {}).get("url")
    if not video_url:
        print(f"error: no video url in response: {result}", file=sys.stderr)
        return 1

    out = Path(args.out)
    print(f"→ downloading → {out}")
    _download(video_url, out)

    size_mb = out.stat().st_size / (1024 * 1024)
    print(f"✓ done: {out} ({size_mb:.2f} MB)")
    print(f"  refresh your site — the hero will now play this video.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
