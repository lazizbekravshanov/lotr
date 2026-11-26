// The legendarium in the browser: which tongue the map speaks (Middle-earth names or real names), which Age it is
// read in, and the lookups from usaciv's real ids to lore entries (data/legendarium.json, docs/DATA_CONTRACTS.md).
//
// Names are swapped in place: apply() writes the display name for the current tongue and Age onto the loaded data
// objects (cities, both state lists, yield definitions, adopted wonders) and keeps the original under a
// non-enumerable `.real`. Every module that reads `.name` therefore shows the right tongue without knowing about
// this one, and `.real.name` is always the real name. Nothing else about the data is touched: no number changes.
//
// With no legendarium (the file is optional) everything here is a passthrough and the site reads as usaciv does.
// Pure module: no DOM.
import { parseHex } from "./color.js";

const TONGUES = ["legend", "real"];
const BASIS_LABEL = { place: "by place", likeness: "by likeness", name: "by name", new: "new-made", none: "kept as it is" };

/** Lower case, accents folded, everything but letters and digits collapsed to single spaces. */
export const normName = (s) => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
  .replace(/[^a-z0-9]+/g, " ").trim();

// An entry that actually renames: basis "none" means the place keeps its own name.
const renames = (e) => (e && e.basis !== "none" ? e : null);

function keepReal(obj, fields) {
  if (obj.real) return obj.real;
  const real = {};
  for (const f of fields) real[f] = obj[f];
  Object.defineProperty(obj, "real", { value: real, enumerable: false, configurable: true });
  return real;
}

function setOrDelete(obj, key, value) {
  if (value === undefined) delete obj[key];
  else obj[key] = value;
}

/**
 * doc: legendarium.json, or null when the file is missing.
 * data: {world, states, cities, nation} as loaded (states may be null).
 */
export function createLore(doc, data) {
  const ok = !!(doc && Array.isArray(doc.realms) && doc.realms.length);
  const realms = ok ? doc.realms : [];
  const ages = ok && Array.isArray(doc.ages) ? doc.ages.map((a) => a.id) : [];
  const worldStates = data?.world?.states || [];
  const fipsOf = new Map(); // fips, abbr or index → fips
  worldStates.forEach((s, i) => { fipsOf.set(s.fips, s.fips); fipsOf.set(s.abbr, s.fips); fipsOf.set(i, s.fips); });
  const realmById = new Map(realms.map((r) => [r.id, r]));
  const realmByFips = new Map();
  for (const r of realms) for (const f of r.states || []) realmByFips.set(f, r);
  const listeners = new Set();
  const adopted = { wonders: [] };

  let tongue = ok ? "legend" : "real";
  let age = (ok && doc.ages?.find((a) => a.default)?.id) || ages[0] || "ta";

  function entry(kind, id) {
    if (!ok) return null;
    const key = kind === "lands" ? fipsOf.get(id) : id;
    const base = doc[kind]?.[key];
    if (!base) return null;
    const { ages: byAge, ...rest } = base;
    return { ...rest, ...(byAge?.[age] || {}) };
  }

  const realmOfState = (ref) => (ok ? realmByFips.get(fipsOf.get(ref)) || null : null);

  function realmOfCity(city) {
    if (!ok || !city) return null;
    const named = doc.places?.[city.id]?.realm;
    if (named && realmById.has(named)) return realmById.get(named);
    const first = realmOfState(city.states?.[0]);
    if (first) return first;
    const owner = city.cell != null ? data?.world?.owner?.[city.cell] : -1;
    return owner >= 0 ? realmOfState(owner) : null;
  }

  function swapName(obj, e) {
    const real = keepReal(obj, ["name", "short"]);
    obj.name = e ? e.name : real.name;
    return real;
  }

  function apply() {
    if (!ok) return;
    const legend = tongue === "legend";
    for (const c of data.cities || []) swapName(c, legend ? renames(entry("places", c.id)) : null);
    worldStates.forEach((s, i) => {
      const e = legend ? renames(entry("lands", s.fips)) : null;
      // The map tries the full name first and falls back to `short` (see world.js); real states have none.
      const real = swapName(s, e);
      setOrDelete(s, "short", e ? e.label : real.short);
      const twin = data.states?.[i]?.fips === s.fips ? data.states[i] : data.states?.find((t) => t.fips === s.fips);
      if (twin && twin !== s) swapName(twin, e);
    });
    for (const y of data.nation?.yields || []) {
      const real = keepReal(y, ["label", "description"]);
      const v = legend ? doc.vocab?.yields?.[y.key] : null;
      y.label = v ? v.name : real.label;
      y.description = v ? `${real.label}: ${real.description}` : real.description;
    }
    for (const wd of adopted.wonders) {
      const e = legend ? renames(entry("wonders", wd.id)) : null;
      const real = swapName(wd, e);
      setOrDelete(wd, "short", e ? e.name : real.short);
    }
  }

  function change(next) {
    if (!ok) return false;
    if (next.tongue !== undefined) {
      if (!TONGUES.includes(next.tongue) || next.tongue === tongue) return false;
      tongue = next.tongue;
    } else {
      if (!ages.includes(next.age) || next.age === age) return false;
      age = next.age;
    }
    apply();
    for (const fn of [...listeners]) fn({ tongue, age });
    return true;
  }

  return {
    ok,
    realms,
    get tongue() { return tongue; },
    get age() { return age; },
    sig: () => `${tongue}|${age}`,
    setTongue: (t) => change({ tongue: t }),
    setAge: (a) => change({ age: a }),
    apply,

    /** Paint states in their realm's colour (legend tongue) or usaciv's own palette (real tongue). */
    applyColors(w) {
      if (!ok || !w?.stateColor) return;
      w.stateColorReal ??= w.stateColor.slice();
      for (let i = 0; i < w.stateColor.length; i++) {
        const realm = tongue === "legend" ? realmOfState(i) : null;
        w.stateColor[i] = realm ? parseHex(realm.colors[0]) : w.stateColorReal[i];
      }
    },

    /** Take over the names of a data file that loads later. kind: "wonders" (wonders.json; null is fine). */
    adopt(kind, file) {
      if (!ok || kind !== "wonders") return;
      adopted.wonders = Array.isArray(file?.wonders) ? file.wonders : [];
      apply();
    },

    entry,
    realm: (id) => realmById.get(id) || null,
    realmOfState,
    realmOfCity,
    /** The realm's fill colour for a city's banner in the legend tongue; null means "use the usual colour". */
    cityColor(city) {
      const realm = tongue === "legend" ? realmOfCity(city) : null;
      return realm ? parseHex(realm.colors[0]) : null;
    },
    realName: (obj) => obj?.real?.name ?? obj?.name,
    basisLabel: (code) => BASIS_LABEL[code] || "",

    /** The other tongue's name of every renamed city and state, so search answers to both. */
    aliases() {
      if (!ok) return [];
      const out = [];
      const other = (obj, e) => (tongue === "legend" ? obj.real?.name ?? obj.name : e.name);
      for (const c of data.cities || []) {
        const e = renames(entry("places", c.id));
        if (e) out.push({ kind: "city", id: c.id, alias: other(c, e) });
      }
      worldStates.forEach((s, i) => {
        const e = renames(entry("lands", s.fips));
        if (e) out.push({ kind: "state", id: i, alias: other(s, e) });
      });
      return out;
    },

    /** A categorical lens (docs/DATA_CONTRACTS.md, lenses.json) colouring every state by its realm. */
    realmLens(world) {
      if (!ok) return null;
      const index = new Map(realms.map((r, k) => [r.id, k]));
      return {
        id: "realms", group: "realms", name: "Realms", icon: "layers", emoji: "", unit: "",
        format: "category", scale: "linear", domain: [0, realms.length - 1],
        ramp: realms.map((r) => r.colors[0]),
        categories: realms.map((r) => ({ id: r.id, name: r.name, color: r.colors[0], description: r.gloss })),
        higher_is: "neutral", source: "This edition's legendarium", vintage: "",
        description: "Which realm of Middle-earth each state is read as.",
        note: "A reading of the map, not a measurement. Every state belongs to one realm.",
        values: world.owner.map((o) => (o >= 0 ? index.get(realmOfState(o)?.id) ?? null : null)),
      };
    },

    on: (fn) => listeners.add(fn),
    off: (fn) => listeners.delete(fn),
  };
}
