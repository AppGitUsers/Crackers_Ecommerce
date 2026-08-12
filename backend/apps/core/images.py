import io

from django.core.files.base import ContentFile
from PIL import Image, ImageOps, UnidentifiedImageError


def compress_image(file, *, max_dimension=1200, quality=82):
    """
    Downscale (if needed) and re-encode an uploaded image before it's stored.

    Admin uploads come straight from a phone camera or gallery with no size
    limit otherwise (multi-MB photos for something only ever displayed at a
    few hundred px). Converts to JPEG unless the source has real
    transparency, strips EXIF (also fixes orientation first, since dropping
    the tag afterwards would leave sideways photos), and caps the longest
    edge at max_dimension.

    If Pillow can't read the file (unsupported/corrupt format), the original
    file is returned unchanged — a failed compression should never block the
    upload itself.
    """
    try:
        file.seek(0)
        img = Image.open(file)
        img = ImageOps.exif_transpose(img)

        has_alpha = img.mode in ("RGBA", "LA") or (img.mode == "P" and "transparency" in img.info)
        if has_alpha:
            img = img.convert("RGBA")
            fmt, ext, save_kwargs = "PNG", "png", {"optimize": True}
        else:
            img = img.convert("RGB")
            fmt, ext, save_kwargs = "JPEG", "jpg", {"quality": quality, "optimize": True}

        if max(img.size) > max_dimension:
            img.thumbnail((max_dimension, max_dimension), Image.LANCZOS)

        buffer = io.BytesIO()
        img.save(buffer, format=fmt, **save_kwargs)
        buffer.seek(0)

        base_name = file.name.rsplit(".", 1)[0] if file.name else "image"
        return ContentFile(buffer.read(), name=f"{base_name}.{ext}")
    except (UnidentifiedImageError, OSError):
        file.seek(0)
        return file
