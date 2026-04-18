/* =========================================================
   EXFIL™ · script.js
   Three.js scroll-driven USB drive disassembly
   ========================================================= */

import * as THREE from "three";

const stage       = document.getElementById("stage");
const canvas      = document.getElementById("three-canvas");
const overlays    = Array.from(document.querySelectorAll(".overlay"));
const progressBar = document.getElementById("progress-bar");
const progressPct = document.getElementById("progress-pct");
const hudSection  = document.getElementById("hud-section");
const hudRem      = document.getElementById("hud-rem");
const hudCore     = document.getElementById("hud-core");
const hudStatus   = document.getElementById("hud-status");

// =================================================================
// Scene
// =================================================================
const scene = new THREE.Scene();
scene.background = null;
scene.fog = new THREE.Fog(0x05030B, 6, 12);

const camera = new THREE.PerspectiveCamera(36, innerWidth / innerHeight, 0.1, 100);
camera.position.set(0, 0.3, 5.8);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.setClearColor(0x05030B, 1);

// =================================================================
// Lighting — cyberpunk vibe (pink key + cyan rim + yellow accent)
// =================================================================
const keyLight = new THREE.DirectionalLight(0xFF3388, 1.6);
keyLight.position.set(3, 4, 4);
scene.add(keyLight);

const rimLight = new THREE.DirectionalLight(0x00F5FF, 2.0);
rimLight.position.set(-3, 1, -3);
scene.add(rimLight);

const yellowSpot = new THREE.PointLight(0xFFE500, 1.4, 5);
yellowSpot.position.set(0, 2, 1.5);
scene.add(yellowSpot);

const fillLight = new THREE.DirectionalLight(0xB042FF, 0.6);
fillLight.position.set(0, -2, 2);
scene.add(fillLight);

scene.add(new THREE.AmbientLight(0xffffff, 0.35));

// floor grid
const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(14, 14, 1, 1),
  new THREE.MeshBasicMaterial({ color: 0xFF0066, transparent: true, opacity: 0.06, wireframe: true })
);
floor.rotation.x = -Math.PI / 2;
floor.position.y = -1.1;
scene.add(floor);

// =================================================================
// Materials
// =================================================================
const matChrome = new THREE.MeshStandardMaterial({ color: 0xc8ccd4, metalness: 0.95, roughness: 0.12 });
const matChromeDark = new THREE.MeshStandardMaterial({ color: 0x707580, metalness: 0.95, roughness: 0.2 });
const matShellTop = new THREE.MeshStandardMaterial({
  color: 0x0a0a12,
  metalness: 0.8,
  roughness: 0.25,
  emissive: 0xFF0066,
  emissiveIntensity: 0.08,
});
const matShellBot = new THREE.MeshStandardMaterial({
  color: 0x08080f,
  metalness: 0.8,
  roughness: 0.3,
  emissive: 0xB042FF,
  emissiveIntensity: 0.06,
});
const matPCB = new THREE.MeshStandardMaterial({ color: 0x0a2a1a, metalness: 0.2, roughness: 0.65, emissive: 0x001a0e, emissiveIntensity: 0.35 });
const matNAND = new THREE.MeshStandardMaterial({ color: 0x1a1a22, metalness: 0.4, roughness: 0.55, emissive: 0x00F5FF, emissiveIntensity: 0.35 });
const matController = new THREE.MeshStandardMaterial({ color: 0x0e0e14, metalness: 0.5, roughness: 0.5, emissive: 0xFF0066, emissiveIntensity: 0.55 });
const matLED = new THREE.MeshStandardMaterial({ color: 0xFFE500, emissive: 0xFFE500, emissiveIntensity: 2.0, metalness: 0, roughness: 0.3 });
const matUsbBlue = new THREE.MeshStandardMaterial({ color: 0x0a1a3a, metalness: 0.3, roughness: 0.45 }); // USB-A tab is classically blue
const matUsbC = new THREE.MeshStandardMaterial({ color: 0x101015, metalness: 0.8, roughness: 0.3, emissive: 0xFFE500, emissiveIntensity: 0.1 });

// =================================================================
// Build the USB drive
// =================================================================
const drive = new THREE.Group();
scene.add(drive);

// ─── 1. Main body TOP shell ───
const shellTopGroup = new THREE.Group();
shellTopGroup.userData = { explode: new THREE.Vector3(0, 1.2, 0) };
{
  const shell = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.25, 0.7), matShellTop);
  shell.position.y = 0.125;
  shellTopGroup.add(shell);

  // pink edge glow lines
  const edges = new THREE.EdgesGeometry(shell.geometry);
  const edgeMat = new THREE.LineBasicMaterial({ color: 0xFF0066, transparent: true, opacity: 0.85 });
  const edgeLines = new THREE.LineSegments(edges, edgeMat);
  edgeLines.position.y = 0.125;
  shellTopGroup.add(edgeLines);

  // engraved brand strip on top
  const strip = new THREE.Mesh(
    new THREE.BoxGeometry(1.4, 0.005, 0.08),
    new THREE.MeshStandardMaterial({ color: 0xFF0066, emissive: 0xFF0066, emissiveIntensity: 1.4 })
  );
  strip.position.set(0, 0.252, 0);
  shellTopGroup.add(strip);
}
drive.add(shellTopGroup);

// ─── 2. Main body BOTTOM shell ───
const shellBotGroup = new THREE.Group();
shellBotGroup.userData = { explode: new THREE.Vector3(0, -1.2, 0) };
{
  const shell = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.25, 0.7), matShellBot);
  shell.position.y = -0.125;
  shellBotGroup.add(shell);

  const edges = new THREE.EdgesGeometry(shell.geometry);
  const edgeLines = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0xB042FF, transparent: true, opacity: 0.7 }));
  edgeLines.position.y = -0.125;
  shellBotGroup.add(edgeLines);
}
drive.add(shellBotGroup);

// ─── 3. PCB (middle layer) ───
const pcbGroup = new THREE.Group();
pcbGroup.userData = { explode: new THREE.Vector3(0, 0, 0.8) };
{
  const pcb = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.04, 0.62), matPCB);
  pcbGroup.add(pcb);
  // trace lines (emissive pink)
  for (let i = 0; i < 6; i++) {
    const t = new THREE.Mesh(
      new THREE.BoxGeometry(0.8 + Math.random() * 0.6, 0.003, 0.015),
      new THREE.MeshBasicMaterial({ color: 0xFF0066, transparent: true, opacity: 0.8 })
    );
    t.position.set((Math.random() - 0.5) * 0.4, 0.025, -0.25 + i * 0.1);
    pcbGroup.add(t);
  }
  // edge glow lines
  const edges = new THREE.EdgesGeometry(pcb.geometry);
  const edgeLines = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0x00F5FF, transparent: true, opacity: 0.5 }));
  pcbGroup.add(edgeLines);
}
drive.add(pcbGroup);

// ─── 4. NAND flash chip ───
const nandGroup = new THREE.Group();
nandGroup.userData = { explode: new THREE.Vector3(-0.4, 1.6, 0) };
{
  const chip = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.06, 0.3), matNAND);
  chip.position.set(-0.25, 0.055, 0);
  nandGroup.add(chip);
  // tiny pin rim
  const edges = new THREE.EdgesGeometry(chip.geometry);
  const edgeLines = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0x00F5FF, transparent: true, opacity: 0.9 }));
  edgeLines.position.copy(chip.position);
  nandGroup.add(edgeLines);
}
drive.add(nandGroup);

// ─── 5. Controller chip ───
const ctrlGroup = new THREE.Group();
ctrlGroup.userData = { explode: new THREE.Vector3(0.5, 1.4, 0) };
{
  const chip = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.05, 0.28), matController);
  chip.position.set(0.35, 0.05, 0);
  ctrlGroup.add(chip);
  // engraved hex pattern on top (line pattern)
  const hex = new THREE.Mesh(
    new THREE.RingGeometry(0.08, 0.11, 6),
    new THREE.MeshBasicMaterial({ color: 0xFF0066, side: THREE.DoubleSide })
  );
  hex.rotation.x = -Math.PI / 2;
  hex.position.set(0.35, 0.078, 0);
  ctrlGroup.add(hex);
}
drive.add(ctrlGroup);

// ─── 6. LED indicator ───
const ledGroup = new THREE.Group();
ledGroup.userData = { explode: new THREE.Vector3(0.8, 2.2, 0) };
{
  const led = new THREE.Mesh(new THREE.SphereGeometry(0.05, 16, 16), matLED);
  led.position.set(0.75, 0.06, 0);
  ledGroup.add(led);
  const glow = new THREE.PointLight(0xFFE500, 1.2, 1);
  glow.position.set(0.75, 0.06, 0);
  ledGroup.add(glow);
}
drive.add(ledGroup);

// ─── 7. USB-A plug (left end) ───
const usbAGroup = new THREE.Group();
usbAGroup.userData = { explode: new THREE.Vector3(-2.4, 0, 0) };
{
  // metallic sleeve
  const sleeve = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.18, 0.4), matChrome);
  sleeve.position.set(-1.35, 0, 0);
  usbAGroup.add(sleeve);
  // blue plastic tongue inside
  const tongue = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.05, 0.28), matUsbBlue);
  tongue.position.set(-1.35, 0.00, 0);
  usbAGroup.add(tongue);
  // pins (4 gold lines on the tongue)
  const pinGeom = new THREE.BoxGeometry(0.42, 0.006, 0.03);
  const pinMat = new THREE.MeshStandardMaterial({ color: 0xd4a043, metalness: 0.9, roughness: 0.15, emissive: 0x8a6020, emissiveIntensity: 0.4 });
  for (let i = 0; i < 4; i++) {
    const pin = new THREE.Mesh(pinGeom, pinMat);
    pin.position.set(-1.35, 0.028, -0.09 + i * 0.06);
    usbAGroup.add(pin);
  }
  // rim highlight
  const edges = new THREE.EdgesGeometry(sleeve.geometry);
  const edgeLines = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0xFF0066, transparent: true, opacity: 0.75 }));
  edgeLines.position.copy(sleeve.position);
  usbAGroup.add(edgeLines);
}
drive.add(usbAGroup);

// ─── 8. USB-A connector shell ring (collar between drive body and USB-A plug) ───
const usbACollarGroup = new THREE.Group();
usbACollarGroup.userData = { explode: new THREE.Vector3(-1.5, 0.8, 0) };
{
  const collar = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 0.32, 0.82),
    new THREE.MeshStandardMaterial({ color: 0x14141c, metalness: 0.9, roughness: 0.25, emissive: 0xFF0066, emissiveIntensity: 0.2 })
  );
  collar.position.set(-0.98, 0, 0);
  usbACollarGroup.add(collar);
  const edges = new THREE.EdgesGeometry(collar.geometry);
  const edgeLines = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0xFFE500, transparent: true, opacity: 0.8 }));
  edgeLines.position.copy(collar.position);
  usbACollarGroup.add(edgeLines);
}
drive.add(usbACollarGroup);

// ─── 9. USB-C plug (right end) ───
const usbCGroup = new THREE.Group();
usbCGroup.userData = { explode: new THREE.Vector3(2.4, 0, 0) };
{
  // oval-ish connector (use a narrow box with slight z-bevel emulated via groups)
  const cShell = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.13, 0.34), matUsbC);
  cShell.position.set(1.3, 0, 0);
  usbCGroup.add(cShell);
  // inner tongue (paddle, thin)
  const tongue = new THREE.Mesh(
    new THREE.BoxGeometry(0.4, 0.02, 0.2),
    new THREE.MeshStandardMaterial({ color: 0x060608, metalness: 0.2, roughness: 0.8 })
  );
  tongue.position.set(1.3, 0, 0);
  usbCGroup.add(tongue);
  // yellow rim
  const edges = new THREE.EdgesGeometry(cShell.geometry);
  const edgeLines = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0xFFE500, transparent: true, opacity: 0.9 }));
  edgeLines.position.copy(cShell.position);
  usbCGroup.add(edgeLines);
}
drive.add(usbCGroup);

// ─── 10. USB-C collar ───
const usbCCollarGroup = new THREE.Group();
usbCCollarGroup.userData = { explode: new THREE.Vector3(1.5, -0.8, 0) };
{
  const collar = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 0.3, 0.68),
    new THREE.MeshStandardMaterial({ color: 0x14141c, metalness: 0.9, roughness: 0.25, emissive: 0xFFE500, emissiveIntensity: 0.15 })
  );
  collar.position.set(0.98, 0, 0);
  usbCCollarGroup.add(collar);
  const edges = new THREE.EdgesGeometry(collar.geometry);
  const edgeLines = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0x00F5FF, transparent: true, opacity: 0.7 }));
  edgeLines.position.copy(collar.position);
  usbCCollarGroup.add(edgeLines);
}
drive.add(usbCCollarGroup);

// cache base positions
const groups = [shellTopGroup, shellBotGroup, pcbGroup, nandGroup, ctrlGroup, ledGroup, usbAGroup, usbACollarGroup, usbCGroup, usbCCollarGroup];
for (const g of groups) g.userData.basePos = g.position.clone();

// =================================================================
// Resize
// =================================================================
function resize() {
  const w = innerWidth, h = innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
}
window.addEventListener("resize", resize);
resize();

// =================================================================
// Scroll
// =================================================================
const smooth = (a, b, x) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

let progress = 0;
let userScrolled = false;
window.addEventListener("scroll", () => { userScrolled = true; }, { passive: true });

function getScrollProgress() {
  const r = stage.getBoundingClientRect();
  const total = Math.max(1, stage.offsetHeight - innerHeight);
  return Math.max(0, Math.min(1, -r.top / total));
}

const t0 = performance.now();
function getDemoProgress() {
  if (userScrolled) return 0;
  const e = (performance.now() - t0) / 1000;
  if (e < 1.8) return 0;
  if (e < 3.6) return smooth(1.8, 3.6, e);
  if (e < 5.6) return 1 - smooth(3.6, 5.6, e);
  return 0;
}

function updateUI() {
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
    "// core // 256GB encrypted",
    "// usb-c // 10Gbps",
    "// exfil // complete",
  ];
  const phase = progress < 0.22 ? 0 : progress < 0.46 ? 1 : progress < 0.72 ? 2 : progress < 0.94 ? 3 : 4;
  if (hudSection) hudSection.textContent = phaseLabels[phase];
  if (hudRem)   hudRem.textContent   = Math.floor(256 * progress).toString().padStart(3, "0") + "GB";
  if (hudCore)  hudCore.textContent  = (22 + progress * 22).toFixed(1).padStart(4, "0") + "°C";
  if (hudStatus) hudStatus.textContent = progress > 0.72 ? "EXFIL" : progress > 0.46 ? "DECRYPT" : progress > 0.22 ? "MOUNT" : "IDLE";
}

// =================================================================
// Render loop
// =================================================================
function tick() {
  const sp = getScrollProgress();
  const dp = getDemoProgress();
  progress = userScrolled ? sp : Math.max(sp, dp);

  updateUI();

  const t = performance.now() * 0.001;
  // Camera orbit tightens toward the drive as we scroll
  const orbit = progress * Math.PI * 0.5 + t * 0.12;
  const camDist = 5.8 - progress * 0.8;
  const camHeight = 0.3 + progress * 0.5;
  camera.position.set(Math.sin(orbit) * camDist, camHeight, Math.cos(orbit) * camDist);
  camera.lookAt(0, progress * 0.25, 0);

  // Disassembly: each group moves along its explode vector
  groups.forEach((g, i) => {
    const delay = i * 0.04;
    const localT = smooth(0.15 + delay, 0.92, progress);
    const ex = g.userData.explode;
    const bp = g.userData.basePos;
    g.position.set(
      bp.x + ex.x * localT,
      bp.y + ex.y * localT,
      bp.z + ex.z * localT
    );
    g.rotation.y = localT * 0.15 * (i % 2 === 0 ? 1 : -1);
  });

  // Subtle idle rotation
  drive.rotation.y = Math.sin(t * 0.8) * 0.05 + t * 0.05;

  renderer.render(scene, camera);
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
