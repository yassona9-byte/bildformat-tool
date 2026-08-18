"""Generates assets/og-image.png (1200x630) for the social share card."""
from PIL import Image, ImageDraw, ImageFilter

W, H = 1200, 630
img = Image.new("RGB", (W, H), (19, 19, 22))
d = ImageDraw.Draw(img)

# soft accent glow
glow = Image.new("RGB", (W, H), (19, 19, 22))
gd = ImageDraw.Draw(glow)
gd.ellipse([700, -200, 1400, 400], fill=(52, 48, 120))
gd.ellipse([-300, 400, 400, 900], fill=(40, 36, 90))
glow = glow.filter(ImageFilter.GaussianBlur(120))
img = Image.blend(img, glow, 0.55)
d = ImageDraw.Draw(img)

ACCENT = (129, 140, 248)
INK = (236, 236, 239)
SOFT = (166, 166, 173)

# stylized format frames (the logo motif)
def rrect(xy, r, **kw):
    d.rounded_rectangle(xy, radius=r, **kw)

bx, by = 880, 170
rrect([bx, by + 60, bx + 180, by + 240], 18, outline=ACCENT, width=8)
rrect([bx + 90, by, bx + 260, by + 110], 18, fill=(129, 140, 248, 90))
overlay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
od = ImageDraw.Draw(overlay)
od.rounded_rectangle([bx + 90, by, bx + 260, by + 110], 18, fill=ACCENT + (80,))
od.rounded_rectangle([bx + 130, by + 140, bx + 240, by + 300], 18, fill=ACCENT + (255,))
img = Image.alpha_composite(img.convert("RGBA"), overlay).convert("RGB")
d = ImageDraw.Draw(img)

from PIL import ImageFont
def font(sz, bold=True):
    for p in ["/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"]:
        try:
            return ImageFont.truetype(p, sz)
        except OSError:
            pass
    return ImageFont.load_default()

d.text((80, 120), "Bildformat", font=font(44), fill=ACCENT)
d.text((80, 210), "Bilder für Social Media", font=font(72), fill=INK)
d.text((80, 300), "zuschneiden & anpassen", font=font(72), fill=INK)
d.text((80, 420), "Instagram · YouTube · TikTok · LinkedIn & Co.", font=font(34, False), fill=SOFT)
d.text((80, 480), "100 % im Browser — ohne Upload, kostenlos", font=font(34, False), fill=SOFT)

img.save("assets/og-image.png", optimize=True)
print("og-image.png written")
