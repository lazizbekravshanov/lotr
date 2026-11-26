"""The hand-written lore tables (pipeline/lore): shape, coverage, and the rules of the map."""

import json
import re
import unittest
from pathlib import Path

from pipeline.lore import TABLES

WEB_DATA = Path(__file__).resolve().parents[1] / "web" / "data"
BASIS = {"place", "likeness", "name", "new", "none"}
HEX = re.compile(r"^#[0-9a-f]{6}$")


def load(name):
    return json.loads((WEB_DATA / f"{name}.json").read_text())


@unittest.skipUnless((WEB_DATA / "states.json").exists(), "needs the shipped data")
class LoreTablesTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.abbrs = {s["abbr"] for s in load("states")}
        cls.city_ids = {c["id"] for c in load("cities")}
        cls.wonder_ids = {w["id"] for w in load("wonders")["wonders"]}
        cls.rivers = {r["name"] for r in load("world")["rivers"] if r["name"]}

    def test_every_state_is_in_exactly_one_realm(self):
        listed = [a for r in TABLES["realms"] for a in r["states"]]
        self.assertEqual(len(self.abbrs), 49)
        self.assertEqual(sorted(listed), sorted(self.abbrs))

    def test_every_state_has_a_land(self):
        self.assertEqual(set(TABLES["lands"]), self.abbrs)

    def test_every_entry_has_a_basis_and_a_reason(self):
        groups = {"lands": TABLES["lands"].values(), "places": TABLES["places"].values(),
                  "wonders": TABLES["wonders"].values(), "sites": TABLES["sites"], "rivers": TABLES["rivers"].values()}
        for kind, entries in groups.items():
            for e in entries:
                with self.subTest(kind=kind, name=e.get("name")):
                    self.assertIn(e["basis"], BASIS)
                    self.assertTrue(e["name"].strip())
                    self.assertTrue(e["why"].strip())
        self.assertEqual(set(TABLES["basis"]), BASIS)

    def test_keys_exist_in_the_data(self):
        self.assertLessEqual(set(TABLES["places"]), self.city_ids)
        self.assertLessEqual({r["capital"] for r in TABLES["realms"]}, self.city_ids)
        self.assertLessEqual(set(TABLES["wonders"]), self.wonder_ids)
        self.assertLessEqual(set(TABLES["rivers"]), self.rivers)

    def test_place_names_are_unique(self):
        names = [p["name"] for p in TABLES["places"].values()]
        self.assertEqual(sorted(names), sorted(set(names)))

    def test_kept_names(self):
        for wid in ("nhl-66000496", "nhl-66000899"):  # Taos Pueblo, Cahokia Mounds
            self.assertEqual(TABLES["wonders"][wid]["basis"], "none")

    def test_no_adaptation_names(self):
        self.assertIn("Thorin's Halls", TABLES["forbidden"])
        names = [r["name"] for r in TABLES["realms"]]
        for table in ("lands", "places", "wonders", "rivers"):
            names += [e["name"] for e in TABLES[table].values()]
        names += [s["name"] for s in TABLES["sites"]] + [b["text"] for b in TABLES["labels"]]
        for n in names:
            for bad in TABLES["forbidden"]:
                self.assertNotIn(bad.lower(), n.lower())

    def test_three_ages_and_the_third_is_default(self):
        self.assertEqual([a["id"] for a in TABLES["ages"]], ["ta", "sa", "fa"])
        self.assertEqual([a["id"] for a in TABLES["ages"] if a.get("default")], ["ta"])

    def test_realms_are_complete(self):
        self.assertEqual(len(TABLES["realms"]), 15)
        ids = [r["id"] for r in TABLES["realms"]]
        self.assertEqual(len(ids), len(set(ids)))
        for r in TABLES["realms"]:
            with self.subTest(realm=r["id"]):
                self.assertEqual(len(r["colors"]), 2)
                self.assertTrue(all(HEX.match(c) for c in r["colors"]))
                self.assertTrue(r["label"] and all(isinstance(x, str) for x in r["label"]))
                for key in ("name", "gloss", "people", "culture", "device"):
                    self.assertTrue(r[key].strip())

    def test_vocabulary_covers_the_five_yields(self):
        self.assertEqual(set(TABLES["vocab"]["yields"]), {y["key"] for y in load("nation")["yields"]})


if __name__ == "__main__":
    unittest.main()
