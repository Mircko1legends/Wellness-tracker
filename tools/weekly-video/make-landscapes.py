"""Original Nordic landscapes (fjords, snowy peaks, longships, aurora, the golden fields of «Vinland»)
used as scrolling backgrounds when you don't provide your own images. Pure PIL, deterministic.

    python3 make-landscapes.py [out_dir] [count]
"""
import math
import os
import random
import sys

from PIL import Image, ImageDraw, ImageFilter

W, H = 2400, 1600

PALETTES = [
    # sky top, sky horizon, sun, mountains far->near, water
    ("alba sul fiordo", (26, 38, 70), (242, 160, 110), (255, 214, 150), [(96, 92, 128), (66, 66, 98), (40, 44, 70), (22, 26, 42)], (58, 70, 104)),
    ("mezzogiorno d'inverno", (92, 140, 196), (214, 228, 238), (255, 250, 230), [(170, 188, 208), (120, 142, 168), (78, 98, 122), (46, 60, 78)], (70, 104, 140)),
    ("tramonto dorato di Vinland", (54, 44, 88), (250, 176, 88), (255, 226, 140), [(150, 110, 110), (110, 80, 86), (70, 56, 64), (40, 34, 40)], (120, 96, 110)),
    ("notte con aurora", (6, 10, 26), (18, 40, 64), (230, 236, 250), [(34, 48, 72), (24, 34, 54), (16, 22, 38), (8, 12, 22)], (14, 24, 42)),
    ("nebbia del nord", (120, 132, 140), (200, 204, 200), (240, 238, 228), [(160, 166, 168), (128, 136, 140), (96, 104, 110), (62, 70, 76)], (110, 120, 126)),
    ("campi di Vinland", (90, 150, 210), (236, 222, 180), (255, 246, 210), [(150, 170, 150), (110, 140, 96), (80, 112, 60), (52, 80, 36)], None),
]


def lerp(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


def ridge(rng, base, amp, rough, width=W):
    """Mountain profile by midpoint displacement."""
    n = 257
    ys = [0.0] * n
    ys[0], ys[-1] = rng.uniform(-1, 1), rng.uniform(-1, 1)
    step, scale = n - 1, 1.0
    while step > 1:
        half = step // 2
        for i in range(half, n - 1, step):
            ys[i] = (ys[i - half] + ys[i + half]) / 2 + rng.uniform(-scale, scale)
        step, scale = half, scale * rough
    return [(int(i * width / (n - 1)), int(base - amp * y)) for i, y in enumerate(ys)]


def longship(draw, x, y, s, color):
    draw.polygon([(x - 90 * s, y), (x + 90 * s, y), (x + 70 * s, y + 18 * s), (x - 70 * s, y + 18 * s)], fill=color)
    draw.line([(x - 90 * s, y), (x - 110 * s, y - 30 * s)], fill=color, width=max(2, int(6 * s)))
    draw.line([(x + 90 * s, y), (x + 110 * s, y - 30 * s)], fill=color, width=max(2, int(6 * s)))
    draw.line([(x, y), (x, y - 110 * s)], fill=color, width=max(2, int(5 * s)))
    draw.polygon([(x - 45 * s, y - 100 * s), (x + 45 * s, y - 100 * s), (x + 40 * s, y - 35 * s), (x - 40 * s, y - 35 * s)], fill=color)


def landscape(seed, palette):
    rng = random.Random(seed)
    name, sky_top, sky_hor, sun_c, mountains, water = palette
    img = Image.new("RGB", (W, H))
    d = ImageDraw.Draw(img)
    horizon = int(H * (0.62 if water else 0.7))
    for y in range(horizon):
        d.line([(0, y), (W, y)], fill=lerp(sky_top, sky_hor, (y / horizon) ** 1.4))
    if "aurora" in name:
        for i in range(260):
            stars = rng.randint(0, W), rng.randint(0, horizon - 200)
            d.point(stars, fill=(230, 236, 255))
        aur = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        ad = ImageDraw.Draw(aur)
        for band in range(3):
            base = 250 + band * 90
            for x in range(0, W, 3):
                yy = base + 70 * math.sin(x / 260 + band) + 40 * math.sin(x / 90 + band * 2)
                ad.line([(x, yy), (x, yy + 220)], fill=(80, 255, 170, 26 - band * 6), width=3)
        img = Image.alpha_composite(img.convert("RGBA"), aur.filter(ImageFilter.GaussianBlur(12))).convert("RGB")
        d = ImageDraw.Draw(img)
    sx, sy = rng.randint(int(W * 0.2), int(W * 0.8)), int(horizon * rng.uniform(0.35, 0.7))
    glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    for r in range(260, 0, -8):
        gd.ellipse([sx - r, sy - r, sx + r, sy + r], fill=sun_c + (int(5 + 60 * (1 - r / 260) ** 2),))
    img = Image.alpha_composite(img.convert("RGBA"), glow.filter(ImageFilter.GaussianBlur(20))).convert("RGB")
    d = ImageDraw.Draw(img)
    d.ellipse([sx - 60, sy - 60, sx + 60, sy + 60], fill=sun_c)
    for i, color in enumerate(mountains):
        base = horizon - 260 + i * 95
        pts = ridge(rng, base, 230 - i * 40, 0.55 + i * 0.03)
        d.polygon(pts + [(W, H), (0, H)], fill=color)
        if i == 0 and "Vinland" not in name:
            for (x, y) in pts[::6]:
                if y < base - 120:
                    d.polygon([(x - 26, y + 34), (x, y), (x + 26, y + 34)], fill=lerp(color, (245, 248, 255), 0.75))
    if water:
        for y in range(horizon, H):
            t = (y - horizon) / (H - horizon)
            d.line([(0, y), (W, y)], fill=lerp(water, sky_hor, 0.35 * (1 - t)))
        for k in range(160):
            y = rng.randint(horizon + 5, H - 5)
            x = rng.randint(0, W)
            d.line([(x, y), (x + rng.randint(40, 180), y)], fill=lerp(water, sun_c, 0.35), width=2)
        d.line([(0, horizon), (W, horizon)], fill=lerp(water, sun_c, 0.5), width=2)
        longship(d, rng.randint(int(W * 0.25), int(W * 0.75)), horizon + 60, rng.uniform(0.8, 1.3), mountains[-1])
    else:
        for y in range(horizon, H):
            t = (y - horizon) / (H - horizon)
            d.line([(0, y), (W, y)], fill=lerp((214, 186, 96), (150, 120, 50), t))
        for k in range(2600):
            x = rng.randint(0, W)
            y = rng.randint(horizon, H)
            h = 10 + (y - horizon) * 0.08
            d.line([(x, y), (x + rng.randint(-4, 4), y - h)], fill=lerp((236, 206, 120), (120, 96, 40), rng.random()), width=2)
    return img.filter(ImageFilter.GaussianBlur(1.2)), name


if __name__ == "__main__":
    out = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(__file__), "generated")
    count = int(sys.argv[2]) if len(sys.argv) > 2 else 12
    os.makedirs(out, exist_ok=True)
    for i in range(count):
        img, name = landscape(1000 + i, PALETTES[i % len(PALETTES)])
        path = os.path.join(out, f"{i:02d}.jpg")
        img.save(path, quality=90)
        print(path, name)
