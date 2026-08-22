from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageEnhance, ImageOps


source = Path(r"C:\Users\rcora\OneDrive\Documentos\Era\MKT\André -Eugenia\IMG_1374.JPG")
output = Path(r"C:\Telemarketing\crm-angariacao\IMG_1374_retouch_original_preserved.jpg")

image = Image.open(source).convert("RGB")
array = np.asarray(image).astype(np.float32)
height, width = array.shape[:2]

# Only the display materials are selected. The exclusion polygons protect every
# visible foreground subject/object, including faces, chairs, table and plant.
poster_rectangles = [
    (0, 2200, 310, 3270),
    (1040, 2020, 1680, 3180),
    (2380, 2200, 2920, 3190),
    (3070, 2210, 3490, 3200),
    (3970, 2180, 4550, 3180),
    (5040, 2150, 5712, 3230),
]

mask_image = Image.new("L", (width, height), 0)
mask_draw = ImageDraw.Draw(mask_image)
for x0, y0, x1, y1 in poster_rectangles:
    mask_draw.rectangle((x0, y0, min(x1, width - 1), min(y1, height - 1)), fill=255)

# Preserve the photographed foreground exactly: people, chairs, table, plant,
# pot, and the lower window structure are never touched by the removal pass.
protected = Image.new("L", (width, height), 0)
protected_draw = ImageDraw.Draw(protected)
protected_polygons = [
    # man + chair
    [(820, 2800), (1720, 2800), (2050, 4283), (700, 4283)],
    # woman + chair
    [(2920, 2780), (4140, 2780), (4380, 4283), (2860, 4283)],
    # table and its contents
    [(2080, 3260), (3510, 3260), (3600, 4283), (1980, 4283)],
    # plant and pot
    [(4100, 2500), (5712, 2500), (5712, 4283), (4050, 4283)],
]
for polygon in protected_polygons:
    protected_draw.polygon(polygon, fill=255)

mask = (np.asarray(mask_image) > 0) & (np.asarray(protected) == 0)

# Replace each selected display area by a horizontal continuation of the
# surrounding glass/reflections. This is deterministic pixel editing and never
# synthesizes or modifies any unmasked face/object pixels.
for x0, y0, x1, y1 in poster_rectangles:
    x0 = max(1, x0)
    x1 = min(width - 3, x1)
    y0 = max(0, y0)
    y1 = min(height, y1)
    rows = np.where(mask[y0:y1, x0:x1])[0]
    if len(rows) == 0:
        continue
    for local_y in np.unique(rows):
        y = y0 + int(local_y)
        row_mask = mask[y, x0:x1]
        if not row_mask.any():
            continue
        left = array[y, x0 - 3]
        right = array[y, x1 + 2]
        span = max(1, x1 - x0 - 1)
        x_positions = np.arange(x0, x1, dtype=np.float32)
        t = ((x_positions - x0) / span)[:, None]
        continuation = left[None, :] * (1.0 - t) + right[None, :] * t
        row_indices = np.where(row_mask)[0]
        array[y, x0:x1][row_indices] = continuation[row_indices]

edited = Image.fromarray(np.clip(array, 0, 255).astype(np.uint8), "RGB")
edited = ImageEnhance.Brightness(edited).enhance(1.045)
edited = ImageEnhance.Contrast(edited).enhance(1.025)

# Crop away the excessive ceiling and empty foreground while retaining both
# full seated figures, the table, plant and real architectural context.
edited = edited.crop((180, 650, 5530, 4284))
edited.save(output, quality=97, subsampling=0, optimize=True)
print(output)
