#!/usr/bin/env python3
"""Check that relative hrefs on all site pages resolve.

Covers plain file links, #anchor fragments (id must exist in the target
page), and read.html?doc=... reader links (the markdown file must exist).
Run from anywhere: paths are resolved relative to this script's repo.
"""
import re
import sys
from pathlib import Path

SITE = Path(__file__).resolve().parent.parent
pages = list(SITE.glob("*.html")) + [SITE / "public-knowledge" / "index.html"]

errors = []
for page in pages:
    html = page.read_text(encoding="utf-8")
    base = page.parent
    for href in re.findall(r'href="([^"]+)"', html):
        if href.startswith(("http", "mailto:", "data:")):
            continue
        path_part, _, frag = href.partition("#")
        query = ""
        if "?" in path_part:
            path_part, _, query = path_part.partition("?")
        target = base / path_part if path_part else page
        if path_part:
            if path_part.endswith("/"):
                target = target / "index.html"
            if not target.exists():
                errors.append(f"{page.relative_to(SITE)}: missing file -> {href}")
                continue
        if query.startswith("doc="):
            doc = (base / path_part).parent / query[4:]
            if not doc.exists():
                errors.append(f"{page.relative_to(SITE)}: missing doc -> {href}")
        if frag and target.suffix == ".html" and target.exists():
            if f'id="{frag}"' not in target.read_text(encoding="utf-8"):
                errors.append(f"{page.relative_to(SITE)}: missing anchor -> {href}")

print("\n".join(errors) if errors else f"All links OK ({len(pages)} pages checked)")
sys.exit(1 if errors else 0)
