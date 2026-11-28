// Self-test cases for web/js/lore.js (and the search index). Pure logic: no DOM, so the same cases run in a
// browser (dev/selftest.html) and under node (node web/dev/selftest.mjs).
// Each case is [name, fn(assert)]; assert(cond, msg) and assert.equal(a, b, msg) (deep, by JSON).
import { createLore, normName } from "../js/lore.js";
import { buildEntries, scoreEntry, queryEntries } from "../js/app/searchIndex.js";

const YIELDS = ["food", "production", "gold", "science", "culture"];

// Three states in two realms. Cells: 0, 1 → NY; 2 water; 3 → PA; 4 → IL; 5 foreign land.
// Chicago's banner cell (3) lies in Pennsylvania on purpose: its realm must still be Illinois's.
function fixture() {
  const world = {
    grid: { radius: 25, cols: 3, rows: 2 },
    owner: [0, 0, -1, 1, 2, -2],
    states: [{ fips: "36", abbr: "NY", name: "New York" }, { fips: "42", abbr: "PA", name: "Pennsylvania" }, { fips: "17", abbr: "IL", name: "Illinois" }],
  };
  const states = world.states.map((s) => ({ ...s, population: 1 }));
  const cities = [
    { id: "35620", name: "New York", full: "New York-Newark-Jersey City, NY-NJ Metro Area", states: ["NY", "NJ"], cell: 0, population: 20 },
    { id: "16980", name: "Chicago", full: "Chicago-Naperville-Elgin, IL-IN Metro Area", states: ["IL", "IN"], cell: 3, population: 9 },
    { id: "10900", name: "Allentown", full: "Allentown-Bethlehem-Easton, PA-NJ Metro Area", states: ["PA", "NJ"], cell: 3, population: 1 },
    { id: "99999", name: "Borderton", full: "Borderton, IL Metro Area", states: ["IL"], cell: 4, population: 1 },
  ];
  const nation = { yields: YIELDS.map((k) => ({ key: k, label: k[0].toUpperCase() + k.slice(1), description: `Real ${k}.` })) };
  const doc = {
    version: 1,
    basis: { place: "p", likeness: "l", name: "n", new: "w", none: "k" },
    ages: [{ id: "ta", name: "Third Age", default: true }, { id: "sa", name: "Second Age" }, { id: "fa", name: "Fourth Age" }],
    realms: [
      { id: "arnor", name: "Arnor", label: ["ARNOR"], gloss: "The North-kingdom", culture: "arnor", colors: ["#6d70b3", "#e3e5f6"], states: ["36", "17"], capital: "35620" },
      { id: "shire", name: "The Shire", label: ["THE SHIRE"], gloss: "A free land", culture: "hobbit", colors: ["#6f9a3a", "#f0d264"], states: ["42"], capital: "10900" },
    ],
    lands: {
      36: { name: "Arthedain", realm: "arnor", basis: "place", why: "Chief of the northern realms." },
      42: { name: "The Shire", realm: "shire", basis: "name", why: "A real Brandywine flows here." },
      17: { name: "The Lands about Evendim", label: "Evendim", realm: "arnor", basis: "place", why: "By the great lake." },
    },
    places: {
      35620: { name: "Fornost Erain", basis: "name", why: "Norbury of the Kings.", ages: { fa: { name: "Later Name", why: "Later reason." } } },
      16980: { name: "Annúminas", basis: "place", why: "The royal city on the lake shore." },
      99999: { name: "Marchtown", realm: "shire", basis: "new", why: "A test place that names its own realm." },
    },
    wonders: {
      "nps-MORU": { name: "The Argonath", basis: "likeness", why: "Kings carved from the living rock." },
      "nhl-66000496": { name: "Taos Pueblo", basis: "none", why: "A living community. It keeps its own name." },
    },
    sites: [], rivers: {}, labels: [],
    vocab: { yields: Object.fromEntries(YIELDS.map((k) => [k, { name: `Themed ${k}`, plain: `plain ${k}` }])) },
  };
  const w = { raw: world, stateColor: [[1, 2, 3], [4, 5, 6], [7, 8, 9]] };
  return { doc, data: { world, states, cities, nation }, w };
}

const city = (data, id) => data.cities.find((c) => c.id === id);

export const cases = [
  ["no file: passthrough", (assert) => {
    const { data, w } = fixture();
    const lore = createLore(null, data);
    lore.apply();
    lore.applyColors(w);
    assert.equal(lore.ok, false);
    assert.equal(lore.tongue, "real");
    assert.equal(city(data, "35620").name, "New York");
    assert.equal(data.world.states[1].name, "Pennsylvania");
    assert.equal(w.stateColor, [[1, 2, 3], [4, 5, 6], [7, 8, 9]]);
    assert.equal(lore.setTongue("legend"), false);
    assert.equal(lore.entry("places", "35620"), null);
    assert.equal(lore.realmOfCity(city(data, "35620")), null);
    assert.equal(lore.aliases(), []);
    assert.equal(lore.realmLens(data.world), null);
    assert.equal(lore.sig(), "real|ta");
  }],

  ["a malformed file is ignored", (assert) => {
    const { doc } = fixture();
    const [arnor, shire] = doc.realms;
    const bad = {
      "another version": { ...doc, version: 2 },
      "a realm without colours": { ...doc, realms: [{ ...arnor, colors: undefined }, shire] },
      "a colour that is not #rrggbb": { ...doc, realms: [{ ...arnor, colors: ["red"] }, shire] },
      "states that are not a list": { ...doc, realms: [{ ...arnor, states: "36" }, shire] },
      "realms that are not a list": { ...doc, realms: "arnor" },
    };
    for (const [what, d] of Object.entries(bad)) {
      const { data } = fixture();
      const lore = createLore(d, data);
      lore.apply();
      assert.equal(lore.ok, false, what);
      assert.equal(city(data, "35620").name, "New York", what);
      assert.equal(lore.realmLens(data.world), null, what);
    }
  }],

  ["an entry without a name keeps the real name", (assert) => {
    const { doc, data } = fixture();
    doc.places[35620] = { basis: "name", why: "No name given." };
    doc.lands[42] = { realm: "shire", basis: "name", why: "No name given." };
    doc.vocab.yields.food = "Harvest"; // not {name, plain}
    const lore = createLore(doc, data);
    lore.apply();
    assert.equal(city(data, "35620").name, "New York");
    assert.equal(city(data, "16980").name, "Annúminas", "the rest of the file still applies");
    assert.equal(data.world.states[1].name, "Pennsylvania");
    assert.equal(data.nation.yields[0].label, "Food");
    assert.equal(data.nation.yields[1].label, "Themed production");
    assert.equal(lore.aliases().some((a) => a.kind === "city" && a.id === "35620"), false);
  }],

  ["a damaged Age entry is skipped", (assert) => {
    const { doc, data } = fixture();
    doc.ages = [null, { name: "An Age without an id" }, ...doc.ages];
    const lore = createLore(doc, data);
    lore.apply();
    assert.equal(lore.ok, true, "the rest of the file still applies");
    assert.equal(lore.age, "ta", "the default Age is still found");
    assert.equal(city(data, "35620").name, "Fornost Erain");
    assert.equal(lore.setAge("fa"), true, "the good Ages still switch");
    assert.equal(lore.setAge(undefined), false, "an Age without an id is not offered");
  }],

  ["legend names are applied, real ones kept", (assert) => {
    const { doc, data } = fixture();
    const lore = createLore(doc, data);
    lore.apply();
    assert.equal(lore.ok, true);
    assert.equal(lore.tongue, "legend");
    assert.equal(city(data, "35620").name, "Fornost Erain");
    assert.equal(city(data, "35620").real.name, "New York");
    assert.equal(city(data, "10900").name, "Allentown", "a city with no entry keeps its real name");
    assert.equal(data.world.states[1].name, "The Shire");
    assert.equal(data.states[1].name, "The Shire", "states.json objects are swapped too");
    assert.equal(data.states[1].real.name, "Pennsylvania");
    assert.equal(data.world.states[2].short, "Evendim", "a land's short label is offered to the map");
    assert.equal(data.world.states[2].name, "The Lands about Evendim", "a land with a short label is still renamed");
    assert.equal(data.world.states[0].short, undefined);
    assert.equal(data.nation.yields[0].label, "Themed food");
    assert.equal(data.nation.yields[0].description, "Food: Real food.", "the plain meaning stays visible");
    assert.equal(Object.keys(city(data, "35620")).includes("real"), false, "the real copy must not show up as a data column");
    assert.equal(lore.realName(city(data, "35620")), "New York");
    assert.equal(lore.realName(city(data, "10900")), "Allentown");
  }],

  ["real tongue restores every display field", (assert) => {
    const { doc, data, w } = fixture();
    const before = JSON.stringify(data);
    const lore = createLore(doc, data);
    lore.apply();
    lore.applyColors(w);
    assert.equal(w.stateColor[1], [0x6f, 0x9a, 0x3a], "legend tongue paints states in their realm's colour");
    assert.equal(w.stateColor[0], w.stateColor[2], "two states of one realm share a colour");
    assert.equal(lore.setTongue("real"), true);
    lore.applyColors(w);
    assert.equal(JSON.stringify(data), before, "every name, short label and yield label is back");
    assert.equal(w.stateColor, [[1, 2, 3], [4, 5, 6], [7, 8, 9]]);
  }],

  ["unknown tongue or age is ignored", (assert) => {
    const { doc, data } = fixture();
    const lore = createLore(doc, data);
    lore.apply();
    assert.equal(lore.setTongue("bogus"), false);
    assert.equal(lore.setTongue(null), false);
    assert.equal(lore.setAge("zz"), false);
    assert.equal(lore.setTongue("legend"), false, "setting the current value is not a change");
    assert.equal(lore.sig(), "legend|ta");
    assert.equal(city(data, "35620").name, "Fornost Erain");
  }],

  ["age overrides", (assert) => {
    const { doc, data } = fixture();
    const lore = createLore(doc, data);
    lore.apply();
    assert.equal(lore.setAge("fa"), true);
    assert.equal(city(data, "35620").name, "Later Name");
    assert.equal(lore.entry("places", "35620").why, "Later reason.");
    assert.equal(lore.entry("places", "35620").basis, "name", "fields without an override come from the base entry");
    assert.equal(city(data, "16980").name, "Annúminas", "no override: the base name stands");
    assert.equal(lore.setAge("ta"), true);
    assert.equal(city(data, "35620").name, "Fornost Erain");
  }],

  ["realm lookups", (assert) => {
    const { doc, data } = fixture();
    const lore = createLore(doc, data);
    lore.apply();
    for (const ref of [0, "36", "NY"]) assert.equal(lore.realmOfState(ref).id, "arnor", `state ref ${ref}`);
    assert.equal(lore.realmOfState("42").id, "shire");
    assert.equal(lore.realmOfState("ZZ"), null);
    assert.equal(lore.realmOfState(-1), null);
    assert.equal(lore.realmOfCity(city(data, "16980")).id, "arnor", "the first-listed state decides, not the banner cell");
    assert.equal(lore.realmOfCity(city(data, "99999")).id, "shire", "an entry that names a realm wins");
    assert.equal(lore.realm("shire").name, "The Shire");
    assert.equal(lore.realm("nowhere"), null);
    assert.equal(lore.cityColor(city(data, "16980")), [0x6d, 0x70, 0xb3]);
    assert.equal(lore.entry("lands", "PA").name, "The Shire");
    assert.equal(lore.entry("lands", 1).name, "The Shire");
    lore.setTongue("real");
    assert.equal(lore.cityColor(city(data, "16980")), null, "real tongue: the banner keeps usaciv's colour");
    assert.equal(lore.basisLabel("likeness"), "by likeness");
    assert.equal(lore.basisLabel("new"), "new-made");
  }],

  ["search aliases fold accents", (assert) => {
    const { doc, data } = fixture();
    assert.equal(normName("Annúminas"), "annuminas");
    assert.equal(normName("  Khazad-dûm! "), "khazad dum");
    const lore = createLore(doc, data);
    lore.apply();
    const find = (kind, id) => lore.aliases().find((a) => a.kind === kind && a.id === id)?.alias;
    assert.equal(find("city", "16980"), "Chicago", "legend tongue: the alias is the real name");
    assert.equal(find("state", 1), "Pennsylvania");
    assert.equal(find("city", "10900"), undefined, "no entry, no alias");
    lore.setTongue("real");
    assert.equal(find("city", "16980"), "Annúminas", "real tongue: the alias is the legend name");
    assert.equal(find("state", 1), "The Shire");
  }],

  ["sig changes with tongue and age", (assert) => {
    const { doc, data } = fixture();
    const lore = createLore(doc, data);
    const seen = new Set([lore.sig()]);
    lore.setAge("sa"); seen.add(lore.sig());
    lore.setTongue("real"); seen.add(lore.sig());
    assert.equal(seen.size, 3);
  }],

  ["wonders adopted later get names", (assert) => {
    const { doc, data } = fixture();
    const lore = createLore(doc, data);
    lore.apply();
    const file = { wonders: [
      { id: "nps-MORU", name: "Mount Rushmore National Memorial", short: "Mount Rushmore" },
      { id: "nhl-66000496", name: "Taos Pueblo", short: "Taos Pueblo" },
      { id: "univ-1", name: "Some University", short: "Some U" },
    ] };
    lore.adopt("wonders", file);
    assert.equal([file.wonders[0].name, file.wonders[0].short], ["The Argonath", "The Argonath"]);
    assert.equal(file.wonders[0].real, { name: "Mount Rushmore National Memorial", short: "Mount Rushmore" });
    assert.equal(file.wonders[1].name, "Taos Pueblo", "basis none keeps the real name");
    assert.equal(file.wonders[2].short, "Some U");
    lore.setTongue("real");
    assert.equal([file.wonders[0].name, file.wonders[0].short], ["Mount Rushmore National Memorial", "Mount Rushmore"]);
    lore.adopt("wonders", null); // a missing file must not throw
  }],

  ["realm lens", (assert) => {
    const { doc, data } = fixture();
    const lens = createLore(doc, data).realmLens(data.world);
    assert.equal(lens.id, "realms");
    assert.equal(lens.format, "category");
    assert.equal(lens.categories.map((c) => c.name), ["Arnor", "The Shire"]);
    assert.equal(lens.ramp, ["#6d70b3", "#6f9a3a"]);
    assert.equal(lens.domain, [0, 1]);
    assert.equal(lens.vintage, "", "it must not borrow the census vintage of the lens file");
    assert.equal(lens.values, [0, 0, null, 1, 0, null], "the realm index on US land, null on water and foreign land");
  }],

  ["listeners fire once per change", (assert) => {
    const { doc, data } = fixture();
    const lore = createLore(doc, data);
    const seen = [];
    const fn = (e) => seen.push(`${e.tongue}|${e.age}`);
    lore.on(fn);
    lore.setTongue("real");
    lore.setTongue("real");
    lore.setAge("fa");
    lore.setAge("nope");
    lore.off(fn);
    lore.setTongue("legend");
    assert.equal(seen, ["real|ta", "real|fa"]);
  }],

  ["search finds a place by either name", (assert) => {
    const { doc, data } = fixture();
    const lore = createLore(doc, data);
    lore.apply();
    const index = () => buildEntries({
      cities: data.cities,
      states: data.world.states.map((s) => ({ name: s.name, abbr: s.abbr, population: 1 })),
      realms: lore.tongue === "legend" ? lore.realms : [],
      aliases: lore.aliases(),
    });
    let entries = index();
    const chicago = () => entries.find((e) => e.kind === "city" && e.city.id === "16980");
    for (const q of ["annuminas", "Annúminas", "ANNU", "chicago"]) assert(scoreEntry(chicago(), normName(q)) >= 0, `legend tongue: ${q}`);
    assert(scoreEntry(chicago(), normName("boston")) < 0, "an unrelated query must not match");
    assert.equal(chicago().altLabel, "Chicago");
    const first = (q) => queryEntries(entries, q)[0];
    assert.equal(first("pennsylvania")?.label, "The Shire", "a land is found by its state's real name");
    assert.equal(first("pa")?.label, "The Shire", "and by its postal code");
    assert.equal([first("arnor")?.kind, first("arnor")?.id], ["realm", "arnor"], "realms are listed in the legend tongue");
    assert.equal(first("fornost")?.city.id, "35620");
    assert.equal(queryEntries(entries, "   "), []);
    lore.setTongue("real");
    entries = index();
    assert.equal(chicago().label, "Chicago");
    assert(scoreEntry(chicago(), normName("annuminas")) >= 0, "real tongue: the legend name still finds it");
    assert.equal(first("the shire")?.label, "Pennsylvania");
    assert.equal(queryEntries(entries, "arnor").filter((e) => e.kind === "realm"), [], "no realms in the real tongue");
    assert(scoreEntry(chicago(), "chicago") < scoreEntry(chicago(), "annuminas"), "the shown name ranks above the alias");
  }],
];
