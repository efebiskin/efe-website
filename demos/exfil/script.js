/* =========================================================
   EXFIL™ · script.js — scroll-scrubbed image sequence
   Frames pre-rendered in Blender (Cycles via tools/blender/explode.py)
   Apple AirPods Pro / Vision Pro page technique.
   ========================================================= */

// ---------- DOM ----------
const stage       = document.getElementById("stage");
const canvas      = document.getElementById("three-canvas");   // reuse existing element
const ctx         = canvas.getContext("2d");
const overlays    = Array.from(document.querySelectorAll(".overlay"));
const progressBar = document.getElementById("progress-bar");
const progressPct = document.getElementById("progress-pct");
const hudSection  = document.getElementById("hud-section");
const hudRem      = document.getElementById("hud-rem");
const hudCore     = document.getElementById("hud-core");
const hudStatus   = document.getElementById("hud-status");

// ---------- Frame sequence config ----------
const FRAME_COUNT = 101;         // frame_0000 .. frame_0100
const FRAME_PATH  = (i) => `assets/frames/frame_${String(i).padStart(4, "0")}.png`;

// ---------- Pre-load all frames ----------
const frames = new Array(FRAME_COUNT);
let framesLoaded = 0;

function loadFrames(onAllLoaded) {
  for (let i = 0; i < FRAME_COUNT; i++) {
    const img = new Image();
    img.onload = () => {
      framesLoaded++;
      if (framesLoaded === FRAME_COUNT) onAllLoaded();
      // also redraw the first frame as soon as it loads so the page isn't blank
      if (i === 0) draw();
    };
    img.src = FRAME_PATH(i);
    frames[i] = img;
  }
}

// ---------- Canvas size ----------
let DPR = Math.min(window.devicePixelRatio || 1, 1.5);
function resize() {
  canvas.width  = Math.floor(innerWidth  * DPR);
  canvas.height = Math.floor(innerHeight * DPR);
  canvas.style.width  = innerWidth  + "px";
  canvas.style.height = innerHeight + "px";
  ctx.imageSmoothingQuality = "high";
  draw();
}
window.addEventListener("resize", resize);

// ---------- Scroll → progress ----------
function getProgress() {
  const r = stage.getBoundingClientRect();
  const total = Math.max(1, stage.offsetHeight - innerHeight);
  return Math.max(0, Math.min(1, -r.top / total));
}

// ---------- Draw current frame ----------
function draw() {
  const progress = getProgress();
  const idx = Math.min(FRAME_COUNT - 1, Math.floor(progress * (FRAME_COUNT - 1)));
  const img = frames[idx];

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (img && img.complete && img.naturalWidth > 0) {
    // Fit-and-center the frame in the canvas (preserve aspect)
    const scale = Math.min(canvas.width / img.naturalWidth, canvas.height / img.naturalHeight) * 0.9;
    const w = img.naturalWidth  * scale;
    const h = img.naturalHeight * scale;
    const x = (canvas.width  - w) / 2;
    const y = (canvas.height - h) / 2;
    ctx.drawImage(img, x, y, w, h);
  }

  // ---- HUD updates ----
  if (progressBar) progressBar.style.width = (progress * 100).toFixed(1) + "%";
  if (progressPct) progressPct.textContent = String(Math.floor(progress * 100)).padStart(3, "0");

  for (const ov of overlays) {
    const from = parseFloat(ov.dataset.from);
    const to   = parseFloat(ov.dataset.to);
    ov.classList.toggle("in", progress >= from && progress <= to);
  }

  const phaseLabels = [
    "// scroll // BREAK_PROTOCOL",
    "// usb-a // 5Gbps",
    "// core // disassembly",
    "// reveal // internals",
    "// exfil // complete",
  ];
  const phase = progress < 0.20 ? 0 : progress < 0.45 ? 1 : progress < 0.70 ? 2 : progress < 0.92 ? 3 : 4;
  if (hudSection) hudSection.textContent = phaseLabels[phase];
  if (hudRem)    hudRem.textContent    = Math.floor(256 * (1 - progress)).toString().padStart(3, "0") + "GB";
  if (hudCore)   hudCore.textContent   = (22 + progress * 30).toFixed(1).padStart(4, "0") + "°C";
  if (hudStatus) hudStatus.textContent = progress > 0.85 ? "EXFIL" : progress > 0.5 ? "BREAK" : progress > 0.2 ? "DECRYPT" : "IDLE";
}

// ---------- Scroll-bound, throttled with rAF ----------
let pending = false;
function onScroll() {
  if (!pending) {
    pending = true;
    requestAnimationFrame(() => {
      draw();
      pending = false;
    });
  }
}
window.addEventListener("scroll", onScroll, { passive: true });

// ---------- Init ----------
resize();
loadFrames(() => {
  console.log(`✓ All ${FRAME_COUNT} frames loaded`);
  draw();
});
if (overlays[0]) overlays[0].classList.add("in");

// ---------- Smooth-scroll for in-page anchors ----------
document.querySelectorAll('a[href^="#"]').forEach((a) => {
  a.addEventListener("click", (e) => {
    const id = a.getAttribute("href");
    if (id.length > 1) {
      const t = document.querySelector(id);
      if (t) { e.preventDefault(); t.scrollIntoView({ behavior: "smooth", block: "start" }); }
    }
  });
});
