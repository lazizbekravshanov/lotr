# Foundation and Legendarium Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Import usaciv unchanged, then add the legendarium layer so the real US map shows Middle-earth names with a stated reason for each, switchable to real names in one click.

**Architecture:** usaciv's pipeline, data and renderer are imported whole. A new builder reads only the built `web/data` files plus hand-written lore tables and writes one new file, `legendarium.json`, keyed by usaciv's real ids. A new browser module, `lore.js`, swaps display names in place on the loaded data objects (keeping the real values under `.real`), so every existing module that reads `.name` shows the right tongue without being rewritten.

**Tech Stack:** Python 3.11+ standard library (`unittest`), plain ES modules, Canvas 2D. No npm, no framework, no build step.

**Spec:** `docs/superpowers/specs/2026-11-25-reunited-states-design.md` (sections 5, 6.1 to 6.4, 6.7, 8 steps 1 and 2). Seed content: `docs/design/concept/legendarium-draft.json`.

This is plan 1 of 7. Later plans, one per spec milestone, are written when their turn comes: Look, Land, Places, Words, Time and roads, Launch.

Deferred to those plans, although the spec's contract names them: drawing of legend sites and cartographic labels (their data is built here), `hosts`, vocabulary beyond the five yields, `moods`, `journeys`, per-Age content, and realm label anchors. The contract leaves room for each.

## Global Constraints

- The 31 public data sources, the pipeline and every upstream file in `web/data` stay exactly as usaciv ships them. The only new data file is `web/data/legendarium.json`.
- Real ids stay the keys everywhere: state FIPS, metro CBSA, wonder id. Real names are never overwritten in any data file.
- `pyproject.toml` keeps `dependencies = []`. No npm, no framework, no build step.
- Every lore entry has a basis in `{place, likeness, name, new, none}` and a non-empty reason.
- No coined Elvish. No names invented by adaptations (for example "Thorin's Halls", "Ostirith", "Caras Gaer"). Taos Pueblo and Cahokia Mounds keep their names (basis `none`).
- `legendarium.json` stays under 300 kB.
- With the file missing, or with `names=real`, the site shows exactly what usaciv shows.
- usaciv's copyright notice and the ASARB/ARDA credit stay.
- Gates: `uv run python -m unittest discover -s tests` passes, `uv run python -m pipeline check` exits 0, `node web/dev/selftest.mjs` prints `0 failed`.
- Commits are listed at the end of each task. The owner decides when commits start; ask before the first one.

## Review Focus

1. **`legendarium.json` missing or broken.** The site must load and behave as usaciv, with the Names switch hidden. Pinned by Task 4 case "no file: passthrough" and Task 5 step 6.
2. **Hand-typed links.** `#names=bogus&age=zz&realm=nowhere` must be ignored without an error and without changing the view. Pinned by Task 4 case "unknown tongue or age is ignored" and Task 8 step 5.
3. **Metros that span states, and DC.** A city's realm is the realm of its first-listed state unless its entry names one (Louisville's banner cell lies in Indiana, Cincinnati's in Kentucky); DC owns no hexes but still needs a land entry. Pinned by Task 3 tests `test_dc_without_hexes_still_has_a_land` and Task 4 case "realm lookups".
4. **Search with and without accents, in either tongue.** `annuminas`, `Annúminas` and `chicago` must all find Chicago. Pinned by Task 4 case "search aliases fold accents" and Task 7 step 1.
5. **Switching names while something is open.** A panel, the City View or an Advisor must show the new names at once; no banner may keep its old name. Pinned by Task 5 step 5 (sprite key) and step 7.

---

### Task 1: Import usaciv and prove it runs unchanged

**Files:**
- Copy from `usaciv-source.zip`: `pipeline/`, `tests/`, `web/`, `docs/DATA_CONTRACTS.md`, `pyproject.toml`, `uv.lock`. Copy its `README.md` to `docs/usaciv-README.md`. Do not copy `docs/images/`.
- Modify: `LICENSE` (add the line `Copyright (c) 2026 Andrej Karpathy (usaciv)` under the existing copyright line).
- Modify: `pyproject.toml` (`name = "reunited-states"`, description `The United States as Middle-earth: a Tolkien edition of usaciv`), then `uv lock`.
- Create: `.gitignore` (usaciv's, with `usaciv.zip` kept and `reunited-states.zip` added), `README.md`.
- Create: `tests/test_upstream_data.py`, `tests/make_data_manifest.py`, `tests/fixtures/upstream_data.json`.

**Interfaces:**
- Produces: the repository layout every later task relies on, and `UPSTREAM`, the list of the 15 upstream data file names, in `tests/test_upstream_data.py`.

- [ ] **Step 1: Write the failing test**

```python
UPSTREAM = ["world", "cities", "states", "nation", "counties", "lenses", "resources", "infrastructure",
            "military", "wonders", "trade", "districts", "citizens", "disasters", "sources"]

class UpstreamDataTest(unittest.TestCase):
    def test_upstream_files_match_the_manifest(self):
        manifest = json.loads((FIXTURES / "upstream_data.json").read_text())["files"]
        self.assertEqual(sorted(manifest), sorted(f"{n}.json" for n in UPSTREAM))
        for name, want in manifest.items():
            self.assertEqual(hashlib.sha256((WEB_DATA / name).read_bytes()).hexdigest(), want,
                             f"{name} changed; rerun tests/make_data_manifest.py only after a real pipeline rebuild")

    def test_all_31_public_sources_are_listed(self):
        self.assertEqual(len(json.loads((WEB_DATA / "sources.json").read_text())), 31)
```

- [ ] **Step 2: Run it to see it fail**

Run: `uv run python -m unittest tests.test_upstream_data -v`
Expected: ERROR, the fixture and data files do not exist.

- [ ] **Step 3: Copy the tree and write the manifest**

`tests/make_data_manifest.py` writes `{"note": ..., "files": {"world.json": "<sha256>", ...}}` for the 15 files. Run it once.

- [ ] **Step 4: Write `README.md`**

Sections: what this is (two sentences), quick start (`uv run python -m pipeline serve`), credits (usaciv by Andrej Karpathy, MIT; the data publishers; the ASARB/ARDA credit), and the disclaimer: unofficial fan project, not affiliated with or endorsed by the Tolkien Estate, Middle-earth Enterprises, Warner Bros., New Line Cinema or Amazon; all artwork original.

- [ ] **Step 5: Run every gate**

Run: `uv run python -m unittest discover -s tests` Expected: `Ran 178 tests` and `OK`.
Run: `uv run python -m pipeline list` Expected: 31 source lines and 15 builders.
Run: `uv run python -m pipeline check` Expected: last line ends `0 fail`, exit code 0.

- [ ] **Step 6: Look at it**

Serve `web/` and open it. Expected: the usaciv map, a New York banner, no console errors.

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "Import usaciv (MIT) as the foundation, with a data manifest test"
```

---

### Task 2: Lore tables

**Files:**
- Create: `pipeline/lore/__init__.py`, `realms.py`, `lands.py`, `places.py`, `wonders.py`, `sites.py`, `rivers.py`, `labels.py`, `vocab.py`, `ages.py` (all under `pipeline/lore/`).
- Test: `tests/test_lore_tables.py`

**Interfaces:**
- Produces: `pipeline.lore.TABLES`, a dict with exactly these keys and shapes:
  - `basis`: `{code: text}` for the five codes.
  - `ages`: `[{id, name, sub, default}]` for `ta` (default), `sa`, `fa`.
  - `realms`: `[{id, name, label: [str], gloss, people, culture, colors: [hex, hex], device, states: [abbr], capital: cbsa}]`
  - `lands`: `{abbr: {name, basis, why, label?}}` (`label` is a short form for the map when `name` is long)
  - `places`: `{cbsa: {name, basis, why, culture?}}`
  - `wonders`: `{id: {name, basis, why}}`
  - `sites`: `[{id, name, real, lat, lon, basis, why}]`
  - `rivers`: `{realName: {name, basis, why}}`
  - `labels`: `[{text, sub, kind, lat, lon, angle, size}]`
  - `vocab`: `{"yields": {key: {name, plain}}}`
  - `forbidden`: the set of adaptation names that must never appear.
- Content comes from `docs/design/concept/legendarium-draft.json`. Realm cultures: lindon `haven`, arnor `arnor`, shire `hobbit`, eredluin `dwarf`, gondor `gondor`, rohan `rohan`, ironhills `dwarf`, forochel `snow`, rhovanion `common`, hithaeglir `dwarf`, isengard `wizard`, harondor `gondor`, mordor `shadow`, lorien `wood`, erebor `dale`. Realm capitals: lindon 14460, arnor 35620, shire 37980, eredluin 31140, gondor 47900, rohan 12420, ironhills 19820, forochel 33460, rhovanion 28140, hithaeglir 19740, isengard 42140, harondor 38060, mordor 29820, lorien 31080, erebor 42660. Place cultures that differ from their land: 38300 `dwarf`, 37340 `haven`.

- [ ] **Step 1: Write the failing tests**

```python
class LoreTablesTest(unittest.TestCase):
    def test_every_state_is_in_exactly_one_realm(self):       # against web/data/states.json: 49 abbrs, no repeats
    def test_every_state_has_a_land(self):                    # set(lands) == the same 49
    def test_every_entry_has_a_basis_and_a_reason(self):      # lands, places, wonders, sites, rivers
    def test_keys_exist_in_the_data(self):                    # place and capital ids in cities.json, wonder ids in
                                                              # wonders.json, river names in world.json rivers
    def test_place_names_are_unique(self):
    def test_kept_names(self):                                # nhl-66000496 and nhl-66000899 have basis "none"
    def test_no_adaptation_names(self):                       # no name contains an item of TABLES["forbidden"]
    def test_three_ages_and_the_third_is_default(self):
    def test_colours_are_hex_pairs(self):
```

- [ ] **Step 2: Run to see them fail.** Run: `uv run python -m unittest tests.test_lore_tables -v` Expected: `ModuleNotFoundError: pipeline.lore`.
- [ ] **Step 3: Write the tables** from the draft file, one module per table, plain literals, one entry per line.
- [ ] **Step 4: Run to see them pass.** Expected: 9 tests, `OK`.
- [ ] **Step 5: Commit** `git commit -m "Add the lore tables: realms, lands, places, wonders, sites, rivers"`

---

### Task 3: The legendarium builder

**Files:**
- Create: `pipeline/build/legendarium.py`
- Test: `tests/test_legendarium.py`
- Generated: `web/data/legendarium.json`

**Interfaces:**
- Consumes: `pipeline.lore.TABLES`; `pipeline.core.geo.Albers` (callable `(lon, lat) -> (x, y)` in Albers km); `pipeline.core.hexgrid.HexGrid.cell_at(x, y) -> int`; `pipeline.core.store.write_web(name, data)`; `pipeline.core.paths.WEB_DATA`.
- Produces:

```python
REQUIRES = ["world.json", "states.json", "cities.json", "wonders.json", "nation.json"]
PRODUCES = ["legendarium.json"]
RUN_LAST = True            # it describes everything else, so it always rebuilds and no staleness tracking is needed
REFERENCE: dict[str, tuple[float, float]]    # cbsa -> (lat, lon) for 12 well-known cities
def fit_offsets(cities: list[dict]) -> tuple[float, float, float]   # (ox, oy, spread_km)
def assemble(web: dict, tables: dict = TABLES, offsets: tuple[float, float] | None = None) -> dict
def build() -> None
def check(web_dir) -> list[tuple[str, str]]
```

- `PROJECTION`: a `pipeline.core.geo.MapProjection` with the shipped grid's constants (`min_x=-2350.109311515341`, `max_y=1559.2228881834299`, `margin=200`, the same as `SHIPPED_PROJ` in `web/js/render/art/terrain.js`). `assemble` takes `projection=PROJECTION` in place of `offsets`.
- `fit_offsets`: a cross-check, not the source of truth. For each reference city found, `ox = city.x - albers_x`, `oy = city.y + albers_y`; return the medians and the larger of the two ranges. Raise `ValueError` if fewer than 6 are found or the spread exceeds 40 km. `check()` FAILs if the fit and `PROJECTION` disagree by more than 15 km.
- `assemble` output, in this order: `version: 1`, `vintage`, `sources: []`, `basis`, `ages`, `realms`, `lands`, `places`, `wonders`, `sites`, `rivers`, `labels`, `vocab`.
  - `realms[]` copies the table entry with `states` as FIPS, plus `totals {population, employed, gdp, yields{}}` (sums over member states; a yield that is null in every member stays null) and `ranks {population, gdp, <yield keys>}` among realms (1 = largest; null where the total is null).
  - `lands` is keyed by FIPS and gains `realm: id`.
  - `sites[]` and `labels[]` gain `x`, `y` in map km (rounded to 0.1) from `lat`, `lon` and the fitted offsets; sites also gain `cell`.
  - It raises `ValueError`, naming the offending key, for: an unknown state, city, wonder or river key; a state in no realm or in two; a missing basis or empty reason; a repeated place name; a site whose cell is not US land; a forbidden name.
- `check(web_dir)`: a missing `legendarium.json` is one `NOTE`. Otherwise re-validate every key against the files in `web_dir` (`FAIL` per unknown key), `FAIL` if the file is over 300,000 bytes, and report `PASS` lines `N of M cities named`, `N of M wonders named`, `N sites`, `15 realms cover 49 states`.

- [ ] **Step 1: Write the failing tests** (synthetic data from `test_check.dataset()` and small tables built in the test)

```python
class FitTest(unittest.TestCase):
    def test_recovers_a_known_shift(self):        # cities placed at albers + (100, 200) -> (100.0, 200.0, ~0)
    def test_rejects_a_bad_fit(self):             # one city moved 500 km -> ValueError
    def test_needs_six_reference_cities(self):

class AssembleTest(unittest.TestCase):
    def test_keys_are_real_ids(self):             # lands keyed "01", "02"; realm states are FIPS
    def test_realm_totals_are_sums(self):         # population 2 x ECON population; all-null yield stays None
    def test_ranks_among_realms(self):
    def test_unknown_keys_raise(self):            # one subTest each: state, city, wonder, river
    def test_state_in_two_realms_raises(self):
    def test_state_in_no_realm_raises(self):
    def test_missing_basis_or_reason_raises(self):
    def test_forbidden_name_raises(self):

class CheckTest(unittest.TestCase):
    def test_missing_file_is_a_note(self):
    def test_unknown_key_in_the_file_fails(self):
    def test_oversize_file_fails(self):

@unittest.skipUnless((WEB_DATA / "world.json").exists(), "needs the shipped data")
class RealDataTest(unittest.TestCase):
    def test_builds_from_the_shipped_data(self):  # 15 realms, 49 lands, >= 48 places, 32 wonders, 18 sites
    def test_every_site_sits_on_us_land(self):
    def test_dc_without_hexes_still_has_a_land(self):     # lands["11"]["name"] == "Minas Tirith"
    def test_output_is_under_300_kb(self):
    def test_fit_spread_is_small(self):           # spread < 40
```

- [ ] **Step 2: Run to see them fail.** Run: `uv run python -m unittest tests.test_legendarium -v` Expected: import error.
- [ ] **Step 3: Implement** the five functions above.
- [ ] **Step 4: Run to see them pass,** then run the whole suite. `tests/test_builder_checks.py` must still pass: it proves our `check` only NOTEs when its file is absent.
- [ ] **Step 5: Build the file.** Run: `uv run python -m pipeline build legendarium` Expected: `→ web/data/legendarium.json (NN kB)`. Run: `uv run python -m pipeline check` Expected: four `legendarium:` PASS lines, `0 fail`.
- [ ] **Step 6: Commit** `git commit -m "Add the legendarium builder and its checks"`

---

### Task 4: `lore.js` and its self-test

**Files:**
- Create: `web/js/lore.js`
- Create: `web/dev/lore.cases.js` (the test cases), `web/dev/selftest.html` (runs them in a browser), `web/dev/selftest.mjs` (runs them with `node`, optional for people, used by agents)

**Interfaces:**
- Produces:

```js
export const normName = (s) => string            // lower case, accents folded, non-alphanumerics to single spaces
export function createLore(doc, data)            // doc: legendarium.json or null; data: {world, states, cities, nation}
// returns
{
  ok,                       // false when doc is null or has no realms: everything below is then a passthrough
  tongue,                   // "legend" | "real"   (starts "legend" when ok, else "real")
  age,                      // "ta" | "sa" | "fa"  (starts at the default age)
  realms,                   // doc.realms, or []
  sig(),                    // `${tongue}|${age}`: part of every render cache key
  setTongue(t), setAge(a),  // return true when the value changed; unknown values are ignored and return false
  apply(),                  // write display fields for the current tongue and age (idempotent)
  applyColors(w),           // set w.stateColor[i] to the realm colour ("legend") or the original palette ("real")
  adopt(kind, data),        // kind "wonders": names are applied now and on every later change
  entry(kind, id),          // kind: "lands" | "places" | "wonders" | "rivers"; lands accept FIPS, abbr or state index
  realm(id), realmOfState(ref), realmOfCity(city),
  realName(obj),            // obj.real?.name ?? obj.name
  basisLabel(code),         // "by place" | "by likeness" | "by name" | "new-made" | "kept as it is"
  aliases(),                // [{kind: "city"|"state"|"realm", id, alias}]: the other tongue's names, for search
                            // (id is the CBSA for a city, the state index for a state, the realm id for a realm)
  realmLens(world),         // a categorical lens object (see Task 8)
  on(fn), off(fn),          // fn({tongue, age}) after each change
}
```

- Swap rule: the first `apply()` stores `obj.real = {name, short}` on every city, on both state arrays (`data.world.states`, `data.states`), on each `nation.yields` item (`{label, description}`) and later on each adopted wonder. In the legend tongue an object with an entry gets `name` (and `short` for wonders; `short` for a state is the land's `label` or is deleted) from the entry resolved for the current age; anything without an entry, any entry with basis `none`, and everything in the real tongue gets its real values back.
- Age resolution: `entry.ages?.[age]` fields override the base entry; the default age uses the base entry.
- `realmOfCity`: the place entry's `realm` if it has one, else the realm of `city.states[0]`, else the realm of the state that owns `city.cell`. `cityColor(city)` returns that realm's fill colour as `[r, g, b]` in the legend tongue and null otherwise; `banners.js` uses it for the banner cap.

- [ ] **Step 1: Write the failing cases** in `web/dev/lore.cases.js`, exported as `cases = [[name, fn(assert)], ...]` over a small inline fixture (3 states in 2 realms, 3 cities, 2 wonders, 5 yields):

```
"no file: passthrough"                       createLore(null, data): ok false, tongue "real", names untouched, setTongue("legend") === false
"legend names are applied, real ones kept"   city.name === "Fornost Erain", city.real.name === "New York", on both state arrays
"real tongue restores every display field"   names, yield labels and w.stateColor equal their originals
"unknown tongue or age is ignored"           setTongue("bogus") === false, setAge("zz") === false, nothing changes
"age overrides"                              a place with ages.fa.name shows it after setAge("fa") and loses it after setAge("ta")
"realm lookups"                              by index, FIPS and abbr; a city whose banner cell lies in another state still gets its first-listed state's realm
"search aliases fold accents"                normName("Annúminas") === "annuminas"; aliases() holds the real name in legend tongue and the legend name in real tongue
"sig changes with tongue and age"
"wonders adopted later get names"            "The Argonath" replaces name and short; the basis "none" wonder is untouched
"realm lens"                                 one category per realm; values[i] is the realm index on US land and null elsewhere
"listeners fire once per change"             and not at all when nothing changed
```

- [ ] **Step 2: Run to see them fail.** Run: `node web/dev/selftest.mjs` Expected: an import error for `../js/lore.js`.
- [ ] **Step 3: Implement `web/js/lore.js`** as a pure module: no DOM, no imports beyond `./color.js` `parseHex`.
- [ ] **Step 4: Run to see them pass.** Expected: `11 passed, 0 failed`, exit code 0. Open `web/dev/selftest.html` and expect the same list in green.
- [ ] **Step 5: Commit** `git commit -m "Add lore.js: tongues, ages, realm lookups, with a self-test"`

---

### Task 5: Wire the legendarium into the app

**Files:**
- Modify: `web/js/main.js` (blocking load near line 53; cache key near line 119; selection near 527; URL state near 609; start-up near 1257)
- Modify: `web/js/world.js` (export `relabelStates(w)`; the postal fallback near line 305 tries `states[s].short` first)
- Modify: `web/js/render/banners.js` (sprite key near line 656 includes `city.name`)

**Interfaces:**
- Consumes: `createLore` from Task 4; `legendarium.json` from Task 3.
- Produces: `app.lore` (the lore object), `w.lore` (the same, for modules that only receive `w`), the app event `"lore"` with `{tongue, age}`, and the address-bar keys `names` (`real` or absent) and `age` (`sa`, `fa` or absent).

- [ ] **Step 1:** Load `legendarium` as an optional blocking file. Create the lore and call `lore.apply()` before `prepareWorld`, so state labels are fitted to the names being shown.
- [ ] **Step 2:** After `prepareWorld`: `w.lore = lore`, `lore.applyColors(w)`. Add `lore.sig()` to `cacheKey()`.
- [ ] **Step 3:** In `world.js`, export `relabelStates(w)` (recompute `w.stateLabels`), and make the short-label fallback read `states[s].short || states[s].abbr`.
- [ ] **Step 4:** Handle a change in one function, `onLoreChange`: `lore.applyColors(w)`, `relabelStates(w)`, rebuild the search index, re-render the top bar, reopen the open city or state panel, leave and re-enter the active mode with its parameters, `app.invalidate()`, rebuild the minimap, update the canvas description, schedule the address bar, emit `"lore"`.
- [ ] **Step 5:** In `banners.js`, add `city.name` to the sprite cache key.
- [ ] **Step 6:** Register the `names` and `age` keys with `url.register`. Adopt wonders in an app `"data"` listener registered before the eager loads start.
- [ ] **Step 7: Verify in a browser.** Expected, in order:
  - Default: banners read Minas Tirith, Fornost Erain, Annúminas; state labels read ROHAN, THE SHIRE; `__app.lore.tongue === "legend"`.
  - `#names=real`: every banner and label matches usaciv's; `__app.data.cities.every(c => c.name === c.real.name)` is true.
  - Rename `web/data/legendarium.json` away and reload: the site works with real names; restore the file.
  - Open New York's City View, then run `__app.lore.setTongue("real")`: the open view and its banner change at once.
  - No console errors in any of the above.
- [ ] **Step 8: Commit** `git commit -m "Show Middle-earth names on the map, with real names one switch away"`

---

### Task 6: The Names switch, and reasons in panels and tooltips

**Files:**
- Modify: `web/js/main.js` (top-bar button), `web/js/ui/infoPanel.js` (`showPanel` accepts `kindLabel`), `web/js/ui/cityPanel.js`, `web/js/ui/statePanel.js`, `web/js/ui/tooltip.js`, `web/js/ext/layers/tips.js` (`wonder`), `web/css/style.css`

**Interfaces:**
- Consumes: `w.lore`, `app.lore`.
- Produces: the button `#btn-names`; `showPanel({kindLabel})`; the helper `loreCard(entry, realName, lore) -> html` exported from `infoPanel.js`.

- [ ] **Step 1:** Add `#btn-names` with `app.ui.addTopButton` when `lore.ok`. Label `Middle-earth` or `Real names`, `aria-pressed` true in the legend tongue, title "Switch between Middle-earth names and real names". A click toggles the tongue.
- [ ] **Step 2:** `loreCard` renders, for an entry with a basis other than `none`: a small basis chip (`lore.basisLabel`), the reason, and "Real name: X". City and state panels show it as their first section; the state panel adds a realm chip `data-realm` (wired in Task 8) and its kind label reads "Land" in the legend tongue.
- [ ] **Step 3:** Tooltips: the land line shows the real state name muted after the legend one; the city tooltip shows the legend name above the full real name; a wonder's tooltip shows its real name and its basis and reason under the title.
- [ ] **Step 4:** Style `.lore-card`, `.lore-basis` and the pressed state of `#btn-names` with the existing tokens only.
- [ ] **Step 5: Verify in a browser:** click Washington: the panel is titled Minas Tirith, shows "by likeness" with its reason and "Real name: Washington". Hover Mount Rushmore: The Argonath, then Mount Rushmore. Click the Names button: everything on screen changes and the address bar gains `names=real`. Keyboard: the button is reachable by Tab and toggles with Enter.
- [ ] **Step 6: Commit** `git commit -m "Add the Names switch and show the reason for each match"`

---

### Task 7: Search in both tongues

**Files:**
- Modify: `web/js/app/search.js`, `web/js/main.js` (the `initSearch` call near line 670)
- Modify: `web/dev/lore.cases.js` (one more case)

**Interfaces:**
- Consumes: `lore.aliases()`, `normName`.
- Produces: `initSearch({cities, states, realms, aliases, onPick})` returning `{focus, close, isOpen, rebuild()}`; `onPick` also receives `{kind: "realm", id}`. Exported for tests: `buildEntries(opts) -> entries` and `scoreEntry(entry, q) -> number`.

- [ ] **Step 1: Write the failing case** "search finds a city by either name": with the fixture in the legend tongue, `scoreEntry` is 0 or higher for the queries `annuminas`, `Annúminas` and `chicago` on Chicago's entry, and below 0 for `boston`.
- [ ] **Step 2: Run to see it fail.** Run: `node web/dev/selftest.mjs` Expected: `1 failed`.
- [ ] **Step 3: Implement:** each entry gains `alt` (the normalised alias); `scoreEntry` tries the alias after the name with the same rules, two ranks lower; result rows show the alias as a muted second line; realms are listed with the sub-line "Realm"; `rebuild()` re-reads names.
- [ ] **Step 4: Run to see it pass.** Expected: `12 passed, 0 failed`.
- [ ] **Step 5: Verify in a browser:** type `chicago`: the first row reads Annúminas with Chicago beneath. Type `gondor`: a Realm row appears.
- [ ] **Step 6: Commit** `git commit -m "Search answers to both tongues and to realms"`

---

### Task 8: Realms: panel, highlight, lens, link

**Files:**
- Create: `web/js/ui/realmPanel.js`
- Modify: `web/js/main.js` (selection, URL key, lens list before `initLensDock` near line 493), `web/js/ui/statePanel.js` (wire the realm chip)

**Interfaces:**
- Consumes: `lore.realms`, `lore.realmLens(world)`, `showPanel`, `yieldGrid`, `app.setHighlight`.
- Produces: `openRealmPanel(realm, ctx)`; `selectRealm(id, {fly})` in `main.js`; `app.selectRealm(id)`; the address-bar key `realm`; the lens `realms` in a lens group `{id: "realms", name: "Realms", icon: "layers"}`.

Realm features exist only in the legend tongue: in the real tongue the Realms lens is switched off and hidden, the realm chip is not drawn, and a realm selection is cleared.

- [ ] **Step 1:** `lore.realmLens(world)` (already tested in Task 4) is appended to the lens list, with its group, before `initLensDock` runs, only when `lore.ok`. Its `source` text is "This edition's legendarium" and its note is "A reading of the map, not a measurement. Every state belongs to one realm."
- [ ] **Step 2:** `openRealmPanel` shows: kind label "Realm", the realm's name and gloss, population and GDP totals, the yield grid with ranks among the 15 realms, member lands as buttons (each opens its state), and the eight largest cities.
- [ ] **Step 3:** `selectRealm(id)` clears any city or state selection, opens the panel, sets the highlight to the realm's states with the rest dimmed, and with `fly` frames the realm. Closing the panel clears the highlight. Selecting a city or state clears the realm.
- [ ] **Step 4:** Register the `realm` key; wire the state panel's realm chip and the search's realm rows to `selectRealm`.
- [ ] **Step 5: Verify in a browser:** open Texas, click its Rohan chip: Texas and Oklahoma stay lit, the panel reads Rohan with two lands. Reload on `#realm=gondor`: the same for Gondor's twelve. Load `#names=bogus&age=zz&realm=nowhere`: the home view, no error. Pick the Realms lens: fifteen colours and a fifteen-entry legend; clicking one entry isolates it.
- [ ] **Step 6: Commit** `git commit -m "Add realms: panel, highlight, lens and link"`

---

### Task 9: Document it and prove the milestone

**Files:**
- Modify: `docs/DATA_CONTRACTS.md` (a "legendarium.json" section under the optional files, and `app.lore` in the app API section)
- Modify: `docs/superpowers/specs/2026-11-25-reunited-states-design.md` section 6.4 (names are swapped in place by `lore.js`; modules keep reading `.name`; `RUN_LAST` replaces staleness tracking)
- Modify: `README.md` (how to rebuild the legendarium; the Names switch)

- [ ] **Step 1:** Write the contract section from the `assemble` output in Task 3, field by field, with the swap rule from Task 4.
- [ ] **Step 2: Run every gate.**
  - `uv run python -m unittest discover -s tests` Expected: `OK`.
  - `uv run python -m pipeline check` Expected: `0 fail`.
  - `node web/dev/selftest.mjs` Expected: `0 failed`.
- [ ] **Step 3: Milestone proof,** in a browser at desktop and phone widths: every place and wonder in the lore tables shows its name and reason (spot-check ten of each, including Taos Pueblo keeping its name); `names=real` matches usaciv label for label; first draw is not visibly slower than usaciv's.
- [ ] **Step 4: Commit** `git commit -m "Document the legendarium contract"`
