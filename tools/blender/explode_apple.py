"""
explode_apple.py — TRUE Apple-style 7-component disassembly.

Strategy:
  1. Bisect the Meshy GLB along Z=0 → real TopShell and BottomShell objects (NOT fragments).
  2. Generate procedural primitives for the components Meshy never modeled:
     PCB (green slab + black NAND chip), USB-A connector (chrome), USB-C connector
     (gunmetal), 2 slider buttons (gold).
  3. Animate the 7 named components with staggered choreography:
     buttons fly first → top shell lifts → connectors slide → bottom drops.
  4. Render 100 frames as PNG sequence.
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
glb_path = args[0]
output_dir = args[1]
print(f"\n[apple] glb: {glb_path}")
print(f"[apple] out: {output_dir}\n")

# ---------- Reset scene ----------
bpy.ops.wm.read_factory_settings(use_empty=True)

# ---------- Import GLB ----------
bpy.ops.import_scene.gltf(filepath=glb_path)
all_meshes = [o for o in bpy.context.scene.objects if o.type == "MESH"]
print(f"[apple] imported {len(all_meshes)} meshes")

# ---------- Join all imported meshes into ONE outer-shell object ----------
if len(all_meshes) > 1:
    bpy.ops.object.select_all(action="DESELECT")
    for m in all_meshes:
        m.select_set(True)
    bpy.context.view_layer.objects.active = all_meshes[0]
    bpy.ops.object.join()

shell = bpy.context.scene.objects[0] if len(bpy.context.scene.objects) == 1 else [o for o in bpy.context.scene.objects if o.type == "MESH"][0]
shell.name = "MeshyShell_full"

# ---------- Auto-fit / center the shell to origin, scale to ~4 wide ----------
mins = mathutils.Vector(( 1e9,  1e9,  1e9))
maxs = mathutils.Vector((-1e9, -1e9, -1e9))
for v in shell.bound_box:
    wv = shell.matrix_world @ mathutils.Vector(v)
    for i in range(3):
        if wv[i] < mins[i]: mins[i] = wv[i]
        if wv[i] > maxs[i]: maxs[i] = wv[i]
size = maxs - mins
center = (maxs + mins) * 0.5
scale = 4.0 / max(size.x, size.y, size.z)
print(f"[apple] bbox {size.x:.2f} x {size.y:.2f} x {size.z:.2f} → scale x{scale:.3f}")

shell.location = -center * scale
shell.scale = (scale, scale, scale)
bpy.ops.object.select_all(action="DESELECT")
shell.select_set(True)
bpy.context.view_layer.objects.active = shell
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

# ---------- Duplicate to make a copy for the bottom half ----------
bpy.ops.object.select_all(action="DESELECT")
shell.select_set(True)
bpy.context.view_layer.objects.active = shell
bpy.ops.object.duplicate()
bottom_shell = bpy.context.active_object
bottom_shell.name = "BottomShell"
shell.name = "TopShell"

# Bisect TopShell — keep the upper half (clear lower)
print("[apple] bisecting TopShell (keep z >= 0)")
bpy.ops.object.select_all(action="DESELECT")
shell.select_set(True)
bpy.context.view_layer.objects.active = shell
bpy.ops.object.mode_set(mode="EDIT")
bpy.ops.mesh.select_all(action="SELECT")
bpy.ops.mesh.bisect(
    plane_co=(0, 0, 0),
    plane_no=(0, 0, 1),
    clear_inner=True,
    use_fill=False,
)
bpy.ops.object.mode_set(mode="OBJECT")

# Bisect BottomShell — keep the lower half (clear upper)
print("[apple] bisecting BottomShell (keep z <= 0)")
bpy.ops.object.select_all(action="DESELECT")
bottom_shell.select_set(True)
bpy.context.view_layer.objects.active = bottom_shell
bpy.ops.object.mode_set(mode="EDIT")
bpy.ops.mesh.select_all(action="SELECT")
bpy.ops.mesh.bisect(
    plane_co=(0, 0, 0),
    plane_no=(0, 0, 1),
    clear_outer=True,
    use_fill=False,
)
bpy.ops.object.mode_set(mode="OBJECT")

# Set origins to geometry centers
for o in (shell, bottom_shell):
    bpy.ops.object.select_all(action="DESELECT")
    o.select_set(True)
    bpy.context.view_layer.objects.active = o
    bpy.ops.object.origin_set(type="ORIGIN_GEOMETRY", center="MEDIAN")

# ---------- Material helper ----------
def make_material(name, color, metallic=0.0, roughness=0.5, emission=None, emission_strength=0.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    bsdf = m.node_tree.nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs["Base Color"].default_value = (*color, 1.0)
        bsdf.inputs["Metallic"].default_value = metallic
        bsdf.inputs["Roughness"].default_value = roughness
        if emission and "Emission Color" in bsdf.inputs:
            bsdf.inputs["Emission Color"].default_value = (*emission, 1.0)
            bsdf.inputs["Emission Strength"].default_value = emission_strength
    return m

mat_pcb_green = make_material("PCB_Green", (0.04, 0.20, 0.10), metallic=0.1, roughness=0.7)
mat_chip     = make_material("Chip", (0.05, 0.05, 0.07), metallic=0.3, roughness=0.55)
mat_chrome   = make_material("Chrome", (0.85, 0.87, 0.92), metallic=0.95, roughness=0.10)
mat_gunmetal = make_material("Gunmetal", (0.20, 0.22, 0.26), metallic=0.85, roughness=0.20)
mat_gold     = make_material("Gold", (0.83, 0.63, 0.26), metallic=0.92, roughness=0.20)
mat_blue_ins = make_material("USBA_Blue", (0.04, 0.13, 0.40), metallic=0.1, roughness=0.6)

# ---------- Procedural internals ----------
def add_box(name, size, location, material, parent=None):
    bpy.ops.mesh.primitive_cube_add(size=1, location=location)
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = size
    obj.data.materials.append(material)
    if parent: obj.parent = parent
    return obj

def add_cylinder(name, radius, depth, location, material, parent=None):
    bpy.ops.mesh.primitive_cylinder_add(radius=radius, depth=depth, location=location)
    obj = bpy.context.active_object
    obj.name = name
    obj.data.materials.append(material)
    if parent: obj.parent = parent
    return obj

# PCB — flat green slab in the middle
pcb = add_box("PCB", (1.7, 0.32, 0.025), (0, 0, 0), mat_pcb_green)
# NAND chip on PCB (rides with it via parent)
nand = add_box("NAND", (0.32, 0.22, 0.030), (0.10, 0, 0.030), mat_chip, parent=pcb)
# Controller IC
ctrl = add_box("Ctrl", (0.20, 0.20, 0.025), (-0.45, 0, 0.030), mat_chip, parent=pcb)
# 4 small caps
for i in range(4):
    add_box(f"Cap{i}", (0.04, 0.025, 0.025), (-0.20 + i*0.10, -0.13, 0.028), mat_gold, parent=pcb)

# USB-A connector — chrome shell + blue insert + 4 gold pins
usba = add_box("USB_A", (0.42, 0.30, 0.13), (-1.85, 0, 0), mat_chrome)
usba_blue = add_box("USB_A_Blue", (0.36, 0.24, 0.04), (-1.85, 0, -0.025), mat_blue_ins, parent=usba)
for i in range(4):
    add_box(f"USB_A_Pin{i}", (0.32, 0.04, 0.005), (-1.85, -0.10 + i*0.07, 0.005), mat_gold, parent=usba)

# USB-C connector — smaller gunmetal oval (use box with bevel-y dimensions)
usbc = add_box("USB_C", (0.30, 0.20, 0.08), (1.85, 0, 0), mat_gunmetal)
usbc_paddle = add_box("USB_C_Paddle", (0.22, 0.12, 0.015), (1.85, 0, 0), mat_chip, parent=usbc)

# Slider buttons — knurled gold (small flat boxes)
slider_l = add_box("Slider_Left",  (0.20, 0.13, 0.06), (-0.55, 0, 0.30), mat_gold)
slider_r = add_box("Slider_Right", (0.20, 0.13, 0.06), ( 0.55, 0, 0.30), mat_gold)

# Make sure transforms are applied
for obj in (pcb, usba, usbc, slider_l, slider_r):
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)

# ---------- ANIMATION — Apple-style choreography ----------
PARTS = [
    # (object,      dx,    dy,   dz,   start, end)
    (slider_l,     -0.4,   0,    2.5,  0,   40),
    (slider_r,      0.4,   0,    2.5,  4,   44),
    (shell,         0,     0,    1.6,  12,  60),    # TopShell lifts
    (usba,         -3.0,   0,    0,    25,  75),
    (usbc,          3.0,   0,    0,    25,  75),
    (pcb,           0,     0,    0,    0,   0 ),    # PCB stays — internals revealed
    (bottom_shell,  0,     0,   -1.6,  30,  80),
]
TOTAL_FRAMES = 100

print("[apple] keyframing...")
for obj, dx, dy, dz, start, end in PARTS:
    orig = obj.location.copy()
    obj.location = orig
    obj.keyframe_insert(data_path="location", frame=0)
    obj.keyframe_insert(data_path="location", frame=start)
    obj.location = (orig.x + dx, orig.y + dy, orig.z + dz)
    obj.keyframe_insert(data_path="location", frame=end)
    obj.keyframe_insert(data_path="location", frame=TOTAL_FRAMES)

# ---------- Camera ----------
print("[apple] camera + lights")
cam_data = bpy.data.cameras.new("Camera")
cam_data.lens = 50
cam_obj = bpy.data.objects.new("Camera", cam_data)
bpy.context.scene.collection.objects.link(cam_obj)
cam_obj.location = (0, -10, 1.5)
cam_obj.rotation_euler = (math.radians(82), 0, 0)
bpy.context.scene.camera = cam_obj

# ---------- Lights ----------
def add_light(name, kind, energy, color, location, rotation):
    lamp = bpy.data.lights.new(name, kind)
    lamp.energy = energy
    lamp.color = color
    if kind == "AREA": lamp.size = 4
    obj = bpy.data.objects.new(name, lamp)
    obj.location = location; obj.rotation_euler = rotation
    bpy.context.scene.collection.objects.link(obj)

add_light("Key",  "AREA", 1500, (1.0, 0.86, 0.55), (5, -5, 7),  (math.radians(50), math.radians(30), 0))
add_light("Rim",  "AREA", 1100, (1.0, 0.92, 0.65), (-5, 4, 4),  (math.radians(-30), math.radians(-45), 0))
add_light("Fill", "AREA", 400,  (0.9, 0.7,  0.35), (0, 5, -2),  (math.radians(120), 0, 0))

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

# ---------- Render ----------
scene = bpy.context.scene
try:
    scene.render.engine = "BLENDER_EEVEE_NEXT"
except Exception:
    scene.render.engine = "BLENDER_EEVEE"
scene.render.resolution_x = 1280
scene.render.resolution_y = 720
scene.render.image_settings.file_format = "PNG"
scene.render.image_settings.color_mode = "RGBA"
scene.render.film_transparent = True
scene.frame_start = 0
scene.frame_end = TOTAL_FRAMES

os.makedirs(output_dir, exist_ok=True)
scene.render.filepath = os.path.join(output_dir, "frame_")
print(f"[apple] rendering {TOTAL_FRAMES + 1} frames")
bpy.ops.render.render(animation=True)
print(f"[apple] DONE → {output_dir}")
