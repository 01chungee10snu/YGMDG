#!/usr/bin/env python3
"""Generate bright eco-process steel game assets locally with Pillow.

This intentionally does not reuse prior generated icon pixels. It creates a new
vector-style background, 12 component icons, 12 orb icons, and the 4x3 sprite
sheet required by the runtime.
"""
from __future__ import annotations

import json
import math
from datetime import datetime, timezone, timedelta
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parents[1]
GEN = ROOT / "assets" / "generated"
COMP = GEN / "components"
ORB = GEN / "components-orb"
KST = timezone(timedelta(hours=9))

COMPONENTS = [
    ("01-iron-ore", "iron ore raw material", (142, 82, 54), (231, 119, 73)),
    ("02-coal", "coking coal raw material", (36, 40, 48), (95, 104, 118)),
    ("03-coke", "porous coke fuel", (52, 48, 45), (128, 116, 101)),
    ("04-blast-furnace", "blast furnace ironmaking", (78, 114, 132), (255, 139, 63)),
    ("05-pig-iron-ladle", "hot metal ladle", (82, 95, 111), (255, 177, 70)),
    ("06-steelmaking-converter", "basic oxygen furnace", (74, 88, 106), (105, 206, 242)),
    ("07-casting-slab", "continuous casting slab", (112, 132, 148), (255, 210, 105)),
    ("08-hot-rolled-coil", "hot rolled coil", (89, 112, 128), (255, 156, 76)),
    ("09-cold-rolled-auto-sheet", "cold rolled galvanized auto sheet", (136, 158, 176), (82, 202, 255)),
    ("10-heavy-plate", "heavy plate", (107, 126, 139), (113, 198, 118)),
    ("11-long-special-products", "H-beam rebar rail long products", (101, 118, 134), (171, 127, 255)),
    ("12-yonggang-final", "low carbon Yonggang final steel", (66, 154, 120), (134, 232, 126)),
]


def ensure_dirs() -> None:
    COMP.mkdir(parents=True, exist_ok=True)
    ORB.mkdir(parents=True, exist_ok=True)


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    candidates = [
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf" if bold else "/System/Library/Fonts/Supplemental/Arial.ttf",
        "/System/Library/Fonts/Helvetica.ttc",
        "/Library/Fonts/Arial Unicode.ttf",
    ]
    for c in candidates:
        try:
            return ImageFont.truetype(c, size=size)
        except Exception:
            pass
    return ImageFont.load_default()


def gradient(size, top, bottom):
    w, h = size
    im = Image.new("RGB", size)
    px = im.load()
    for y in range(h):
        t = y / max(h - 1, 1)
        col = tuple(int(top[i] * (1 - t) + bottom[i] * t) for i in range(3))
        for x in range(w):
            px[x, y] = col
    return im


def rounded_rect(draw, xy, r, fill, outline=None, width=1):
    draw.rounded_rectangle(xy, radius=r, fill=fill, outline=outline, width=width)


def shadow_layer(size, xy, r, blur=22, alpha=80):
    im = Image.new("RGBA", size, (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.rounded_rectangle(xy, radius=r, fill=(28, 56, 70, alpha))
    return im.filter(ImageFilter.GaussianBlur(blur))


def draw_background() -> Image.Image:
    W, H = 576, 1024
    im = gradient((W, H), (187, 232, 255), (227, 255, 213)).convert("RGBA")
    d = ImageDraw.Draw(im)

    # Sun and clouds
    d.ellipse((410, 58, 528, 176), fill=(255, 236, 132, 210))
    for cx, cy, s in [(92, 130, 42), (138, 112, 58), (194, 134, 44), (420, 238, 34), (462, 224, 48), (508, 244, 36)]:
        d.ellipse((cx - s, cy - s // 2, cx + s, cy + s // 2), fill=(255, 255, 255, 188))

    # Distant hills
    d.polygon([(0, 372), (98, 290), (206, 360), (328, 272), (458, 354), (576, 306), (576, 1024), (0, 1024)], fill=(161, 219, 158, 255))
    d.polygon([(0, 432), (126, 338), (248, 414), (390, 322), (576, 426), (576, 1024), (0, 1024)], fill=(116, 201, 153, 255))

    # Wind turbines
    for x, y, scale in [(78, 330, 0.72), (500, 350, 0.58)]:
        d.line((x, y, x, y - int(115 * scale)), fill=(245, 255, 255, 230), width=max(3, int(6 * scale)))
        hub = (x, y - int(115 * scale))
        d.ellipse((hub[0]-7, hub[1]-7, hub[0]+7, hub[1]+7), fill=(246, 255, 255, 255))
        for a in [0, 120, 240]:
            rad = math.radians(a - 20)
            end = (hub[0] + math.cos(rad) * 46 * scale, hub[1] + math.sin(rad) * 46 * scale)
            d.line((hub, end), fill=(246, 255, 255, 245), width=max(2, int(5 * scale)))

    # Solar panels
    for i in range(4):
        x = 70 + i * 98
        poly = [(x, 565), (x+78, 548), (x+100, 584), (x+18, 602)]
        d.polygon(poly, fill=(32, 91, 139, 255), outline=(190, 240, 255, 255))
        for k in range(1, 3):
            d.line((x+30*k, 558-6*k, x+18+30*k, 595-6*k), fill=(105, 181, 222, 180), width=2)

    # Clean steel mill buildings
    d.rectangle((44, 444, 212, 614), fill=(214, 231, 236, 255), outline=(131, 172, 184, 255), width=3)
    d.rectangle((226, 414, 398, 614), fill=(226, 238, 240, 255), outline=(131, 172, 184, 255), width=3)
    d.rectangle((410, 470, 540, 614), fill=(208, 229, 230, 255), outline=(131, 172, 184, 255), width=3)
    for x in range(64, 188, 34):
        d.rounded_rectangle((x, 470, x+20, 500), 5, fill=(126, 218, 238, 255))
    for x in range(246, 372, 38):
        d.rounded_rectangle((x, 444, x+23, 482), 5, fill=(119, 210, 233, 255))
    d.polygon([(220, 414), (312, 352), (404, 414)], fill=(194, 219, 224, 255), outline=(131, 172, 184, 255))
    d.rectangle((468, 340, 494, 470), fill=(191, 217, 222, 255), outline=(131, 172, 184, 255), width=3)
    d.rounded_rectangle((456, 326, 506, 350), 12, fill=(163, 203, 209, 255))

    # Hydrogen / low-carbon pipeline
    d.line((38, 660, 540, 660), fill=(65, 204, 163, 255), width=18)
    d.line((38, 660, 540, 660), fill=(207, 255, 236, 255), width=6)
    for x in [120, 226, 332, 438]:
        d.ellipse((x-16, 644, x+16, 676), fill=(57, 184, 143, 255), outline=(222,255,241,255), width=3)

    # Calm play/UI field
    d.rounded_rectangle((36, 710, 540, 980), 34, fill=(248, 255, 241, 210), outline=(142, 220, 164, 160), width=3)
    for x in range(58, 520, 48):
        d.line((x, 720, x-28, 976), fill=(207, 241, 204, 95), width=2)
    d.rectangle((0, 936, W, H), fill=(112, 203, 132, 255))
    d.rectangle((0, 972, W, H), fill=(88, 183, 115, 255))

    return im.convert("RGB")


def draw_face(d, cx, cy, scale=1.0, mood="smile"):
    eye = int(20 * scale)
    d.ellipse((cx-int(58*scale)-eye, cy-eye, cx-int(58*scale)+eye, cy+eye), fill=(31, 41, 51, 255))
    d.ellipse((cx+int(58*scale)-eye, cy-eye, cx+int(58*scale)+eye, cy+eye), fill=(31, 41, 51, 255))
    d.ellipse((cx-int(66*scale), cy-int(8*scale), cx-int(54*scale), cy+int(4*scale)), fill=(255,255,255,230))
    d.ellipse((cx+int(50*scale), cy-int(8*scale), cx+int(62*scale), cy+int(4*scale)), fill=(255,255,255,230))
    d.ellipse((cx-int(102*scale), cy+int(34*scale), cx-int(58*scale), cy+int(68*scale)), fill=(255, 150, 160, 150))
    d.ellipse((cx+int(58*scale), cy+int(34*scale), cx+int(102*scale), cy+int(68*scale)), fill=(255, 150, 160, 150))
    if mood == "open":
        d.ellipse((cx-int(27*scale), cy+int(38*scale), cx+int(27*scale), cy+int(88*scale)), fill=(64, 41, 50, 255))
        d.arc((cx-int(22*scale), cy+int(48*scale), cx+int(22*scale), cy+int(96*scale)), 15, 165, fill=(255, 124, 138, 255), width=int(7*scale))
    else:
        d.arc((cx-int(46*scale), cy+int(30*scale), cx+int(46*scale), cy+int(92*scale)), 10, 170, fill=(64, 41, 50, 255), width=int(9*scale))


def icon_base(accent):
    im = Image.new("RGBA", (1024, 1024), (0,0,0,0))
    d = ImageDraw.Draw(im)
    for r, a in [(470, 36), (430, 52), (390, 68)]:
        d.ellipse((512-r, 512-r, 512+r, 512+r), fill=(46, 111, 126, a))
    d.ellipse((92, 92, 932, 932), fill=(246, 255, 248, 255), outline=(110, 206, 160, 255), width=18)
    d.ellipse((142, 126, 884, 868), fill=(232, 251, 244, 255))
    d.arc((174, 150, 850, 826), 205, 320, fill=(255,255,255,210), width=34)
    d.rounded_rectangle((205, 782, 819, 860), 35, fill=accent+(95,), outline=(255,255,255,180), width=4)
    return im


def draw_rocks(d, seed_color, accent, coke=False):
    centers = [(360,460,108), (508,394,126), (630,520,116), (430,596,118), (574,650,92)]
    for i,(cx,cy,r) in enumerate(centers):
        color = tuple(max(0,min(255, seed_color[j] + (i-2)*18)) for j in range(3)) + (255,)
        pts=[]
        for k in range(9):
            a=math.radians(k*40+17*i)
            rr=r*(0.78+0.24*math.sin(k*1.7+i))
            pts.append((cx+math.cos(a)*rr, cy+math.sin(a)*rr))
        d.polygon(pts, fill=color, outline=(255,255,255,180))
        d.line((cx-r*.36,cy-r*.12,cx+r*.28,cy-r*.32), fill=accent+(180,), width=10)
        if coke:
            for k in range(5):
                px=cx-r/2+(k*29+i*9)%int(r)
                py=cy-r/3+(k*41+i*7)%int(r)
                d.ellipse((px-10,py-8,px+10,py+8), fill=(236,236,220,120))


def draw_icon(name, idx, seed, accent):
    im = icon_base(accent)
    d = ImageDraw.Draw(im)
    cx, cy = 512, 500
    if idx == 0:
        draw_rocks(d, seed, accent)
        draw_face(d, 512, 490, 1.05)
    elif idx == 1:
        draw_rocks(d, seed, (90,110,125), coke=False)
        d.rectangle((290,660,734,708), fill=(94, 116, 129, 255))
        draw_face(d, 512, 482, 1.0)
    elif idx == 2:
        draw_rocks(d, seed, accent, coke=True)
        for x,y in [(392,330),(586,336),(684,594)]:
            d.ellipse((x-18,y-18,x+18,y+18), fill=(255,211,98,170))
        draw_face(d, 512, 494, 1.0)
    elif idx == 3:
        d.rounded_rectangle((360,260,664,708), 70, fill=(115, 137, 148, 255), outline=(76,96,112,255), width=16)
        d.polygon([(360,276),(664,276),(610,198),(414,198)], fill=(156,181,190,255), outline=(76,96,112,255))
        d.rectangle((424,708,600,780), fill=(78,96,112,255))
        d.ellipse((404,392,620,620), fill=(255,135,61,255), outline=(255,225,124,255), width=14)
        d.polygon([(512,360),(552,484),(512,588),(472,484)], fill=(255,230,99,255))
        draw_face(d, 512, 500, .74, "open")
    elif idx == 4:
        d.rounded_rectangle((318,350,706,640), 82, fill=(92, 106, 119, 255), outline=(56,70,84,255), width=16)
        d.rectangle((284,438,318,554), fill=(77,89,102,255))
        d.rectangle((706,438,740,554), fill=(77,89,102,255))
        d.ellipse((366,390,658,650), fill=(255,177,70,255), outline=(255,232,133,255), width=18)
        d.ellipse((420,444,604,604), fill=(255,94,58,255))
        d.line((250,730,774,730), fill=(83, 112, 128, 255), width=22)
        draw_face(d, 512, 512, .82, "open")
    elif idx == 5:
        d.polygon([(362,258),(698,378),(602,696),(294,574)], fill=(110,124,139,255), outline=(62,79,96,255))
        d.ellipse((392,320,632,520), fill=(224,245,250,255), outline=(90,206,241,255), width=14)
        d.line((346,634,676,296), fill=(205,249,255,255), width=18)
        for x,y in [(392,622),(666,344),(550,560)]:
            d.ellipse((x-24,y-24,x+24,y+24), fill=(95,211,244,230))
        draw_face(d, 500, 462, .8)
    elif idx == 6:
        d.rounded_rectangle((302,326,722,586), 36, fill=(154,171,184,255), outline=(96,116,132,255), width=14)
        d.rectangle((340,586,684,664), fill=(255,205,96,255), outline=(188,122,68,255), width=10)
        d.line((236,704,788,704), fill=(93, 114, 130, 255), width=18)
        for x in range(320, 740, 70):
            d.ellipse((x-24,676,x+24,724), fill=(75,92,106,255))
        d.line((292,300,734,300), fill=(102, 132, 146, 255), width=18)
        draw_face(d, 512, 466, .85)
    elif idx == 7:
        d.ellipse((284,268,740,724), fill=(97, 120, 136, 255), outline=(60,78,92,255), width=18)
        for r in [176,130,84,42]:
            d.ellipse((512-r,496-r,512+r,496+r), outline=(222,236,240,255), width=24)
        d.rectangle((262,652,762,740), fill=(255,156,76,255), outline=(169,91,56,255), width=12)
        d.arc((318,324,706,668), 205, 326, fill=(255,224,138,255), width=22)
        draw_face(d, 512, 492, .78)
    elif idx == 8:
        for off, col in [(0,(180,207,224,255)),(58,(210,230,238,255)),(116,(154,199,224,255))]:
            d.rounded_rectangle((294+off,318+off,664+off,486+off), 24, fill=col, outline=(96,132,152,255), width=9)
        d.polygon([(312,642),(706,590),(746,662),(352,714)], fill=(178,213,226,255), outline=(96,132,152,255))
        d.rectangle((392,484,752,610), fill=(91,188,226,255))
        draw_face(d, 522, 446, .78)
    elif idx == 9:
        for y, w in [(350,470),(460,420),(570,500)]:
            d.rounded_rectangle((512-w//2,y,512+w//2,y+76), 18, fill=(130,151,162,255), outline=(85,105,118,255), width=8)
            d.line((512-w//2+24,y+18,512+w//2-24,y+18), fill=(215,233,232,180), width=8)
        d.rectangle((286,666,738,728), fill=(111,198,118,255), outline=(67,130,80,255), width=10)
        draw_face(d, 512, 512, .74)
    elif idx == 10:
        # H-beam, rebar, rail bundle
        d.rectangle((270,324,750,376), fill=(118,135,150,255), outline=(74,89,104,255), width=8)
        d.rectangle((470,324,550,700), fill=(118,135,150,255), outline=(74,89,104,255), width=8)
        d.rectangle((270,648,750,700), fill=(118,135,150,255), outline=(74,89,104,255), width=8)
        for i,x in enumerate([330,382,434,596,648,700]):
            d.line((x,404,x-42,728), fill=(162,126,245,255), width=22)
            d.line((x+5,404,x-37,728), fill=(222,205,255,160), width=5)
        d.arc((278,704,750,790), 180, 360, fill=(96,112,128,255), width=18)
        draw_face(d, 512, 516, .72)
    elif idx == 11:
        # Low-carbon final Yonggang mascot/medal
        d.ellipse((318,242,706,698), fill=(95,190,136,255), outline=(49,139,101,255), width=18)
        d.polygon([(512,212),(596,340),(512,316),(428,340)], fill=(139,233,126,255), outline=(58,150,90,255))
        d.arc((368,384,656,632), 200, 342, fill=(216,255,210,255), width=24)
        d.line((386,686,324,792), fill=(72,164,108,255), width=28)
        d.line((638,686,700,792), fill=(72,164,108,255), width=28)
        d.ellipse((340,744,420,824), fill=(68,151,101,255))
        d.ellipse((604,744,684,824), fill=(68,151,101,255))
        draw_face(d, 512, 474, 1.05)
    # Icon number dot, no text labels
    d.ellipse((168,168,252,252), fill=(255,255,255,230), outline=(104,196,150,255), width=6)
    d.text((210,210), str(idx+1), anchor="mm", fill=(40,114,86,255), font=font(48, True))
    return im


def make_orb(component: Image.Image) -> Image.Image:
    im = component.resize((256,256), Image.Resampling.LANCZOS).convert("RGBA")
    mask = Image.new("L", (256,256), 0)
    d = ImageDraw.Draw(mask)
    d.ellipse((8,8,248,248), fill=255)
    out = Image.new("RGBA", (256,256), (0,0,0,0))
    shadow = Image.new("RGBA", (256,256), (0,0,0,0))
    sd = ImageDraw.Draw(shadow)
    sd.ellipse((16,20,246,250), fill=(0, 45, 50, 60))
    shadow = shadow.filter(ImageFilter.GaussianBlur(6))
    out.alpha_composite(shadow)
    clipped = Image.new("RGBA", (256,256), (0,0,0,0))
    clipped.paste(im, (0,0), mask)
    out.alpha_composite(clipped)
    od = ImageDraw.Draw(out)
    od.ellipse((8,8,248,248), outline=(255,255,255,230), width=8)
    od.arc((28,22,224,214), 205, 305, fill=(255,255,255,145), width=9)
    return out


def make_sprite(orbs):
    sheet = Image.new("RGBA", (1024,768), (0,0,0,0))
    for i, orb in enumerate(orbs):
        x = (i % 4) * 256
        y = (i // 4) * 256
        sheet.alpha_composite(orb, (x,y))
    return sheet


def update_manifest(files):
    manifest = {
        "generatedAt": datetime.now(KST).isoformat(timespec="seconds"),
        "theme": "Bright eco-friendly Yonggang steel value-chain assets: clean low-carbon steel mill background plus 12 process/product icons rendered locally as fresh vector-style Pillow assets.",
        "modelIntent": "Local deterministic Pillow vector rendering because remote GPT/FAL image generation was unavailable in this runtime.",
        "reference": "docs/references/yonggang-character-reference.jpg",
        "prompts": [
            "docs/asset-prompts/01-yonggang-mascot.md",
            "docs/asset-prompts/02-value-chain-sprites-v3.md",
            "docs/asset-prompts/03-factory-background.md"
        ],
        "assets": [],
        "componentSources": [],
        "processBasis": [
            "Blast furnace route: iron ore/coking coal/coke -> blast furnace hot metal -> BOF steelmaking -> continuous casting -> rolling/finishing.",
            "Representative product families considered: hot rolled coil, cold rolled/galvanized automotive sheet, heavy plate, H-beam/rebar/rail long products, special/low-carbon steel.",
            "Visual refresh uses bright daylight, greenery, solar/wind/hydrogen accents, and clean steelmaking cues to avoid dark/polluting background tone."
        ]
    }
    for rel in ["assets/generated/yonggang-mascot.png", "assets/generated/value-chain-sprites.png", "assets/generated/factory-background.png"]:
        p = ROOT / rel
        if p.exists():
            manifest["assets"].append({"file": rel, "sourceUrl": "local-pillow-eco-refresh" if "yonggang-mascot" not in rel else "existing mascot asset", "bytes": p.stat().st_size})
    for name, desc, *_ in COMPONENTS:
        p = COMP / f"{name}.png"
        manifest["componentSources"].append({"file": str(p.relative_to(ROOT)), "sourceUrl": f"local-pillow-eco-refresh: {desc}", "bytes": p.stat().st_size})
    (GEN / "asset-manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")


def main() -> None:
    ensure_dirs()
    bg = draw_background()
    bg.save(GEN / "factory-background.png", optimize=True)

    orbs = []
    for idx, (name, _desc, seed, accent) in enumerate(COMPONENTS):
        im = draw_icon(name, idx, seed, accent)
        comp_path = COMP / f"{name}.png"
        im.save(comp_path, optimize=True)
        orb = make_orb(im)
        orb_path = ORB / f"{name}-orb.png"
        orb.save(orb_path, optimize=True)
        orbs.append(orb)
    make_sprite(orbs).save(GEN / "value-chain-sprites.png", optimize=True)
    update_manifest([])
    print("generated", GEN / "factory-background.png")
    print("generated", GEN / "value-chain-sprites.png")
    print("components", len(COMPONENTS))


if __name__ == "__main__":
    main()
