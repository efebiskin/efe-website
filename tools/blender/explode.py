"""
explode.py — radial-explode animation render for a Meshy GLB.

Run with:
    blender.exe --background --python explode.py -- <glb-path> <output-dir>

What it does:
  1. Imports the GLB
  2. Separates into loose parts (Meshy GLBs typically split into 100s-1000s of pieces)
  3. For each piece: computes outward direction from drive center, keyframes
     a fly-out animation with random rotation
  4. Sets up camera + warm-gold lighting matching the website theme
  5. Renders ~60 frames (2.5s @ 24fps) at 1280x720 as PNG sequence
"""
import bpy
import bmesh
import sys
import os
import math
import random
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
print(f"[explode] imported {len(all_meshes)} meshes from GLB")

# ---------- Auto-fit: scale and center the imported model so it's ~4 units wide ----------
# Compute combined bbox in world space
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
print(f"[explode] model bbox: {size.x:.2f} x {size.y:.2f} x {size.z:.2f}")
print(f"[explode] applying scale x{scale:.3f}, recentering to origin")

# Group all meshes under an empty for easy transform
empty = bpy.data.objects.new("DriveRoot", None)
bpy.context.scene.collection.objects.link(empty)
for obj in all_meshes:
    obj.parent = empty
empty.scale = (scale, scale, scale)
empty.location = -center * scale

# Apply transform so children inherit the scale
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

pieces = [o for o in bpy.context.scene.objects if o.type == "MESH"]
print(f"[explode] {len(pieces)} pieces to animate")

# ---------- Animate each piece into a CHOREOGRAPHED EXPLODED VIEW ----------
# Apple-style disassembly: top layer lifts UP, bottom drops DOWN, ends slide
# OUT sideways, middle stays put so internals are revealed. NO random rotation —
# every piece keeps its original orientation, just slides along a clean axis.
EXPLODE_FRAME = 60

# First, snap origin of each piece to its own geometry centroid
for p in pieces:
    bpy.ops.object.select_all(action="DESELECT")
    p.select_set(True)
    bpy.context.view_layer.objects.active = p
    bpy.ops.object.origin_set(type="ORIGIN_GEOMETRY", center="MEDIAN")

print("[explode] keyframing choreographed disassembly...")
# Multipliers (tune these to taste — they're applied per axis, biased so Y is strongest)
MULT_X = 1.6   # USB-A end → left, USB-C end → right
MULT_Y = 4.0   # top shell + buttons → way up, bottom shell → way down
MULT_Z = 0.4   # very mild depth spread

for piece in pieces:
    orig_pos = piece.location.copy()
    # Pure axis-aligned displacement, scaled by the piece's offset from center.
    # Pieces in the middle (orig_pos.y ≈ 0) barely move — internals revealed.
    explode_pos = mathutils.Vector((
        orig_pos.x * (1.0 + MULT_X * 0.5),
        orig_pos.y * (1.0 + MULT_Y * 0.5),
        orig_pos.z * (1.0 + MULT_Z * 0.5),
    ))

    # Frame 0: rest
    piece.location = orig_pos
    piece.keyframe_insert(data_path="location", frame=0)

    # Frame EXPLODE_FRAME: clean exploded layout
    piece.location = explode_pos
    piece.keyframe_insert(data_path="location", frame=EXPLODE_FRAME)
    # NO rotation keyframes — pieces stay aligned

# (Blender 5 changed the Action API — keyframes default to BEZIER interp which is fine)

# ---------- Camera ----------
print("[explode] setting up camera + lights")
cam_data = bpy.data.cameras.new("Camera")
cam_data.lens = 50
cam_obj = bpy.data.objects.new("Camera", cam_data)
bpy.context.scene.collection.objects.link(cam_obj)
cam_obj.location = (0, -9, 3)
cam_obj.rotation_euler = (math.radians(72), 0, 0)
bpy.context.scene.camera = cam_obj

# ---------- Lights (warm gold theme) ----------
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

# warm key
add_light("Key", "AREA", 1200, (1.0, 0.86, 0.55),
          (5, -5, 7), (math.radians(50), math.radians(30), 0))
# bright gold rim
add_light("Rim", "AREA", 900, (1.0, 0.92, 0.65),
          (-5, 4, 4), (math.radians(-30), math.radians(-45), 0))
# antique gold fill from below
add_light("Fill", "AREA", 350, (0.9, 0.7, 0.35),
          (0, 5, -2), (math.radians(120), 0, 0))

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
# EEVEE Next is fast (seconds/frame). Cycles is photoreal but minutes/frame.
try:
    scene.render.engine = "BLENDER_EEVEE_NEXT"
except Exception:
    scene.render.engine = "BLENDER_EEVEE"
scene.render.resolution_x = 1280
scene.render.resolution_y = 720
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = "PNG"
scene.render.image_settings.color_mode = "RGBA"
scene.render.image_settings.color_depth = "8"
scene.render.film_transparent = True

scene.frame_start = 0
scene.frame_end = EXPLODE_FRAME

os.makedirs(output_dir, exist_ok=True)
scene.render.filepath = os.path.join(output_dir, "frame_")

print(f"[explode] rendering frames 0..{EXPLODE_FRAME} at 1280x720 EEVEE_NEXT")
bpy.ops.render.render(animation=True)
print(f"[explode] DONE — frames written to {output_dir}")
