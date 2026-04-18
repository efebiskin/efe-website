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
// Materials — built to look like real electronics
// =================================================================
const matChrome     = new THREE.MeshStandardMaterial({ color: 0xd8dce3, metalness: 0.98, roughness: 0.10 });
const matChromeWear = new THREE.MeshStandardMaterial({ color: 0xa8acb5, metalness: 0.95, roughness: 0.18 });
const matBlackPlastic = new THREE.MeshStandardMaterial({ color: 0x07070a, metalness: 0.1, roughness: 0.85 });
const matAnodizedTop = new THREE.MeshStandardMaterial({
  color: 0x14141c,
  metalness: 0.75,
  roughness: 0.35,
  emissive: 0xFF0066,
  emissiveIntensity: 0.06,
});
const matAnodizedBot = new THREE.MeshStandardMaterial({
  color: 0x101018,
  metalness: 0.7,
  roughness: 0.40,
  emissive: 0xB042FF,
  emissiveIntensity: 0.05,
});
const matPCBgreen   = new THREE.MeshStandardMaterial({ color: 0x0d3a24, metalness: 0.15, roughness: 0.7 });
const matPCBsolder  = new THREE.MeshStandardMaterial({ color: 0xc8a043, metalness: 0.85, roughness: 0.30, emissive: 0x4a3010, emissiveIntensity: 0.2 });   // gold mask
const matNANDbody   = new THREE.MeshStandardMaterial({ color: 0x16161c, metalness: 0.3, roughness: 0.55 });
const matCtrlBody   = new THREE.MeshStandardMaterial({ color: 0x0e0e14, metalness: 0.4, roughness: 0.50 });
const matCapTan     = new THREE.MeshStandardMaterial({ color: 0xd4a043, metalness: 0.5, roughness: 0.45 });   // tantalum cap yellow
const matCapBlack   = new THREE.MeshStandardMaterial({ color: 0x0a0a12, metalness: 0.4, roughness: 0.55 });   // ceramic cap
const matResistor   = new THREE.MeshStandardMaterial({ color: 0x0a0a14, metalness: 0.3, roughness: 0.65 });
const matCrystal    = new THREE.MeshStandardMaterial({ color: 0xb8bcc4, metalness: 0.85, roughness: 0.25 });
const matLED        = new THREE.MeshStandardMaterial({ color: 0xFFE500, emissive: 0xFFE500, emissiveIntensity: 2.5, metalness: 0, roughness: 0.3 });
const matGoldPin    = new THREE.MeshStandardMaterial({ color: 0xe8b04c, metalness: 0.92, roughness: 0.12, emissive: 0x6a4810, emissiveIntensity: 0.35 });
const matUsbBlueIns = new THREE.MeshStandardMaterial({ color: 0x0a2050, metalness: 0.15, roughness: 0.7 });   // iconic USB-A blue insert
const matUsbCInner  = new THREE.MeshStandardMaterial({ color: 0x040406, metalness: 0.2, roughness: 0.7 });

// =================================================================
// Build the USB drive
// =================================================================
const drive = new THREE.Group();
scene.add(drive);

// helper: cyan rim line for a mesh
function rim(mesh, color = 0xFF0066, opacity = 0.6) {
  const edges = new THREE.EdgesGeometry(mesh.geometry, 30);
  const lines = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color, transparent: true, opacity }));
  lines.position.copy(mesh.position);
  lines.rotation.copy(mesh.rotation);
  return lines;
}

// ─── 1. TOP SHELL — anodized box with vent slots + engraved logo cutout ───
const shellTopGroup = new THREE.Group();
shellTopGroup.userData = { explode: new THREE.Vector3(0, 1.2, 0) };
{
  const shell = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.20, 0.65), matAnodizedTop);
  shell.position.y = 0.10;
  shellTopGroup.add(shell);
  shellTopGroup.add(rim(shell, 0xFF0066, 0.7));

  // 5 vent slots on top — small recessed bars (rendered as flat strips)
  for (let i = 0; i < 5; i++) {
    const slot = new THREE.Mesh(
      new THREE.BoxGeometry(0.45, 0.005, 0.025),
      new THREE.MeshStandardMaterial({ color: 0x000000, metalness: 0.1, roughness: 1 })
    );
    slot.position.set(0.1, 0.205, -0.2 + i * 0.10);
    shellTopGroup.add(slot);
  }

  // Engraved EXFIL brand strip — bright pink emissive line on top
  const brandStrip = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.004, 0.045),
    new THREE.MeshStandardMaterial({ color: 0xFF0066, emissive: 0xFF0066, emissiveIntensity: 2.0 })
  );
  brandStrip.position.set(-0.55, 0.205, 0);
  shellTopGroup.add(brandStrip);

  // Two screw recesses near the connector ends
  const screwGeom = new THREE.CylinderGeometry(0.025, 0.025, 0.01, 12);
  const screwMat = new THREE.MeshStandardMaterial({ color: 0x404048, metalness: 0.85, roughness: 0.3 });
  const sLeft = new THREE.Mesh(screwGeom, screwMat);
  sLeft.position.set(-0.85, 0.205, 0.25);
  shellTopGroup.add(sLeft);
  const sRight = new THREE.Mesh(screwGeom, screwMat);
  sRight.position.set(0.85, 0.205, -0.25);
  shellTopGroup.add(sRight);

  // LED window cutout (small bright dot on top near USB-A end)
  const ledWindow = new THREE.Mesh(
    new THREE.CircleGeometry(0.018, 16),
    new THREE.MeshStandardMaterial({ color: 0xFFE500, emissive: 0xFFE500, emissiveIntensity: 1.5 })
  );
  ledWindow.rotation.x = -Math.PI / 2;
  ledWindow.position.set(-0.55, 0.206, -0.20);
  shellTopGroup.add(ledWindow);
}
drive.add(shellTopGroup);

// ─── 2. BOTTOM SHELL — paired anodized box with regulatory marks ───
const shellBotGroup = new THREE.Group();
shellBotGroup.userData = { explode: new THREE.Vector3(0, -1.2, 0) };
{
  const shell = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.20, 0.65), matAnodizedBot);
  shell.position.y = -0.10;
  shellBotGroup.add(shell);
  shellBotGroup.add(rim(shell, 0xB042FF, 0.55));

  // mating ridge on the inside (visible thin lip when separated)
  const ridge = new THREE.Mesh(
    new THREE.BoxGeometry(1.92, 0.012, 0.62),
    new THREE.MeshStandardMaterial({ color: 0x06060c, metalness: 0.5, roughness: 0.6 })
  );
  ridge.position.set(0, -0.005, 0);
  shellBotGroup.add(ridge);

  // serial number etch (thin emissive cyan strip on bottom)
  const serial = new THREE.Mesh(
    new THREE.BoxGeometry(0.6, 0.003, 0.02),
    new THREE.MeshStandardMaterial({ color: 0x00F5FF, emissive: 0x00F5FF, emissiveIntensity: 0.8 })
  );
  serial.position.set(-0.5, -0.205, 0.22);
  shellBotGroup.add(serial);
}
drive.add(shellBotGroup);

// ─── 3. PCB — green FR4 with multiple distinct surface-mount components ───
const pcbGroup = new THREE.Group();
pcbGroup.userData = { explode: new THREE.Vector3(0, 0, 0.8) };
{
  // FR4 substrate
  const pcb = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.035, 0.58), matPCBgreen);
  pcbGroup.add(pcb);
  pcbGroup.add(rim(pcb, 0xc8a043, 0.4));

  // GOLD CONTACT FINGERS on the USB-A end of the PCB
  for (let i = 0; i < 4; i++) {
    const finger = new THREE.Mesh(
      new THREE.BoxGeometry(0.16, 0.005, 0.045),
      matPCBsolder
    );
    finger.position.set(-0.85, 0.020, -0.08 + i * 0.053);
    pcbGroup.add(finger);
  }
  // GOLD CONTACT FINGERS on the USB-C end (smaller, denser, two rows)
  for (let i = 0; i < 12; i++) {
    const finger = new THREE.Mesh(
      new THREE.BoxGeometry(0.10, 0.003, 0.015),
      matPCBsolder
    );
    finger.position.set(0.85, 0.020, -0.10 + i * 0.018);
    pcbGroup.add(finger);
  }

  // PCB silkscreen traces (thin pink emissive lines)
  function addTrace(x, z, w) {
    const t = new THREE.Mesh(
      new THREE.BoxGeometry(w, 0.002, 0.008),
      new THREE.MeshBasicMaterial({ color: 0xFF0066, transparent: true, opacity: 0.7 })
    );
    t.position.set(x, 0.019, z);
    pcbGroup.add(t);
  }
  addTrace(-0.30, -0.05, 0.5);
  addTrace(-0.20, 0.05, 0.7);
  addTrace( 0.10, -0.10, 0.55);
  addTrace( 0.30, 0.12, 0.4);
  addTrace( 0.40, -0.20, 0.45);
}
drive.add(pcbGroup);

// ─── 4. NAND flash IC — large square TSOP-style chip with visible pin rows ───
const nandGroup = new THREE.Group();
nandGroup.userData = { explode: new THREE.Vector3(-0.5, 1.6, 0) };
{
  // chip body
  const chip = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.06, 0.30), matNANDbody);
  chip.position.set(-0.30, 0.067, 0);
  nandGroup.add(chip);
  nandGroup.add(rim(chip, 0x00F5FF, 0.85));

  // dimple marker (round indent on one corner — chip orientation pin)
  const dimple = new THREE.Mesh(
    new THREE.CircleGeometry(0.012, 12),
    new THREE.MeshStandardMaterial({ color: 0x040404, roughness: 0.9 })
  );
  dimple.rotation.x = -Math.PI / 2;
  dimple.position.set(-0.30 - 0.17, 0.098, -0.11);
  nandGroup.add(dimple);

  // 8 pins on each long side
  const pinGeom = new THREE.BoxGeometry(0.025, 0.012, 0.014);
  for (let i = 0; i < 8; i++) {
    const p1 = new THREE.Mesh(pinGeom, matGoldPin);
    p1.position.set(-0.30, 0.043, -0.13 + i * 0.038);
    p1.translateX(-0.215);
    nandGroup.add(p1);
    const p2 = new THREE.Mesh(pinGeom, matGoldPin);
    p2.position.set(-0.30, 0.043, -0.13 + i * 0.038);
    p2.translateX(0.215);
    nandGroup.add(p2);
  }
}
drive.add(nandGroup);

// ─── 5. Controller IC — smaller square QFN package ───
const ctrlGroup = new THREE.Group();
ctrlGroup.userData = { explode: new THREE.Vector3(0.6, 1.4, 0) };
{
  const chip = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.05, 0.28), matCtrlBody);
  chip.position.set(0.30, 0.062, 0.05);
  ctrlGroup.add(chip);
  ctrlGroup.add(rim(chip, 0xFF0066, 0.85));

  // hex marking on top (laser-etched)
  const hex = new THREE.Mesh(
    new THREE.RingGeometry(0.06, 0.075, 6),
    new THREE.MeshBasicMaterial({ color: 0xFF0066, side: THREE.DoubleSide, transparent: true, opacity: 0.9 })
  );
  hex.rotation.x = -Math.PI / 2;
  hex.position.set(0.30, 0.088, 0.05);
  ctrlGroup.add(hex);

  // QFN pins around all 4 sides (small)
  const qfnGeom = new THREE.BoxGeometry(0.018, 0.008, 0.012);
  for (let i = 0; i < 6; i++) {
    const off = -0.075 + i * 0.030;
    const t = 0.142;
    const m1 = new THREE.Mesh(qfnGeom, matGoldPin); m1.position.set(0.30 - t, 0.040, 0.05 + off); ctrlGroup.add(m1);
    const m2 = new THREE.Mesh(qfnGeom, matGoldPin); m2.position.set(0.30 + t, 0.040, 0.05 + off); ctrlGroup.add(m2);
    const m3 = new THREE.Mesh(qfnGeom, matGoldPin); m3.rotation.y = Math.PI/2; m3.position.set(0.30 + off, 0.040, 0.05 - t); ctrlGroup.add(m3);
    const m4 = new THREE.Mesh(qfnGeom, matGoldPin); m4.rotation.y = Math.PI/2; m4.position.set(0.30 + off, 0.040, 0.05 + t); ctrlGroup.add(m4);
  }
}
drive.add(ctrlGroup);

// ─── 6. Discrete components — caps, resistors, crystal ───
const discreteGroup = new THREE.Group();
discreteGroup.userData = { explode: new THREE.Vector3(0.2, 1.0, 0.5) };
{
  // 3 tantalum capacitors (yellow rectangular bricks with one chamfered end)
  for (let i = 0; i < 3; i++) {
    const cap = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.04, 0.035), matCapTan);
    cap.position.set(-0.05 + i * 0.075, 0.057, -0.20);
    discreteGroup.add(cap);
    // black mark on positive lead end
    const mark = new THREE.Mesh(
      new THREE.BoxGeometry(0.012, 0.041, 0.036),
      new THREE.MeshStandardMaterial({ color: 0x040404 })
    );
    mark.position.set(cap.position.x - 0.024, cap.position.y, cap.position.z);
    discreteGroup.add(mark);
  }

  // 4 ceramic capacitors (small black 0805 SMD)
  for (let i = 0; i < 4; i++) {
    const cap = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.013, 0.015), matCapBlack);
    cap.position.set(-0.40 + i * 0.080, 0.044, 0.20);
    discreteGroup.add(cap);
  }

  // 3 SMD resistors (black with metal pads at each end)
  for (let i = 0; i < 3; i++) {
    const res = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.012, 0.018), matResistor);
    res.position.set(0.50 + i * 0.06, 0.043, 0.18);
    discreteGroup.add(res);
    // silver pads at each end
    const padMat = new THREE.MeshStandardMaterial({ color: 0xb8bcc4, metalness: 0.8, roughness: 0.3 });
    const padL = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.013, 0.019), padMat);
    padL.position.set(res.position.x - 0.014, res.position.y, res.position.z);
    discreteGroup.add(padL);
    const padR = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.013, 0.019), padMat);
    padR.position.set(res.position.x + 0.014, res.position.y, res.position.z);
    discreteGroup.add(padR);
  }

  // Quartz crystal oscillator — silver rounded rectangle, raised
  const crystal = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.045, 0.08), matCrystal);
  crystal.position.set(0.65, 0.058, -0.18);
  discreteGroup.add(crystal);
  discreteGroup.add(rim(crystal, 0x00F5FF, 0.6));
}
drive.add(discreteGroup);

// ─── 7. LED indicator (separate so it can fly out independently) ───
const ledGroup = new THREE.Group();
ledGroup.userData = { explode: new THREE.Vector3(0.0, 2.4, 0) };
{
  const led = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.03, 0.030), matLED);
  led.position.set(-0.55, 0.055, -0.20);
  ledGroup.add(led);
  const glow = new THREE.PointLight(0xFFE500, 1.5, 1.2);
  glow.position.copy(led.position);
  ledGroup.add(glow);
}
drive.add(ledGroup);

// ─── 8. USB-A plug (left end) — chrome shell, blue plastic tongue, 4 gold pins ───
const usbAGroup = new THREE.Group();
usbAGroup.userData = { explode: new THREE.Vector3(-2.4, 0, 0) };
{
  // outer chrome shell (the iconic USB-A rectangle)
  const sleeve = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.16, 0.42), matChrome);
  sleeve.position.set(-1.40, 0, 0);
  usbAGroup.add(sleeve);
  usbAGroup.add(rim(sleeve, 0xFFE500, 0.5));

  // 2 latching notches on the front edge (small cuts in the shell)
  const notchMat = new THREE.MeshStandardMaterial({ color: 0x000000, roughness: 1 });
  const n1 = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.05, 0.06), notchMat);
  n1.position.set(-1.71, 0.06, -0.17); usbAGroup.add(n1);
  const n2 = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.05, 0.06), notchMat);
  n2.position.set(-1.71, 0.06,  0.17); usbAGroup.add(n2);

  // INNER blue plastic tongue (the iconic USB-A blue insert)
  const tongue = new THREE.Mesh(new THREE.BoxGeometry(0.50, 0.045, 0.32), matUsbBlueIns);
  tongue.position.set(-1.36, -0.030, 0);
  usbAGroup.add(tongue);

  // 4 gold pin contacts on top of the tongue
  const pinGeom = new THREE.BoxGeometry(0.36, 0.005, 0.04);
  for (let i = 0; i < 4; i++) {
    const pin = new THREE.Mesh(pinGeom, matGoldPin);
    pin.position.set(-1.36, -0.005, -0.105 + i * 0.07);
    usbAGroup.add(pin);
  }

  // USB trident logo etched on the top of the shell (small line shape)
  const tridStem = new THREE.Mesh(
    new THREE.BoxGeometry(0.20, 0.003, 0.012),
    new THREE.MeshStandardMaterial({ color: 0x00F5FF, emissive: 0x00F5FF, emissiveIntensity: 0.8 })
  );
  tridStem.position.set(-1.35, 0.082, 0);
  usbAGroup.add(tridStem);

  // base plate of the connector (where it meets the body)
  const base = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 0.22, 0.50),
    new THREE.MeshStandardMaterial({ color: 0x404048, metalness: 0.9, roughness: 0.4 })
  );
  base.position.set(-1.05, 0, 0);
  usbAGroup.add(base);
}
drive.add(usbAGroup);

// ─── 9. USB-C plug (right end) — flat oval shell, internal paddle with two rows of contacts ───
const usbCGroup = new THREE.Group();
usbCGroup.userData = { explode: new THREE.Vector3(2.4, 0, 0) };
{
  // outer thin shell — much smaller than USB-A
  const cShell = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.10, 0.28), matChromeWear);
  cShell.position.set(1.30, 0, 0);
  usbCGroup.add(cShell);
  usbCGroup.add(rim(cShell, 0xFFE500, 0.85));

  // internal paddle (PCB with 24 pins on both sides) — very thin
  const paddle = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.018, 0.20), matUsbCInner);
  paddle.position.set(1.30, 0, 0);
  usbCGroup.add(paddle);

  // 12 contacts on top, 12 on bottom (we'll do 8 visible per side for sanity)
  const cPinGeom = new THREE.BoxGeometry(0.018, 0.002, 0.014);
  for (let i = 0; i < 8; i++) {
    const top = new THREE.Mesh(cPinGeom, matGoldPin);
    top.position.set(1.30, 0.011, -0.07 + i * 0.020);
    usbCGroup.add(top);
    const bot = new THREE.Mesh(cPinGeom, matGoldPin);
    bot.position.set(1.30, -0.011, -0.07 + i * 0.020);
    usbCGroup.add(bot);
  }

  // base plate
  const base = new THREE.Mesh(
    new THREE.BoxGeometry(0.06, 0.18, 0.40),
    new THREE.MeshStandardMaterial({ color: 0x404048, metalness: 0.9, roughness: 0.4 })
  );
  base.position.set(1.07, 0, 0);
  usbCGroup.add(base);
}
drive.add(usbCGroup);

// cache base positions
const groups = [shellTopGroup, shellBotGroup, pcbGroup, nandGroup, ctrlGroup, discreteGroup, ledGroup, usbAGroup, usbCGroup];
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
