"""Project AURA - parametric CAD (CadQuery).

Emits:
  out/aura_assembly.step   colored exploded subsystem assembly (STEP AP214)
  out/aura_assembly.stl    same, meshed
  out/aura_skin_layup.step layered skin coupon cross-section
  out/aura_skin_layup.stl

Dimensions in millimetres. Run:
  ../.venv/bin/python aura_cad.py
"""
import cadquery as cq
from cadquery import Solid, Vector, Matrix, exporters

OUT = "/Users/jasper/health/aura/out"


def ellipsoid(rx, ry, rz, z):
    """A unit sphere scaled to semi-axes (rx, ry, rz), lifted to height z."""
    sph = Solid.makeSphere(1.0)
    sph = sph.transformGeometry(Matrix([[rx, 0, 0, 0], [0, ry, 0, 0], [0, 0, rz, 0]]))
    return sph.translate(Vector(0, 0, z))


def build_assembly():
    base = Solid.makeCylinder(115, 55, Vector(0, 0, 0))
    core = ellipsoid(82, 82, 82, 150)
    girdle = Solid.makeTorus(100, 20).translate(Vector(0, 0, 300))
    flesh = ellipsoid(118, 118, 59, 430)
    skin = ellipsoid(128, 128, 38, 535)
    head = ellipsoid(62, 62, 62, 655)
    eye_l = ellipsoid(8, 8, 8, 662).translate(Vector(-20, -55, 0))
    eye_r = ellipsoid(8, 8, 8, 662).translate(Vector(20, -55, 0))

    asm = cq.Assembly(name="AURA_exploded")
    asm.add(base, name="power_pump_base", color=cq.Color(0.73, 0.46, 0.09))
    asm.add(core, name="sensor_compute_core", color=cq.Color(0.22, 0.54, 0.87))
    asm.add(girdle, name="pneumatic_DPT_girdle", color=cq.Color(0.11, 0.62, 0.46))
    asm.add(flesh, name="silicone_flesh", color=cq.Color(0.95, 0.80, 0.74))
    asm.add(skin, name="Cu_silicone_skin", color=cq.Color(0.77, 0.48, 0.32))
    asm.add(head, name="sensor_head", color=cq.Color(0.93, 0.91, 0.97))
    asm.add(eye_l, name="eye_left", color=cq.Color(0.15, 0.13, 0.36))
    asm.add(eye_r, name="eye_right", color=cq.Color(0.15, 0.13, 0.36))
    return asm


def build_skin_layup():
    w, d = 200, 120
    active = cq.Workplane("XY").box(w, d, 6, centered=(True, True, False)).translate((0, 0, 40))
    flesh = cq.Workplane("XY").box(w, d, 30, centered=(True, True, False)).translate((0, 0, 10))
    tpu = cq.Workplane("XY").box(w, d, 8, centered=(True, True, False)).translate((0, 0, 2))
    frame = cq.Workplane("XY").box(w, d, 2, centered=(True, True, False))

    asm = cq.Assembly(name="AURA_skin_layup")
    asm.add(active, name="active_Cu_silicone", color=cq.Color(0.77, 0.48, 0.32))
    asm.add(flesh, name="compliant_silicone", color=cq.Color(0.95, 0.80, 0.74))
    asm.add(tpu, name="airtight_TPU_bladder", color=cq.Color(0.53, 0.58, 0.64))
    asm.add(frame, name="endoskeleton_mount", color=cq.Color(0.44, 0.44, 0.42))
    return asm


def main():
    assembly = build_assembly()
    assembly.save(f"{OUT}/aura_assembly.step")
    exporters.export(assembly.toCompound(), f"{OUT}/aura_assembly.stl")

    layup = build_skin_layup()
    layup.save(f"{OUT}/aura_skin_layup.step")
    exporters.export(layup.toCompound(), f"{OUT}/aura_skin_layup.stl")
    print("AURA_CAD_DONE")


if __name__ == "__main__":
    main()
