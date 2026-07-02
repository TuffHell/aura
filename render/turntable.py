"""Project AURA - exploded-assembly turntable render (Blender, EEVEE).

Run headless:
  /Applications/Blender.app/Contents/MacOS/Blender --background --python turntable.py

Renders a 360-degree turntable of AURA's five colour-coded subsystem shells
(power base, compute core, DPT girdle, silicone flesh, Cu-silicone skin) plus
the head, to out/aura_turntable.mp4.
"""
import bpy
import math

OUT = "/Users/jasper/health/aura/out/aura_turntable.mp4"


def clear_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for coll in (bpy.data.meshes, bpy.data.materials, bpy.data.lights, bpy.data.cameras):
        for block in list(coll):
            coll.remove(block)


def srgb_to_linear(hexstr):
    hexstr = hexstr.lstrip("#")
    return tuple((int(hexstr[i:i + 2], 16) / 255.0) ** 2.2 for i in (0, 2, 4))


def make_material(name, hexcolor, roughness=0.45, metallic=0.0):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    r, g, b = srgb_to_linear(hexcolor)
    bsdf.inputs["Base Color"].default_value = (r, g, b, 1.0)
    bsdf.inputs["Roughness"].default_value = roughness
    if "Metallic" in bsdf.inputs:
        bsdf.inputs["Metallic"].default_value = metallic
    return mat


def finish(obj, material, parent):
    obj.data.materials.append(material)
    for poly in obj.data.polygons:
        poly.use_smooth = True
    obj.parent = parent


def build():
    clear_scene()
    scene = bpy.context.scene

    bpy.ops.object.empty_add(location=(0, 0, 0))
    pivot = bpy.context.active_object
    pivot.name = "pivot"

    # Power base (amber)
    bpy.ops.mesh.primitive_cylinder_add(radius=1.15, depth=0.55, vertices=72, location=(0, 0, 0.0))
    finish(bpy.context.active_object, make_material("base", "#BA7517", 0.5, 0.4), pivot)

    # Compute core (blue)
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.82, segments=48, ring_count=24, location=(0, 0, 1.5))
    finish(bpy.context.active_object, make_material("core", "#378ADD", 0.35, 0.1), pivot)

    # DPT girdle (teal torus)
    bpy.ops.mesh.primitive_torus_add(major_radius=1.0, minor_radius=0.2, location=(0, 0, 3.0))
    finish(bpy.context.active_object, make_material("girdle", "#1D9E75", 0.4), pivot)

    # Silicone flesh (soft dome)
    bpy.ops.mesh.primitive_uv_sphere_add(radius=1.18, segments=48, ring_count=24, location=(0, 0, 4.3))
    flesh = bpy.context.active_object
    flesh.scale = (1.0, 1.0, 0.5)
    finish(flesh, make_material("flesh", "#F1CDBC", 0.6), pivot)

    # Cu-silicone skin cap (copper disc)
    bpy.ops.mesh.primitive_uv_sphere_add(radius=1.28, segments=48, ring_count=24, location=(0, 0, 5.35))
    skin = bpy.context.active_object
    skin.scale = (1.0, 1.0, 0.3)
    finish(skin, make_material("skin", "#C57B52", 0.35, 0.6), pivot)

    # Head (white)
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.62, segments=48, ring_count=24, location=(0, 0, 6.55))
    finish(bpy.context.active_object, make_material("head", "#ECE9F8", 0.4), pivot)

    eye_mat = make_material("eye", "#26215C", 0.2)
    for dx in (-0.2, 0.2):
        bpy.ops.mesh.primitive_uv_sphere_add(radius=0.075, location=(dx, -0.55, 6.62))
        finish(bpy.context.active_object, eye_mat, pivot)

    return scene, pivot


def setup_world(scene):
    world = bpy.data.worlds.new("studio")
    scene.world = world
    world.use_nodes = True
    bg = world.node_tree.nodes["Background"]
    bg.inputs[0].default_value = (0.33, 0.34, 0.37, 1.0)
    bg.inputs[1].default_value = 1.0


def setup_lights():
    specs = [
        ("key", (6, -7, 9), 2400, 7.0),
        ("fill", (-7, -4, 4), 700, 9.0),
        ("rim", (0, 7, 7), 1100, 6.0),
    ]
    for name, loc, energy, size in specs:
        bpy.ops.object.light_add(type="AREA", location=loc)
        light = bpy.context.active_object
        light.name = name
        light.data.energy = energy
        light.data.size = size


def setup_camera(scene):
    bpy.ops.object.empty_add(location=(0, 0, 3.2))
    target = bpy.context.active_object
    bpy.ops.object.camera_add(location=(10, -10, 6.5))
    cam = bpy.context.active_object
    scene.camera = cam
    con = cam.constraints.new("TRACK_TO")
    con.target = target
    con.track_axis = "TRACK_NEGATIVE_Z"
    con.up_axis = "UP_Y"
    cam.data.lens = 70


def setup_turntable(scene, pivot):
    scene.frame_start = 1
    scene.frame_end = 96

    def spin(sc):
        frame = sc.frame_current
        pivot.rotation_euler = (0, 0, (frame - 1) / 96.0 * 2.0 * math.pi)

    bpy.app.handlers.frame_change_pre.append(spin)
    spin(scene)


def setup_render(scene):
    engines = scene.render.bl_rna.properties["engine"].enum_items.keys()
    for cand in ("BLENDER_EEVEE_NEXT", "BLENDER_EEVEE", "BLENDER_WORKBENCH"):
        if cand in engines:
            scene.render.engine = cand
            break
    try:
        scene.eevee.taa_render_samples = 16
    except Exception:
        pass
    scene.render.resolution_x = 720
    scene.render.resolution_y = 720
    scene.render.fps = 24
    scene.render.image_settings.file_format = "PNG"
    scene.render.filepath = "/Users/jasper/health/aura/out/frames/aura_"


def main():
    scene, pivot = build()
    setup_world(scene)
    setup_lights()
    setup_camera(scene)
    setup_turntable(scene, pivot)
    setup_render(scene)
    print("AURA_RENDER_ENGINE", scene.render.engine)
    bpy.ops.render.render(animation=True)
    print("AURA_RENDER_DONE", OUT)


if __name__ == "__main__":
    main()
