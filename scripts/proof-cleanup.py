#!/usr/bin/env python3
"""
Downscale proof screenshots and strip EXIF so they load faster and avoid leaking location data.

Usage: python3 scripts/proof-cleanup.py path/to/proof.jpg [...]
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

from PIL import Image, ImageOps


def clean_image(path: Path, max_width: int, max_height: int, quality: int) -> None:
    """Resize the image to fit within max dims and rewrite it as a JPEG without EXIF."""
    if not path.exists():
        print(f"skip: {path} does not exist", file=sys.stderr)
        return

    with Image.open(path) as image:
        image = ImageOps.exif_transpose(image)
        image.thumbnail((max_width, max_height), Image.LANCZOS)
        image = image.convert("RGB")
        image.save(path, format="JPEG", quality=quality, optimize=True)
        print(f"cleaned: {path} ({image.width}x{image.height})")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Resize proofs and remove metadata.")
    parser.add_argument(
        "--max-width",
        type=int,
        default=1920,
        help="Maximum width (pixels) after resizing (default: 1920).",
    )
    parser.add_argument(
        "--max-height",
        type=int,
        default=1080,
        help="Maximum height (pixels) after resizing (default: 1080).",
    )
    parser.add_argument(
        "--quality",
        type=int,
        default=85,
        help="JPEG quality for the rewritten file (default: 85).",
    )
    parser.add_argument(
        "images",
        nargs="+",
        type=Path,
        help="Paths to the proof images to clean.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()

    for image_path in args.images:
        clean_image(image_path, args.max_width, args.max_height, args.quality)


if __name__ == "__main__":
    main()
