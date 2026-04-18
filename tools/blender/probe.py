"""
probe.py — inspect a Meshy GLB to plan the explode animation.

Run with:
    blender.exe --background --python probe.py -- <path-to-glb>

Reports: number of meshes, vertex counts, dimensions, materials,
and whether the model can be auto-separated into loose parts.
"""
import bpy
import sys
import os

# Parse args after `--`
argv = sys.argv
try:
    idx = argv.index("--")
    args = argv[idx + 1:]
except ValueError:
    args = []

if not args:
    print("ERROR: pass GLB path after --")
    sys.exit(1)

glb_path = args[0]
print(f"\n[probe] inspecting: {glb_path}")
print(f"[probe] exists: {os.path.exists(glb_path)}\n")

# Reset to empty scene
bpy.ops.wm.read_factory_settings(use_empty=True)

# Import the GLB
bpy.ops.import_scene.gltf(filepath=glb_path)

# Inspect what we got
print("=" * 60)
print("BEFORE separation:")
print(f"  Objects in scene: {len(bpy.context.scene.objects)}")
mesh_objects = [o for o in bpy.context.scene.objects if o.type == "MESH"]
print(f"  Mesh objects:     {len(mesh_objects)}")
for i, obj in enumerate(mesh_objects):
    mesh = obj.data
    print(f"    [{i}] '{obj.name}' — verts={len(mesh.vertices)}, polys={len(mesh.polygons)}, materials={[m.name for m in obj.data.materials]}")
    bb = obj.bound_box
    xs = [v[0] for v in bb]; ys = [v[1] for v in bb]; zs = [v[2] for v in bb]
    print(f"        bbox: x[{min(xs):.2f}, {max(xs):.2f}]  y[{min(ys):.2f}, {max(ys):.2f}]  z[{min(zs):.2f}, {max(zs):.2f}]")

# Try to separate by loose parts
print("\n" + "=" * 60)
print("Attempting LOOSE-PART separation...")
total_pieces = 0
for obj in mesh_objects:
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.separate(type="LOOSE")
    bpy.ops.object.mode_set(mode="OBJECT")

mesh_after = [o for o in bpy.context.scene.objects if o.type == "MESH"]
print(f"\nAFTER separation:")
print(f"  Mesh objects: {len(mesh_after)}")
for i, obj in enumerate(mesh_after[:30]):  # first 30
    print(f"    [{i}] '{obj.name}' — verts={len(obj.data.vertices)}")
if len(mesh_after) > 30:
    print(f"    ... +{len(mesh_after) - 30} more")

print("\n[probe] DONE")
