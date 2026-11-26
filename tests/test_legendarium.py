"""The legendarium builder: projection fit, assembly keyed by real ids, and its check()."""

import copy
import json
import tempfile
import unittest
from pathlib import Path

from pipeline import check as core_check
from pipeline.build import legendarium as lg
from pipeline.core.geo import Albers

from test_check import ECON, YIELDS, dataset

WEB_DATA = Path(__file__).resolve().parents[1] / "web" / "data"
YIELD_KEYS = list(core_check.YIELD_KEYS)


def web_docs():
    """The synthetic dataset from test_check plus a one-wonder wonders.json, keyed the way assemble() wants."""
    files, _ = dataset()
    web = {name[:-5]: doc for name, doc in files.items()}
    web["wonders"] = {"wonders": [{"id": "w1", "name": "Wonder One", "short": "Wonder"},
                                  {"id": "w2", "name": "Kept Place", "short": "Kept"}]}
    return web


def tables(**over):
    realm = lambda rid, name, states, cap: {
        "id": rid, "name": name, "label": [name.upper()], "gloss": "g", "people": "p", "culture": "common",
        "colors": ["#111111", "#eeeeee"], "device": "star", "states": states, "capital": cap}
    t = {
        "basis": dict.fromkeys(["place", "likeness", "name", "new", "none"], "text"),
        "ages": [{"id": "ta", "name": "Third Age", "sub": "", "default": True}],
        "realms": [realm("a", "Aland", ["AL"], "10000"), realm("b", "Bland", ["AK"], "10001")],
        "lands": {"AL": {"name": "Southmarch", "basis": "place", "why": "w"},
                  "AK": {"name": "Northmarch", "label": "North", "basis": "place", "why": "w"}},
        "places": {"10000": {"name": "Bigburg", "basis": "likeness", "why": "w", "culture": "dwarf"}},
        "wonders": {"w1": {"name": "The Thing", "basis": "likeness", "why": "w"},
                    "w2": {"name": "Kept Place", "basis": "none", "why": "It keeps its own name."}},
        "sites": [],
        "rivers": {"Big": {"name": "Great Water", "basis": "name", "why": "w"}},
        "labels": [],
        "vocab": {"yields": {k: {"name": k.title(), "plain": "p"} for k in YIELD_KEYS}},
        "forbidden": {"Badname"},
        "kept": {"w2"},
    }
    t.update(over)
    return t


class FitTest(unittest.TestCase):
    def cities(self, dx=100.0, dy=200.0):
        albers = Albers()
        out = []
        for cbsa, (lat, lon) in lg.REFERENCE.items():
            ax, ay = albers(lon, lat)
            out.append({"id": cbsa, "x": ax + dx, "y": dy - ay})
        return out

    def test_recovers_a_known_shift(self):
        ox, oy, spread = lg.fit_offsets(self.cities())
        self.assertAlmostEqual(ox, 100.0, places=6)
        self.assertAlmostEqual(oy, 200.0, places=6)
        self.assertLess(spread, 1e-6)

    def test_rejects_a_bad_fit(self):
        cities = self.cities()
        cities[0]["x"] += 500.0
        with self.assertRaisesRegex(ValueError, "spread"):
            lg.fit_offsets(cities)

    def test_needs_six_reference_cities(self):
        with self.assertRaisesRegex(ValueError, "reference"):
            lg.fit_offsets(self.cities()[:5])


class AssembleTest(unittest.TestCase):
    def test_keys_are_real_ids(self):
        doc = lg.assemble(web_docs(), tables())
        self.assertEqual(set(doc["lands"]), {"01", "02"})
        self.assertEqual(doc["lands"]["01"], {"name": "Southmarch", "realm": "a", "basis": "place", "why": "w"})
        self.assertEqual(doc["lands"]["02"]["label"], "North")
        self.assertEqual([r["states"] for r in doc["realms"]], [["01"], ["02"]])
        self.assertEqual(doc["places"]["10000"], {"name": "Bigburg", "basis": "likeness", "why": "w", "culture": "dwarf"})
        self.assertEqual(doc["wonders"]["w2"]["basis"], "none")
        self.assertEqual(doc["rivers"]["Big"]["name"], "Great Water")
        self.assertEqual(doc["version"], 1)
        self.assertEqual(doc["sources"], [])
        self.assertEqual(list(doc)[:5], ["version", "vintage", "sources", "basis", "ages"])

    def test_realm_totals_are_sums(self):
        t = tables()
        t["realms"] = [dict(t["realms"][0], states=["AL", "AK"])]
        totals = lg.assemble(web_docs(), t)["realms"][0]["totals"]
        self.assertEqual(totals["population"], 2 * ECON["population"])
        self.assertEqual(totals["gdp"], 2 * ECON["gdp"])
        self.assertEqual(totals["yields"]["food"], YIELDS["food"] * 1.5)  # the second state has half the yields
        self.assertIsNone(totals["yields"]["culture"])  # null in every member stays null

    def test_ranks_among_realms(self):
        a, b = lg.assemble(web_docs(), tables())["realms"]
        self.assertEqual((a["ranks"]["food"], b["ranks"]["food"]), (1, 2))
        self.assertEqual((a["ranks"]["population"], b["ranks"]["population"]), (1, 2))  # a tie keeps table order
        self.assertIsNone(a["ranks"]["culture"])

    def test_unknown_keys_raise(self):
        cases = {
            "state": lambda t: t["realms"][0]["states"].append("ZZ"),
            "land": lambda t: t["lands"].update(ZZ={"name": "Nowhere", "basis": "place", "why": "w"}),
            "city": lambda t: t["places"].update({"99999": {"name": "Ghost", "basis": "place", "why": "w"}}),
            "capital": lambda t: t["realms"][0].update(capital="99999"),
            "wonder": lambda t: t["wonders"].update(w9={"name": "Ghost", "basis": "place", "why": "w"}),
            "river": lambda t: t["rivers"].update(Styx={"name": "Ghost", "basis": "place", "why": "w"}),
        }
        for what, change in cases.items():
            t = tables()
            change(t)
            with self.subTest(what=what), self.assertRaisesRegex(ValueError, "ZZ|99999|w9|Styx"):
                lg.assemble(web_docs(), t)

    def test_state_in_two_realms_raises(self):
        t = tables()
        t["realms"][1]["states"].append("AL")
        with self.assertRaisesRegex(ValueError, "AL.*two realms"):
            lg.assemble(web_docs(), t)

    def test_state_in_no_realm_raises(self):
        t = tables()
        t["realms"][1]["states"] = []
        with self.assertRaisesRegex(ValueError, "AK.*no realm"):
            lg.assemble(web_docs(), t)

    def test_missing_basis_or_reason_raises(self):
        for field, value in (("basis", "guess"), ("why", "  ")):
            t = tables()
            t["places"]["10000"][field] = value
            with self.subTest(field=field), self.assertRaisesRegex(ValueError, "10000"):
                lg.assemble(web_docs(), t)

    def test_repeated_place_name_raises(self):
        t = tables()
        t["places"]["10001"] = {"name": "Bigburg", "basis": "place", "why": "w"}
        with self.assertRaisesRegex(ValueError, "Bigburg"):
            lg.assemble(web_docs(), t)

    def test_site_on_water_takes_the_nearest_land_cell(self):
        # The synthetic world: cell 2 (x 86.6, y 0) is ocean; cells 1 and 4 are its land neighbours.
        site = {"id": "s", "name": "Sea Rock", "real": "A rock", "lat": 0.0, "lon": 86.6, "basis": "place", "why": "w"}
        doc = lg.assemble(web_docs(), tables(sites=[site]), projection=lambda lon, lat: (lon, lat))
        out = doc["sites"][0]
        self.assertIn(out["cell"], (1, 4))
        self.assertEqual((out["x"], out["y"]), (86.6, 0.0))
        self.assertEqual(out["real"], "A rock")

    def test_site_far_from_land_raises(self):
        site = {"id": "far", "name": "Nowhere", "real": "Open sea", "lat": 1000.0, "lon": 1000.0, "basis": "place", "why": "w"}
        with self.assertRaisesRegex(ValueError, "far"):
            lg.assemble(web_docs(), tables(sites=[site]), projection=lambda lon, lat: (lon, lat))

    def test_labels_are_projected(self):
        label = {"text": "THE SEA", "sub": "", "kind": "sea", "lat": 30.0, "lon": 90.0, "angle": 0, "size": 1.0}
        out = lg.assemble(web_docs(), tables(labels=[label]), projection=lambda lon, lat: (lon, lat))["labels"][0]
        self.assertEqual((out["x"], out["y"], out["text"]), (90.0, 30.0, "THE SEA"))
        self.assertNotIn("lat", out)

    def test_forbidden_name_raises(self):
        t = tables()
        t["places"]["10000"]["name"] = "The Badname Halls"
        with self.assertRaisesRegex(ValueError, "Badname"):
            lg.assemble(web_docs(), t)

    def test_a_kept_listing_keeps_its_own_name(self):
        t = tables()
        t["wonders"]["w2"] = {"name": "The Other Thing", "basis": "likeness", "why": "w"}
        with self.assertRaisesRegex(ValueError, "w2.*own name"):
            lg.assemble(web_docs(), t)

    def test_a_kept_listing_must_exist(self):
        with self.assertRaisesRegex(ValueError, "w9"):
            lg.assemble(web_docs(), tables(kept={"w2", "w9"}))

    def test_repeated_wonder_or_site_name_raises(self):
        site = lambda sid: {"id": sid, "name": "Sea Rock", "real": "A rock", "lat": 0.0, "lon": 86.6, "basis": "place", "why": "w"}
        cases = {
            "wonder": tables(kept=set(), wonders={"w1": {"name": "The Thing", "basis": "likeness", "why": "w"},
                                                  "w2": {"name": "The Thing", "basis": "place", "why": "w"}}),
            "site": tables(sites=[site("s1"), site("s2")]),
        }
        for what, t in cases.items():
            with self.subTest(what=what), self.assertRaisesRegex(ValueError, "used twice"):
                lg.assemble(web_docs(), t, projection=lambda lon, lat: (lon, lat))

    def test_label_off_the_map_raises(self):
        label = {"text": "THE FAR SEA", "sub": "", "kind": "sea", "lat": 30.0, "lon": -5.0, "angle": 0, "size": 1.0}
        with self.assertRaisesRegex(ValueError, "THE FAR SEA.*off the map"):
            lg.assemble(web_docs(), tables(labels=[label]), projection=lambda lon, lat: (lon, lat))


class CheckTest(unittest.TestCase):
    def write(self, tmp, doc, web=None):
        wd = Path(tmp)
        for name, d in (web or web_docs()).items():
            (wd / f"{name}.json").write_text(json.dumps(d))
        if doc is not None:
            (wd / "legendarium.json").write_text(json.dumps(doc))
        return wd

    def levels(self, lines):
        return [lv for lv, _ in lines]

    def fails(self, doc, needle, web=None):
        with tempfile.TemporaryDirectory() as tmp:
            lines = lg.check(self.write(tmp, doc, web), kept={"w2"})
        return [msg for lv, msg in lines if lv == "FAIL" and needle in msg]

    def test_rule_breaks_in_the_file_fail(self):
        label = {"text": "THE FAR SEA", "sub": "", "kind": "sea", "x": -122.0, "y": 30.0, "angle": 0, "size": 1}
        site = {"id": "searock", "name": "Sea Rock", "real": "r", "basis": "place", "why": "w", "x": 86.6, "y": 0.0, "cell": 2}
        cases = {
            "a kept listing renamed": (lambda d: d["wonders"]["w2"].update(name="The Other", basis="likeness"), "w2"),
            "a place name used twice": (lambda d: d["places"].update({"10001": dict(d["places"]["10000"])}), "Bigburg"),
            "a yield missing from the vocabulary": (lambda d: d["vocab"]["yields"].pop("food"), "food"),
            "a vocabulary id the data lacks": (lambda d: d["vocab"]["yields"].update(mana={"name": "Mana", "plain": "p"}), "mana"),
            "a label off the map": (lambda d: d["labels"].append(label), "THE FAR SEA"),
            "a state in two realms": (lambda d: d["realms"][1]["states"].append("01"), "01"),
            "a site off US land": (lambda d: d["sites"].append(site), "searock"),
        }
        for what, (change, needle) in cases.items():
            doc = lg.assemble(web_docs(), tables())
            change(doc)
            with self.subTest(what=what):
                self.assertTrue(self.fails(doc, needle), what)

    def test_projection_far_from_the_cities_fails(self):
        # The reference cities placed 100 km east of where the shipped constants put them.
        albers, p = Albers(), lg.PROJECTION
        web = web_docs()
        for cbsa, (lat, lon) in lg.REFERENCE.items():
            ax, ay = albers(lon, lat)
            web["cities"].append({"id": cbsa, "name": cbsa, "x": ax + p.margin - p.min_x + 100.0, "y": p.margin + p.max_y - ay})
        self.assertTrue(self.fails(lg.assemble(web_docs(), tables()), "projection", web=web))

    def test_missing_file_is_a_note(self):
        with tempfile.TemporaryDirectory() as tmp:
            lines = lg.check(self.write(tmp, None))
        self.assertEqual(self.levels(lines), ["NOTE"])

    def test_good_file_passes_and_reports_coverage(self):
        with tempfile.TemporaryDirectory() as tmp:
            lines = lg.check(self.write(tmp, lg.assemble(web_docs(), tables())))
        self.assertNotIn("FAIL", self.levels(lines))
        self.assertIn(("PASS", "1 of 2 cities named"), lines)
        self.assertIn(("PASS", "1 of 2 wonders named"), lines)
        self.assertIn(("PASS", "2 realms cover 2 states"), lines)

    def test_unknown_key_in_the_file_fails(self):
        doc = lg.assemble(web_docs(), tables())
        doc["places"]["99999"] = copy.deepcopy(doc["places"]["10000"])
        with tempfile.TemporaryDirectory() as tmp:
            lines = lg.check(self.write(tmp, doc))
        self.assertTrue(any(lv == "FAIL" and "99999" in msg for lv, msg in lines))

    def test_oversize_file_fails(self):
        doc = lg.assemble(web_docs(), tables())
        doc["places"]["10000"]["why"] = "x" * 300_001
        with tempfile.TemporaryDirectory() as tmp:
            lines = lg.check(self.write(tmp, doc))
        self.assertTrue(any(lv == "FAIL" and "300" in msg for lv, msg in lines))


@unittest.skipUnless((WEB_DATA / "world.json").exists(), "needs the shipped data")
class RealDataTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.web = {n: json.loads((WEB_DATA / f"{n}.json").read_text()) for n in ("world", "states", "cities", "wonders", "nation")}
        cls.doc = lg.assemble(cls.web)

    def test_builds_from_the_shipped_data(self):
        d = self.doc
        self.assertEqual(len(d["realms"]), 15)
        self.assertEqual(len(d["lands"]), 49)
        self.assertGreaterEqual(len(d["places"]), 48)
        self.assertEqual(len(d["wonders"]), 32)
        self.assertEqual(len(d["sites"]), 16)
        self.assertEqual(sum(r["totals"]["population"] for r in d["realms"]),
                         sum(s["population"] for s in self.web["states"]))

    def test_every_site_sits_on_us_land(self):
        owner = self.web["world"]["owner"]
        for s in self.doc["sites"]:
            with self.subTest(site=s["id"]):
                self.assertGreaterEqual(owner[s["cell"]], 0)
                self.assertIn("x", s)
                self.assertNotIn("lat", s)

    def test_dc_without_hexes_still_has_a_land(self):
        self.assertEqual(self.doc["lands"]["11"]["name"], "Minas Tirith")
        self.assertEqual(self.doc["lands"]["11"]["realm"], "gondor")

    def test_output_is_under_300_kb(self):
        self.assertLess(len(json.dumps(self.doc, separators=(",", ":"), ensure_ascii=False).encode()), 300_000)

    def test_the_shipped_file_is_fresh(self):
        shipped = json.loads((WEB_DATA / "legendarium.json").read_text())
        self.assertEqual(shipped, json.loads(json.dumps(self.doc)),
                         "web/data/legendarium.json is stale: uv run python -m pipeline build legendarium")

    def test_the_shipped_file_passes_its_check(self):
        lines = lg.check(WEB_DATA)
        self.assertEqual([msg for lv, msg in lines if lv == "FAIL"], [])

    def test_shipped_projection_agrees_with_the_cities(self):
        ox, oy, spread = lg.fit_offsets(self.web["cities"])
        self.assertLess(spread, 40)
        self.assertLess(abs(ox - (lg.PROJECTION.margin - lg.PROJECTION.min_x)), 15)
        self.assertLess(abs(oy - (lg.PROJECTION.margin + lg.PROJECTION.max_y)), 15)

    def test_a_known_site_lands_in_its_state(self):
        states = self.web["world"]["states"]
        owner = self.web["world"]["owner"]
        where = {s["id"]: states[owner[s["cell"]]]["abbr"] for s in self.doc["sites"]}
        self.assertEqual(where["mount-rainier"], "WA")
        self.assertEqual(where["lunar-crater"], "NV")
        self.assertEqual(where["mammoth-cave"], "KY")
        self.assertEqual(where["great-salt-lake"], "UT")  # the lake itself is water; the cell is the nearest land


if __name__ == "__main__":
    unittest.main()
