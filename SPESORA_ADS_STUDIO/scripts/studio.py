"""Scena di studio per i concept: sfondo crema, pavimento con ombre, tre luci morbide, camera, render Cycles CPU."""
import math
import time
import bpy
from mathutils import Vector
from characters import srgb, C_BG


def setup(res=(640, 960), samples=40):
    sc = bpy.context.scene
    sc.render.engine = "CYCLES"
    sc.cycles.device = "CPU"
    sc.cycles.samples = samples
    sc.cycles.use_denoising = True
    sc.cycles.max_bounces = 6
    sc.render.resolution_x, sc.render.resolution_y = res
    sc.render.resolution_percentage = 100
    sc.render.image_settings.file_format = "PNG"
    sc.view_settings.view_transform = "Standard"
    sc.view_settings.look = "None"
    # mondo: crema
    w = bpy.data.worlds.new("w")
    w.use_nodes = True
    bg = w.node_tree.nodes["Background"]
    bg.inputs["Color"].default_value = (*srgb(C_BG), 1)
    bg.inputs["Strength"].default_value = 0.95
    sc.world = w
    # pavimento con cattura-ombre
    bpy.ops.mesh.primitive_plane_add(size=40, location=(0, 0, 0))
    fl = bpy.context.active_object
    fl.is_shadow_catcher = True
    # luci
    def area(name, loc, energy, size, color):
        d = bpy.data.lights.new(name, "AREA")
        d.energy = energy
        d.size = size
        d.color = color
        o = bpy.data.objects.new(name, d)
        sc.collection.objects.link(o)
        o.location = loc
        direction = Vector((0, 0, 1.2)) - Vector(loc)
        o.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()
        return o
    area("key", (-3.2, -4.5, 4.6), 380, 3.5, (1.0, 0.96, 0.92))
    area("fill", (4.0, -4.0, 2.6), 120, 4.0, (0.86, 0.92, 1.0))
    area("rim", (0.5, 4.2, 4.0), 230, 3.0, (1.0, 0.96, 0.9))
    cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam"))
    sc.collection.objects.link(cam)
    sc.camera = cam
    return sc


def aim(cam, loc, target, lens=70):
    cam.location = loc
    cam.data.lens = lens
    cam.data.sensor_width = 36
    cam.data.sensor_fit = "VERTICAL"
    cam.data.sensor_height = 36
    d = Vector(target) - Vector(loc)
    cam.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()


def render(path):
    t = time.time()
    bpy.context.scene.render.filepath = path
    bpy.ops.render.render(write_still=True)
    return time.time() - t
