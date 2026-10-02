"""Generate transparent Ageru mark + favicon/PWA icons from public/ageru-boosting-logo.png."""
from __future__ import annotations

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
LOGO = ROOT / "public" / "ageru-boosting-logo.png"
MARK_OUT = ROOT / "public" / "ageru-mark-transparent.png"
ICONS_DIR = ROOT / "public" / "icons"
APP_DIR = ROOT / "app"


def remove_white_background(im: Image.Image, threshold: int = 245) -> Image.Image:
    im = im.convert("RGBA")
    px = im.load()
    w, h = im.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if r >= threshold and g >= threshold and b >= threshold:
                px[x, y] = (r, g, b, 0)
    return im


def extract_mark(im: Image.Image) -> Image.Image:
    w, h = im.size
    mark = im.crop((0, 0, w, int(h * 0.68)))
    alpha = mark.split()[3]
    bbox = alpha.getbbox()
    if not bbox:
        raise RuntimeError("No visible pixels after background removal")
    mark = mark.crop(bbox)
    mw, mh = mark.size
    side = max(mw, mh)
    square = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    square.paste(mark, ((side - mw) // 2, (side - mh) // 2))
    return square


def resize_mark(mark: Image.Image, size: int, padding_ratio: float = 0.08) -> Image.Image:
    pad = int(size * padding_ratio)
    inner = size - 2 * pad
    scaled = mark.resize((inner, inner), Image.Resampling.LANCZOS)
    out = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    out.paste(scaled, (pad, pad), scaled)
    return out


def write_ico(path: Path, mark: Image.Image, sizes: tuple[int, ...] = (16, 32, 48)) -> None:
    imgs = [resize_mark(mark, s, padding_ratio=0.06) for s in sizes]
    imgs[0].save(
        path,
        format="ICO",
        sizes=[(s, s) for s in sizes],
        append_images=imgs[1:],
    )


if __name__ == "__main__":
    if not LOGO.is_file():
        raise SystemExit(f"Missing {LOGO}")

    raw = Image.open(LOGO)
    transparent = remove_white_background(raw)
    mark_master = extract_mark(transparent)
    mark_master.save(MARK_OUT)

    ICONS_DIR.mkdir(parents=True, exist_ok=True)
    for size, name in [(192, "icon-192.png"), (512, "icon-512.png")]:
        resize_mark(mark_master, size).save(ICONS_DIR / name)

    resize_mark(mark_master, 180).save(APP_DIR / "apple-icon.png")
    resize_mark(mark_master, 32).save(APP_DIR / "icon.png")
    write_ico(APP_DIR / "favicon.ico", mark_master)

    # Full logo with transparent background (optional asset for login etc.)
    full = remove_white_background(raw)
    full.save(ROOT / "public" / "ageru-logo-transparent.png")

    print("Wrote:", MARK_OUT, ICONS_DIR, APP_DIR / "favicon.ico")
