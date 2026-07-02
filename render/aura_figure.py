"""Project AURA - original soft-companion figure turntable (Blender, EEVEE).

An ORIGINAL design in the soft-healthcare-companion genre: matte-white rounded
body, a calm sensor visor (not a two-dot face), a teal DPT breathing band, and
copper-toned care-hands. Deliberately distinct from any existing character.

Run:
  /Applications/Blender.app/Contents/MacOS/Blender --background --python aura_figure.py
"""
import bpy
import math
import os

FRAMES = 96
STILL = bool(os.environ.get("AURA_STILL"))


def clear_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for coll in (bpy.data.meshes, bpy.data.materials, bpy.data.lights, bpy.data.cameras):
        for block in list(coll):
            coll.remove(block)


def srgb_to_linear(hexstr):
    hexstr = hexstr.lstrip("#")
    return tuple((int(hexstr[i:i + 2], 16) / 255.0) ** 2.2 for i in (0, 2, 4))


def make_material(name, hexcolor, roughness=0.5, metallic=0.0, emit_hex=None, emit_strength=0.0):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    r, g, b = srgb_to_linear(hexcolor)
    bsdf.inputs["Base Color"].default_value = (r, g, b, 1.0)
    bsdf.inputs["Roughness"].default_value = roughness
    if "Metallic" in bsdf.inputs:
        bsdf.inputs["Metallic"].default_value = metallic
    if emit_hex and "Emission Color" in bsdf.inputs:
        er, eg, eb = srgb_to_linear(emit_hex)
        bsdf.inputs["Emission Color"].default_value = (er, eg, eb, 1.0)
        bsdf.inputs["Emission Strength"].default_value = emit_strength
    return mat


def sphere(rx, ry, rz, loc, material, pivot, segs=64):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=1.0, segments=segs, ring_count=segs // 2, location=loc)
    obj = bpy.context.active_object
    obj.scale = (rx, ry, rz)
    obj.data.materials.append(material)
    for poly in obj.data.polygons:
        poly.use_smooth = True
    obj.parent = pivot
    return obj


def torus(major, minor, loc, rot, material, pivot):
    bpy.ops.mesh.primitive_torus_add(major_radius=major, minor_radius=minor, location=loc)
    obj = bpy.context.active_object
    obj.rotation_euler = rot
    obj.data.materials.append(material)
    for poly in obj.data.polygons:
        poly.use_smooth = True
    obj.parent = pivot
    return obj


def build():
    clear_scene()
    scene = bpy.context.scene

    bpy.ops.object.empty_add(location=(0, 0, 0))
    pivot = bpy.context.active_object
    pivot.name = "pivot"

    white = make_material("body_white", "#F3F2EF", roughness=0.55)
    teal = make_material("teal_band", "#1D9E75", roughness=0.4)
    copper = make_material("copper_hands", "#C57B52", roughness=0.4, metallic=0.5)
    visor = make_material("visor", "#202B30", roughness=0.25)
    eye = make_material("eye", "#34D6A6", roughness=0.2, emit_hex="#34D6A6", emit_strength=3.0)
    status = make_material("status", "#E0935A", roughness=0.3, emit_hex="#E0935A", emit_strength=2.0)

    # body
    sphere(1.45, 1.40, 1.45, (0, 0, 1.55), white, pivot)          # lower body
    sphere(1.22, 1.12, 1.20, (0, 0, 3.15), white, pivot)          # chest / shoulders
    torus(1.20, 0.15, (0, 0, 2.62), (math.radians(90), 0, 0), teal, pivot)  # DPT breathing band

    # head
    sphere(0.76, 0.74, 0.76, (0, 0, 4.55), white, pivot)
    sphere(0.70, 0.26, 0.40, (0, -0.48, 4.58), visor, pivot)      # sensor visor (signature)
    sphere(0.13, 0.10, 0.13, (-0.26, -0.66, 4.60), eye, pivot)    # left optic
    sphere(0.13, 0.10, 0.13, (0.26, -0.66, 4.60), eye, pivot)     # right optic
    sphere(0.05, 0.05, 0.05, (0, -0.70, 4.40), status, pivot)     # status indicator

    # arms + care-hands
    sphere(0.42, 0.42, 0.95, (-1.55, 0, 2.65), white, pivot)
    sphere(0.42, 0.42, 0.95, (1.55, 0, 2.65), white, pivot)
    sphere(0.34, 0.34, 0.34, (-1.62, -0.05, 1.75), copper, pivot)
    sphere(0.34, 0.34, 0.34, (1.62, -0.05, 1.75), copper, pivot)

    # legs + feet
    sphere(0.52, 0.52, 0.55, (-0.62, 0, 0.45), white, pivot)
    sphere(0.52, 0.52, 0.55, (0.62, 0, 0.45), white, pivot)
    sphere(0.40, 0.46, 0.22, (-0.62, -0.10, 0.12), white, pivot)
    sphere(0.40, 0.46, 0.22, (0.62, -0.10, 0.12), white, pivot)

    return scene, pivot


def setup_world(scene):
    world = bpy.data.worlds.new("studio")
    scene.world = world
    world.use_nodes = True
    bg = world.node_tree.nodes["Background"]
    bg.inputs[0].default_value = (0.30, 0.31, 0.34, 1.0)
    bg.inputs[1].default_value = 1.0


def setup_lights():
    for name, loc, energy, size in [
        ("key", (6, -7, 9), 2600, 7.0),
        ("fill", (-7, -4, 4.5), 800, 9.0),
        ("rim", (0, 7, 8), 1300, 6.0),
    ]:
        bpy.ops.object.light_add(type="AREA", location=loc)
        light = bpy.context.active_object
        light.name = name
        light.data.energy = energy
        light.data.size = size


def setup_camera(scene):
    bpy.ops.object.empty_add(location=(0, 0, 2.6))
    target = bpy.context.active_object
    bpy.ops.object.camera_add(location=(7.6, -7.6, 4.2))
    cam = bpy.context.active_object
    scene.camera = cam
    con = cam.constraints.new("TRACK_TO")
    con.target = target
    con.track_axis = "TRACK_NEGATIVE_Z"
    con.up_axis = "UP_Y"
    cam.data.lens = 74


def setup_turntable(scene, pivot):
    scene.frame_start = 1
    scene.frame_end = FRAMES

    def spin(sc):
        frame = sc.frame_current
        pivot.rotation_euler = (0, 0, (frame - 1) / FRAMES * 2.0 * math.pi)

    bpy.app.handlers.frame_change_pre.append(spin)
    spin(scene)


def setup_render(scene):
    engines = scene.render.bl_rna.properties["engine"].enum_items.keys()
    for cand in ("BLENDER_EEVEE_NEXT", "BLENDER_EEVEE", "BLENDER_WORKBENCH"):
        if cand in engines:
            scene.render.engine = cand
            break
    try:
        scene.eevee.taa_render_samples = 24
    except Exception:
        pass
    scene.render.resolution_x = 800
    scene.render.resolution_y = 800
    scene.render.fps = 24
    scene.render.image_settings.file_format = "PNG"
    if STILL:
        scene.render.image_settings.color_mode = "RGBA"
        scene.render.film_transparent = True
        scene.render.filepath = "/Users/jasper/health/aura/out/aura_front_rgba.png"
    else:
        scene.render.filepath = "/Users/jasper/health/aura/out/figframes/aura_"


def main():
    scene, pivot = build()
    setup_world(scene)
    setup_lights()
    setup_camera(scene)
    setup_turntable(scene, pivot)
    setup_render(scene)
    print("AURA_FIGURE_ENGINE", scene.render.engine)
    if STILL:
        scene.frame_set(1)
        bpy.ops.render.render(write_still=True)
    else:
        bpy.ops.render.render(animation=True)
    print("AURA_FIGURE_DONE")


if __name__ == "__main__":
    main()
