"""Regenerate hexes.json for the concept page from a usaciv checkout.

    python3 make_hexes.py /path/to/usaciv hexes.json legendarium-draft.json

Reads usaciv's built web/data (never writes to it). Keeps cities of 95k+ people plus every city
named in the draft. Fits the two Albers offsets that usaciv does not ship, from known city positions.
"""
import json, math, sys

src, out = sys.argv[1].rstrip("/") + "/web/data/", sys.argv[2]
keep = set(json.load(open(sys.argv[3], encoding="utf-8"))["places"]) if len(sys.argv) > 3 else set()
w, st, ci, wo = (json.load(open(src + n + ".json")) for n in ("world", "states", "cities", "wonders"))
assert [s["fips"] for s in st] == [s["fips"] for s in w["states"]]
D = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"

R = 6371.0088
p1, p2, p0, l0 = map(math.radians, (29.5, 45.5, 37.5, -96.0))
n = (math.sin(p1) + math.sin(p2)) / 2
C = math.cos(p1) ** 2 + 2 * n * math.sin(p1)
rho0 = R * math.sqrt(C - 2 * n * math.sin(p0)) / n


def albers(lat, lon):
    rho = R * math.sqrt(C - 2 * n * math.sin(math.radians(lat))) / n
    th = n * (math.radians(lon) - l0)
    return rho * math.sin(th), rho0 - rho * math.cos(th)


REF = {"47900": (38.9072, -77.0369), "19740": (39.7392, -104.9903), "42660": (47.6062, -122.3321),
       "33100": (25.7617, -80.1918), "31080": (34.0522, -118.2437), "16980": (41.8781, -87.6298),
       "26420": (29.7604, -95.3698), "14460": (42.3601, -71.0589), "33460": (44.9778, -93.2650),
       "21340": (31.7619, -106.4850), "35380": (29.9511, -90.0715), "38900": (45.5152, -122.6784)}
by = {c["id"]: c for c in ci}
ox = sorted(by[k]["x"] - albers(*v)[0] for k, v in REF.items())
oy = sorted(by[k]["y"] + albers(*v)[1] for k, v in REF.items())
assert ox[-1] - ox[0] < 40 and oy[-1] - oy[0] < 40, "projection fit is off"

data = {
    "note": "Derived from usaciv web/data (MIT code, public data). For the design concept only.",
    "cols": w["grid"]["cols"], "rows": w["grid"]["rows"], "r": w["grid"]["radius"],
    "width": w["width"], "height": w["height"],
    "owner": "".join("~" if o == -1 else "^" if o == -2 else D[o] for o in w["owner"]),
    "water": "".join(str(v) for v in w["water"]),
    "relief": "".join(str(v) for v in w["relief"]),
    "cover": "".join(D[v] for v in w["cover"]),
    "states": [{"fips": s["fips"], "abbr": s["abbr"], "name": s["name"], "pop": int(s["population"]),
                "gdp": round(s["gdp"] / 1e9, 1), "lx": (s.get("label") or {}).get("x"),
                "ly": (s.get("label") or {}).get("y")} for s in st],
    "cities": [{"id": c["id"], "n": c["name"], "st": c["states"], "x": round(c["x"]), "y": round(c["y"]),
                "pop": int(c["population"]), "gdp": round(c["gdp"] / 1e9, 1)}
               for c in ci if c["population"] >= 95000 or c["id"] in keep],
    "rivers": [{"n": r["name"], "k": r["rank"], "p": [round(v) for v in r["pts"]]} for r in w["rivers"] if r["rank"] <= 5],
    "wonders": [{"id": x["id"], "n": x["short"], "k": x["kind"], "x": round(x["x"]), "y": round(x["y"]), "st": x["state"]}
                for x in wo["wonders"]],
    "proj": {"R": R, "p1": 29.5, "p2": 45.5, "p0": 37.5, "l0": -96.0,
             "ox": round(ox[len(ox) // 2], 1), "oy": round(oy[len(oy) // 2], 1)},
}
json.dump(data, open(out, "w"), separators=(",", ":"))
print(len(data["cities"]), "cities,", len(data["rivers"]), "rivers, offsets", data["proj"]["ox"], data["proj"]["oy"])
