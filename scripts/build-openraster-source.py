#!/usr/bin/env python3
"""Package an unchanged PNG as an editable OpenRaster painting assembly.

The generated base is still flattened. Separate empty lighting and foreground
paint layers make manual revisions possible without changing that source.
"""
from __future__ import annotations

import argparse
import struct
import zlib
from pathlib import Path
from xml.sax.saxutils import escape
from zipfile import ZipFile, ZipInfo, ZIP_DEFLATED, ZIP_STORED


def chunk(kind: bytes, data: bytes) -> bytes:
    return struct.pack(">I", len(data)) + kind + data + struct.pack(">I", zlib.crc32(kind + data) & 0xFFFFFFFF)


def transparent_png(width: int, height: int) -> bytes:
    rows = (b"\0" + b"\0" * (width * 4)) * height
    return b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0)) + chunk(b"IDAT", zlib.compress(rows, 9)) + chunk(b"IEND", b"")


def entry(name: str, data: bytes, compression: int, output: ZipFile) -> None:
    info = ZipInfo(name, date_time=(2026, 10, 31, 0, 0, 0))
    info.compress_type = compression
    output.writestr(info, data)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("png", type=Path)
    parser.add_argument("ora", type=Path)
    args = parser.parse_args()
    plate = args.png.read_bytes()
    if plate[:8] != b"\x89PNG\r\n\x1a\n" or plate[12:16] != b"IHDR":
        raise ValueError("Expected a PNG with IHDR first")
    width, height = struct.unpack(">II", plate[16:24])
    blank = transparent_png(width, height)
    xml = f'''<?xml version="1.0" encoding="UTF-8"?>
<image version="0.0.3" w="{width}" h="{height}" name="{escape(args.png.stem)}">
  <stack>
    <layer name="Foreground occlusion paint-over (empty)" src="data/occlusion.png" opacity="1.0" visibility="visible" composite-op="svg:src-over" x="0" y="0"/>
    <layer name="Lighting paint-over (empty)" src="data/lighting.png" opacity="1.0" visibility="visible" composite-op="svg:src-over" x="0" y="0"/>
    <layer name="Generated original raster (editable pixels)" src="data/base.png" opacity="1.0" visibility="visible" composite-op="svg:src-over" x="0" y="0"/>
  </stack>
</image>
'''.encode()
    args.ora.parent.mkdir(parents=True, exist_ok=True)
    with ZipFile(args.ora, "w") as output:
        entry("mimetype", b"image/openraster", ZIP_STORED, output)
        entry("stack.xml", xml, ZIP_DEFLATED, output)
        entry("data/base.png", plate, ZIP_STORED, output)
        entry("data/lighting.png", blank, ZIP_DEFLATED, output)
        entry("data/occlusion.png", blank, ZIP_DEFLATED, output)
        entry("mergedimage.png", plate, ZIP_STORED, output)


if __name__ == "__main__":
    main()
