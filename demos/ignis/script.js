/* Ignis · interactions (shares structure with the main site) */

// --- custom cursor ---
(function () {
  const dot = document.querySelector(".cursor-dot");
  const ring = document.querySelector(".cursor-ring");
  if (!dot || !ring) return;

  let x = innerWidth / 2, y = innerHeight / 2, rx = x, ry = y;
  addEventListener("mousemove", (e) => {
    x = e.clientX; y = e.clientY;
    dot.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
  });
  (function raf() {
    rx += (x - rx) * 0.14;
    ry += (y - ry) * 0.14;
    ring.style.transform = `translate(${rx}px, ${ry}px) translate(-50%, -50%)`;
    requestAnimationFrame(raf);
  })();
  document.querySelectorAll("a, button, [data-magnetic]").forEach((el) => {
    el.addEventListener("mouseenter", () => ring.classList.add("hover"));
    el.addEventListener("mouseleave", () => ring.classList.remove("hover"));
  });
})();

// --- magnetic ---
(function () {
  document.querySelectorAll("[data-magnetic]").forEach((el) => {
    el.addEventListener("mousemove", (e) => {
      const r = el.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height / 2);
      el.style.transform = `translate(${dx * 0.22}px, ${dy * 0.22}px)`;
    });
    el.addEventListener("mouseleave", () => { el.style.transform = ""; });
  });
})();

// --- reveal ---
(function () {
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
    }
  }, { threshold: 0.14, rootMargin: "0px 0px -5% 0px" });
  document.querySelectorAll(".reveal").forEach((el) => io.observe(el));
})();

// --- hero fallback canvas (amber smoke) ---
(function () {
  const canvas = document.querySelector(".hero-canvas");
  const video = document.querySelector(".hero-video");
  if (!canvas) return;

  if (video) {
    video.addEventListener("playing", () => { canvas.style.display = "none"; }, { once: true });
  }

  const ctx = canvas.getContext("2d");
  let w, h, t = 0;
  const resize = () => {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    w = canvas.width = innerWidth * dpr;
    h = canvas.height = innerHeight * dpr;
    canvas.style.width = innerWidth + "px";
    canvas.style.height = innerHeight + "px";
  };
  resize();
  addEventListener("resize", resize);

  function draw() {
    t += 0.0022;
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, "#1a0e05");
    g.addColorStop(0.55, "#0f0b07");
    g.addColorStop(1, "#070402");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    const blobs = [
      { hue: 32, x: .35 + Math.sin(t) * .12,        y: .6 + Math.cos(t * .8) * .15,   r: .55, alpha: .38 },
      { hue: 18, x: .62 + Math.cos(t * .7) * .14,   y: .45 + Math.sin(t * .6) * .18,  r: .48, alpha: .30 },
      { hue: 10, x: .5  + Math.sin(t * .55) * .2,   y: .72 + Math.cos(t * .45) * .12, r: .42, alpha: .22 },
      { hue: 44, x: .2  + Math.cos(t * .9) * .15,   y: .3 + Math.sin(t * .7) * .1,    r: .32, alpha: .18 },
    ];
    for (const b of blobs) {
      const rg = ctx.createRadialGradient(
        b.x * w, b.y * h, 0,
        b.x * w, b.y * h, Math.max(w, h) * b.r
      );
      rg.addColorStop(0, `hsla(${b.hue}, 70%, 45%, ${b.alpha})`);
      rg.addColorStop(1, "hsla(0, 0%, 0%, 0)");
      ctx.fillStyle = rg;
      ctx.fillRect(0, 0, w, h);
    }

    requestAnimationFrame(draw);
  }
  draw();
})();

// --- smooth anchors ---
document.querySelectorAll('a[href^="#"]').forEach((a) => {
  a.addEventListener("click", (e) => {
    const id = a.getAttribute("href");
    if (id.length > 1) {
      const target = document.querySelector(id);
      if (target) { e.preventDefault(); target.scrollIntoView({ behavior: "smooth", block: "start" }); }
    }
  });
});
