"""
explode.py — Apple-style choreographed disassembly with NAMED COMPONENT CLUSTERS.

Strategy:
  1. Import Meshy GLB (one fused mesh)
  2. Separate by loose parts (yields ~1,475 fragments)
  3. CLUSTER fragments into 7 named groups by spatial position:
       Slider_Left, Slider_Right, TopShell, BottomShell,
       USB_A_Left, USB_C_Right, PCB
  4. JOIN each cluster back into one named object
  5. Set origin to geometry for each cluster
  6. Animate each cluster with target position + STAGGERED timing
     (sliders fire first, shells next, connectors slide out, bottom drops)
  7. Render 90 frames as scroll-scrub PNG sequence

Run with:
    blender.exe --background --python explode.py -- <glb-path> <output-dir>
"""
import bpy
import sys
import os
import math
import mathutils

# ---------- Args ----------
argv = sys.argv
try:
    idx = argv.index("--")
    args = argv[idx + 1:]
except ValueError:
    args = []
if len(args) < 2:
    print("ERROR: usage --python explode.py -- <glb-path> <output-dir>")
    sys.exit(1)

glb_path = args[0]
output_dir = args[1]
print(f"\n[explode] glb:    {glb_path}")
print(f"[explode] output: {output_dir}\n")

# ---------- Reset scene ----------
bpy.ops.wm.read_factory_settings(use_empty=True)

# ---------- Import GLB ----------
bpy.ops.import_scene.gltf(filepath=glb_path)
all_meshes = [o for o in bpy.context.scene.objects if o.type == "MESH"]

# ---------- Auto-fit + recenter to origin ----------
mins = mathutils.Vector(( 1e9,  1e9,  1e9))
maxs = mathutils.Vector((-1e9, -1e9, -1e9))
for obj in all_meshes:
    for v in obj.bound_box:
        wv = obj.matrix_world @ mathutils.Vector(v)
        for i in range(3):
            if wv[i] < mins[i]: mins[i] = wv[i]
            if wv[i] > maxs[i]: maxs[i] = wv[i]
size = maxs - mins
center = (maxs + mins) * 0.5
scale = 4.0 / max(size.x, size.y, size.z)
print(f"[explode] bbox: {size.x:.2f} x {size.y:.2f} x {size.z:.2f} → scale x{scale:.3f}")

# Group all under empty for transform
empty = bpy.data.objects.new("DriveRoot", None)
bpy.context.scene.collection.objects.link(empty)
for obj in all_meshes:
    obj.parent = empty
empty.scale = (scale, scale, scale)
empty.location = -center * scale

bpy.ops.object.select_all(action="DESELECT")
empty.select_set(True)
for obj in all_meshes:
    obj.select_set(True)
bpy.context.view_layer.objects.active = empty
bpy.ops.object.transform_apply(location=True, rotation=False, scale=True)

# ---------- Separate into loose parts ----------
print("[explode] separating loose parts...")
for obj in list(bpy.context.scene.objects):
    if obj.type != "MESH": continue
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.separate(type="LOOSE")
    bpy.ops.object.mode_set(mode="OBJECT")

fragments = [o for o in bpy.context.scene.objects if o.type == "MESH"]
print(f"[explode] {len(fragments)} fragments to cluster")

# Snap each fragment's origin to its centroid (so .location is its world center)
for p in fragments:
    bpy.ops.object.select_all(action="DESELECT")
    p.select_set(True)
    bpy.context.view_layer.objects.active = p
    bpy.ops.object.origin_set(type="ORIGIN_GEOMETRY", center="MEDIAN")

# ---------- CLUSTER fragments by spatial position ----------
# After recentering, model is roughly:
#   X: -2.0 .. +2.0  (long axis, USB-A end ↔ USB-C end)
#   Y: -0.3 .. +0.3  (depth, front-back)
#   Z: -0.55 .. +0.55 (height, bottom shell ↔ slider buttons on top)
print("[explode] clustering into named components...")
clusters = {
    "Slider_Left":  [],
    "Slider_Right": [],
    "TopShell":     [],
    "USB_A_Left":   [],
    "USB_C_Right":  [],
    "BottomShell":  [],
    "PCB":          [],
}

for f in fragments:
    p = f.location  # geometry centroid in world space (after origin_set)
    # Classify by position
    if p.z > 0.30:
        # high Z = sliders / buttons on top
        if p.x < 0:
            clusters["Slider_Left"].append(f)
        else:
            clusters["Slider_Right"].append(f)
    elif p.z > 0.05:
        # mid-high Z = top shell
        clusters["TopShell"].append(f)
    elif p.z < -0.15:
        # low Z = bottom shell
        clusters["BottomShell"].append(f)
    elif p.x < -1.2:
        # far -X = USB-A connector
        clusters["USB_A_Left"].append(f)
    elif p.x > 1.2:
        # far +X = USB-C connector
        clusters["USB_C_Right"].append(f)
    else:
        # everything in the middle = PCB / internals
        clusters["PCB"].append(f)

for name, items in clusters.items():
    print(f"   {name:15s}  {len(items):4d} fragments")

# ---------- JOIN each cluster's fragments into ONE named object ----------
named_parts = {}
for name, items in clusters.items():
    if not items:
        continue
    bpy.ops.object.select_all(action="DESELECT")
    for f in items:
        f.select_set(True)
    bpy.context.view_layer.objects.active = items[0]
    bpy.ops.object.join()
    joined = bpy.context.active_object
    joined.name = name
    # snap origin to centroid for clean rotation/position
    bpy.ops.object.origin_set(type="ORIGIN_GEOMETRY", center="MEDIAN")
    named_parts[name] = joined

print(f"[explode] joined into {len(named_parts)} named parts")

# ---------- ANIMATION — staggered Apple-style choreography ----------
# Each part gets: rest at frame N_start, fully exploded at frame N_end
# Movement values are RELATIVE deltas applied to original position
PARTS = {
    # name           dx    dy    dz    start  end
    "Slider_Left":  ( -0.3, 0,   1.5,  0,     35),    # buttons fire first
    "Slider_Right": (  0.3, 0,   1.5,  3,     38),
    "TopShell":     (  0,   0,   1.0,  10,    50),    # shell follows
    "USB_A_Left":   ( -2.2, 0,   0,    18,    60),    # connectors slide
    "USB_C_Right":  (  2.2, 0,   0,    18,    60),
    "BottomShell":  (  0,   0,  -1.0,  25,    65),    # bottom drops last
    "PCB":          (  0,   0,   0.1,  20,    50),    # PCB barely moves (just lifts slightly)
}

TOTAL_FRAMES = 90

print("[explode] keyframing staggered disassembly...")
for name, (dx, dy, dz, start, end) in PARTS.items():
    if name not in named_parts:
        continue
    obj = named_parts[name]
    orig = obj.location.copy()

    # Frame 0: at original (rest) position — assembled
    obj.location = orig
    obj.keyframe_insert(data_path="location", frame=0)

    # Frame `start`: still at original (this creates the "delay before motion")
    obj.keyframe_insert(data_path="location", frame=start)

    # Frame `end`: fully displaced
    obj.location = (orig.x + dx, orig.y + dy, orig.z + dz)
    obj.keyframe_insert(data_path="location", frame=end)

    # Frame TOTAL_FRAMES: hold the exploded position
    obj.keyframe_insert(data_path="location", frame=TOTAL_FRAMES)

# ---------- Camera ----------
print("[explode] camera + lights")
cam_data = bpy.data.cameras.new("Camera")
cam_data.lens = 50
cam_obj = bpy.data.objects.new("Camera", cam_data)
bpy.context.scene.collection.objects.link(cam_obj)
cam_obj.location = (0, -8, 2.5)
cam_obj.rotation_euler = (math.radians(78), 0, 0)
bpy.context.scene.camera = cam_obj

# ---------- Lights — black & gold ----------
def add_light(name, kind, energy, color, location, rotation):
    lamp = bpy.data.lights.new(name, kind)
    lamp.energy = energy
    lamp.color = color
    if kind == "AREA":
        lamp.size = 4
    obj = bpy.data.objects.new(name, lamp)
    obj.location = location
    obj.rotation_euler = rotation
    bpy.context.scene.collection.objects.link(obj)

add_light("Key",  "AREA", 1400, (1.0, 0.86, 0.55), (5, -5, 7),  (math.radians(50), math.radians(30), 0))
add_light("Rim",  "AREA", 1000, (1.0, 0.92, 0.65), (-5, 4, 4),  (math.radians(-30), math.radians(-45), 0))
add_light("Fill", "AREA", 350,  (0.9, 0.7,  0.35), (0, 5, -2),  (math.radians(120), 0, 0))

# ---------- World ----------
world = bpy.context.scene.world
if world is None:
    world = bpy.data.worlds.new("World")
    bpy.context.scene.world = world
world.use_nodes = True
bg = world.node_tree.nodes.get("Background")
if bg:
    bg.inputs[0].default_value = (0.020, 0.015, 0.008, 1.0)
    bg.inputs[1].default_value = 0.6

# ---------- Render settings ----------
scene = bpy.context.scene
try:
    scene.render.engine = "BLENDER_EEVEE_NEXT"
except Exception:
    scene.render.engine = "BLENDER_EEVEE"
scene.render.resolution_x = 1280
scene.render.resolution_y = 720
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = "PNG"
scene.render.image_settings.color_mode = "RGBA"
scene.render.film_transparent = True

scene.frame_start = 0
scene.frame_end = TOTAL_FRAMES

os.makedirs(output_dir, exist_ok=True)
scene.render.filepath = os.path.join(output_dir, "frame_")

print(f"[explode] rendering frames 0..{TOTAL_FRAMES}")
bpy.ops.render.render(animation=True)
print(f"[explode] DONE → {output_dir}")
