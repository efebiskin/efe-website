/* MOTION OS · script.js
   Boot loader · WebGL hero shader · scene-tile shaders · counter tween
   terminal typewriter · web-audio click sounds · keyboard scroll
*/

/* ===================================================================
   Tiny WebGL helper — compiles a fragment shader, draws to a canvas
   =================================================================== */
function makeShader(canvas, fragSrc) {
  const gl = canvas.getContext("webgl", { antialias: false, alpha: true, premultipliedAlpha: false });
  if (!gl) return null;

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.6);
    const r = canvas.getBoundingClientRect();
    canvas.width = Math.max(2, Math.floor(r.width * dpr));
    canvas.height = Math.max(2, Math.floor(r.height * dpr));
    gl.viewport(0, 0, canvas.width, canvas.height);
  }
  resize();
  window.addEventListener("resize", resize);

  const vsSrc = `attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }`;
  function compile(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.warn("shader compile error:", gl.getShaderInfoLog(s));
      return null;
    }
    return s;
  }
  const vs = compile(gl.VERTEX_SHADER, vsSrc);
  const fs = compile(gl.FRAGMENT_SHADER, fragSrc);
  if (!vs || !fs) return null;

  const prog = gl.createProgram();
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    console.warn("program link error:", gl.getProgramInfoLog(prog));
    return null;
  }
  gl.useProgram(prog);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, "p");
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  const uTime = gl.getUniformLocation(prog, "uTime");
  const uRes  = gl.getUniformLocation(prog, "uRes");

  let start = performance.now();
  let raf;
  function frame() {
    const t = (performance.now() - start) / 1000;
    gl.uniform1f(uTime, t);
    gl.uniform2f(uRes, canvas.width, canvas.height);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    raf = requestAnimationFrame(frame);
  }
  frame();
  return { stop: () => cancelAnimationFrame(raf) };
}

/* ===================================================================
   Hero shader — domain-warped fbm noise, cream/violet on light bg
   =================================================================== */
const HERO_FRAG = `
precision mediump float;
uniform float uTime;
uniform vec2  uRes;

// classic 2D simplex-ish hash
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  float a = hash(i), b = hash(i + vec2(1.0,0.0)), c = hash(i + vec2(0.0,1.0)), d = hash(i + vec2(1.0,1.0));
  vec2 u = f*f*(3.0-2.0*f);
  return mix(a,b,u.x) + (c-a)*u.y*(1.0-u.x) + (d-b)*u.x*u.y;
}
float fbm(vec2 p){
  float v = 0.0, a = 0.5;
  for(int i = 0; i < 5; i++){ v += a * noise(p); p *= 2.0; a *= 0.5; }
  return v;
}

void main(){
  vec2 uv = (gl_FragCoord.xy - 0.5*uRes) / uRes.y;
  vec2 q = uv * 1.8;
  q += vec2(fbm(q + uTime*0.05), fbm(q + 2.7 + uTime*0.04));
  float n = fbm(q * 1.4 + uTime * 0.02);
  vec3 cream  = vec3(0.961, 0.945, 0.917);
  vec3 violet = vec3(0.357, 0.129, 0.714);
  vec3 orange = vec3(0.918, 0.345, 0.047);
  vec3 col = mix(cream, violet, smoothstep(0.45, 0.85, n));
  col = mix(col, orange, smoothstep(0.78, 0.96, n) * 0.55);
  // subtle vignette
  float vig = smoothstep(1.2, 0.2, length(uv));
  col = mix(cream, col, 0.5 + 0.5*vig);
  gl_FragColor = vec4(col, 1.0);
}
`;

window.addEventListener("DOMContentLoaded", () => {
  const heroCanvas = document.getElementById("shader");
  if (heroCanvas) makeShader(heroCanvas, HERO_FRAG);
});

/* ===================================================================
   Scene tile shaders — 8 distinct fragment shaders
   =================================================================== */
const SCENE_BASE_HEAD = `
precision mediump float;
uniform float uTime;
uniform vec2  uRes;
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  float a = hash(i), b = hash(i+vec2(1,0)), c = hash(i+vec2(0,1)), d = hash(i+vec2(1,1));
  vec2 u = f*f*(3.0-2.0*f);
  return mix(a,b,u.x) + (c-a)*u.y*(1.0-u.x) + (d-b)*u.x*u.y;
}
float fbm(vec2 p){ float v=0.,a=.5; for(int i=0;i<5;i++){v+=a*noise(p); p*=2.; a*=.5;} return v; }
`;

const SCENE_FRAGS = {
  // 1 nebula — purple/blue
  "1": SCENE_BASE_HEAD + `
  void main(){
    vec2 uv = (gl_FragCoord.xy - .5*uRes)/uRes.y;
    vec2 q = uv*2. + vec2(fbm(uv*1.5+uTime*.05), fbm(uv*1.5+5.+uTime*.04));
    float n = fbm(q*1.6+uTime*.02);
    vec3 c = mix(vec3(.05,.04,.12), vec3(.55,.21,.86), smoothstep(.3,.85,n));
    c = mix(c, vec3(.95,.85,1.), smoothstep(.85,1.,n)*.7);
    gl_FragColor = vec4(c,1.);
  }`,
  // 2 liquid chrome — silver
  "2": SCENE_BASE_HEAD + `
  void main(){
    vec2 uv = (gl_FragCoord.xy - .5*uRes)/uRes.y;
    float ang = atan(uv.y,uv.x);
    float r = length(uv);
    float wave = sin(ang*6.+uTime*.6+r*8.);
    float n = fbm(uv*3.+wave*.5);
    vec3 chrome = mix(vec3(.08), vec3(.92,.94,.98), smoothstep(.3,.7,n));
    chrome = mix(chrome, vec3(.5,.55,.62), wave*.4);
    gl_FragColor = vec4(chrome,1.);
  }`,
  // 3 flow field — cyan/magenta lines
  "3": SCENE_BASE_HEAD + `
  void main(){
    vec2 uv = (gl_FragCoord.xy - .5*uRes)/uRes.y;
    vec2 q = uv*3.;
    for(int i=0;i<3;i++){ q += vec2(sin(q.y*1.7+uTime*.3), cos(q.x*1.4+uTime*.4))*.4; }
    float n = fbm(q*.8);
    vec3 c = mix(vec3(.03,.05,.1), vec3(.0,.78,.92), smoothstep(.45,.75,n));
    c = mix(c, vec3(.97,.27,.62), smoothstep(.78,.95,n));
    gl_FragColor = vec4(c,1.);
  }`,
  // 4 amber smoke — like Ignis hero
  "4": SCENE_BASE_HEAD + `
  void main(){
    vec2 uv = (gl_FragCoord.xy - .5*uRes)/uRes.y;
    vec2 q = uv*1.6 + vec2(fbm(uv+uTime*.04), fbm(uv+3.+uTime*.05));
    float n = fbm(q*1.4+uTime*.015);
    vec3 c = mix(vec3(.06,.04,.02), vec3(.83,.39,.07), smoothstep(.35,.85,n));
    c = mix(c, vec3(1.,.84,.45), smoothstep(.83,.97,n)*.6);
    gl_FragColor = vec4(c,1.);
  }`,
  // 5 cyan drift — wellness palette
  "5": SCENE_BASE_HEAD + `
  void main(){
    vec2 uv = (gl_FragCoord.xy - .5*uRes)/uRes.y;
    vec2 q = uv*1.4 + vec2(fbm(uv+uTime*.03), fbm(uv*2.+uTime*.02));
    float n = fbm(q*1.2);
    vec3 c = mix(vec3(.02,.08,.12), vec3(.39,.78,.81), smoothstep(.4,.85,n));
    c = mix(c, vec3(.92,.97,.98), smoothstep(.86,.99,n)*.7);
    gl_FragColor = vec4(c,1.);
  }`,
  // 6 magma — deep red/orange
  "6": SCENE_BASE_HEAD + `
  void main(){
    vec2 uv = (gl_FragCoord.xy - .5*uRes)/uRes.y;
    vec2 q = uv*2.5;
    q += vec2(fbm(q+uTime*.1), fbm(q+7.+uTime*.08));
    float n = fbm(q*1.5);
    vec3 c = mix(vec3(.04,.01,.01), vec3(.86,.16,.05), smoothstep(.4,.78,n));
    c = mix(c, vec3(1.,.78,.18), smoothstep(.78,.95,n));
    gl_FragColor = vec4(c,1.);
  }`,
  // 7 static field — black + cyan grid
  "7": SCENE_BASE_HEAD + `
  void main(){
    vec2 uv = (gl_FragCoord.xy - .5*uRes)/uRes.y;
    vec2 q = uv*8.;
    float grid = step(.95, max(abs(fract(q.x)-.5), abs(fract(q.y)-.5))*2.);
    float n = noise(uv*40.+uTime*4.);
    vec3 base = vec3(.02,.02,.04);
    vec3 line = mix(vec3(.0,.95,.95), vec3(1.), step(.95,n));
    vec3 c = mix(base, line, grid*(.6+n*.4));
    gl_FragColor = vec4(c,1.);
  }`,
  // 8 soft pearl — pink/cream beauty palette
  "8": SCENE_BASE_HEAD + `
  void main(){
    vec2 uv = (gl_FragCoord.xy - .5*uRes)/uRes.y;
    vec2 q = uv*1.6 + vec2(fbm(uv*1.2+uTime*.03), fbm(uv*1.2+9.+uTime*.025));
    float n = fbm(q*1.1);
    vec3 c = mix(vec3(.96,.91,.87), vec3(.96,.71,.79), smoothstep(.4,.8,n));
    c = mix(c, vec3(.99,.87,.74), smoothstep(.78,.95,n)*.7);
    gl_FragColor = vec4(c,1.);
  }`,
};

document.querySelectorAll(".scene-art").forEach((host) => {
  const id = host.dataset.shader;
  const c = document.createElement("canvas");
  host.appendChild(c);
  const frag = SCENE_FRAGS[id];
  if (frag) makeShader(c, frag);
});

/* ===================================================================
   Boot loader (typewriter + progress)
   =================================================================== */
(function boot() {
  const cmd = document.querySelector(".boot-cmd");
  const bar = document.querySelector(".boot-bar i");
  const pct = document.querySelector(".boot-pct");
  if (!cmd || !bar || !pct) return;

  const text = "init motion-os --client your-brand";
  let i = 0;
  const type = setInterval(() => {
    cmd.textContent = text.slice(0, ++i);
    if (i >= text.length) clearInterval(type);
  }, 35);

  let p = 0;
  const tick = setInterval(() => {
    p = Math.min(100, p + 6 + Math.random() * 14);
    bar.style.width = p + "%";
    pct.textContent = Math.floor(p) + "%";
    if (p >= 100) {
      clearInterval(tick);
      setTimeout(() => document.body.classList.remove("loading"), 300);
    }
  }, 90);
})();

/* ===================================================================
   Counter tween
   =================================================================== */
(function counters() {
  const els = document.querySelectorAll("[data-counter]");
  const start = () => {
    els.forEach((el) => {
      const target = parseInt(el.dataset.counter, 10);
      const dur = 1600;
      const t0 = performance.now();
      const step = (now) => {
        const t = Math.min(1, (now - t0) / dur);
        const eased = 1 - Math.pow(1 - t, 3);
        el.textContent = Math.floor(target * eased).toLocaleString();
        if (t < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  };
  // Trigger after boot finishes
  const wait = setInterval(() => {
    if (!document.body.classList.contains("loading")) {
      clearInterval(wait);
      setTimeout(start, 400);
    }
  }, 100);
})();

/* ===================================================================
   Hero clock
   =================================================================== */
(function clock() {
  const el = document.getElementById("hero-clock");
  if (!el) return;
  const fmt = () => {
    const d = new Date();
    el.textContent = `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
  };
  fmt(); setInterval(fmt, 30000);
})();

/* ===================================================================
   Reveal
   =================================================================== */
(function reveal() {
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
    }
  }, { threshold: 0.12, rootMargin: "0px 0px -5% 0px" });
  document.querySelectorAll(".reveal").forEach((el) => io.observe(el));
})();

/* ===================================================================
   Terminal typewriter
   =================================================================== */
(function term() {
  const el = document.getElementById("term");
  if (!el) return;
  const lines = [
    { txt: '<span class="pmt">$</span> <span class="cmd">motion init "Aether — luxury fragrance"</span>', delay: 18 },
    { txt: '<span class="out">  scaffolding site... ok</span>', delay: 6 },
    { txt: '', delay: 0 },
    { txt: '<span class="pmt">$</span> <span class="cmd">motion video "amber smoke, slow drift, dark cinematic"</span>', delay: 22 },
    { txt: '<span class="out">  → fal.ai · seedance-2.0-pro · 16:9 · 5s</span>', delay: 6 },
    { txt: '<span class="out">  rendering... </span><span class="ok">✓ done in 47s</span>', delay: 6 },
    { txt: '', delay: 0 },
    { txt: '<span class="pmt">$</span> <span class="cmd">motion section "products" --layout grid --reveal mask</span>', delay: 22 },
    { txt: '<span class="out">  generating animations... </span><span class="ok">✓ 4 product cards</span>', delay: 6 },
    { txt: '', delay: 0 },
    { txt: '<span class="pmt">$</span> <span class="cmd">motion deploy --domain aether.studio</span>', delay: 22 },
    { txt: '<span class="out">  building... </span><span class="ok">✓ 18 KB · 0 deps</span>', delay: 6 },
    { txt: '<span class="out">  → </span><span class="ok">https://aether.studio</span> <span class="warn">live</span>', delay: 6 },
    { txt: '', delay: 0 },
    { txt: '<span class="out">  total: 4 commands · 7 days · client paid · refund clock stopped</span>', delay: 6 },
  ];

  let acc = "";
  let lineIdx = 0;
  function nextLine() {
    if (lineIdx >= lines.length) return;
    const { txt, delay } = lines[lineIdx];
    if (delay === 0) {
      acc += "\n";
      el.innerHTML = acc;
      lineIdx++;
      setTimeout(nextLine, 180);
      return;
    }
    let i = 0;
    // remove HTML tags for typing pace; reveal whole line at end
    const plain = txt.replace(/<[^>]+>/g, "");
    const interval = setInterval(() => {
      i++;
      el.innerHTML = acc + plain.slice(0, i);
      if (i >= plain.length) {
        clearInterval(interval);
        // swap to formatted version
        acc += txt + "\n";
        el.innerHTML = acc;
        lineIdx++;
        setTimeout(nextLine, 220);
      }
    }, delay);
  }

  // Wait for the terminal to scroll into view
  const io = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting) {
      io.disconnect();
      setTimeout(nextLine, 300);
    }
  }, { threshold: 0.4 });
  io.observe(el);
})();

/* ===================================================================
   Scenes — keyboard scroll ← →
   =================================================================== */
(function scenesKeys() {
  const rail = document.getElementById("rail");
  if (!rail) return;
  window.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight") rail.scrollBy({ left: 400, behavior: "smooth" });
    if (e.key === "ArrowLeft")  rail.scrollBy({ left: -400, behavior: "smooth" });
  });
})();

/* ===================================================================
   Web Audio click sounds — tiny, pleasant, contextual
   =================================================================== */
(function ui() {
  let actx = null;
  function ensure() {
    if (!actx) {
      try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch {}
    }
    return actx;
  }
  function tick(freq = 880, dur = 0.05, gain = 0.04) {
    const ctx = ensure(); if (!ctx) return;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    g.gain.value = gain;
    osc.connect(g); g.connect(ctx.destination);
    osc.start();
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
    osc.stop(ctx.currentTime + dur + 0.01);
  }
  document.querySelectorAll("[data-snd]").forEach((el) => {
    el.addEventListener("mouseenter", () => tick(660, 0.04, 0.025));
    el.addEventListener("click",      () => tick(1320, 0.06, 0.05));
  });
})();

/* ===================================================================
   Smooth anchors
   =================================================================== */
document.querySelectorAll('a[href^="#"]').forEach((a) => {
  a.addEventListener("click", (e) => {
    const id = a.getAttribute("href");
    if (id.length > 1) {
      const t = document.querySelector(id);
      if (t) { e.preventDefault(); t.scrollIntoView({ behavior: "smooth", block: "start" }); }
    }
  });
});
