/* =========================================================
   efe-website · script.js
   Custom cursor · magnetic hover · scroll reveals · shader hero
   ========================================================= */

// ---------- Clock (nav) ----------
(function clock() {
  const el = document.getElementById("clock");
  if (!el) return;
  const fmt = () => {
    const d = new Date();
    const p = (n) => String(n).padStart(2, "0");
    el.textContent = `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
  };
  fmt();
  setInterval(fmt, 1000);
})();

// ---------- Custom cursor ----------
(function cursor() {
  const dot = document.querySelector(".cursor-dot");
  const ring = document.querySelector(".cursor-ring");
  if (!dot || !ring) return;

  let x = window.innerWidth / 2, y = window.innerHeight / 2;
  let rx = x, ry = y;

  window.addEventListener("mousemove", (e) => {
    x = e.clientX; y = e.clientY;
    dot.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
  });

  function raf() {
    rx += (x - rx) * 0.14;
    ry += (y - ry) * 0.14;
    ring.style.transform = `translate(${rx}px, ${ry}px) translate(-50%, -50%)`;
    requestAnimationFrame(raf);
  }
  raf();

  // Hover interactions: any link / button / data-magnetic
  const sel = "a, button, [data-magnetic]";
  document.querySelectorAll(sel).forEach((el) => {
    el.addEventListener("mouseenter", () => ring.classList.add("hover"));
    el.addEventListener("mouseleave", () => ring.classList.remove("hover"));
  });
})();

// ---------- Magnetic hover ----------
(function magnetic() {
  const els = document.querySelectorAll("[data-magnetic]");
  const STRENGTH = 0.25;
  els.forEach((el) => {
    el.addEventListener("mousemove", (e) => {
      const r = el.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height / 2);
      el.style.transform = `translate(${dx * STRENGTH}px, ${dy * STRENGTH}px)`;
    });
    el.addEventListener("mouseleave", () => {
      el.style.transform = "";
    });
  });
})();

// ---------- Scroll reveal ----------
(function reveal() {
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("in");
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -5% 0px" });

  document.querySelectorAll(".reveal").forEach((el) => io.observe(el));
})();

// ---------- Hero canvas (procedural Seedance fallback) ----------
// If /assets/hero.mp4 is missing, this canvas fills the hero with a
// slow-drifting gradient noise field so the hero never looks empty.
(function heroCanvas() {
  const canvas = document.querySelector(".hero-canvas");
  const video = document.querySelector(".hero-video");
  if (!canvas) return;

  // Hide canvas if video loads successfully.
  if (video) {
    video.addEventListener("playing", () => { canvas.style.display = "none"; }, { once: true });
    video.addEventListener("error", () => { /* canvas stays */ });
    // Also check if video source is actually set & loadable.
    const source = video.querySelector("source");
    if (!source || !source.getAttribute("src")) {
      // leave canvas visible
    }
  }

  const ctx = canvas.getContext("2d");
  let w = 0, h = 0, t = 0;

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = canvas.width = window.innerWidth * dpr;
    h = canvas.height = window.innerHeight * dpr;
    canvas.style.width = window.innerWidth + "px";
    canvas.style.height = window.innerHeight + "px";
  }
  resize();
  window.addEventListener("resize", resize);

  function draw() {
    t += 0.003;
    // Base gradient — deep violet to black to deep teal.
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, "#0d0b1f");
    g.addColorStop(0.5, "#0a0a0b");
    g.addColorStop(1, "#071418");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    // Drifting blobs
    const blobs = [
      { hue: 270, x: 0.3 + Math.sin(t) * 0.15,       y: 0.4 + Math.cos(t * 0.7) * 0.2,   r: 0.55 },
      { hue: 190, x: 0.7 + Math.cos(t * 0.8) * 0.18, y: 0.55 + Math.sin(t * 0.9) * 0.15, r: 0.48 },
      { hue: 300, x: 0.5 + Math.sin(t * 0.6) * 0.22, y: 0.3 + Math.cos(t * 0.5) * 0.18,  r: 0.40 },
    ];
    for (const b of blobs) {
      const rg = ctx.createRadialGradient(
        b.x * w, b.y * h, 0,
        b.x * w, b.y * h, Math.max(w, h) * b.r
      );
      rg.addColorStop(0, `hsla(${b.hue}, 70%, 55%, 0.35)`);
      rg.addColorStop(1, "hsla(0, 0%, 0%, 0)");
      ctx.fillStyle = rg;
      ctx.fillRect(0, 0, w, h);
    }

    requestAnimationFrame(draw);
  }
  draw();
})();

// ---------- Smooth-scroll anchors ----------
document.querySelectorAll('a[href^="#"]').forEach((a) => {
  a.addEventListener("click", (e) => {
    const id = a.getAttribute("href");
    if (id.length > 1) {
      const target = document.querySelector(id);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  });
});
