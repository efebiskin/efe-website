/* =========================================================
   NOIR · script.js
   - Scroll progress bar
   - Editorial cursor (label-on-link)
   - Cursor-driven WebGL displacement on the cover figure
   - Chromatic aberration on lookbook (split RGB ghost layers)
   - Form submit
   ========================================================= */

/* ---------- Scroll progress ---------- */
(function () {
  const bar = document.getElementById("progress");
  if (!bar) return;
  function set() {
    const h = document.documentElement;
    const max = h.scrollHeight - h.clientHeight;
    const p = max > 0 ? (h.scrollTop / max) * 100 : 0;
    bar.style.width = p + "%";
  }
  window.addEventListener("scroll", set, { passive: true });
  set();
})();

/* ---------- Editorial cursor ---------- */
(function () {
  const cur = document.getElementById("ed-cursor");
  if (!cur) return;
  const lbl = cur.querySelector("span");

  let x = innerWidth / 2, y = innerHeight / 2;
  let cx = x, cy = y;
  addEventListener("mousemove", (e) => { x = e.clientX; y = e.clientY; });

  (function raf() {
    cx += (x - cx) * 0.3;
    cy += (y - cy) * 0.3;
    cur.style.transform = `translate(${cx}px, ${cy}px)`;
    requestAnimationFrame(raf);
  })();

  document.querySelectorAll("[data-cursor]").forEach((el) => {
    el.addEventListener("mouseenter", () => {
      cur.classList.add("label");
      lbl.textContent = el.dataset.cursor;
    });
    el.addEventListener("mouseleave", () => {
      cur.classList.remove("label");
      lbl.textContent = "";
    });
  });
})();

/* ---------- Cover: cursor-driven WebGL displacement
   The cover image is filtered grayscale; this canvas paints
   a displacement-noise mask that pulses near the cursor,
   creating a soft warped halo over the figure.
   ---------- */
(function () {
  const fig = document.getElementById("cover-figure");
  const canvas = document.querySelector(".cover-canvas");
  const img = document.querySelector(".cover-img");
  if (!fig || !canvas) return;

  // Fade the image in once it loads (handles slow Picsum responses).
  if (img) {
    if (img.complete) fig.classList.add("ready");
    else img.addEventListener("load", () => fig.classList.add("ready"));
    img.addEventListener("error", () => fig.classList.add("ready")); // still show frame
  }

  const gl = canvas.getContext("webgl", { antialias: false, alpha: true, premultipliedAlpha: false });
  if (!gl) return;

  function resize() {
    const dpr = Math.min(devicePixelRatio || 1, 1.6);
    const r = canvas.getBoundingClientRect();
    canvas.width = Math.max(2, Math.floor(r.width * dpr));
    canvas.height = Math.max(2, Math.floor(r.height * dpr));
    gl.viewport(0, 0, canvas.width, canvas.height);
  }
  resize();
  addEventListener("resize", resize);

  const vsSrc = `attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }`;
  const fsSrc = `
    precision mediump float;
    uniform float uTime;
    uniform vec2  uRes;
    uniform vec2  uMouse;     // 0..1 normalized
    uniform float uActive;    // 0 or 1

    float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    float noise(vec2 p){
      vec2 i = floor(p), f = fract(p);
      float a=hash(i), b=hash(i+vec2(1,0)), c=hash(i+vec2(0,1)), d=hash(i+vec2(1,1));
      vec2 u = f*f*(3.0-2.0*f);
      return mix(a,b,u.x) + (c-a)*u.y*(1.0-u.x) + (d-b)*u.x*u.y;
    }
    float fbm(vec2 p){ float v=0.,a=.5; for(int i=0;i<5;i++){ v+=a*noise(p); p*=2.; a*=.5; } return v; }

    void main(){
      vec2 uv = gl_FragCoord.xy / uRes.xy;
      vec2 m = vec2(uMouse.x, 1.0 - uMouse.y);
      float d = distance(uv, m);

      // soft halo proximity to cursor
      float halo = smoothstep(0.5, 0.05, d) * uActive;

      // warped noise field
      vec2 q = uv * 2.5 + vec2(fbm(uv*2.+uTime*.05), fbm(uv*2.+5.+uTime*.04));
      float n = fbm(q*1.5+uTime*.02);

      // Editorial red spot near cursor that breathes the noise
      vec3 red = vec3(0.902, 0.224, 0.275);
      vec3 paper = vec3(0.957, 0.945, 0.925);

      // Base = transparent paper tone; halo paints red onto it
      vec3 col = paper * (0.7 + 0.3*n);
      col = mix(col, red, halo * (0.55 + 0.4*n));

      // Vignette
      float vig = smoothstep(1.1, 0.2, distance(uv, vec2(0.5)));
      col = mix(paper * 0.8, col, 0.4 + 0.6 * vig);

      gl_FragColor = vec4(col, 0.55 + halo * 0.35);
    }
  `;

  function compile(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) return null;
    return s;
  }
  const vs = compile(gl.VERTEX_SHADER, vsSrc);
  const fs = compile(gl.FRAGMENT_SHADER, fsSrc);
  if (!vs || !fs) return;
  const prog = gl.createProgram();
  gl.attachShader(prog, vs); gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
  gl.useProgram(prog);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, "p");
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  const uTime   = gl.getUniformLocation(prog, "uTime");
  const uRes    = gl.getUniformLocation(prog, "uRes");
  const uMouse  = gl.getUniformLocation(prog, "uMouse");
  const uActive = gl.getUniformLocation(prog, "uActive");

  let mx = 0.5, my = 0.5;
  let active = 0;
  let mxT = 0.5, myT = 0.5, activeT = 0;

  fig.addEventListener("mousemove", (e) => {
    const r = fig.getBoundingClientRect();
    mxT = (e.clientX - r.left) / r.width;
    myT = (e.clientY - r.top) / r.height;
    activeT = 1;
  });
  fig.addEventListener("mouseleave", () => { activeT = 0; });

  const t0 = performance.now();
  function frame() {
    const t = (performance.now() - t0) / 1000;
    mx += (mxT - mx) * 0.18;
    my += (myT - my) * 0.18;
    active += (activeT - active) * 0.08;
    gl.uniform1f(uTime, t);
    gl.uniform2f(uRes, canvas.width, canvas.height);
    gl.uniform2f(uMouse, mx, my);
    gl.uniform1f(uActive, active);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    requestAnimationFrame(frame);
  }
  frame();
})();

/* ---------- Lookbook chromatic aberration
   Inject two ghost layers (red/blue) that split apart on hover.
   ---------- */
(function () {
  document.querySelectorAll(".look").forEach((look) => {
    const img = look.querySelector("img");
    if (!img) return;
    const url = img.getAttribute("src");

    const r = document.createElement("div");
    const b = document.createElement("div");
    r.className = "ghost-r";
    b.className = "ghost-b";
    r.style.backgroundImage = `url("${url}")`;
    b.style.backgroundImage = `url("${url}")`;
    look.appendChild(r);
    look.appendChild(b);
  });
})();

/* ---------- Smooth scroll for anchor links ---------- */
document.querySelectorAll('a[href^="#"]').forEach((a) => {
  a.addEventListener("click", (e) => {
    const id = a.getAttribute("href");
    if (id.length > 1) {
      const t = document.querySelector(id);
      if (t) { e.preventDefault(); t.scrollIntoView({ behavior: "smooth", block: "start" }); }
    }
  });
});

/* ---------- Reveal-on-scroll (no markup change required;
   apply to any element with a `.reveal` class — currently
   none in the markup; the cover is intentionally static so
   the magazine reads as a print object on first paint.) ---------- */
(function () {
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
    }
  }, { threshold: 0.12, rootMargin: "0px 0px -5% 0px" });
  document.querySelectorAll(".reveal").forEach((el) => io.observe(el));
})();
