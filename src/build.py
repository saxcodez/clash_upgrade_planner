"""Build index.html from the template.

Usage:
    python src/build.py                 # uses src/demo-account.json
    python src/build.py my-export.json  # bakes your own export in as default (keep that file private)
"""
import json, sys, pathlib

VERSION = "1.3.0"
here = pathlib.Path(__file__).parent
acc = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else here / "demo-account.json"
analyze = (here / "analyze.js").read_text(encoding="utf-8").replace(
    "if (typeof module !== 'undefined') module.exports = analyze;", "")
html = (here / "template.html").read_text(encoding="utf-8")
html = (html.replace("__GAMEDATA__", (here / "gamedata.json").read_text(encoding="utf-8"))
            .replace("__ACCOUNT__", json.dumps(json.loads(acc.read_text(encoding="utf-8")), separators=(",", ":")))
            .replace("__ANALYZE__", analyze)
            .replace("__VERSION__", VERSION))
(here.parent / "index.html").write_text(html, encoding="utf-8")
print(f"index.html v{VERSION} written")
