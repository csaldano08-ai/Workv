"""
Prove della fase 2 (personaggio base, rig, espressioni, braccia, presa del telefono).
    python cs_test_phase2.py <out_dir> [sezioni: turn,expr,arms,phone]   (default: tutte)
Scrive PNG, tavole e qc_phase2.json con i controlli geometrici e i tempi di render misurati.
"""
import json
import math
import os
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy  # noqa: E402
from mathutils import Vector  # noqa: E402

import cs_pose as PO  # noqa: E402
import cs_qc as QC  # noqa: E402
import cs_scene as S  # noqa: E402
from cs_char import Character  # noqa: E402
from cs_face import draw_face, expr, EXPRESSIONS  # noqa: E402

OUT = os.path.abspath(sys.argv[1])
SECTIONS = sys.argv[2].split(",") if len(sys.argv) > 2 else ["turn", "expr", "arms", "phone"]
os.makedirs(OUT, exist_ok=True)
QCR = {}
TIMES = {}


def face(ch, name, gaze=(0, 0), blink=0.0, **over):
    p = expr(name, lashes=ch.spec["lashes"], **over)
    path = os.path.join(ch.workdir, f"face_{name}_{gaze[0]:.2f}_{gaze[1]:.2f}_{blink:.2f}.png")
    draw_face(p, gaze=gaze, blink=blink, size=1024).save(path)
    ch.set_face(path)


def timed_render(path, key):
    t = time.time()
    S.render(path)
    TIMES.setdefault(key, []).append(round(time.time() - t, 2))


def body_qc(ch, label):
    """Braccia vs busto, mani vs busto/testa, gambe tra loro, piedi sul pavimento."""
    r = {}
    sh = {s: ch.rig.matrix_world @ ch.rig.pose.bones[f"upperarm.{s}"].head for s in "LR"}  # giunto della spalla in posa
    hip = {s: ch.rig.matrix_world @ ch.rest[f"thigh.{s}"][0] for s in "LR"}
    for s in "LR":
        # la radice del braccio è innestata di proposito nel busto (attacco alla spalla): esclusi gli 11 cm vicini al giunto
        r[f"arm.{s}_in_torso"] = QC.penetration(ch.parts[f"arm.{s}"], ch.parts["torso"], ignore=lambda v, g, s=s: (v - sh[s]).length < QC.ARM_ROOT)
        r[f"hand.{s}_in_torso"] = QC.penetration(ch.parts[f"hand.{s}"], ch.parts["torso"])
        r[f"hand.{s}_in_head"] = QC.penetration(ch.parts[f"hand.{s}"], ch.parts["head"])
        r[f"leg.{s}_in_torso"] = QC.penetration(ch.parts[f"leg.{s}"], ch.parts["torso"], ignore=lambda v, g, s=s: (v - hip[s]).length < QC.LEG_ROOT)
        r[f"foot.{s}_min_z_mm"] = round(QC.min_z(ch.parts[f"foot.{s}"]) * 1000, 2)
    r["leg.L_in_leg.R"] = QC.penetration(ch.parts["leg.L"], ch.parts["leg.R"])
    r["foot.L_in_foot.R"] = QC.penetration(ch.parts["foot.L"], ch.parts["foot.R"])
    QCR[label] = r
    return r


def sheet(paths, out, cols, labels=None, cell=None):
    from PIL import Image, ImageDraw, ImageFont
    ims = [Image.open(p).convert("RGB") for p in paths]
    w, h = cell or ims[0].size
    rows = (len(ims) + cols - 1) // cols
    lab = 44 if labels else 0
    sh = Image.new("RGB", (w * cols, (h + lab) * rows), (246, 244, 238))
    d = ImageDraw.Draw(sh)
    try:
        f = ImageFont.truetype("/usr/share/fonts/opentype/inter/Inter-SemiBold.otf", 24)
    except OSError:
        f = ImageFont.load_default()
    for i, im in enumerate(ims):
        x, y = (i % cols) * w, (i // cols) * (h + lab)
        sh.paste(im.resize((w, h)), (x, y + lab))
        if labels:
            d.text((x + 14, y + 10), labels[i], fill=(30, 30, 30), font=f)
    sh.save(out)


S.reset()
S.render_setup((540, 900), 24)
S.studio()
WD = os.path.join(OUT, "_wd")
pro = Character("protagonista", WD)
fem = Character("protagonista_f", WD)
fem.rig.location = (5.0, 0, 0)  # fuori campo finché non serve
cam = S.camera((0, -4.4, 1.0), (0, 0, 0.9), 50)
phone = S.build_phone()
phone.location = (0, 0, -5)

# ------------------------------------------------------------------ 1) giro completo
if "turn" in SECTIONS:
    for ch, tag in ((pro, "protagonista"), (fem, "protagonista_f")):
        other = fem if ch is pro else pro
        other.rig.location = (5.0, 0, 0)
        ch.rig.location = (0, 0, 0)
        ch.pose(PO.idle(ch))
        face(ch, "neutro")
        body_qc(ch, f"turn_{tag}_idle")
        views = [("fronte", (0, -4.4, 1.0)), ("tre_quarti", (2.9, -3.3, 1.1)), ("lato", (4.4, 0, 1.0)), ("retro", (0, 4.4, 1.0))]
        paths = []
        for vname, loc in views:
            S.aim(cam, loc, (0, 0, 0.88))
            p = os.path.join(OUT, f"turn_{tag}_{vname}.png")
            timed_render(p, "turn")
            paths.append(p)
        sheet(paths, os.path.join(OUT, f"TAVOLA_turnaround_{tag}.png"), 4, ["Fronte", "Tre quarti", "Lato", "Retro"])
    fem.rig.location = (5.0, 0, 0)
    pro.rig.location = (0, 0, 0)

# ------------------------------------------------------------------ 2) espressioni sulla testa 3D
if "expr" in SECTIONS:
    S.render_setup((440, 440), 24)
    pro.pose(PO.idle(pro))
    hc = pro.head_c
    S.aim(cam, (0.5, -2.35, hc.z + 0.05), (0, 0, hc.z - 0.02))
    cam.data.lens = 85
    gazes = {"confuso": (0.4, 0.2), "imbarazzato": (-0.6, -0.3), "ironico": (0.5, 0.0), "preoccupato": (-0.3, 0.1)}
    paths, labels = [], []
    for name in ["neutro", "felice", "confuso", "sorpreso", "preoccupato", "imbarazzato", "spaventato", "frustrato", "ironico", "falsa_sicurezza", "panico", "sollievo", "esasperato", "piange"]:
        g = gazes.get(name, (0.2, 0.0))
        face(pro, name, gaze=g)
        # la testa accompagna l'emozione (non solo il disegno)
        head = {"sorpreso": (-8, 0, 0), "preoccupato": (6, 0, 4), "imbarazzato": (8, -10, 6), "spaventato": (-6, 0, 0), "frustrato": (6, 0, 0),
                "ironico": (0, 8, -8), "falsa_sicurezza": (-6, 0, 0), "panico": (-10, 0, 0), "sollievo": (-4, 0, 6), "confuso": (0, 6, 12),
                "esasperato": (4, 0, -6), "piange": (8, 0, 0)}.get(name, (0, 0, 0))
        P = PO.idle(pro)
        P["head_rot"] = head
        pro.pose(P)
        p = os.path.join(OUT, f"expr_{name}.png")
        timed_render(p, "expr")
        paths.append(p)
        labels.append(name.replace("_", " "))
    sheet(paths, os.path.join(OUT, "TAVOLA_espressioni_3D.png"), 7, labels)
    cam.data.lens = 50
    S.render_setup((540, 900), 24)

# ------------------------------------------------------------------ 3) braccia: gomito e gesti
if "arms" in SECTIONS:
    S.render_setup((480, 800), 24)
    face(pro, "neutro", gaze=(0.3, 0))
    S.aim(cam, (2.4, -3.2, 1.15), (-0.12, 0, 0.95))
    cam.data.lens = 40
    paths, labels = [], []
    # piegamento del gomito destro: il polso sale verso la spalla
    for k, hp in enumerate([(-0.43, -0.06, 0.6), (-0.42, -0.3, 0.72), (-0.34, -0.36, 0.94), (-0.27, -0.22, 1.1)]):
        P = PO.idle(pro)
        P["hand.R"] = (hp, (0.05, -0.5, 1.0) if k else (-0.12, -0.25, -1), (1, 0, 0) if k == 0 else (0.9, 0.0, -0.2))
        P["elbow.R"] = (-0.5, 0.35, 0.7)
        el = PO.solve_elbow(pro, P, "R")
        ub, fb = pro.rig.pose.bones["upperarm.R"], pro.rig.pose.bones["forearm.R"]
        ang = 180 - math.degrees((ub.tail - ub.head).angle(fb.head - fb.tail))
        p = os.path.join(OUT, f"arm_gomito_{k}.png")
        QCR[f"gomito_{k}"] = dict(angolo_gomito_gradi=round(ang, 1), risolutore_gomito=el, **{kk: vv for kk, vv in body_qc(pro, f"gomito_{k}").items() if "arm.R" in kk or "hand.R" in kk})
        timed_render(p, "arms")
        paths.append(p)
        labels.append(f"Gomito {round(ang)}°")
    for name, P, fc in [("Indica", PO.point(pro, "L"), ("sorpreso", (0.6, 0.1))), ("Saluta", PO.wave(pro, "L", 0.1), ("felice", (0.2, 0))),
                        ("Spallucce", PO.shrug(pro), ("confuso", (0, 0))), ("Pensa", PO.think(pro, "R"), ("ironico", (0.4, 0.3)))]:
        res = {s: PO.solve_elbow(pro, P, s) for s in ("L", "R")}
        if name == "Pensa":
            # contatto pugno-mento: la mano si avvicina al mento finché lo tocca (≈2 mm) senza entrarci
            chin = pro.head_c + pro.head_surface(Vector((0, -0.62, -0.78)).normalized()) * 0.98
            res["contatto"] = PO.approach_contact(pro, P, "R", pro.parts["head"], tuple(chin))
            res["R"] = PO.solve_elbow(pro, P, "R")
            res["contatto_finale"] = dict(distanza_mm=QC.nearest_gap(pro.parts["hand.R"], pro.parts["head"]))
        QCR[f"risolutori_{name}"] = res
        face(pro, fc[0], gaze=fc[1])
        body_qc(pro, f"gesto_{name}")
        p = os.path.join(OUT, f"arm_{name}.png")
        timed_render(p, "arms")
        paths.append(p)
        labels.append(name)
    sheet(paths, os.path.join(OUT, "TAVOLA_braccia_gesti.png"), 4, labels)
    S.render_setup((540, 900), 24)

# ------------------------------------------------------------------ 4) presa del telefono
if "phone" in SECTIONS:
    S.render_setup((540, 900), 32)
    sw, shh = phone["screen_size"]
    paths, labels = [], []
    for mode, P, cams in (("read", PO.read_phone(pro, "R"), [("dall'alto, di lato", (-0.95, -0.35, 1.72), (-0.12, -0.42, 1.0), 40),
                                                               ("lato", (-1.6, -1.1, 1.15), (-0.1, -0.4, 1.05), 45)]),
                          ("show", PO.show_phone(pro, "R"), [("fronte", (-0.3, -2.1, 1.2), (-0.25, -0.5, 1.12), 50),
                                                              ("dettaglio", (-0.36, -1.2, 1.18), (-0.3, -0.6, 1.16), 60)])):
        P["fingers.R"] = (0, 0, 0, 0)
        QCR[f"gomito_telefono_{mode}"] = PO.solve_elbow(pro, P, "R")
        sock = PO.phone_socket(pro, mode)
        PO.place_prop(pro, phone, "R", sock)
        grip = PO.solve_grip(pro, phone, "R", screen=(sw, shh, S.PHONE_T))
        P["fingers.R"] = PO.grip_pose(grip)
        pro.pose(P)
        PO.place_prop(pro, phone, "R", sock)
        r = dict(grip_curl_gradi=grip)
        r["mano_dentro_telefono"] = QC.penetration(pro.parts["hand.R"], phone)
        r["telefono_dentro_mano"] = QC.penetration(phone, pro.parts["hand.R"])
        r["distanza_palmo_telefono_mm"] = QC.nearest_gap(pro.parts["hand.R"], phone, lambda g: g == "hand.R")
        r["vertici_mano_davanti_allo_schermo"] = QC.screen_cover(pro.parts["hand.R"], phone, sw, shh, S.PHONE_T)
        r.update({k: v for k, v in body_qc(pro, f"phone_{mode}").items() if k.endswith(".R_in_torso") or k.endswith("_in_head")})
        QCR[f"telefono_{mode}"] = r
        face(pro, "neutro" if mode == "read" else "imbarazzato", gaze=(0.1, -0.7) if mode == "read" else (0.5, 0.0))
        for vname, loc, tgt, lens in cams:
            S.aim(cam, loc, tgt)
            cam.data.lens = lens
            p = os.path.join(OUT, f"phone_{mode}_{vname.replace(' ', '_')}.png")
            timed_render(p, "phone")
            paths.append(p)
            labels.append(("Legge" if mode == "read" else "Mostra") + " · " + vname)
    cam.data.lens = 50
    sheet(paths, os.path.join(OUT, "TAVOLA_presa_telefono.png"), 4, labels)

bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT, "cs_phase2_prove.blend"))
json.dump(dict(qc=QCR, tempi_render_s=TIMES), open(os.path.join(OUT, f"qc_phase2_{'_'.join(SECTIONS)}.json"), "w"), indent=1, ensure_ascii=False)
print("ok", OUT)
