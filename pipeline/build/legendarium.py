"""legendarium.json – the Middle-earth layer: realms, lands, places, wonders, sites, rivers, labels, vocabulary.

It reads only built files in web/data and the hand-written tables in pipeline/lore, so it runs with no downloads:

    uv run python -m pipeline build legendarium

It never changes an upstream file, and every key in its output is one of usaciv's real ids (state FIPS, metro
CBSA code, wonder id, river name). See docs/DATA_CONTRACTS.md, "legendarium.json".
"""

from __future__ import annotations

import json
import math
import statistics
from pathlib import Path
from typing import Any, Callable

from ..core.geo import Albers, MapProjection
from ..core.hexgrid import HexGrid
from ..core.paths import WEB_DATA
from ..core.store import write_web
from ..lore import TABLES

REQUIRES = ["world.json", "states.json", "cities.json", "wonders.json", "nation.json"]
PRODUCES = ["legendarium.json"]
RUN_LAST = True  # it describes everything else, so it always rebuilds (no staleness tracking needed)

VINTAGE = "lore 0.1 (2026-11)"
MAX_BYTES = 300_000
BASIS = ("place", "likeness", "name", "new", "none")
FILES = ("world", "states", "cities", "wonders", "nation")
SNAP_RINGS = 2  # a site on water or over a border takes the nearest US land cell within this many rings
FIT_TOLERANCE_KM = 15

# The shipped grid's projection. usaciv keeps these numbers only in an interim that is not shipped, and in the
# browser as SHIPPED_PROJ (web/js/render/art/terrain.js); keep the two in sync. check() cross-checks them against
# known city positions, so a rebuild that moves the map's extent cannot pass unnoticed.
PROJECTION = MapProjection(min_x=-2350.109311515341, max_y=1559.2228881834299, margin=200.0)

# Metro CBSA code -> (lat, lon) of its principal city, for the cross-check.
REFERENCE: dict[str, tuple[float, float]] = {
    "47900": (38.9072, -77.0369),  # Washington
    "19740": (39.7392, -104.9903),  # Denver
    "42660": (47.6062, -122.3321),  # Seattle
    "33100": (25.7617, -80.1918),  # Miami
    "31080": (34.0522, -118.2437),  # Los Angeles
    "16980": (41.8781, -87.6298),  # Chicago
    "26420": (29.7604, -95.3698),  # Houston
    "14460": (42.3601, -71.0589),  # Boston
    "33460": (44.9778, -93.2650),  # Minneapolis
    "21340": (31.7619, -106.4850),  # El Paso
    "35380": (29.9511, -90.0715),  # New Orleans
    "38900": (45.5152, -122.6784),  # Portland, Oregon
}


def fit_offsets(cities: list[dict]) -> tuple[float, float, float]:
    """(ox, oy, spread_km) such that map x = albers_x + ox and map y = oy - albers_y, fitted to known cities."""
    albers = Albers()
    by_id = {c["id"]: c for c in cities}
    ox, oy = [], []
    for cbsa, (lat, lon) in REFERENCE.items():
        city = by_id.get(cbsa)
        if city is None:
            continue
        ax, ay = albers(lon, lat)
        ox.append(city["x"] - ax)
        oy.append(city["y"] + ay)
    if len(ox) < 6:
        raise ValueError(f"only {len(ox)} of the {len(REFERENCE)} reference cities were found; need 6")
    spread = max(max(ox) - min(ox), max(oy) - min(oy))
    if spread > 40:
        raise ValueError(f"projection fit spread is {spread:.0f} km; the reference cities disagree")
    return statistics.median(ox), statistics.median(oy), spread


def _entry(kind: str, key: str, e: dict, forbidden) -> None:
    """Every lore entry needs a name, a basis from the list and a reason, and must avoid adaptation names."""
    if e.get("basis") not in BASIS:
        raise ValueError(f"{kind} {key}: basis {e.get('basis')!r} is not one of {', '.join(BASIS)}")
    for field in ("name", "why"):
        if not str(e.get(field) or "").strip():
            raise ValueError(f"{kind} {key}: empty {field}")
    for bad in forbidden:
        if bad.lower() in e["name"].lower():
            raise ValueError(f"{kind} {key}: {e['name']!r} uses a name from an adaptation ({bad})")


def _unknown(kind: str, keys, known) -> None:
    extra = sorted(set(keys) - set(known))
    if extra:
        raise ValueError(f"{kind}: unknown key {', '.join(repr(k) for k in extra)}")


def _repeats(kind: str, items) -> list[str]:
    """Messages for each name used twice within one kind. items: (key, name) pairs. Names may repeat across kinds
    (a land and its chief place, a city and the fort in it); within a kind each must be unique."""
    seen: dict[str, str] = {}
    out = []
    for key, name in items:
        if name in seen:
            out.append(f"{kind} name {name!r} is used twice ({seen[name]}, {key})")
        else:
            seen[name] = key
    return out


def _off_map(x: float, y: float, world: dict) -> bool:
    return not (0 <= x <= world["width"] and 0 <= y <= world["height"])


def _land_cell(grid: HexGrid, owner: list[int], x: float, y: float) -> int:
    """The cell at (x, y) if it is US land, else the nearest US land cell within SNAP_RINGS, else -1."""
    start = grid.cell_at(x, y)
    if start < 0:
        return -1
    if owner[start] >= 0:
        return start
    seen, ring = {start}, [start]
    for _ in range(SNAP_RINGS):
        ring = [n for c in ring for n in grid.neighbours(c) if n >= 0 and n not in seen and not seen.add(n)]
        land = [c for c in ring if owner[c] >= 0]
        if land:
            return min(land, key=lambda c: (math.dist((x, y), grid.center(*grid.col_row(c))), c))
    return -1


def assemble(web: dict[str, Any], tables: dict[str, Any] = TABLES,
             projection: Callable[[float, float], tuple[float, float]] = PROJECTION) -> dict:
    """Build the legendarium document from loaded web/data files (keyed "world", "states", ...) and lore tables.

    Raises ValueError, naming the offending key, on anything the tables say that the data does not support.
    """
    world, states, cities, nation = web["world"], web["states"], web["cities"], web["nation"]
    forbidden = tables.get("forbidden", ())
    fips_of = {s["abbr"]: s["fips"] for s in world["states"]}
    state_rec = {s["abbr"]: s for s in states}
    yield_keys = [y["key"] for y in nation["yields"]]

    # --- realms: every state in exactly one
    home: dict[str, str] = {}
    for r in tables["realms"]:
        _unknown(f"realm {r['id']} states", r["states"], fips_of)
        for abbr in r["states"]:
            if abbr in home:
                raise ValueError(f"state {abbr} is in two realms ({home[abbr]}, {r['id']})")
            home[abbr] = r["id"]
    for abbr in fips_of:
        if abbr not in home:
            raise ValueError(f"state {abbr} is in no realm")

    # --- lands, places, wonders, rivers: keys must exist in the data
    _unknown("lands", tables["lands"], fips_of)
    for abbr in fips_of:
        if abbr not in tables["lands"]:
            raise ValueError(f"state {abbr} has no land")
    city_ids = {c["id"] for c in cities}
    wonder_ids = {w["id"] for w in web["wonders"]["wonders"]}
    _unknown("places", tables["places"], city_ids)
    _unknown("wonders", tables["wonders"], wonder_ids)
    _unknown("rivers", tables["rivers"], {r["name"] for r in world["rivers"] if r["name"]})
    for kind in ("lands", "places", "wonders", "rivers"):
        for key, e in tables[kind].items():
            _entry(kind, key, e, forbidden)
    # Principle 3: a listing that is itself an Indigenous community or heritage site keeps its own name.
    kept = set(tables.get("kept", ()))
    _unknown("kept listings", kept, wonder_ids)
    for wid in sorted(kept):
        if tables["wonders"].get(wid, {}).get("basis", "none") != "none":
            raise ValueError(f"wonder {wid} is on the kept list and must keep its own name (basis 'none')")
    repeats = _repeats("place", ((k, e["name"]) for k, e in tables["places"].items()))
    repeats += _repeats("wonder", ((k, e["name"]) for k, e in tables["wonders"].items()))
    repeats += _repeats("site", ((s["id"], s["name"]) for s in tables["sites"]))
    if repeats:
        raise ValueError("; ".join(repeats))

    # --- realm totals (sums over member states) and ranks among realms
    def total(members: list[str], get) -> float | None:
        vals = [v for v in (get(state_rec[a]) for a in members if a in state_rec) if v is not None]
        return sum(vals) if vals else None

    realms = []
    for r in tables["realms"]:
        if r["capital"] not in city_ids:
            raise ValueError(f"realm {r['id']}: unknown capital {r['capital']!r}")
        members = r["states"]
        totals = {
            "population": total(members, lambda s: s.get("population")),
            "employed": total(members, lambda s: s.get("employed")),
            "gdp": total(members, lambda s: s.get("gdp")),
            "yields": {k: total(members, lambda s, k=k: (s.get("yields") or {}).get(k)) for k in yield_keys},
        }
        out = {k: r[k] for k in ("id", "name", "label", "gloss", "people", "culture", "colors", "device")}
        realms.append({**out, "states": [fips_of[a] for a in members], "capital": r["capital"], "totals": totals, "ranks": {}})
    measures = {"population": lambda t: t["population"], "gdp": lambda t: t["gdp"],
                **{k: (lambda t, k=k: t["yields"][k]) for k in yield_keys}}
    for key, get in measures.items():
        order = sorted((r for r in realms if get(r["totals"]) is not None), key=lambda r: -get(r["totals"]))
        place = {r["id"]: n for n, r in enumerate(order, 1)}  # sorted() is stable: a tie keeps table order
        for r in realms:
            r["ranks"][key] = place.get(r["id"])

    # --- sites and labels: real latitude and longitude -> map km
    grid = HexGrid(world["grid"]["radius"], world["grid"]["cols"], world["grid"]["rows"])
    sites = []
    for s in tables["sites"]:
        _entry("site", s["id"], s, forbidden)
        x, y = (round(v, 1) for v in projection(s["lon"], s["lat"]))
        cell = _land_cell(grid, world["owner"], x, y)
        if cell < 0:
            raise ValueError(f"site {s['id']}: too far from US land ({s['real']})")
        sites.append({"id": s["id"], "name": s["name"], "real": s["real"], "basis": s["basis"], "why": s["why"],
                      "x": x, "y": y, "cell": cell})
    labels = []
    for b in tables["labels"]:
        x, y = (round(v, 1) for v in projection(b["lon"], b["lat"]))
        if _off_map(x, y, world):
            raise ValueError(f"label {b['text']!r} is off the map at ({x}, {y}); the map is "
                             f"{world['width']} by {world['height']} km")
        labels.append({"text": b["text"], "sub": b.get("sub", ""), "kind": b["kind"], "x": x, "y": y,
                       "angle": b.get("angle", 0), "size": b.get("size", 1.0)})

    lands = {fips_of[a]: {k: v for k, v in {"name": e["name"], "label": e.get("label"), "realm": home[a],
                                             "basis": e["basis"], "why": e["why"]}.items() if v is not None}
             for a, e in tables["lands"].items()}
    return {
        "version": 1,
        "vintage": VINTAGE,
        "sources": [],
        "basis": dict(tables["basis"]),
        "ages": list(tables["ages"]),
        "realms": realms,
        "lands": lands,
        "places": {k: dict(e) for k, e in tables["places"].items()},
        "wonders": {k: dict(e) for k, e in tables["wonders"].items()},
        "sites": sites,
        "rivers": {k: dict(e) for k, e in tables["rivers"].items()},
        "labels": labels,
        "vocab": tables["vocab"],
    }


def build() -> None:
    web = {name: json.loads((WEB_DATA / f"{name}.json").read_text()) for name in FILES}
    write_web("legendarium.json", assemble(web))


def check(web_dir, kept=None) -> list[tuple[str, str]]:
    """Validate legendarium.json against the data files beside it. A missing file is a NOTE (it is optional).

    kept: wonder ids that must keep their own names (default: the lore tables' kept list).
    """
    kept = set(TABLES["kept"] if kept is None else kept)
    web_dir = Path(web_dir)
    path = web_dir / "legendarium.json"
    if not path.exists():
        return [("NOTE", "legendarium.json: missing (optional, skipped)")]
    lines: list[tuple[str, str]] = []
    size = path.stat().st_size
    if size > MAX_BYTES:
        lines.append(("FAIL", f"legendarium.json is {size:,} bytes, over the {MAX_BYTES:,} limit"))
    doc = json.loads(path.read_text())
    missing = [n for n in FILES if not (web_dir / f"{n}.json").exists()]
    if missing:
        return lines + [("NOTE", f"cannot cross-check without {', '.join(missing)}.json")]
    web = {n: json.loads((web_dir / f"{n}.json").read_text()) for n in FILES}
    world, cities = web["world"], web["cities"]
    fips = [s["fips"] for s in world["states"]]
    wonder_ids = {w["id"] for w in web["wonders"]["wonders"]}

    def unknown(kind, keys, known):
        extra = sorted(set(keys) - set(known))
        if extra:
            lines.append(("FAIL", f"{kind}: unknown key {', '.join(extra)}"))

    listed = [f for r in doc.get("realms", []) for f in r.get("states", [])]
    unknown("realm states", listed, fips)
    for f in fips:
        if listed.count(f) != 1:
            lines.append(("FAIL", f"state {f} is in {listed.count(f)} realms, expected 1"))
    unknown("lands", doc.get("lands", {}), fips)
    unknown("places", doc.get("places", {}), {c["id"] for c in cities})
    unknown("realm capitals", [r.get("capital") for r in doc.get("realms", [])], {c["id"] for c in cities})
    unknown("wonders", doc.get("wonders", {}), wonder_ids)
    unknown("rivers", doc.get("rivers", {}), {r["name"] for r in world["rivers"] if r["name"]})
    entries = [(kind, key, e) for kind in ("lands", "places", "wonders", "rivers") for key, e in doc.get(kind, {}).items()]
    entries += [("site", s.get("id"), s) for s in doc.get("sites", [])]
    for kind, key, e in entries:
        if e.get("basis") not in BASIS or not str(e.get("why") or "").strip():
            lines.append(("FAIL", f"{kind} {key}: needs a basis and a reason"))
    for s in doc.get("sites", []):
        cell = s.get("cell", -1)
        if not (0 <= cell < len(world["owner"])) or world["owner"][cell] < 0:
            lines.append(("FAIL", f"site {s.get('id')}: its cell is not US land"))
    for wid in sorted(kept & wonder_ids):
        if doc.get("wonders", {}).get(wid, {}).get("basis", "none") != "none":
            lines.append(("FAIL", f"wonder {wid} is on the kept list and must keep its own name"))
    for kind, items in (("place", [(k, e.get("name")) for k, e in doc.get("places", {}).items()]),
                        ("wonder", [(k, e.get("name")) for k, e in doc.get("wonders", {}).items()]),
                        ("site", [(s.get("id"), s.get("name")) for s in doc.get("sites", [])])):
        lines += [("FAIL", msg) for msg in _repeats(kind, items)]
    vocab = set((doc.get("vocab") or {}).get("yields") or {})
    yield_keys = {y["key"] for y in web["nation"]["yields"]}
    lines += [("FAIL", f"vocabulary misses the yield {k!r}") for k in sorted(yield_keys - vocab)]
    lines += [("FAIL", f"vocabulary names a yield the data lacks: {k!r}") for k in sorted(vocab - yield_keys)]
    for b in doc.get("labels", []):
        x, y = b.get("x"), b.get("y")
        if not (isinstance(x, (int, float)) and isinstance(y, (int, float))) or _off_map(x, y, world):
            lines.append(("FAIL", f"label {b.get('text')!r} is off the map ({x}, {y})"))
    try:
        ox, oy, _ = fit_offsets(cities)
        off = max(abs(ox - (PROJECTION.margin - PROJECTION.min_x)), abs(oy - (PROJECTION.margin + PROJECTION.max_y)))
        level = "PASS" if off <= FIT_TOLERANCE_KM else "FAIL"
        lines.append((level, f"projection constants are within {off:.1f} km of the known city positions"))
    except ValueError as exc:
        lines.append(("NOTE", f"projection not cross-checked ({exc})"))

    named = sum(1 for e in doc.get("places", {}).values() if e.get("basis") != "none")
    wnamed = sum(1 for e in doc.get("wonders", {}).values() if e.get("basis") != "none")
    lines.append(("PASS", f"{named} of {len(cities)} cities named"))
    lines.append(("PASS", f"{wnamed} of {len(wonder_ids)} wonders named"))
    lines.append(("PASS", f"{len(doc.get('sites', []))} sites"))
    lines.append(("PASS", f"{len(doc.get('realms', []))} realms cover {len(set(listed) & set(fips))} states"))
    return lines
