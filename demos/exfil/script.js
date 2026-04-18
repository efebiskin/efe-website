/* =========================================================
   EXFIL™ · script.js
   Three.js scroll-driven USB drive disassembly
   ========================================================= */

import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";

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
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));   // cap DPR to keep fill rate sane
renderer.setSize(innerWidth, innerHeight);
renderer.setClearColor(0x05030B, 1);
renderer.toneMapping = THREE.ACESFilmicToneMapping;     // cinematic tonemap
renderer.toneMappingExposure = 1.1;
renderer.outputColorSpace = THREE.SRGBColorSpace;

// Procedural HDRI from Three's RoomEnvironment — gives photoreal reflections on metals/glass
// without downloading a 10 MB .hdr file. Free.
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

// Post-processing: bloom on the neon emissive parts (lid strip, LED, traces)
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
composer.addPass(new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.35, 0.30, 0.85));   // softer bloom = cheaper
composer.addPass(new OutputPass());

// =================================================================
// MESHY GLB AUTO-SWAP — TWO MODES (USB-A out / USB-C out)
// As you scroll, the USB-A version slides up & out, the USB-C version
// slides in from below — turning the retractable mechanism into the
// page's narrative.
// =================================================================
const meshyHolder = new THREE.Group();
scene.add(meshyHolder);

let modelA = null, modelC = null;
let glbLoaded = 0;

function fitModel(m) {
  const box = new THREE.Box3().setFromObject(m);
  const size = box.getSize(new THREE.Vector3());
  const max = Math.max(size.x, size.y, size.z) || 1;
  const scale = 2.6 / max;
  m.scale.setScalar(scale);
  box.setFromObject(m);
  const center = box.getCenter(new THREE.Vector3());
  m.position.sub(center.multiplyScalar(scale));
  m.userData.baseY = m.position.y;
  m.traverse((n) => {
    if (n.isMesh) {
      n.material.envMapIntensity = 1.4;
      n.castShadow = true;
      n.receiveShadow = true;
    }
  });
}

const loader = new GLTFLoader();

loader.load("assets/exfil-usba.glb", (gltf) => {
  modelA = gltf.scene;
  fitModel(modelA);
  meshyHolder.add(modelA);
  glbLoaded++;
  if (glbLoaded > 0) drive.visible = false;
  console.log("✓ Loaded USB-A mode model");
});

loader.load("assets/exfil-usbc.glb", (gltf) => {
  modelC = gltf.scene;
  fitModel(modelC);
  modelC.position.y = -3;        // hidden below frame initially
  meshyHolder.add(modelC);
  glbLoaded++;
  if (glbLoaded > 0) drive.visible = false;
  console.log("✓ Loaded USB-C mode model");
});

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

// ─── 3. PCB — dense green FR4 with via field, gold pads, real circuit detail ───
const pcbGroup = new THREE.Group();
pcbGroup.userData = { explode: new THREE.Vector3(0, 0, 0.8) };
{
  // FR4 substrate
  const pcb = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.035, 0.58), matPCBgreen);
  pcbGroup.add(pcb);
  pcbGroup.add(rim(pcb, 0xc8a043, 0.35));

  // GOLD CONTACT FINGERS on the USB-A end of the PCB
  for (let i = 0; i < 4; i++) {
    const finger = new THREE.Mesh(
      new THREE.BoxGeometry(0.16, 0.005, 0.045),
      matPCBsolder
    );
    finger.position.set(-0.85, 0.020, -0.08 + i * 0.053);
    pcbGroup.add(finger);
  }
  // GOLD CONTACT FINGERS on the USB-C end (smaller, denser)
  for (let i = 0; i < 12; i++) {
    const finger = new THREE.Mesh(
      new THREE.BoxGeometry(0.10, 0.003, 0.015),
      matPCBsolder
    );
    finger.position.set(0.85, 0.020, -0.10 + i * 0.018);
    pcbGroup.add(finger);
  }

  // VIA HOLE FIELD — ~60 small gold dots scattered across the PCB
  // (these are the small plated through-holes that connect PCB layers)
  const viaGeom = new THREE.CircleGeometry(0.008, 8);
  const viaMat = new THREE.MeshStandardMaterial({
    color: 0xc8a043, metalness: 0.85, roughness: 0.3,
    emissive: 0x4a3010, emissiveIntensity: 0.4,
  });
  // dense via cluster around where the NAND chip will sit
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 5; c++) {
      const v = new THREE.Mesh(viaGeom, viaMat);
      v.rotation.x = -Math.PI / 2;
      v.position.set(-0.55 + r * 0.13, 0.019, -0.20 + c * 0.10);
      pcbGroup.add(v);
    }
  }
  // scattered vias near the controller area
  for (let i = 0; i < 14; i++) {
    const v = new THREE.Mesh(viaGeom, viaMat);
    v.rotation.x = -Math.PI / 2;
    v.position.set(0.20 + Math.random() * 0.35, 0.019, -0.22 + Math.random() * 0.44);
    pcbGroup.add(v);
  }

  // SILKSCREEN COMPONENT LABELS — small white-ish rectangles ("R1", "C2", "U1" markers)
  const silkMat = new THREE.MeshBasicMaterial({ color: 0xe8e0c0, transparent: true, opacity: 0.65 });
  const silkPositions = [
    [-0.55, -0.14, 0.04, 0.012],
    [-0.42,  0.16, 0.03, 0.012],
    [ 0.05, -0.18, 0.03, 0.012],
    [ 0.40,  0.20, 0.04, 0.012],
    [ 0.65, -0.08, 0.03, 0.012],
    [ 0.55,  0.12, 0.04, 0.012],
    [-0.10,  0.20, 0.03, 0.012],
  ];
  silkPositions.forEach(([x, z, w, h]) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.001, h), silkMat);
    m.position.set(x, 0.020, z);
    pcbGroup.add(m);
  });

  // PCB silkscreen traces — short routed paths (right-angle bends)
  function addTrace(x, z, w, h = 0.005) {
    const t = new THREE.Mesh(
      new THREE.BoxGeometry(w, 0.002, h),
      new THREE.MeshBasicMaterial({ color: 0xFF3388, transparent: true, opacity: 0.55 })
    );
    t.position.set(x, 0.019, z);
    pcbGroup.add(t);
  }
  // routed pattern emerging from USB-C contact fingers
  addTrace(0.65, -0.10, 0.3); addTrace(0.50, -0.10, 0.005, 0.2);
  addTrace(0.42, -0.05, 0.18); addTrace(0.35, 0.00, 0.005, 0.16);
  // controller to NAND
  addTrace(0.10, 0.05, 0.4); addTrace(-0.10, 0.05, 0.005, 0.18);
  addTrace(-0.20, 0.12, 0.3);
  // ground plane lines
  addTrace(-0.30, -0.20, 0.5);
  addTrace(0.20, 0.22, 0.45);

  // Small POLYGON pad outlines (silver squares around the via cluster ends)
  const padMat = new THREE.MeshStandardMaterial({ color: 0xb8bcc4, metalness: 0.85, roughness: 0.3 });
  for (let i = 0; i < 8; i++) {
    const pad = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.001, 0.018), padMat);
    pad.position.set(0.55 + (i % 4) * 0.08, 0.020, -0.10 + Math.floor(i/4) * 0.20);
    pcbGroup.add(pad);
  }
}
drive.add(pcbGroup);

// ─── 4. NAND flash IC — large TSOP chip dominates the PCB, real pin rows + printed text ───
const nandGroup = new THREE.Group();
nandGroup.userData = { explode: new THREE.Vector3(-0.4, 1.6, 0) };
{
  // chip body — significantly larger to dominate the board like a real NAND
  const W = 0.65, D = 0.07, H = 0.34;
  const chip = new THREE.Mesh(new THREE.BoxGeometry(W, D, H), matNANDbody);
  chip.position.set(-0.25, 0.072, 0);
  nandGroup.add(chip);

  // chip top face — slightly raised plane with PRINTED TEXT painted via canvas texture
  const tex = (() => {
    const c = document.createElement("canvas");
    c.width = 512; c.height = 256;
    const g = c.getContext("2d");
    g.fillStyle = "#16161c";
    g.fillRect(0, 0, c.width, c.height);
    g.fillStyle = "#9aa0aa";
    g.font = "700 38px ui-monospace, monospace";
    g.textAlign = "center";
    g.fillText("EXFIL", c.width / 2, 70);
    g.font = "500 26px ui-monospace, monospace";
    g.fillText("3D-NAND TLC 256GB", c.width / 2, 110);
    g.font = "400 22px ui-monospace, monospace";
    g.fillStyle = "#7a7e88";
    g.fillText("EX256-A0  WAH//B042", c.width / 2, 150);
    g.fillText("Z742180  CHN  2026/W42", c.width / 2, 180);
    g.font = "400 18px ui-monospace, monospace";
    g.fillStyle = "#5a5e68";
    g.fillText("◯ pin 1", 60, 230);
    return new THREE.CanvasTexture(c);
  })();
  const face = new THREE.Mesh(
    new THREE.PlaneGeometry(W * 0.95, H * 0.92),
    new THREE.MeshStandardMaterial({ map: tex, metalness: 0.2, roughness: 0.55 })
  );
  face.rotation.x = -Math.PI / 2;
  face.position.set(-0.25, 0.072 + D/2 + 0.0005, 0);
  nandGroup.add(face);

  // pin-1 dimple — the small round indent
  const dimple = new THREE.Mesh(
    new THREE.CircleGeometry(0.012, 16),
    new THREE.MeshStandardMaterial({ color: 0x040404, roughness: 0.9 })
  );
  dimple.rotation.x = -Math.PI / 2;
  dimple.position.set(-0.25 - W/2 + 0.04, 0.072 + D/2 + 0.001, -H/2 + 0.04);
  nandGroup.add(dimple);

  // 24 thin gold pins on EACH long side — that's the dense TSOP look
  const PINS_PER_SIDE = 24;
  const pinGeom = new THREE.BoxGeometry(0.03, 0.008, 0.008);
  for (let i = 0; i < PINS_PER_SIDE; i++) {
    const z = -H/2 + 0.025 + (i / (PINS_PER_SIDE - 1)) * (H - 0.05);
    const p1 = new THREE.Mesh(pinGeom, matGoldPin);
    p1.position.set(-0.25 - W/2 - 0.014, 0.052, z);
    nandGroup.add(p1);
    const p2 = new THREE.Mesh(pinGeom, matGoldPin);
    p2.position.set(-0.25 + W/2 + 0.014, 0.052, z);
    nandGroup.add(p2);
  }

  // very subtle cyan rim halo (kept dim so chip looks like a chip not a sci-fi prop)
  nandGroup.add(rim(chip, 0x00F5FF, 0.25));
}
drive.add(nandGroup);

// ─── 5. Controller IC — QFN package with printed marking + dense pin perimeter ───
const ctrlGroup = new THREE.Group();
ctrlGroup.userData = { explode: new THREE.Vector3(0.6, 1.4, 0) };
{
  const W = 0.30, D = 0.05, H = 0.30;
  const chip = new THREE.Mesh(new THREE.BoxGeometry(W, D, H), matCtrlBody);
  chip.position.set(0.30, 0.062, 0.05);
  ctrlGroup.add(chip);

  // printed top face via canvas texture
  const tex = (() => {
    const c = document.createElement("canvas");
    c.width = 256; c.height = 256;
    const g = c.getContext("2d");
    g.fillStyle = "#0e0e14";
    g.fillRect(0, 0, c.width, c.height);
    g.fillStyle = "#7a7e88";
    g.font = "600 28px ui-monospace, monospace";
    g.textAlign = "center";
    g.fillText("EXFIL-C", c.width / 2, 80);
    g.font = "500 22px ui-monospace, monospace";
    g.fillText("USB3.2", c.width / 2, 115);
    g.font = "400 18px ui-monospace, monospace";
    g.fillStyle = "#5a5e68";
    g.fillText("AC-256", c.width / 2, 150);
    g.fillText("2026 W42", c.width / 2, 175);
    // pin-1 dot
    g.fillStyle = "#FF3388";
    g.beginPath(); g.arc(40, 40, 6, 0, Math.PI * 2); g.fill();
    return new THREE.CanvasTexture(c);
  })();
  const face = new THREE.Mesh(
    new THREE.PlaneGeometry(W * 0.95, H * 0.95),
    new THREE.MeshStandardMaterial({ map: tex, metalness: 0.2, roughness: 0.6 })
  );
  face.rotation.x = -Math.PI / 2;
  face.position.set(0.30, 0.062 + D/2 + 0.0005, 0.05);
  ctrlGroup.add(face);

  // QFN pins around all 4 sides (denser — 12 per side)
  const qfnGeom = new THREE.BoxGeometry(0.014, 0.006, 0.008);
  const PER_SIDE = 12;
  for (let i = 0; i < PER_SIDE; i++) {
    const off = -H/2 + 0.018 + (i / (PER_SIDE - 1)) * (H - 0.036);
    const t = 0.16;
    const m1 = new THREE.Mesh(qfnGeom, matGoldPin); m1.position.set(0.30 - t, 0.045, 0.05 + off); ctrlGroup.add(m1);
    const m2 = new THREE.Mesh(qfnGeom, matGoldPin); m2.position.set(0.30 + t, 0.045, 0.05 + off); ctrlGroup.add(m2);
    const m3 = new THREE.Mesh(qfnGeom, matGoldPin); m3.rotation.y = Math.PI/2; m3.position.set(0.30 + off, 0.045, 0.05 - t); ctrlGroup.add(m3);
    const m4 = new THREE.Mesh(qfnGeom, matGoldPin); m4.rotation.y = Math.PI/2; m4.position.set(0.30 + off, 0.045, 0.05 + t); ctrlGroup.add(m4);
  }

  // subtle pink rim
  ctrlGroup.add(rim(chip, 0xFF0066, 0.35));
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
  composer.setSize(w, h);
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
  // Camera: gentle orbit, holds steady so the user can SEE the swap
  // (no aggressive zoom-in like the procedural version had)
  const orbit = progress * Math.PI * 0.35 + t * 0.10;
  const camDist = 4.8 - progress * 0.4;
  const camHeight = 0.2 + progress * 0.4;
  camera.position.set(Math.sin(orbit) * camDist, camHeight, Math.cos(orbit) * camDist);
  camera.lookAt(0, 0, 0);

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

  meshyHolder.rotation.y = Math.sin(t * 0.6) * 0.06 + t * 0.07;

  // ─── THREE-PHASE NARRATIVE ───
  if (modelA && modelC) {
    const aOut    = smooth(0.32, 0.40, progress);
    const procIn  = smooth(0.32, 0.40, progress);
    const procOut = smooth(0.68, 0.76, progress);
    const cIn     = smooth(0.68, 0.76, progress);

    // USB-A — only update if visible state changed or in transition zone
    const aVisible = aOut < 0.99;
    if (modelA.visible !== aVisible) modelA.visible = aVisible;
    if (aVisible) {
      modelA.position.y = aOut * 3.0;
      modelA.rotation.z = aOut * -0.6;
      // Only traverse for opacity during transition (not when fully visible/invisible)
      if (aOut > 0.01 && aOut < 0.99) {
        const op = 1 - aOut;
        modelA.traverse((n) => { if (n.isMesh) { n.material.transparent = true; n.material.opacity = op; } });
      } else if (aOut <= 0.01) {
        modelA.traverse((n) => { if (n.isMesh) { n.material.transparent = false; n.material.opacity = 1; } });
      }
    }

    // USB-C — same pattern
    const cVisible = cIn > 0.01;
    if (modelC.visible !== cVisible) modelC.visible = cVisible;
    if (cVisible) {
      modelC.position.y = -3 + cIn * 3.0;
      modelC.rotation.z = (1 - cIn) * 0.6;
      if (cIn > 0.01 && cIn < 0.99) {
        const op = cIn;
        modelC.traverse((n) => { if (n.isMesh) { n.material.transparent = true; n.material.opacity = op; } });
      } else if (cIn >= 0.99) {
        modelC.traverse((n) => { if (n.isMesh) { n.material.transparent = false; n.material.opacity = 1; } });
      }
    }

    // Procedural — only visible during X-RAY phase
    const procVis = procIn * (1 - procOut);
    const dVisible = procVis > 0.01;
    if (drive.visible !== dVisible) drive.visible = dVisible;
    if (dVisible) {
      drive.scale.setScalar(procVis);
      drive.rotation.y = Math.sin(t * 0.8) * 0.05 + t * 0.05;
      // Disassembly transforms — only when actually visible
      const disLocal = smooth(0.40, 0.68, progress);
      for (let i = 0; i < groups.length; i++) {
        const g = groups[i];
        const delay = i * 0.05;
        const localT = smooth(delay, 0.65 + delay, disLocal);
        const ex = g.userData.explode;
        const bp = g.userData.basePos;
        g.position.set(bp.x + ex.x * localT, bp.y + ex.y * localT, bp.z + ex.z * localT);
        g.rotation.y = localT * 0.18 * (i % 2 === 0 ? 1 : -1);
      }
    }
  } else {
    // No GLBs loaded — procedural-only fallback
    drive.visible = true;
    drive.rotation.y = Math.sin(t * 0.8) * 0.05 + t * 0.05;
    const disLocal = smooth(0.15, 0.92, progress);
    for (let i = 0; i < groups.length; i++) {
      const g = groups[i];
      const delay = i * 0.05;
      const localT = smooth(delay, 0.65 + delay, disLocal);
      const ex = g.userData.explode;
      const bp = g.userData.basePos;
      g.position.set(bp.x + ex.x * localT, bp.y + ex.y * localT, bp.z + ex.z * localT);
      g.rotation.y = localT * 0.18 * (i % 2 === 0 ? 1 : -1);
    }
  }

  composer.render();
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
