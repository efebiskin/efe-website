/* =========================================================
   PRISM · script.js — three.js scroll-driven 3D headset
   - Procedural AR/VR headset model (no external assets)
   - Scroll drives camera orbit + group disassembly
   ========================================================= */

import * as THREE from "three";

const stage         = document.getElementById("stage");
const canvas        = document.getElementById("three-canvas");
const overlays      = Array.from(document.querySelectorAll(".overlay"));
const progressBar   = document.getElementById("progress-bar");
const progressPct   = document.getElementById("progress-pct");
const hudSection    = document.getElementById("hud-section");
const hudFov        = document.getElementById("hud-fov");
const hudPpd        = document.getElementById("hud-ppd");
const hudWt         = document.getElementById("hud-wt");

// =================================================================
// Scene
// =================================================================
const scene = new THREE.Scene();
scene.background = null;

const camera = new THREE.PerspectiveCamera(35, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 0.4, 6);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x06070A, 1);

// =================================================================
// Lighting — cinematic key/fill/rim
// =================================================================
const keyLight = new THREE.DirectionalLight(0xffffff, 2.4);
keyLight.position.set(3, 4, 5);
scene.add(keyLight);

const fillLight = new THREE.DirectionalLight(0x88ccff, 1.0);
fillLight.position.set(-3, 1, 3);
scene.add(fillLight);

const rimLight = new THREE.DirectionalLight(0x00E1FF, 2.0);
rimLight.position.set(-2, 2, -3);
scene.add(rimLight);

const topLight = new THREE.DirectionalLight(0xA78BFA, 0.8);
topLight.position.set(0, 5, 0);
scene.add(topLight);

scene.add(new THREE.AmbientLight(0xffffff, 0.35));

// point light inside the headset where the lenses glow
const lensLight = new THREE.PointLight(0x00E1FF, 2.5, 3);
lensLight.position.set(0, 0, 0.2);
scene.add(lensLight);

// Subtle floor reflection — emissive grid on a plane
const floorGeom = new THREE.PlaneGeometry(20, 20);
const floorMat  = new THREE.MeshBasicMaterial({
  color: 0x00E1FF,
  transparent: true,
  opacity: 0.07,
  wireframe: true,
});
const floor = new THREE.Mesh(floorGeom, floorMat);
floor.rotation.x = -Math.PI / 2;
floor.position.y = -1.0;
scene.add(floor);

// =================================================================
// PRISM headset (procedural)
// =================================================================
// Materials
const matBody = new THREE.MeshStandardMaterial({
  color: 0x2a2f3a,
  metalness: 0.85,
  roughness: 0.32,
  emissive: 0x001a24,
  emissiveIntensity: 0.3,
});
const matBezel = new THREE.MeshStandardMaterial({
  color: 0x242730,
  metalness: 0.95,
  roughness: 0.25,
});
const matStrap = new THREE.MeshStandardMaterial({
  color: 0x3a4050,
  metalness: 0.5,
  roughness: 0.55,
});
const matLensGlass = new THREE.MeshPhysicalMaterial({
  color: 0x05101a,
  metalness: 0.1,
  roughness: 0.05,
  transmission: 0.8,
  thickness: 0.2,
  clearcoat: 1.0,
  clearcoatRoughness: 0.05,
  emissive: 0x00b0ff,
  emissiveIntensity: 0.4,
});
const matLensCore = new THREE.MeshStandardMaterial({
  color: 0x00E1FF,
  emissive: 0x00E1FF,
  emissiveIntensity: 1.2,
  roughness: 0.2,
  metalness: 0.0,
});
const matChip = new THREE.MeshStandardMaterial({
  color: 0xA78BFA,
  emissive: 0xA78BFA,
  emissiveIntensity: 0.7,
  roughness: 0.4,
  metalness: 0.0,
});
const matBattery = new THREE.MeshStandardMaterial({
  color: 0xF59E0B,
  emissive: 0xF59E0B,
  emissiveIntensity: 0.4,
  roughness: 0.5,
  metalness: 0.2,
});

// Helper: rounded box (just slightly chamfered via Box+small extra geometry)
function roundedBox(w, h, d, color = 0x1a1d24) {
  const g = new THREE.BoxGeometry(w, h, d, 1, 1, 1);
  const m = new THREE.MeshStandardMaterial({ color, metalness: 0.7, roughness: 0.35 });
  return new THREE.Mesh(g, m);
}

// ─── Build groups ───
// Each group is a THREE.Group with .userData.explode = THREE.Vector3 direction
// and .userData.basePos = THREE.Vector3 starting position.

const headset = new THREE.Group();
scene.add(headset);

// 1. Front bezel — HOLLOW frame with circular lens cutouts so you can see through
const bezelGroup = new THREE.Group();
bezelGroup.userData = { explode: new THREE.Vector3(0, 0, 1.6), label: "BEZEL" };
{
  // Build a Shape: outer rectangle with two round holes
  const shape = new THREE.Shape();
  shape.moveTo(-1.2, -0.5);
  shape.lineTo( 1.2, -0.5);
  shape.lineTo( 1.2,  0.5);
  shape.lineTo(-1.2,  0.5);
  shape.lineTo(-1.2, -0.5);

  const holeL = new THREE.Path();
  holeL.absarc(-0.55, 0, 0.42, 0, Math.PI * 2, false);
  shape.holes.push(holeL);

  const holeR = new THREE.Path();
  holeR.absarc(0.55, 0, 0.42, 0, Math.PI * 2, false);
  shape.holes.push(holeR);

  const extrudeSettings = { depth: 0.12, bevelEnabled: true, bevelSize: 0.012, bevelThickness: 0.012, bevelSegments: 2, curveSegments: 32 };
  const bezelGeom = new THREE.ExtrudeGeometry(shape, extrudeSettings);
  bezelGeom.center();

  const bezelMat = new THREE.MeshStandardMaterial({
    color: 0x242730,
    metalness: 0.95,
    roughness: 0.28,
  });
  const bezel = new THREE.Mesh(bezelGeom, bezelMat);
  bezelGroup.add(bezel);

  // cyan rim highlights on the bezel edge
  const rimGeom = new THREE.EdgesGeometry(bezelGeom, 15);
  const rim = new THREE.LineSegments(rimGeom, new THREE.LineBasicMaterial({ color: 0x00E1FF, transparent: true, opacity: 0.65 }));
  bezelGroup.add(rim);
}
bezelGroup.position.z = 0.40;
headset.add(bezelGroup);

// 2. Lens cluster — two glowing cyan disks behind the bezel
const lensGroup = new THREE.Group();
lensGroup.userData = { explode: new THREE.Vector3(0, 0, 1.0), label: "OPTICS" };
{
  const lensG = new THREE.CylinderGeometry(0.42, 0.42, 0.18, 48);
  const lensL = new THREE.Mesh(lensG, matLensGlass);
  lensL.rotation.x = Math.PI / 2;
  lensL.position.set(-0.55, 0, 0);
  lensGroup.add(lensL);
  const lensR = new THREE.Mesh(lensG, matLensGlass);
  lensR.rotation.x = Math.PI / 2;
  lensR.position.set(0.55, 0, 0);
  lensGroup.add(lensR);

  // glowing cores inside
  const coreG = new THREE.RingGeometry(0.30, 0.40, 32);
  const coreL = new THREE.Mesh(coreG, new THREE.MeshBasicMaterial({ color: 0x00E1FF, side: THREE.DoubleSide, transparent: true, opacity: 0.85 }));
  coreL.position.set(-0.55, 0, 0.10);
  lensGroup.add(coreL);
  const coreR = new THREE.Mesh(coreG, new THREE.MeshBasicMaterial({ color: 0x00E1FF, side: THREE.DoubleSide, transparent: true, opacity: 0.85 }));
  coreR.position.set(0.55, 0, 0.10);
  lensGroup.add(coreR);
}
lensGroup.position.z = 0.20;
headset.add(lensGroup);

// 3. Display panels — flat panels behind the lenses, magenta-violet glow
const displayGroup = new THREE.Group();
displayGroup.userData = { explode: new THREE.Vector3(0, 0, 0.5), label: "DISPLAYS" };
{
  const dispG = new THREE.PlaneGeometry(0.8, 0.7);
  const dispM = new THREE.MeshBasicMaterial({ color: 0xA78BFA, transparent: true, opacity: 0.8, side: THREE.DoubleSide });
  const d1 = new THREE.Mesh(dispG, dispM);
  d1.position.set(-0.55, 0, 0);
  displayGroup.add(d1);
  const d2 = new THREE.Mesh(dispG, dispM);
  d2.position.set(0.55, 0, 0);
  displayGroup.add(d2);
}
displayGroup.position.z = 0.05;
headset.add(displayGroup);

// 4. Main body / chassis
const bodyGroup = new THREE.Group();
bodyGroup.userData = { explode: new THREE.Vector3(0, 0, -0.6), label: "CHASSIS" };
{
  const main = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.95, 0.55), matBody);
  bodyGroup.add(main);
  const edge = new THREE.LineSegments(new THREE.EdgesGeometry(main.geometry), new THREE.LineBasicMaterial({ color: 0x00E1FF, transparent: true, opacity: 0.25 }));
  bodyGroup.add(edge);
}
bodyGroup.position.z = -0.05;
headset.add(bodyGroup);

// 5. Compute module (visible inside chassis when disassembled)
const computeGroup = new THREE.Group();
computeGroup.userData = { explode: new THREE.Vector3(0, 1.4, 0), label: "COMPUTE" };
{
  const chip = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.08, 0.6), matChip);
  computeGroup.add(chip);
  const traceGeom = new THREE.PlaneGeometry(0.55, 0.55);
  const traceMat = new THREE.MeshBasicMaterial({ color: 0xA78BFA, transparent: true, opacity: 0.6, side: THREE.DoubleSide });
  for (let i = 0; i < 3; i++) {
    const t = new THREE.Mesh(traceGeom, traceMat);
    t.rotation.x = Math.PI / 2;
    t.position.y = 0.09 + i * 0.04;
    t.scale.setScalar(0.95 - i * 0.06);
    computeGroup.add(t);
  }
}
computeGroup.position.z = -0.05;
headset.add(computeGroup);

// 6. Battery sled (slides out of bottom)
const batteryGroup = new THREE.Group();
batteryGroup.userData = { explode: new THREE.Vector3(0, -1.4, 0), label: "BATTERY" };
{
  const batt = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.16, 0.45), matBattery);
  batteryGroup.add(batt);
  const edge = new THREE.LineSegments(new THREE.EdgesGeometry(batt.geometry), new THREE.LineBasicMaterial({ color: 0xF59E0B, transparent: true, opacity: 0.6 }));
  batteryGroup.add(edge);
}
batteryGroup.position.set(0, -0.55, -0.05);
headset.add(batteryGroup);

// 7. Left strap arm
const strapL = new THREE.Group();
strapL.userData = { explode: new THREE.Vector3(-1.8, 0, 0), label: "STRAP·L" };
{
  const arm = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.12, 0.18), matStrap);
  arm.position.set(-1.8, 0.10, -0.05);
  arm.rotation.z = -0.18;
  strapL.add(arm);
}
headset.add(strapL);

// 8. Right strap arm
const strapR = new THREE.Group();
strapR.userData = { explode: new THREE.Vector3(1.8, 0, 0), label: "STRAP·R" };
{
  const arm = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.12, 0.18), matStrap);
  arm.position.set(1.8, 0.10, -0.05);
  arm.rotation.z = 0.18;
  strapR.add(arm);
}
headset.add(strapR);

// Cache base positions
const groups = [bezelGroup, lensGroup, displayGroup, bodyGroup, computeGroup, batteryGroup, strapL, strapR];
for (const g of groups) {
  g.userData.basePos = g.position.clone();
}

// =================================================================
// Resize
// =================================================================
function resize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
}
window.addEventListener("resize", resize);
resize();

// =================================================================
// Scroll handling
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
  const total = Math.max(1, stage.offsetHeight - window.innerHeight);
  return Math.max(0, Math.min(1, -r.top / total));
}

// auto-demo for first ~6 seconds so the user sees motion immediately
const t0 = performance.now();
function getDemoProgress() {
  if (userScrolled) return 0;
  const e = (performance.now() - t0) / 1000;
  if (e < 1.5) return 0;
  if (e < 3.5) return smooth(1.5, 3.5, e);
  if (e < 5.5) return 1 - smooth(3.5, 5.5, e);
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

  const phaseLabels = ["// 01 · INTRO", "// 02 · OPTICS", "// 03 · COMPUTE", "// 04 · PRISM"];
  const phase = progress < 0.20 ? 0 : progress < 0.50 ? 1 : progress < 0.78 ? 2 : 3;
  if (hudSection) hudSection.textContent = phaseLabels[phase];
  if (hudFov) hudFov.textContent = Math.floor(110 * progress) + "°";
  if (hudPpd) hudPpd.textContent = Math.floor(52 * progress).toString();
  if (hudWt)  hudWt.textContent  = Math.floor(412 * progress) + "g";
}

// =================================================================
// Render loop
// =================================================================
function tick() {
  const sp = getScrollProgress();
  const dp = getDemoProgress();
  progress = userScrolled ? sp : Math.max(sp, dp);

  updateUI();

  // Camera orbit — slight rotation as we scroll, more dramatic at the end
  const t = performance.now() * 0.0003;
  const orbit = progress * Math.PI * 0.6 + t * 0.3;
  const camDist = 6 - progress * 1.2;
  const camHeight = 0.4 + progress * 0.6;
  camera.position.set(
    Math.sin(orbit) * camDist,
    camHeight,
    Math.cos(orbit) * camDist
  );
  camera.lookAt(0, progress * 0.2, 0);

  // Disassembly: each group lifts toward its explode vector
  // Stagger by index for a wave effect
  const baseDis = smooth(0.20, 0.85, progress);
  groups.forEach((g, i) => {
    const delay = i * 0.04;
    const localT = smooth(0.20 + delay, 0.85, progress);
    const ex = g.userData.explode;
    const bp = g.userData.basePos;
    g.position.set(
      bp.x + ex.x * localT,
      bp.y + ex.y * localT,
      bp.z + ex.z * localT
    );
    // Slight rotation of disassembled pieces
    g.rotation.y = localT * 0.15 * (i % 2 === 0 ? 1 : -1);
  });

  // Subtle headset breathing rotation
  headset.rotation.y = Math.sin(t * 2) * 0.05;

  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}
tick();

// Init overlay 0 visible
if (overlays[0]) overlays[0].classList.add("in");

// Smooth anchors
document.querySelectorAll('a[href^="#"]').forEach((a) => {
  a.addEventListener("click", (e) => {
    const id = a.getAttribute("href");
    if (id.length > 1) {
      const t = document.querySelector(id);
      if (t) { e.preventDefault(); t.scrollIntoView({ behavior: "smooth", block: "start" }); }
    }
  });
});
