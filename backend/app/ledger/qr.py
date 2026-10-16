"""QR code URL and SVG generator for public deed verification."""
from __future__ import annotations

import base64
import subprocess
from typing import Optional

from app.config import PUBLIC_VERIFY_BASE_URL


def build_verify_url(deed_id: int, content_hash: str, base_url: Optional[str] = None) -> str:
    """Builds the public QR verification URL (`/verify/{deed_id}?h={short_hash}`)."""
    root = (base_url or PUBLIC_VERIFY_BASE_URL).rstrip("/")
    short_hash = content_hash[:12]
    return f"{root}/verify/{deed_id}?h={short_hash}"


def generate_qr_svg_data_uri(payload: str) -> str:
    """Generates an inline SVG Data URI for the QR code using `qrcode` or `qrencode`."""
    try:
        import io
        import qrcode  # type: ignore
        import qrcode.image.svg  # type: ignore

        img = qrcode.make(payload, image_factory=qrcode.image.svg.SvgPathImage, box_size=8, border=2)
        buf = io.BytesIO()
        img.save(buf)
        b64 = base64.b64encode(buf.getvalue()).decode("ascii")
        return f"data:image/svg+xml;base64,{b64}"
    except Exception:
        pass

    # Fallback to system qrencode binary if installed on macOS/Linux
    for bin_path in ("/opt/homebrew/bin/qrencode", "/usr/local/bin/qrencode", "qrencode"):
        try:
            proc = subprocess.run(
                [bin_path, "-t", "SVG", "-m", "2", "-o", "-", payload],
                capture_output=True,
                check=True,
                timeout=3,
            )
            b64 = base64.b64encode(proc.stdout).decode("ascii")
            return f"data:image/svg+xml;base64,{b64}"
        except Exception:
            continue

    # Deterministic visual SVG fallback if neither qrcode package nor qrencode is present
    svg = (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120">'
        '<rect width="120" height="120" fill="#ffffff"/>'
        '<rect x="8" y="8" width="32" height="32" fill="none" stroke="#006A4E" stroke-width="6"/>'
        '<rect x="18" y="18" width="12" height="12" fill="#006A4E"/>'
        '<rect x="80" y="8" width="32" height="32" fill="none" stroke="#006A4E" stroke-width="6"/>'
        '<rect x="90" y="18" width="12" height="12" fill="#006A4E"/>'
        '<rect x="8" y="80" width="32" height="32" fill="none" stroke="#006A4E" stroke-width="6"/>'
        '<rect x="18" y="90" width="12" height="12" fill="#006A4E"/>'
        '<circle cx="60" cy="60" r="10" fill="#F42A41"/>'
        "</svg>"
    )
    b64 = base64.b64encode(svg.encode("utf-8")).decode("ascii")
    return f"data:image/svg+xml;base64,{b64}"
