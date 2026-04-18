/* =========================================================
   ATLAS · script.js — simplest working version
   - Pieces stacked via flexbox (natural assembly)
   - translateY(data-y * progress) for disassembly on scroll
   - Auto-demo animation on page load so it's obvious
   ========================================================= */

(() => {
  const stage = document.getElementById("stage");
  const exploded = document.getElementById("exploded");
  const pieces = exploded ? Array.from(exploded.querySelectorAll(".piece")) : [];
  const overlays = Array.from(document.querySelectorAll(".overlay"));
  const progressBar = document.getElementById("progress-bar");
  const progressPct = document.getElementById("progress-pct");
  const hudSection = document.getElementById("hud-section");
  const hudPwr = document.getElementById("hud-pwr");
  const hudClk = document.getElementById("hud-clk");
  const hudTops = document.getElementById("hud-tops");

  // Bright debug panel so we can see state without DevTools
  const dbg = document.createElement("div");
  dbg.style.cssText = `
    position: fixed; top: 100px; left: 16px; z-index: 9999;
    font-family: ui-monospace, monospace; font-size: 11px;
    color: #00D4FF; background: rgba(0,0,0,.8);
    padding: 8px 12px; border: 1px solid #00D4FF77;
    line-height: 1.55; pointer-events: none; white-space: pre;
  `;
  document.body.appendChild(dbg);

  if (!stage)         { dbg.textContent = "ERR: #stage not found"; return; }
  if (!exploded)      { dbg.textContent = "ERR: #exploded not found"; return; }
  if (pieces.length === 0) { dbg.textContent = "ERR: no .piece elements"; return; }

  const pieceData = pieces.map((el) => ({
    el,
    y:     parseFloat(el.dataset.y     || "0"),
    delay: parseFloat(el.dataset.delay || "0"),
  }));

  const smooth = (a, b, x) => {
    const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
    return t * t * (3 - 2 * t);
  };

  // ----- Auto-demo on page load -----
  // Runs for 4 seconds: 0→1 (disassemble) → 0 (reassemble).
  // Whichever is greater (scroll or demo) wins.
  let demoStart = performance.now();
  let demoActive = true;

  function getDemoProgress() {
    if (!demoActive) return 0;
    const elapsed = (performance.now() - demoStart) / 1000;
    if (elapsed > 5) { demoActive = false; return 0; }
    // 0→1.5s: rest (assembled)
    // 1.5→3s: disassemble to 1
    // 3→5s: reassemble to 0
    if (elapsed < 1.5) return 0;
    if (elapsed < 3.0) return smooth(1.5, 3.0, elapsed);
    return 1 - smooth(3.0, 5.0, elapsed);
  }

  // Stop demo as soon as user scrolls
  let userScrolled = false;
  window.addEventListener("scroll", () => {
    userScrolled = true;
    demoActive = false;
  }, { passive: true, once: true });

  function getScrollProgress() {
    const r = stage.getBoundingClientRect();
    const total = Math.max(1, stage.offsetHeight - window.innerHeight);
    return Math.max(0, Math.min(1, -r.top / total));
  }

  function tick() {
    const scrollP = getScrollProgress();
    const demoP   = getDemoProgress();
    const progress = userScrolled ? scrollP : Math.max(scrollP, demoP);

    // progress bar + %
    if (progressBar) progressBar.style.width = (progress * 100).toFixed(1) + "%";
    if (progressPct) progressPct.textContent = String(Math.floor(progress * 100)).padStart(3, "0");

    // overlays
    for (const ov of overlays) {
      const from = parseFloat(ov.dataset.from);
      const to   = parseFloat(ov.dataset.to);
      ov.classList.toggle("in", progress >= from && progress <= to);
    }

    // HUD
    const phaseLabels = ["// 01 · ASSEMBLED", "// 02 · LIFTING", "// 03 · DISASSEMBLED", "// 04 · ATLAS"];
    const phase = progress < 0.15 ? 0 : progress < 0.55 ? 1 : progress < 0.92 ? 2 : 3;
    if (hudSection) hudSection.textContent = phaseLabels[phase];
    if (hudPwr)  hudPwr.textContent  = (12 * progress).toFixed(1).padStart(4, "0") + "W";
    if (hudClk)  hudClk.textContent  = (4.2 * progress).toFixed(3) + "GHz";
    if (hudTops) hudTops.textContent = Math.floor(9800 * progress).toLocaleString().padStart(5, "0");

    // ─── the important bit: move each piece ───
    for (const p of pieceData) {
      const t = smooth(p.delay, p.delay + 0.65, progress);
      const ty = p.y * t;
      p.el.style.transform = `translateY(${ty}px)`;
    }

    // debug
    dbg.textContent =
      `progress: ${(progress * 100).toFixed(1)}%\n` +
      `source:   ${userScrolled ? "scroll" : demoActive ? "demo" : "rest"}\n` +
      `pieces:   ${pieces.length}\n` +
      `stage h:  ${stage.offsetHeight}px\n` +
      `exploded: ${exploded.offsetWidth}×${exploded.offsetHeight}px`;

    requestAnimationFrame(tick);
  }

  tick();
  if (overlays[0]) overlays[0].classList.add("in");

  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener("click", (e) => {
      const id = a.getAttribute("href");
      if (id.length > 1) {
        const t = document.querySelector(id);
        if (t) { e.preventDefault(); t.scrollIntoView({ behavior: "smooth", block: "start" }); }
      }
    });
  });
})();
